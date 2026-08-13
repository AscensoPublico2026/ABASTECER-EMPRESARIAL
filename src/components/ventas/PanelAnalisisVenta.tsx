import { formatCOP, formatFecha } from '@/lib/format'
import type { AnalisisVenta, AnalisisItem, EventoTrazabilidad } from '@/lib/queries/analisisVenta'
import {
  TrendingUp, AlertTriangle, CheckCircle2, Landmark,
  Wallet, PieChart, FileWarning, ListTree, FileText,
} from 'lucide-react'
import ResumenPlata from './ResumenPlata'
import {
  construirTimeline, textoEstadoPago, hayComprasPorPagar, hayPagosEnOtraVenta,
} from '@/lib/ventas/timelineVenta'
import { calcularTotalesVenta } from '@/lib/ventas/totalesVenta'

interface Props {
  analisis: AnalisisVenta
  items: AnalisisItem[]
  trazabilidad: EventoTrazabilidad[]
}

const ETIQUETA_DOC: Record<string, { texto: string; color: string }> = {
  COTIZACION:     { texto: 'Cotizacion',      color: 'bg-blue-50 text-blue-700 border-blue-200' },
  FACTURA_COMPRA: { texto: 'Factura compra',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  EGRESO_CAJA:    { texto: 'Salida de caja',  color: 'bg-red-50 text-red-700 border-red-200' },
  GMF:            { texto: '4x1000',          color: 'bg-slate-50 text-slate-600 border-slate-200' },
  GASTO:          { texto: 'Gasto',           color: 'bg-orange-50 text-orange-700 border-orange-200' },
  REMISION:       { texto: 'Remision',        color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  FACTURA_VENTA:  { texto: 'Factura venta',   color: 'bg-purple-50 text-purple-700 border-purple-200' },
  INGRESO_CAJA:   { texto: 'Entrada de caja', color: 'bg-green-50 text-green-700 border-green-200' },
}

export default function PanelAnalisisVenta({ analisis: a, items, trazabilidad }: Props) {
  const sinCosto = !a.tiene_costo_asignado

  /**
   * Retenciones que SI son anticipo del impuesto Simple.
   *
   * Solo la retefuente y la reteICA. La reteIVA es anticipo del IVA y se
   * descuenta en el bolsillo del IVA, no aqui.
   *
   * POR QUE IMPORTA: el panel antes listaba las TRES retenciones dentro
   * del bolsillo del Simple, pero el calculo (correctamente) solo restaba
   * retefuente + reteICA. Con una reteIVA de 36.480 el usuario veia
   * "64.000 menos 36.480 = 64.000" y parecia un error de suma, cuando el
   * numero estaba bien y lo que estaba mal era la caja donde se mostraba.
   *
   * Restarla en los dos lados seria contarla dos veces y dejaria de
   * apartar 36.480 que hay que pagarle a la DIAN.
   */
  const retencionesDelSimple = a.retencion_retefuente + a.retencion_reteica
  const margenColor =
    a.margen_bruto_pct >= 30 ? 'text-green-600'
    : a.margen_bruto_pct >= 20 ? 'text-amber-600'
    : 'text-red-600'

  // La historia de la venta se arma en un solo lugar compartido
  // (construirTimeline) para que el panel en pantalla y el informe
  // imprimible cuenten exactamente lo mismo.
  const timeline = construirTimeline(trazabilidad)

  /**
   * Los totales de la tabla de productos se calculan en calcularTotalesVenta
   * para que esta pantalla y el informe imprimible no puedan dar numeros
   * distintos. Ahi esta explicado el error que habia.
   */
  const {
    sumaCostoItems, sumaVentaItems, sumaUtilidadItems, margenItems,
    costoQueNoAterriza, hayCostoHuerfano, descuadreCosto,
  } = calcularTotalesVenta(a, items)


  return (
    <div className="print:hidden space-y-5">

      {/* Aviso si falta asignar costos */}
      {sinCosto && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Esta venta todavia no tiene costos asignados</p>
            <p className="text-amber-700 mt-0.5">
              Registra la factura de compra y asignale las unidades a esta cotizacion.
              Mientras no lo hagas, la utilidad que ves es la venta completa sin descontar costo.
            </p>
          </div>
        </div>
      )}

      {/* ============ LO PRIMERO QUE SE DEBE VER ============ */}
      {/* La cascada de la plata. Va ARRIBA de todo porque responde la
          pregunta que el dueno de verdad tiene: cuanto me quedo. El resto
          del panel es el detalle para cuando quiera profundizar. */}
      <ResumenPlata analisis={a} />

      <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-xs text-blue-900">
          Necesitas este informe en papel o en PDF para el paquete de la venta?
        </p>
        <a
          href={`/ventas/${a.cotizacion_id}/informe`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 whitespace-nowrap"
        >
          <FileText className="w-3.5 h-3.5" /> Ver informe para imprimir
        </a>
      </div>

      {/* ============ RESUMEN EN 4 NUMEROS ============ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <PieChart className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Vendido</span>
          </div>
          <p className="text-xl font-bold text-gray-800 tabular-nums">{formatCOP(a.venta_subtotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Base sin IVA</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Nos costo</span>
          </div>
          <p className="text-xl font-bold text-gray-800 tabular-nums">{formatCOP(a.costo_real)}</p>
          {/* El desglose va con los VALORES, no con el conteo de facturas.
              Antes decia "1 factura(s) + 15.000 gastos" y era imposible
              saber cuanto de los 1.306.000 era mercancia. */}
          <p className="text-xs text-gray-400 mt-0.5">
            {a.costo_gastos > 0
              ? `${formatCOP(a.costo_compras)} mercancia + ${formatCOP(a.costo_gastos)} gastos`
              : `${a.num_facturas_compra} factura(s) de compra`}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Utilidad bruta</span>
          </div>
          <p className="text-xl font-bold text-green-600 tabular-nums">{formatCOP(a.utilidad_bruta)}</p>
          <p className={`text-xs mt-0.5 font-medium ${margenColor}`}>
            Margen {a.margen_bruto_pct.toFixed(1)}%
          </p>
        </div>

        <div className="bg-green-700 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs text-green-100 uppercase tracking-wide">Utilidad neta</span>
          </div>
          <p className="text-xl font-bold text-white tabular-nums">{formatCOP(a.utilidad_neta)}</p>
          <p className="text-xs text-green-100 mt-0.5">
            Lo que queda · {a.margen_neto_pct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* El bloque informativo del 4x1000 se quito de este informe.
          El 4x1000 no lo causa la venta sino cuantas transferencias se
          hicieron para pagarla, asi que ensuciaba la comparacion de
          rentabilidad entre ventas. Se sigue calculando y sigue afectando
          el saldo en Tesoreria, y se ve como gasto operativo en el Centro
          Financiero. */}

      {/* ============ TOTAL A SEPARAR (ARRIBA) ============ */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-red-900 text-sm">Total a separar de esta venta</h3>
          <p className="text-xs text-red-700 mt-0.5">Metelo en la cuenta de reserva para que no se gaste</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-red-600 tabular-nums">{formatCOP(a.total_a_separar)}</p>
          <p className="text-xs text-gray-500 mt-1">
            <span className="text-blue-600 font-medium">IVA {formatCOP(a.iva_neto_dian)}</span>
            {' + '}
            <span className="text-amber-600 font-medium">Simple {formatCOP(a.impuesto_simple_pendiente)}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ============ BOLSILLO 1: IVA ============ */}
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 text-sm">Bolsillo IVA</h3>
              <p className="text-xs text-blue-600">Plata que no es tuya, es de la DIAN</p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">IVA que cobraste al cliente</span>
              <span className="tabular-nums text-gray-800 font-medium">{formatCOP(a.iva_cobrado)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">IVA que pagaste en las compras</span>
              <span className="tabular-nums text-green-600 font-medium">- {formatCOP(a.iva_pagado)}</span>
            </div>
            {/* La reteIVA es anticipo del IVA, NO del Simple. Va en ESTE
                bolsillo. Antes se listaba en el bolsillo del Simple, y como
                el calculo (correctamente) no la restaba de ahi, las dos
                cajas parecian tener un error de suma. */}
            {a.retencion_reteiva > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">ReteIVA que te retuvo el cliente</span>
                <span className="tabular-nums text-green-600 font-medium">- {formatCOP(a.retencion_reteiva)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t-2 border-blue-200">
              <span className="font-bold text-blue-900">Guardar para IVA</span>
              <span className="font-bold tabular-nums text-xl text-blue-700">
                {formatCOP(a.iva_neto_dian)}
              </span>
            </div>
          </div>

          <div className="mt-4 bg-blue-50 rounded-xl p-3.5">
            <p className="text-xs text-blue-800 leading-relaxed">
              {a.retencion_reteiva > 0
                ? `Cobraste ${formatCOP(a.iva_cobrado)} de IVA al cliente. Ya pagaste ${formatCOP(a.iva_pagado)} de IVA a tus proveedores y el cliente le adelanto ${formatCOP(a.retencion_reteiva)} a la DIAN por ti (reteIVA). Lo que queda es lo que tienes que guardar. Se paga cada bimestre.`
                : `Cobraste ${formatCOP(a.iva_cobrado)} de IVA al cliente, pero ya pagaste ${formatCOP(a.iva_pagado)} de IVA a tus proveedores. La diferencia es lo que le debes a la DIAN. Se paga cada bimestre.`}
            </p>
          </div>
        </div>

        {/* ============ BOLSILLO 2: IMPUESTO SIMPLE ============ */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 text-sm">Bolsillo Impuesto Simple</h3>
              <p className="text-xs text-amber-600">Sale de tu utilidad, se paga bimestral</p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">5% sobre la venta ({formatCOP(a.venta_subtotal)})</span>
              <span className="tabular-nums text-gray-800 font-medium">{formatCOP(a.impuesto_simple)}</span>
            </div>
            {/* Solo retefuente y reteICA son anticipo del Simple. La
                reteIVA se muestra en el bolsillo del IVA, que es lo que
                de verdad reduce. */}
            {retencionesDelSimple > 0 && (
              <>
                <div className="flex justify-between items-center text-green-700">
                  <span>Retenciones que el cliente ya pago por ti:</span>
                  <span></span>
                </div>
                {a.retencion_retefuente > 0 && (
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-gray-500 text-xs">Retefuente</span>
                    <span className="tabular-nums text-green-600 font-medium">- {formatCOP(a.retencion_retefuente)}</span>
                  </div>
                )}
                {a.retencion_reteica > 0 && (
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-gray-500 text-xs">ReteICA</span>
                    <span className="tabular-nums text-green-600 font-medium">- {formatCOP(a.retencion_reteica)}</span>
                  </div>
                )}
              </>
            )}
            {/* Si al cliente solo le retuvieron reteIVA, hay que decirlo
                aqui: si no, el usuario ve el Simple completo y cree que
                el sistema se comio la retencion. */}
            {a.retencion_reteiva > 0 && retencionesDelSimple === 0 && (
              <div className="flex items-start gap-1.5 bg-white border border-amber-200 rounded-lg px-2.5 py-2">
                <Landmark className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-gray-600 leading-relaxed">
                  Los {formatCOP(a.retencion_reteiva)} de reteIVA no bajan este impuesto:
                  bajan el del <strong>bolsillo IVA</strong> (mira la caja azul).
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t-2 border-amber-200">
              <span className="font-bold text-amber-900">Guardar para Simple</span>
              <span className="font-bold tabular-nums text-xl text-amber-700">
                {formatCOP(a.impuesto_simple_pendiente)}
              </span>
            </div>
          </div>

          <div className="mt-4 bg-amber-50 rounded-xl p-3.5">
            <p className="text-xs text-amber-800 leading-relaxed">
              {retencionesDelSimple > 0
                ? `El impuesto es ${formatCOP(a.impuesto_simple)} pero el cliente ya le adelanto ${formatCOP(retencionesDelSimple)} a la DIAN por ti (retefuente y reteICA). Solo te falta guardar la diferencia.`
                : a.retencion_reteiva > 0
                  ? `Es el 5% de lo que vendiste y va completo, porque a ti solo te retuvieron reteIVA, que es un anticipo del IVA y no de este impuesto. Ese descuento ya esta aplicado en el bolsillo IVA.`
                  : `Es el 5% de lo que vendiste. Nadie te retuvo, asi que debes guardar el 100% de este impuesto.`}
            </p>
          </div>
        </div>
      </div>

      {/* ============ PRODUCTO POR PRODUCTO ============ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm">Rentabilidad por producto</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Precio de compra real contra precio de venta. El total de abajo suma estas filas
            mas los gastos de la venta, que van en su propio renglon.
          </p>
        </div>

        {/* Si ni asi cuadra, es un bug: no se puede confiar en la tabla y
            hay que decirlo antes de que el usuario tome una decision. */}
        {descuadreCosto > 1 && (
          <div className="px-5 py-3 bg-red-100 border-b-2 border-red-400">
            <p className="text-xs text-red-900">
              <strong>Descuadre de {formatCOP(descuadreCosto)} en el costo de esta venta.</strong>{' '}
              La suma de los productos mas los gastos no da el costo total.
              No tomes decisiones con esta tabla hasta revisarlo.
            </p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-2.5 font-medium text-gray-500 text-xs">Producto</th>
                <th className="px-3 py-2.5 font-medium text-gray-500 text-xs text-center">Cant</th>
                {/* Se quito la columna "Multiplicador": al dueno no le dice
                    nada y hacia la tabla mas dificil de leer. El margen ya
                    cuenta la misma historia en un lenguaje que si se entiende. */}
                <th className="px-3 py-2.5 font-medium text-gray-500 text-xs text-right">Me costo c/u</th>
                <th className="px-3 py-2.5 font-medium text-gray-500 text-xs text-right">Lo vendi c/u</th>
                <th className="px-3 py-2.5 font-medium text-gray-500 text-xs text-right">Gane</th>
                <th className="px-5 py-2.5 font-medium text-gray-500 text-xs text-right">Margen</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const negativo = it.utilidad < 0
                return (
                  <tr key={it.cotizacion_item_id} className={`border-b border-gray-50 last:border-0 ${negativo ? 'bg-orange-50/50' : ''}`}>
                    <td className="px-5 py-3 text-gray-800">{it.descripcion}</td>
                    <td className="px-3 py-3 text-center text-gray-600">{it.cantidad}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-600">
                      {it.tiene_costo_real
                        ? formatCOP(it.costo_unitario_real)
                        : <span className="text-gray-300 text-xs">sin asignar</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-600">{formatCOP(it.precio_venta_unitario)}</td>
                    <td className={`px-3 py-3 text-right tabular-nums font-medium ${negativo ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCOP(it.utilidad)}
                      {negativo && (
                        <span className="block text-xs font-normal text-red-600">
                          lo vendiste mas barato de lo que costo
                        </span>
                      )}
                    </td>
                    <td className={`px-5 py-3 text-right tabular-nums ${
                      it.margen_pct >= 30 ? 'text-green-600'
                      : it.margen_pct >= 20 ? 'text-amber-600'
                      : 'text-red-600'
                    }`}>
                      {it.margen_pct.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              {/* 1. SUBTOTAL: suma exacta de las filas de arriba.
                     Se puede verificar con calculadora. */}
              <tr className="bg-gray-50 font-medium border-t-2 border-gray-200">
                <td className="px-5 py-2.5 text-gray-800">
                  Subtotal productos
                  <span className="block text-xs font-normal text-gray-500">
                    La suma de las {items.length} fila{items.length !== 1 ? 's' : ''} de arriba
                  </span>
                </td>
                <td className="px-3 py-2.5"></td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{formatCOP(sumaCostoItems)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{formatCOP(sumaVentaItems)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-green-700">{formatCOP(sumaUtilidadItems)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums text-green-700">{margenItems.toFixed(1)}%</td>
              </tr>

              {/* 2. COSTO DE COMPRA QUE NO ATERRIZO EN NINGUN PRODUCTO.
                     Es el caso del kit comprado y vendido por separado. */}
              {hayCostoHuerfano && (
                <tr className="bg-red-50">
                  <td className="px-5 py-2.5 text-red-800 font-medium" colSpan={2}>
                    Costo de compra que no quedo en ningun producto
                    <span className="block text-xs font-normal text-red-700">
                      Hay una compra asignada a esta venta cuyo producto no esta en la
                      cotizacion. Los margenes de arriba salen inflados. Revisa la factura
                      de compra y asignala al producto que si vendiste.
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-red-800 font-medium">
                    {formatCOP(costoQueNoAterriza)}
                  </td>
                  <td className="px-3 py-2.5"></td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-red-800 font-medium">
                    - {formatCOP(costoQueNoAterriza)}
                  </td>
                  <td className="px-5 py-2.5"></td>
                </tr>
              )}

              {/* 3. LOS GASTOS DE LA VENTA, EN SU PROPIO RENGLON.
                     Antes estaban escondidos dentro del TOTAL y por eso la
                     tabla no cuadraba con sus filas. */}
              {a.costo_gastos > 0 && (
                <tr className="bg-orange-50">
                  <td className="px-5 py-2.5 text-orange-900 font-medium" colSpan={2}>
                    Gastos de esta venta
                    <span className="block text-xs font-normal text-orange-800">
                      Fletes, domicilios o mano de obra. No son de un producto puntual: son de
                      la venta completa. Si un gasto se repartio entre varias ventas, aqui solo
                      va la parte de esta.
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-orange-900 font-medium">
                    {formatCOP(a.costo_gastos)}
                  </td>
                  <td className="px-3 py-2.5"></td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-orange-900 font-medium">
                    - {formatCOP(a.costo_gastos)}
                  </td>
                  <td className="px-5 py-2.5"></td>
                </tr>
              )}

              {/* 4. TOTAL DE LA VENTA. Ahora si es la suma de lo de arriba. */}
              <tr className="bg-green-50 font-semibold border-t-2 border-green-200">
                <td className="px-5 py-3 text-gray-900">
                  TOTAL DE LA VENTA
                  {a.costo_gastos > 0 && (
                    <span className="block text-xs font-normal text-gray-600">
                      {formatCOP(sumaCostoItems)} de productos
                      {hayCostoHuerfano ? ` + ${formatCOP(costoQueNoAterriza)} sin asignar` : ''}
                      {' '}+ {formatCOP(a.costo_gastos)} de gastos = {formatCOP(a.costo_real)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-900">{formatCOP(a.costo_real)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-900">{formatCOP(a.venta_subtotal)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-green-700">{formatCOP(a.utilidad_bruta)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-green-700">{a.margen_bruto_pct.toFixed(1)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ============ GASTOS SIN SOPORTE ============ */}
      {a.num_gastos_sin_soporte > 0 && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
          <FileWarning className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-orange-800">
              {a.num_gastos_sin_soporte} gasto(s) sin soporte por {formatCOP(a.costo_no_deducible)}
            </p>
            <p className="text-orange-700 mt-0.5">
              Sin factura ni documento soporte ese valor no es deducible de impuestos.
              Genera el documento soporte con los datos del tercero.
            </p>
          </div>
        </div>
      )}

      {/* ============ TRAZABILIDAD ============ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <ListTree className="w-4 h-4 text-gray-500" />
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Trazabilidad completa</h3>
            <p className="text-xs text-gray-500 mt-0.5">Historia de esta venta, en orden</p>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {timeline.map((fila, i) => {
            if (fila.esEtapa) {
              return (
                <div key={`etapa-${i}`} className="px-5 py-2 bg-gray-50">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {fila.etiquetaEtapa}
                  </span>
                </div>
              )
            }
            const ev = fila.evento!
            const et = ETIQUETA_DOC[ev.documento_tipo] ?? { texto: ev.documento_tipo, color: 'bg-gray-50 text-gray-600 border-gray-200' }
            const estadoTexto = textoEstadoPago(fila)
            const porPagar = fila.estadoPago === 'POR_PAGAR'
            // El pago que quedo como fila propia (credito) se indenta para
            // que se lea como consecuencia de la factura de arriba
            const esPagoAparte = ev.documento_tipo === 'EGRESO_CAJA'

            return (
              <div
                key={`${ev.documento_tipo}-${ev.documento_id ?? i}`}
                className={`px-5 py-3 flex items-center gap-4 hover:bg-gray-50/50 ${esPagoAparte ? 'pl-10 bg-gray-50/40' : ''} ${porPagar ? 'bg-red-50/40' : ''}`}
              >
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${et.color}`}>
                  {et.texto}
                </span>
                <span className="font-mono text-xs text-gray-700 flex-1 truncate">
                  {ev.documento_numero ?? '-'}
                </span>
                {estadoTexto && (
                  <span
                    title={fila.estadoPago === 'PAGADA'
                      ? 'Esta compra se repartio entre varias ventas.'
                      : undefined}
                    className={`text-xs whitespace-nowrap px-2 py-0.5 rounded-md ${
                      porPagar
                        ? 'bg-red-100 text-red-700 font-semibold'
                        : fila.estadoPago === 'PAGADA_MISMO_DIA'
                          ? 'bg-green-50 text-green-700'
                          : fila.estadoPago === 'PAGADA'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {estadoTexto}
                  </span>
                )}
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {ev.documento_fecha ? formatFecha(ev.documento_fecha) : '-'}
                </span>
                <span className="tabular-nums text-sm text-gray-700 w-28 text-right font-medium">
                  {ev.valor !== null ? formatCOP(ev.valor) : ''}
                </span>
              </div>
            )
          })}
        </div>
        {hayComprasPorPagar(timeline) && (
          <div className="px-5 py-3 bg-red-50 border-t border-red-100">
            <p className="text-xs text-red-800">
              <strong>Hay compras sin pagar en esta venta.</strong> Son cuentas por pagar vivas:
              la plata todavia no salio del banco, asi que tu saldo disponible real es menor de
              lo que parece.
            </p>
          </div>
        )}
        {hayPagosEnOtraVenta(timeline) && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-600">
              Las compras que dicen solo <strong>Pagada</strong> ya estan pagadas. No se ve la
              fecha porque esa compra se repartio entre varias ventas.
              
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
