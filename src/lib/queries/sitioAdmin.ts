import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { CampoContenido, SolicitudSitio } from '@/types/sitio'

/**
 * Consultas del MODULO ADMINISTRADOR del sitio web (dentro del ERP).
 * A diferencia de queries/sitio.ts, aqui si vemos todo: productos ocultos,
 * lineas sin publicar y las solicitudes que llegan de internet.
 */

export interface ProductoAdminWeb {
  id: string
  codigo: string
  nombre: string
  nombre_web: string
  descripcion: string
  descripcion_web: string
  marca: string
  ficha: string
  slug: string
  imagen_url: string
  imagenes: string[]
  categoria_id: string | null
  categoria_nombre: string | null
  activo: boolean
  visible_web: boolean
  destacado_web: boolean
  orden_web: number
}

export interface LineaAdminWeb {
  id: string
  nombre: string
  nombre_web: string
  slug: string
  descripcion_web: string
  icono: string
  imagen_url: string
  visible_web: boolean
  orden: number
  total_productos: number
  total_publicados: number
}

export interface ResumenSitio {
  migracionLista: boolean
  productosActivos: number
  productosPublicados: number
  productosSinImagen: number
  productosDestacados: number
  lineasPublicadas: number
  solicitudesNuevas: number
  solicitudesTotal: number
  ultimaEdicionContenido: string | null
}

function texto(valor: unknown): string {
  return valor === null || valor === undefined ? '' : String(valor)
}

/**
 * Comprueba si la migracion 023 ya se ejecuto en Supabase.
 * Si no, el modulo muestra un aviso en vez de fallar.
 */
export async function migracionSitioLista(): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient()
    const [productos, contenido] = await Promise.all([
      supabase.from('productos').select('visible_web').limit(1),
      supabase.from('sitio_contenido').select('clave').limit(1),
    ])
    return !productos.error && !contenido.error
  } catch {
    return false
  }
}

export async function obtenerProductosAdminWeb(): Promise<ProductoAdminWeb[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('productos')
      .select('*, categorias_producto(nombre, nombre_web)')
      .order('nombre', { ascending: true })

    if (error || !data) return []

    return data.map((p) => {
      const cat = p.categorias_producto as { nombre?: string; nombre_web?: string } | null
      return {
        id: String(p.id),
        codigo: texto(p.codigo),
        nombre: texto(p.nombre),
        nombre_web: texto(p.nombre_web),
        descripcion: texto(p.descripcion),
        descripcion_web: texto(p.descripcion_web),
        marca: texto(p.marca),
        ficha: texto(p.ficha),
        slug: texto(p.slug),
        imagen_url: texto(p.imagen_url),
        imagenes: Array.isArray(p.imagenes) ? (p.imagenes as string[]) : [],
        categoria_id: (p.categoria_id as string | null) ?? null,
        categoria_nombre: cat?.nombre_web || cat?.nombre || null,
        activo: Boolean(p.activo),
        visible_web: p.visible_web === undefined ? false : Boolean(p.visible_web),
        destacado_web: Boolean(p.destacado_web),
        orden_web: Number(p.orden_web ?? 0),
      }
    })
  } catch {
    return []
  }
}

export async function obtenerLineasAdminWeb(): Promise<LineaAdminWeb[]> {
  try {
    const supabase = createServerSupabaseClient()
    const [categoriasRes, productosRes] = await Promise.all([
      supabase.from('categorias_producto').select('*').order('orden', { ascending: true }),
      supabase.from('productos').select('categoria_id, activo, visible_web'),
    ])

    const categorias = categoriasRes.data ?? []
    const productos = productosRes.data ?? []

    return categorias.map((c) => {
      const propios = productos.filter((p) => p.categoria_id === c.id)
      return {
        id: String(c.id),
        nombre: texto(c.nombre),
        nombre_web: texto(c.nombre_web),
        slug: texto(c.slug),
        descripcion_web: texto(c.descripcion_web),
        icono: texto(c.icono) || 'caja',
        imagen_url: texto(c.imagen_url),
        visible_web: c.visible_web === undefined ? true : Boolean(c.visible_web),
        orden: Number(c.orden ?? 0),
        total_productos: propios.length,
        total_publicados: propios.filter((p) => p.activo && p.visible_web).length,
      }
    })
  } catch {
    return []
  }
}

export async function obtenerCamposContenido(): Promise<CampoContenido[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('sitio_contenido')
      .select('clave, valor, grupo, etiqueta, ayuda, tipo, orden')
      .order('grupo', { ascending: true })
      .order('orden', { ascending: true })

    if (error || !data) return []

    return data.map((c) => ({
      clave: String(c.clave),
      valor: texto(c.valor),
      grupo: String(c.grupo ?? 'general'),
      etiqueta: String(c.etiqueta ?? c.clave),
      ayuda: (c.ayuda as string | null) ?? null,
      tipo: (c.tipo as CampoContenido['tipo']) ?? 'texto',
      orden: Number(c.orden ?? 0),
    }))
  } catch {
    return []
  }
}

export async function obtenerSolicitudesSitio(): Promise<SolicitudSitio[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('sitio_solicitudes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)

    if (error || !data) return []

    return data.map((s) => ({
      id: String(s.id),
      tipo: s.tipo === 'COTIZACION' ? 'COTIZACION' : 'CONTACTO',
      nombre: texto(s.nombre),
      empresa: (s.empresa as string | null) ?? null,
      nit: (s.nit as string | null) ?? null,
      email: (s.email as string | null) ?? null,
      telefono: (s.telefono as string | null) ?? null,
      ciudad: (s.ciudad as string | null) ?? null,
      mensaje: (s.mensaje as string | null) ?? null,
      items: Array.isArray(s.items) ? s.items : [],
      origen: (s.origen as string | null) ?? null,
      estado: (s.estado as SolicitudSitio['estado']) ?? 'NUEVO',
      notas_internas: (s.notas_internas as string | null) ?? null,
      created_at: texto(s.created_at),
    }))
  } catch {
    return []
  }
}

export async function obtenerResumenSitio(): Promise<ResumenSitio> {
  const vacio: ResumenSitio = {
    migracionLista: false,
    productosActivos: 0,
    productosPublicados: 0,
    productosSinImagen: 0,
    productosDestacados: 0,
    lineasPublicadas: 0,
    solicitudesNuevas: 0,
    solicitudesTotal: 0,
    ultimaEdicionContenido: null,
  }

  try {
    const lista = await migracionSitioLista()
    if (!lista) return vacio

    const supabase = createServerSupabaseClient()
    const [productosRes, categoriasRes, solicitudesRes, contenidoRes] = await Promise.all([
      supabase.from('productos').select('activo, visible_web, destacado_web, imagen_url'),
      supabase.from('categorias_producto').select('visible_web'),
      supabase.from('sitio_solicitudes').select('estado'),
      supabase
        .from('sitio_contenido')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1),
    ])

    const productos = productosRes.data ?? []
    const activos = productos.filter((p) => p.activo)
    const publicados = activos.filter((p) => p.visible_web)
    const solicitudes = solicitudesRes.data ?? []

    return {
      migracionLista: true,
      productosActivos: activos.length,
      productosPublicados: publicados.length,
      productosSinImagen: publicados.filter((p) => !p.imagen_url).length,
      productosDestacados: publicados.filter((p) => p.destacado_web).length,
      lineasPublicadas: (categoriasRes.data ?? []).filter((c) => c.visible_web !== false).length,
      solicitudesNuevas: solicitudes.filter((s) => s.estado === 'NUEVO').length,
      solicitudesTotal: solicitudes.length,
      ultimaEdicionContenido: contenidoRes.data?.[0]?.updated_at
        ? String(contenidoRes.data[0].updated_at)
        : null,
    }
  } catch {
    return vacio
  }
}
