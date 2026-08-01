'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { uppercaseFormData } from '@/lib/uppercase'

export async function actualizarCliente(formData: FormData) {
  uppercaseFormData(formData)
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'ID invalido.' }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('clientes').update({
      razon_social: formData.get('razon_social') || null,
      nit: formData.get('nit') || null,
      nombre_comercial: formData.get('nombre_comercial') || null,
      ciudad: formData.get('ciudad') || null,
      contacto_nombre: formData.get('contacto_nombre') || null,
      contacto_telefono: formData.get('contacto_telefono') || null,
      contacto_email: formData.get('contacto_email') || null,
      contacto_pagos_nombre: formData.get('contacto_pagos_nombre') || null,
      contacto_pagos_telefono: formData.get('contacto_pagos_telefono') || null,
      contacto_pagos_email: formData.get('contacto_pagos_email') || null,
      direccion_entrega: formData.get('direccion_entrega') || null,
      sector: formData.get('sector') || null,
      estado: formData.get('estado') || 'ACTIVO',
      tiene_credito: formData.get('tiene_credito') === 'true',
      dias_credito: Number(formData.get('dias_credito')) || 0,
      cupo_credito: Number(formData.get('cupo_credito')) || 0,
      notas: formData.get('notas') || null,
    }).eq('id', id)

    if (error) return { ok: false, mensaje: error.message }
    revalidatePath('/clientes')
    revalidatePath(`/clientes/${id}`)
    return { ok: true, mensaje: 'Cliente actualizado correctamente.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}
