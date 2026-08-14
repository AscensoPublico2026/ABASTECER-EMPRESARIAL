'use server'

import { leerBandera } from '@/lib/uppercase'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

/**
 * Acciones del modulo administrador del sitio web.
 *
 * OJO: aqui NO se usa uppercaseFormData(). El texto de la web se guarda
 * tal como lo escribe la persona, con tildes y mayusculas normales.
 */

/** Refresca las paginas publicas para que el cambio se vea de inmediato */
function refrescarSitio(slugProducto?: string) {
  revalidatePath('/', 'page')
  revalidatePath('/catalogo')
  revalidatePath('/nosotros')
  revalidatePath('/contacto')
  revalidatePath('/cotizacion')
  revalidatePath('/sitemap.xml')
  if (slugProducto) revalidatePath(`/catalogo/${slugProducto}`)
}

function refrescarAdmin() {
  revalidatePath('/sitio-web')
  revalidatePath('/sitio-web/contenido')
  revalidatePath('/sitio-web/productos')
  revalidatePath('/sitio-web/lineas')
  revalidatePath('/sitio-web/solicitudes')
}

const PREFIJO_CAMPO = 'campo__'

/** Guarda los textos del sitio (Sitio Web > Contenido) */
export async function guardarContenidoSitio(formData: FormData): Promise<ResultadoAccion> {
  const cambios: { clave: string; valor: string }[] = []

  formData.forEach((valor, nombre) => {
    if (!nombre.startsWith(PREFIJO_CAMPO)) return
    const clave = nombre.slice(PREFIJO_CAMPO.length)
    if (!clave) return
    cambios.push({ clave, valor: String(valor ?? '').slice(0, 8000) })
  })

  if (cambios.length === 0) {
    return { ok: false, mensaje: 'No hubo cambios para guardar.' }
  }

  try {
    const supabase = createServerSupabaseClient()

    for (const cambio of cambios) {
      const { error } = await supabase
        .from('sitio_contenido')
        .update({ valor: cambio.valor })
        .eq('clave', cambio.clave)
      if (error) return { ok: false, mensaje: `No se pudo guardar "${cambio.clave}": ${error.message}` }
    }

    refrescarSitio()
    refrescarAdmin()
    return {
      ok: true,
      mensaje: `Listo. Se guardaron ${cambios.length} campo(s) y la web ya muestra los cambios.`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al guardar.' }
  }
}

/** Guarda la informacion web de un producto */
export async function guardarProductoWeb(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'Producto no válido.' }

  const limpio = (clave: string, maximo: number) =>
    String(formData.get(clave) ?? '').trim().slice(0, maximo)

  let imagenes: string[] = []
  const imagenesCrudas = formData.get('imagenes')
  if (imagenesCrudas) {
    try {
      const parseadas = JSON.parse(String(imagenesCrudas))
      if (Array.isArray(parseadas)) {
        imagenes = parseadas.filter((u) => typeof u === 'string' && u.trim() !== '').slice(0, 8)
      }
    } catch {
      imagenes = []
    }
  }

  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('productos')
      .update({
        nombre_web: limpio('nombre_web', 200) || null,
        descripcion_web: limpio('descripcion_web', 4000) || null,
        marca: limpio('marca', 120) || null,
        ficha: limpio('ficha', 4000) || null,
        imagen_url: limpio('imagen_url', 800) || null,
        imagenes,
        categoria_id: limpio('categoria_id', 60) || null,
        visible_web: leerBandera(formData.get('visible_web')),
        destacado_web:
          leerBandera(formData.get('destacado_web')),
        orden_web: Number(formData.get('orden_web')) || 0,
      })
      .eq('id', id)
      .select('slug')
      .maybeSingle()

    if (error) return { ok: false, mensaje: error.message }

    refrescarSitio(data?.slug ? String(data.slug) : undefined)
    refrescarAdmin()
    return { ok: true, mensaje: 'Producto actualizado en la web.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al guardar.' }
  }
}

/** Publica u oculta un producto en el catalogo web */
export async function alternarVisibleWeb(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  const publicar = leerBandera(formData.get('publicar'))
  if (!id) return { ok: false, mensaje: 'Producto no válido.' }

  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('productos')
      .update({ visible_web: publicar })
      .eq('id', id)
      .select('slug')
      .maybeSingle()

    if (error) return { ok: false, mensaje: error.message }

    refrescarSitio(data?.slug ? String(data.slug) : undefined)
    refrescarAdmin()
    return {
      ok: true,
      mensaje: publicar ? 'Producto publicado en la web.' : 'Producto oculto de la web.',
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}

/** Marca o desmarca un producto como destacado en la pagina de inicio */
export async function alternarDestacadoWeb(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  const destacar = leerBandera(formData.get('destacar'))
  if (!id) return { ok: false, mensaje: 'Producto no válido.' }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from('productos')
      .update({ destacado_web: destacar, visible_web: destacar ? true : undefined })
      .eq('id', id)

    if (error) return { ok: false, mensaje: error.message }

    refrescarSitio()
    refrescarAdmin()
    return { ok: true, mensaje: destacar ? 'Producto destacado.' : 'Ya no está destacado.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}

/** Publica de una vez todos los productos activos */
export async function publicarTodosLosProductos(): Promise<ResultadoAccion> {
  try {
    const supabase = createServerSupabaseClient()
    const { error, count } = await supabase
      .from('productos')
      .update({ visible_web: true }, { count: 'exact' })
      .eq('activo', true)
      .eq('visible_web', false)

    if (error) return { ok: false, mensaje: error.message }

    refrescarSitio()
    refrescarAdmin()
    return {
      ok: true,
      mensaje: `Se publicaron ${count ?? 0} producto(s) en el catálogo web.`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}

/** Guarda la informacion web de una linea (categoria) */
export async function guardarLineaWeb(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'Línea no válida.' }

  const limpio = (clave: string, maximo: number) =>
    String(formData.get(clave) ?? '').trim().slice(0, maximo)

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from('categorias_producto')
      .update({
        nombre_web: limpio('nombre_web', 120) || null,
        descripcion_web: limpio('descripcion_web', 1200) || null,
        icono: limpio('icono', 40) || 'caja',
        imagen_url: limpio('imagen_url', 800) || null,
        visible_web: leerBandera(formData.get('visible_web')),
        orden: Number(formData.get('orden')) || 0,
      })
      .eq('id', id)

    if (error) return { ok: false, mensaje: error.message }

    refrescarSitio()
    refrescarAdmin()
    return { ok: true, mensaje: 'Línea actualizada en la web.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al guardar.' }
  }
}

/** Cambia el estado de una solicitud recibida desde la web */
export async function actualizarSolicitud(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  const estado = String(formData.get('estado') ?? '').trim()
  const notas = String(formData.get('notas_internas') ?? '').trim().slice(0, 2000)

  if (!id) return { ok: false, mensaje: 'Solicitud no válida.' }
  if (!['NUEVO', 'EN_PROCESO', 'ATENDIDO', 'DESCARTADO'].includes(estado)) {
    return { ok: false, mensaje: 'Estado no válido.' }
  }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from('sitio_solicitudes')
      .update({ estado, notas_internas: notas || null })
      .eq('id', id)

    if (error) return { ok: false, mensaje: error.message }

    refrescarAdmin()
    return { ok: true, mensaje: 'Solicitud actualizada.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}

/** Borra una solicitud (spam, duplicado) */
export async function eliminarSolicitud(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'Solicitud no válida.' }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('sitio_solicitudes').delete().eq('id', id)
    if (error) return { ok: false, mensaje: error.message }

    refrescarAdmin()
    return { ok: true, mensaje: 'Solicitud eliminada.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}
