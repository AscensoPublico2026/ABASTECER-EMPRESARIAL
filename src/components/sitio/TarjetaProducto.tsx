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
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-marca-100 transition-all duration-500 hover:ring-verde-200 hover:shadow-[0_20px_50px_-12px_rgba(13,27,42,0.15)] hover:-translate-y-2">
      {/* Imagen con overlay al hover */}
      <Link
        href={`/catalogo/${producto.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-marca-50"
      >
        <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-110">
          <ImagenProducto
            url={producto.imagen_url}
            alto={producto.nombre}
            icono={producto.categoria_icono}
            prioritaria={prioritaria}
          />
        </div>

        {/* Overlay gradiente al hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-marca-900/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {producto.categoria_nombre ? (
            <span className="rounded-lg bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-marca-800 shadow-md backdrop-blur-sm">
              {producto.categoria_nombre}
            </span>
          ) : null}
        </div>

        {producto.destacado_web ? (
          <span className="absolute right-3 top-3 rounded-lg bg-oro-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-marca-900 shadow-md">
            Destacado
          </span>
        ) : null}

        {/* Botón ver detalle que aparece al hover */}
        <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="flex items-center justify-center gap-2 rounded-xl bg-white/95 px-4 py-3 text-[13px] font-bold text-marca-900 shadow-lg backdrop-blur-sm">
            Ver detalle
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>

      {/* Contenido */}
      <div className="flex flex-1 flex-col p-5">
        {producto.marca ? (
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-verde-600">
            {producto.marca}
          </p>
        ) : null}

        <h3 className="font-marca text-[15px] font-bold leading-snug text-marca-900 transition-colors group-hover:text-verde-700">
          <Link href={`/catalogo/${producto.slug}`}>
            {producto.nombre}
          </Link>
        </h3>

        {producto.descripcion ? (
          <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-relaxed text-acero-500">
            {producto.descripcion}
          </p>
        ) : null}

        {/* Separador y acciones */}
        <div className="mt-auto border-t border-marca-50 pt-4 mt-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-acero-400">
              Precio según cotización
            </span>
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
      </div>
    </article>
  )
}
