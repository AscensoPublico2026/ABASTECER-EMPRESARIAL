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



/**
 * Clientes que se pueden elegir en una cotizacion o venta.
 *
 * Incluye PROSPECTO: todo cliente nuevo se crea como prospecto y la primera
 * cotizacion suele hacerse antes de que pase a ACTIVO. Se excluyen INACTIVO
 * y MOROSO. Si se pasa `incluirId`, ese cliente siempre aparece (por ejemplo,
 * el cliente que ya tiene asignado la cotizacion que se esta editando).
 */
export async function obtenerClientesParaSelect(
  incluirId?: string | null
): Promise<{ id: string; razon_social: string }[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('clientes')
      .select('id, razon_social')
      .in('estado', ['PROSPECTO', 'ACTIVO', 'CREDITO_APROBADO'])
      .order('razon_social')
    const lista = (data ?? []).map((c) => ({ id: String(c.id), razon_social: String(c.razon_social) }))

    if (incluirId && !lista.some((c) => c.id === incluirId)) {
      const { data: actual } = await supabase
        .from('clientes')
        .select('id, razon_social')
        .eq('id', incluirId)
        .maybeSingle()
      if (actual) {
        lista.push({ id: String(actual.id), razon_social: String(actual.razon_social) })
        lista.sort((a, b) => a.razon_social.localeCompare(b.razon_social, 'es'))
      }
    }
    return lista
  } catch {
    return []
  }
}
