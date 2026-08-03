import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, ShieldCheck, Truck, ReceiptText, Info, ArrowRight } from 'lucide-react'
import {
  obtenerContenidoSitio,
  obtenerProductoWeb,
  obtenerRelacionadosWeb,
} from '@/lib/queries/sitio'
import { texto, especificaciones } from '@/lib/sitio/contenido'
import { SITIO_URL, urlWhatsapp } from '@/lib/sitio/config'
import GaleriaProducto from '@/components/sitio/GaleriaProducto'
import TarjetaProducto from '@/components/sitio/TarjetaProducto'
import { BloqueAgregarCotizacion } from '@/components/sitio/BotonAgregarCotizacion'
import { IconoWhatsapp } from '@/components/sitio/IconosRedes'
import IconoSitio from '@/components/sitio/IconoSitio'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const producto = await obtenerProductoWeb(params.slug)
  if (!producto) return { title: 'Producto no encontrado' }

  const descripcion =
    producto.descripcion?.slice(0, 160) ??
    `${producto.nombre} disponible en Abastecer Empresarial. Cotiza sin compromiso y recibe respuesta en menos de 24 horas hábiles.`

  return {
    title: producto.nombre,
    description: descripcion,
    alternates: { canonical: `/catalogo/${producto.slug}` },
    openGraph: {
      title: producto.nombre,
      description: descripcion,
      url: `${SITIO_URL}/catalogo/${producto.slug}`,
      images: producto.imagen_url ? [{ url: producto.imagen_url }] : undefined,
    },
  }
}

export default async function PaginaProducto({ params }: Props) {
  const producto = await obtenerProductoWeb(params.slug)
  if (!producto) notFound()

  const [contenido, relacionados] = await Promise.all([
    obtenerContenidoSitio(),
    obtenerRelacionadosWeb(producto, 4),
  ])

  const fotos = [producto.imagen_url, ...producto.imagenes].filter(
    (f): f is string => typeof f === 'string' && f.trim() !== ''
  )
  const especs = especificaciones(producto.ficha)

  const mensajeWhatsapp = `Hola, quiero cotizar este producto de su catálogo web:\n\n${producto.nombre}${
    producto.codigo ? ` (${producto.codigo})` : ''
  }\n${SITIO_URL}/catalogo/${producto.slug}`

  const datosEstructurados = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.nombre,
    sku: producto.codigo,
    description: producto.descripcion ?? undefined,
    brand: producto.marca ? { '@type': 'Brand', name: producto.marca } : undefined,
    category: producto.categoria_nombre ?? undefined,
    image: fotos.length > 0 ? fotos : `${SITIO_URL}/og-abastecer.png`,
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'COP',
      url: `${SITIO_URL}/catalogo/${producto.slug}`,
      seller: { '@type': 'Organization', name: texto(contenido, 'marca_nombre') },
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados) }}
      />

      {/* Ruta de navegacion */}
      <div className="border-b border-marca-100 bg-marca-50/50">
        <nav
          aria-label="Ruta de navegación"
          className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto px-6 py-4 text-xs text-acero-500 scroll-suave"
        >
          <Link href="/" className="shrink-0 transition hover:text-verde-700">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Link href="/catalogo" className="shrink-0 transition hover:text-verde-700">
            Catálogo
          </Link>
          {producto.categoria_slug ? (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <Link
                href={`/catalogo?linea=${producto.categoria_slug}`}
                className="shrink-0 transition hover:text-verde-700"
              >
                {producto.categoria_nombre}
              </Link>
            </>
          ) : null}
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-semibold text-marca-900">{producto.nombre}</span>
        </nav>
      </div>

      <section className="bg-white py-10 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2 lg:gap-14">
          {/* Galeria */}
          <div>
            <GaleriaProducto
              imagenes={fotos}
              nombre={producto.nombre}
              icono={producto.categoria_icono}
            />
          </div>

          {/* Informacion */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {producto.categoria_nombre ? (
                <Link
                  href={`/catalogo?linea=${producto.categoria_slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-marca-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-marca-700 transition hover:bg-verde-50 hover:text-verde-700"
                >
                  <IconoSitio nombre={producto.categoria_icono} className="h-3.5 w-3.5" />
                  {producto.categoria_nombre}
                </Link>
              ) : null}
              {producto.codigo ? (
                <span className="rounded-full border border-marca-100 px-3 py-1.5 font-mono text-[11px] text-acero-500">
                  {producto.codigo}
                </span>
              ) : null}
            </div>

            {producto.marca ? (
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-verde-600">
                {producto.marca}
              </p>
            ) : null}

            <h1 className="mt-2 font-marca text-3xl font-extrabold leading-tight tracking-tight text-marca-900 sm:text-4xl">
              {producto.nombre}
            </h1>

            {producto.descripcion ? (
              <p className="mt-5 whitespace-pre-line text-[15.5px] leading-relaxed text-acero-600">
                {producto.descripcion}
              </p>
            ) : null}

            {/* Nota de precio */}
            <div className="mt-7 flex gap-3 rounded-2xl border border-oro-200 bg-oro-50 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-oro-600" />
              <div>
                <p className="font-marca text-sm font-bold text-marca-900">
                  Precio según cotización
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-acero-600">
                  {texto(contenido, 'catalogo_nota')}
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-6 space-y-3">
              <BloqueAgregarCotizacion
                producto={{
                  id: producto.id,
                  slug: producto.slug,
                  codigo: producto.codigo,
                  nombre: producto.nombre,
                  unidad_medida: producto.unidad_medida,
                }}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <a
                  href={urlWhatsapp(contenido, mensajeWhatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-verde-200 bg-verde-50 px-5 py-3.5 text-sm font-bold text-verde-700 transition hover:bg-verde-100"
                >
                  <IconoWhatsapp className="h-4 w-4" />
                  Cotizar por WhatsApp
                </a>
                <Link
                  href="/cotizacion"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-marca-200 px-5 py-3.5 text-sm font-bold text-marca-900 transition hover:bg-marca-50"
                >
                  Ver mi lista
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Sellos */}
            <ul className="mt-8 grid gap-3 border-t border-marca-100 pt-7 sm:grid-cols-3">
              {[
                { icono: ShieldCheck, texto: 'Productos certificados' },
                { icono: Truck, texto: 'Entregas programadas' },
                { icono: ReceiptText, texto: 'Factura electrónica' },
              ].map(({ icono: Icono, texto: etiqueta }) => (
                <li key={etiqueta} className="flex items-center gap-2.5 text-[13px] text-acero-600">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-marca-50 text-verde-600">
                    <Icono className="h-4 w-4" />
                  </span>
                  {etiqueta}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Ficha tecnica */}
      {especs.length > 0 ? (
        <section className="border-t border-marca-100 bg-marca-50/40 py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="font-marca text-2xl font-extrabold tracking-tight text-marca-900">
              Especificaciones técnicas
            </h2>
            <div className="mt-6 overflow-hidden rounded-2xl border border-marca-100 bg-white">
              <dl className="divide-y divide-marca-50">
                {especs.map((esp) => (
                  <div key={esp.atributo} className="grid gap-1 px-5 py-4 sm:grid-cols-3 sm:gap-4">
                    <dt className="text-[13px] font-bold uppercase tracking-wide text-acero-500">
                      {esp.atributo}
                    </dt>
                    <dd className="text-[15px] text-marca-900 sm:col-span-2">{esp.valor || '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      ) : null}

      {/* Relacionados */}
      {relacionados.length > 0 ? (
        <section className="border-t border-marca-100 bg-white py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-marca text-2xl font-extrabold tracking-tight text-marca-900">
                También te puede interesar
              </h2>
              {producto.categoria_slug ? (
                <Link
                  href={`/catalogo?linea=${producto.categoria_slug}`}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-verde-700 transition hover:gap-2.5"
                >
                  Ver toda la línea
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relacionados.map((relacionado) => (
                <TarjetaProducto key={relacionado.id} producto={relacionado} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}
