// ============================================================
// Tipos del Catalogo de Productos v2
// ============================================================

export interface Categoria {
  id: string
  nombre: string
  orden: number
}

export interface Producto {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  categoria_id: string | null
  categoria_nombre?: string | null
  unidad_medida: string
  iva_porcentaje: number
  costo_promedio: number
  ultimo_costo: number
  margen_minimo_pct: number
  precio_sugerido: number
  precio_lista: number
  stock_actual: number
  stock_minimo: number
  activo: boolean
  notas: string | null
  created_at: string
  updated_at: string
}

export interface NombreProveedor {
  id: string
  producto_id: string
  proveedor_id: string
  nombre_proveedor: string
  ref_proveedor: string | null
  proveedor_nombre?: string
}

export interface PrecioCliente {
  id: string
  producto_id: string
  cliente_id: string
  precio: number
  notas: string | null
  cliente_nombre?: string
}

export interface ProductoConRelaciones extends Producto {
  nombres_proveedor: NombreProveedor[]
  precios_cliente: PrecioCliente[]
}

export const UNIDADES_MEDIDA = [
  'Unidad',
  'Par',
  'Caja',
  'Paquete',
  'Rollo',
  'Galon',
  'Litro',
  'Kilogramo',
  'Metro',
  'Bolsa',
] as const

export const IVA_OPCIONES = [
  { valor: 19, etiqueta: '19% (general)' },
  { valor: 5, etiqueta: '5% (reducido)' },
  { valor: 0, etiqueta: '0% (exento/excluido)' },
] as const
