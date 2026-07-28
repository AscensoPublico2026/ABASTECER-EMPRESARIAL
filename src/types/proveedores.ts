// ============================================================
// Tipos del modulo Proveedores
// ============================================================

export type EstadoProveedor = 'ACTIVO' | 'INACTIVO' | 'EN_EVALUACION'

export const ESTADOS_PROVEEDOR: Record<EstadoProveedor, { etiqueta: string; color: string }> = {
  ACTIVO: { etiqueta: 'Activo', color: 'bg-green-50 text-green-700 border-green-200' },
  INACTIVO: { etiqueta: 'Inactivo', color: 'bg-gray-50 text-gray-600 border-gray-200' },
  EN_EVALUACION: { etiqueta: 'En evaluacion', color: 'bg-amber-50 text-amber-700 border-amber-200' },
}

export interface Proveedor {
  id: string
  razon_social: string
  nit: string | null
  nombre_comercial: string | null
  contacto_nombre: string | null
  contacto_telefono: string | null
  contacto_email: string | null
  contacto_cargo: string | null
  direccion: string | null
  ciudad: string | null
  departamento: string | null
  categorias: string[]
  condiciones_pago: string | null
  dias_credito: number
  descuento_volumen: string | null
  tiempo_entrega: string | null
  pedido_minimo: number | null
  banco: string | null
  tipo_cuenta: string | null
  numero_cuenta: string | null
  estado: EstadoProveedor
  calificacion: number
  notas: string | null
  created_at: string
  updated_at: string
}

export const CATEGORIAS_DISPONIBLES = [
  'EPP',
  'Dotacion',
  'Aseo',
  'Cafeteria',
  'Papeleria',
  'Identificacion',
  'Extintores',
  'Senalizacion',
  'Ferreteria',
  'Tecnologia',
  'Material electrico',
  'Otro',
] as const
