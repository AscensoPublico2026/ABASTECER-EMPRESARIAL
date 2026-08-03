'use client'

import { useState } from 'react'
import clsx from 'clsx'
import IconoSitio from './IconoSitio'

/**
 * Galeria de la ficha de producto. Si no hay fotos cargadas todavia,
 * muestra un marcador con el icono de la linea (el catalogo nunca se ve roto).
 */
export default function GaleriaProducto({
  imagenes,
  nombre,
  icono,
}: {
  imagenes: string[]
  nombre: string
  icono?: string | null
}) {
  const fotos = imagenes.filter(Boolean)
  const [activa, setActiva] = useState(0)

  if (fotos.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-3xl border border-marca-100 bg-gradient-to-br from-marca-50 via-white to-marca-100 patron-puntos">
        <IconoSitio nombre={icono ?? 'caja'} className="h-24 w-24 text-marca-200" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="aspect-square w-full overflow-hidden rounded-3xl border border-marca-100 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fotos[activa]}
          alt={nombre}
          className="h-full w-full object-contain p-4"
          loading="eager"
          decoding="async"
        />
      </div>

      {fotos.length > 1 ? (
        <div className="flex gap-2.5 overflow-x-auto pb-1 scroll-suave">
          {fotos.map((foto, i) => (
            <button
              key={`${foto}-${i}`}
              type="button"
              onClick={() => setActiva(i)}
              className={clsx(
                'h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition',
                i === activa ? 'border-verde-600' : 'border-marca-100 hover:border-marca-300'
              )}
              aria-label={`Ver imagen ${i + 1} de ${nombre}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto} alt="" className="h-full w-full object-contain p-1.5" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
