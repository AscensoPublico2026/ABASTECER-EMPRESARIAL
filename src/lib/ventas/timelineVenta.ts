import type { EventoTrazabilidad } from '@/lib/queries/analisisVenta'

/**
 * HISTORIA DE UNA VENTA, ARMADA COMO LA LEE UN HUMANO.
 *
 * EL PROBLEMA QUE RESUELVE
 * La lista cruda mostraba la factura de compra y su salida de plata como
 * dos filas separadas, ordenadas solo por fecha. Con tres compras pagadas
 * el mismo dia quedaba asi:
 *
 *   31/07  Factura de compra  DS-2026-001    60.000
 *   31/07  Factura de compra  FCJA1119      234.000
 *   31/07  Salida de plata    FCJA1119      234.000
 *   31/07  Salida de plata    DS-2026-001    60.000
 *
 * Dos problemas: el mismo valor aparecia dos veces (parece que se pago
 * doble) y el orden no emparejaba cada factura con su pago.
 *
 * LA REGLA
 * Si la factura se pago EL MISMO DIA, es una sola cosa: se compro y se
 * pago. Va en UNA fila que dice que quedo pagada.
 *
 * Si se pago OTRO DIA, son dos hechos distintos y hay que verlos aparte:
 * primero fue una cuenta por pagar y despues se pago. Se muestran las dos
 * filas con los dias que pasaron en medio.
 *
 * Si NO se ha pagado, es una cuenta por pagar viva. Se avisa, porque es
 * plata que todavia se debe y no puede pasar inadvertida.
 */

export type EstadoPago =
  | 'PAGADA_MISMO_DIA'
  | 'PAGADA_DESPUES'
  /** La factura esta pagada, pero el pago no quedo ligado a ESTA venta */
  | 'PAGADA'
  | 'POR_PAGAR'

export interface PagoVinculado {
  fecha: string | null
  valor: number
  dias: number
  documento_id: string | null
  concepto: string | null
}

export interface FilaTimeline {
  /** Separador de etapa ("1. Cotizacion", "2. Compras y costos"...) */
  esEtapa: boolean
  etiquetaEtapa?: string
  evento?: EventoTrazabilidad
  /** Solo en facturas de compra y gastos */
  estadoPago?: EstadoPago
  pagos?: PagoVinculado[]
  totalPagado?: number
}

/** Dias calendario entre dos fechas 'YYYY-MM-DD'. 0 si falta alguna. */
function diasEntre(desde: string | null, hasta: string | null): number {
  if (!desde || !hasta) return 0
  const a = new Date(desde + 'T00:00:00')
  const b = new Date(hasta + 'T00:00:00')
  const ms = b.getTime() - a.getTime()
  if (!Number.isFinite(ms)) return 0
  return Math.round(ms / 86400000)
}

function etapa(etiqueta: string): FilaTimeline {
  return { esEtapa: true, etiquetaEtapa: etiqueta }
}

export function construirTimeline(trazabilidad: EventoTrazabilidad[]): FilaTimeline[] {
  const cotizacion = trazabilidad.filter((e) => e.documento_tipo === 'COTIZACION')
  const compras = trazabilidad.filter((e) => e.documento_tipo === 'FACTURA_COMPRA')
  const gastos = trazabilidad.filter((e) => e.documento_tipo === 'GASTO')
  const remisiones = trazabilidad.filter((e) => e.documento_tipo === 'REMISION')
  const facturasVenta = trazabilidad.filter((e) => e.documento_tipo === 'FACTURA_VENTA')
  const cobros = trazabilidad.filter((e) => e.documento_tipo === 'INGRESO_CAJA')

  // Los movimientos de tesoreria (EGRESO_CAJA / INGRESO_CAJA) ya no se
  // muestran en el timeline. Se eliminó el módulo de tesorería: la salida
  // de plata la controla el dueño en su conciliación bancaria en Excel.
  // Si se dejaban, aparecían "Salida de plata" sueltas que confundían.
  const salidas: EventoTrazabilidad[] = []

  const filas: FilaTimeline[] = []

  // ---------- 1. Cotizacion ----------
  if (cotizacion.length > 0) {
    filas.push(etapa('1. La venta'))
    for (const c of cotizacion) filas.push({ esEtapa: false, evento: c })
  }

  // ---------- 2. El cobro al cliente ----------
  // Va aqui arriba, no al final: en el flujo de contado el cliente paga
  // ANTES de que se compre la mercancia, y esconderlo al final hacia
  // parecer que la plata entro despues de gastarla.
  if (cobros.length > 0) {
    filas.push(etapa('2. Lo que pago el cliente'))
    for (const c of cobros) filas.push({ esEtapa: false, evento: c })
  }

  // ---------- 3. Compras y gastos, cada uno con su pago ----------
  const docsCosto = [...compras, ...gastos].sort((a, b) => {
    const fa = a.documento_fecha ?? ''
    const fb = b.documento_fecha ?? ''
    if (fa !== fb) return fa < fb ? -1 : 1
    return (a.documento_numero ?? '').localeCompare(b.documento_numero ?? '')
  })

  if (docsCosto.length > 0) {
    filas.push(etapa('3. Lo que costo (compras y gastos)'))

    const salidasDisponibles = [...salidas]

    for (const doc of docsCosto) {
      const numero = (doc.documento_numero ?? '').trim().toUpperCase()

      // Todos los pagos que mencionan ese numero de factura.
      // Se buscan TODOS y no solo el primero, para que una factura pagada
      // en dos abonos quede bien reflejada.
      const pagos: PagoVinculado[] = []
      if (numero) {
        for (let i = salidasDisponibles.length - 1; i >= 0; i--) {
          const s = salidasDisponibles[i]
          if ((s.documento_numero ?? '').toUpperCase().includes(numero)) {
            pagos.unshift({
              fecha: s.documento_fecha,
              valor: s.valor ?? 0,
              dias: diasEntre(doc.documento_fecha, s.documento_fecha),
              documento_id: s.documento_id,
              concepto: s.documento_numero,
            })
            salidasDisponibles.splice(i, 1)
          }
        }
      }
      pagos.sort((a, b) => (a.fecha ?? '') < (b.fecha ?? '') ? -1 : 1)

      const totalPagado = pagos.reduce((s, p) => s + p.valor, 0)
      const todosMismoDia = pagos.length > 0 && pagos.every((p) => p.dias === 0)

      /**
       * DE DONDE SALE EL ESTADO DE PAGO.
       *
       * ANTES estaba MAL: se deducia de si encontrabamos el movimiento de
       * tesoreria dentro de esta venta. Si no aparecia, se marcaba
       * "POR PAGAR". Eso daba ALARMAS FALSAS.
       *
       * Por que: una compra se puede repartir entre VARIAS ventas
       * (asignacion_costos), pero el movimiento de tesoreria solo puede
       * apuntar a UNA cotizacion (registrarFacturaCompra usa
       * cotizacionesAfectadas[0] y registrarPagoFacturaCompra usa
       * .limit(1)). Entonces, en las demas ventas de esa misma compra el
       * pago no aparece, y el informe decia "POR PAGAR" una factura que
       * el usuario ya habia pagado de contado.
       *
       * AHORA la fuente de verdad es el estado de la factura, que es el
       * dato autoritativo: la vista trae fc.estado (PAGADA / REGISTRADA /
       * ANULADA) en la columna estado. El movimiento solo se usa para
       * enriquecer con la FECHA del pago cuando si esta ligado.
       *
       * OJO con los gastos: para ellos la vista trae DEDUCIBLE /
       * NO DEDUCIBLE en esa misma columna, que no es un estado de pago. Un
       * gasto se registra cuando ya se pago, asi que no lleva etiqueta.
       */
      const esFacturaCompra = doc.documento_tipo === 'FACTURA_COMPRA'
      const estadoDelDocumento = String(doc.estado ?? '').toUpperCase()

      let estadoPago: EstadoPago | undefined
      if (!esFacturaCompra) {
        estadoPago = undefined
      } else if (estadoDelDocumento === 'REGISTRADA') {
        estadoPago = 'POR_PAGAR'
      } else if (pagos.length === 0) {
        // La factura dice PAGADA pero el movimiento quedo ligado a otra
        // venta de la misma compra. Esta pagada: no es cuenta por pagar.
        estadoPago = 'PAGADA'
      } else if (todosMismoDia) {
        estadoPago = 'PAGADA_MISMO_DIA'
      } else {
        estadoPago = 'PAGADA_DESPUES'
      }

      filas.push({ esEtapa: false, evento: doc, estadoPago, pagos, totalPagado })

      // Solo cuando el pago fue en OTRA fecha se muestra como fila aparte.
      // Si fue el mismo dia ya quedo dicho en la fila de la factura, y
      // repetirlo hacia ver el mismo valor dos veces.
      if (estadoPago === 'PAGADA_DESPUES') {
        for (const p of pagos) {
          const original = salidas.find((s) => s.documento_id === p.documento_id)
          if (original) filas.push({ esEtapa: false, evento: original })
        }
      }
    }

    // Pagos que no se pudieron emparejar con ningun documento
    for (const p of salidasDisponibles) {
      filas.push({ esEtapa: false, evento: p })
    }
  }

  // ---------- 4. Entrega ----------
  if (remisiones.length > 0) {
    filas.push(etapa('4. Entrega'))
    for (const r of remisiones) filas.push({ esEtapa: false, evento: r })
  }

  // ---------- 5. Facturacion ----------
  if (facturasVenta.length > 0) {
    filas.push(etapa('5. Facturacion al cliente'))
    for (const f of facturasVenta) filas.push({ esEtapa: false, evento: f })
  }

  return filas
}

/** Texto corto del estado de pago, para mostrar al lado del documento. */
export function textoEstadoPago(fila: FilaTimeline): string | null {
  if (!fila.estadoPago) return null
  const pagos = fila.pagos ?? []

  if (fila.estadoPago === 'PAGADA_MISMO_DIA') {
    return 'Pagada el mismo dia'
  }
  if (fila.estadoPago === 'PAGADA_DESPUES') {
    const dias = Math.max(...pagos.map((p) => p.dias))
    if (pagos.length > 1) return `Pagada en ${pagos.length} abonos`
    return `A credito, pagada ${dias} dia${dias !== 1 ? 's' : ''} despues`
  }
  if (fila.estadoPago === 'PAGADA') {
    // El pago existe pero quedo ligado a otra venta de la misma compra
    return 'Pagada'
  }
  return 'POR PAGAR'
}

/** true si en esta venta hay compras que de verdad estan sin pagar */
export function hayComprasPorPagar(filas: FilaTimeline[]): boolean {
  return filas.some((f) => f.estadoPago === 'POR_PAGAR')
}

/**
 * true si alguna compra aparece como "Pagada" sin el detalle del pago.
 * Sirve para explicarle al usuario por que no ve la fecha: esa compra se
 * repartio entre varias ventas y el movimiento quedo ligado a otra.
 */
export function hayPagosEnOtraVenta(filas: FilaTimeline[]): boolean {
  return filas.some((f) => f.estadoPago === 'PAGADA')
}
