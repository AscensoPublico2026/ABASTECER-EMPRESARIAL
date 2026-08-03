'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { Check, Plus, Minus, ClipboardList } from 'lucide-react'
import { useCotizacion } from './CotizacionProvider'
import type { ItemCotizacion } from '@/types/sitio'

type Producto = Omit<ItemCotizacion, 'cantidad'>

/** Boton compacto para las tarjetas del catalogo */
export function BotonAgregarRapido({ producto }: { producto: Producto }) {
  const { agregar, contiene } = useCotizacion()
  const [agregado, setAgregado] = useState(false)
  const yaEsta = contiene(producto.id)

  function alHacerClic(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    agregar(producto, 1)
    setAgregado(true)
    window.setTimeout(() => setAgregado(false), 1600)
  }

  return (
    <button
      type="button"
      onClick={alHacerClic}
      className={clsx(
        'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition',
        agregado || yaEsta
          ? 'bg-verde-600 text-white'
          : 'bg-marca-50 text-marca-900 hover:bg-verde-600 hover:text-white'
      )}
      aria-label={`Agregar ${producto.nombre} a mi lista de cotización`}
    >
      {agregado || yaEsta ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      {agregado ? 'Agregado' : yaEsta ? 'En la lista' : 'Cotizar'}
    </button>
  )
}

/** Selector de cantidad + boton grande, para la ficha del producto */
export function BloqueAgregarCotizacion({ producto }: { producto: Producto }) {
  const { agregar, contiene } = useCotizacion()
  const [cantidad, setCantidad] = useState(1)
  const [agregado, setAgregado] = useState(false)
  const yaEsta = contiene(producto.id)

  function enviar() {
    agregar(producto, cantidad)
    setAgregado(true)
    window.setTimeout(() => setAgregado(false), 2600)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-xl border border-marca-100 bg-white">
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            className="flex h-12 w-12 items-center justify-center rounded-l-xl text-acero-500 transition hover:bg-marca-50 hover:text-marca-900"
            aria-label="Disminuir cantidad"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="number"
            min={1}
            max={9999}
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(1, Math.min(9999, Number(e.target.value) || 1)))}
            className="h-12 w-16 border-0 text-center text-base font-bold text-marca-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            aria-label="Cantidad"
          />
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.min(9999, c + 1))}
            className="flex h-12 w-12 items-center justify-center rounded-r-xl text-acero-500 transition hover:bg-marca-50 hover:text-marca-900"
            aria-label="Aumentar cantidad"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <span className="text-sm text-acero-500">{producto.unidad_medida}</span>
      </div>

      <button
        type="button"
        onClick={enviar}
        className={clsx(
          'flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-bold text-white shadow-sm transition',
          agregado ? 'bg-verde-700' : 'bg-verde-600 hover:bg-verde-700'
        )}
      >
        {agregado ? <Check className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
        {agregado ? 'Agregado a tu lista' : yaEsta ? 'Agregar más a mi lista' : 'Agregar a mi cotización'}
      </button>
    </div>
  )
}
