'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

export async function crearProveedor(formData: FormData): Promise<ResultadoAccion> {
  const razon_social = String(formData.get('razon_social') ?? '').trim()
  if (!razon_social) return { ok: false, mensaje: 'La razon social es obligatoria.' }

  const categoriasRaw = String(formData.get('categorias') ?? '')
  const categorias = categoriasRaw ? categoriasRaw.split(',').map((c) => c.trim()).filter(Boolean) : []

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('proveedores').insert({
      razon_social,
      nit: formData.get('nit') || null,
      nombre_comercial: formData.get('nombre_comercial') || null,
      contacto_nombre: formData.get('contacto_nombre') || null,
      contacto_telefono: formData.get('contacto_telefono') || null,
      contacto_email: formData.get('contacto_email') || null,
      contacto_cargo: formData.get('contacto_cargo') || null,
      ciudad: formData.get('ciudad') || null,
      direccion: formData.get('direccion') || null,
      categorias,
      condiciones_pago: formData.get('condiciones_pago') || 'Contado',
      dias_credito: Number(formData.get('dias_credito')) || 0,
      tiempo_entrega: formData.get('tiempo_entrega') || null,
      estado: formData.get('estado') || 'ACTIVO',
      notas: formData.get('notas') || null,
    })

    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/proveedores')
    return { ok: true, mensaje: 'Proveedor registrado correctamente.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al registrar.' }
  }
}
