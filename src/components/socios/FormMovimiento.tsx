'use client'

import { useState, useTransition } from 'react'
import { registrarMovimiento } from '@/app/(dashboard)/socios/actions'
import {
  LISTA_TIPOS_MOVIMIENTO,
  TIPOS_MOVIMIENTO,
  type TipoMovimiento,
} from '@/types/socios'
import { formatCOP } from '@/lib/format'
import {
  PlusCircle,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react'

interface FormMovimientoProps {
  socios: { id: string; nombre: string }[]
  deshabilitado?: boolean
}

export default function FormMovimiento({
  socios,
  deshabilitado = false,
}: FormMovimientoProps) {
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState<TipoMovimiento>('APORTE_CAPITAL')
  const [monto, setMonto] = useState('')
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{
    ok: boolean
    mensaje: string
  } | null>(null)

  const meta = TIPOS_MOVIMIENTO[tipo]
  const montoNumerico = Number(monto.replace(/\./g, '').replace(',', '.')) || 0

  function handleSubmit(formData: FormData) {
    setResultado(null)
    startTransition(async () => {
      const res = await registrarMovimiento(formData)
      setResultado(res)
      if (res.ok) {
        setMonto('')
        setTimeout(() => {
          setAbierto(false)
          setResultado(null)
        }, 1500)
      }
    })
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        disabled={deshabilitado}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <PlusCircle className="w-4 h-4" />
        Registrar movimiento
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg my-8 shadow-xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">Registrar movimiento</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Politica #011: todo movimiento debe estar clasificado
            </p>
          </div>
          <button
            onClick={() => {
              setAbierto(false)
              setResultado(null)
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form action={handleSubmit} className="p-6 space-y-5">
          {/* Socio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Socio
            </label>
            <select
              name="socio_id"
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Selecciona un socio...</option>
              {socios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de movimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tipo de movimiento
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LISTA_TIPOS_MOVIMIENTO.map((t) => (
                <button
                  key={t.tipo}
                  type="button"
                  onClick={() => setTipo(t.tipo)}
                  className={`text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition ${
                    tipo === t.tipo
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {t.direccion === 'ENTRA' ? (
                      <ArrowDownLeft className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                    )}
                    {t.etiqueta}
                  </span>
                </button>
              ))}
            </div>
            <input type="hidden" name="tipo" value={tipo} />
            <p className="text-xs text-gray-500 mt-2 leading-relaxed bg-gray-50 p-3 rounded-lg">
              {meta.descripcion}
            </p>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Monto
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                $
              </span>
              <input
                type="text"
                name="monto"
                value={monto}
                onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ''))}
                placeholder="1.000.000"
                required
                inputMode="numeric"
                className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 tabular-nums focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            {montoNumerico > 0 && (
              <p className="text-xs text-gray-500 mt-1.5">
                {formatCOP(montoNumerico)}
              </p>
            )}
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Fecha
            </label>
            <input
              type="date"
              name="fecha"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Descripcion */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descripcion{' '}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              name="descripcion"
              rows={2}
              placeholder="Ej: Aporte inicial para constitucion de la empresa"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Resultado */}
          {resultado && (
            <div
              className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
                resultado.ok
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {resultado.ok ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <span>{resultado.mensaje}</span>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setAbierto(false)
                setResultado(null)
              }}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pendiente}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {pendiente && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
