'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

/** Crear categoria de producto */
export async function crearCategoria(formData: FormData): Promise<ResultadoAccion> {
  const nombre = String(formData.get('nombre') ?? '').trim()
  if (!nombre) return { ok: false, mensaje: 'El nombre es obligatorio.' }

  try {
    const supabase = createServerSupabaseClient()
    const orden = Number(formData.get('orden') ?? 99)
    const { error } = await supabase.from('categorias_producto').insert({ nombre, orden })
    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/configuracion')
    revalidatePath('/inventario')
    return { ok: true, mensaje: `Categoria "${nombre}" creada.` }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}

/** Editar categoria */
export async function editarCategoria(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  const nombre = String(formData.get('nombre') ?? '').trim()
  if (!id || !nombre) return { ok: false, mensaje: 'Datos incompletos.' }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('categorias_producto').update({ nombre }).eq('id', id)
    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/configuracion')
    revalidatePath('/inventario')
    return { ok: true, mensaje: `Categoria actualizada.` }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}

/** Eliminar categoria */
export async function eliminarCategoria(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'ID invalido.' }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('categorias_producto').delete().eq('id', id)
    if (error) return { ok: false, mensaje: error.message.includes('violates foreign key') ? 'No se puede eliminar: hay productos con esta categoria. Cambia la categoria de esos productos primero.' : error.message }

    revalidatePath('/configuracion')
    revalidatePath('/inventario')
    return { ok: true, mensaje: 'Categoria eliminada.' }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}
