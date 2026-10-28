import type { Metadata } from 'next'
import Link from 'next/link'
import { obtenerContenidoSitio } from '@/lib/queries/sitio'
import { urlWhatsapp } from '@/lib/sitio/config'
import { lineaPorSlug } from '@/lib/sitio/portafolio'
import { SECTORES } from '@/lib/sitio/textos'
import IconoSitio from '@/components/sitio/IconoSitio'
import { BotonWhatsapp, CabeceraPagina } from '@/components/sitio/portafolio-ui'
import { SeccionCTA } from '@/components/sitio/secciones'

export const metadata: Metadata = {
  title: 'Sectores que atendemos',
  description:
    'Industria, construcción, oficinas, salud, educación, logística, comercio y agroindustria: conoce qué suministramos a cada sector desde Cali.',
  alternates: { canonical: '/sectores' },
}

export default async function PaginaSectores() {
  const contenido = await obtenerContenidoSitio()

  return (
    <>
      <CabeceraPagina
        migas={[{ nombre: 'Inicio', href: '/' }, { nombre: 'Sectores' }]}
        antetitulo="Sectores"
        titulo={
          <>
            Conocemos lo que necesita <span className="text-oro-400">tu sector</span>
          </>
        }
        texto="Si tu empresa tiene personal, tiene necesidades de abastecimiento. Estas son las necesidades que más resolvemos en cada sector y las líneas del portafolio que las cubren."
      />

      <section className="bg-white pb-20 pt-10 lg:pb-28">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 sm:px-6 lg:grid-cols-2">
          {SECTORES.map((s, i) => (
            <article
              key={s.nombre}
              id={s.icono}
              className="flex scroll-mt-28 flex-col rounded-[26px] border border-[#e3e6ea] bg-white p-6 sm:p-8"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-marca-900 text-oro-400">
                  <IconoSitio nombre={s.icono} className="h-7 w-7" />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-acero-400">
                    Sector {String(i + 1).padStart(2, '0')}
                  </p>
                  <h2 className="mt-1 font-marca text-[1.35rem] font-extrabold leading-tight text-marca-900">{s.nombre}</h2>
                </div>
              </div>
              <p className="mt-5 text-[15px] leading-relaxed text-acero-500">{s.descripcion}</p>

              <ul className="mt-5 grid gap-2.5">
                {s.necesidades.map((n) => (
                  <li key={n} className="flex items-start gap-3 text-[14.5px] leading-snug text-marca-900">
                    <span className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full bg-[#16823c]" />
                    {n}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap gap-2">
                {[...s.lineas].sort((a, b) => (lineaPorSlug(a)?.numero ?? '').localeCompare(lineaPorSlug(b)?.numero ?? '')).map((slug) => {
                  const l = lineaPorSlug(slug)
                  return l ? (
                    <Link
                      key={slug}
                      href={`/soluciones/${slug}`}
                      className="rounded-full bg-[#f3f3f3] px-3.5 py-1.5 text-[12.5px] font-semibold text-marca-900 transition hover:bg-marca-900 hover:text-white"
                    >
                      {l.numero} · {l.corto}
                    </Link>
                  ) : null
                })}
              </div>

              <div className="mt-auto pt-7">
                <BotonWhatsapp href={urlWhatsapp(contenido, s.mensaje)} className="w-full sm:w-auto">
                  Cotizar para mi empresa
                </BotonWhatsapp>
              </div>
            </article>
          ))}
        </div>
      </section>

      <SeccionCTA contenido={contenido} />
    </>
  )
}
