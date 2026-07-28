import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Proveedor } from '@/types/proveedores'

export async function obtenerProveedores(): Promise<{
  data: Proveedor[]
  error: string | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('razon_social', { ascending: true })

    if (error) return { data: [], error: error.message }

    const proveedores: Proveedor[] = (data ?? []).map((p) => ({
      ...p,
      categorias: p.categorias ?? [],
      dias_credito: Number(p.dias_credito ?? 0),
      pedido_minimo: p.pedido_minimo ? Number(p.pedido_minimo) : null,
      calificacion: Number(p.calificacion ?? 0),
    }))

    return { data: proveedores, error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
