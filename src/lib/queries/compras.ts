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
