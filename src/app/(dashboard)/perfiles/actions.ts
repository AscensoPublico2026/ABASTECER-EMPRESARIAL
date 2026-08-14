'use server'

import { leerBandera } from '@/lib/uppercase'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

const MODULOS_DISPONIBLES = [
  'ventas', 'facturacion', 'compras', 'inventario', 'gastos',
  'clientes', 'proveedores', 'financiero', 'socios', 'indicadores', 'perfiles',
]

/** Crear un perfil nuevo */
export async function crearPerfil(formData: FormData): Promise<ResultadoAccion> {
  const nombre = String(formData.get('nombre') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const rol = String(formData.get('rol') ?? 'EMPLEADO').trim()
  const cargo = String(formData.get('cargo') ?? '').trim()
  const modulosJson = String(formData.get('modulos') ?? '[]')

  if (!nombre) return { ok: false, mensaje: 'El nombre es obligatorio.' }
  if (!email) return { ok: false, mensaje: 'El email es obligatorio.' }

  let modulos: string[]
  try { modulos = JSON.parse(modulosJson) } catch { modulos = [] }

  // Si es MAESTRO, tiene acceso a todo
  if (rol === 'MAESTRO') modulos = MODULOS_DISPONIBLES

  try {
    const supabase = createServerSupabaseClient()

    // Verificar si el email ya existe
    const { data: existente } = await supabase.from('perfiles').select('id').eq('email', email).single()
    if (existente) return { ok: false, mensaje: 'Ya existe un perfil con ese email.' }

    // Buscar si hay un auth user con ese email para vincular
    // (esto se hace automaticamente al loguearse, por ahora dejamos user_id null)
    const { error } = await supabase.from('perfiles').insert({
      nombre,
      email,
      rol,
      cargo: cargo || null,
      modulos,
      activo: true,
    })

    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/perfiles')
    return { ok: true, mensaje: `Perfil "${nombre}" creado exitosamente.` }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}

/** Editar un perfil existente */
export async function editarPerfil(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  const nombre = String(formData.get('nombre') ?? '').trim()
  const cargo = String(formData.get('cargo') ?? '').trim()
  const rol = String(formData.get('rol') ?? 'EMPLEADO').trim()
  const modulosJson = String(formData.get('modulos') ?? '[]')
  const activo = leerBandera(formData.get('activo'))

  if (!id) return { ok: false, mensaje: 'ID invalido.' }
  if (!nombre) return { ok: false, mensaje: 'El nombre es obligatorio.' }

  let modulos: string[]
  try { modulos = JSON.parse(modulosJson) } catch { modulos = [] }
  if (rol === 'MAESTRO') modulos = MODULOS_DISPONIBLES

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('perfiles').update({
      nombre,
      rol,
      cargo: cargo || null,
      modulos,
      activo,
    }).eq('id', id)

    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/perfiles')
    return { ok: true, mensaje: `Perfil "${nombre}" actualizado.` }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}

/** Vincular perfil con auth user (se llama al login si no esta vinculado) */
export async function vincularPerfilConUsuario(): Promise<void> {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return

    // Buscar perfil con ese email que no tenga user_id
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('id')
      .eq('email', user.email)
      .is('user_id', null)
      .single()

    if (perfil) {
      await supabase.from('perfiles').update({ user_id: user.id }).eq('id', perfil.id)
    }
  } catch { /* silencioso */ }
}
