// ============================================================
// Tipos del Sitio Web Publico - abastecerempresarial.com
// ============================================================

/** Producto tal como lo ve internet (vista catalogo_web: sin costos ni stock) */
export interface ProductoWeb {
  id: string
  slug: string
  codigo: string
  nombre: string
  descripcion: string | null
  marca: string | null
  unidad_medida: string
  imagen_url: string | null
  imagenes: string[]
  ficha: string | null
  destacado_web: boolean
  orden_web: number
  categoria_id: string | null
  categoria_nombre: string | null
  categoria_slug: string | null
  categoria_icono: string | null
}

/** Linea de producto = categoria visible en la web (vista lineas_web) */
export interface LineaWeb {
  id: string
  nombre: string
  slug: string
  descripcion_web: string | null
  icono: string
  imagen_url: string | null
  orden: number
  total_productos: number
}

/** Un campo editable del sitio (tabla sitio_contenido) */
export interface CampoContenido {
  clave: string
  valor: string
  grupo: string
  etiqueta: string
  ayuda: string | null
  tipo: 'texto' | 'texto_largo' | 'lista' | 'url' | 'imagen' | 'telefono' | 'email'
  orden: number
}

/** Mapa clave -> valor con todo el contenido del sitio */
export type Contenido = Record<string, string>

/** Item de la lista de cotizacion que arma el cliente en la web */
export interface ItemCotizacion {
  id: string
  slug: string
  codigo: string
  nombre: string
  unidad_medida: string
  cantidad: number
}

/** Solicitud recibida desde la web */
export interface SolicitudSitio {
  id: string
  tipo: 'CONTACTO' | 'COTIZACION'
  nombre: string
  empresa: string | null
  nit: string | null
  email: string | null
  telefono: string | null
  ciudad: string | null
  mensaje: string | null
  items: { nombre: string; codigo?: string; cantidad?: number; unidad_medida?: string }[]
  origen: string | null
  estado: 'NUEVO' | 'EN_PROCESO' | 'ATENDIDO' | 'DESCARTADO'
  notas_internas: string | null
  created_at: string
}

export const ESTADOS_SOLICITUD = [
  { valor: 'NUEVO', etiqueta: 'Nueva', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { valor: 'EN_PROCESO', etiqueta: 'En proceso', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { valor: 'ATENDIDO', etiqueta: 'Atendida', color: 'bg-green-50 text-green-700 border-green-200' },
  { valor: 'DESCARTADO', etiqueta: 'Descartada', color: 'bg-gray-50 text-gray-500 border-gray-200' },
] as const

/** Iconos disponibles para lineas, beneficios, valores y sectores */
export const ICONOS_SITIO = [
  'casco', 'guantes', 'gafas', 'botas', 'camiseta', 'escoba', 'cafe', 'papel',
  'tarjeta', 'extintor', 'senal', 'llave', 'portatil', 'rayo', 'caja',
  'escudo', 'medalla', 'manos', 'camion', 'reloj', 'factura', 'estrella',
  'usuarios', 'ojo', 'mapa', 'fabrica', 'hospital', 'tienda', 'edificio',
  'tractor', 'telefono', 'correo', 'check', 'rayo-accion',
] as const

export type IconoSitio = (typeof ICONOS_SITIO)[number]
