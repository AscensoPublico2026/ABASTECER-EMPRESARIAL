import type { createServerSupabaseClient } from '@/lib/supabase/server'

type Supa = ReturnType<typeof createServerSupabaseClient>

/**
 * Recalcula el costo real de una cotizacion a partir de:
 *   1. asignacion_costos  (compras con factura asignadas a esta venta)
 *   2. gastos             (costos sin factura imputados a esta venta, ej: flete)
 *
 * Escribe en cotizacion_items.costo_unitario/utilidad y en
 * cotizaciones.costo_total/utilidad_estimada/margen_pct.
 *
 * IMPORTANTE: usa el costo REAL pagado, no el costo_promedio ponderado.
 * Asi la utilidad de una venta queda congelada y no cambia cuando se
 * compra el mismo producto a otro precio mas adelante.
 */
export async function recalcularCostoCotizacion(supabase: Supa, cotizacionId: string) {
  if (!cotizacionId) return

  // ---- 1. Costos de compras asignadas, agrupados por producto ----
  const { data: asignaciones } = await supabase
    .from('asignacion_costos')
    .select('producto_id, cantidad, subtotal')
    .eq('cotizacion_id', cotizacionId)
    .eq('destino', 'VENTA')

  const porProducto = new Map<string, { cantidad: number; subtotal: number }>()
  for (const a of asignaciones ?? []) {
    const pid = a.producto_id as string | null
    if (!pid) continue
    const prev = porProducto.get(pid) ?? { cantidad: 0, subtotal: 0 }
    porProducto.set(pid, {
      cantidad: prev.cantidad + Number(a.cantidad ?? 0),
      subtotal: prev.subtotal + Number(a.subtotal ?? 0),
    })
  }

  // ---- 2. Actualizar costo_unitario de cada item de la cotizacion ----
  const { data: items } = await supabase
    .from('cotizacion_items')
    .select('id, producto_id, cantidad, precio_unitario, subtotal')
    .eq('cotizacion_id', cotizacionId)

  let costoCompras = 0

  for (const item of items ?? []) {
    const pid = item.producto_id as string | null
    const cantidadItem = Number(item.cantidad ?? 0)
    const subtotalItem = Number(item.subtotal ?? 0)

    if (!pid) continue
    const asig = porProducto.get(pid)

    if (!asig || asig.cantidad <= 0) {
      // Sin costo asignado todavia: dejar en 0 para que se vea el pendiente
      await supabase.from('cotizacion_items').update({
        costo_unitario: 0,
        utilidad: Math.round(subtotalItem),
      }).eq('id', item.id)
      continue
    }

    const costoUnitario = asig.subtotal / asig.cantidad
    const costoItem = costoUnitario * cantidadItem
    costoCompras += costoItem

    await supabase.from('cotizacion_items').update({
      costo_unitario: Math.round(costoUnitario * 100) / 100,
      utilidad: Math.round(subtotalItem - costoItem),
    }).eq('id', item.id)
  }

  // ---- 3. Costos sin factura imputados a la venta (flete, mano de obra) ----
  // LEE DE gasto_reparto, no del campo gastos.cotizacion_id: un gasto
  // puede estar repartido entre varias ventas y solo le corresponde la
  // parte que le asignaron a ESTA venta. Leer del campo viejo (que apunta
  // a la primera) dejaba el costo completo en una sola y cero en las demas.
  const { data: repartoGastos } = await supabase
    .from('gasto_reparto')
    .select('monto, gastos(monto, iva_incluido)')
    .eq('cotizacion_id', cotizacionId)

  const costoGastos = (repartoGastos ?? []).reduce((s, gr) => {
    const g = gr.gastos as { monto?: number; iva_incluido?: number } | null
    if (!g) return s
    // El IVA se prorratea: si a esta venta le toca el 33% del gasto,
    // le corresponde el 33% del IVA, no el 100%.
    const montoGasto = Number(g.monto ?? 0)
    const ivaGasto = Number(g.iva_incluido ?? 0)
    const montoReparto = Number(gr.monto ?? 0)
    const ivaProporcional = montoGasto > 0 ? (ivaGasto * montoReparto / montoGasto) : 0
    return s + (montoReparto - ivaProporcional)
  }, 0)

  // ---- 4. Totales de la cotizacion ----
  const { data: cot } = await supabase
    .from('cotizaciones')
    .select('subtotal')
    .eq('id', cotizacionId)
    .single()

  const subtotal = Number(cot?.subtotal ?? 0)
  const costoTotal = costoCompras + costoGastos
  const utilidad = subtotal - costoTotal
  const margen = subtotal > 0 ? Math.round((utilidad / subtotal) * 10000) / 100 : 0

  await supabase.from('cotizaciones').update({
    costo_total: Math.round(costoTotal),
    utilidad_estimada: Math.round(utilidad),
    margen_pct: margen,
  }).eq('id', cotizacionId)
}

/**
 * Recalcula todas las cotizaciones tocadas por una factura de compra.
 * Se llama al registrar, editar o anular una compra.
 */
export async function recalcularCotizacionesDeFactura(supabase: Supa, facturaCompraId: string) {
  const { data: asigs } = await supabase
    .from('asignacion_costos')
    .select('cotizacion_id')
    .eq('factura_compra_id', facturaCompraId)
    .not('cotizacion_id', 'is', null)

  const ids = Array.from(new Set((asigs ?? []).map((a) => a.cotizacion_id as string)))
  for (const id of ids) {
    await recalcularCostoCotizacion(supabase, id)
  }
  return ids
}

/**
 * Cierra las solicitudes de compra que quedaron cubiertas por las
 * asignaciones de una factura.
 *
 * ANTES (bug): se cerraba por producto_id sin importar la cotizacion,
 * lo que marcaba como COMPRADO solicitudes de otras ventas.
 * AHORA: solo cierra la solicitud de la cotizacion que efectivamente
 * recibio unidades asignadas.
 */
export async function cerrarSolicitudesCubiertas(supabase: Supa, facturaCompraId: string) {
  const { data: asigs } = await supabase
    .from('asignacion_costos')
    .select('producto_id, cotizacion_id, cantidad')
    .eq('factura_compra_id', facturaCompraId)
    .eq('destino', 'VENTA')
    .not('cotizacion_id', 'is', null)

  // Acumular cantidad asignada por (cotizacion, producto)
  const asignado = new Map<string, number>()
  for (const a of asigs ?? []) {
    const key = `${a.cotizacion_id}|${a.producto_id}`
    asignado.set(key, (asignado.get(key) ?? 0) + Number(a.cantidad ?? 0))
  }

  for (const [key, cantidad] of Array.from(asignado.entries())) {
    const [cotizacionId, productoId] = key.split('|')
    if (!cotizacionId || !productoId || productoId === 'null') continue

    // OJO: antes esto usaba .maybeSingle(), que TIRA ERROR si hay dos
    // solicitudes vivas del mismo producto en la misma venta (pasa al
    // deshacer y re-alistar). El error se tragaba y NINGUNA se cerraba,
    // asi que la solicitud seguia apareciendo para siempre.
    const { data: solicitudes } = await supabase
      .from('solicitudes_compra')
      .select('id, cantidad_a_comprar, estado')
      .eq('cotizacion_id', cotizacionId)
      .eq('producto_id', productoId)
      .in('estado', ['PENDIENTE', 'EN_COTIZACION'])
      .order('created_at', { ascending: true })

    let porRepartir = cantidad

    for (const solicitud of solicitudes ?? []) {
      const requerida = Number(solicitud.cantidad_a_comprar ?? 0)
      const cubierta = porRepartir >= requerida

      await supabase
        .from('solicitudes_compra')
        .update({
          estado: cubierta ? 'COMPRADO' : 'EN_COTIZACION',
          notas: cubierta
            ? null
            : `Parcial: ${porRepartir} de ${requerida} unidades compradas`,
        })
        .eq('id', solicitud.id)

      porRepartir = Math.max(0, porRepartir - requerida)
    }
  }
}


/**
 * Cierra las solicitudes de compra cuyo producto YA TIENE stock suficiente.
 *
 * POR QUE EXISTE ESTO:
 * cerrarSolicitudesCubiertas (arriba) solo cierra la solicitud si la compra
 * se asigno a ESA venta (destino='VENTA' con su cotizacion_id). Pero si al
 * registrar la factura de compra no se elige la cotizacion, todo entra como
 * destino='STOCK' y la solicitud se queda en PENDIENTE PARA SIEMPRE, aunque
 * el producto ya este en la bodega.
 *
 * Eso es lo que hacia que en Compras siguieran apareciendo solicitudes de
 * productos ya comprados, sin ninguna forma de quitarlas.
 *
 * Regla: si el stock disponible alcanza para lo que pedia la solicitud, la
 * solicitud ya no tiene razon de ser. Se marca COMPRADO dejando la nota de
 * que se cubrio con inventario.
 *
 * El stock se reparte entre las solicitudes mas antiguas primero, para no
 * cerrar dos pedidos distintos con las mismas unidades.
 */
export async function cerrarSolicitudesCubiertasPorStock(supabase: Supa) {
  const { data: solicitudes } = await supabase
    .from('solicitudes_compra')
    .select('id, producto_id, cantidad_a_comprar, cotizacion_id')
    .in('estado', ['PENDIENTE', 'EN_COTIZACION'])
    .order('created_at', { ascending: true })

  if (!solicitudes || solicitudes.length === 0) return 0

  const productoIds = Array.from(
    new Set(solicitudes.map((s) => s.producto_id as string).filter(Boolean)),
  )
  if (productoIds.length === 0) return 0

  const { data: productos } = await supabase
    .from('productos')
    .select('id, stock_actual')
    .in('id', productoIds)

  // Stock disponible por producto, que se va consumiendo solicitud por
  // solicitud (la mas antigua primero)
  const disponible = new Map<string, number>()
  for (const p of productos ?? []) {
    disponible.set(p.id as string, Number(p.stock_actual ?? 0))
  }

  let cerradas = 0

  for (const s of solicitudes) {
    const pid = s.producto_id as string
    if (!pid) continue

    const requerida = Number(s.cantidad_a_comprar ?? 0)
    const hay = disponible.get(pid) ?? 0

    if (requerida <= 0 || hay < requerida) continue

    await supabase
      .from('solicitudes_compra')
      .update({
        estado: 'COMPRADO',
        notas: `Cubierta con inventario disponible (${requerida} uds). Cerrada automaticamente.`,
      })
      .eq('id', s.id)

    disponible.set(pid, hay - requerida)
    cerradas += 1
  }

  return cerradas
}
