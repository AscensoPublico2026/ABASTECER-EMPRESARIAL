'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

/** Agregar precio de un proveedor para un producto */
export async function agregarPrecioProveedor(formData: FormData): Promise<ResultadoAccion> {
  const producto_id = String(formData.get('producto_id') ?? '').trim()
  const proveedor_id = String(formData.get('proveedor_id') ?? '').trim()
  const precio = Number(String(formData.get('precio') ?? '0').replace(/\./g, '').replace(',', '.')) || 0
  const iva_incluido = formData.get('iva_incluido') === 'true'
  const tiempo_entrega = String(formData.get('tiempo_entrega') ?? '').trim()
  const referencia_proveedor = String(formData.get('referencia_proveedor') ?? '').trim()
  const fecha_cotizacion = String(formData.get('fecha_cotizacion') ?? '').trim()
  const disponible = formData.has('disponible')
  const notas = String(formData.get('notas') ?? '').trim()

  if (!producto_id) return { ok: false, mensaje: 'Producto no valido.' }
  if (!proveedor_id) return { ok: false, mensaje: 'Selecciona un proveedor.' }
  if (precio <= 0) return { ok: false, mensaje: 'El precio debe ser mayor a 0.' }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('precios_proveedor').insert({
      producto_id,
      proveedor_id,
      precio,
      iva_incluido,
      tiempo_entrega: tiempo_entrega || null,
      referencia_proveedor: referencia_proveedor || null,
      fecha_cotizacion: fecha_cotizacion || new Date().toISOString().slice(0, 10),
      disponible,
      notas: notas || null,
    })

    if (error) return { ok: false, mensaje: error.message }

    revalidatePath(`/inventario/${producto_id}`)
    revalidatePath('/inventario')
    return { ok: true, mensaje: 'Precio registrado correctamente.' }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}


/** Crear proveedor rapido (solo nombre + contacto + telefono) */
export async function crearProveedorRapido(formData: FormData): Promise<{ ok: boolean; mensaje: string; id?: string }> {
  const nombre = String(formData.get('nombre') ?? '').trim()
  const contacto = String(formData.get('contacto') ?? '').trim()
  const telefono = String(formData.get('telefono') ?? '').trim()

  if (!nombre) return { ok: false, mensaje: 'El nombre es obligatorio.' }

  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('proveedores').insert({
      razon_social: nombre,
      contacto_nombre: contacto || null,
      contacto_telefono: telefono || null,
      activo: true,
    }).select('id').single()

    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/inventario')
    revalidatePath('/proveedores')
    return { ok: true, mensaje: `Proveedor "${nombre}" creado.`, id: data.id }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}
