import { obtenerContenidoSitio } from '@/lib/queries/sitio'
import { texto } from '@/lib/sitio/contenido'
import { SITIO_URL, numeroWhatsapp, urlWhatsapp } from '@/lib/sitio/config'
import { EMPRESA } from '@/lib/empresa'
import { LINEAS } from '@/lib/sitio/portafolio'
import { MARCA } from '@/lib/sitio/textos'
import FormularioSolicitud from '@/components/sitio/FormularioSolicitud'
import { Encabezado } from '@/components/sitio/portafolio-ui'
import {
  Portada,
  SeccionLineas,
  SeccionDotacion,
  SeccionComprasEspeciales,
  SeccionSectores,
  SeccionMisionVision,
} from '@/components/sitio/secciones'

export default async function PaginaInicio() {
  const contenido = await obtenerContenidoSitio()

  // Datos estructurados para Google
  const datosEstructurados = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: MARCA.nombre,
    legalName: EMPRESA.razon_social,
    url: SITIO_URL,
    logo: `${SITIO_URL}/logo-icono.png`,
    image: `${SITIO_URL}/og-abastecer.png`,
    slogan: MARCA.slogan,
    description: MARCA.descripcion_seo,
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
    knowsAbout: LINEAS.map((l) => l.nombre),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados) }}
      />

      <Portada contenido={contenido} />
      <SeccionLineas />
      <SeccionDotacion contenido={contenido} />
      <SeccionComprasEspeciales contenido={contenido} />
      <SeccionSectores />
      <SeccionMisionVision />

      {/* Contacto */}
      <section id="contacto" className="scroll-mt-28 bg-white py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[1fr_1.25fr]">
          <div>
            <Encabezado
              antetitulo="Hablemos"
              titulo="Cuéntanos qué necesita tu empresa"
              texto="Preparamos tu cotización según tus cantidades, especificaciones y condiciones de suministro. Si prefieres, escríbenos directo por WhatsApp."
            />
            <dl className="mt-10 space-y-5 border-t border-[#e3e6ea] pt-8 text-[14.5px]">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-acero-400">WhatsApp</dt>
                <dd className="mt-1 font-marca text-lg font-bold text-marca-900">
                  <a href={urlWhatsapp(contenido)} target="_blank" rel="noopener noreferrer" className="hover:text-[#16823c]">
                    {texto(contenido, 'contacto_telefono')}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-acero-400">Correo</dt>
                <dd className="mt-1 break-words font-semibold text-marca-900">{texto(contenido, 'contacto_email')}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-acero-400">Atención</dt>
                <dd className="mt-1 text-acero-600">{texto(contenido, 'contacto_horario')}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-acero-400">Cobertura</dt>
                <dd className="mt-1 text-acero-600">{texto(contenido, 'contacto_cobertura')}</dd>
              </div>
            </dl>
          </div>
          <FormularioSolicitud
            tipo="CONTACTO"
            origen="inicio"
            urlWhatsapp={urlWhatsapp(contenido)}
            titulo="Solicita tu cotización"
            descripcion="Entre más detalles nos des (productos, cantidades, tallas, colores, fechas), más precisa será la cotización."
          />
        </div>
      </section>
    </>
  )
}
