import Header from '@/components/layout/Header'
import {
  obtenerPosicionFinanciera,
  obtenerSaldosCuentas,
  obtenerObligacionesPorPeriodo,
  obtenerEstadoReserva,
  obtenerCuentasParaSelect,
} from '@/lib/queries/tesoreria'
import WidgetReserva from '@/components/tesoreria/WidgetReserva'
import { obtenerAnalisisVentas } from '@/lib/queries/analisisVenta'
import { formatCOP, formatFecha } from '@/lib/format'
import {
  Wallet, TrendingUp, AlertTriangle, Landmark, PiggyBank,
  ArrowDownLeft, ArrowUpRight, Info, ShieldCheck, ShieldAlert,
  Banknote, CalendarClock,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const BIMESTRES: Record<number, string> = {
  1: 'Ene-Feb', 2: 'Mar-Abr', 3: 'May-Jun',
  4: 'Jul-Ago', 5: 'Sep-Oct', 6: 'Nov-Dic',
}

export default async function FinancieroPage() {
  const { datos: p, error } = await obtenerPosicionFinanciera()
  const cuentas = await obtenerSaldosCuentas()
  const periodos = await obtenerObligacionesPorPeriodo()
  const ventas = await obtenerAnalisisVentas()
  const { datos: reserva } = await obtenerEstadoReserva()
  const cuentasSelect = await obtenerCuentasParaSelect()

  const ventasConMovimiento = ventas.filter((v) =>
    ['FACTURADA', 'DESPACHADA', 'ENTREGADO', 'POR_COBRAR', 'COBRADA', 'ENTREGA_PARCIAL'].includes(v.estado)
  )
  const ventasSinCosto = ventasConMovimiento.filter((v) => !v.tiene_costo_asignado)
  const hayDatos = p.num_ventas > 0 || p.saldo_total !== 0

  return (
    <>
      <Header title="Centro de Control Financiero" subtitle="La verdad sobre el dinero de Abastecer" />

      <div className="p-8 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 text-red-700 text-sm">
            Error al cargar datos: {error}
            <p className="text-xs mt-1 text-red-600">
              Si es la primera vez, verifica que las migraciones 016 a 022 esten ejecutadas en Supabase.
            </p>
          </div>
        )}

        {!hayDatos && !error && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-6 py-5 text-sm text-blue-800">
            <p className="font-medium">Todavia no hay movimiento registrado.</p>
            <p className="mt-1 text-blue-700">
              Los numeros apareceran cuando registres ventas facturadas, compras y movimientos de caja.
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/* DISPONIBLE REAL — el numero que importa */}
        {/* ============================================================ */}
        <div className={`rounded-2xl p-6 border-2 ${
          p.en_riesgo ? 'bg-red-50/60 border-red-200' : 'bg-green-50/60 border-green-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              p.en_riesgo ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {p.en_riesgo
                ? <ShieldAlert className="w-6 h-6 text-red-600" />
                : <ShieldCheck className="w-6 h-6 text-green-600" />}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">Disponible real para usar hoy</p>
              <p className={`text-4xl font-bold tabular-nums mt-1 ${
                p.disponible_real >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                {formatCOP(p.disponible_real)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Es lo que queda despues de apartar impuestos y deudas a proveedores.
                {p.cuentas_por_cobrar > 0 && (
                  <> Cuando cobres la cartera subiria a <strong>{formatCOP(p.disponible_proyectado)}</strong>.</>
                )}
              </p>
            </div>
          </div>

          {/* Desglose del calculo */}
          <div className="mt-5 pt-5 border-t border-gray-200/70 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Saldo en cuentas operativas</p>
              <p className="font-semibold text-gray-800 tabular-nums">{formatCOP(p.saldo_operativo)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">(−) IVA de la DIAN</p>
              <p className="font-semibold text-red-600 tabular-nums">{formatCOP(p.iva_por_pagar)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">(−) Impuesto Simple</p>
              <p className="font-semibold text-red-600 tabular-nums">{formatCOP(p.simple_por_pagar)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">(−) Deuda a proveedores</p>
              <p className="font-semibold text-red-600 tabular-nums">{formatCOP(p.cuentas_por_pagar)}</p>
            </div>
          </div>
        </div>

        {/* Reserva de impuestos: cuanto debe estar apartado y boton para apartarlo */}
        {reserva.debe_estar_reservado > 0 && (
          <WidgetReserva estado={reserva} cuentas={cuentasSelect} />
        )}

        {/* ============================================================ */}
        {/* KPIs */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Utilidad neta</span>
            </div>
            <p className="text-2xl font-bold text-green-600 tabular-nums">{formatCOP(p.utilidad_neta_acum)}</p>
            <p className="text-xs text-gray-400 mt-1">
              Bruta {formatCOP(p.utilidad_bruta_acum)} · Margen {p.margen_bruto_pct.toFixed(1)}%
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm text-gray-500">Por cobrar</span>
            </div>
            <p className="text-2xl font-bold text-amber-600 tabular-nums">{formatCOP(p.cuentas_por_cobrar)}</p>
            <p className="text-xs text-gray-400 mt-1">Facturas emitidas sin pago</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-sm text-gray-500">Por pagar</span>
            </div>
            <p className="text-2xl font-bold text-red-600 tabular-nums">{formatCOP(p.cuentas_por_pagar)}</p>
            <p className="text-xs text-gray-400 mt-1">Deuda con proveedores</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Capital social</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 tabular-nums">{formatCOP(p.capital_social)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {p.prestamos_socios > 0 ? `+ ${formatCOP(p.prestamos_socios)} en prestamos` : 'Aportes de socios'}
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SALDOS POR CUENTA */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-gray-500" />
            <div>
              <h3 className="font-semibold text-gray-800">Donde esta el dinero</h3>
              <p className="text-sm text-gray-500 mt-0.5">Saldo de cada cuenta segun los movimientos registrados</p>
            </div>
          </div>
          {cuentas.length === 0 ? (
            <p className="px-6 py-6 text-sm text-gray-400">
              No hay cuentas configuradas. Ejecuta la migracion 020 para crearlas.
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {cuentas.map((c) => (
                <div key={c.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      c.es_reserva ? 'bg-amber-50' : 'bg-blue-50'
                    }`}>
                      {c.es_reserva
                        ? <Landmark className="w-4 h-4 text-amber-600" />
                        : <Wallet className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{c.nombre}</p>
                      <p className="text-xs text-gray-400">
                        {c.es_reserva ? 'Reserva · no cuenta como disponible' : c.tipo}
                        {c.num_movimientos > 0 && ` · ${c.num_movimientos} movimiento(s)`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold tabular-nums ${
                      c.saldo_actual >= 0 ? 'text-gray-800' : 'text-red-600'
                    }`}>
                      {formatCOP(c.saldo_actual)}
                    </p>
                    {c.num_movimientos > 0 && (
                      <p className="text-xs text-gray-400">
                        +{formatCOP(c.total_ingresos)} / −{formatCOP(c.total_egresos)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div className="px-6 py-3 bg-gray-50 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total en cuentas</span>
                <span className="font-bold tabular-nums text-gray-800">{formatCOP(p.saldo_total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* IVA Y RESULTADO */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Impuestos acumulados por pagar</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">IVA neto de todas las ventas</span>
                <span className="font-medium text-gray-800 tabular-nums">{formatCOP(p.iva_por_pagar)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Impuesto Simple pendiente</span>
                <span className="font-medium text-gray-800 tabular-nums">{formatCOP(p.simple_por_pagar)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="font-medium text-gray-800">Total a separar</span>
                <span className="font-bold text-lg tabular-nums text-red-600">
                  {formatCOP(p.impuestos_por_pagar)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Ya reservado</span>
                <span className={`font-medium tabular-nums ${
                  p.saldo_reservas >= p.impuestos_por_pagar ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {formatCOP(p.saldo_reservas)}
                </span>
              </div>
            </div>
            <div className="mt-4 bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-800">
                Politica #014: este dinero no es de la empresa. Debe estar separado y disponible
                para cuando llegue la fecha de declarar.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Resultado de la operacion</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ventas facturadas (base)</span>
                <span className="font-medium text-gray-800 tabular-nums">{formatCOP(p.ventas_subtotal_acum)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">(−) Costo real de lo vendido</span>
                <span className="font-medium text-gray-800 tabular-nums">{formatCOP(p.costo_real_acum)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                <span className="text-gray-600">Utilidad bruta</span>
                <span className="font-medium text-green-600 tabular-nums">{formatCOP(p.utilidad_bruta_acum)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">(−) Gastos operativos</span>
                <span className="font-medium text-gray-800 tabular-nums">{formatCOP(p.gastos_operativos)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="font-medium text-gray-800">Resultado operativo</span>
                <span className={`font-bold text-lg tabular-nums ${
                  p.resultado_operativo >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCOP(p.resultado_operativo)}
                </span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500">Ventas registradas</p>
                <p className="font-bold text-gray-800 text-base">{p.num_ventas}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500">Cotizaciones activas</p>
                <p className="font-bold text-blue-600 text-base">{p.pipeline_num}</p>
                <p className="text-gray-400">{formatCOP(p.pipeline_total)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ALERTA: VENTAS SIN COSTO ASIGNADO */}
        {/* ============================================================ */}
        {ventasSinCosto.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-amber-800 text-sm">
                  {ventasSinCosto.length} venta(s) sin costo asignado
                </p>
                <p className="text-amber-700 text-sm mt-0.5">
                  La utilidad de estas ventas esta inflada porque no se les ha asignado la compra.
                  Registra la factura del proveedor y asignale las unidades.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ventasSinCosto.slice(0, 8).map((v) => (
                    <a
                      key={v.cotizacion_id}
                      href={`/ventas/${v.cotizacion_id}`}
                      className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono text-amber-800 hover:bg-amber-100 transition"
                    >
                      {v.numero}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* OBLIGACIONES POR PERIODO */}
        {/* ============================================================ */}
        {periodos.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-gray-500" />
              <div>
                <h3 className="font-semibold text-gray-800">Que declarar en cada periodo</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  El IVA se declara por bimestre. Aqui esta el detalle mes por mes.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-6 py-2.5 font-medium text-gray-500 text-xs">Mes</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-xs">Bimestre</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-xs text-center">Ventas</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-xs text-right">Base</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-xs text-right">IVA cobrado</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-xs text-right">IVA descontable</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-xs text-right">IVA a pagar</th>
                    <th className="px-6 py-2.5 font-medium text-gray-500 text-xs text-right">Simple a pagar</th>
                  </tr>
                </thead>
                <tbody>
                  {periodos.map((per) => (
                    <tr key={per.mes} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-gray-800">{per.mes}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {BIMESTRES[per.bimestre] ?? `B${per.bimestre}`} {per.anio}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{per.num_ventas}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">{formatCOP(per.base_gravable)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">{formatCOP(per.iva_cobrado)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">{formatCOP(per.iva_descontable)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-red-600">{formatCOP(per.iva_a_pagar)}</td>
                      <td className="px-6 py-3 text-right tabular-nums font-medium text-purple-600">{formatCOP(per.simple_a_pagar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VENTAS CON SU ANALISIS */}
        {/* ============================================================ */}
        {ventasConMovimiento.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Analisis de cada venta</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Costo real, utilidad y dinero a separar. Click en el numero para ver el detalle.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-6 py-2.5 font-medium text-gray-500 text-xs">Venta</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-xs">Cliente</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-xs">Fecha</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-xs text-right">Vendido</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-xs text-right">Costo real</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-xs text-right">Utilidad neta</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 text-xs text-right">Margen</th>
                    <th className="px-6 py-2.5 font-medium text-gray-500 text-xs text-right">A separar</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasConMovimiento.map((v) => (
                    <tr key={v.cotizacion_id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 ${
                      !v.tiene_costo_asignado ? 'bg-amber-50/40' : ''
                    }`}>
                      <td className="px-6 py-3">
                        <a href={`/ventas/${v.cotizacion_id}`} className="font-mono text-xs text-blue-600 hover:underline">
                          {v.numero}
                        </a>
                        {!v.tiene_costo_asignado && (
                          <span className="ml-2 text-xs text-amber-700">sin costo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs truncate max-w-[160px]">{v.cliente_nombre ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatFecha(v.fecha)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatCOP(v.venta_subtotal)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                        {v.tiene_costo_asignado ? formatCOP(v.costo_real) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-medium ${
                        v.utilidad_neta >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCOP(v.utilidad_neta)}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums ${
                        v.margen_bruto_pct >= 30 ? 'text-green-600'
                        : v.margen_bruto_pct >= 20 ? 'text-amber-600'
                        : 'text-red-600'
                      }`}>
                        {v.margen_bruto_pct.toFixed(1)}%
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-red-600">{formatCOP(v.total_a_separar)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-6 py-3 text-gray-800" colSpan={3}>TOTAL</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-800">{formatCOP(p.ventas_subtotal_acum)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-800">{formatCOP(p.costo_real_acum)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-700">{formatCOP(p.utilidad_neta_acum)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-800">{p.margen_bruto_pct.toFixed(1)}%</td>
                    <td className="px-6 py-3 text-right tabular-nums text-red-700">{formatCOP(p.impuestos_por_pagar)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Nota conceptual */}
        <div className="flex items-start gap-3 bg-blue-50/60 border border-blue-100 rounded-2xl px-5 py-4">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-900 leading-relaxed">
            <strong>El banco miente.</strong> El saldo de la cuenta no es plata disponible.
            Cada peso tiene un nombre y un proposito (Politica #012). El disponible real de arriba
            ya descuenta el IVA de la DIAN, el impuesto Simple y lo que se le debe a proveedores.
            Todos estos numeros salen de las ventas, compras y movimientos registrados: no hay estimaciones.
          </p>
        </div>
      </div>
    </>
  )
}
