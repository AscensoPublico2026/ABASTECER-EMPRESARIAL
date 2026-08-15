'use client'

import { useState, useTransition } from 'react'
import { quitarGastoDeVenta, type GastoImputado } from './actions'
import { formatCOP } from '@/lib/format'
import { Loader2, X, Receipt, AlertTriangle } from 'lucide-react'

interface Props {
  imputados: GastoImputado[]
}

/**
 * Muestra QUE gastos esta cargando cada venta, con el monto de cada uno y
 * un boton para quitarlo.
 *
 * Existe porque el informe de la venta solo mostraba el TOTAL de gastos.
 * Si un gasto quedaba imputado a una venta que no le correspondia, el
 * costo se inflaba y la utilidad podia salir negativa, sin ninguna forma
 * de ver de donde venia ese numero ni de corregirlo.
 */
export default function CostosPorVenta({ imputados }: Props) {
  const [pendiente, startTransition] = useTransition()
  const [quitando, setQuitando] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  if (imputados.length === 0) return null

  // Agrupar por venta
  const porVenta = new Map<string, { numero: string; cotizacionId: string; filas: GastoImputado[]; total: number }>()
  for (const it of imputados) {
    const prev = porVenta.get(it.cotizacion_id) ?? {
      numero: it.cotizacion_numero,
      cotizacionId: it.cotizacion_id,
      filas: [],
      total: 0,
    }
    prev.filas.push(it)
    prev.total += it.monto
    porVenta.set(it.cotizacion_id, prev)
  }

  const ventas = Array.from(porVenta.values()).sort((a, b) => b.numero.localeCompare(a.numero))

  function quitar(gastoId: string, cotizacionId: string) {
    const clave = `${gastoId}|${cotizacionId}`
    setQuitando(clave)
    setResultado(null)
    startTransition(async () => {
      const res = await quitarGastoDeVenta(gastoId, cotizacionId)
      setResultado(res)
      setQuitando(null)
      if (res.ok) setTimeout(() => setResultado(null), 4000)
    })
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-gray-100 px-6 py-4">
        <Receipt className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
        <div>
          <h3 className="font-semibold text-gray-800">Que gastos esta cargando cada venta</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Estos montos se restan de la utilidad de cada venta. Si un gasto no
            corresponde a esa venta, quitalo aqui y la utilidad se recalcula sola.
          </p>
        </div>
      </div>

      {resultado && (
        <div
          className={`mx-6 mt-4 rounded-xl px-3 py-2 text-sm ${
            resultado.ok
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {resultado.mensaje}
        </div>
      )}

      <div className="divide-y divide-gray-50">
        {ventas.map((v) => (
          <div key={v.cotizacionId} className="px-6 py-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-blue-600">{v.numero}</span>
              <span className="text-sm font-semibold tabular-nums text-gray-800">
                {formatCOP(v.total)}
              </span>
            </div>
            <ul className="space-y-1.5">
              {v.filas.map((f) => {
                const clave = `${f.gasto_id}|${f.cotizacion_id}`
                const ocupado = pendiente && quitando === clave
                return (
                  <li
                    key={clave}
                    className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-gray-700">{f.concepto}</span>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-gray-800">
                      {formatCOP(f.monto)}
                    </span>
                    <button
                      onClick={() => quitar(f.gasto_id, f.cotizacion_id)}
                      disabled={pendiente}
                      title="Quitar este gasto de esta venta"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {ocupado ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      Quitar
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 border-t border-gray-100 bg-amber-50/50 px-6 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-xs text-amber-800">
          Si la utilidad de una venta te sale negativa o muy baja, revisa aqui: casi
          siempre es un gasto imputado a la venta equivocada.
        </p>
      </div>
    </div>
  )
}
