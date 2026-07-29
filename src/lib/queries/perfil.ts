import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface Perfil {
  id: string
  user_id: string | null
  nombre: string
  email: string
  rol: 'MAESTRO' | 'EMPLEADO'
  cargo: string | null
  modulos: string[]
  activo: boolean
}

/**
 * Obtiene el perfil del usuario actualmente logueado.
 * Si no tiene perfil creado, retorna null.
 */
export async function obtenerPerfilActual(): Promise<Perfil | null> {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!perfil) return null

    return {
      id: perfil.id,
      user_id: perfil.user_id,
      nombre: perfil.nombre,
      email: perfil.email,
      rol: perfil.rol,
      cargo: perfil.cargo,
      modulos: perfil.modulos ?? [],
      activo: perfil.activo,
    }
  } catch {
    return null
  }
}

/**
 * Obtiene todos los perfiles (para la pagina de gestion).
 */
export async function obtenerPerfiles(): Promise<Perfil[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .order('rol', { ascending: true })
      .order('nombre', { ascending: true })

    if (error || !data) return []

    return data.map((p) => ({
      id: p.id,
      user_id: p.user_id,
      nombre: p.nombre,
      email: p.email,
      rol: p.rol,
      cargo: p.cargo,
      modulos: p.modulos ?? [],
      activo: p.activo,
    }))
  } catch {
    return []
  }
}

/**
 * Obtiene nombre del usuario actual para registrar en operaciones.
 * Retorna "Sistema" si no hay perfil vinculado.
 */
export async function obtenerNombreUsuarioActual(): Promise<{ id: string | null; nombre: string }> {
  const perfil = await obtenerPerfilActual()
  if (perfil) return { id: perfil.id, nombre: perfil.nombre }
  
  // Fallback: usar email del auth user
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) return { id: null, nombre: user.email.split('@')[0] }
  } catch { /* ignore */ }
  
  return { id: null, nombre: 'Sistema' }
}
