'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

interface ItemInput {
  producto_id: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
  costo_unitario: number
  iva_porcentaje: number
}

/** Crear cotizacion (COT-2026-XXX) */
export async function crearCotizacion(formData: FormData): Promise<ResultadoAccion> {
  const cliente_id = String(formData.get('cliente_id') ?? '').trim()
  const fecha = String(formData.get('fecha') ?? '').trim()
  const fecha_validez = String(formData.get('fecha_validez') ?? '').trim()
  const forma_pago = String(formData.get('forma_pago') ?? 'Contado').trim()
  const observaciones = String(formData.get('observaciones') ?? '').trim()
  const itemsJson = String(formData.get('items') ?? '[]')

  let items: ItemInput[]
  try { items = JSON.parse(itemsJson) } catch { return { ok: false, mensaje: 'Error en los items.' } }
  if (items.length === 0) return { ok: false, mensaje: 'Agrega al menos un item.' }

  let subtotal = 0, iva_total = 0, costo_total = 0
  const itemsCalculados = items.map((item) => {
    const sub = item.cantidad * item.precio_unitario
    const iva = sub * (item.iva_porcentaje / 100)
    const costo = item.cantidad * item.costo_unitario
    subtotal += sub; iva_total += iva; costo_total += costo
    return { producto_id: item.producto_id || null, descripcion: item.descripcion, cantidad: item.cantidad, precio_unitario: item.precio_unitario, costo_unitario: item.costo_unitario, iva_porcentaje: item.iva_porcentaje, iva_valor: Math.round(iva), subtotal: Math.round(sub), total: Math.round(sub + iva), utilidad: Math.round(sub - costo) }
  })

  const total = Math.round(subtotal + iva_total)
  const utilidad_estimada = Math.round(subtotal - costo_total)
  const margen_pct = subtotal > 0 ? Math.round((utilidad_estimada / subtotal) * 10000) / 100 : 0
  let dias_credito = 0
  if (forma_pago.includes('15')) dias_credito = 15
  else if (forma_pago.includes('30')) dias_credito = 30
  else if (forma_pago.includes('45')) dias_credito = 45
  else if (forma_pago.includes('60')) dias_credito = 60

  try {
    const supabase = createServerSupabaseClient()
    const { data: cot, error: errorCot } = await supabase.from('cotizaciones').insert({
      numero: '', cliente_id: cliente_id || null, fecha: fecha || new Date().toISOString().slice(0, 10),
      fecha_validez: fecha_validez || null, subtotal: Math.round(subtotal), iva_total: Math.round(iva_total),
      total, costo_total: Math.round(costo_total), utilidad_estimada, margen_pct, estado: 'PENDIENTE',
      forma_pago, dias_credito, observaciones: observaciones || null,
    }).select('id, numero').single()
    if (errorCot) return { ok: false, mensaje: errorCot.message }

    const { error: errorItems } = await supabase.from('cotizacion_items').insert(
      itemsCalculados.map((item) => ({ ...item, cotizacion_id: cot.id }))
    )
    if (errorItems) return { ok: false, mensaje: errorItems.message }

    revalidatePath('/ventas')
    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
    return { ok: true, mensaje: `Cotizacion ${cot.numero} creada: ${fmt.format(total)} | Utilidad: ${fmt.format(utilidad_estimada)} (${margen_pct}%)` }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al crear.' } }
}

/** Aprobar cotizacion (PENDIENTE -> APROBADA) */
export async function aprobarCotizacion(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'ID invalido.' }
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('cotizaciones').update({ estado: 'APROBADA' }).eq('id', id)
    if (error) return { ok: false, mensaje: error.message }
    revalidatePath('/ventas')
    return { ok: true, mensaje: 'Cotizacion aprobada. Puedes cerrar la venta.' }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}

/** Cerrar venta = marcar como facturada + registrar numero DIAN */
export async function cerrarVenta(formData: FormData): Promise<ResultadoAccion> {
  const cotizacion_id = String(formData.get('cotizacion_id') ?? '').trim()
  const numero_factura_dian = String(formData.get('numero_factura_dian') ?? '').trim()
  const oc_cliente = String(formData.get('oc_cliente') ?? '').trim()
  if (!cotizacion_id) return { ok: false, mensaje: 'Cotizacion no valida.' }
  if (!numero_factura_dian) return { ok: false, mensaje: 'Ingresa el numero de factura DIAN.' }

  try {
    const supabase = createServerSupabaseClient()

    // Obtener datos de la cotizacion
    const { data: cot, error: errorCot } = await supabase.from('cotizaciones')
      .select('*, cotizacion_items(*)')
      .eq('id', cotizacion_id).single()
    if (errorCot || !cot) return { ok: false, mensaje: errorCot?.message ?? 'Cotizacion no encontrada.' }

    // Verificar OC obligatoria para credito
    if (cot.dias_credito > 0 && !oc_cliente) {
      return { ok: false, mensaje: 'Para clientes a credito, la Orden de Compra es obligatoria (Decision #019). Sin OC no se despacha.' }
    }

    // Calcular fecha vencimiento
    let fecha_vencimiento: string | null = null
    if (cot.dias_credito > 0) {
      const fv = new Date()
      fv.setDate(fv.getDate() + cot.dias_credito)
      fecha_vencimiento = fv.toISOString().slice(0, 10)
    }

    // Crear factura de venta
    const { data: fv, error: errorFv } = await supabase.from('facturas_venta').insert({
      cotizacion_id, cliente_id: cot.cliente_id, numero_factura_dian,
      fecha: new Date().toISOString().slice(0, 10), fecha_vencimiento,
      subtotal: cot.subtotal, iva_total: cot.iva_total, total: cot.total,
      costo_total: cot.costo_total, utilidad: cot.utilidad_estimada, margen_pct: cot.margen_pct,
      forma_pago: cot.forma_pago, dias_credito: cot.dias_credito,
      estado: cot.dias_credito > 0 ? 'EMITIDA' : 'COBRADA',
      oc_cliente: oc_cliente || cot.oc_cliente,
    }).select('id').single()
    if (errorFv) return { ok: false, mensaje: errorFv.message }

    // Crear items de factura (con costo real del catalogo actual)
    const items = (cot.cotizacion_items ?? []).map((item: Record<string, unknown>) => ({
      factura_venta_id: fv.id, producto_id: item.producto_id || null,
      descripcion: item.descripcion, cantidad: Number(item.cantidad),
      precio_unitario: Number(item.precio_unitario), costo_unitario: Number(item.costo_unitario),
      iva_porcentaje: Number(item.iva_porcentaje), iva_valor: Number(item.iva_valor),
      subtotal: Number(item.subtotal), total: Number(item.total), utilidad: Number(item.utilidad),
    }))

    const { error: errorItems } = await supabase.from('factura_venta_items').insert(items)
    if (errorItems) return { ok: false, mensaje: errorItems.message }

    // Actualizar cotizacion a FACTURADA
    await supabase.from('cotizaciones').update({ estado: 'FACTURADA' }).eq('id', cotizacion_id)

    // Registrar documentos adjuntos (PDFs subidos desde el cliente)
    const factura_pdf_url = String(formData.get('factura_pdf_url') ?? '').trim()
    const factura_pdf_nombre = String(formData.get('factura_pdf_nombre') ?? '').trim()
    const oc_pdf_url = String(formData.get('oc_pdf_url') ?? '').trim()
    const oc_pdf_nombre = String(formData.get('oc_pdf_nombre') ?? '').trim()

    const docsAInsertar = []

    if (factura_pdf_url) {
      docsAInsertar.push({
        entidad_tipo: 'FACTURA_VENTA',
        entidad_id: fv.id,
        tipo_documento: 'FACTURA',
        nombre_archivo: factura_pdf_nombre || 'factura.pdf',
        url_archivo: factura_pdf_url,
      })
    }

    if (oc_pdf_url) {
      docsAInsertar.push({
        entidad_tipo: 'FACTURA_VENTA',
        entidad_id: fv.id,
        tipo_documento: 'ORDEN_COMPRA',
        nombre_archivo: oc_pdf_nombre || 'oc.pdf',
        url_archivo: oc_pdf_url,
      })
      // Guardar URL de OC en la factura tambien
      await supabase.from('facturas_venta').update({ oc_cliente_url: oc_pdf_url }).eq('id', fv.id)
    }

    if (docsAInsertar.length > 0) {
      await supabase.from('documentos').insert(docsAInsertar)
    }

    revalidatePath('/ventas')
    revalidatePath('/financiero')
    return { ok: true, mensaje: `Venta cerrada. Factura DIAN: ${numero_factura_dian}. ${cot.dias_credito > 0 ? 'Cuenta por cobrar registrada.' : 'Cobrada (contado).'}` }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al cerrar venta.' } }
}

/** Venta directa (sin cotizacion previa) */
export async function ventaDirecta(formData: FormData): Promise<ResultadoAccion> {
  const cliente_id = String(formData.get('cliente_id') ?? '').trim()
  const numero_factura_dian = String(formData.get('numero_factura_dian') ?? '').trim()
  const fecha = String(formData.get('fecha') ?? new Date().toISOString().slice(0, 10)).trim()
  const forma_pago = String(formData.get('forma_pago') ?? 'Contado').trim()
  const itemsJson = String(formData.get('items') ?? '[]')

  if (!numero_factura_dian) return { ok: false, mensaje: 'Ingresa el numero de factura DIAN.' }

  let items: ItemInput[]
  try { items = JSON.parse(itemsJson) } catch { return { ok: false, mensaje: 'Error en los items.' } }
  if (items.length === 0) return { ok: false, mensaje: 'Agrega al menos un item.' }

  let subtotal = 0, iva_total = 0, costo_total = 0
  const itemsCalculados = items.map((item) => {
    const sub = item.cantidad * item.precio_unitario
    const iva = sub * (item.iva_porcentaje / 100)
    const costo = item.cantidad * item.costo_unitario
    subtotal += sub; iva_total += iva; costo_total += costo
    return { producto_id: item.producto_id || null, descripcion: item.descripcion, cantidad: item.cantidad, precio_unitario: item.precio_unitario, costo_unitario: item.costo_unitario, iva_porcentaje: item.iva_porcentaje, iva_valor: Math.round(iva), subtotal: Math.round(sub), total: Math.round(sub + iva), utilidad: Math.round(sub - costo) }
  })

  const total = Math.round(subtotal + iva_total)
  const utilidad = Math.round(subtotal - costo_total)
  const margen_pct = subtotal > 0 ? Math.round((utilidad / subtotal) * 10000) / 100 : 0

  let dias_credito = 0
  if (forma_pago.includes('15')) dias_credito = 15
  else if (forma_pago.includes('30')) dias_credito = 30
  else if (forma_pago.includes('45')) dias_credito = 45
  else if (forma_pago.includes('60')) dias_credito = 60

  let fecha_vencimiento: string | null = null
  if (dias_credito > 0) {
    const fv = new Date(fecha)
    fv.setDate(fv.getDate() + dias_credito)
    fecha_vencimiento = fv.toISOString().slice(0, 10)
  }

  try {
    const supabase = createServerSupabaseClient()
    const { data: fv, error: errorFv } = await supabase.from('facturas_venta').insert({
      cliente_id: cliente_id || null, numero_factura_dian, fecha, fecha_vencimiento,
      subtotal: Math.round(subtotal), iva_total: Math.round(iva_total), total,
      costo_total: Math.round(costo_total), utilidad, margen_pct,
      forma_pago, dias_credito, estado: dias_credito > 0 ? 'EMITIDA' : 'COBRADA',
    }).select('id').single()
    if (errorFv) return { ok: false, mensaje: errorFv.message }

    const { error: errorItems } = await supabase.from('factura_venta_items').insert(
      itemsCalculados.map((item) => ({ ...item, factura_venta_id: fv.id }))
    )
    if (errorItems) return { ok: false, mensaje: errorItems.message }

    revalidatePath('/ventas')
    revalidatePath('/financiero')
    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
    return { ok: true, mensaje: `Venta directa registrada: ${fmt.format(total)} | Utilidad: ${fmt.format(utilidad)} (${margen_pct}%)` }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}


/** Editar cotizacion (solo si NO esta FACTURADA) */
export async function editarCotizacion(formData: FormData): Promise<ResultadoAccion> {
  const cotizacion_id = String(formData.get('cotizacion_id') ?? '').trim()
  const cliente_id = String(formData.get('cliente_id') ?? '').trim()
  const fecha = String(formData.get('fecha') ?? '').trim()
  const fecha_validez = String(formData.get('fecha_validez') ?? '').trim()
  const forma_pago = String(formData.get('forma_pago') ?? 'Contado').trim()
  const observaciones = String(formData.get('observaciones') ?? '').trim()
  const itemsJson = String(formData.get('items') ?? '[]')

  if (!cotizacion_id) return { ok: false, mensaje: 'Cotizacion no valida.' }

  let items: ItemInput[]
  try { items = JSON.parse(itemsJson) } catch { return { ok: false, mensaje: 'Error en los items.' } }
  if (items.length === 0) return { ok: false, mensaje: 'Agrega al menos un item.' }

  let subtotal = 0, iva_total = 0, costo_total = 0
  const itemsCalculados = items.map((item) => {
    const sub = item.cantidad * item.precio_unitario
    const iva = sub * (item.iva_porcentaje / 100)
    const costo = item.cantidad * item.costo_unitario
    subtotal += sub; iva_total += iva; costo_total += costo
    return { producto_id: item.producto_id || null, descripcion: item.descripcion, cantidad: item.cantidad, precio_unitario: item.precio_unitario, costo_unitario: item.costo_unitario, iva_porcentaje: item.iva_porcentaje, iva_valor: Math.round(iva), subtotal: Math.round(sub), total: Math.round(sub + iva), utilidad: Math.round(sub - costo) }
  })

  const total = Math.round(subtotal + iva_total)
  const utilidad_estimada = Math.round(subtotal - costo_total)
  const margen_pct = subtotal > 0 ? Math.round((utilidad_estimada / subtotal) * 10000) / 100 : 0

  let dias_credito = 0
  if (forma_pago.includes('15')) dias_credito = 15
  else if (forma_pago.includes('30')) dias_credito = 30
  else if (forma_pago.includes('45')) dias_credito = 45
  else if (forma_pago.includes('60')) dias_credito = 60

  try {
    const supabase = createServerSupabaseClient()

    // Verificar que la cotizacion existe y NO esta facturada
    const { data: cotActual, error: errCheck } = await supabase
      .from('cotizaciones')
      .select('estado')
      .eq('id', cotizacion_id)
      .single()

    if (errCheck || !cotActual) return { ok: false, mensaje: 'Cotizacion no encontrada.' }
    if (cotActual.estado === 'FACTURADA') return { ok: false, mensaje: 'No se puede editar una cotizacion ya facturada.' }

    // Actualizar la cotizacion
    const { error: errorUpdate } = await supabase.from('cotizaciones').update({
      cliente_id: cliente_id || null,
      fecha: fecha || new Date().toISOString().slice(0, 10),
      fecha_validez: fecha_validez || null,
      subtotal: Math.round(subtotal),
      iva_total: Math.round(iva_total),
      total,
      costo_total: Math.round(costo_total),
      utilidad_estimada,
      margen_pct,
      forma_pago,
      dias_credito,
      observaciones: observaciones || null,
    }).eq('id', cotizacion_id)

    if (errorUpdate) return { ok: false, mensaje: errorUpdate.message }

    // Eliminar items anteriores y crear los nuevos
    await supabase.from('cotizacion_items').delete().eq('cotizacion_id', cotizacion_id)

    const { error: errorItems } = await supabase.from('cotizacion_items').insert(
      itemsCalculados.map((item) => ({ ...item, cotizacion_id }))
    )
    if (errorItems) return { ok: false, mensaje: errorItems.message }

    revalidatePath('/ventas')
    revalidatePath(`/ventas/${cotizacion_id}`)
    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
    return { ok: true, mensaje: `Cotizacion actualizada: ${fmt.format(total)} | Utilidad: ${fmt.format(utilidad_estimada)} (${margen_pct}%)` }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al editar.' } }
}


/** Marcar factura de venta como cobrada */
export async function marcarFacturaCobrada(formData: FormData): Promise<ResultadoAccion> {
  const factura_venta_id = String(formData.get('factura_venta_id') ?? '').trim()
  const soporte_url = String(formData.get('soporte_url') ?? '').trim()
  const soporte_nombre = String(formData.get('soporte_nombre') ?? '').trim()

  if (!factura_venta_id) return { ok: false, mensaje: 'Factura no valida.' }

  try {
    const supabase = createServerSupabaseClient()

    // Actualizar estado a COBRADA
    const { error } = await supabase
      .from('facturas_venta')
      .update({ estado: 'COBRADA' })
      .eq('id', factura_venta_id)

    if (error) return { ok: false, mensaje: error.message }

    // Registrar soporte de pago si se subio
    if (soporte_url) {
      await supabase.from('documentos').insert({
        entidad_tipo: 'FACTURA_VENTA',
        entidad_id: factura_venta_id,
        tipo_documento: 'SOPORTE_PAGO',
        nombre_archivo: soporte_nombre || 'soporte_pago.pdf',
        url_archivo: soporte_url,
      })
    }

    revalidatePath('/ventas')
    revalidatePath('/financiero')
    return { ok: true, mensaje: 'Factura marcada como cobrada.' }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}
