/**
 * Tipos y etiquetas del listado de precios.
 *
 * Esta en un archivo aparte del de consultas A PROPOSITO: la tabla es un
 * componente de cliente y necesita el semaforo, pero el archivo de
 * consultas importa createServerSupabaseClient, que solo corre en el
 * servidor. Si el cliente importara de ahi, el build falla con
 * "You're importing a component that needs next/headers".
 */

export type Semaforo =
  | 'BIEN'              // el mejor proveedor esta bajo el costo objetivo
  | 'JUSTO'             // alcanza pero con menos margen del minimo
  | 'APRETADO'          // margen por debajo del 10%
  | 'PIERDE'            // cuesta mas de lo que lo vendo
  | 'SIN_COTIZAR'       // no hay precios de proveedor
  | 'SIN_PRECIO_VENTA'  // falta definir a cuanto lo vendo

export interface FilaListadoPrecios {
  producto_id: string
  codigo: string
  nombre: string
  categoria: string | null
  unidad_medida: string | null
  activo: boolean
  iva_porcentaje: number
  margen_minimo_pct: number
  stock_actual: number

  // Mi venta
  mi_precio_venta: number
  precio_lista: number
  precio_sugerido: number

  // Mi costo
  costo_promedio: number
  /** Por debajo de esto hay que conseguirlo para ganar el margen minimo */
  costo_objetivo: number

  // Las tres opciones de compra
  op1_proveedor: string | null
  op1_precio: number | null
  op1_disponible: boolean
  op1_entrega: string | null
  op1_fecha: string | null
  op2_proveedor: string | null
  op2_precio: number | null
  op2_disponible: boolean
  op2_entrega: string | null
  op3_proveedor: string | null
  op3_precio: number | null
  op3_disponible: boolean
  op3_entrega: string | null
  num_proveedores: number

  // Mercado (competencia)
  mercado_min: number | null
  mercado_promedio: number | null
  mercado_max: number | null
  num_precios_mercado: number

  // Calculados
  margen_mejor_opcion: number | null
  utilidad_por_unidad: number | null
  margen_de_maniobra: number | null
  vs_mercado_pct: number | null
  precio_minimo_con_margen: number | null
  semaforo: Semaforo
  sobre_el_mercado: boolean
  dias_del_precio: number | null
  precio_vencido: boolean
}

/** Etiquetas, colores y explicacion del semaforo, en un solo lugar */
export const SEMAFORO_INFO: Record<Semaforo, {
  etiqueta: string
  explicacion: string
  color: string
  punto: string
  orden: number
}> = {
  PIERDE: {
    etiqueta: 'Pierdes plata',
    explicacion: 'Te cuesta mas de lo que lo vendes. Sube el precio de venta o busca otro proveedor.',
    color: 'bg-red-50 text-red-700 border-red-200',
    punto: 'bg-red-500',
    orden: 1,
  },
  APRETADO: {
    etiqueta: 'Muy apretado',
    explicacion: 'Menos del 10% de margen. Casi no ganas nada, y cualquier flete o descuento te lo come.',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    punto: 'bg-orange-500',
    orden: 2,
  },
  SIN_PRECIO_VENTA: {
    etiqueta: 'Falta tu precio',
    explicacion: 'No has definido a cuanto lo vendes, asi que al cotizar no aparece ningun precio.',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    punto: 'bg-purple-500',
    orden: 3,
  },
  SIN_COTIZAR: {
    etiqueta: 'Sin cotizar',
    explicacion: 'Ningun proveedor tiene precio registrado. No sabes cuanto te costaria conseguirlo.',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    punto: 'bg-gray-400',
    orden: 4,
  },
  JUSTO: {
    etiqueta: 'Justo',
    explicacion: 'Alcanza, pero con menos margen del que te propusiste. Negocia o sube el precio.',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    punto: 'bg-amber-500',
    orden: 5,
  },
  BIEN: {
    etiqueta: 'Bien',
    explicacion: 'El mejor proveedor te lo deja por debajo de tu costo objetivo. Compra y gana tu margen.',
    color: 'bg-green-50 text-green-700 border-green-200',
    punto: 'bg-green-500',
    orden: 6,
  },
}
