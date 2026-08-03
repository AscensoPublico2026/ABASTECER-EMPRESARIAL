import { createPublicSupabaseClient } from '@/lib/supabase/public'
import type { Contenido, LineaWeb, ProductoWeb } from '@/types/sitio'

/**
 * Consultas del SITIO WEB PUBLICO.
 *
 * Reglas de oro:
 *  - Solo leen las vistas catalogo_web / lineas_web y la tabla sitio_contenido.
 *  - NUNCA fallan: si la base de datos no responde o la migracion 023 aun no
 *    se ejecuto, devuelven listas vacias / contenido vacio y la web sigue
 *    funcionando con los textos por defecto.
 */

const FILAS_CATALOGO =
  'id, slug, codigo, nombre, descripcion, marca, unidad_medida, imagen_url, imagenes, ficha, destacado_web, orden_web, categoria_id, categoria_nombre, categoria_slug, categoria_icono'

function mapearProducto(p: Record<string, unknown>): ProductoWeb {
  return {
    id: String(p.id ?? ''),
    slug: String(p.slug ?? ''),
    codigo: String(p.codigo ?? ''),
    nombre: String(p.nombre ?? ''),
    descripcion: (p.descripcion as string | null) ?? null,
    marca: (p.marca as string | null) ?? null,
    unidad_medida: String(p.unidad_medida ?? 'Unidad'),
    imagen_url: (p.imagen_url as string | null) ?? null,
    imagenes: Array.isArray(p.imagenes) ? (p.imagenes as string[]) : [],
    ficha: (p.ficha as string | null) ?? null,
    destacado_web: Boolean(p.destacado_web),
    orden_web: Number(p.orden_web ?? 0),
    categoria_id: (p.categoria_id as string | null) ?? null,
    categoria_nombre: (p.categoria_nombre as string | null) ?? null,
    categoria_slug: (p.categoria_slug as string | null) ?? null,
    categoria_icono: (p.categoria_icono as string | null) ?? null,
  }
}

/** Todo el contenido editable del sitio, como mapa clave -> valor */
export async function obtenerContenidoSitio(): Promise<Contenido> {
  try {
    const supabase = createPublicSupabaseClient()
    const { data, error } = await supabase.from('sitio_contenido').select('clave, valor')
    if (error || !data) return {}

    const mapa: Contenido = {}
    for (const fila of data) {
      mapa[String(fila.clave)] = fila.valor === null ? '' : String(fila.valor)
    }
    return mapa
  } catch {
    return {}
  }
}

/** Lineas de producto (categorias) visibles en la web */
export async function obtenerLineasWeb(soloConProductos = false): Promise<LineaWeb[]> {
  try {
    const supabase = createPublicSupabaseClient()
    const { data, error } = await supabase
      .from('lineas_web')
      .select('id, nombre, slug, descripcion_web, icono, imagen_url, orden, total_productos')
      .order('orden', { ascending: true })

    if (error || !data) return []

    const lineas: LineaWeb[] = data.map((l) => ({
      id: String(l.id),
      nombre: String(l.nombre),
      slug: String(l.slug ?? ''),
      descripcion_web: (l.descripcion_web as string | null) ?? null,
      icono: String(l.icono ?? 'caja'),
      imagen_url: (l.imagen_url as string | null) ?? null,
      orden: Number(l.orden ?? 0),
      total_productos: Number(l.total_productos ?? 0),
    }))

    return soloConProductos ? lineas.filter((l) => l.total_productos > 0) : lineas
  } catch {
    return []
  }
}

interface FiltrosCatalogo {
  busqueda?: string
  linea?: string
  pagina?: number
  porPagina?: number
}

/** Catalogo publico con busqueda, filtro por linea y paginacion */
export async function buscarCatalogoWeb({
  busqueda = '',
  linea = '',
  pagina = 1,
  porPagina = 24,
}: FiltrosCatalogo): Promise<{ productos: ProductoWeb[]; total: number }> {
  try {
    const supabase = createPublicSupabaseClient()
    let consulta = supabase.from('catalogo_web').select(FILAS_CATALOGO, { count: 'exact' })

    const termino = busqueda.trim()
    if (termino) {
      const patron = `%${termino.replace(/[%,]/g, ' ')}%`
      consulta = consulta.or(
        `nombre.ilike.${patron},descripcion.ilike.${patron},codigo.ilike.${patron},marca.ilike.${patron}`
      )
    }
    if (linea.trim()) {
      consulta = consulta.eq('categoria_slug', linea.trim())
    }

    const desde = Math.max(0, (pagina - 1) * porPagina)

    const { data, error, count } = await consulta
      .order('destacado_web', { ascending: false })
      .order('orden_web', { ascending: true })
      .order('nombre', { ascending: true })
      .range(desde, desde + porPagina - 1)

    if (error || !data) return { productos: [], total: 0 }

    return { productos: data.map(mapearProducto), total: count ?? data.length }
  } catch {
    return { productos: [], total: 0 }
  }
}

/** Productos marcados como destacados para la pagina de inicio */
export async function obtenerDestacadosWeb(limite = 8): Promise<ProductoWeb[]> {
  try {
    const supabase = createPublicSupabaseClient()
    const { data } = await supabase
      .from('catalogo_web')
      .select(FILAS_CATALOGO)
      .eq('destacado_web', true)
      .order('orden_web', { ascending: true })
      .order('nombre', { ascending: true })
      .limit(limite)

    if (data && data.length > 0) return data.map(mapearProducto)

    // Si nadie marco destacados todavia, mostramos los mas recientes
    const { data: recientes } = await supabase
      .from('catalogo_web')
      .select(FILAS_CATALOGO)
      .order('created_at', { ascending: false })
      .limit(limite)

    return (recientes ?? []).map(mapearProducto)
  } catch {
    return []
  }
}

/** Un producto por su slug (ficha de producto) */
export async function obtenerProductoWeb(slug: string): Promise<ProductoWeb | null> {
  try {
    const supabase = createPublicSupabaseClient()
    const { data, error } = await supabase
      .from('catalogo_web')
      .select(FILAS_CATALOGO)
      .eq('slug', slug)
      .maybeSingle()

    if (error || !data) return null
    return mapearProducto(data)
  } catch {
    return null
  }
}

/** Productos de la misma linea, para "tambien te puede interesar" */
export async function obtenerRelacionadosWeb(
  producto: ProductoWeb,
  limite = 4
): Promise<ProductoWeb[]> {
  try {
    const supabase = createPublicSupabaseClient()
    let consulta = supabase.from('catalogo_web').select(FILAS_CATALOGO).neq('id', producto.id)

    if (producto.categoria_id) {
      consulta = consulta.eq('categoria_id', producto.categoria_id)
    }

    const { data } = await consulta.limit(limite)
    return (data ?? []).map(mapearProducto)
  } catch {
    return []
  }
}

/** Todos los slugs publicados (para generar el sitemap) */
export async function obtenerSlugsCatalogo(): Promise<{ slug: string; categoria_slug: string | null }[]> {
  try {
    const supabase = createPublicSupabaseClient()
    const { data } = await supabase
      .from('catalogo_web')
      .select('slug, categoria_slug')
      .order('nombre')
      .limit(5000)
    return (data ?? []).map((p) => ({
      slug: String(p.slug),
      categoria_slug: (p.categoria_slug as string | null) ?? null,
    }))
  } catch {
    return []
  }
}

/** Cuantos productos hay publicados en total */
export async function contarProductosWeb(): Promise<number> {
  try {
    const supabase = createPublicSupabaseClient()
    const { count } = await supabase
      .from('catalogo_web')
      .select('id', { count: 'exact', head: true })
    return count ?? 0
  } catch {
    return 0
  }
}
