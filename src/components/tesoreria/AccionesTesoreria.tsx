'use client'

import { useState, useTransition } from 'react'
import { formatCOP } from '@/lib/format'
import { registrarMovimientoManual, trasladarEntreCuentas } from '@/app/(dashboard)/tesoreria/actions'
import { Plus, ArrowLeftRight, X, Loader2 } from 'lucide-react'

interface Props {
  cuentas: { id: string; nombre: string; es_reserva: boolean }[]
  saldos: Record<string, number>
}

export default function AccionesTesoreria({ cuentas, saldos }: Props) {
  const [modal, setModal] = useState<'manual' | 'traslado' | null>(null)
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [pendiente, startTransition] = useTransition()

  // Movimiento manual
  const [tipo, setTipo] = useState<'INGRESO' | 'EGRESO'>('EGRESO')
  const [categoria, setCategoria] = useState('OTRO')
  const [cuentaId, setCuentaId] = useState('')
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [medioPago, setMedioPago] = useState('Transferencia')
  const [referencia, setReferencia] = useState('')

  // Traslado
  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState('')

  function abrir(cual: 'manual' | 'traslado') {
    setResultado(null)
    setCuentaId(cuentas[0]?.id ?? '')
    setOrigenId(cuentas.find((c) => !c.es_reserva)?.id ?? cuentas[0]?.id ?? '')
    setDestinoId(cuentas.find((c) => c.es_reserva)?.id ?? cuentas[1]?.id ?? '')
    setMonto('')
    setConcepto('')
    setReferencia('')
    setFecha(new Date().toISOString().slice(0, 10))
    setModal(cual)
  }

  function guardarManual() {
    const fd = new FormData()
    fd.set('cuenta_id', cuentaId)
    fd.set('tipo', tipo)
    fd.set('categoria', categoria)
    fd.set('fecha', fecha)
    fd.set('monto', monto)
    fd.set('concepto', concepto)
    fd.set('medio_pago', medioPago)
    fd.set('referencia', referencia)

    startTransition(async () => {
      const res = await registrarMovimientoManual(fd)
      setResultado(res)
      if (res.ok) setTimeout(() => setModal(null), 1800)
    })
  }

  function guardarTraslado() {
    const fd = new FormData()
    fd.set('cuenta_origen_id', origenId)
    fd.set('cuenta_destino_id', destinoId)
    fd.set('fecha', fecha)
    fd.set('monto', monto)
    fd.set('concepto', concepto)

    startTransition(async () => {
      const res = await trasladarEntreCuentas(fd)
      setResultado(res)
      if (res.ok) setTimeout(() => setModal(null), 1800)
    })
  }

  const saldoOrigen = saldos[origenId] ?? 0
  const montoNum = Number(monto.replace(/\./g, '').replace(',', '.')) || 0
  const noAlcanza = montoNum > 0 && montoNum > saldoOrigen

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => abrir('manual')}
          disabled={cuentas.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Movimiento manual
        </button>
        <button
          onClick={() => abrir('traslado')}
          disabled={cuentas.length < 2}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
        >
          <ArrowLeftRight className="w-4 h-4" /> Trasladar entre cuentas
        </button>
      </div>

      {/* MODAL MOVIMIENTO MANUAL */}
      {modal === 'manual' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4 sticky top-0 bg-white">
              <div>
                <h3 className="font-semibold text-gray-800">Movimiento manual</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Para plata que entra o sale y no viene de una venta, compra o gasto
                </p>
              </div>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Entra o sale */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipo('INGRESO')}
                  className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition ${tipo === 'INGRESO' ? 'border-green-400 bg-green-50 text-green-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  Entra dinero
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('EGRESO')}
                  className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition ${tipo === 'EGRESO' ? 'border-red-400 bg-red-50 text-red-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  Sale dinero
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta *</label>
                <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({formatCOP(saldos[c.id] ?? 0)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">De que se trata *</label>
                <input
                  type="text"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder="Ej: PAGO DEL IVA BIMESTRE 3"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <input
                    type="text"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                    <option value="OTRO">Otro</option>
                    <option value="PAGO_IMPUESTO">Pago de impuesto</option>
                    <option value="AJUSTE">Ajuste de saldo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medio de pago</label>
                  <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="PSE">PSE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Numero de transaccion, recibo, etc."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <p className="text-xs text-gray-500">
                Usa esto solo para casos sueltos. Si es un gasto de la empresa registralo en
                Gastos, y si es una compra a proveedor en Compras, para que quede el soporte
                y el IVA descontable.
              </p>

              {resultado && (
                <div className={`rounded-xl px-4 py-3 text-sm ${resultado.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {resultado.mensaje}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  onClick={guardarManual}
                  disabled={pendiente}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {pendiente && <Loader2 className="w-4 h-4 animate-spin" />}
                  Registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRASLADO */}
      {modal === 'traslado' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-800">Trasladar entre cuentas</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Mueve plata de una cuenta a otra. El total de la empresa no cambia.
                </p>
              </div>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">De que cuenta sale *</label>
                <select value={origenId} onChange={(e) => setOrigenId(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} ({formatCOP(saldos[c.id] ?? 0)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">A que cuenta entra *</label>
                <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                  {cuentas.filter((c) => c.id !== origenId).map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} ({formatCOP(saldos[c.id] ?? 0)})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <input
                    type="text"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0"
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm tabular-nums ${noAlcanza ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  />
                  {noAlcanza && (
                    <p className="text-xs text-red-600 mt-1">
                      Esa cuenta solo tiene {formatCOP(saldoOrigen)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <input
                  type="text"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder="Ej: APARTAR PLATA DE IMPUESTOS"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-900 leading-relaxed">
                  Se registran dos movimientos emparejados: la salida de una cuenta y la
                  entrada a la otra. Si borras uno se borra el otro.
                </p>
              </div>

              {resultado && (
                <div className={`rounded-xl px-4 py-3 text-sm ${resultado.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {resultado.mensaje}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  onClick={guardarTraslado}
                  disabled={pendiente || noAlcanza || !origenId || !destinoId}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {pendiente && <Loader2 className="w-4 h-4 animate-spin" />}
                  Trasladar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
