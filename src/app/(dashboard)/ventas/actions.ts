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

    // Evitar facturar dos veces la misma cotizacion.
    // Antes no habia guard: dos clics creaban DOS facturas_venta con dos
    // juegos de items, el trigger descontaba el stock DOS veces y la
    // cartera quedaba duplicada.
    const { data: facturaExistente } = await supabase
      .from('facturas_venta')
      .select('id, numero_factura_dian, total')
      .eq('cotizacion_id', cotizacion_id)
      .neq('estado', 'ANULADA')
      .limit(1)
      .maybeSingle()

    if (facturaExistente) {
      return {
        ok: false,
        mensaje: `Esta venta ya tiene la factura ${facturaExistente.numero_factura_dian ?? ''} por ${fmt.format(Number(facturaExistente.total))}. No se creo otra.`,
      }
    }

    // El mismo numero de factura DIAN no se puede usar dos veces
    const { data: dianRepetida } = await supabase
      .from('facturas_venta')
      .select('id')
      .eq('numero_factura_dian', numero_factura_dian)
      .neq('estado', 'ANULADA')
      .limit(1)
      .maybeSingle()

    if (dianRepetida) {
      return {
        ok: false,
        mensaje: `El numero de factura ${numero_factura_dian} ya esta usado en otra venta.`,
      }
    }

    // OC obligatoria para credito (Decision #019).
    //
    // BUG QUE ESTO ARREGLA: solo se miraba la OC que venia del formulario,
    // y el modal de facturar NO tenia campo de OC. Resultado: era
    // IMPOSIBLE facturar cualquier venta a credito, incluso las que ya
    // tenian la OC guardada desde la aprobacion o desde la remision.
    // Ahora se acepta la OC que ya esta en la cotizacion.
    const ocFinal = oc_cliente || String(cot.oc_cliente ?? '').trim()

    if (cot.dias_credito > 0 && !ocFinal) {
      return {
        ok: false,
        mensaje: 'Para clientes a credito la Orden de Compra es obligatoria (Decision #019). Escribe el numero de la OC en este mismo formulario y vuelve a intentar.',
      }
    }

    // Si la OC llego por el formulario y la cotizacion no la tenia (o era
    // distinta), guardarla: la remision y el informe la leen de ahi.
    if (oc_cliente && oc_cliente !== String(cot.oc_cliente ?? '').trim()) {
      await supabase
        .from('cotizaciones')
        .update({ oc_cliente })
        .eq('id', cotizacion_id)
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
  // Ya no se exige cuenta: el modulo de tesoreria se elimino y la
  // conciliacion bancaria se lleva por fuera. Exigirla dejaba el cobro
  // imposible de registrar, porque no habia forma de crear cuentas.

  const total_retenciones = retefuente + rete_iva + rete_ica

  try {
    const supabase = createServerSupabaseClient()

    // Evitar cobrar dos veces la misma factura (doble clic / reintento).
    // Antes no se validaba: cada ejecucion insertaba otro pago y otro
    // INGRESO en tesoreria, duplicando la plata en el banco.
    const { data: estadoActual } = await supabase
      .from('facturas_venta')
      .select('estado, total, numero_factura_dian')
      .eq('id', factura_venta_id)
      .maybeSingle()

    if (!estadoActual) return { ok: false, mensaje: 'Factura no encontrada.' }
    if (estadoActual.estado === 'COBRADA') {
      return { ok: false, mensaje: `La factura ${estadoActual.numero_factura_dian ?? ''} ya esta cobrada. No se registro de nuevo.` }
    }
    if (estadoActual.estado === 'ANULADA') {
      return { ok: false, mensaje: 'La factura esta anulada.' }
    }

    // Las retenciones no pueden superar el total de la factura
    if (total_retenciones > Number(estadoActual.total)) {
      return {
        ok: false,
        mensaje: `Las retenciones (${fmt.format(total_retenciones)}) no pueden ser mayores al total de la factura (${fmt.format(Number(estadoActual.total))}).`,
      }
    }

    // Actualizar estado a COBRADA + registrar retenciones con su desglose.
    // El desglose es clave: la reteIVA reduce el IVA y la retefuente/reteICA
    // reducen el Simple. Antes solo se guardaba el total y el desglose
    // quedaba en texto libre, imposible de usar en los calculos.
    const { error } = await supabase
      .from('facturas_venta')
      .update({
        estado: 'COBRADA',
        retencion_total: total_retenciones,
        retencion_retefuente: retefuente,
        retencion_reteiva: rete_iva,
        retencion_reteica: rete_ica,
        notas: total_retenciones > 0
          ? `Pago: ${fecha_pago} | Retenciones: Rtefte $${retefuente}, RteIVA $${rete_iva}, RteICA $${rete_ica} | Total retenido: $${total_retenciones}`
          : `Pago recibido: ${fecha_pago}`,
      })
      .eq('id', factura_venta_id)

    if (error) return { ok: false, mensaje: error.message }

    // Registrar pago en tabla pagos
    const { data: fvData } = await supabase
      .from('facturas_venta')
      .select('cliente_id, total, numero_factura_dian, cotizacion_id')
      .eq('id', factura_venta_id)
      .single()

    if (fvData) {
      const montoNeto = Number(fvData.total) - total_retenciones

      await supabase.from('pagos').insert({
        tipo: 'COBRO_CLIENTE',
        cliente_id: fvData.cliente_id,
        factura_venta_id,
        monto: montoNeto,
        fecha: fecha_pago,
        medio_pago: 'Transferencia',
        notas: total_retenciones > 0
          ? `Retefuente: $${retefuente} | ReteIVA: $${rete_iva} | ReteICA: $${rete_ica}`
          : null,
      })

      // El movimiento de tesoreria ya no se registra: ese modulo se
      // elimino y el saldo del banco se controla en la conciliacion.

      // Reflejar el cobro y las retenciones en la cotizacion.
      // CADENA ROTA que esto arregla: los calculos de impuestos leen de
      // la cotizacion. En el flujo a credito las retenciones se guardaban
      // solo en facturas_venta, asi que para toda venta a credito el
      // sistema veia retenciones = 0 y exigia apartar mas plata de la
      // debida (con reteIVA de 36.480, sobre-reservaba esos 36.480).
      if (fvData.cotizacion_id) {
        await supabase
          .from('cotizaciones')
          .update({
            estado: 'COBRADA',
            monto_recibido: montoNeto,
            fecha_pago,
            retencion_retefuente: retefuente,
            retencion_reteiva: rete_iva,
            retencion_reteica: rete_ica,
            retencion_total: total_retenciones,
          })
          .eq('id', fvData.cotizacion_id)
      }
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
    revalidatePath('/')
    const montoRecibido = fvData ? Number(fvData.total) - total_retenciones : 0
    return { ok: true, mensaje: total_retenciones > 0
      ? `Cobro registrado. Recibido: $${montoRecibido.toLocaleString('es-CO')} (retenciones: $${total_retenciones.toLocaleString('es-CO')}).`
      : `Cobro registrado: $${montoRecibido.toLocaleString('es-CO')}.`
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
  // Ya no se exige cuenta bancaria.
  //
  // Al eliminar el modulo de tesoreria se quedo este requisito sin la
  // pantalla que permitia crear cuentas, asi que el select siempre salia
  // vacio y NINGUN pago se podia registrar. El control del dinero pasa
  // por la conciliacion bancaria; aqui lo que importa es el soporte de
  // pago, el monto recibido y las retenciones, que son los datos que
  // alimentan el modulo de Obligaciones (IVA y Simple).

  const total_retenciones = retefuente + rete_iva + rete_ica

  try {
    const supabase = createServerSupabaseClient()

    const { data: cot, error: errCot } = await supabase.from('cotizaciones').select('numero, total, subtotal, iva_total, cliente_id, estado, fecha_pago').eq('id', cotizacion_id).single()
    if (errCot || !cot) return { ok: false, mensaje: 'Cotizacion no encontrada.' }

    // Evitar registrar el pago dos veces (doble clic / reintento).
    // Antes no habia guard: cada ejecucion insertaba otro INGRESO en
    // tesoreria, duplicando la plata en el banco.
    if (cot.fecha_pago) {
      return {
        ok: false,
        mensaje: `El pago de ${cot.numero} ya se registro el ${cot.fecha_pago}. No se registro de nuevo.`,
      }
    }

    // Las retenciones no pueden superar el total: si no, el ingreso a
    // tesoreria salia NEGATIVO y reducia el saldo de la cuenta.
    if (total_retenciones > Number(cot.total)) {
      return {
        ok: false,
        mensaje: `Las retenciones (${fmt.format(total_retenciones)}) no pueden ser mayores al total de la venta (${fmt.format(Number(cot.total))}).`,
      }
    }

    const monto_recibido = Number(cot.total) - total_retenciones
    const provision_iva = Number(cot.iva_total) // IVA cobrado (se ajusta cuando compre)
    // La tarifa del Simple sale de config_tributaria, no hardcodeada.
    // Antes estaba fija en 5% y si la tarifa cambiaba, la provision
    // guardada dejaba de coincidir con la que calcula analisis_venta.
    const { data: tarifaSimple } = await supabase
      .from('config_tributaria')
      .select('valor')
      .eq('clave', 'SIMPLE_TARIFA')
      .maybeSingle()
    const pctSimple = Number(tarifaSimple?.valor ?? 5)
    const provision_simple = Math.round(Number(cot.subtotal) * pctSimple / 100)

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

    // Ya no se registra movimiento de tesoreria: ese modulo se elimino y
    // el saldo del banco se controla en la conciliacion bancaria.

    // ------------------------------------------------------------
    // SINCRONIZAR LA FACTURA DIAN
    // ------------------------------------------------------------
    // CADENA ROTA QUE ESTO ARREGLA: el pago se guardaba SOLO en la
    // cotizacion. Si la venta ya tenia factura emitida, esa factura
    // seguia apareciendo como "Pendiente" en Facturacion aunque el
    // dinero ya hubiera entrado y el soporte estuviera cargado. Habia
    // dos verdades sobre el mismo pago y no coincidian.
    let avisoFactura = ''
    const { data: fv } = await supabase
      .from('facturas_venta')
      .select('id, numero_factura_dian, cliente_id, estado')
      .eq('cotizacion_id', cotizacion_id)
      .neq('estado', 'ANULADA')
      .limit(1)
      .maybeSingle()

    if (fv && fv.estado !== 'COBRADA') {
      const { error: errFv } = await supabase
        .from('facturas_venta')
        .update({
          estado: 'COBRADA',
          retencion_total: total_retenciones,
          retencion_retefuente: retefuente,
          retencion_reteiva: rete_iva,
          retencion_reteica: rete_ica,
          notas: total_retenciones > 0
            ? `Pago: ${fecha_pago} | Retenciones: Rtefte $${retefuente}, RteIVA $${rete_iva}, RteICA $${rete_ica} | Total retenido: $${total_retenciones}`
            : `Pago recibido: ${fecha_pago}`,
        })
        .eq('id', fv.id as string)

      if (errFv) {
        avisoFactura = ` OJO: la factura ${fv.numero_factura_dian ?? ''} NO quedo marcada como cobrada (${errFv.message}). Revisala en Facturacion.`
      } else {
        // El cobro tambien va al libro de pagos, igual que en el flujo
        // de "marcar factura cobrada", para que no haya dos caminos que
        // dejen datos distintos.
        await supabase.from('pagos').insert({
          tipo: 'COBRO_CLIENTE',
          cliente_id: fv.cliente_id,
          factura_venta_id: fv.id,
          monto: monto_recibido,
          fecha: fecha_pago,
          medio_pago: 'Transferencia',
          notas: total_retenciones > 0
            ? `Retefuente: $${retefuente} | ReteIVA: $${rete_iva} | ReteICA: $${rete_ica}`
            : null,
        })

        // El soporte de pago tambien queda colgado de la factura
        if (soporte_url) {
          await supabase.from('documentos').insert({
            entidad_tipo: 'FACTURA_VENTA',
            entidad_id: fv.id,
            tipo_documento: 'SOPORTE_PAGO',
            nombre_archivo: 'soporte_pago.pdf',
            url_archivo: soporte_url,
          })
        }

        avisoFactura = ` La factura ${fv.numero_factura_dian ?? ''} quedo como Cobrada.`
      }
    }

    revalidatePath('/ventas')
    revalidatePath('/facturacion')
    revalidatePath('/obligaciones')
    revalidatePath('/compras')
    revalidatePath('/')

    return { ok: true, mensaje: `Pago registrado: ${fmt.format(monto_recibido)} recibido.${total_retenciones > 0 ? ` Retenciones: ${fmt.format(total_retenciones)}.` : ''}${avisoFactura} → En alistamiento.` }
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
      // Verificar si ya existe una solicitud para este producto+cotizacion.
      //
      // OJO: antes esto solo buscaba estado='PENDIENTE' con .single(). Si la
      // solicitud ya estaba COMPRADO o EN_COTIZACION, creaba OTRA nueva en
      // PENDIENTE. Al deshacer y volver a alistar una venta se acumulaban
      // solicitudes duplicadas de algo ya comprado, y ademas dos solicitudes
      // vivas rompian el cierre automatico.
      //
      // Ahora se ignora cualquier solicitud que no este CANCELADA.
      const { data: existentes } = await supabase
        .from('solicitudes_compra')
        .select('id')
        .eq('producto_id', item.producto_id)
        .eq('cotizacion_id', cotizacionId)
        .in('estado', ['PENDIENTE', 'EN_COTIZACION', 'COMPRADO'])
        .limit(1)

      if (!existentes || existentes.length === 0) {
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

    // Generar numero de remision: REM-2026-201, 202, 203...
    const year = new Date().getFullYear()
    const { data: maxRem } = await supabase
      .from('remisiones')
      .select('numero')
      .like('numero', `REM-${year}-%`)
      .order('numero', { ascending: false })
      .limit(1)

    let siguiente = 201
    if (maxRem && maxRem.length > 0) {
      const partes = (maxRem[0].numero as string).split('-')
      const ultimo = parseInt(partes[2], 10)
      if (!isNaN(ultimo)) siguiente = ultimo + 1
    }
    const numero_remision = `REM-${year}-${String(siguiente).padStart(3, '0')}`

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
    //
    // BUG GRAVE QUE ESTO ARREGLA: antes esta funcion solo cambiaba el
    // estado y limpiaba unos campos de la cotizacion. NO borraba el
    // ingreso de tesoreria, NO devolvia el stock y NO borraba el registro
    // de pagos.
    //
    // Resultado: al deshacer una venta cobrada, la cotizacion volvia a
    // PENDIENTE pero la plata seguia en el banco para siempre, como
    // "Pago de cliente COT-XXXX" sin ninguna venta detras. Y no se podia
    // borrar a mano, porque eliminarMovimientoTesoreria bloquea los
    // movimientos que vienen de una venta. Quedaba atascado.
    //
    // Ahora deshacer revierte TODO: plata, stock, documentos y solicitudes.

    const deshecho: string[] = []

    // ---- 1. Devolver la plata que habia entrado al banco ----
    // Aplica a cualquier estado que se revierta: si hay un cobro asociado
    // a esta venta y la venta deja de estar cobrada, la plata no puede
    // quedarse en la cuenta.
    if (cot.estado === 'EN_ALISTAMIENTO' || cot.estado === 'PAGADA' || cot.estado === 'FACTURADA') {
      const { data: ingresos } = await supabase
        .from('movimientos_tesoreria')
        .select('id, monto')
        .eq('cotizacion_id', id)
        .eq('tipo', 'INGRESO')

      const totalIngresos = (ingresos ?? []).reduce((s, m) => s + Number(m.monto ?? 0), 0)

      if (totalIngresos > 0) {
        const { error: errBorrarIngreso } = await supabase
          .from('movimientos_tesoreria')
          .delete()
          .eq('cotizacion_id', id)
          .eq('tipo', 'INGRESO')

        if (errBorrarIngreso) {
          return {
            ok: false,
            mensaje: `No se pudo devolver el ingreso de ${fmt.format(totalIngresos)} (${errBorrarIngreso.message}). No se revirtio nada para no dejar el saldo descuadrado.`,
          }
        }
        deshecho.push(`se saco del banco el cobro de ${fmt.format(totalIngresos)}`)
      }

      // El registro en la tabla pagos tambien sobra
      const { data: fvIds } = await supabase
        .from('facturas_venta')
        .select('id')
        .eq('cotizacion_id', id)

      for (const fv of fvIds ?? []) {
        await supabase.from('pagos').delete().eq('factura_venta_id', fv.id as string)
      }

      // Y el soporte de pago que se habia subido
      await supabase
        .from('documentos')
        .delete()
        .eq('entidad_tipo', 'COTIZACION')
        .eq('entidad_id', id)
        .eq('tipo_documento', 'SOPORTE_PAGO')
    }

    // ---- 2. Solicitudes de compra generadas al alistar ----
    if (cot.estado === 'EN_ALISTAMIENTO') {
      await supabase.from('solicitudes_compra').delete().eq('cotizacion_id', id)
      deshecho.push('se borraron las solicitudes de compra')
    }

    // ---- 3. Remision ----
    if (cot.estado === 'DESPACHADA') {
      await supabase.from('remisiones').delete().eq('cotizacion_id', id)
      deshecho.push('se anulo la remision')
    }

    // ---- 4. Factura de venta: anular y DEVOLVER EL STOCK ----
    if (cot.estado === 'FACTURADA') {
      // La factura se marca ANULADA (no se borra: es un documento fiscal
      // y hay que poder rastrearlo). Pero el stock SI hay que devolverlo:
      // el trigger trg_descontar_stock solo resta al insertar los items y
      // no existe ninguno que sume al anular. Sin esto el inventario
      // quedaba faltando las unidades de una venta que ya no existe.
      const { data: facturas } = await supabase
        .from('facturas_venta')
        .select('id, numero_factura_dian, estado')
        .eq('cotizacion_id', id)
        .neq('estado', 'ANULADA')

      for (const fv of facturas ?? []) {
        const { data: items } = await supabase
          .from('factura_venta_items')
          .select('producto_id, cantidad')
          .eq('factura_venta_id', fv.id as string)

        let unidadesDevueltas = 0
        for (const it of items ?? []) {
          if (!it.producto_id) continue
          const { data: prod } = await supabase
            .from('productos')
            .select('stock_actual')
            .eq('id', it.producto_id as string)
            .maybeSingle()

          await supabase
            .from('productos')
            .update({ stock_actual: Number(prod?.stock_actual ?? 0) + Number(it.cantidad ?? 0) })
            .eq('id', it.producto_id as string)

          unidadesDevueltas += Number(it.cantidad ?? 0)
        }

        // Los movimientos de banco atados a la factura (no solo los que
        // traen cotizacion_id)
        await supabase
          .from('movimientos_tesoreria')
          .delete()
          .eq('factura_venta_id', fv.id as string)
          .eq('tipo', 'INGRESO')

        await supabase.from('pagos').delete().eq('factura_venta_id', fv.id as string)

        await supabase
          .from('facturas_venta')
          .update({ estado: 'ANULADA' })
          .eq('id', fv.id as string)

        deshecho.push(
          `se anulo la factura ${fv.numero_factura_dian ?? ''}`.trim() +
          (unidadesDevueltas > 0 ? ` y volvieron ${unidadesDevueltas} unidades al inventario` : ''),
        )
      }

      // El PDF de la factura que se habia adjuntado
      await supabase
        .from('documentos')
        .delete()
        .eq('entidad_tipo', 'COTIZACION')
        .eq('entidad_id', id)
        .eq('tipo_documento', 'FACTURA')
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

    // Refrescar TODAS las pantallas que muestran plata, no solo /ventas.
    // Antes faltaba /tesoreria: al deshacer, el libro de movimientos
    // seguia mostrando el pago viejo hasta recargar a mano.
    revalidatePath('/ventas')
    revalidatePath('/compras')
    revalidatePath('/inventario')
    revalidatePath('/panel')
    revalidatePath('/')

    const detalle = deshecho.length > 0 ? ` Ademas: ${deshecho.join(', ')}.` : ''
    return {
      ok: true,
      mensaje: `Revertido: "${cot.estado}" → "${estadoAnterior}".${detalle}`,
    }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}



// ============================================================
// ELIMINAR COTIZACION
// Solo se puede eliminar si NO tiene facturas de venta emitidas
// (un documento fiscal no se puede borrar, solo anular).
// ============================================================
export async function eliminarCotizacion(formData: FormData): Promise<ResultadoAccion> {
  const cotizacion_id = String(formData.get('cotizacion_id') ?? '').trim()
  const confirmacion = String(formData.get('confirmacion') ?? '').trim()

  if (!cotizacion_id) return { ok: false, mensaje: 'Cotizacion no valida.' }
  if (confirmacion.toUpperCase() !== 'ELIMINAR') {
    return { ok: false, mensaje: 'Escribe la palabra ELIMINAR para confirmar.' }
  }

  try {
    const supabase = createServerSupabaseClient()

    const { data: cot } = await supabase
      .from('cotizaciones')
      .select('numero, estado')
      .eq('id', cotizacion_id)
      .single()

    if (!cot) return { ok: false, mensaje: 'Cotizacion no encontrada.' }

    // No permitir eliminar si tiene factura de venta (es un documento fiscal)
    const { data: facturas } = await supabase
      .from('facturas_venta')
      .select('id, numero_factura_dian')
      .eq('cotizacion_id', cotizacion_id)
      .neq('estado', 'ANULADA')
      .limit(1)

    if (facturas && facturas.length > 0) {
      return {
        ok: false,
        mensaje: `No se puede eliminar: tiene la factura de venta ${facturas[0].numero_factura_dian ?? ''}. Primero anula la factura.`,
      }
    }

    // Borrar todo lo relacionado (en orden para respetar foreign keys)
    await supabase.from('solicitudes_compra').delete().eq('cotizacion_id', cotizacion_id)
    await supabase.from('remisiones').delete().eq('cotizacion_id', cotizacion_id)
    await supabase.from('gasto_reparto').delete().eq('cotizacion_id', cotizacion_id)
    await supabase.from('asignacion_costos').delete().eq('cotizacion_id', cotizacion_id)
    await supabase.from('documentos_soporte').delete().eq('cotizacion_id', cotizacion_id)
    await supabase.from('documentos').delete().eq('entidad_tipo', 'COTIZACION').eq('entidad_id', cotizacion_id)
    await supabase.from('cotizacion_items').delete().eq('cotizacion_id', cotizacion_id)

    const { error } = await supabase.from('cotizaciones').delete().eq('id', cotizacion_id)
    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/ventas')
    revalidatePath('/panel')
    revalidatePath('/compras')

    return { ok: true, mensaje: `Cotizacion ${cot.numero} eliminada permanentemente.` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al eliminar.' }
  }
}



// ============================================================
// EDITAR REMISION (OC del cliente y observaciones)
// ============================================================
export async function editarRemision(formData: FormData): Promise<ResultadoAccion> {
  const cotizacion_id = String(formData.get('cotizacion_id') ?? '').trim()
  const oc_cliente = String(formData.get('oc_cliente') ?? '').trim()
  const observaciones = String(formData.get('observaciones') ?? '').trim()

  if (!cotizacion_id) return { ok: false, mensaje: 'Cotizacion no valida.' }

  try {
    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from('cotizaciones')
      .update({
        oc_cliente: oc_cliente || null,
        remision_observaciones: observaciones || null,
      })
      .eq('id', cotizacion_id)

    if (error) return { ok: false, mensaje: error.message }

    // Actualizar la remision tambien si existe
    await supabase
      .from('remisiones')
      .update({ observaciones: observaciones || null })
      .eq('cotizacion_id', cotizacion_id)

    revalidatePath(`/ventas/${cotizacion_id}`)
    revalidatePath(`/ventas/${cotizacion_id}/remision`)
    revalidatePath('/ventas')

    return { ok: true, mensaje: 'Remision actualizada.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al editar.' }
  }
}


// ============================================================
// SINCRONIZAR FACTURAS CON EL PAGO YA REGISTRADO
// ============================================================
//
// POR QUE EXISTE
// El pago se registraba solo en la cotizacion. Si la venta ya tenia
// factura emitida, la factura seguia como "Pendiente" en Facturacion
// aunque el dinero hubiera entrado y el soporte estuviera cargado.
// La causa ya esta corregida en registrarPagoContado; esto arregla las
// facturas que quedaron desfasadas ANTES, sin volver a digitar nada:
// copia el pago que ya esta en la cotizacion.

export interface FacturaDesfasada {
  id: string
  numero: string
  cliente: string
  total: number
  fecha_pago: string
}

/** Facturas que siguen pendientes aunque su venta ya esta pagada */
export async function facturasDesfasadas(): Promise<FacturaDesfasada[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('facturas_venta')
      .select('id, numero_factura_dian, total, cotizacion_id, estado, clientes(razon_social), cotizaciones(fecha_pago)')
      .not('estado', 'in', '("COBRADA","ANULADA")')
      .not('cotizacion_id', 'is', null)
      .limit(200)

    return (data ?? [])
      .filter((fv) => {
        const c = fv.cotizaciones as { fecha_pago?: string | null } | null
        return Boolean(c?.fecha_pago)
      })
      .map((fv) => {
        const c = fv.cotizaciones as { fecha_pago?: string | null } | null
        const cli = fv.clientes as { razon_social?: string } | null
        return {
          id: String(fv.id),
          numero: String(fv.numero_factura_dian ?? ''),
          cliente: cli?.razon_social ?? '',
          total: Number(fv.total ?? 0),
          fecha_pago: String(c?.fecha_pago ?? ''),
        }
      })
  } catch {
    return []
  }
}

/**
 * Marca como cobradas las facturas cuya venta ya tiene el pago
 * registrado, copiando fecha y retenciones de la cotizacion.
 */
export async function sincronizarFacturasConPago(): Promise<ResultadoAccion> {
  try {
    const supabase = createServerSupabaseClient()
    const pendientes = await facturasDesfasadas()

    if (pendientes.length === 0) {
      return { ok: true, mensaje: 'Todas las facturas ya estan al dia con sus pagos.' }
    }

    let arregladas = 0
    const fallos: string[] = []

    for (const p of pendientes) {
      // Traer el pago tal como quedo en la cotizacion: es la fuente
      const { data: fvFull } = await supabase
        .from('facturas_venta')
        .select('id, cliente_id, cotizacion_id, total')
        .eq('id', p.id)
        .single()
      if (!fvFull) continue

      const { data: cot } = await supabase
        .from('cotizaciones')
        .select('fecha_pago, monto_recibido, retencion_total, retencion_retefuente, retencion_reteiva, retencion_reteica, soporte_pago_url')
        .eq('id', fvFull.cotizacion_id as string)
        .single()
      if (!cot?.fecha_pago) continue

      const ret = Number(cot.retencion_total ?? 0)
      const { error } = await supabase
        .from('facturas_venta')
        .update({
          estado: 'COBRADA',
          retencion_total: ret,
          retencion_retefuente: Number(cot.retencion_retefuente ?? 0),
          retencion_reteiva: Number(cot.retencion_reteiva ?? 0),
          retencion_reteica: Number(cot.retencion_reteica ?? 0),
          notas: ret > 0
            ? `Pago: ${cot.fecha_pago} | Total retenido: $${ret}`
            : `Pago recibido: ${cot.fecha_pago}`,
        })
        .eq('id', p.id)

      if (error) {
        fallos.push(`${p.numero}: ${error.message}`)
        continue
      }

      // Registrar el cobro en el libro de pagos si no estaba
      const { data: yaPago } = await supabase
        .from('pagos')
        .select('id')
        .eq('factura_venta_id', p.id)
        .limit(1)
        .maybeSingle()

      if (!yaPago) {
        await supabase.from('pagos').insert({
          tipo: 'COBRO_CLIENTE',
          cliente_id: fvFull.cliente_id,
          factura_venta_id: p.id,
          monto: Number(cot.monto_recibido ?? 0) || Number(fvFull.total ?? 0) - ret,
          fecha: cot.fecha_pago,
          medio_pago: 'Transferencia',
        })
      }

      arregladas++
    }

    revalidatePath('/facturacion')
    revalidatePath('/ventas')
    revalidatePath('/obligaciones')

    if (fallos.length > 0) {
      return {
        ok: arregladas > 0,
        mensaje: `${arregladas} factura(s) quedaron como Cobradas. No se pudo con: ${fallos.join(' | ')}`,
      }
    }

    return { ok: true, mensaje: `${arregladas} factura(s) quedaron marcadas como Cobradas, con su fecha de pago y sus retenciones.` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al sincronizar.' }
  }
}
