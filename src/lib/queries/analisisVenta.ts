import { createServerSupabaseClient } from '@/lib/supabase/server'

/** Analisis financiero completo de una venta. Equivale al Excel manual. */
export interface AnalisisVenta {
  cotizacion_id: string
  numero: string
  cliente_nombre: string | null
  fecha: string
  estado: string
  forma_pago: string
  dias_credito: number
  // Venta
  venta_subtotal: number
  iva_cobrado: number
  venta_total: number
  // Costos
  costo_compras: number
  costo_gastos: number
  costo_real: number
  // IVA
  iva_compras: number
  iva_gastos: number
  iva_pagado: number
  iva_neto_dian: number
  // Utilidad
  utilidad_bruta: number
  margen_bruto_pct: number
  // Impuestos
  impuesto_simple: number
  retenciones: number
  retencion_retefuente: number
  retencion_reteiva: number
  retencion_reteica: number
  impuesto_simple_pendiente: number
  // Neto
  utilidad_neta: number
  margen_neto_pct: number
  total_a_separar: number
  monto_recibido: number
  gmf_venta: number
  num_gmf: number
  utilidad_neta_con_gmf: number
  // Calidad del dato
  num_facturas_compra: number
  num_gastos: number
  num_gastos_sin_soporte: number
  costo_no_deducible: number
  tiene_costo_asignado: boolean
}

function mapAnalisis(r: Record<string, unknown>): AnalisisVenta {
  const n = (v: unknown) => Number(v ?? 0)
  return {
    cotizacion_id: String(r.cotizacion_id),
    numero: String(r.numero ?? ''),
    cliente_nombre: (r.cliente_nombre as string | null) ?? null,
    fecha: String(r.fecha ?? ''),
    estado: String(r.estado ?? ''),
    forma_pago: String(r.forma_pago ?? 'Contado'),
    dias_credito: n(r.dias_credito),
    venta_subtotal: n(r.venta_subtotal),
    iva_cobrado: n(r.iva_cobrado),
    venta_total: n(r.venta_total),
    costo_compras: n(r.costo_compras),
    costo_gastos: n(r.costo_gastos),
    costo_real: n(r.costo_real),
    iva_compras: n(r.iva_compras),
    iva_gastos: n(r.iva_gastos),
    iva_pagado: n(r.iva_pagado),
    iva_neto_dian: n(r.iva_neto_dian),
    utilidad_bruta: n(r.utilidad_bruta),
    margen_bruto_pct: n(r.margen_bruto_pct),
    impuesto_simple: n(r.impuesto_simple),
    retenciones: n(r.retenciones),
    retencion_retefuente: n(r.retencion_retefuente),
    retencion_reteiva: n(r.retencion_reteiva),
    retencion_reteica: n(r.retencion_reteica),
    impuesto_simple_pendiente: n(r.impuesto_simple_pendiente),
    utilidad_neta: n(r.utilidad_neta),
    margen_neto_pct: n(r.margen_neto_pct),
    total_a_separar: n(r.total_a_separar),
    monto_recibido: n(r.monto_recibido),
    gmf_venta: n(r.gmf_venta),
    num_gmf: n(r.num_gmf),
    utilidad_neta_con_gmf: n(r.utilidad_neta_con_gmf),
    num_facturas_compra: n(r.num_facturas_compra),
    num_gastos: n(r.num_gastos),
    num_gastos_sin_soporte: n(r.num_gastos_sin_soporte),
    costo_no_deducible: n(r.costo_no_deducible),
    tiene_costo_asignado: Boolean(r.tiene_costo_asignado),
  }
}

export async function obtenerAnalisisVenta(cotizacionId: string): Promise<AnalisisVenta | null> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('analisis_venta')
      .select('*')
      .eq('cotizacion_id', cotizacionId)
      .maybeSingle()
    return data ? mapAnalisis(data) : null
  } catch {
    return null
  }
}

export async function obtenerAnalisisVentas(): Promise<AnalisisVenta[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('analisis_venta')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(100)
    return (data ?? []).map(mapAnalisis)
  } catch {
    return []
  }
}

/** Comparativo por item: precio de venta vs costo real (el multiplicador) */
export interface AnalisisItem {
  cotizacion_item_id: string
  descripcion: string
  cantidad: number
  precio_venta_unitario: number
  costo_unitario_real: number
  venta_subtotal: number
  costo_subtotal: number
  utilidad: number
  multiplicador: number | null
  margen_pct: number
  tiene_costo_real: boolean
}

export async function obtenerAnalisisItems(cotizacionId: string): Promise<AnalisisItem[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('analisis_venta_items')
      .select('*')
      .eq('cotizacion_id', cotizacionId)

    return (data ?? []).map((r) => ({
      cotizacion_item_id: String(r.cotizacion_item_id),
      descripcion: String(r.descripcion ?? ''),
      cantidad: Number(r.cantidad ?? 0),
      precio_venta_unitario: Number(r.precio_venta_unitario ?? 0),
      costo_unitario_real: Number(r.costo_unitario_real ?? 0),
      venta_subtotal: Number(r.venta_subtotal ?? 0),
      costo_subtotal: Number(r.costo_subtotal ?? 0),
      utilidad: Number(r.utilidad ?? 0),
      multiplicador: r.multiplicador === null ? null : Number(r.multiplicador),
      margen_pct: Number(r.margen_pct ?? 0),
      tiene_costo_real: Boolean(r.tiene_costo_real),
    }))
  } catch {
    return []
  }
}

/** Todos los documentos y movimientos de una venta */
export interface EventoTrazabilidad {
  documento_tipo: string
  documento_numero: string | null
  documento_fecha: string | null
  valor: number | null
  estado: string | null
  documento_id: string | null
}

export async function obtenerTrazabilidad(cotizacionId: string): Promise<EventoTrazabilidad[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('trazabilidad_venta')
      .select('*')
      .eq('cotizacion_id', cotizacionId)

    const orden: Record<string, number> = {
      COTIZACION: 1, FACTURA_COMPRA: 2, EGRESO_CAJA: 3, GASTO: 4,
      REMISION: 5, FACTURA_VENTA: 6, INGRESO_CAJA: 7,
    }

    return (data ?? [])
      .map((r) => ({
        documento_tipo: String(r.documento_tipo ?? ''),
        documento_numero: r.documento_numero,
        documento_fecha: r.documento_fecha,
        valor: r.valor === null ? null : Number(r.valor),
        estado: r.estado,
        documento_id: r.documento_id,
      }))
      .sort((a, b) => {
        const fa = a.documento_fecha ?? ''
        const fb = b.documento_fecha ?? ''
        if (fa !== fb) return fa < fb ? -1 : 1
        return (orden[a.documento_tipo] ?? 99) - (orden[b.documento_tipo] ?? 99)
      })
  } catch {
    return []
  }
}
