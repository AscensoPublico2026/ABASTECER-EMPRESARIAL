'use server'

import { leerBandera } from '@/lib/uppercase'
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
  const iva_incluido = leerBandera(formData.get('iva_incluido'))
  const tiempo_entrega = String(formData.get('tiempo_entrega') ?? '').trim()
  const referencia_proveedor = String(formData.get('referencia_proveedor') ?? '').trim()
  const fecha_cotizacion = String(formData.get('fecha_cotizacion') ?? '').trim()
  const notas = String(formData.get('notas') ?? '').trim()

  // COSTO = me lo venden a mi (define mi margen).
  // MERCADO = asi lo vende al cliente final (define si soy competitivo).
  const tipoRaw = String(formData.get('tipo') ?? 'COSTO').trim().toUpperCase()
  const tipo = tipoRaw === 'MERCADO' ? 'MERCADO' : 'COSTO'

  // BUG QUE ESTO ARREGLA: antes se leia con formData.has('disponible'),
  // pero el formulario NO tiene ese campo, asi que TODO precio se
  // guardaba como NO disponible. En el listado eso manda al proveedor al
  // final del ranking y lo marca "sin existencias" sin razon.
  // Un precio recien cotizado se asume disponible salvo que digan lo
  // contrario; para marcarlo agotado esta la edicion del precio.
  const disponible = formData.has('disponible')
    ? formData.get('disponible') !== 'false'
    : true

  if (!producto_id) return { ok: false, mensaje: 'Producto no valido.' }
  if (!proveedor_id) return { ok: false, mensaje: 'Selecciona un proveedor.' }
  if (precio <= 0) return { ok: false, mensaje: 'El precio debe ser mayor a 0.' }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('precios_proveedor').insert({
      producto_id,
      proveedor_id,
      precio,
      tipo,
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
    }).select('id').single()

    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/inventario')
    revalidatePath('/proveedores')
    return { ok: true, mensaje: `Proveedor "${nombre}" creado.`, id: data.id }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}


/** Editar precio de proveedor */
export async function editarPrecioProveedor(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  const precio = Number(String(formData.get('precio') ?? '0').replace(/\./g, '').replace(',', '.')) || 0
  const iva_incluido = leerBandera(formData.get('iva_incluido'))
  const tiempo_entrega = String(formData.get('tiempo_entrega') ?? '').trim()
  const referencia_proveedor = String(formData.get('referencia_proveedor') ?? '').trim()
  const fecha_cotizacion = String(formData.get('fecha_cotizacion') ?? '').trim()
  const notas = String(formData.get('notas') ?? '').trim()

  if (!id) return { ok: false, mensaje: 'ID invalido.' }
  if (precio <= 0) return { ok: false, mensaje: 'El precio debe ser mayor a 0.' }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('precios_proveedor').update({
      precio,
      iva_incluido,
      tiempo_entrega: tiempo_entrega || null,
      referencia_proveedor: referencia_proveedor || null,
      fecha_cotizacion: fecha_cotizacion || null,
      notas: notas || null,
    }).eq('id', id)

    if (error) return { ok: false, mensaje: error.message }
    revalidatePath('/inventario')
    return { ok: true, mensaje: 'Precio actualizado.' }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}

/** Eliminar precio de proveedor */
export async function eliminarPrecioProveedor(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  const producto_id = String(formData.get('producto_id') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'ID invalido.' }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('precios_proveedor').delete().eq('id', id)
    if (error) return { ok: false, mensaje: error.message }
    revalidatePath(`/inventario/${producto_id}`)
    return { ok: true, mensaje: 'Precio eliminado.' }
  } catch (e) { return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' } }
}
