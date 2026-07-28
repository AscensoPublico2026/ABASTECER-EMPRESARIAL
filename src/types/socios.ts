// ============================================================
// Tipos del modulo Socios y Capital
// ============================================================

/**
 * Tipos de movimiento entre la empresa y un socio.
 * Politica #011 (Retiro Clasificado): todo movimiento debe tener un tipo.
 */
export type TipoMovimiento =
  | 'APORTE_CAPITAL'
  | 'PRESTAMO_SOCIO'
  | 'DEVOLUCION_PRESTAMO'
  | 'DIVIDENDO'
  | 'REMUNERACION'
  | 'REEMBOLSO'

/** Direccion del flujo de dinero */
export type DireccionFlujo = 'ENTRA' | 'SALE'

export interface MetaMovimiento {
  tipo: TipoMovimiento
  etiqueta: string
  descripcion: string
  direccion: DireccionFlujo
  /** Si suma al capital social de la empresa */
  afectaCapital: boolean
  /** Clase de color Tailwind para el badge */
  color: string
}

/**
 * Catalogo de tipos de movimiento con su significado de negocio.
 * Esto codifica la Politica #011 y la separacion de "los tres sombreros".
 */
export const TIPOS_MOVIMIENTO: Record<TipoMovimiento, MetaMovimiento> = {
  APORTE_CAPITAL: {
    tipo: 'APORTE_CAPITAL',
    etiqueta: 'Aporte de capital',
    descripcion:
      'El socio invierte dinero de forma permanente. Suma al capital social y no se devuelve.',
    direccion: 'ENTRA',
    afectaCapital: true,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  PRESTAMO_SOCIO: {
    tipo: 'PRESTAMO_SOCIO',
    etiqueta: 'Prestamo del socio',
    descripcion:
      'El socio presta dinero a la empresa. No cambia su participacion y la empresa se lo debe devolver.',
    direccion: 'ENTRA',
    afectaCapital: false,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  DEVOLUCION_PRESTAMO: {
    tipo: 'DEVOLUCION_PRESTAMO',
    etiqueta: 'Devolucion de prestamo',
    descripcion: 'La empresa devuelve al socio un dinero que le habia prestado.',
    direccion: 'SALE',
    afectaCapital: false,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  DIVIDENDO: {
    tipo: 'DIVIDENDO',
    etiqueta: 'Dividendo',
    descripcion:
      'Reparto de utilidades segun participacion. Solo cuando el semaforo financiero este en verde.',
    direccion: 'SALE',
    afectaCapital: false,
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  REMUNERACION: {
    tipo: 'REMUNERACION',
    etiqueta: 'Remuneracion por trabajo',
    descripcion:
      'Pago por el trabajo realizado (sombrero de trabajador). Independiente de ser dueno.',
    direccion: 'SALE',
    afectaCapital: false,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  REEMBOLSO: {
    tipo: 'REEMBOLSO',
    etiqueta: 'Reembolso de gasto',
    descripcion:
      'La empresa devuelve un gasto empresarial que el socio pago de su bolsillo. Requiere soporte.',
    direccion: 'SALE',
    afectaCapital: false,
    color: 'bg-slate-50 text-slate-700 border-slate-200',
  },
}

export const LISTA_TIPOS_MOVIMIENTO: MetaMovimiento[] =
  Object.values(TIPOS_MOVIMIENTO)

export interface Socio {
  id: string
  nombre: string
  documento: string | null
  email: string | null
  telefono: string | null
  cargo: string | null
  participacion_pct: number
  activo: boolean
  notas: string | null
  created_at: string
  updated_at: string
}

export interface MovimientoSocio {
  id: string
  socio_id: string
  tipo: TipoMovimiento
  monto: number
  fecha: string
  descripcion: string | null
  soporte_url: string | null
  created_at: string
}

/** Movimiento con el nombre del socio resuelto, para tablas */
export interface MovimientoConSocio extends MovimientoSocio {
  socio_nombre: string
}

/** Fila de la vista resumen_socios */
export interface ResumenSocio {
  id: string
  nombre: string
  cargo: string | null
  participacion_pct: number
  activo: boolean
  capital_aportado: number
  prestamos_otorgados: number
  prestamos_devueltos: number
  prestamo_pendiente: number
  dividendos_recibidos: number
  remuneracion_total: number
  reembolsos_total: number
}

/** Totales consolidados de la empresa */
export interface TotalesCapital {
  capitalSocial: number
  prestamosPendientes: number
  dividendosPagados: number
  remuneracionesPagadas: number
  reembolsosPagados: number
  totalAportadoPorSocios: number
  numeroSocios: number
}

/** Resultado de cargar los datos del modulo */
export interface DatosSocios {
  configurado: boolean
  error: string | null
  socios: ResumenSocio[]
  movimientos: MovimientoConSocio[]
  totales: TotalesCapital
}
