import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { ResumenCompra } from '@/types/compras'

export async function obtenerCompras(): Promise<{
  data: ResumenCompra[]
  error: string | null
  totales: { subtotal: number; iva: number; total: number; porPagar: number }
}> {
  const totalesVacios = { subtotal: 0, iva: 0, total: 0, porPagar: 0 }

  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('resumen_compras')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(100)

    if (error) return { data: [], error: error.message, totales: totalesVacios }

    const compras: ResumenCompra[] = (data ?? []).map((c) => ({
      ...c,
      subtotal: Number(c.subtotal ?? 0),
      iva_total: Number(c.iva_total ?? 0),
      total: Number(c.total ?? 0),
      dias_credito: Number(c.dias_credito ?? 0),
      num_items: Number(c.num_items ?? 0),
    }))

    const totales = compras.reduce(
      (acc, c) => {
        if (c.estado === 'ANULADA') return acc
        return {
          subtotal: acc.subtotal + c.subtotal,
          iva: acc.iva + c.iva_total,
          total: acc.total + c.total,
          porPagar: acc.porPagar + (c.estado === 'POR_PAGAR' || c.estado === 'VENCIDA' ? c.total : 0),
        }
      },
      totalesVacios
    )

    return { data: compras, error: null, totales }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'Error desconocido', totales: totalesVacios }
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
