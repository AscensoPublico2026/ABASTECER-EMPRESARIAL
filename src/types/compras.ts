// ============================================================
// Tipos del modulo Compras
// ============================================================

export type EstadoCompra = 'PAGADA' | 'POR_PAGAR' | 'VENCIDA' | 'ANULADA'

export const ESTADOS_COMPRA: Record<EstadoCompra, { etiqueta: string; color: string }> = {
  PAGADA: { etiqueta: 'Pagada', color: 'bg-green-50 text-green-700 border-green-200' },
  POR_PAGAR: { etiqueta: 'Por pagar', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  VENCIDA: { etiqueta: 'Vencida', color: 'bg-red-50 text-red-700 border-red-200' },
  ANULADA: { etiqueta: 'Anulada', color: 'bg-gray-50 text-gray-500 border-gray-200' },
}

export interface CompraItem {
  id: string
  compra_id: string
  producto_id: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
  iva_porcentaje: number
  iva_valor: number
  subtotal: number
  total: number
}

export interface Compra {
  id: string
  proveedor_id: string | null
  numero_factura: string | null
  fecha: string
  subtotal: number
  iva_total: number
  retencion_total: number
  total: number
  forma_pago: string
  dias_credito: number
  fecha_vencimiento: string | null
  estado: EstadoCompra
  soporte_url: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface ResumenCompra {
  id: string
  fecha: string
  numero_factura: string | null
  subtotal: number
  iva_total: number
  total: number
  forma_pago: string
  estado: EstadoCompra
  dias_credito: number
  fecha_vencimiento: string | null
  proveedor_nombre: string | null
  proveedor_nit: string | null
  num_items: number
}

export interface ItemFormulario {
  descripcion: string
  cantidad: string
  precio_unitario: string
  iva_porcentaje: string
}

export interface Producto {
  id: string
  nombre: string
  categoria: string | null
  unidad_medida: string
  iva_porcentaje: number
  margen_minimo_pct: number
  precio_sugerido: number | null
  activo: boolean
}
