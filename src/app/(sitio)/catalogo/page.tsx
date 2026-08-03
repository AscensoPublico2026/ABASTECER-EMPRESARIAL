import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, PackageSearch, ChevronRight } from 'lucide-react'
import { buscarCatalogoWeb, obtenerContenidoSitio, obtenerLineasWeb } from '@/lib/queries/sitio'
import { texto } from '@/lib/sitio/contenido'
import { urlWhatsapp } from '@/lib/sitio/config'
import BuscadorCatalogo from '@/components/sitio/BuscadorCatalogo'
import TarjetaProducto from '@/components/sitio/TarjetaProducto'
import IconoSitio from '@/components/sitio/IconoSitio'
import { IconoWhatsapp } from '@/components/sitio/IconosRedes'
import Reveal from '@/components/sitio/Reveal'

const POR_PAGINA = 24

interface Props {
  searchParams: { q?: string; linea?: string; pagina?: string }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [contenido, lineas] = await Promise.all([obtenerContenidoSitio(), obtenerLineasWeb()])
  const linea = lineas.find((l) => l.slug === searchParams.linea)
  const busqueda = (searchParams.q ?? '').trim()

  const titulo = linea
    ? `${linea.nombre} — Catálogo`
    : busqueda
      ? `Resultados para "${busqueda}" — Catálogo`
      : texto(contenido, 'catalogo_titulo')

  return {
    title: titulo,
    description: linea?.descripcion_web ?? texto(contenido, 'catalogo_subtitulo'),
    alternates: { canonical: linea ? `/catalogo?linea=${linea.slug}` : '/catalogo' },
    robots: busqueda ? { index: false, follow: true } : { index: true, follow: true },
  }
}

export default async function PaginaCatalogo({ searchParams }: Props) {
  const busqueda = (searchParams.q ?? '').trim()
  const lineaSlug = (searchParams.linea ?? '').trim()
  const pagina = Math.max(1, Number(searchParams.pagina) || 1)

  const [contenido, lineas, resultado] = await Promise.all([
    obtenerContenidoSitio(),
    obtenerLineasWeb(),
    buscarCatalogoWeb({ busqueda, linea: lineaSlug, pagina, porPagina: POR_PAGINA }),
  ])

  const { productos, total } = resultado
  const lineaActiva = lineas.find((l) => l.slug === lineaSlug) ?? null
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  const construirUrl = (cambios: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams()
    const base: Record<string, string | number | undefined> = {
      q: busqueda || undefined,
      linea: lineaSlug || undefined,
      pagina: pagina > 1 ? pagina : undefined,
      ...cambios,
    }
    for (const [clave, valor] of Object.entries(base)) {
      if (valor !== undefined && valor !== '' && valor !== null) params.set(clave, String(valor))
    }
    const consulta = params.toString()
    return consulta ? `/catalogo?${consulta}` : '/catalogo'
  }

  return (
    <>
      {/* Encabezado */}
      <section className="relative overflow-hidden bg-marca-900 patron-marca">
        <div className="absolute inset-0 patron-lineas opacity-50" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-6 py-14 lg:py-16">
          <nav aria-label="Ruta de navegación" className="mb-5 flex items-center gap-1.5 text-xs text-white/50">
            <Link href="/" className="transition hover:text-oro-400">
              Inicio
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/catalogo" className="transition hover:text-oro-400">
              Catálogo
            </Link>
            {lineaActiva ? (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-white/80">{lineaActiva.nombre}</span>
              </>
            ) : null}
          </nav>

          <div className="flex flex-wrap items-start gap-5">
            {lineaActiva ? (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-oro-400/15 text-oro-400">
                <IconoSitio nombre={lineaActiva.icono} className="h-7 w-7" />
              </span>
            ) : null}
            <div className="max-w-3xl">
              <h1 className="font-marca text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                {lineaActiva ? lineaActiva.nombre : texto(contenido, 'catalogo_titulo')}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-white/70">
                {lineaActiva?.descripcion_web ?? texto(contenido, 'catalogo_subtitulo')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Buscador + filtros */}
      <section className="sticky top-[68px] z-30 border-b border-marca-100 bg-white/95 backdrop-blur lg:top-[108px]">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <BuscadorCatalogo valorInicial={busqueda} />

          {lineas.length > 0 ? (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scroll-suave">
              <Link
                href={construirUrl({ linea: undefined, pagina: undefined })}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${
                  !lineaSlug
                    ? 'border-marca-900 bg-marca-900 text-white'
                    : 'border-marca-100 bg-white text-acero-600 hover:border-verde-300 hover:text-verde-700'
                }`}
              >
                Todas las líneas
              </Link>
              {lineas.map((linea) => (
                <Link
                  key={linea.id}
                  href={construirUrl({ linea: linea.slug, pagina: undefined })}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition ${
                    lineaSlug === linea.slug
                      ? 'border-verde-600 bg-verde-600 text-white'
                      : 'border-marca-100 bg-white text-acero-600 hover:border-verde-300 hover:text-verde-700'
                  }`}
                >
                  <IconoSitio nombre={linea.icono} className="h-3.5 w-3.5" />
                  {linea.nombre}
                  {linea.total_productos > 0 ? (
                    <span className={lineaSlug === linea.slug ? 'text-white/70' : 'text-acero-400'}>
                      ({linea.total_productos})
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Resultados */}
      <section className="bg-marca-50/40 py-10 lg:py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-acero-500">
              {total === 0 ? (
                'Sin resultados'
              ) : (
                <>
                  <strong className="font-bold text-marca-900">{total}</strong>{' '}
                  {total === 1 ? 'producto' : 'productos'}
                  {busqueda ? (
                    <>
                      {' '}
                      para <strong className="font-bold text-marca-900">“{busqueda}”</strong>
                    </>
                  ) : null}
                  {totalPaginas > 1 ? ` · página ${pagina} de ${totalPaginas}` : ''}
                </>
              )}
            </p>

            {busqueda || lineaSlug ? (
              <Link href="/catalogo" className="text-xs font-bold text-verde-700 hover:underline">
                Limpiar filtros
              </Link>
            ) : null}
          </div>

          {productos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-marca-200 bg-white p-12 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-marca-50">
                <PackageSearch className="h-8 w-8 text-marca-300" />
              </div>
              <h2 className="font-marca text-xl font-bold text-marca-900">
                No encontramos ese producto en el catálogo
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-acero-500">
                Trabajamos <strong className="text-marca-900">bajo pedido</strong>: aunque no esté
                publicado, es muy probable que podamos conseguirlo. Escríbenos y te cotizamos la
                referencia exacta que necesitas.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={urlWhatsapp(
                    contenido,
                    busqueda
                      ? `Hola, busqué "${busqueda}" en su catálogo web y no lo encontré. ¿Me pueden cotizar esta referencia?`
                      : undefined
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-verde-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-verde-700"
                >
                  <IconoWhatsapp className="h-4 w-4" />
                  Pedir por WhatsApp
                </a>
                <Link
                  href="/contacto"
                  className="inline-flex items-center gap-2 rounded-xl border border-marca-200 bg-white px-6 py-3.5 text-sm font-bold text-marca-900 transition hover:bg-marca-50"
                >
                  Enviar solicitud
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {productos.map((producto, i) => (
                <Reveal key={producto.id} retraso={(i % 4) * 60} className="h-full">
                  <TarjetaProducto producto={producto} prioritaria={i < 4} />
                </Reveal>
              ))}
            </div>
          )}

          {/* Paginacion */}
          {totalPaginas > 1 ? (
            <nav
              className="mt-12 flex items-center justify-center gap-2"
              aria-label="Paginación del catálogo"
            >
              {pagina > 1 ? (
                <Link
                  href={construirUrl({ pagina: pagina - 1 })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-marca-200 bg-white px-4 py-2.5 text-sm font-bold text-marca-900 transition hover:bg-marca-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Link>
              ) : null}

              <span className="rounded-xl bg-marca-900 px-4 py-2.5 text-sm font-bold text-white">
                {pagina} / {totalPaginas}
              </span>

              {pagina < totalPaginas ? (
                <Link
                  href={construirUrl({ pagina: pagina + 1 })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-marca-200 bg-white px-4 py-2.5 text-sm font-bold text-marca-900 transition hover:bg-marca-50"
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </nav>
          ) : null}

          <p className="mx-auto mt-12 max-w-2xl rounded-2xl bg-white px-6 py-5 text-center text-[13px] leading-relaxed text-acero-500 shadow-tarjeta">
            {texto(contenido, 'catalogo_nota')}
          </p>
        </div>
      </section>
    </>
  )
}
