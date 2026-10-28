import Link from 'next/link'
import { ArrowRight, Download, Target, Telescope } from 'lucide-react'
import IconoSitio from './IconoSitio'
import {
  Antetitulo,
  BotonEnlace,
  BotonWhatsapp,
  Encabezado,
  EsquinaMarca,
  FranjaDiagonal,
  IconoCirculo,
  Marca,
  MosaicoLineas,
  TarjetaPortafolio,
} from './portafolio-ui'
import { texto } from '@/lib/sitio/contenido'
import { urlWhatsapp, urlTelefono, urlCorreo } from '@/lib/sitio/config'
import { LINEAS, lineaPorSlug, type Producto } from '@/lib/sitio/portafolio'
import {
  COMPRAS_ESPECIALES,
  MARCA,
  MISION,
  PILARES,
  QUIENES_SOMOS,
  SECTORES,
  VALORES,
  VISION,
} from '@/lib/sitio/textos'
import type { Contenido } from '@/types/sitio'

// ============================================================
// PORTADA (inicio) — misma composición del catálogo
// ============================================================
export function Portada({ contenido }: { contenido: Contenido }) {
  return (
    <section className="relative overflow-hidden bg-marca-900 text-white">
      <div className="absolute -left-48 top-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(22,130,60,0.25),transparent)]" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-10 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-16 lg:pt-20">
        <div className="flex flex-col justify-center">
          <Antetitulo tono="oro">Portafolio comercial</Antetitulo>
          <h1 className="mt-6 font-marca text-[2.5rem] font-extrabold leading-[1.04] tracking-[-0.02em] sm:text-[3.4rem] lg:text-[4rem]">
            Un solo aliado para <span className="text-oro-400">múltiples necesidades</span> de suministro
          </h1>
          <p className="mt-6 max-w-xl text-[16.5px] leading-[1.7] text-[#b8c2cc]">
            {QUIENES_SOMOS.parrafos[1]}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <BotonWhatsapp href={urlWhatsapp(contenido, 'Hola, quiero solicitar una cotización con Abastecer Empresarial.')} variante="oro">
              Solicita tu cotización
            </BotonWhatsapp>
            <BotonEnlace href="/soluciones" variante="claro">
              Ver las 12 líneas
            </BotonEnlace>
          </div>
          <p className="mt-6 text-[13px] text-white/45">
            WhatsApp {texto(contenido, 'contacto_telefono')} · {texto(contenido, 'contacto_ciudad')}
          </p>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-[28px] ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sitio/fotos/bodega.webp"
              alt="Bodega de suministros empresariales"
              className="aspect-[4/3] h-full w-full object-cover lg:aspect-[5/5.2]"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-marca-900/55 via-transparent to-transparent" />
            <span className="absolute bottom-4 right-5 text-[11px] text-white/60">Imagen referencial</span>
          </div>
          <div className="absolute -bottom-5 left-5 right-5 hidden rounded-2xl border border-white/10 bg-[#15293d]/95 p-4 backdrop-blur sm:block lg:-left-8 lg:right-auto lg:w-[320px]">
            <div className="flex items-center gap-3">
              <span className="font-marca text-4xl font-extrabold text-oro-400">12</span>
              <span className="text-[13px] leading-snug text-white/75">
                líneas de suministro para todas las áreas de tu empresa
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pilares */}
      <div className="relative mx-auto max-w-7xl px-5 pb-14 pt-6 sm:px-6 lg:pb-20 lg:pt-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PILARES.map((p) => (
            <div key={p.titulo} className="rounded-[20px] border border-[#25405a] bg-[#15293d] p-5">
              <div className="flex items-center gap-3">
                <IconoCirculo nombre={p.icono} className="h-10 w-10 rounded-xl" />
                <h2 className="font-marca text-[15px] font-bold">{p.titulo}</h2>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-[#b8c2cc]">{p.texto}</p>
            </div>
          ))}
        </div>
      </div>
      <FranjaDiagonal fondoAbajo="#0d1b2a" className="-mb-px" />
    </section>
  )
}

// ============================================================
// LÍNEAS DE SUMINISTRO — mosaico oscuro (página 2 del catálogo)
// ============================================================
export function SeccionLineas({ conBoton = true }: { conBoton?: boolean }) {
  return (
    <section id="lineas" className="relative overflow-hidden bg-marca-900 py-20 text-white lg:py-28">
      <div className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(22,130,60,0.2),transparent)]" aria-hidden="true" />
      <div className="absolute -right-48 top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(242,183,5,0.1),transparent)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <Encabezado
            invertido
            antetitulo="Nuestras líneas de suministro"
            titulo={
              <>
                Todo lo que tu operación necesita, <span className="text-oro-400">en un solo aliado.</span>
              </>
            }
          />
          <div className="border-l-2 border-oro-400 pl-4 text-right">
            <p className="font-marca text-5xl font-extrabold leading-none">12</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Líneas de suministro</p>
          </div>
        </div>
        <div className="mt-12">
          <MosaicoLineas lineas={LINEAS} />
        </div>
        {conBoton ? (
          <div className="mt-6 flex flex-col items-start gap-5 rounded-[22px] border border-white/15 bg-white/[0.04] p-5 sm:flex-row sm:items-center sm:p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-oro-400 text-marca-900">
              <IconoSitio nombre="lupa" className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="font-marca text-[17px] font-bold">¿No ves lo que necesitas?</p>
              <p className="mt-1 text-[14px] text-white/60">Compras especiales: buscamos alternativas para productos fuera del portafolio.</p>
            </div>
            <Link
              href="/#compras-especiales"
              className="inline-flex items-center gap-2 rounded-full bg-oro-400 px-6 py-3.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-marca-900 transition hover:-translate-y-0.5"
            >
              Cómo funciona
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  )
}

// ============================================================
// DOTACIÓN CON TU LOGO — vitrina
// ============================================================
export function SeccionDotacion({ contenido }: { contenido: Contenido }) {
  const dotacion = lineaPorSlug('dotacion')!
  const vitrina: Producto[] = [
    dotacion.sublineas[0].productos[0],
    dotacion.sublineas[0].productos[1],
    dotacion.sublineas[0].productos[3],
    dotacion.sublineas[1].productos[2],
  ]
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Encabezado
            antetitulo="Línea 01 · Dotación"
            titulo="Tu marca en cada prenda"
            texto="Polos, camisas, overoles, conjuntos y gorras con tu logo bordado o estampado. Te indicamos colores y tallas de cada referencia."
          />
          <BotonEnlace href="/soluciones/dotacion">Ver toda la dotación</BotonEnlace>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {vitrina.map((p) => (
            <TarjetaPortafolio key={p.imagen} producto={p} alto="alto" />
          ))}
        </div>
        <BandaBordado contenido={contenido} />
      </div>
    </section>
  )
}

export function BandaBordado({ contenido }: { contenido: Contenido }) {
  return (
    <div className="relative mt-5 overflow-hidden rounded-[22px] bg-marca-900 p-6 text-white sm:p-8">
      <EsquinaMarca className="absolute bottom-0 right-0 h-10 w-28 sm:h-12 sm:w-36" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-oro-400 text-marca-900">
          <IconoSitio nombre="estrella" className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <p className="font-marca text-xl font-bold">Bordado y estampado con tu logo</p>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-[#c6ccd6]">
            Opciones de personalización según la prenda: puede ser estampado o bordado, en la más alta calidad.
            Para cotizar, envíanos prendas, cantidades, tallas, colores y tu logo.
          </p>
        </div>
        <BotonWhatsapp
          href={urlWhatsapp(contenido, 'Hola, quiero cotizar dotación con bordado o estampado de mi logo.')}
          variante="oro"
          className="lg:mr-24"
        >
          Solicita tu cotización
        </BotonWhatsapp>
      </div>
    </div>
  )
}

// ============================================================
// COMPRAS ESPECIALES — "¿Buscas algo que no aparece?"
// ============================================================
export function SeccionComprasEspeciales({ contenido }: { contenido: Contenido }) {
  return (
    <section id="compras-especiales" className="scroll-mt-28 bg-[#f6f7f8] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <Encabezado
              antetitulo="Compras especiales"
              titulo={COMPRAS_ESPECIALES.titulo}
              texto={COMPRAS_ESPECIALES.texto}
            />
            <p className="mt-10 text-[12px] font-bold uppercase tracking-[0.2em] text-marca-900">Puedes enviarnos</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {COMPRAS_ESPECIALES.puedes_enviar.map((p) => (
                <div key={p.titulo} className="flex items-center gap-3 rounded-2xl border border-[#e3e6ea] bg-white p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marca-900 text-oro-400">
                    <IconoSitio nombre={p.icono} className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-[14px] font-bold leading-tight text-marca-900">{p.titulo}</span>
                    <span className="block text-[12.5px] text-acero-500">{p.texto}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] bg-marca-900 p-7 text-white sm:p-10">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-oro-400">Así funciona</p>
            <ol className="mt-8 space-y-8">
              {COMPRAS_ESPECIALES.pasos.map((p, i) => (
                <li key={p.titulo} className="relative flex gap-5">
                  {i < COMPRAS_ESPECIALES.pasos.length - 1 ? (
                    <span className="absolute left-[19px] top-12 h-[calc(100%-8px)] border-l border-dashed border-white/25" aria-hidden="true" />
                  ) : null}
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oro-400 font-marca text-[17px] font-extrabold text-marca-900">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-marca text-[18px] font-bold">{p.titulo}</p>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#aeb7c4]">{p.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
            <BotonWhatsapp href={urlWhatsapp(contenido, COMPRAS_ESPECIALES.mensaje)} variante="oro" className="mt-10 w-full sm:w-auto">
              Cuéntanos qué necesitas
            </BotonWhatsapp>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// SECTORES (resumen para inicio y nosotros)
// ============================================================
export function SeccionSectores() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Encabezado
            antetitulo="Sectores"
            titulo="Empresas que atendemos"
            texto="Si tu empresa tiene personal, tiene necesidades de abastecimiento. Estos son los sectores donde más trabajamos."
          />
          <BotonEnlace href="/sectores">Ver necesidades por sector</BotonEnlace>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SECTORES.map((s) => (
            <Link
              key={s.nombre}
              href={`/sectores#${s.icono}`}
              className="group flex items-center gap-4 rounded-[18px] border border-[#e3e6ea] bg-white p-4 transition hover:-translate-y-0.5 hover:border-marca-900"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-marca-900 text-oro-400">
                <IconoSitio nombre={s.icono} className="h-6 w-6" />
              </span>
              <span className="font-marca text-[14.5px] font-bold leading-snug text-marca-900">{s.nombre}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// MISIÓN, VISIÓN Y VALORES
// ============================================================
export function SeccionMisionVision() {
  return (
    <section id="mision-vision" className="bg-[#f6f7f8] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <Encabezado
          antetitulo="Nuestra esencia"
          titulo="Lo que nos mueve"
          texto="Más que vender productos, simplificamos el trabajo de las áreas de compras, talento humano y seguridad y salud en el trabajo."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="relative overflow-hidden rounded-[26px] bg-white p-8 ring-1 ring-[#e3e6ea] sm:p-10">
            <Target className="absolute -right-6 -top-6 h-36 w-36 text-[#eef0f3]" strokeWidth={1} aria-hidden="true" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#16823c] text-white">
              <Target className="h-6 w-6" />
            </span>
            <h3 className="relative mt-6 font-marca text-2xl font-extrabold text-marca-900">Misión</h3>
            <p className="relative mt-4 text-[15.5px] leading-[1.8] text-acero-600">{MISION}</p>
          </article>
          <article className="relative overflow-hidden rounded-[26px] bg-marca-900 p-8 text-white sm:p-10">
            <Telescope className="absolute -right-6 -top-6 h-36 w-36 text-white/[0.05]" strokeWidth={1} aria-hidden="true" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-oro-400 text-marca-900">
              <Telescope className="h-6 w-6" />
            </span>
            <h3 className="relative mt-6 font-marca text-2xl font-extrabold">Visión</h3>
            <p className="relative mt-4 text-[15.5px] leading-[1.8] text-white/70">{VISION}</p>
          </article>
        </div>

        <p className="mt-16 flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#16823c]">
          <Marca />
          Nuestros valores
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {VALORES.map((v) => (
            <div key={v.titulo} className="rounded-[20px] bg-white p-6 ring-1 ring-[#e3e6ea]">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef6f0] text-[#16823c]">
                <IconoSitio nombre={v.icono} className="h-5 w-5" />
              </span>
              <h4 className="mt-5 font-marca text-[15px] font-bold text-marca-900">{v.titulo}</h4>
              <p className="mt-2 text-[13.5px] leading-relaxed text-acero-500">{v.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// QUIÉNES SOMOS (texto ampliado, para /nosotros)
// ============================================================
export function SeccionQuienesSomos() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <div>
          <Encabezado antetitulo="Quiénes somos" titulo="El aliado que le simplifica el abastecimiento a tu empresa" />
          <div className="mt-10 overflow-hidden rounded-[26px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sitio/fotos/bodega.webp" alt="Bodega de suministros" className="aspect-[16/10] w-full object-cover" loading="lazy" />
          </div>
        </div>
        <div className="space-y-6 text-[16.5px] leading-[1.8] text-acero-600 lg:pt-12">
          {[...QUIENES_SOMOS.parrafos, ...QUIENES_SOMOS.ampliado].map((p, i) => (
            <p key={i} className={i === 0 ? 'font-marca text-[19px] font-bold leading-snug text-marca-900' : ''}>
              {p}
            </p>
          ))}
          <div className="grid gap-3 pt-4 sm:grid-cols-2">
            {PILARES.map((p) => (
              <div key={p.titulo} className="flex gap-3 rounded-2xl bg-[#f6f7f8] p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marca-900 text-oro-400">
                  <IconoSitio nombre={p.icono} className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-marca text-[14px] font-bold text-marca-900">{p.titulo}</span>
                  <span className="block text-[13px] leading-snug text-acero-500">{p.texto}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// LLAMADO FINAL — "Solicita tu cotización" (página 17)
// ============================================================
export function SeccionCTA({ contenido }: { contenido: Contenido }) {
  const datos = [
    { etiqueta: 'WhatsApp y llamadas', valor: texto(contenido, 'contacto_telefono'), detalle: 'Atención comercial', href: urlWhatsapp(contenido), externo: true, ancho: false },
    { etiqueta: 'Ubicación', valor: texto(contenido, 'contacto_ciudad'), detalle: 'Despachos a todo Colombia', href: '/contacto', externo: false, ancho: false },
    { etiqueta: 'Correo', valor: texto(contenido, 'contacto_email'), detalle: 'Envíanos tu lista de productos o tu orden de compra', href: urlCorreo(contenido, 'Solicitud de cotización'), externo: false, ancho: true },
    { etiqueta: 'Horario de atención', valor: texto(contenido, 'contacto_horario'), detalle: '', href: urlTelefono(contenido), externo: false, ancho: true },
  ]
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:py-28">
        <div className="relative overflow-hidden rounded-[32px] bg-marca-900 px-6 py-12 text-white sm:px-12 lg:px-16 lg:py-16">
          <div className="absolute -right-24 -top-24 h-[380px] w-[380px] rounded-full bg-[radial-gradient(closest-side,rgba(242,183,5,0.14),transparent)]" aria-hidden="true" />
          <EsquinaMarca className="absolute bottom-0 right-0 h-20 w-56 sm:h-24 sm:w-72" />
          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <Antetitulo tono="oro">Hablemos</Antetitulo>
              <h2 className="mt-4 font-marca text-[2.2rem] font-extrabold leading-[1.05] tracking-[-0.015em] sm:text-5xl">
                Solicita tu <span className="text-oro-400">cotización</span>
              </h2>
              <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-white/65">
                Cuéntanos qué productos necesita tu empresa. Preparamos tu cotización según tus cantidades,
                especificaciones y condiciones de suministro.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <BotonWhatsapp href={urlWhatsapp(contenido, 'Hola, quiero solicitar una cotización con Abastecer Empresarial.')} variante="oro">
                  Solicita tu cotización
                </BotonWhatsapp>
                <a
                  href={MARCA.portafolio_pdf}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-4 text-[13px] font-extrabold uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  download
                >
                  <Download className="h-4 w-4" />
                  Descargar portafolio
                </a>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:mb-10">
              {datos.map((d) => (
                <a
                  key={d.etiqueta}
                  href={d.href}
                  target={d.externo ? '_blank' : undefined}
                  rel={d.externo ? 'noopener noreferrer' : undefined}
                  className={`rounded-2xl border border-white/12 bg-white/[0.05] p-4 transition hover:border-white/30 ${d.ancho ? 'sm:col-span-2' : ''}`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-oro-400">{d.etiqueta}</span>
                  <span className={`mt-1.5 block font-marca font-bold leading-snug ${d.etiqueta === 'Horario de atención' ? 'text-[14px]' : 'text-[15px]'}`}>{d.valor}</span>
                  {d.detalle ? <span className="mt-1 block text-[12px] leading-snug text-white/50">{d.detalle}</span> : null}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
