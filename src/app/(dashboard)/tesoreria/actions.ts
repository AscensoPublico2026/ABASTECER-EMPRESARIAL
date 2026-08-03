'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { obtenerNombreUsuarioActual } from '@/lib/queries/perfil'
import { uppercaseFormData } from '@/lib/uppercase'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

const fmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
})

/** Refresca todas las pantallas que muestran plata */
function refrescarTodo() {
  revalidatePath('/tesoreria')
  revalidatePath('/financiero')
  revalidatePath('/indicadores')
  revalidatePath('/socios')
  revalidatePath('/')
}

function limpiarMonto(valor: string): number {
  return Number(valor.replace(/\./g, '').replace(',', '.')) || 0
}

// ============================================================
// MOVIMIENTO MANUAL (ingreso o egreso que no viene de otro modulo)
// ============================================================
const CATEGORIAS_MANUALES = ['AJUSTE', 'OTRO', 'PAGO_IMPUESTO'] as const

export async function registrarMovimientoManual(formData: FormData): Promise<ResultadoAccion> {
  uppercaseFormData(formData)

  const cuenta_id = String(formData.get('cuenta_id') ?? '').trim()
  const tipo = String(formData.get('tipo') ?? '').trim().toUpperCase()
  const categoria = String(formData.get('categoria') ?? 'OTRO').trim().toUpperCase()
  const fecha = String(formData.get('fecha') ?? '').trim()
  const monto = limpiarMonto(String(formData.get('monto') ?? '0'))
  const concepto = String(formData.get('concepto') ?? '').trim()
  const medio_pago = String(formData.get('medio_pago') ?? '').trim()
  const referencia = String(formData.get('referencia') ?? '').trim()
  const notas = String(formData.get('notas') ?? '').trim()

  if (!cuenta_id) return { ok: false, mensaje: 'Selecciona la cuenta.' }
  if (tipo !== 'INGRESO' && tipo !== 'EGRESO') {
    return { ok: false, mensaje: 'Indica si es entrada o salida de dinero.' }
  }
  if (!fecha) return { ok: false, mensaje: 'Ingresa la fecha del movimiento.' }
  if (monto <= 0) return { ok: false, mensaje: 'El monto debe ser mayor a cero.' }
  if (!concepto) return { ok: false, mensaje: 'Escribe de que se trata el movimiento.' }
  if (!(CATEGORIAS_MANUALES as readonly string[]).includes(categoria)) {
    return { ok: false, mensaje: 'Categoria no valida para un movimiento manual.' }
  }

  try {
    const supabase = createServerSupabaseClient()

    // Si es salida, verificar que la cuenta tenga con que
    if (tipo === 'EGRESO') {
      const { data: cuenta } = await supabase
        .from('saldos_cuentas')
        .select('nombre, saldo_actual')
        .eq('id', cuenta_id)
        .maybeSingle()

      if (cuenta && Number(cuenta.saldo_actual ?? 0) < monto) {
        return {
          ok: false,
          mensaje: `${cuenta.nombre} solo tiene ${fmt.format(Number(cuenta.saldo_actual ?? 0))} y estas sacando ${fmt.format(monto)}.`,
        }
      }
    }

    const usuario = await obtenerNombreUsuarioActual()
    const { error } = await supabase.from('movimientos_tesoreria').insert({
      cuenta_id,
      fecha,
      tipo,
      categoria,
      monto,
      concepto,
      medio_pago: medio_pago || null,
      referencia: referencia || null,
      notas: notas || null,
      creado_por_id: usuario.id,
      creado_por_nombre: usuario.nombre,
    })

    if (error) return { ok: false, mensaje: error.message }

    refrescarTodo()
    return {
      ok: true,
      mensaje: `${tipo === 'INGRESO' ? 'Entrada' : 'Salida'} de ${fmt.format(monto)} registrada.`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al registrar.' }
  }
}

// ============================================================
// ELIMINAR MOVIMIENTO
// Solo movimientos manuales. Los que vienen de una venta, compra,
// gasto o socio se deben corregir desde su propio modulo.
// ============================================================
export async function eliminarMovimientoTesoreria(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'Movimiento no valido.' }

  try {
    const supabase = createServerSupabaseClient()

    const { data: mov, error: errMov } = await supabase
      .from('movimientos_tesoreria')
      .select('id, monto, concepto, cotizacion_id, factura_venta_id, factura_compra_id, gasto_id, movimiento_socio_id, movimiento_relacionado_id')
      .eq('id', id)
      .maybeSingle()

    if (errMov) return { ok: false, mensaje: errMov.message }
    if (!mov) return { ok: false, mensaje: 'El movimiento ya no existe.' }

    const vieneDeOtroModulo =
      mov.cotizacion_id || mov.factura_venta_id || mov.factura_compra_id ||
      mov.gasto_id || mov.movimiento_socio_id

    if (vieneDeOtroModulo) {
      return {
        ok: false,
        mensaje: 'Este movimiento lo genero una venta, compra, gasto o aporte de socio. Corrigelo desde ese modulo para que todo quede cuadrado.',
      }
    }

    // Si es un traslado, borrar tambien el otro lado
    if (mov.movimiento_relacionado_id) {
      await supabase.from('movimientos_tesoreria').delete().eq('id', mov.movimiento_relacionado_id)
    }

    const { error } = await supabase.from('movimientos_tesoreria').delete().eq('id', id)
    if (error) return { ok: false, mensaje: error.message }

    refrescarTodo()
    return {
      ok: true,
      mensaje: mov.movimiento_relacionado_id
        ? 'Traslado eliminado (los dos lados).'
        : `Movimiento eliminado: ${fmt.format(Number(mov.monto ?? 0))}.`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al eliminar.' }
  }
}

// ============================================================
// TRASLADO ENTRE CUENTAS
// Genera dos movimientos emparejados: sale de una, entra a la otra.
// ============================================================
async function ejecutarTraslado(
  cuenta_origen_id: string,
  cuenta_destino_id: string,
  monto: number,
  fecha: string,
  concepto: string,
): Promise<{ ok: boolean; mensaje: string }> {
  const supabase = createServerSupabaseClient()

  const { data: cuentas } = await supabase
    .from('saldos_cuentas')
    .select('id, nombre, saldo_actual')
    .in('id', [cuenta_origen_id, cuenta_destino_id])

  const origen = (cuentas ?? []).find((c) => String(c.id) === cuenta_origen_id)
  const destino = (cuentas ?? []).find((c) => String(c.id) === cuenta_destino_id)

  if (!origen) return { ok: false, mensaje: 'La cuenta de origen no existe.' }
  if (!destino) return { ok: false, mensaje: 'La cuenta de destino no existe.' }

  const saldoOrigen = Number(origen.saldo_actual ?? 0)
  if (saldoOrigen < monto) {
    return {
      ok: false,
      mensaje: `${origen.nombre} solo tiene ${fmt.format(saldoOrigen)} y quieres trasladar ${fmt.format(monto)}.`,
    }
  }

  const usuario = await obtenerNombreUsuarioActual()

  // 1. Sale de la cuenta origen
  const { data: salida, error: errSalida } = await supabase
    .from('movimientos_tesoreria')
    .insert({
      cuenta_id: cuenta_origen_id,
      fecha,
      tipo: 'EGRESO',
      categoria: 'TRASLADO_SALIDA',
      monto,
      concepto: `${concepto} (sale de ${origen.nombre})`,
      medio_pago: 'Transferencia',
      creado_por_id: usuario.id,
      creado_por_nombre: usuario.nombre,
    })
    .select('id')
    .single()

  if (errSalida || !salida) {
    return { ok: false, mensaje: errSalida?.message ?? 'No se pudo registrar la salida.' }
  }

  // 2. Entra a la cuenta destino, apuntando a la salida
  const { data: entrada, error: errEntrada } = await supabase
    .from('movimientos_tesoreria')
    .insert({
      cuenta_id: cuenta_destino_id,
      fecha,
      tipo: 'INGRESO',
      categoria: 'TRASLADO_ENTRADA',
      monto,
      concepto: `${concepto} (entra a ${destino.nombre})`,
      medio_pago: 'Transferencia',
      movimiento_relacionado_id: salida.id,
      creado_por_id: usuario.id,
      creado_por_nombre: usuario.nombre,
    })
    .select('id')
    .single()

  if (errEntrada || !entrada) {
    // Deshacer la salida para no dejar plata perdida
    await supabase.from('movimientos_tesoreria').delete().eq('id', salida.id)
    return { ok: false, mensaje: errEntrada?.message ?? 'No se pudo registrar la entrada. Se deshizo la salida.' }
  }

  // 3. Cerrar el emparejamiento en el otro sentido
  await supabase
    .from('movimientos_tesoreria')
    .update({ movimiento_relacionado_id: entrada.id })
    .eq('id', salida.id)

  return {
    ok: true,
    mensaje: `${fmt.format(monto)} trasladados de ${origen.nombre} a ${destino.nombre}.`,
  }
}

export async function trasladarEntreCuentas(formData: FormData): Promise<ResultadoAccion> {
  uppercaseFormData(formData)

  const cuenta_origen_id = String(formData.get('cuenta_origen_id') ?? '').trim()
  const cuenta_destino_id = String(formData.get('cuenta_destino_id') ?? '').trim()
  const monto = limpiarMonto(String(formData.get('monto') ?? '0'))
  const fecha = String(formData.get('fecha') ?? '').trim()
  const concepto = String(formData.get('concepto') ?? '').trim() || 'TRASLADO ENTRE CUENTAS'

  if (!cuenta_origen_id) return { ok: false, mensaje: 'Selecciona la cuenta de origen.' }
  if (!cuenta_destino_id) return { ok: false, mensaje: 'Selecciona la cuenta de destino.' }
  if (cuenta_origen_id === cuenta_destino_id) {
    return { ok: false, mensaje: 'La cuenta de origen y la de destino son la misma.' }
  }
  if (monto <= 0) return { ok: false, mensaje: 'El monto debe ser mayor a cero.' }
  if (!fecha) return { ok: false, mensaje: 'Ingresa la fecha del traslado.' }

  try {
    const res = await ejecutarTraslado(cuenta_origen_id, cuenta_destino_id, monto, fecha, concepto)
    if (res.ok) refrescarTodo()
    return res
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al trasladar.' }
  }
}

// ============================================================
// TRASLADAR A LA RESERVA DE IMPUESTOS
// Usa el calculo de estado_reserva_impuestos: aparta la plata del
// IVA y del Simple para que no se gaste sin darse cuenta.
// ============================================================
export async function trasladarAReserva(formData: FormData): Promise<ResultadoAccion> {
  const cuenta_origen_id = String(formData.get('cuenta_origen_id') ?? '').trim()
  const fecha = String(formData.get('fecha') ?? '').trim() || new Date().toISOString().slice(0, 10)
  const montoManual = limpiarMonto(String(formData.get('monto') ?? '0'))

  if (!cuenta_origen_id) return { ok: false, mensaje: 'Selecciona de que cuenta sale el dinero.' }

  try {
    const supabase = createServerSupabaseClient()

    const { data: estado, error: errEstado } = await supabase
      .from('estado_reserva_impuestos')
      .select('*')
      .maybeSingle()

    if (errEstado) return { ok: false, mensaje: errEstado.message }
    if (!estado) return { ok: false, mensaje: 'No se pudo calcular la reserva de impuestos.' }

    const cuenta_reserva_id = estado.cuenta_reserva_id ? String(estado.cuenta_reserva_id) : null
    if (!cuenta_reserva_id) {
      return {
        ok: false,
        mensaje: 'No hay una cuenta marcada como reserva. Crea una cuenta de reserva de impuestos primero.',
      }
    }
    if (cuenta_reserva_id === cuenta_origen_id) {
      return { ok: false, mensaje: 'La cuenta de origen es la misma cuenta de reserva.' }
    }

    const falta = Number(estado.falta_trasladar ?? 0)
    // Si el usuario no escribe monto, se traslada exactamente lo que falta
    const monto = montoManual > 0 ? montoManual : falta

    if (monto <= 0) {
      return {
        ok: true,
        mensaje: `No hace falta trasladar nada. Ya tienes ${fmt.format(Number(estado.esta_reservado ?? 0))} apartados y necesitas ${fmt.format(Number(estado.debe_estar_reservado ?? 0))}.`,
      }
    }

    const iva = Number(estado.iva_por_pagar ?? 0)
    const simple = Number(estado.simple_por_pagar ?? 0)
    const concepto = `RESERVA DE IMPUESTOS (IVA ${fmt.format(iva)} + SIMPLE ${fmt.format(simple)})`

    const res = await ejecutarTraslado(cuenta_origen_id, cuenta_reserva_id, monto, fecha, concepto)
    if (!res.ok) return res

    refrescarTodo()

    const quedaFaltando = Math.max(falta - monto, 0)
    const cierre = quedaFaltando > 0
      ? ` Todavia faltan ${fmt.format(quedaFaltando)} por apartar.`
      : ' Ya tienes apartado todo lo de impuestos.'

    return { ok: true, mensaje: `${res.mensaje}${cierre}` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al trasladar a la reserva.' }
  }
}
