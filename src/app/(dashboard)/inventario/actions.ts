'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

export async function crearProducto(formData: FormData): Promise<ResultadoAccion> {
  const nombre = String(formData.get('nombre') ?? '').trim()
  if (!nombre) return { ok: false, mensaje: 'El nombre es obligatorio.' }

  const iva = Number(formData.get('iva_porcentaje') ?? 19)
  const margen = Number(formData.get('margen_minimo_pct') ?? 20)
  const precio_lista = Number(String(formData.get('precio_lista') ?? '0').replace(/\./g, '').replace(',', '.')) || 0

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('productos').insert({
      codigo: '', // trigger genera automaticamente PRD-XXXX
      nombre,
      descripcion: formData.get('descripcion') || null,
      categoria_id: formData.get('categoria_id') || null,
      unidad_medida: formData.get('unidad_medida') || 'Unidad',
      iva_porcentaje: iva,
      margen_minimo_pct: margen,
      precio_lista: precio_lista > 0 ? precio_lista : null,
      stock_minimo: Number(formData.get('stock_minimo')) || 0,
      notas: formData.get('notas') || null,
    })

    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/inventario')
    return { ok: true, mensaje: 'Producto creado correctamente.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al crear.' }
  }
}


/** Editar producto */
export async function editarProducto(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  const nombre = String(formData.get('nombre') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'Producto no valido.' }
  if (!nombre) return { ok: false, mensaje: 'El nombre es obligatorio.' }

  const iva = Number(formData.get('iva_porcentaje') ?? 19)
  const margen = Number(formData.get('margen_minimo_pct') ?? 20)
  const precio_lista = Number(String(formData.get('precio_lista') ?? '0').replace(/\./g, '').replace(',', '.')) || 0

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('productos').update({
      nombre,
      descripcion: formData.get('descripcion') || null,
      categoria_id: formData.get('categoria_id') || null,
      unidad_medida: formData.get('unidad_medida') || 'Unidad',
      iva_porcentaje: iva,
      margen_minimo_pct: margen,
      precio_lista: precio_lista > 0 ? precio_lista : null,
      stock_minimo: Number(formData.get('stock_minimo')) || 0,
      notas: formData.get('notas') || null,
    }).eq('id', id)

    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/inventario')
    return { ok: true, mensaje: 'Producto actualizado.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al editar.' }
  }
}

/** Eliminar producto (marcar como inactivo) */
export async function eliminarProducto(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'Producto no valido.' }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('productos').update({ activo: false }).eq('id', id)
    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/inventario')
    return { ok: true, mensaje: 'Producto eliminado.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}
