// ============================================================
// Tipos del modulo Clientes
// ============================================================

export type EstadoCliente = 'PROSPECTO' | 'ACTIVO' | 'CREDITO_APROBADO' | 'INACTIVO' | 'MOROSO'

export const ESTADOS_CLIENTE: Record<EstadoCliente, { etiqueta: string; color: string }> = {
  PROSPECTO: { etiqueta: 'Prospecto', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ACTIVO: { etiqueta: 'Activo', color: 'bg-green-50 text-green-700 border-green-200' },
  CREDITO_APROBADO: { etiqueta: 'Credito aprobado', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  INACTIVO: { etiqueta: 'Inactivo', color: 'bg-gray-50 text-gray-600 border-gray-200' },
  MOROSO: { etiqueta: 'Moroso', color: 'bg-red-50 text-red-700 border-red-200' },
}

export type TamanoEmpresa = 'MICRO' | 'PEQUENA' | 'MEDIANA' | 'GRANDE'

export const TAMANOS_EMPRESA: Record<TamanoEmpresa, string> = {
  MICRO: 'Micro (1-10 empleados)',
  PEQUENA: 'Pequena (11-50)',
  MEDIANA: 'Mediana (51-200)',
  GRANDE: 'Grande (200+)',
}

export interface Cliente {
  id: string
  razon_social: string
  nit: string | null
  nombre_comercial: string | null
  contacto_nombre: string | null
  contacto_telefono: string | null
  contacto_email: string | null
  contacto_cargo: string | null
  contacto_pagos_nombre: string | null
  contacto_pagos_telefono: string | null
  contacto_pagos_email: string | null
  direccion_entrega: string | null
  ciudad: string | null
  departamento: string | null
  sector: string | null
  tamano: TamanoEmpresa | null
  categorias_interes: string[]
  tiene_credito: boolean
  dias_credito: number
  cupo_credito: number
  estado: EstadoCliente
  origen: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export const SECTORES = [
  'Construccion',
  'Industria',
  'Ingenieria',
  'Logistica',
  'Transporte',
  'Salud (IPS/Clinica)',
  'Educacion',
  'Call center',
  'Seguridad',
  'Hoteleria',
  'Restaurantes',
  'Gobierno',
  'Servicios',
  'Comercio',
  'Otro',
] as const
