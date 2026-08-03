'use client'

import { useState, useTransition } from 'react'
import { formatCOP } from '@/lib/format'
import { trasladarAReserva } from '@/app/(dashboard)/tesoreria/actions'
import { PiggyBank, AlertTriangle, CheckCircle2, ArrowRight, Loader2, X } from 'lucide-react'
import type { EstadoReserva } from '@/lib/queries/tesoreria'

interface Props {
  estado: EstadoReserva
  cuentas: { id: string; nombre: string; es_reserva: boolean }[]
}

export default function WidgetReserva({ estado, cuentas }: Props) {
  const [modal, setModal] = useState(false)
  const [cuentaOrigen, setCuentaOrigen] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [pendiente, startTransition] = useTransition()

  const cuentasOperativas = cuentas.filter((c) => !c.es_reserva)
  const falta = estado.falta_trasladar
  const alDia = falta <= 0
  const hayReserva = estado.cuenta_reserva_id !== null

  // Porcentaje de lo que ya esta apartado
  const pct = estado.debe_estar_reservado > 0
    ? Math.min(Math.round((estado.esta_reservado / estado.debe_estar_reservado) * 100), 100)
    : 100

  function abrir() {
    setCuentaOrigen(cuentasOperativas[0]?.id ?? '')
    setMonto(falta > 0 ? String(falta) : '')
    setFecha(new Date().toISOString().slice(0, 10))
    setResultado(null)
    setModal(true)
  }

  function confirmar() {
    const fd = new FormData()
    fd.set('cuenta_origen_id', cuentaOrigen)
    fd.set('fecha', fecha)
    fd.set('monto', monto)

    startTransition(async () => {
      const res = await trasladarAReserva(fd)
      setResultado(res)
      if (res.ok) setTimeout(() => setModal(false), 2200)
    })
  }

  return (
    <>
      <div className={`rounded-2xl border p-6 ${alDia ? 'bg-green-50/60 border-green-200' : 'bg-amber-50/60 border-amber-200'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${alDia ? 'bg-green-100' : 'bg-amber-100'}`}>
              <PiggyBank className={`w-5 h-5 ${alDia ? 'text-green-700' : 'text-amber-700'}`} />
            </div>
            <div>
              <h3 className={`font-semibold ${alDia ? 'text-green-900' : 'text-amber-900'}`}>
                Reserva de impuestos
              </h3>
              <p className={`text-sm mt-0.5 ${alDia ? 'text-green-700' : 'text-amber-700'}`}>
                {alDia
                  ? 'Tienes apartado todo lo que le debes a la DIAN.'
                  : 'Hay plata de impuestos que todavia no has apartado.'}
              </p>
            </div>
          </div>
          {alDia
            ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            : <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />}
        </div>

        {/* Desglose */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div>
            <p className="text-xs text-gray-500">IVA por pagar</p>
            <p className="text-base font-bold text-gray-800 tabular-nums mt-0.5">{formatCOP(estado.iva_por_pagar)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Simple por pagar</p>
            <p className="text-base font-bold text-gray-800 tabular-nums mt-0.5">{formatCOP(estado.simple_por_pagar)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Debe estar apartado</p>
            <p className="text-base font-bold text-blue-700 tabular-nums mt-0.5">{formatCOP(estado.debe_estar_reservado)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Ya esta apartado</p>
            <p className="text-base font-bold text-green-700 tabular-nums mt-0.5">{formatCOP(estado.esta_reservado)}</p>
          </div>
        </div>

        {/* Barra de avance */}
        <div className="mt-4">
          <div className="h-2 bg-white rounded-full overflow-hidden border border-gray-200">
            <div
              className={`h-full transition-all ${alDia ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">{pct}% de los impuestos ya esta apartado</p>
        </div>

        {/* Accion */}
        {!alDia && (
          <div className="mt-5 pt-5 border-t border-amber-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-amber-900">
                  Te falta apartar <strong className="tabular-nums">{formatCOP(falta)}</strong>
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {estado.alcanza_para_trasladar
                    ? `Tienes ${formatCOP(estado.saldo_operativo)} en las cuentas operativas, alcanza.`
                    : `Ojo: solo tienes ${formatCOP(estado.saldo_operativo)} en las cuentas operativas.`}
                </p>
              </div>
              {hayReserva && cuentasOperativas.length > 0 && (
                <button
                  onClick={abrir}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition"
                >
                  Apartar {formatCOP(falta)} <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
            {!hayReserva && (
              <p className="text-xs text-red-600 mt-3">
                No hay ninguna cuenta marcada como reserva. Crea una cuenta de reserva de impuestos para poder apartar la plata.
              </p>
            )}
          </div>
        )}

        {estado.sobra_en_reserva > 0 && (
          <p className="text-xs text-green-700 mt-4 pt-4 border-t border-green-200">
            En la reserva sobran {formatCOP(estado.sobra_en_reserva)} respecto a lo que debes. Puedes devolverlos a la cuenta operativa con un traslado.
          </p>
        )}
      </div>

      {/* Modal de traslado */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-800">Apartar plata para impuestos</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Se registra la salida de la cuenta operativa y la entrada a la reserva
                </p>
              </div>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-900 leading-relaxed">
                  <strong>Importante:</strong> el sistema solo lleva el registro. Tienes que entrar
                  al banco y hacer la transferencia real de la cuenta operativa a la cuenta de reserva.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">De que cuenta sale *</label>
                <select
                  value={cuentaOrigen}
                  onChange={(e) => setCuentaOrigen(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                >
                  {cuentasOperativas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto a apartar *</label>
                  <input
                    type="text"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm tabular-nums"
                  />
                  <p className="text-xs text-gray-400 mt-1">Sugerido: {formatCOP(falta)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                El dinero disponible real no cambia: la plata sigue siendo tuya, solo queda
                separada para que no la gastes por error.
              </p>

              {resultado && (
                <div className={`rounded-xl px-4 py-3 text-sm ${resultado.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {resultado.mensaje}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmar}
                  disabled={pendiente || !cuentaOrigen}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                >
                  {pendiente && <Loader2 className="w-4 h-4 animate-spin" />}
                  Registrar traslado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
