// ============================================================
// Tipos del modulo Facturas de Venta (ventas cerradas)
// ============================================================

export type EstadoFacturaVenta = 'EMITIDA' | 'COBRADA' | 'PARCIAL' | 'ANULADA'

export const ESTADOS_FACTURA_VENTA: Record<EstadoFacturaVenta, { etiqueta: string; color: string }> = {
  EMITIDA: { etiqueta: 'Por cobrar', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  COBRADA: { etiqueta: 'Cobrada', color: 'bg-green-50 text-green-700 border-green-200' },
  PARCIAL: { etiqueta: 'Pago parcial', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  ANULADA: { etiqueta: 'Anulada', color: 'bg-red-50 text-red-700 border-red-200' },
}

export interface FacturaVenta {
  id: string
  cotizacion_id: string | null
  cliente_id: string | null
  numero_factura_dian: string | null
  fecha: string
  fecha_vencimiento: string | null
  subtotal: number
  iva_total: number
  retencion_total: number
  total: number
  costo_total: number
  utilidad: number
  margen_pct: number
  forma_pago: string
  dias_credito: number
  estado: EstadoFacturaVenta
  oc_cliente: string | null
  oc_cliente_url: string | null
  notas: string | null
  created_at: string
}

export interface FacturaVentaConCliente extends FacturaVenta {
  cliente_nombre: string | null
  numero_cotizacion: string | null
  creado_por_nombre: string | null
}
