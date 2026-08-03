import Link from 'next/link'
import { ArrowRight, Check, Quote, Target, Telescope } from 'lucide-react'
import Reveal from './Reveal'
import IconoSitio from './IconoSitio'
import TarjetaProducto from './TarjetaProducto'
import { IconoWhatsapp } from './IconosRedes'
import { texto, textoOpcional, lineas as lineasDe, filas, parrafos } from '@/lib/sitio/contenido'
import { urlWhatsapp } from '@/lib/sitio/config'
import type { Contenido, LineaWeb, ProductoWeb } from '@/types/sitio'

// ============================================================
// Encabezado de seccion reutilizable
// ============================================================
export function TituloSeccion({
  kicker,
  titulo,
  subtitulo,
  centrado = true,
  invertido = false,
}: {
  kicker?: string
  titulo: string
  subtitulo?: string
  centrado?: boolean
  invertido?: boolean
}) {
  return (
    <div className={centrado ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {kicker ? (
        <p
          className={`mb-3 text-xs font-bold uppercase tracking-[0.18em] ${
            invertido ? 'text-oro-400' : 'text-verde-600'
          }`}
        >
          {kicker}
        </p>
      ) : null}
      <h2
        className={`font-marca text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl ${
          invertido ? 'text-white' : 'text-marca-900'
        }`}
      >
        {titulo}
      </h2>
      {subtitulo ? (
        <p
          className={`mt-4 text-base leading-relaxed ${
            invertido ? 'text-white/70' : 'text-acero-500'
          }`}
        >
          {subtitulo}
        </p>
      ) : null}
    </div>
  )
}

// ============================================================
// HERO - primera pantalla
// ============================================================
export function Hero({ contenido, totalProductos }: { contenido: Contenido; totalProductos: number }) {
  const imagen = textoOpcional(contenido, 'hero_imagen_url')
  const badges = lineasDe(contenido, 'hero_badges')

  return (
    <section className="relative overflow-hidden bg-marca-900 patron-marca">
      <div className="absolute inset-0 patron-lineas opacity-60" aria-hidden="true" />
      {/* Halo verde de la marca */}
      <div
        className="absolute -right-40 top-1/3 h-[420px] w-[420px] rounded-full bg-verde-600/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-16 lg:grid-cols-12 lg:gap-8 lg:pb-32 lg:pt-24">
        {/* Texto */}
        <div className="lg:col-span-7">
          <p className="inline-flex items-center gap-2 rounded-full border border-oro-400/30 bg-oro-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-oro-400 animate-aparecer">
            <span className="h-1.5 w-1.5 rounded-full bg-oro-400" />
            {texto(contenido, 'hero_kicker')}
          </p>

          <h1 className="mt-6 font-marca text-4xl font-extrabold leading-[1.08] tracking-tight text-white animate-aparecer-arriba sm:text-5xl lg:text-[3.4rem]">
            {texto(contenido, 'hero_titulo')}
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
            {texto(contenido, 'hero_subtitulo')}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/catalogo"
              className="group inline-flex items-center gap-2 rounded-xl bg-verde-600 px-7 py-4 text-base font-bold text-white shadow-[0_14px_34px_-14px_rgba(22,130,60,0.9)] transition hover:bg-verde-500"
            >
              {texto(contenido, 'hero_boton_primario')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href={urlWhatsapp(contenido)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-4 text-base font-bold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/10"
            >
              <IconoWhatsapp className="h-4 w-4" />
              {texto(contenido, 'hero_boton_secundario')}
            </a>
          </div>

          {badges.length > 0 ? (
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
              {badges.map((badge) => (
                <li key={badge} className="flex items-center gap-2 text-sm font-medium text-white/60">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-verde-600/25">
                    <Check className="h-3 w-3 text-verde-300" />
                  </span>
                  {badge}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Visual de marca */}
        <div className="relative lg:col-span-5">
          <div className="relative mx-auto max-w-md lg:mt-4">
            {imagen ? (
              <div className="overflow-hidden rounded-3xl border border-white/10 shadow-marca">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagen} alt="Abastecer Empresarial" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="rotate-1 rounded-3xl bg-white p-8 shadow-marca transition-transform duration-500 hover:rotate-0 sm:p-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-web.webp"
                  alt="Abastecer Empresarial S.A.S. - Dotación y EPP para un entorno seguro"
                  width={640}
                  height={640}
                  className="mx-auto h-auto w-full max-w-[300px]"
                />
              </div>
            )}

            {/* Chips flotantes */}
            <div className="absolute -left-3 bottom-6 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-marca sm:-left-8">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-oro-100">
                <IconoSitio nombre="reloj" className="h-5 w-5 text-oro-600" />
              </span>
              <span className="text-left">
                <span className="block text-sm font-extrabold leading-none text-marca-900">24 horas</span>
                <span className="text-[11px] font-medium text-acero-500">Respuesta a cotizaciones</span>
              </span>
            </div>

            <div className="absolute -right-2 top-6 flex items-center gap-2.5 rounded-2xl bg-marca-800/90 px-4 py-3 shadow-marca backdrop-blur sm:-right-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-verde-600/20">
                <IconoSitio nombre="caja" className="h-5 w-5 text-verde-300" />
              </span>
              <span className="text-left">
                <span className="block text-sm font-extrabold leading-none text-white">
                  {totalProductos > 0 ? `${totalProductos}+` : 'Bajo pedido'}
                </span>
                <span className="text-[11px] font-medium text-white/60">
                  {totalProductos > 0 ? 'Productos en catálogo' : 'Conseguimos lo que pidas'}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Borde inferior curvo */}
      <div className="relative">
        <svg
          className="block h-[40px] w-full text-white sm:h-[60px]"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0 60V28c240 26 480 32 720 18S1200 6 1440 0v60H0Z" />
        </svg>
      </div>
    </section>
  )
}

// ============================================================
// CIFRAS
// ============================================================
export function SeccionCifras({ contenido }: { contenido: Contenido }) {
  const cifras = filas(contenido, 'cifras', 2).filter(([valor]) => valor !== '')
  if (cifras.length === 0) return null

  return (
    <section className="border-b border-marca-100 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 lg:grid-cols-4 lg:py-12">
        {cifras.map(([valor, etiqueta], i) => (
          <Reveal key={`${valor}-${etiqueta}`} retraso={i * 80} className="text-center">
            <p className="font-marca text-3xl font-extrabold tracking-tight text-marca-900 sm:text-4xl">
              {valor}
            </p>
            <p className="mt-1.5 text-[13px] font-medium leading-snug text-acero-500">{etiqueta}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// ============================================================
// LINEAS DE PRODUCTO
// ============================================================
export function SeccionLineas({
  contenido,
  lineas,
}: {
  contenido: Contenido
  lineas: LineaWeb[]
}) {
  if (lineas.length === 0) return null

  return (
    <section id="lineas" className="bg-marca-50/60 py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <TituloSeccion
          kicker="Nuestras líneas"
          titulo="Todo lo que tu empresa necesita, organizado por línea"
          subtitulo="Desde la protección de tu personal hasta el café de la sala de juntas. Explora cada línea y arma tu lista."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lineas.map((linea, i) => (
            <Reveal key={linea.id} retraso={(i % 3) * 90}>
              <Link
                href={`/catalogo?linea=${linea.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-marca-100 bg-white p-6 shadow-tarjeta transition-all duration-300 hover:-translate-y-1 hover:border-verde-200 hover:shadow-marca"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-marca-900 text-oro-400 transition-colors duration-300 group-hover:bg-verde-600 group-hover:text-white">
                    <IconoSitio nombre={linea.icono} className="h-6 w-6" />
                  </span>
                  {linea.total_productos > 0 ? (
                    <span className="rounded-full bg-marca-50 px-2.5 py-1 text-[11px] font-bold text-acero-500">
                      {linea.total_productos} {linea.total_productos === 1 ? 'producto' : 'productos'}
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-5 font-marca text-lg font-bold leading-snug text-marca-900">
                  {linea.nombre}
                </h3>

                {linea.descripcion_web ? (
                  <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-acero-500">
                    {linea.descripcion_web}
                  </p>
                ) : null}

                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-verde-700 transition-all group-hover:gap-3">
                  Ver productos
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-acero-500">
            {texto(contenido, 'catalogo_nota')}
          </p>
          <Link
            href="/catalogo"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-marca-900 px-7 py-4 text-sm font-bold text-white transition hover:bg-marca-800"
          >
            Ver catálogo completo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// PRODUCTOS DESTACADOS
// ============================================================
export function SeccionDestacados({ productos }: { productos: ProductoWeb[] }) {
  if (productos.length === 0) return null

  return (
    <section className="bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <TituloSeccion
            kicker="Los más pedidos"
            titulo="Productos destacados"
            subtitulo="Una muestra de lo que entregamos todas las semanas."
            centrado={false}
          />
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 rounded-xl border border-marca-200 px-5 py-3 text-sm font-bold text-marca-900 transition hover:border-verde-300 hover:bg-verde-50"
          >
            Ver todo el catálogo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {productos.slice(0, 8).map((producto, i) => (
            <Reveal key={producto.id} retraso={(i % 4) * 80} className="h-full">
              <TarjetaProducto producto={producto} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// BENEFICIOS
// ============================================================
export function SeccionBeneficios({ contenido }: { contenido: Contenido }) {
  const beneficios = filas(contenido, 'beneficios', 3).filter(([, titulo]) => titulo !== '')
  if (beneficios.length === 0) return null

  return (
    <section className="relative overflow-hidden bg-marca-900 patron-marca py-20 lg:py-24">
      <div className="relative mx-auto max-w-7xl px-6">
        <TituloSeccion
          kicker="Propuesta de valor"
          titulo={texto(contenido, 'beneficios_titulo')}
          subtitulo={texto(contenido, 'beneficios_subtitulo')}
          invertido
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {beneficios.map(([icono, titulo, descripcion], i) => (
            <Reveal key={titulo} retraso={(i % 3) * 90} className="h-full">
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition-colors duration-300 hover:border-oro-400/30 hover:bg-white/[0.07]">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-oro-400/15 text-oro-400">
                  <IconoSitio nombre={icono} className="h-6 w-6" />
                </span>
                <h3 className="mt-5 font-marca text-lg font-bold text-white">{titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{descripcion}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// MISION Y VISION
// ============================================================
export function SeccionMisionVision({ contenido }: { contenido: Contenido }) {
  const valores = filas(contenido, 'valores', 3).filter(([, titulo]) => titulo !== '')

  return (
    <section id="mision-vision" className="bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <TituloSeccion
          kicker="Quiénes somos"
          titulo="Nuestra razón de ser"
          subtitulo="Lo que nos mueve todos los días y hacia dónde vamos."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <Reveal className="h-full">
            <article className="relative h-full overflow-hidden rounded-3xl border border-marca-100 bg-marca-50/60 p-8 sm:p-10">
              <span
                className="absolute -right-6 -top-6 text-marca-100"
                aria-hidden="true"
              >
                <Target className="h-32 w-32" strokeWidth={1} />
              </span>
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-verde-600 text-white">
                <Target className="h-6 w-6" />
              </span>
              <h3 className="relative mt-6 font-marca text-2xl font-extrabold text-marca-900">Misión</h3>
              <p className="relative mt-4 text-[15px] leading-relaxed text-acero-600">
                {texto(contenido, 'mision')}
              </p>
            </article>
          </Reveal>

          <Reveal retraso={120} className="h-full">
            <article className="relative h-full overflow-hidden rounded-3xl border border-marca-100 bg-marca-900 p-8 text-white sm:p-10">
              <span className="absolute -right-6 -top-6 text-white/5" aria-hidden="true">
                <Telescope className="h-32 w-32" strokeWidth={1} />
              </span>
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-oro-400 text-marca-900">
                <Telescope className="h-6 w-6" />
              </span>
              <h3 className="relative mt-6 font-marca text-2xl font-extrabold">Visión</h3>
              <p className="relative mt-4 text-[15px] leading-relaxed text-white/70">
                {texto(contenido, 'vision')}
              </p>
            </article>
          </Reveal>
        </div>

        {valores.length > 0 ? (
          <div className="mt-16">
            <h3 className="text-center font-marca text-sm font-bold uppercase tracking-[0.18em] text-verde-600">
              Nuestros valores
            </h3>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {valores.map(([icono, titulo, descripcion], i) => (
                <Reveal key={titulo} retraso={i * 70} className="h-full">
                  <div className="flex h-full flex-col items-center rounded-2xl border border-marca-100 bg-white p-5 text-center shadow-tarjeta">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-verde-50 text-verde-600">
                      <IconoSitio nombre={icono} className="h-5 w-5" />
                    </span>
                    <h4 className="mt-4 font-marca text-sm font-bold uppercase tracking-wide text-marca-900">
                      {titulo}
                    </h4>
                    <p className="mt-2 text-xs leading-relaxed text-acero-500">{descripcion}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

// ============================================================
// COMO TRABAJAMOS
// ============================================================
export function SeccionProceso({ contenido }: { contenido: Contenido }) {
  const pasos = filas(contenido, 'proceso_pasos', 2).filter(([titulo]) => titulo !== '')
  if (pasos.length === 0) return null

  return (
    <section className="bg-marca-50/60 py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <TituloSeccion
          kicker="El proceso"
          titulo={texto(contenido, 'proceso_titulo')}
          subtitulo={texto(contenido, 'proceso_subtitulo')}
        />

        <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pasos.map(([titulo, descripcion], i) => (
            <li key={titulo} className="h-full">
              <Reveal retraso={i * 100} className="h-full">
                <div className="relative h-full rounded-2xl border border-marca-100 bg-white p-6 shadow-tarjeta">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-marca-900 font-marca text-base font-extrabold text-oro-400">
                    {i + 1}
                  </span>
                  {i < pasos.length - 1 ? (
                    <span
                      className="absolute left-[4.2rem] top-[2.1rem] hidden h-px w-[calc(100%-3.6rem)] bg-gradient-to-r from-marca-200 to-transparent lg:block"
                      aria-hidden="true"
                    />
                  ) : null}
                  <h3 className="mt-5 font-marca text-base font-bold leading-snug text-marca-900">
                    {titulo}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-acero-500">{descripcion}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ============================================================
// SECTORES
// ============================================================
export function SeccionSectores({ contenido }: { contenido: Contenido }) {
  const sectores = filas(contenido, 'sectores', 2).filter(([, nombre]) => nombre !== '')
  if (sectores.length === 0) return null

  return (
    <section className="bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <TituloSeccion
          kicker="Cobertura"
          titulo={texto(contenido, 'sectores_titulo')}
          subtitulo={texto(contenido, 'sectores_subtitulo')}
        />

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sectores.map(([icono, nombre], i) => (
            <Reveal key={nombre} retraso={(i % 4) * 70} className="h-full">
              <div className="flex h-full items-center gap-3.5 rounded-2xl border border-marca-100 bg-marca-50/50 px-5 py-4 transition-colors hover:border-verde-200 hover:bg-verde-50/50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-marca-700 shadow-sm">
                  <IconoSitio nombre={icono} className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold leading-snug text-marca-900">{nombre}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// QUIENES SOMOS (texto largo, para /nosotros)
// ============================================================
export function SeccionQuienesSomos({ contenido }: { contenido: Contenido }) {
  const bloques = parrafos(contenido, 'nosotros_texto')

  return (
    <section className="bg-white py-20 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-verde-600">
            Quiénes somos
          </p>
          <h2 className="font-marca text-3xl font-extrabold leading-tight tracking-tight text-marca-900 sm:text-4xl">
            {texto(contenido, 'nosotros_titulo')}
          </h2>

          <div className="mt-8 rounded-2xl border border-marca-100 bg-marca-50/60 p-6">
            <Quote className="h-6 w-6 text-oro-400" />
            <p className="mt-3 font-marca text-lg font-bold leading-snug text-marca-900">
              {texto(contenido, 'marca_slogan')}
            </p>
            <p className="mt-1 text-sm text-acero-500">{texto(contenido, 'marca_tagline')}</p>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="space-y-5 text-[15.5px] leading-relaxed text-acero-600">
            {bloques.map((bloque, i) => (
              <Reveal key={i} retraso={i * 80}>
                <p>{bloque}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// LLAMADO A LA ACCION FINAL
// ============================================================
export function SeccionCTA({ contenido }: { contenido: Contenido }) {
  return (
    <section className="relative overflow-hidden bg-marca-900 patron-marca">
      <div className="absolute inset-0 patron-lineas opacity-50" aria-hidden="true" />
      <div className="relative mx-auto max-w-4xl px-6 py-20 text-center lg:py-24">
        <h2 className="font-marca text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
          {texto(contenido, 'cta_titulo')}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70">
          {texto(contenido, 'cta_texto')}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href={urlWhatsapp(contenido)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-verde-600 px-7 py-4 text-base font-bold text-white shadow-[0_14px_34px_-14px_rgba(22,130,60,0.9)] transition hover:bg-verde-500"
          >
            <IconoWhatsapp className="h-5 w-5" />
            {texto(contenido, 'cta_boton')}
          </a>
          <Link
            href="/contacto"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-4 text-base font-bold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/10"
          >
            Escribir un mensaje
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
