import type { AnalisisVenta, AnalisisItem } from '@/lib/queries/analisisVenta'

/**
 * LOS TOTALES DE LA TABLA DE PRODUCTOS, EN UN SOLO LUGAR.
 *
 * POR QUE EXISTE ESTE ARCHIVO
 *
 * La fila TOTAL de la tabla de productos mostraba analisis.costo_real y
 * analisis.utilidad_bruta. Esos dos campos incluyen los GASTOS de la venta
 * (el flete, el domicilio). Las filas de arriba, en cambio, solo tienen el
 * costo de los productos.
 *
 * Resultado: una tabla cuyo total no cuadraba con sus propias filas.
 *
 *   filas:   115.000 + 1.140.000 + 36.000 = 1.291.000
 *   TOTAL mostrado:                         1.306.000   <-- 15.000 de mas
 *
 * Los 15.000 eran el flete repartido. Esta bien que entren al costo de la
 * venta, pero NO pueden aparecer sumados en el total de una tabla de
 * productos sin un renglon que diga de donde salieron. El dueno sumo con
 * calculadora, no le dio, y con razon dejo de confiar en la plataforma.
 *
 * Estamos hablando de plata. La regla es: todo total tiene que poder
 * verificarse sumando lo que esta a la vista.
 *
 * Se calcula aca y no en cada pantalla para que el panel en vivo y el
 * informe imprimible no puedan dar numeros distintos, igual que se hizo con
 * construirTimeline.
 */
export interface TotalesVenta {
  /** Suma exacta de las filas de productos */
  sumaCostoItems: number
  sumaVentaItems: number
  sumaUtilidadItems: number
  margenItems: number

  /**
   * Costo de compra que no aterrizo en ningun producto de la cotizacion.
   *
   * Pasa cuando una factura de compra se asigna a un producto que no esta
   * en la venta: se compro el kit PRD-0013 y se vendio PRD-0017 + PRD-0018
   * por separado. El costo esta en la venta pero no en ningun producto, asi
   * que los margenes por producto salen inflados.
   */
  costoQueNoAterriza: number
  hayCostoHuerfano: boolean

  /**
   * Si esto es mayor a 1, la suma de lo visible no da el costo total de la
   * vista. Es un bug y hay que avisarlo antes de que alguien decida algo
   * con esos numeros.
   */
  descuadreCosto: number
  hayDescuadre: boolean
}

export function calcularTotalesVenta(a: AnalisisVenta, items: AnalisisItem[]): TotalesVenta {
  const sumaCostoItems = items.reduce((s, it) => s + it.costo_subtotal, 0)
  const sumaVentaItems = items.reduce((s, it) => s + it.venta_subtotal, 0)
  const sumaUtilidadItems = sumaVentaItems - sumaCostoItems
  const margenItems = sumaVentaItems > 0 ? (sumaUtilidadItems / sumaVentaItems) * 100 : 0

  const costoQueNoAterriza = a.costo_compras - sumaCostoItems
  const hayCostoHuerfano = Math.abs(costoQueNoAterriza) > 1

  // Todo lo que se muestra en la tabla contra el costo total de la vista
  const descuadreCosto = Math.abs(
    (sumaCostoItems + costoQueNoAterriza + a.costo_gastos) - a.costo_real,
  )

  return {
    sumaCostoItems,
    sumaVentaItems,
    sumaUtilidadItems,
    margenItems,
    costoQueNoAterriza,
    hayCostoHuerfano,
    descuadreCosto,
    hayDescuadre: descuadreCosto > 1,
  }
}
