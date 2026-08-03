'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { obtenerNombreUsuarioActual } from '@/lib/queries/perfil'
import { uppercaseFormData } from '@/lib/uppercase'

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
  uppercaseFormData(formData)
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
    const usuario = await obtenerNombreUsuarioActual()
    const { data: cot, error: errorCot } = await supabase.from('cotizaciones').insert({
      numero: '', cliente_id: cliente_id || null, fecha: fecha || new Date().toISOString().slice(0, 10),
      fecha_validez: fecha_validez || null, subtotal: Math.round(subtotal), iva_total: Math.round(iva_total),
      total, costo_total: Math.round(costo_total), utilidad_estimada, margen_pct, estado: 'PENDIENTE',
      forma_pago, dias_credito, observaciones: observaciones || null,
      creado_por_id: usuario.id, creado_por_nombre: usuario.nombre,
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
  uppercaseFormData(formData)
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
    const usuario = await obtenerNombreUsuarioActual()
    const { data: fv, error: errorFv } = await supabase.from('facturas_venta').insert({
      cotizacion_id, cliente_id: cot.cliente_id, numero_factura_dian,
      fecha: new Date().toISOString().slice(0, 10), fecha_vencimiento,
      subtotal: cot.subtotal, iva_total: cot.iva_total, total: cot.total,
      costo_total: cot.costo_total, utilidad: cot.utilidad_estimada, margen_pct: cot.margen_pct,
      forma_pago: cot.forma_pago, dias_credito: cot.dias_credito,
      estado: cot.dias_credito > 0 ? 'EMITIDA' : 'COBRADA',
      oc_cliente: oc_cliente || cot.oc_cliente,
      creado_por_id: usuario.id, creado_por_nombre: usuario.nombre,
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
  uppercaseFormData(formData)
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
  uppercaseFormData(formData)
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
  const fecha_pago = String(formData.get('fecha_pago') ?? '').trim()
  const soporte_url = String(formData.get('soporte_url') ?? '').trim()
  const soporte_nombre = String(formData.get('soporte_nombre') ?? '').trim()
  const retefuente = Number(formData.get('retefuente') ?? 0)
  const rete_iva = Number(formData.get('rete_iva') ?? 0)
  const rete_ica = Number(formData.get('rete_ica') ?? 0)

  if (!factura_venta_id) return { ok: false, mensaje: 'Factura no valida.' }
  if (!fecha_pago) return { ok: false, mensaje: 'Selecciona la fecha en que se recibio el pago.' }

  const total_retenciones = retefuente + rete_iva + rete_ica

  try {
    const supabase = createServerSupabaseClient()

    // Actualizar estado a COBRADA + registrar retenciones
    const { error } = await supabase
      .from('facturas_venta')
      .update({
        estado: 'COBRADA',
        retencion_total: total_retenciones,
        notas: total_retenciones > 0
          ? `Pago: ${fecha_pago} | Retenciones: Rtefte $${retefuente}, RteIVA $${rete_iva}, RteICA $${rete_ica} | Total retenido: $${total_retenciones}`
          : `Pago recibido: ${fecha_pago}`,
      })
      .eq('id', factura_venta_id)

    if (error) return { ok: false, mensaje: error.message }

    // Registrar pago en tabla pagos
    const { data: fvData } = await supabase.from('facturas_venta').select('cliente_id, total').eq('id', factura_venta_id).single()
    if (fvData) {
      await supabase.from('pagos').insert({
        tipo: 'COBRO_CLIENTE',
        cliente_id: fvData.cliente_id,
        factura_venta_id,
        monto: Number(fvData.total) - total_retenciones,
        fecha: fecha_pago,
        medio_pago: 'Transferencia',
        notas: total_retenciones > 0
          ? `Retefuente: $${retefuente} | ReteIVA: $${rete_iva} | ReteICA: $${rete_ica}`
          : null,
      })
    }

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
    revalidatePath('/facturacion')
    revalidatePath('/financiero')
    const montoRecibido = fvData ? Number(fvData.total) - total_retenciones : 0
    return { ok: true, mensaje: total_retenciones > 0
      ? `Cobro registrado. Recibido: $${montoRecibido.toLocaleString('es-CO')} (retenciones: $${total_retenciones.toLocaleString('es-CO')})`
      : `Cobro registrado. Fecha: ${fecha_pago}`
    }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}


/** Registrar pago de contado (APROBADA → PAGADA → EN_ALISTAMIENTO) */
export async function registrarPagoContado(formData: FormData): Promise<ResultadoAccion> {
  const cotizacion_id = String(formData.get('cotizacion_id') ?? '').trim()
  const fecha_pago = String(formData.get('fecha_pago') ?? '').trim()
  const soporte_url = String(formData.get('soporte_url') ?? '').trim()
  const oc_cliente = String(formData.get('oc_cliente') ?? '').trim()
  const retefuente = Number(formData.get('retefuente') ?? 0)
  const rete_iva = Number(formData.get('rete_iva') ?? 0)
  const rete_ica = Number(formData.get('rete_ica') ?? 0)

  if (!cotizacion_id) return { ok: false, mensaje: 'Cotizacion no valida.' }
  if (!fecha_pago) return { ok: false, mensaje: 'Fecha de pago obligatoria.' }
  if (!soporte_url) return { ok: false, mensaje: 'Soporte de pago obligatorio.' }

  const total_retenciones = retefuente + rete_iva + rete_ica

  try {
    const supabase = createServerSupabaseClient()

    const { data: cot, error: errCot } = await supabase.from('cotizaciones').select('total, subtotal, iva_total').eq('id', cotizacion_id).single()
    if (errCot || !cot) return { ok: false, mensaje: 'Cotizacion no encontrada.' }

    const monto_recibido = Number(cot.total) - total_retenciones
    const provision_iva = Number(cot.iva_total) // IVA cobrado (se ajusta cuando compre)
    const provision_simple = Math.round(Number(cot.subtotal) * 0.05) // 5% del subtotal

    // Actualizar cotizacion a EN_ALISTAMIENTO (salta PAGADA porque ya registramos todo)
    const { error } = await supabase.from('cotizaciones').update({
      estado: 'EN_ALISTAMIENTO',
      fecha_pago,
      monto_recibido,
      retencion_retefuente: retefuente,
      retencion_reteiva: rete_iva,
      retencion_reteica: rete_ica,
      retencion_total: total_retenciones,
      soporte_pago_url: soporte_url,
      oc_cliente: oc_cliente || null,
      provision_iva,
      provision_simple,
    }).eq('id', cotizacion_id)

    if (error) return { ok: false, mensaje: error.message }

    // Generar solicitudes de compra para items sin stock
    await generarSolicitudesCompra(supabase, cotizacion_id)

    // Registrar documento soporte
    await supabase.from('documentos').insert({
      entidad_tipo: 'COTIZACION',
      entidad_id: cotizacion_id,
      tipo_documento: 'SOPORTE_PAGO',
      nombre_archivo: 'soporte_pago',
      url_archivo: soporte_url,
    })

    revalidatePath('/ventas')
    revalidatePath('/financiero')
    revalidatePath('/compras')

    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
    return { ok: true, mensaje: `Pago registrado: ${fmt.format(monto_recibido)} recibido.${total_retenciones > 0 ? ` Retenciones: ${fmt.format(total_retenciones)}` : ''} → En alistamiento.` }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}

/** Pasar a alistamiento (APROBADA/PAGADA → EN_ALISTAMIENTO) */
export async function pasarAlistamiento(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'ID invalido.' }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('cotizaciones').update({ estado: 'EN_ALISTAMIENTO' }).eq('id', id)
    if (error) return { ok: false, mensaje: error.message }

    // Generar solicitudes de compra para items sin stock
    await generarSolicitudesCompra(supabase, id)

    revalidatePath('/ventas')
    revalidatePath('/compras')
    return { ok: true, mensaje: 'En alistamiento. Revisa el modulo de Compras para items por comprar.' }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}

/** Genera solicitudes de compra para los items sin stock suficiente */
async function generarSolicitudesCompra(supabase: ReturnType<typeof createServerSupabaseClient>, cotizacionId: string) {
  // Obtener items de la cotizacion
  const { data: items } = await supabase
    .from('cotizacion_items')
    .select('producto_id, cantidad, descripcion')
    .eq('cotizacion_id', cotizacionId)
    .not('producto_id', 'is', null)

  if (!items || items.length === 0) return

  // Obtener cotizacion para fecha
  const { data: cot } = await supabase.from('cotizaciones').select('fecha_validez').eq('id', cotizacionId).single()

  for (const item of items) {
    if (!item.producto_id) continue

    // Excluir fletes/transporte - no generan solicitud de compra
    const desc = String(item.descripcion ?? '').toLowerCase()
    if (desc.includes('flete') || desc.includes('transporte')) continue

    // Verificar stock actual
    const { data: producto } = await supabase
      .from('productos')
      .select('stock_actual, unidad_medida, nombre')
      .eq('id', item.producto_id)
      .single()

    // Ignorar servicios (flete, transporte, etc.) - no requieren stock
    if (producto?.unidad_medida === 'Servicio') continue
    const nombreProd = String(producto?.nombre ?? '').toLowerCase()
    if (nombreProd.includes('flete') || nombreProd.includes('transporte')) continue

    const stockActual = Number(producto?.stock_actual ?? 0)
    const cantidadRequerida = Number(item.cantidad)
    const cantidadAComprar = Math.max(0, cantidadRequerida - stockActual)

    if (cantidadAComprar > 0) {
      // Verificar si ya existe una solicitud pendiente para este producto+cotizacion
      const { data: existente } = await supabase
        .from('solicitudes_compra')
        .select('id')
        .eq('producto_id', item.producto_id)
        .eq('cotizacion_id', cotizacionId)
        .eq('estado', 'PENDIENTE')
        .single()

      if (!existente) {
        await supabase.from('solicitudes_compra').insert({
          producto_id: item.producto_id,
          cotizacion_id: cotizacionId,
          cantidad_requerida: cantidadRequerida,
          cantidad_en_stock: stockActual,
          cantidad_a_comprar: cantidadAComprar,
          estado: 'PENDIENTE',
          prioridad: 'ALTA',
          fecha_necesidad: cot?.fecha_validez || null,
        })
      }
    }
  }
}


/** Generar remision (EN_ALISTAMIENTO → DESPACHADA sin factura) */
export async function generarRemision(formData: FormData): Promise<ResultadoAccion> {
  const cotizacion_id = String(formData.get('cotizacion_id') ?? '').trim()
  const observaciones_remision = String(formData.get('observaciones_remision') ?? '').trim()
  if (!cotizacion_id) return { ok: false, mensaje: 'Cotizacion no valida.' }

  try {
    const supabase = createServerSupabaseClient()

    // Verificar que esta en EN_ALISTAMIENTO
    const { data: cot, error: errCot } = await supabase
      .from('cotizaciones')
      .select('id, numero, estado, cliente_id')
      .eq('id', cotizacion_id)
      .single()
    if (errCot || !cot) return { ok: false, mensaje: 'Cotizacion no encontrada.' }
    if (cot.estado !== 'EN_ALISTAMIENTO') return { ok: false, mensaje: `Solo se puede remisionar desde "En alistamiento". Estado actual: ${cot.estado}` }

    // Generar numero de remision: REM-2026-001
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('remisiones')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`)

    const consecutivo = (count ?? 0) + 51
    const numero_remision = `REM-${year}-${String(consecutivo).padStart(3, '0')}`

    // Crear registro de remision
    const usuario = await obtenerNombreUsuarioActual()
    const { error: errRem } = await supabase.from('remisiones').insert({
      cotizacion_id,
      cliente_id: cot.cliente_id,
      numero: numero_remision,
      fecha: new Date().toISOString().slice(0, 10),
      observaciones: observaciones_remision || null,
      creado_por_id: usuario.id,
      creado_por_nombre: usuario.nombre,
    }).select('id, numero').single()

    if (errRem) {
      // Si la tabla no existe aun, igual cambiar el estado y guardar en la cotizacion
      await supabase.from('cotizaciones').update({
        estado: 'DESPACHADA',
        remision_numero: numero_remision,
        remision_fecha: new Date().toISOString().slice(0, 10),
        remision_observaciones: observaciones_remision || null,
      }).eq('id', cotizacion_id)

      revalidatePath('/ventas')
      return { ok: true, mensaje: `Remision ${numero_remision} generada. Pedido despachado sin factura.` }
    }

    // Actualizar cotizacion a DESPACHADA
    await supabase.from('cotizaciones').update({
      estado: 'DESPACHADA',
      remision_numero: numero_remision,
      remision_fecha: new Date().toISOString().slice(0, 10),
      remision_observaciones: observaciones_remision || null,
    }).eq('id', cotizacion_id)

    revalidatePath('/ventas')
    return { ok: true, mensaje: `Remision ${numero_remision} generada. Pedido despachado sin factura.` }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al generar remision.' } }
}


/** Revertir estado de cotizacion (un paso atras) */
export async function revertirEstadoCotizacion(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'ID invalido.' }

  // Mapa de reversion: estado actual → estado anterior
  const reversion: Record<string, string> = {
    'APROBADA': 'PENDIENTE',
    'PAGADA': 'APROBADA',
    'EN_ALISTAMIENTO': 'APROBADA',
    'FACTURADA': 'EN_ALISTAMIENTO',
    'DESPACHADA': 'EN_ALISTAMIENTO',
  }

  try {
    const supabase = createServerSupabaseClient()
    const { data: cot, error: errGet } = await supabase.from('cotizaciones').select('estado').eq('id', id).single()
    if (errGet || !cot) return { ok: false, mensaje: 'Cotizacion no encontrada.' }

    const estadoAnterior = reversion[cot.estado]
    if (!estadoAnterior) return { ok: false, mensaje: `No se puede revertir desde estado "${cot.estado}". Solo se revierte: Aprobada, Pagada, En alistamiento, Facturada, Despachada.` }

    // --- LIMPIAR TODO LO ASOCIADO SEGUN EL ESTADO QUE SE REVIERTE ---

    // Si revierte desde EN_ALISTAMIENTO → limpiar solicitudes de compra + datos de pago
    if (cot.estado === 'EN_ALISTAMIENTO') {
      await supabase.from('solicitudes_compra').delete().eq('cotizacion_id', id)
    }

    // Si revierte desde PAGADA → limpiar datos de pago
    if (cot.estado === 'EN_ALISTAMIENTO' || cot.estado === 'PAGADA') {
      // Nada extra, se limpia abajo
    }

    // Si revierte desde DESPACHADA → limpiar remision
    if (cot.estado === 'DESPACHADA') {
      await supabase.from('remisiones').delete().eq('cotizacion_id', id)
    }

    // Si revierte desde FACTURADA → anular factura de venta asociada
    if (cot.estado === 'FACTURADA') {
      await supabase.from('facturas_venta').update({ estado: 'ANULADA' }).eq('cotizacion_id', id)
    }

    // Construir datos de actualizacion
    const updateData: Record<string, unknown> = { estado: estadoAnterior }

    // Limpiar datos de pago si corresponde
    if (cot.estado === 'EN_ALISTAMIENTO' || cot.estado === 'PAGADA') {
      updateData.fecha_pago = null
      updateData.monto_recibido = 0
      updateData.retencion_retefuente = 0
      updateData.retencion_reteiva = 0
      updateData.retencion_reteica = 0
      updateData.retencion_total = 0
      updateData.soporte_pago_url = null
    }

    // Limpiar datos de remision si corresponde
    if (cot.estado === 'DESPACHADA') {
      updateData.remision_numero = null
      updateData.remision_fecha = null
      updateData.remision_observaciones = null
    }

    // Limpiar provisiones
    updateData.provision_iva = 0
    updateData.provision_simple = 0

    const { error } = await supabase.from('cotizaciones').update(updateData).eq('id', id)
    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/ventas')
    revalidatePath('/compras')
    revalidatePath('/financiero')
    revalidatePath('/panel')
    return { ok: true, mensaje: `Revertido: "${cot.estado}" → "${estadoAnterior}". Se limpiaron datos asociados.` }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}
