'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { TIPOS_MOVIMIENTO, type TipoMovimiento } from '@/types/socios'
import { supabaseConfigurado } from '@/lib/queries/socios'
import { obtenerNombreUsuarioActual } from '@/lib/queries/perfil'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

function esTipoValido(valor: string): valor is TipoMovimiento {
  return valor in TIPOS_MOVIMIENTO
}

/**
 * Categoria de tesoreria segun el tipo de movimiento con el socio.
 * Debe coincidir con el check constraint de movimientos_tesoreria.categoria.
 */
const CATEGORIA_TESORERIA: Record<TipoMovimiento, string> = {
  APORTE_CAPITAL: 'APORTE_SOCIO',
  PRESTAMO_SOCIO: 'PRESTAMO_SOCIO',
  DEVOLUCION_PRESTAMO: 'DEVOLUCION_PRESTAMO',
  DIVIDENDO: 'DIVIDENDO',
  REMUNERACION: 'OTRO',
  REEMBOLSO: 'OTRO',
}

/** Registra un movimiento entre la empresa y un socio */
export async function registrarMovimiento(
  formData: FormData
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    return {
      ok: false,
      mensaje: 'La base de datos no esta configurada todavia.',
    }
  }

  const socioId = String(formData.get('socio_id') ?? '').trim()
  const tipo = String(formData.get('tipo') ?? '').trim()
  const montoRaw = String(formData.get('monto') ?? '').trim()
  const fecha = String(formData.get('fecha') ?? '').trim()
  const descripcion = String(formData.get('descripcion') ?? '').trim()
  const cuentaId = String(formData.get('cuenta_id') ?? '').trim()

  if (!socioId) return { ok: false, mensaje: 'Selecciona un socio.' }
  if (!esTipoValido(tipo))
    return { ok: false, mensaje: 'Selecciona un tipo de movimiento valido.' }

  const monto = Number(montoRaw.replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(monto) || monto <= 0)
    return { ok: false, mensaje: 'El monto debe ser mayor a cero.' }

  const meta = TIPOS_MOVIMIENTO[tipo]
  const fechaFinal = fecha || new Date().toISOString().slice(0, 10)

  try {
    const supabase = createServerSupabaseClient()

    const { data: movimiento, error } = await supabase
      .from('movimientos_socio')
      .insert({
        socio_id: socioId,
        tipo,
        monto,
        fecha: fechaFinal,
        descripcion: descripcion || null,
      })
      .select('id')
      .single()

    if (error) return { ok: false, mensaje: error.message }

    // Registrar el movimiento de dinero en tesoreria
    let avisoCaja = ''
    if (cuentaId) {
      const { data: socio } = await supabase
        .from('socios')
        .select('nombre')
        .eq('id', socioId)
        .single()

      const usuario = await obtenerNombreUsuarioActual()
      const { error: errCaja } = await supabase.from('movimientos_tesoreria').insert({
        cuenta_id: cuentaId,
        fecha: fechaFinal,
        tipo: meta.direccion === 'ENTRA' ? 'INGRESO' : 'EGRESO',
        categoria: CATEGORIA_TESORERIA[tipo],
        monto,
        concepto: `${meta.etiqueta} - ${socio?.nombre ?? 'socio'}`,
        movimiento_socio_id: movimiento.id,
        medio_pago: 'Transferencia',
        notas: descripcion || null,
        creado_por_id: usuario.id,
        creado_por_nombre: usuario.nombre,
      })

      if (errCaja) {
        avisoCaja = ` Ojo: no se pudo registrar en caja (${errCaja.message}).`
      } else {
        avisoCaja = meta.direccion === 'ENTRA'
          ? ' El dinero entro a la cuenta.'
          : ' El dinero salio de la cuenta.'
      }
    } else {
      avisoCaja = ' No se registro movimiento de caja.'
    }

    revalidatePath('/socios')
    revalidatePath('/tesoreria')
    revalidatePath('/financiero')
    revalidatePath('/')

    return {
      ok: true,
      mensaje: `${meta.etiqueta} registrado.${avisoCaja}`,
    }
  } catch (e) {
    return {
      ok: false,
      mensaje: e instanceof Error ? e.message : 'Error al registrar.',
    }
  }
}

/** Elimina un movimiento (por si se registro por error) */
export async function eliminarMovimiento(
  formData: FormData
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    return { ok: false, mensaje: 'La base de datos no esta configurada.' }
  }

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'Movimiento no valido.' }

  try {
    const supabase = createServerSupabaseClient()

    // Borrar primero el movimiento de caja asociado
    await supabase.from('movimientos_tesoreria').delete().eq('movimiento_socio_id', id)

    const { error } = await supabase
      .from('movimientos_socio')
      .delete()
      .eq('id', id)

    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/socios')
    revalidatePath('/tesoreria')
    revalidatePath('/financiero')
    revalidatePath('/')
    return { ok: true, mensaje: 'Movimiento eliminado. Tambien se revirtio el movimiento de caja.' }
  } catch (e) {
    return {
      ok: false,
      mensaje: e instanceof Error ? e.message : 'Error al eliminar.',
    }
  }
}
