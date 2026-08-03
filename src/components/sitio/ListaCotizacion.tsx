'use client'

import Link from 'next/link'
import { Minus, Plus, Trash2, ClipboardList, ArrowRight, Package } from 'lucide-react'
import { armarMensajeLista, useCotizacion } from './CotizacionProvider'
import { IconoWhatsapp } from './IconosRedes'

export default function ListaCotizacion({ numeroWhatsapp }: { numeroWhatsapp: string }) {
  const { items, cargado, cambiarCantidad, quitar, limpiar } = useCotizacion()

  if (!cargado) {
    return (
      <div className="rounded-2xl border border-marca-100 bg-white p-8">
        <div className="h-4 w-1/3 animate-pulse rounded bg-marca-100" />
        <div className="mt-4 h-16 animate-pulse rounded-xl bg-marca-50" />
        <div className="mt-3 h-16 animate-pulse rounded-xl bg-marca-50" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-marca-200 bg-white p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-marca-50">
          <ClipboardList className="h-7 w-7 text-marca-300" />
        </div>
        <h2 className="font-marca text-xl font-bold text-marca-900">Tu lista está vacía</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-acero-500">
          Recorre el catálogo y agrega los productos que necesitas. Cuando termines, nos envías la
          lista y te devolvemos la cotización formal en menos de 24 horas hábiles.
        </p>
        <Link
          href="/catalogo"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-marca-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-marca-800"
        >
          <Package className="h-4 w-4" />
          Ver el catálogo
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  const enlaceWhatsapp = numeroWhatsapp
    ? `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(armarMensajeLista(items))}`
    : '/contacto'

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-marca-100 bg-white shadow-tarjeta">
        <div className="flex items-center justify-between gap-3 border-b border-marca-100 bg-marca-50/60 px-5 py-4">
          <h2 className="font-marca text-sm font-bold uppercase tracking-wide text-marca-900">
            {items.length} {items.length === 1 ? 'producto' : 'productos'} en tu lista
          </h2>
          <button
            type="button"
            onClick={limpiar}
            className="text-xs font-semibold text-acero-500 transition hover:text-red-600"
          >
            Vaciar lista
          </button>
        </div>

        <ul className="divide-y divide-marca-50">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/catalogo/${item.slug}`}
                  className="font-marca text-[15px] font-bold leading-snug text-marca-900 transition hover:text-verde-700"
                >
                  {item.nombre}
                </Link>
                <p className="mt-0.5 text-xs text-acero-400">
                  {item.codigo ? `${item.codigo} · ` : ''}
                  {item.unidad_medida}
                </p>
              </div>

              <div className="flex items-center rounded-xl border border-marca-100">
                <button
                  type="button"
                  onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-l-xl text-acero-500 transition hover:bg-marca-50 hover:text-marca-900"
                  aria-label={`Disminuir cantidad de ${item.nombre}`}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={item.cantidad}
                  onChange={(e) => cambiarCantidad(item.id, Number(e.target.value))}
                  className="h-10 w-14 border-0 text-center text-sm font-bold text-marca-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label={`Cantidad de ${item.nombre}`}
                />
                <button
                  type="button"
                  onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-r-xl text-acero-500 transition hover:bg-marca-50 hover:text-marca-900"
                  aria-label={`Aumentar cantidad de ${item.nombre}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => quitar(item.id)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-acero-300 transition hover:bg-red-50 hover:text-red-600"
                aria-label={`Quitar ${item.nombre} de la lista`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3 border-t border-marca-100 bg-marca-50/40 px-5 py-4">
          <a
            href={enlaceWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-verde-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-verde-700"
          >
            <IconoWhatsapp className="h-4 w-4" />
            Enviar lista por WhatsApp
          </a>
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 rounded-xl border border-marca-200 bg-white px-5 py-3 text-sm font-semibold text-marca-900 transition hover:bg-marca-50"
          >
            <Plus className="h-4 w-4" />
            Seguir agregando
          </Link>
        </div>
      </div>
    </div>
  )
}
