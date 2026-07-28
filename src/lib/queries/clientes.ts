import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Cliente } from '@/types/clientes'

export async function obtenerClientes(): Promise<{
  data: Cliente[]
  error: string | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('razon_social', { ascending: true })

    if (error) return { data: [], error: error.message }

    const clientes: Cliente[] = (data ?? []).map((c) => ({
      ...c,
      categorias_interes: c.categorias_interes ?? [],
      dias_credito: Number(c.dias_credito ?? 0),
      cupo_credito: Number(c.cupo_credito ?? 0),
      tiene_credito: Boolean(c.tiene_credito),
    }))

    return { data: clientes, error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'Error desconocido' }
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
