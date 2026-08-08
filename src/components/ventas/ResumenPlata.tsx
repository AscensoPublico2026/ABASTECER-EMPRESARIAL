import type { AnalisisVenta } from '@/lib/queries/analisisVenta'
import { formatCOP } from '@/lib/format'

/**
 * LA CASCADA DE LA PLATA.
 *
 * Es el resumen que responde la unica pregunta que de verdad importa:
 * "de esta venta, cuanto me quedo a mi?"
 *
 * POR QUE EXISTE:
 * El panel de analisis estaba armado como para un contador: bolsillos,
 * margenes, multiplicadores, IVA neto. El dueno y su socia no lo
 * entendian. Esta cascada usa una sola idea: seguir la plata desde que
 * entra hasta lo que queda, linea por linea, en lenguaje de todos los
 * dias.
 *
 * Y CUADRA: el resultado da exactamente igual que utilidad_neta, que es
 * el mismo numero por el camino contable. Verificado con la COT-2026-012:
 *
 *   1.486.720 - 656.639 - 113.361 - 93.359 - 64.000 = 559.361
 *   (venta sin IVA 1.280.000 - costo 656.639 - simple 64.000 = 559.361)
 *
 * EL 4x1000 NO VA EN ESTE INFORME (decision del dueno, y es la correcta):
 * el 4x1000 no lo causa la venta, lo causa CUANTAS transferencias hiciste
 * para pagarla. Dos ventas identicas pueden tener 4x1000 distinto solo
 * porque una se pago en un giro y la otra en tres. Meterlo aqui ensucia la
 * comparacion de rentabilidad entre ventas.
 *
 * Sigue calculandose y afectando el saldo en TESORERIA, que es donde de
 * verdad importa: ahi si sale plata del banco. Se ve como gasto operativo
 * en el Centro Financiero.
 */
export default function ResumenPlata({ analisis: a }: { analisis: AnalisisVenta }) {
  // Si la venta todavia no se ha cobrado, la cascada es una PROYECCION.
  // Hay que decirlo, porque si no el usuario cree que ya tiene la plata.
  const yaCobrado = a.monto_recibido > 0
  const entrada = yaCobrado
    ? a.monto_recibido
    : a.venta_total - a.retenciones

  const pagadoMercancia = a.costo_real
  const pagadoIvaCompras = a.iva_pagado
  const guardarIva = a.iva_neto_dian
  const guardarSimple = a.impuesto_simple_pendiente

  // El 4x1000 NO entra aqui a proposito. Ver la nota del encabezado.
  const queda = entrada - pagadoMercancia - pagadoIvaCompras - guardarIva - guardarSimple
  const pctSobreVenta = a.venta_subtotal > 0 ? (queda / a.venta_subtotal) * 100 : 0

  const lineas: { texto: string; detalle?: string; valor: number; signo: '+' | '-' }[] = [
    {
      texto: yaCobrado ? 'El cliente me pago' : 'El cliente me va a pagar',
      detalle: a.retenciones > 0
        ? `Facture ${formatCOP(a.venta_total)} y me retuvo ${formatCOP(a.retenciones)} que ya estan en la DIAN`
        : `Factura por ${formatCOP(a.venta_total)}`,
      valor: entrada,
      signo: '+',
    },
    {
      texto: 'Pague la mercancia y los gastos',
      detalle: a.num_facturas_compra > 0
        ? `${a.num_facturas_compra} factura${a.num_facturas_compra !== 1 ? 's' : ''} de compra${a.num_gastos > 0 ? ` y ${a.num_gastos} gasto${a.num_gastos !== 1 ? 's' : ''}` : ''}`
        : 'Sin compras registradas todavia',
      valor: pagadoMercancia,
      signo: '-',
    },
    {
      texto: 'Pague el IVA de esas compras',
      detalle: 'Esta plata la recupero: baja lo que le debo de IVA a la DIAN',
      valor: pagadoIvaCompras,
      signo: '-',
    },
    {
      texto: 'Tengo que guardar para el IVA',
      detalle: 'No es mio, es de la DIAN. Se paga cada dos meses',
      valor: guardarIva,
      signo: '-',
    },
    {
      texto: 'Tengo que guardar para el Impuesto Simple',
      detalle: 'El 5% de la venta. Sale de mi ganancia',
      valor: guardarSimple,
      signo: '-',
    },
  ]

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-900 overflow-hidden print:border print:rounded-none">
      <div className="px-5 py-4 bg-gray-900 text-white">
        <h3 className="font-bold text-base">De esta venta, ¿cuanto me quedo a mi?</h3>
        <p className="text-xs text-gray-300 mt-0.5">
          Sigue la plata paso a paso. Cada linea se resta de la de arriba.
        </p>
      </div>

      {!yaCobrado && (
        <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200">
          <p className="text-xs text-amber-900">
            <strong>Ojo:</strong> esta venta todavia no se ha cobrado. Los numeros de abajo
            son lo que va a pasar cuando el cliente pague.
          </p>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {lineas.map((l, i) => (
          <div key={i} className="px-5 py-3 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">
                {i + 1}. {l.texto}
              </p>
              {l.detalle && (
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{l.detalle}</p>
              )}
            </div>
            <div className={`text-base font-semibold tabular-nums whitespace-nowrap ${
              l.signo === '+' ? 'text-gray-900' : 'text-red-600'
            }`}>
              {l.signo === '-' && l.valor > 0 ? '- ' : ''}{formatCOP(l.valor)}
            </div>
          </div>
        ))}
      </div>

      <div className={`px-5 py-4 flex items-center justify-between gap-4 ${
        queda >= 0 ? 'bg-green-600' : 'bg-red-600'
      }`}>
        <div>
          <p className="font-bold text-white text-base">
            {queda >= 0 ? 'ME QUEDA LIMPIO' : 'PERDI PLATA EN ESTA VENTA'}
          </p>
          <p className="text-xs text-white/80 mt-0.5">
            Ya descontando todo: mercancia, gastos, banco e impuestos
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white tabular-nums">{formatCOP(queda)}</p>
          <p className="text-xs text-white/80">
            {pctSobreVenta.toFixed(1)}% de la venta
          </p>
        </div>
      </div>
    </div>
  )
}
