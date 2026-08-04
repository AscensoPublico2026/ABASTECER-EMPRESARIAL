'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { uppercaseFormData } from '@/lib/uppercase'
import { obtenerNombreUsuarioActual } from '@/lib/queries/perfil'
import { recalcularCostoCotizacion } from '@/lib/queries/costeo'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

function monto(v: FormDataEntryValue | null): number {
  return Number(String(v ?? '0').replace(/\./g, '').replace(',', '.')) || 0
}

const _fmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
})

function fmtCop(v: number): string {
  return _fmt.format(v)
}

// ============================================================
// REGISTRAR GASTO
// Puede ser:
//   - Gasto operativo general (arriendo, dominio, etc.)
//   - Costo de una venta especifica (flete, mano de obra)
// Si no hay factura, genera Documento Soporte para que sea deducible.
// ============================================================
export async function registrarGasto(formData: FormData): Promise<ResultadoAccion> {
  uppercaseFormData(formData)

  const concepto = String(formData.get('concepto') ?? '').trim()
  const valor = monto(formData.get('monto'))
  const iva_incluido = monto(formData.get('iva_incluido'))
  const fecha = String(formData.get('fecha') ?? '').trim() || new Date().toISOString().slice(0, 10)
  const categoria = String(formData.get('categoria') ?? 'OTROS').trim()
  const cotizacion_id = String(formData.get('cotizacion_id') ?? '').trim()
  const es_costo_venta = formData.get('es_costo_venta') === 'on' || formData.get('es_costo_venta') === 'true'
  const tipo_soporte = String(formData.get('tipo_soporte') ?? 'NINGUNO').trim()
  const soporte_url = String(formData.get('soporte_url') ?? '').trim()
  const cuenta_id = String(formData.get('cuenta_id') ?? '').trim()

  // Datos del tercero (para documento soporte)
  const tercero_nombre = String(formData.get('tercero_nombre') ?? '').trim()
  const tercero_documento = String(formData.get('tercero_documento') ?? '').trim()
  const tercero_tipo_documento = String(formData.get('tercero_tipo_documento') ?? 'CC').trim()
  const tercero_telefono = String(formData.get('tercero_telefono') ?? '').trim()
  const tercero_direccion = String(formData.get('tercero_direccion') ?? '').trim()

  if (!concepto) return { ok: false, mensaje: 'El concepto es obligatorio.' }
  if (valor <= 0) return { ok: false, mensaje: 'El monto debe ser mayor a cero.' }
  if (iva_incluido > valor) return { ok: false, mensaje: 'El IVA no puede ser mayor al monto total.' }
  if (es_costo_venta && !cotizacion_id) {
    return { ok: false, mensaje: 'Si es costo de una venta, selecciona la cotizacion.' }
  }
  if (tipo_soporte === 'DOCUMENTO_SOPORTE' && (!tercero_nombre || !tercero_documento)) {
    return { ok: false, mensaje: 'Para el documento soporte necesitas el nombre y el documento del tercero.' }
  }
  // Un gasto es plata que ya salio. Sin cuenta el saldo quedaria inflado.
  if (!cuenta_id) {
    return { ok: false, mensaje: 'Selecciona de que cuenta se pago el gasto para poder descontarlo del saldo.' }
  }

  // Es deducible si hay factura del proveedor o documento soporte
  const tieneFactura = tipo_soporte === 'FACTURA'
  const haraDocSoporte = tipo_soporte === 'DOCUMENTO_SOPORTE'
  const deducible = tieneFactura || haraDocSoporte
  const tiene_soporte = deducible

  try {
    const supabase = createServerSupabaseClient()
    const usuario = await obtenerNombreUsuarioActual()

    const { data: gasto, error } = await supabase
      .from('gastos')
      .insert({
        concepto,
        monto: valor,
        iva_incluido,
        fecha,
        categoria,
        cotizacion_id: cotizacion_id || null,
        es_costo_venta,
        tiene_soporte,
        deducible,
        tercero_nombre: tercero_nombre || null,
        tercero_documento: tercero_documento || null,
        pagado_por: formData.get('pagado_por') || null,
        forma_pago: formData.get('forma_pago') || 'Efectivo',
        soporte_url: soporte_url || null,
        notas: formData.get('notas') || null,
      })
      .select('id')
      .single()

    if (error) return { ok: false, mensaje: error.message }

    // Generar documento soporte si corresponde
    let numeroDS: string | null = null
    if (haraDocSoporte) {
      const { data: ds, error: errDs } = await supabase
        .from('documentos_soporte')
        .insert({
          fecha,
          tercero_nombre,
          tercero_tipo_documento,
          tercero_documento,
          tercero_telefono: tercero_telefono || null,
          tercero_direccion: tercero_direccion || null,
          concepto,
          cantidad: 1,
          valor_unitario: valor,
          cotizacion_id: cotizacion_id || null,
          gasto_id: gasto.id,
          creado_por_id: usuario.id,
          creado_por_nombre: usuario.nombre,
        })
        .select('id, numero')
        .single()

      if (errDs) {
        return { ok: false, mensaje: `Gasto guardado pero fallo el documento soporte: ${errDs.message}` }
      }

      numeroDS = ds.numero as string
      await supabase.from('gastos').update({ documento_soporte_id: ds.id }).eq('id', gasto.id)
    }

    // Adjuntar soporte al repositorio de documentos
    if (soporte_url) {
      await supabase.from('documentos').insert({
        entidad_tipo: 'GASTO',
        entidad_id: gasto.id,
        tipo_documento: tieneFactura ? 'FACTURA' : 'SOPORTE_PAGO',
        nombre_archivo: String(formData.get('soporte_nombre') ?? 'soporte_gasto.pdf'),
        url_archivo: soporte_url,
      })
    }

    // Movimiento de tesoreria
    if (cuenta_id) {
      await supabase.from('movimientos_tesoreria').insert({
        cuenta_id,
        fecha,
        tipo: 'EGRESO',
        categoria: 'GASTO',
        monto: valor,
        concepto,
        gasto_id: gasto.id,
        cotizacion_id: cotizacion_id || null,
        medio_pago: String(formData.get('forma_pago') ?? 'Efectivo'),
        soporte_url: soporte_url || null,
        creado_por_id: usuario.id,
        creado_por_nombre: usuario.nombre,
      })
    }

    // Si es costo de venta, recalcular la utilidad de esa cotizacion
    if (es_costo_venta && cotizacion_id) {
      await recalcularCostoCotizacion(supabase, cotizacion_id)
      revalidatePath(`/ventas/${cotizacion_id}`)
    }

    revalidatePath('/gastos')
    revalidatePath('/financiero')
    revalidatePath('/ventas')
    revalidatePath('/panel')

    const partes = ['Gasto registrado.']
    if (numeroDS) partes.push(`Documento soporte ${numeroDS} generado.`)
    if (!deducible) partes.push('Sin soporte: NO es deducible de impuestos.')
    if (es_costo_venta) partes.push('Imputado al costo de la venta.')

    return { ok: true, mensaje: partes.join(' ') }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}

// ============================================================
// ELIMINAR GASTO
// ============================================================
export async function eliminarGasto(formData: FormData): Promise<ResultadoAccion> {
  const gasto_id = String(formData.get('gasto_id') ?? '').trim()
  if (!gasto_id) return { ok: false, mensaje: 'Gasto no valido.' }

  try {
    const supabase = createServerSupabaseClient()

    const { data: gasto } = await supabase
      .from('gastos')
      .select('cotizacion_id, es_costo_venta, concepto')
      .eq('id', gasto_id)
      .single()

    if (!gasto) return { ok: false, mensaje: 'Gasto no encontrado.' }

    await supabase.from('movimientos_tesoreria').delete().eq('gasto_id', gasto_id)
    await supabase.from('documentos_soporte').delete().eq('gasto_id', gasto_id)
    await supabase.from('documentos').delete().eq('entidad_tipo', 'GASTO').eq('entidad_id', gasto_id)

    const { error } = await supabase.from('gastos').delete().eq('id', gasto_id)
    if (error) return { ok: false, mensaje: error.message }

    if (gasto.es_costo_venta && gasto.cotizacion_id) {
      await recalcularCostoCotizacion(supabase, gasto.cotizacion_id as string)
      revalidatePath(`/ventas/${gasto.cotizacion_id}`)
    }

    revalidatePath('/gastos')
    revalidatePath('/financiero')
    revalidatePath('/panel')

    return { ok: true, mensaje: `Gasto "${gasto.concepto}" eliminado.` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}

// ============================================================
// COMPLETAR DOCUMENTO SOPORTE DE UN GASTO EXISTENTE
// Para cuando se consiguen los datos del tercero despues
// ============================================================
export async function completarDocumentoSoporte(formData: FormData): Promise<ResultadoAccion> {
  uppercaseFormData(formData)
  const gasto_id = String(formData.get('gasto_id') ?? '').trim()
  const tercero_nombre = String(formData.get('tercero_nombre') ?? '').trim()
  const tercero_documento = String(formData.get('tercero_documento') ?? '').trim()
  const tercero_tipo_documento = String(formData.get('tercero_tipo_documento') ?? 'CC').trim()
  const tercero_telefono = String(formData.get('tercero_telefono') ?? '').trim()
  const tercero_direccion = String(formData.get('tercero_direccion') ?? '').trim()

  if (!gasto_id) return { ok: false, mensaje: 'Gasto no valido.' }
  if (!tercero_nombre || !tercero_documento) {
    return { ok: false, mensaje: 'Nombre y documento del tercero son obligatorios.' }
  }

  try {
    const supabase = createServerSupabaseClient()
    const usuario = await obtenerNombreUsuarioActual()

    const { data: gasto } = await supabase
      .from('gastos')
      .select('id, concepto, monto, fecha, cotizacion_id, documento_soporte_id')
      .eq('id', gasto_id)
      .single()

    if (!gasto) return { ok: false, mensaje: 'Gasto no encontrado.' }
    if (gasto.documento_soporte_id) {
      return { ok: false, mensaje: 'Este gasto ya tiene documento soporte.' }
    }

    const { data: ds, error } = await supabase
      .from('documentos_soporte')
      .insert({
        fecha: gasto.fecha,
        tercero_nombre,
        tercero_tipo_documento,
        tercero_documento,
        tercero_telefono: tercero_telefono || null,
        tercero_direccion: tercero_direccion || null,
        concepto: gasto.concepto,
        cantidad: 1,
        valor_unitario: gasto.monto,
        cotizacion_id: gasto.cotizacion_id,
        gasto_id: gasto.id,
        creado_por_id: usuario.id,
        creado_por_nombre: usuario.nombre,
      })
      .select('id, numero')
      .single()

    if (error) return { ok: false, mensaje: error.message }

    await supabase
      .from('gastos')
      .update({
        documento_soporte_id: ds.id,
        tiene_soporte: true,
        deducible: true,
        tercero_nombre,
        tercero_documento,
      })
      .eq('id', gasto_id)

    revalidatePath('/gastos')
    revalidatePath('/financiero')
    if (gasto.cotizacion_id) revalidatePath(`/ventas/${gasto.cotizacion_id}`)

    return { ok: true, mensaje: `Documento soporte ${ds.numero} generado. El gasto ya es deducible.` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}



// ============================================================
// CARGAR UN GASTO PARA EDITARLO
// ============================================================
export interface GastoDetalle {
  id: string
  concepto: string
  monto: number
  iva_incluido: number
  fecha: string
  categoria: string
  cotizacion_id: string | null
  es_costo_venta: boolean
  deducible: boolean
  tiene_soporte: boolean
  tercero_nombre: string | null
  tercero_documento: string | null
  pagado_por: string | null
  forma_pago: string | null
  notas: string | null
  soporte_url: string | null
  cuenta_id: string | null
  tiene_documento_soporte: boolean
}

export async function cargarGastoParaEditar(gasto_id: string): Promise<GastoDetalle | null> {
  if (!gasto_id) return null
  try {
    const supabase = createServerSupabaseClient()

    const { data: g } = await supabase
      .from('gastos')
      .select('*')
      .eq('id', gasto_id)
      .maybeSingle()

    if (!g) return null

    // De que cuenta salio (esta en el movimiento de tesoreria)
    const { data: mov } = await supabase
      .from('movimientos_tesoreria')
      .select('cuenta_id')
      .eq('gasto_id', gasto_id)
      .neq('categoria', 'GMF')
      .limit(1)
      .maybeSingle()

    // Tiene documento soporte generado?
    const { data: ds } = await supabase
      .from('documentos_soporte')
      .select('id')
      .eq('gasto_id', gasto_id)
      .limit(1)
      .maybeSingle()

    return {
      id: String(g.id),
      concepto: String(g.concepto ?? ''),
      monto: Number(g.monto ?? 0),
      iva_incluido: Number(g.iva_incluido ?? 0),
      fecha: String(g.fecha ?? '').slice(0, 10),
      categoria: String(g.categoria ?? 'OTROS'),
      cotizacion_id: (g.cotizacion_id as string | null) ?? null,
      es_costo_venta: Boolean(g.es_costo_venta),
      deducible: Boolean(g.deducible),
      tiene_soporte: Boolean(g.tiene_soporte),
      tercero_nombre: (g.tercero_nombre as string | null) ?? null,
      tercero_documento: (g.tercero_documento as string | null) ?? null,
      pagado_por: (g.pagado_por as string | null) ?? null,
      forma_pago: (g.forma_pago as string | null) ?? null,
      notas: (g.notas as string | null) ?? null,
      soporte_url: (g.soporte_url as string | null) ?? null,
      cuenta_id: mov?.cuenta_id ? String(mov.cuenta_id) : null,
      tiene_documento_soporte: Boolean(ds),
    }
  } catch {
    return null
  }
}


// ============================================================
// EDITAR GASTO
// Corrige monto, concepto, fecha, categoria y a que venta se imputa.
// Sincroniza el movimiento de caja: si cambia el monto o la cuenta, la
// salida de dinero se ajusta para que el saldo del banco cuadre.
// ============================================================
export async function editarGasto(formData: FormData): Promise<ResultadoAccion> {
  uppercaseFormData(formData)

  const gasto_id = String(formData.get('gasto_id') ?? '').trim()
  const concepto = String(formData.get('concepto') ?? '').trim()
  const valor = monto(formData.get('monto'))
  const iva_incluido = monto(formData.get('iva_incluido'))
  const fecha = String(formData.get('fecha') ?? '').trim()
  const categoria = String(formData.get('categoria') ?? 'OTROS').trim()
  const cotizacion_id = String(formData.get('cotizacion_id') ?? '').trim()
  const es_costo_venta = formData.get('es_costo_venta') === 'on' || formData.get('es_costo_venta') === 'true'
  const cuenta_id = String(formData.get('cuenta_id') ?? '').trim()
  const notas = String(formData.get('notas') ?? '').trim()

  if (!gasto_id) return { ok: false, mensaje: 'Gasto no valido.' }
  if (!concepto) return { ok: false, mensaje: 'El concepto es obligatorio.' }
  if (valor <= 0) return { ok: false, mensaje: 'El monto debe ser mayor a cero.' }
  if (iva_incluido > valor) return { ok: false, mensaje: 'El IVA no puede ser mayor al monto total.' }
  if (es_costo_venta && !cotizacion_id) {
    return { ok: false, mensaje: 'Si es costo de una venta, selecciona la cotizacion.' }
  }
  if (!cuenta_id) {
    return { ok: false, mensaje: 'Selecciona de que cuenta se pago el gasto.' }
  }

  try {
    const supabase = createServerSupabaseClient()

    // Estado anterior, para saber que recalcular
    const { data: antes } = await supabase
      .from('gastos')
      .select('monto, cotizacion_id, es_costo_venta')
      .eq('id', gasto_id)
      .maybeSingle()

    if (!antes) return { ok: false, mensaje: 'Gasto no encontrado.' }

    const montoAnterior = Number(antes.monto ?? 0)
    const cotizacionAnterior = (antes.cotizacion_id as string | null) ?? null

    // 1. Actualizar el gasto
    const { error: errUpd } = await supabase
      .from('gastos')
      .update({
        concepto,
        monto: valor,
        iva_incluido,
        fecha,
        categoria,
        cotizacion_id: es_costo_venta ? cotizacion_id : null,
        es_costo_venta,
        notas: notas || null,
      })
      .eq('id', gasto_id)

    if (errUpd) return { ok: false, mensaje: errUpd.message }

    // 2. Sincronizar el movimiento de caja
    // Si cambio el monto o la cuenta, el movimiento viejo quedaria mal y
    // el saldo del banco no cuadraria. Se borra y se crea de nuevo.
    // Al borrarlo, su GMF se va en cascada; al crearlo, el trigger genera
    // el GMF nuevo con el monto correcto.
    let avisoCaja = ''
    await supabase.from('movimientos_tesoreria').delete().eq('gasto_id', gasto_id)

    const usuario = await obtenerNombreUsuarioActual()
    const { error: errCaja } = await supabase.from('movimientos_tesoreria').insert({
      cuenta_id,
      fecha,
      tipo: 'EGRESO',
      categoria: 'GASTO',
      monto: valor,
      concepto,
      gasto_id,
      cotizacion_id: es_costo_venta ? cotizacion_id : null,
      medio_pago: String(formData.get('forma_pago') ?? 'Transferencia'),
      creado_por_id: usuario.id,
      creado_por_nombre: usuario.nombre,
    })

    if (errCaja) {
      avisoCaja = ` Ojo: no se pudo actualizar la salida de caja (${errCaja.message}).`
    } else if (montoAnterior !== valor) {
      avisoCaja = ` La salida de caja se ajusto de ${fmtCop(montoAnterior)} a ${fmtCop(valor)}.`
    }

    // 3. Recalcular las ventas afectadas: la de antes y la de ahora
    const porRecalcular = new Set<string>()
    if (cotizacionAnterior) porRecalcular.add(cotizacionAnterior)
    if (es_costo_venta && cotizacion_id) porRecalcular.add(cotizacion_id)

    for (const cid of Array.from(porRecalcular)) {
      await recalcularCostoCotizacion(supabase, cid)
      revalidatePath(`/ventas/${cid}`)
    }

    revalidatePath('/gastos')
    revalidatePath('/financiero')
    revalidatePath('/tesoreria')
    revalidatePath('/ventas')
    revalidatePath('/panel')
    revalidatePath('/')

    return {
      ok: true,
      mensaje: `Gasto actualizado: ${fmtCop(valor)}.${avisoCaja}`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al editar.' }
  }
}
