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
} from '@/lib/queries/tesoreria'
import { formatCOP } from '@/lib/format'
import { Landmark, PiggyBank, Wallet, TrendingUp, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TesoreriaPage() {
  const cuentasSaldo = await obtenerSaldosCuentas()
  const cuentasSelect = await obtenerCuentasParaSelect()
  const { movimientos, error: errLibro } = await obtenerLibroTesoreria()
  const { datos: reserva } = await obtenerEstadoReserva()
  const { datos: posicion } = await obtenerPosicionFinanciera()

  const operativas = cuentasSaldo.filter((c) => !c.es_reserva)
  const reservas = cuentasSaldo.filter((c) => c.es_reserva)

  const saldoOperativo = operativas.reduce((s, c) => s + c.saldo_actual, 0)
  const saldoReservas = reservas.reduce((s, c) => s + c.saldo_actual, 0)
  const saldoTotal = saldoOperativo + saldoReservas

  // Mapa id -> saldo para los modales
  const saldos: Record<string, number> = {}
  for (const c of cuentasSaldo) saldos[c.id] = c.saldo_actual

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
