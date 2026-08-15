'use client'

import { useState, useTransition } from 'react'
import { repararGastosSinVenta, type GastoPorReparar } from './actions'
import { AlertTriangle, Loader2, Wrench, CheckCircle2 } from 'lucide-react'
import { formatCOP } from '@/lib/format'

interface Props {
  reparables: GastoPorReparar[]
  sinVenta: GastoPorReparar[]
}

/**
 * Aviso que aparece SOLO si hay gastos que deberian estar imputados a una
 * venta y no lo estan. Un boton lo arregla todo de una vez.
 *
 * Existe porque durante un tiempo la bandera es_costo_venta se corrompia
 * al guardar y el vinculo del gasto con la venta nunca se creaba: el
 * gasto no aparecia en el informe y la utilidad de la venta salia
 * inflada. La causa ya esta corregida; esto limpia lo que quedo mal.
 */
export default function AvisoRepararGastos({ reparables, sinVenta }: Props) {
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [oculto, setOculto] = useState(false)
  // Nadie marcado por defecto: solo el dueno sabe cual gasto es costo de
  // cual venta. Marcar todo automaticamente imputo gastos a ventas que no
  // les correspondian y dejo una utilidad negativa.
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())

  if (oculto) return null
  if (reparables.length === 0 && sinVenta.length === 0) return null

  const totalElegido = reparables
    .filter((g) => elegidos.has(g.id))
    .reduce((s, g) => s + g.monto, 0)

  function alternar(id: string) {
    setElegidos((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  function reparar() {
    startTransition(async () => {
      const res = await repararGastosSinVenta(Array.from(elegidos))
      setResultado(res)
      if (res.ok) setTimeout(() => setOculto(true), 8000)
    })
  }

  if (resultado?.ok) {
    return (
      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-900">{resultado.mensaje}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-amber-900">
            Hay gastos que no estan entrando a ninguna venta
          </h3>
          <p className="mt-1 text-sm text-amber-800">
            Estos gastos se registraron con una venta asignada, pero el vinculo no
            se guardo bien. Por eso <strong>no aparecen en el informe de la venta</strong> y
            la utilidad de esas ventas esta mas alta de lo real.
          </p>

          {reparables.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-white p-3">
              <p className="text-xs font-semibold text-gray-700">
                Marca SOLO los gastos que de verdad son costo de esa venta:
              </p>
              <ul className="mt-2 space-y-1">
                {reparables.map((g) => (
                  <li key={g.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-amber-50">
                      <input
                        type="checkbox"
                        checked={elegidos.has(g.id)}
                        onChange={() => alternar(g.id)}
                        className="h-4 w-4 shrink-0 rounded border-gray-300"
                      />
                      <span className="min-w-0 flex-1 truncate text-gray-700">
                        {g.concepto}
                        {g.cotizacion_numero && (
                          <span className="ml-1.5 font-semibold text-gray-900">→ {g.cotizacion_numero}</span>
                        )}
                      </span>
                      <span className="shrink-0 tabular-nums font-medium text-gray-800">
                        {formatCOP(g.monto)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-amber-100 pt-2 text-xs text-gray-500">
                Si un gasto NO es de esa venta, dejalo sin marcar: se queda como gasto
                operativo y no le baja la utilidad a nadie.
              </p>
            </div>
          )}

          {sinVenta.length > 0 && (
            <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold text-red-800">
                {sinVenta.length} gasto(s) perdieron la venta y hay que asignarsela a mano
                (boton Editar en la tabla de abajo):
              </p>
              <ul className="mt-1.5 space-y-1">
                {sinVenta.slice(0, 8).map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 text-xs text-red-700">
                    <span className="truncate">{g.concepto}</span>
                    <span className="shrink-0 tabular-nums font-medium">{formatCOP(g.monto)}</span>
                  </li>
                ))}
                {sinVenta.length > 8 && (
                  <li className="text-xs text-red-400">y {sinVenta.length - 8} mas...</li>
                )}
              </ul>
            </div>
          )}

          {resultado && !resultado.ok && (
            <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {resultado.mensaje}
            </p>
          )}

          {reparables.length > 0 && (
            <button
              onClick={reparar}
              disabled={pendiente || elegidos.size === 0}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-40"
            >
              {pendiente ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
              {pendiente
                ? 'Imputando...'
                : elegidos.size === 0
                  ? 'Marca los gastos que van a la venta'
                  : `Imputar ${elegidos.size} gasto(s) por ${formatCOP(totalElegido)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
