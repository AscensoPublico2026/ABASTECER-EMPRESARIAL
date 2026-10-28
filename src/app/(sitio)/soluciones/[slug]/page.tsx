import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Search } from 'lucide-react'
import { obtenerContenidoSitio, obtenerLineasWeb } from '@/lib/queries/sitio'
import { urlWhatsapp } from '@/lib/sitio/config'
import {
  DISENO,
  LINEAS,
  PROMOCIONALES,
  SENALES,
  imagenFoto,
  imagenProducto,
  lineaPorSlug,
} from '@/lib/sitio/portafolio'
import { AVISO_LEGAL, SECTORES } from '@/lib/sitio/textos'
import {
  BotonWhatsapp,
  CabeceraPagina,
  Marca,
  PrincipalesYConsulta,
  TarjetaPortafolio,
} from '@/components/sitio/portafolio-ui'
import { BandaBordado, SeccionCTA } from '@/components/sitio/secciones'

export function generateStaticParams() {
  return LINEAS.map((l) => ({ slug: l.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const linea = lineaPorSlug(params.slug)
  if (!linea) return {}
  return {
    title: `${linea.nombre} en Cali`,
    description: `${linea.intro} ${linea.resumen} Cotiza por WhatsApp con Abastecer Empresarial.`,
    alternates: { canonical: `/soluciones/${linea.slug}` },
  }
}

export default async function PaginaLinea({ params }: { params: { slug: string } }) {
  const linea = lineaPorSlug(params.slug)
  if (!linea) notFound()

  const [contenido, lineasWeb] = await Promise.all([obtenerContenidoSitio(), obtenerLineasWeb(true)])
  const indice = LINEAS.findIndex((l) => l.slug === linea.slug)
  const anterior = LINEAS[(indice - 1 + LINEAS.length) % LINEAS.length]
  const siguiente = LINEAS[(indice + 1) % LINEAS.length]
  const referencias = lineasWeb.filter((l) => linea.catalogo.includes(l.slug))
  const sectores = SECTORES.filter((s) => s.lineas.includes(linea.slug))
  const extra = ['identificacion-y-promocionales', 'fechas-especiales-y-diseno'].includes(linea.slug) ? 1 : 0
  const grande = linea.sublineas.length + extra > 1

  return (
    <>
      <CabeceraPagina
        migas={[
          { nombre: 'Inicio', href: '/' },
          { nombre: 'Líneas de suministro', href: '/soluciones' },
          { nombre: linea.nombre },
        ]}
        antetitulo={`Línea ${linea.numero} de 12`}
        titulo={linea.nombre}
        texto={linea.intro}
      >
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <BotonWhatsapp href={urlWhatsapp(contenido, linea.mensaje)} variante="oro">
            Cotizar esta línea
          </BotonWhatsapp>
          {grande ? (
            <div className="flex flex-wrap gap-2 sm:ml-2 sm:items-center">
              {linea.sublineas.map((s, i) => (
                <a
                  key={s.titulo}
                  href={`#sublinea-${i + 1}`}
                  className="rounded-full border border-white/15 px-4 py-2 text-[12.5px] font-semibold text-white/75 transition hover:border-white/40 hover:text-white"
                >
                  {s.titulo}
                </a>
              ))}
              {extra ? (
                <a
                  href={linea.slug === 'fechas-especiales-y-diseno' ? '#diseno' : '#promocionales'}
                  className="rounded-full border border-white/15 px-4 py-2 text-[12.5px] font-semibold text-white/75 transition hover:border-white/40 hover:text-white"
                >
                  {linea.slug === 'fechas-especiales-y-diseno' ? 'Servicio de diseño gráfico' : 'Productos promocionales'}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </CabeceraPagina>

      <div className="bg-white pb-6 pt-6">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          {linea.sublineas.map((s, i) => {
            const n = s.productos.length
            const cols = n === 10 ? 'lg:grid-cols-4 xl:grid-cols-5' : n % 4 === 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
            const totalBloques = linea.sublineas.length + extra
            return (
              <section key={s.titulo} id={`sublinea-${i + 1}`} className="scroll-mt-28 py-10 lg:py-14">
                <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#16823c]">
                  <Marca />
                  {linea.corto} · {String(i + 1).padStart(2, '0')} de {String(totalBloques).padStart(2, '0')}
                </p>
                <h2 className="mt-3 font-marca text-[1.75rem] font-extrabold leading-tight tracking-[-0.01em] text-marca-900 sm:text-[2.1rem]">
                  {s.titulo}
                </h2>
                <p className="mt-2 max-w-3xl text-[15px] text-acero-500">{s.descripcion}</p>

                <div className={`mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 ${cols}`}>
                  {s.productos.map((p) => (
                    <TarjetaPortafolio key={p.imagen} producto={p} alto={s.productos.length <= 3 ? 'alto' : 'normal'} />
                  ))}
                </div>

                {linea.slug === 'senalizacion-y-demarcacion' ? (
                  <div className="mt-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#16823c]">Avisos en PVC por tipo de señal</p>
                    <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                      {SENALES.map((g) => (
                        <div key={g.tipo} className="rounded-[20px] bg-[#f3f3f3] p-4 pt-3">
                          <span className="block h-1 w-9 rounded-full" style={{ background: g.color }} />
                          <div className="mt-3 space-y-2">
                            {g.imagenes.map((im) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={im} src={imagenProducto(im)} alt={`Aviso de ${g.tipo.toLowerCase()}`} loading="lazy" className="h-16 w-full object-contain sm:h-20" />
                            ))}
                          </div>
                          <p className="mt-3 font-marca text-[14px] font-bold text-marca-900">{g.tipo}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <PrincipalesYConsulta
                  principales={s.principales}
                  nota={s.nota}
                  urlWhatsapp={urlWhatsapp(contenido, `Hola, quiero información y cotización de ${s.titulo.toLowerCase()}.`)}
                />

                {linea.slug === 'dotacion' && i === linea.sublineas.length - 1 ? <BandaBordado contenido={contenido} /> : null}
                {linea.slug === 'dotacion' && i === linea.sublineas.length - 1 ? (
                  <p className="mt-4 text-right text-[12px] text-acero-400">
                    Imágenes referenciales. El logo es un ejemplo de personalización y los tonos de color son aproximados.
                  </p>
                ) : null}
              </section>
            )
          })}

          {linea.slug === 'identificacion-y-promocionales' ? (
            <BloqueFotoTexto
              id="promocionales"
              antetitulo="Identificación · 02 de 02"
              titulo="Productos promocionales y personalizados"
              descripcion="Artículos con tu marca para clientes, colaboradores y eventos."
              foto={imagenFoto('promocionales')}
              cajaTitulo="Tu marca en todo"
              cajaTexto="Manejamos una amplia variedad de productos promocionales y personalizados. Pregúntanos por el que necesitas o envíanos una foto, y con gusto te lo cotizamos."
              listaTitulo="Los más pedidos"
              lista={PROMOCIONALES}
              boton="Envíanos tu foto"
              href={urlWhatsapp(contenido, 'Hola, quiero cotizar productos promocionales con mi marca. Les envío una foto de referencia.')}
            />
          ) : null}

          {linea.slug === 'fechas-especiales-y-diseno' ? (
            <BloqueFotoTexto
              id="diseno"
              antetitulo="Diseño · 02 de 02"
              titulo="Servicio de diseño gráfico"
              descripcion="Diseñamos las piezas de tu empresa y te las entregamos listas para producir."
              foto={imagenFoto('diseno')}
              cajaTitulo="Tu idea, lista para producir"
              cajaTexto="Contamos con diseñador gráfico para crear o ajustar las piezas que necesites. Cuéntanos tu idea o envíanos una referencia, y te proponemos el diseño."
              listaTitulo="Lo que diseñamos"
              lista={DISENO}
              boton="Cuéntanos tu idea"
              href={urlWhatsapp(contenido, 'Hola, quiero cotizar el servicio de diseño gráfico.')}
            />
          ) : null}

          {/* Referencias publicadas + sectores */}
          {referencias.length > 0 || sectores.length > 0 ? (
            <div className="grid gap-4 border-t border-[#e3e6ea] py-10 lg:grid-cols-2">
              {referencias.length > 0 ? (
                <div className="rounded-[22px] bg-[#f6f7f8] p-6 sm:p-7">
                  <p className="flex items-center gap-2 font-marca text-[16px] font-bold text-marca-900">
                    <Search className="h-4 w-4 text-[#16823c]" />
                    Busca referencias específicas
                  </p>
                  <p className="mt-1.5 text-[14px] text-acero-500">Consulta las referencias publicadas en nuestro catálogo en línea.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {referencias.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/catalogo?linea=${r.slug}`}
                        className="rounded-full border border-[#d8dbde] bg-white px-4 py-2 text-[13px] font-semibold text-marca-900 transition hover:border-marca-900"
                      >
                        {r.nombre} <span className="text-acero-400">({r.total_productos})</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
              {sectores.length > 0 ? (
                <div className="rounded-[22px] bg-[#f6f7f8] p-6 sm:p-7">
                  <p className="font-marca text-[16px] font-bold text-marca-900">Ideal para</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {sectores.map((s) => (
                      <Link
                        key={s.nombre}
                        href={`/sectores#${s.icono}`}
                        className="rounded-full bg-marca-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#16823c]"
                      >
                        {s.nombre}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <p className="pb-4 text-[12px] text-acero-400">{AVISO_LEGAL}</p>

          {/* Navegación entre líneas */}
          <nav className="grid gap-3 border-t border-[#e3e6ea] py-8 sm:grid-cols-2" aria-label="Otras líneas">
            <Link href={`/soluciones/${anterior.slug}`} className="group flex items-center gap-4 rounded-[18px] border border-[#e3e6ea] p-4 transition hover:border-marca-900">
              <ArrowLeft className="h-5 w-5 text-acero-400 transition group-hover:-translate-x-0.5 group-hover:text-marca-900" />
              <span>
                <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-acero-400">Línea {anterior.numero}</span>
                <span className="block font-marca text-[15px] font-bold text-marca-900">{anterior.nombre}</span>
              </span>
            </Link>
            <Link href={`/soluciones/${siguiente.slug}`} className="group flex items-center justify-end gap-4 rounded-[18px] border border-[#e3e6ea] p-4 text-right transition hover:border-marca-900">
              <span>
                <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-acero-400">Línea {siguiente.numero}</span>
                <span className="block font-marca text-[15px] font-bold text-marca-900">{siguiente.nombre}</span>
              </span>
              <ArrowRight className="h-5 w-5 text-acero-400 transition group-hover:translate-x-0.5 group-hover:text-marca-900" />
            </Link>
          </nav>
        </div>
      </div>

      <SeccionCTA contenido={contenido} />
    </>
  )
}

function BloqueFotoTexto(props: {
  id: string
  antetitulo: string
  titulo: string
  descripcion: string
  foto: string
  cajaTitulo: string
  cajaTexto: string
  listaTitulo: string
  lista: string[]
  boton: string
  href: string
}) {
  return (
    <section id={props.id} className="scroll-mt-28 border-t border-[#e3e6ea] py-10 lg:py-14">
      <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#16823c]">
        <Marca />
        {props.antetitulo}
      </p>
      <h2 className="mt-3 font-marca text-[1.75rem] font-extrabold leading-tight text-marca-900 sm:text-[2.1rem]">{props.titulo}</h2>
      <p className="mt-2 text-[15px] text-acero-500">{props.descripcion}</p>
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="overflow-hidden rounded-[22px] bg-[#f3f3f3]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={props.foto} alt={props.titulo} loading="lazy" className="h-full max-h-[460px] w-full object-cover" />
        </div>
        <div className="flex flex-col rounded-[22px] bg-marca-900 p-7 text-white sm:p-9">
          <p className="flex items-center gap-2.5 font-marca text-xl font-bold">
            <Marca />
            {props.cajaTitulo}
          </p>
          <p className="mt-4 text-[14.5px] leading-relaxed text-[#b8c2cc]">{props.cajaTexto}</p>
          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-oro-400">{props.listaTitulo}</p>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {props.lista.map((x) => (
              <li key={x} className="flex items-start gap-3 text-[14px] text-white/90">
                <span className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full bg-[#16823c]" />
                {x}
              </li>
            ))}
          </ul>
          <BotonWhatsapp href={props.href} className="mt-8 w-full">
            {props.boton}
          </BotonWhatsapp>
        </div>
      </div>
    </section>
  )
}
