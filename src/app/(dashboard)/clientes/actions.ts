'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

export async function crearCliente(formData: FormData): Promise<ResultadoAccion> {
  const razon_social = String(formData.get('razon_social') ?? '').trim()
  if (!razon_social) return { ok: false, mensaje: 'La razon social es obligatoria.' }

  const categoriasRaw = String(formData.get('categorias_interes') ?? '')
  const categorias_interes = categoriasRaw ? categoriasRaw.split(',').map((c) => c.trim()).filter(Boolean) : []

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('clientes').insert({
      razon_social,
      nit: formData.get('nit') || null,
      nombre_comercial: formData.get('nombre_comercial') || null,
      contacto_nombre: formData.get('contacto_nombre') || null,
      contacto_telefono: formData.get('contacto_telefono') || null,
      contacto_email: formData.get('contacto_email') || null,
      contacto_cargo: formData.get('contacto_cargo') || null,
      direccion_entrega: formData.get('direccion_entrega') || null,
      ciudad: formData.get('ciudad') || null,
      sector: formData.get('sector') || null,
      tamano: formData.get('tamano') || null,
      categorias_interes,
      estado: formData.get('estado') || 'PROSPECTO',
      origen: formData.get('origen') || null,
      notas: formData.get('notas') || null,
    })

    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/clientes')
    return { ok: true, mensaje: 'Cliente registrado correctamente.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al registrar.' }
  }
}
