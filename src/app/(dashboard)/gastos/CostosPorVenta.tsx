'use client'

import { useState, useTransition } from 'react'
import {
  quitarGastoDeVenta,
  quitarCompraDeVenta,
  recalcularVenta,
  type CostoDeVenta,
} from './actions'
import { formatCOP } from '@/lib/format'
import { Loader2, X, Calculator, AlertTriangle, RefreshCw, ShoppingCart, Receipt } from 'lucide-react'

interface Props {
  ventas: CostoDeVenta[]
}

/**
 * Muestra DE DONDE sale el costo de cada venta, linea por linea, y deja
 * quitar lo que este mal asignado.
 *
 * POR QUE EXISTE
 * Una venta aparecio con utilidad de -2.265.004 y margen de -259%, y no
 * habia forma de saber de donde venia ese costo: el informe solo mostraba
 * totales. El costo tiene dos fuentes (compras asignadas y gastos
 * imputados) y las dos hay que poder verlas y corregirlas.
 */
export default function CostosPorVenta({ ventas }: Props) {
  const [pendiente, startTransition] = useTransition()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [abierta, setAbierta] = useState<string | null>(null)

  if (ventas.length === 0) return null

  // Primero las que tienen la utilidad en rojo: ahi esta el problema
  const ordenadas = [...ventas].sort((a, b) => a.margen_pct - b.margen_pct)
  const sospechosas = ordenadas.filter((v) => v.utilidad < 0 || v.margen_pct < 5)

  function correr(clave: string, fn: () => Promise<{ ok: boolean; mensaje: string }>) {
    setOcupado(clave)
    setResultado(null)
    startTransition(async () => {
      const res = await fn()
      setResultado(res)
      setOcupado(null)
      if (res.ok) setTimeout(() => setResultado(null), 4000)
    })
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-gray-100 px-6 py-4">
        <Calculator className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-800">De donde sale el costo de cada venta</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            El costo de una venta viene de las <strong>compras</strong> que le asignaste y de
            los <strong>gastos</strong> que le imputaste. Aqui ves cada uno. Si algo esta en la
            venta equivocada, quitalo y la utilidad se recalcula sola.
          </p>
        </div>
      </div>

      {sospechosas.length > 0 && (
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-xs text-red-800">
            <strong>
              {sospechosas.length} venta(s) con la utilidad en rojo o muy baja:{' '}
              {sospechosas.map((v) => v.numero).join(', ')}
            </strong>
            . Abrelas y revisa si tienen una compra o un gasto que no les corresponde.
          </p>
        </div>
      )}

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
        {ordenadas.map((v) => {
          const enRojo = v.utilidad < 0
          const descuadre = Math.abs(v.suma_lineas - v.costo_total) > 1
          const abierto = abierta === v.cotizacion_id
          return (
            <div key={v.cotizacion_id} className="px-6 py-4">
              <button
                onClick={() => setAbierta(abierto ? null : v.cotizacion_id)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="text-sm font-semibold text-blue-600">{v.numero}</span>
                <span className="flex items-center gap-4 text-xs">
                  <span className="text-gray-500">
                    Costo <strong className="tabular-nums text-gray-800">{formatCOP(v.costo_total)}</strong>
                  </span>
                  <span className={enRojo ? 'font-semibold text-red-600' : 'text-emerald-600'}>
                    Utilidad <span className="tabular-nums">{formatCOP(v.utilidad)}</span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold tabular-nums ${
                      enRojo ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {v.margen_pct.toFixed(1)}%
                  </span>
                  <span className="text-gray-400">{abierto ? 'ocultar' : 'ver detalle'}</span>
                </span>
              </button>

              {abierto && (
                <div className="mt-3 space-y-1.5">
                  {v.lineas.length === 0 && (
                    <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                      Esta venta no tiene compras ni gastos asignados, pero tiene un costo
                      guardado de {formatCOP(v.costo_total)}. Dale a &quot;Recalcular&quot; para
                      corregirlo.
                    </p>
                  )}

                  {v.lineas.map((l) => {
                    const clave = `${l.origen}|${l.id}`
                    const cargando = pendiente && ocupado === clave
                    return (
                      <div
                        key={clave}
                        className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          {l.origen === 'COMPRA' ? (
                            <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                          ) : (
                            <Receipt className="h-3.5 w-3.5 shrink-0 text-purple-400" />
                          )}
                          <span className="truncate text-xs text-gray-700">{l.descripcion}</span>
                        </span>
                        <span className="shrink-0 text-xs font-medium tabular-nums text-gray-800">
                          {formatCOP(l.monto)}
                        </span>
                        <button
                          onClick={() =>
                            correr(clave, () =>
                              l.origen === 'GASTO'
                                ? quitarGastoDeVenta(l.gasto_id ?? '', v.cotizacion_id)
                                : quitarCompraDeVenta(l.id, v.cotizacion_id),
                            )
                          }
                          disabled={pendiente}
                          title={`Quitar de ${v.numero}`}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {cargando ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                          Quitar
                        </button>
                      </div>
                    )
                  })}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-gray-500">
                      Suma del detalle:{' '}
                      <strong className="tabular-nums">{formatCOP(v.suma_lineas)}</strong>
                      {descuadre && (
                        <span className="ml-2 font-semibold text-red-600">
                          no coincide con el costo guardado ({formatCOP(v.costo_total)}). Dale a
                          Recalcular.
                        </span>
                      )}
                    </p>
                    <button
                      onClick={() => correr(`recalc|${v.cotizacion_id}`, () => recalcularVenta(v.cotizacion_id))}
                      disabled={pendiente}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                    >
                      {pendiente && ocupado === `recalc|${v.cotizacion_id}` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Recalcular utilidad
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
