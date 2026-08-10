import Header from '@/components/layout/Header'
import { obtenerAnalisisVentas } from '@/lib/queries/analisisVenta'
import { formatCOP } from '@/lib/format'
import { Landmark, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ObligacionesPage() {
  const ventas = await obtenerAnalisisVentas()

  const activas = ventas.filter((v) =>
    ['FACTURADA', 'DESPACHADA', 'ENTREGADO', 'POR_COBRAR', 'COBRADA', 'ENTREGA_PARCIAL', 'EN_ALISTAMIENTO', 'PAGADA'].includes(v.estado),
  )

  // Totales
  const totalIvaCobrado = activas.reduce((s, v) => s + v.iva_cobrado, 0)
  const totalIvaPagado = activas.reduce((s, v) => s + v.iva_pagado, 0)
  const totalReteIva = activas.reduce((s, v) => s + v.retencion_reteiva, 0)
  const totalIvaNeto = activas.reduce((s, v) => s + v.iva_neto_dian, 0)
  const totalSimple = activas.reduce((s, v) => s + v.impuesto_simple, 0)
  const totalRetefuente = activas.reduce((s, v) => s + v.retencion_retefuente, 0)
  const totalReteIca = activas.reduce((s, v) => s + v.retencion_reteica, 0)
  const totalSimplePendiente = activas.reduce((s, v) => s + v.impuesto_simple_pendiente, 0)
  const totalAGuardar = totalIvaNeto + totalSimplePendiente

  return (
    <>
      <Header title="Obligaciones DIAN" subtitle="Cuanto le debes a la DIAN y de donde sale cada peso" />
      <div className="p-8 space-y-8">

        {/* RESUMEN GRANDE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* BOLSILLO IVA */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Bolsillo IVA</h3>
              </div>
              <p className="text-xs text-blue-700 mt-0.5">Se paga cada dos meses. No es tuyo, es de la DIAN.</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA cobrado a clientes</span>
                <span className="font-medium tabular-nums">{formatCOP(totalIvaCobrado)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">- IVA pagado en compras y gastos</span>
                <span className="font-medium tabular-nums text-green-600">-{formatCOP(totalIvaPagado)}</span>
              </div>
              {totalReteIva > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">- ReteIVA que te practicaron</span>
                  <span className="font-medium tabular-nums text-green-600">-{formatCOP(totalReteIva)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-3">
                <span className="text-gray-800">IVA A GUARDAR</span>
                <span className="tabular-nums text-blue-700 text-lg">{formatCOP(totalIvaNeto)}</span>
              </div>
            </div>
          </div>

          {/* BOLSILLO SIMPLE */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-amber-50 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-900">Impuesto Simple</h3>
              </div>
              <p className="text-xs text-amber-700 mt-0.5">5% de la venta (sin IVA). Sale de tu ganancia.</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">5% sobre ventas sin IVA</span>
                <span className="font-medium tabular-nums">{formatCOP(totalSimple)}</span>
              </div>
              {totalRetefuente > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">- Retefuente que te practicaron</span>
                  <span className="font-medium tabular-nums text-green-600">-{formatCOP(totalRetefuente)}</span>
                </div>
              )}
              {totalReteIca > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">- ReteICA que te practicaron</span>
                  <span className="font-medium tabular-nums text-green-600">-{formatCOP(totalReteIca)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-3">
                <span className="text-gray-800">SIMPLE A GUARDAR</span>
                <span className="tabular-nums text-amber-700 text-lg">{formatCOP(totalSimplePendiente)}</span>
              </div>
            </div>
          </div>

          {/* TOTAL */}
          <div className="bg-gray-900 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-center">
            <div className="p-6 text-center">
              <p className="text-sm text-gray-300 uppercase tracking-wide">Total a guardar para la DIAN</p>
              <p className="text-3xl font-bold text-white tabular-nums mt-2">{formatCOP(totalAGuardar)}</p>
              <p className="text-xs text-gray-400 mt-2">
                IVA {formatCOP(totalIvaNeto)} + Simple {formatCOP(totalSimplePendiente)}
              </p>
              <p className="text-xs text-gray-500 mt-3">
                Aparta esta plata en una cuenta aparte. No es tuya: es de la DIAN.
              </p>
            </div>
          </div>
        </div>

        {/* TABLA POR VENTA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Detalle por venta</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Cada linea muestra cuanto se le debe a la DIAN por esa venta especifica
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Venta</th>
                  <th className="px-3 py-3 text-left font-medium">Cliente</th>
                  <th className="px-3 py-3 text-right font-medium">Subtotal</th>
                  <th className="px-3 py-3 text-right font-medium">IVA cobrado</th>
                  <th className="px-3 py-3 text-right font-medium">IVA pagado</th>
                  <th className="px-3 py-3 text-right font-medium">ReteIVA</th>
                  <th className="px-3 py-3 text-right font-medium">IVA neto DIAN</th>
                  <th className="px-3 py-3 text-right font-medium">Simple (5%)</th>
                  <th className="px-3 py-3 text-right font-medium">Retefuente</th>
                  <th className="px-3 py-3 text-right font-medium">ReteICA</th>
                  <th className="px-3 py-3 text-right font-medium">Simple neto</th>
                  <th className="px-4 py-3 text-right font-medium">Total DIAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activas.map((v) => (
                  <tr key={v.cotizacion_id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">{v.numero}</td>
                    <td className="px-3 py-3 text-gray-700 truncate max-w-[160px]">{v.cliente_nombre}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-700">{formatCOP(v.venta_subtotal)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-700">{formatCOP(v.iva_cobrado)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-green-600">{v.iva_pagado > 0 ? `-${formatCOP(v.iva_pagado)}` : '-'}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-green-600">{v.retencion_reteiva > 0 ? `-${formatCOP(v.retencion_reteiva)}` : '-'}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-blue-700">{formatCOP(v.iva_neto_dian)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-700">{formatCOP(v.impuesto_simple)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-green-600">{v.retencion_retefuente > 0 ? `-${formatCOP(v.retencion_retefuente)}` : '-'}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-green-600">{v.retencion_reteica > 0 ? `-${formatCOP(v.retencion_reteica)}` : '-'}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-amber-700">{formatCOP(v.impuesto_simple_pendiente)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-red-700">{formatCOP(v.iva_neto_dian + v.impuesto_simple_pendiente)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td className="px-4 py-3 text-gray-900" colSpan={2}>TOTAL</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatCOP(activas.reduce((s, v) => s + v.venta_subtotal, 0))}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatCOP(totalIvaCobrado)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-green-600">-{formatCOP(totalIvaPagado)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-green-600">{totalReteIva > 0 ? `-${formatCOP(totalReteIva)}` : '-'}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-blue-700">{formatCOP(totalIvaNeto)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatCOP(totalSimple)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-green-600">{totalRetefuente > 0 ? `-${formatCOP(totalRetefuente)}` : '-'}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-green-600">{totalReteIca > 0 ? `-${formatCOP(totalReteIca)}` : '-'}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-amber-700">{formatCOP(totalSimplePendiente)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-700">{formatCOP(totalAGuardar)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
          <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 space-y-1">
            <p><b>Estos numeros salen de las facturas de compra y venta que ya registraste.</b></p>
            <p>El IVA pagado solo se descuenta si la compra tiene factura con IVA discriminado.</p>
            <p>Las retenciones las descuenta el ERP automaticamente cuando las registras en la venta.</p>
            <p>El dinero de la cuenta lo controlas con tu conciliacion bancaria en Excel.</p>
          </div>
        </div>
      </div>
    </>
  )
}
