import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ImagenProducto from './ImagenProducto'
import { BotonAgregarRapido } from './BotonAgregarCotizacion'
import type { ProductoWeb } from '@/types/sitio'

export default function TarjetaProducto({
  producto,
  prioritaria = false,
}: {
  producto: ProductoWeb
  prioritaria?: boolean
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-marca-100 bg-white shadow-tarjeta transition-all duration-300 hover:-translate-y-1 hover:border-verde-200 hover:shadow-marca">
      <Link
        href={`/catalogo/${producto.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-marca-50"
      >
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
          <ImagenProducto
            url={producto.imagen_url}
            alto={producto.nombre}
            icono={producto.categoria_icono}
            prioritaria={prioritaria}
          />
        </div>

        {producto.categoria_nombre ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-marca-700 shadow-sm backdrop-blur">
            {producto.categoria_nombre}
          </span>
        ) : null}

        {producto.destacado_web ? (
          <span className="absolute right-3 top-3 rounded-full bg-oro-400 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-marca-900 shadow-sm">
            Destacado
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {producto.marca ? (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-verde-600">
            {producto.marca}
          </p>
        ) : null}

        <h3 className="font-marca text-[15px] font-bold leading-snug text-marca-900">
          <Link href={`/catalogo/${producto.slug}`} className="transition hover:text-verde-700">
            {producto.nombre}
          </Link>
        </h3>

        {producto.descripcion ? (
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-acero-500">
            {producto.descripcion}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <Link
            href={`/catalogo/${producto.slug}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-marca-700 transition hover:gap-2 hover:text-verde-700"
          >
            Ver detalle
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <BotonAgregarRapido
            producto={{
              id: producto.id,
              slug: producto.slug,
              codigo: producto.codigo,
              nombre: producto.nombre,
              unidad_medida: producto.unidad_medida,
            }}
          />
        </div>
      </div>
    </article>
  )
}
