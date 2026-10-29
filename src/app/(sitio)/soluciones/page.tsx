import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { obtenerContenidoSitio } from '@/lib/queries/sitio'
import { urlWhatsapp } from '@/lib/sitio/config'
import { LINEAS, imagenProducto } from '@/lib/sitio/portafolio'
import { MARCA } from '@/lib/sitio/textos'
import { BotonWhatsapp, CabeceraPagina, Encabezado } from '@/components/sitio/portafolio-ui'
import { SeccionComprasEspeciales, SeccionCTA } from '@/components/sitio/secciones'

export const metadata: Metadata = {
  title: 'Líneas de suministro',
  description:
    'Las 12 líneas de suministro de Abastecer Empresarial: dotación, EPP, calzado de seguridad, trabajo en alturas, señalización, emergencias, canecas, ergonomía y tecnología, estanterías, identificación, papelería, aseo, cafetería y fechas especiales.',
  alternates: { canonical: '/soluciones' },
}

export default async function PaginaSoluciones() {
  const contenido = await obtenerContenidoSitio()

  return (
    <>
      <CabeceraPagina
        migas={[{ nombre: 'Inicio', href: '/' }, { nombre: 'Líneas de suministro' }]}
        antetitulo="Nuestras líneas de suministro"
        titulo={
          <>
            Todo lo que tu operación necesita, <span className="text-oro-400">en un solo aliado.</span>
          </>
        }
        texto="Organizamos el portafolio en 12 líneas para que encuentres rápido lo que necesita cada área de tu empresa. Pide de una o de todas: una sola cotización."
      >
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <BotonWhatsapp href={urlWhatsapp(contenido, 'Hola, quiero solicitar una cotización con Abastecer Empresarial.')} variante="oro">
            Solicita tu cotización
          </BotonWhatsapp>
          <a
            href={MARCA.portafolio_pdf}
            download
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-4 text-[13px] font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
          >
            Descargar portafolio PDF
          </a>
        </div>
      </CabeceraPagina>

      <section className="bg-white pb-20 pt-10 lg:pb-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <Encabezado antetitulo="Índice" titulo="Elige una línea" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LINEAS.map((l) => (
              <Link
                key={l.slug}
                href={`/soluciones/${l.slug}`}
                className="group flex flex-col overflow-hidden rounded-[24px] bg-[#f3f3f3] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_44px_-28px_rgba(13,27,42,0.55)]"
              >
                <div className="relative flex h-[210px] items-end justify-center gap-3 px-6 pt-10">
                  <span className="absolute left-5 top-4 font-marca text-[2.6rem] font-extrabold leading-none text-[#d9dee4]">
                    {l.numero}
                  </span>
                  {l.portada.slice(0, 3).map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img}
                      src={imagenProducto(img)}
                      alt=""
                      loading="lazy"
                      className="max-h-[150px] w-auto max-w-[44%] object-contain drop-shadow-[0_8px_8px_rgba(13,27,42,0.16)] transition duration-500 group-hover:scale-[1.05]"
                    />
                  ))}
                </div>
                <div className="m-3 mt-4 flex flex-1 items-center gap-4 rounded-[16px] bg-white p-4">
                  <div className="flex-1">
                    <h2 className="font-marca text-[16px] font-bold leading-tight text-marca-900">{l.nombre}</h2>
                    <p className="mt-1.5 text-[13px] leading-snug text-acero-500">{l.resumen}</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marca-900 text-oro-400 transition group-hover:bg-[#16823c] group-hover:text-white">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SeccionComprasEspeciales contenido={contenido} />
      <SeccionCTA contenido={contenido} />
    </>
  )
}
