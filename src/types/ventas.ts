// ============================================================
// Tipos del modulo Ventas
// ============================================================

export type EstadoVenta = 'COTIZACION' | 'APROBADA' | 'FACTURADA' | 'COBRADA' | 'ANULADA'

export const ESTADOS_VENTA: Record<EstadoVenta, { etiqueta: string; color: string }> = {
  COTIZACION: { etiqueta: 'Cotizacion', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  APROBADA: { etiqueta: 'Aprobada', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  FACTURADA: { etiqueta: 'Facturada', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  COBRADA: { etiqueta: 'Cobrada', color: 'bg-green-50 text-green-700 border-green-200' },
  ANULADA: { etiqueta: 'Anulada', color: 'bg-gray-50 text-gray-500 border-gray-200' },
}

export interface VentaItem {
  id: string
  venta_id: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  costo_unitario: number
  iva_porcentaje: number
  iva_valor: number
  subtotal: number
  total: number
  utilidad: number
}

export interface Venta {
  id: string
  cliente_id: string | null
  numero_cotizacion: string | null
  numero_factura: string | null
  fecha: string
  subtotal: number
  iva_total: number
  total: number
  costo_total: number
  utilidad_bruta: number
  margen_pct: number
  forma_pago: string
  dias_credito: number
  fecha_vencimiento: string | null
  estado: EstadoVenta
  notas: string | null
  created_at: string
}

export interface ResumenVenta {
  id: string
  fecha: string
  numero_cotizacion: string | null
  numero_factura: string | null
  subtotal: number
  iva_total: number
  total: number
  costo_total: number
  utilidad_bruta: number
  margen_pct: number
  forma_pago: string
  estado: EstadoVenta
  dias_credito: number
  fecha_vencimiento: string | null
  cliente_nombre: string | null
  num_items: number
}
