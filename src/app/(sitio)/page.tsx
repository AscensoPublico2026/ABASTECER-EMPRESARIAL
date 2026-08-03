import Link from 'next/link'
import { Search, ArrowRight } from 'lucide-react'
import {
  obtenerContenidoSitio,
  obtenerLineasWeb,
  obtenerDestacadosWeb,
  contarProductosWeb,
} from '@/lib/queries/sitio'
import { texto } from '@/lib/sitio/contenido'
import { SITIO_URL, numeroWhatsapp, urlWhatsapp } from '@/lib/sitio/config'
import { EMPRESA } from '@/lib/empresa'
import FormularioSolicitud from '@/components/sitio/FormularioSolicitud'
import {
  Hero,
  SeccionCifras,
  SeccionLineas,
  SeccionDestacados,
  SeccionBeneficios,
  SeccionMisionVision,
  SeccionProceso,
  SeccionSectores,
  TituloSeccion,
} from '@/components/sitio/secciones'

export default async function PaginaInicio() {
  const [contenido, lineas, destacados, totalProductos] = await Promise.all([
    obtenerContenidoSitio(),
    obtenerLineasWeb(),
    obtenerDestacadosWeb(8),
    contarProductosWeb(),
  ])

  // Datos estructurados para Google (aparece mejor en los resultados)
  const datosEstructurados = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: texto(contenido, 'marca_nombre'),
    legalName: EMPRESA.razon_social,
    url: SITIO_URL,
    logo: `${SITIO_URL}/logo-icono.png`,
    image: `${SITIO_URL}/og-abastecer.png`,
    slogan: texto(contenido, 'marca_slogan'),
    description: texto(contenido, 'marca_descripcion_seo'),
    taxID: EMPRESA.nit,
    email: texto(contenido, 'contacto_email'),
    telephone: `+${numeroWhatsapp(contenido)}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: texto(contenido, 'contacto_direccion'),
      addressLocality: EMPRESA.ciudad,
      addressRegion: EMPRESA.departamento,
      addressCountry: 'CO',
    },
    areaServed: { '@type': 'Country', name: 'Colombia' },
    knowsAbout: lineas.map((l) => l.nombre),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados) }}
      />

      <Hero contenido={contenido} totalProductos={totalProductos} />

      <SeccionCifras contenido={contenido} />

      {/* Buscador rapido del catalogo */}
      <section className="bg-white pt-16 lg:pt-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-marca text-2xl font-extrabold tracking-tight text-marca-900 sm:text-3xl">
            ¿Qué necesita tu empresa hoy?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-acero-500">
            Consulta nuestro catálogo por nombre de producto. Sin registros, sin trámites.
          </p>

          <form action="/catalogo" method="get" className="relative mt-8" role="search">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-acero-400" />
            <input
              type="text"
              name="q"
              placeholder="Casco, guantes, overol, papel higiénico, extintor..."
              className="h-16 w-full rounded-2xl border border-marca-100 bg-white pl-12 pr-36 text-base text-marca-900 shadow-tarjeta outline-none transition placeholder:text-acero-400 focus:border-verde-400 focus:ring-4 focus:ring-verde-100"
              aria-label="Buscar productos en el catálogo"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 flex h-12 -translate-y-1/2 items-center gap-2 rounded-xl bg-marca-900 px-5 text-sm font-bold text-white transition hover:bg-marca-800"
            >
              Buscar
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {lineas.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-acero-400">
                Populares:
              </span>
              {lineas.slice(0, 5).map((linea) => (
                <Link
                  key={linea.id}
                  href={`/catalogo?linea=${linea.slug}`}
                  className="rounded-full border border-marca-100 bg-marca-50/60 px-3.5 py-1.5 text-xs font-semibold text-marca-700 transition hover:border-verde-300 hover:bg-verde-50 hover:text-verde-700"
                >
                  {linea.nombre}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <SeccionDestacados productos={destacados} />

      <SeccionLineas contenido={contenido} lineas={lineas} />

      <SeccionBeneficios contenido={contenido} />

      <SeccionMisionVision contenido={contenido} />

      <SeccionProceso contenido={contenido} />

      <SeccionSectores contenido={contenido} />

      {/* Contacto rapido */}
      <section id="contacto" className="bg-marca-50/60 py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <TituloSeccion
              kicker="Hablemos"
              titulo={texto(contenido, 'cta_titulo')}
              subtitulo={texto(contenido, 'cta_texto')}
              centrado={false}
            />

            <div className="mt-8 space-y-3 text-sm">
              <p className="text-acero-600">
                <span className="font-bold text-marca-900">Atención:</span>{' '}
                {texto(contenido, 'contacto_horario')}
              </p>
              <p className="text-acero-600">
                <span className="font-bold text-marca-900">Cobertura:</span>{' '}
                {texto(contenido, 'contacto_cobertura')}
              </p>
              <p className="text-acero-600">
                <span className="font-bold text-marca-900">Correo:</span>{' '}
                {texto(contenido, 'contacto_email')}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <FormularioSolicitud
              tipo="CONTACTO"
              origen="inicio"
              urlWhatsapp={urlWhatsapp(contenido)}
              titulo="Cuéntanos qué necesitas"
              descripcion="Respondemos en menos de 24 horas hábiles con una cotización formal."
            />
          </div>
        </div>
      </section>
    </>
  )
}
