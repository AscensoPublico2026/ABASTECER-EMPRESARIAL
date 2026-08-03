import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface ResumenFacturaCompra {
  id: string
  numero_factura: string | null
  fecha_factura: string
  subtotal: number
  iva_total: number
  total: number
  forma_pago: string
  estado: string
  dias_credito: number
  fecha_vencimiento: string | null
  proveedor_nombre: string | null
  proveedor_id: string | null
  soporte_url: string | null
}

export async function obtenerFacturasCompra(): Promise<{
  data: ResumenFacturaCompra[]
  error: string | null
  totales: { subtotal: number; iva: number; total: number; porPagar: number }
}> {
  const totalesVacios = { subtotal: 0, iva: 0, total: 0, porPagar: 0 }
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('facturas_compra')
      .select('*, proveedores(razon_social)')
      .order('fecha_factura', { ascending: false })
      .limit(100)

    if (error) return { data: [], error: error.message, totales: totalesVacios }

    const facturas: ResumenFacturaCompra[] = (data ?? []).map((f) => {
      const prov = f.proveedores as { razon_social?: string } | null
      return {
        id: f.id,
        numero_factura: f.numero_factura,
        fecha_factura: f.fecha_factura,
        subtotal: Number(f.subtotal ?? 0),
        iva_total: Number(f.iva_total ?? 0),
        total: Number(f.total ?? 0),
        forma_pago: f.forma_pago ?? 'Contado',
        estado: f.estado,
        dias_credito: Number(f.dias_credito ?? 0),
        fecha_vencimiento: f.fecha_vencimiento,
        proveedor_nombre: prov?.razon_social ?? null,
        proveedor_id: f.proveedor_id ?? null,
        soporte_url: f.soporte_url ?? null,
      }
    })

    const totales = facturas.reduce((acc, f) => {
      if (f.estado === 'ANULADA') return acc
      return {
        subtotal: acc.subtotal + f.subtotal,
        iva: acc.iva + f.iva_total,
        total: acc.total + f.total,
        porPagar: acc.porPagar + (f.estado === 'REGISTRADA' ? f.total : 0),
      }
    }, totalesVacios)

    return { data: facturas, error: null, totales }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'Error', totales: totalesVacios }
  }
}

export async function obtenerProveedoresParaSelect(): Promise<{ id: string; razon_social: string }[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('proveedores')
      .select('id, razon_social')
      .eq('estado', 'ACTIVO')
      .order('razon_social')
    return (data ?? []).map((p) => ({ id: String(p.id), razon_social: String(p.razon_social) }))
  } catch {
    return []
  }
}


// ============================================================
// Cotizaciones a las que se les puede asignar costo de compra
// ============================================================
export interface CotizacionParaAsignar {
  id: string
  numero: string
  cliente_nombre: string
  estado: string
  fecha: string
  total: number
  items: { producto_id: string | null; descripcion: string; cantidad: number }[]
}

export async function obtenerCotizacionesParaAsignar(): Promise<CotizacionParaAsignar[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('cotizaciones')
      .select('id, numero, estado, fecha, total, clientes(razon_social), cotizacion_items(producto_id, descripcion, cantidad)')
      .in('estado', ['APROBADA', 'PAGADA', 'EN_ALISTAMIENTO', 'DESPACHADA', 'FACTURADA'])
      .order('fecha', { ascending: false })
      .limit(60)

    return (data ?? []).map((c) => {
      const cli = c.clientes as { razon_social?: string } | null
      const items = (c.cotizacion_items ?? []) as { producto_id: string | null; descripcion: string; cantidad: number }[]
      return {
        id: String(c.id),
        numero: String(c.numero),
        cliente_nombre: cli?.razon_social ?? 'Sin cliente',
        estado: String(c.estado),
        fecha: String(c.fecha),
        total: Number(c.total ?? 0),
        items: items.map((i) => ({
          producto_id: i.producto_id,
          descripcion: i.descripcion,
          cantidad: Number(i.cantidad ?? 0),
        })),
      }
    })
  } catch {
    return []
  }
}

// ============================================================
// Detalle completo de una factura de compra (para editar)
// ============================================================
export interface FacturaCompraDetalle {
  id: string
  proveedor_id: string | null
  numero_factura: string | null
  fecha_factura: string
  forma_pago: string
  dias_credito: number
  estado: string
  soporte_url: string | null
  notas: string | null
  subtotal: number
  iva_total: number
  total: number
  items: {
    id: string
    producto_id: string | null
    descripcion: string
    cantidad: number
    precio_unitario: number
    iva_porcentaje: number
    asignaciones: { id: string; cotizacion_id: string | null; cotizacion_numero: string | null; cantidad: number; destino: string }[]
  }[]
}

export async function obtenerFacturaCompraDetalle(id: string): Promise<FacturaCompraDetalle | null> {
  try {
    const supabase = createServerSupabaseClient()
    const { data: f } = await supabase
      .from('facturas_compra')
      .select('*, factura_compra_items(*)')
      .eq('id', id)
      .single()

    if (!f) return null

    const { data: asigs } = await supabase
      .from('asignacion_costos')
      .select('id, factura_compra_item_id, cotizacion_id, cantidad, destino, cotizaciones(numero)')
      .eq('factura_compra_id', id)

    const items = ((f.factura_compra_items ?? []) as Record<string, unknown>[]).map((it) => {
      const propias = (asigs ?? []).filter((a) => a.factura_compra_item_id === it.id)
      return {
        id: String(it.id),
        producto_id: (it.producto_id as string | null) ?? null,
        descripcion: String(it.descripcion ?? ''),
        cantidad: Number(it.cantidad ?? 0),
        precio_unitario: Number(it.precio_unitario ?? 0),
        iva_porcentaje: Number(it.iva_porcentaje ?? 19),
        asignaciones: propias.map((a) => {
          const cot = a.cotizaciones as { numero?: string } | null
          return {
            id: String(a.id),
            cotizacion_id: (a.cotizacion_id as string | null) ?? null,
            cotizacion_numero: cot?.numero ?? null,
            cantidad: Number(a.cantidad ?? 0),
            destino: String(a.destino),
          }
        }),
      }
    })

    return {
      id: String(f.id),
      proveedor_id: (f.proveedor_id as string | null) ?? null,
      numero_factura: (f.numero_factura as string | null) ?? null,
      fecha_factura: String(f.fecha_factura),
      forma_pago: String(f.forma_pago ?? 'Contado'),
      dias_credito: Number(f.dias_credito ?? 0),
      estado: String(f.estado),
      soporte_url: (f.soporte_url as string | null) ?? null,
      notas: (f.notas as string | null) ?? null,
      subtotal: Number(f.subtotal ?? 0),
      iva_total: Number(f.iva_total ?? 0),
      total: Number(f.total ?? 0),
      items,
    }
  } catch {
    return null
  }
}

// ============================================================
// Lineas de compra con saldo sin asignar
// ============================================================
export interface ItemPendienteAsignar {
  factura_compra_item_id: string
  numero_factura: string | null
  fecha_factura: string
  proveedor: string | null
  producto_id: string | null
  descripcion: string
  cantidad_comprada: number
  cantidad_asignada: number
  cantidad_pendiente: number
  costo_unitario: number
}

export async function obtenerItemsPendientesAsignar(): Promise<ItemPendienteAsignar[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('compra_items_pendientes_asignar')
      .select('*')
      .gt('cantidad_pendiente', 0)
      .order('fecha_factura', { ascending: false })

    return (data ?? []).map((r) => ({
      factura_compra_item_id: String(r.factura_compra_item_id),
      numero_factura: r.numero_factura,
      fecha_factura: String(r.fecha_factura),
      proveedor: r.proveedor,
      producto_id: r.producto_id,
      descripcion: String(r.descripcion ?? ''),
      cantidad_comprada: Number(r.cantidad_comprada ?? 0),
      cantidad_asignada: Number(r.cantidad_asignada ?? 0),
      cantidad_pendiente: Number(r.cantidad_pendiente ?? 0),
      costo_unitario: Number(r.costo_unitario ?? 0),
    }))
  } catch {
    return []
  }
}
