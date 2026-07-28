'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function actualizarProveedor(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'ID invalido.' }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('proveedores').update({
      razon_social: formData.get('razon_social') || null,
      nit: formData.get('nit') || null,
      nombre_comercial: formData.get('nombre_comercial') || null,
      ciudad: formData.get('ciudad') || null,
      direccion: formData.get('direccion') || null,
      contacto_nombre: formData.get('contacto_nombre') || null,
      contacto_telefono: formData.get('contacto_telefono') || null,
      contacto_email: formData.get('contacto_email') || null,
      contacto_cargo: formData.get('contacto_cargo') || null,
      condiciones_pago: formData.get('condiciones_pago') || 'Contado',
      tiempo_entrega: formData.get('tiempo_entrega') || null,
      notas: formData.get('notas') || null,
      estado: formData.get('estado') || 'ACTIVO',
    }).eq('id', id)

    if (error) return { ok: false, mensaje: error.message }
    revalidatePath('/proveedores')
    revalidatePath(`/proveedores/${id}`)
    return { ok: true, mensaje: 'Proveedor actualizado correctamente.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}
