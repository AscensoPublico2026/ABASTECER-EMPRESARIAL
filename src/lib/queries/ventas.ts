import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { ResumenVenta } from '@/types/ventas'

export async function obtenerVentas(): Promise<{
  data: ResumenVenta[]
  error: string | null
  totales: { subtotal: number; iva: number; total: number; costo: number; utilidad: number; porCobrar: number }
}> {
  const totalesVacios = { subtotal: 0, iva: 0, total: 0, costo: 0, utilidad: 0, porCobrar: 0 }

  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('resumen_ventas')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(100)

    if (error) return { data: [], error: error.message, totales: totalesVacios }

    const ventas: ResumenVenta[] = (data ?? []).map((v) => ({
      ...v,
      subtotal: Number(v.subtotal ?? 0),
      iva_total: Number(v.iva_total ?? 0),
      total: Number(v.total ?? 0),
      costo_total: Number(v.costo_total ?? 0),
      utilidad_bruta: Number(v.utilidad_bruta ?? 0),
      margen_pct: Number(v.margen_pct ?? 0),
      dias_credito: Number(v.dias_credito ?? 0),
      num_items: Number(v.num_items ?? 0),
    }))

    const totales = ventas.reduce(
      (acc, v) => {
        if (v.estado === 'ANULADA' || v.estado === 'COTIZACION') return acc
        return {
          subtotal: acc.subtotal + v.subtotal,
          iva: acc.iva + v.iva_total,
          total: acc.total + v.total,
          costo: acc.costo + v.costo_total,
          utilidad: acc.utilidad + v.utilidad_bruta,
          porCobrar: acc.porCobrar + (v.estado === 'FACTURADA' ? v.total : 0),
        }
      },
      totalesVacios
    )

    return { data: ventas, error: null, totales }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'Error desconocido', totales: totalesVacios }
  }
}

export async function obtenerClientesParaSelect(): Promise<{ id: string; razon_social: string }[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('clientes')
      .select('id, razon_social')
      .in('estado', ['ACTIVO', 'CREDITO_APROBADO'])
      .order('razon_social')
    return (data ?? []).map((c) => ({ id: String(c.id), razon_social: String(c.razon_social) }))
  } catch {
    return []
  }
}
