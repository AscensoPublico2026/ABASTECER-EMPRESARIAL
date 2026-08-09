import Header from '@/components/layout/Header'
import LibroTesoreria from '@/components/tesoreria/LibroTesoreria'
import WidgetReserva from '@/components/tesoreria/WidgetReserva'
import AccionesTesoreria from '@/components/tesoreria/AccionesTesoreria'
import {
  obtenerSaldosCuentas,
  obtenerCuentasParaSelect,
  obtenerLibroTesoreria,
  obtenerEstadoReserva,
  obtenerPosicionFinanciera,
  obtenerGmfPorPeriodo,
  obtenerDescuadresGmf,
  obtenerAuditoriaIntegridad,
} from '@/lib/queries/tesoreria'
import { formatCOP, formatFecha } from '@/lib/format'
import { Landmark, PiggyBank, Wallet, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TesoreriaPage() {
  const cuentasSaldo = await obtenerSaldosCuentas()
  const cuentasSelect = await obtenerCuentasParaSelect()
  const { movimientos, error: errLibro } = await obtenerLibroTesoreria()
  const { datos: reserva } = await obtenerEstadoReserva()
  const { datos: posicion } = await obtenerPosicionFinanciera()
  const gmfPeriodos = await obtenerGmfPorPeriodo()

  /**
   * AUDITORIA DEL SALDO CONTRA EL BANCO.
   *
   * El 4x1000 es el unico dato del libro que calcula el banco y no nosotros.
   * Si el GMF cobrado no corresponde al monto guardado, uno de los dos esta
   * mal, y como el banco no se equivoca con su propio cobro, casi siempre es
   * el monto el que quedo incompleto.
   *
   * Asi se descubrio la impresora: el movimiento decia 654.881 pero el GMF
   * de 2.819 solo se explica con un egreso de ~704.750. Habia 49.869 que
   * salieron del banco y no estaban registrados, y nada lo avisaba.
   */
  const descuadres = await obtenerDescuadresGmf()
  const totalSinRegistrar = descuadres.reduce((s, d) => s + Math.abs(d.plata_sin_registrar), 0)

  /**
   * AUDITORIA COMPLETA DEL CIRCUITO DEL DINERO.
   *
   * Antes el dueno encontraba los errores uno por uno revisando con
   * calculadora. Eso lo tiene que hacer el sistema y avisarlo aqui.
   */
  const hallazgos = await obtenerAuditoriaIntegridad()
  const graves = hallazgos.filter((h) => h.gravedad === 'GRAVE').length

  const operativas = cuentasSaldo.filter((c) => !c.es_reserva)
  const reservas = cuentasSaldo.filter((c) => c.es_reserva)

  const saldoOperativo = operativas.reduce((s, c) => s + c.saldo_actual, 0)
  const saldoReservas = reservas.reduce((s, c) => s + c.saldo_actual, 0)
  const saldoTotal = saldoOperativo + saldoReservas

  // Mapa id -> saldo para los modales
  const saldos: Record<string, number> = {}
  for (const c of cuentasSaldo) saldos[c.id] = c.saldo_actual

  // Cuanto se ha ido en 4x1000
  const totalGmf = movimientos
    .filter((m) => m.categoria === 'GMF')
    .reduce((s, m) => s + m.monto, 0)

  return (
    <>
      <Header
        title="Tesoreria"
        subtitle="Todo el dinero de la empresa: cuentas, movimientos y reserva de impuestos"
      />

      <div className="p-8 space-y-8">
        {errLibro && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-900 font-medium">No se pudo leer el libro de tesoreria</p>
              <p className="text-xs text-red-700 mt-1">{errLibro}</p>
              <p className="text-xs text-red-700 mt-1">
                Si dice que no existe la relacion, falta ejecutar la migracion 023 en Supabase.
              </p>
            </div>
          </div>
        )}

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-500">En cuentas operativas</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-3 tabular-nums">{formatCOP(saldoOperativo)}</p>
            <p className="text-xs text-gray-400 mt-1">Plata con la que puedes operar</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <PiggyBank className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm font-medium text-gray-500">Apartado para impuestos</p>
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-3 tabular-nums">{formatCOP(saldoReservas)}</p>
            <p className="text-xs text-gray-400 mt-1">Esta plata no es tuya, es de la DIAN</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 rounded-xl">
                <Landmark className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-sm font-medium text-gray-500">Total en bancos</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-3 tabular-nums">{formatCOP(saldoTotal)}</p>
            <p className="text-xs text-gray-400 mt-1">Lo que suman todas las cuentas</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-50 rounded-xl">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-500">Disponible real</p>
            </div>
            <p className={`text-2xl font-bold mt-3 tabular-nums ${posicion.disponible_real >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCOP(posicion.disponible_real)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {saldoOperativo > 0
                ? `${formatCOP(saldoOperativo)} menos ${formatCOP(posicion.impuestos_sin_apartar)} de impuestos${posicion.cuentas_por_pagar > 0 ? ` y ${formatCOP(posicion.cuentas_por_pagar)} de deudas` : ''}`
                : 'Descontando impuestos y deudas'}
            </p>
          </div>
        </div>

        {/* Lo que se ha ido en 4x1000, mes por mes */}
        {totalGmf > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-slate-100 rounded-xl">
                  <Landmark className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Lo que se lleva el banco (4x1000)</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Gasto financiero. No afecta el margen de las ventas, si el resultado operativo.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Total acumulado</p>
                <p className="text-xl font-bold text-slate-700 tabular-nums">{formatCOP(totalGmf)}</p>
              </div>
            </div>

            {gmfPeriodos.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">Mes</th>
                      <th className="px-6 py-3 text-center font-medium">Transacciones</th>
                      <th className="px-6 py-3 text-right font-medium">Plata que se movio</th>
                      <th className="px-6 py-3 text-right font-medium">4x1000 pagado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {gmfPeriodos.map((g) => (
                      <tr key={g.mes} className="hover:bg-gray-50/60">
                        <td className="px-6 py-3 font-medium text-gray-700">{g.mes}</td>
                        <td className="px-6 py-3 text-center text-gray-500">{g.num_transacciones}</td>
                        <td className="px-6 py-3 text-right tabular-nums text-gray-500">
                          {formatCOP(g.base_aproximada)}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums font-medium text-slate-700">
                          {formatCOP(g.gmf_pagado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-6 py-4 bg-slate-50/60 border-t border-gray-100">
              <p className="text-xs text-slate-600 leading-relaxed">
                El banco cobra 4 pesos por cada mil que sale. Cada salida genera su cobro automaticamente.
                Si en alguna transaccion el banco NO lo cobro, filtra por &quot;4x1000 (GMF)&quot; en el libro
                de abajo y borralo con el icono de basura.
              </p>
            </div>
          </div>
        )}

        {/* ===== AUDITORIA DE INTEGRIDAD =====
            Todo lo que esta descuadrado en el circuito del dinero, en un
            solo lugar. Si no hay nada, sale el sello verde: el dueno no
            tiene que revisar con calculadora para saber si puede confiar. */}
        {hallazgos.length === 0 ? (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-green-900">Las cuentas cuadran</p>
              <p className="text-green-800 mt-0.5">
                Se revisaron el 4x1000 de cada movimiento, los costos de cada venta, los
                documentos soporte, los gastos repartidos y los totales de cada cotizacion.
                No hay descuadres.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-red-300 overflow-hidden">
            <div className="px-6 py-5 border-b border-red-100 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-900">
                    Auditoria: {hallazgos.length} descuadre{hallazgos.length !== 1 ? 's' : ''} en las cuentas
                    {graves > 0 && ` (${graves} grave${graves !== 1 ? 's' : ''})`}
                  </h3>
                  <p className="text-sm text-red-800 mt-1">
                    Revisado automaticamente: banco contra 4x1000, costos por producto,
                    documentos soporte, gastos repartidos y totales de cada venta.
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-2.5 text-left font-medium">Area</th>
                    <th className="px-4 py-2.5 text-left font-medium">Que esta mal</th>
                    <th className="px-4 py-2.5 text-left font-medium">Donde</th>
                    <th className="px-6 py-2.5 text-right font-medium">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {hallazgos.map((h, i) => (
                    <tr key={i} className={h.gravedad === 'GRAVE' ? 'bg-red-50/40' : ''}>
                      <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          h.gravedad === 'GRAVE'
                            ? 'bg-red-100 text-red-800 font-medium'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {h.area}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-800">{h.problema}</td>
                      <td className="px-4 py-3 text-gray-600">{h.detalle}</td>
                      <td className="px-6 py-3 text-right tabular-nums font-semibold text-red-700">
                        {formatCOP(Math.abs(h.diferencia))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== DESCUADRE CONTRA EL BANCO =====
            El 4x1000 delata cuando el monto guardado no es el que salio. */}
        {descuadres.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-red-300 overflow-hidden">
            <div className="px-6 py-5 border-b border-red-100 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-900">
                    El saldo no cuadra con el banco: falta registrar {formatCOP(totalSinRegistrar)}
                  </h3>
                  <p className="text-sm text-red-800 mt-1 leading-relaxed">
                    El 4x1000 lo calcula el banco sobre la plata que de verdad salio. En
                    {descuadres.length === 1 ? ' este movimiento' : ` estos ${descuadres.length} movimientos`} el
                    4x1000 cobrado no corresponde al monto que quedo guardado, asi que el monto
                    esta incompleto. Revisa la factura y corrige el valor.
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-2.5 text-left font-medium">Movimiento</th>
                    <th className="px-4 py-2.5 text-right font-medium">Registramos</th>
                    <th className="px-4 py-2.5 text-right font-medium">4x1000 cobrado</th>
                    <th className="px-4 py-2.5 text-right font-medium">Vio el banco</th>
                    <th className="px-6 py-2.5 text-right font-medium">Falta registrar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {descuadres.map((d) => (
                    <tr key={d.movimiento_id}>
                      <td className="px-6 py-3">
                        <span className="font-medium text-gray-800">{d.concepto}</span>
                        <span className="block text-xs text-gray-500">
                          {d.fecha ? formatFecha(d.fecha) : ''}{d.cuenta ? ` · ${d.cuenta}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatCOP(d.monto_registrado)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                        {formatCOP(d.gmf_cobrado)}
                        <span className="block text-xs text-gray-400">
                          deberia ser {formatCOP(d.gmf_que_corresponde)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">
                        {formatCOP(d.monto_que_vio_el_banco)}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums font-bold text-red-700">
                        {formatCOP(d.plata_sin_registrar)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-red-50/60 border-t border-red-100">
              <p className="text-xs text-red-800 leading-relaxed">
                Corrige el monto desde el modulo donde se creo (Gastos o Compras). Al guardarlo,
                el 4x1000 se recalcula solo y esta alerta desaparece. Si el banco de verdad no
                cobro ese 4x1000, borra la fila del GMF en el libro de abajo.
              </p>
            </div>
          </div>
        )}

        {/* Reserva de impuestos */}
        <WidgetReserva estado={reserva} cuentas={cuentasSelect} />

        {/* Cuentas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-800">Cuentas</h3>
              <p className="text-sm text-gray-500 mt-0.5">Saldo de cada cuenta segun los movimientos registrados</p>
            </div>
            <AccionesTesoreria cuentas={cuentasSelect} saldos={saldos} />
          </div>

          {cuentasSaldo.length === 0 ? (
            <div className="py-16 text-center">
              <Landmark className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-gray-500 mt-3 text-sm">
                No hay cuentas creadas. Necesitas al menos una cuenta operativa y una de reserva de impuestos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Cuenta</th>
                    <th className="px-6 py-3 text-left font-medium">Banco</th>
                    <th className="px-6 py-3 text-right font-medium">Saldo inicial</th>
                    <th className="px-6 py-3 text-right font-medium">Entradas</th>
                    <th className="px-6 py-3 text-right font-medium">Salidas</th>
                    <th className="px-6 py-3 text-right font-medium">Saldo actual</th>
                    <th className="px-6 py-3 text-center font-medium">Movs.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cuentasSaldo.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/60">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800">{c.nombre}</p>
                          {c.es_reserva && (
                            <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
                              Reserva
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{c.tipo}</p>
                      </td>
                      <td className="px-6 py-3.5 text-gray-600">
                        {c.banco ?? '—'}
                        {c.numero_cuenta ? <span className="text-xs text-gray-400 block">{c.numero_cuenta}</span> : null}
                      </td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-gray-500">{formatCOP(c.saldo_inicial)}</td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-green-600">{formatCOP(c.total_ingresos)}</td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-red-600">{formatCOP(c.total_egresos)}</td>
                      <td className={`px-6 py-3.5 text-right tabular-nums font-bold ${c.saldo_actual >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                        {formatCOP(c.saldo_actual)}
                      </td>
                      <td className="px-6 py-3.5 text-center text-gray-400 text-xs">{c.num_movimientos}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td className="px-6 py-3.5 text-gray-700" colSpan={5}>Total en bancos</td>
                    <td className="px-6 py-3.5 text-right tabular-nums text-gray-900">{formatCOP(saldoTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Libro de movimientos */}
        <LibroTesoreria movimientos={movimientos} cuentas={cuentasSelect} />
      </div>
    </>
  )
}
