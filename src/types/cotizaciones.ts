// ============================================================
// Tipos del modulo Cotizaciones
// ============================================================

export type EstadoCotizacion = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'VENCIDA' | 'FACTURADA'

export const ESTADOS_COTIZACION: Record<EstadoCotizacion, { etiqueta: string; color: string }> = {
  PENDIENTE: { etiqueta: 'Pendiente', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  APROBADA: { etiqueta: 'Aprobada', color: 'bg-green-50 text-green-700 border-green-200' },
  RECHAZADA: { etiqueta: 'Rechazada', color: 'bg-red-50 text-red-700 border-red-200' },
  VENCIDA: { etiqueta: 'Vencida', color: 'bg-gray-50 text-gray-600 border-gray-200' },
  FACTURADA: { etiqueta: 'Facturada', color: 'bg-purple-50 text-purple-700 border-purple-200' },
}

export interface Cotizacion {
  id: string
  numero: string
  cliente_id: string | null
  fecha: string
  fecha_validez: string | null
  subtotal: number
  iva_total: number
  total: number
  costo_total: number
  utilidad_estimada: number
  margen_pct: number
  estado: EstadoCotizacion
  oc_cliente: string | null
  oc_cliente_url: string | null
  forma_pago: string
  dias_credito: number
  descuento_pct: number
  observaciones: string | null
  created_at: string
}

export interface CotizacionConCliente extends Cotizacion {
  cliente_nombre: string | null
  num_items: number
  creado_por_nombre: string | null
}

export interface CotizacionItem {
  id: string
  cotizacion_id: string
  producto_id: string | null
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
