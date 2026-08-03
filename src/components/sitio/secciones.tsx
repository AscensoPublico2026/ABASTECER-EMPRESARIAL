import Link from 'next/link'
import { ArrowRight, Check, Quote, Target, Telescope, Shield, Award, Zap } from 'lucide-react'
import Reveal from './Reveal'
import IconoSitio from './IconoSitio'
import TarjetaProducto from './TarjetaProducto'
import ContadorAnimado from './ContadorAnimado'
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
    <div className={centrado ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'}>
      {kicker ? (
        <p className={`mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] ${
          invertido
            ? 'border border-oro-400/30 bg-oro-400/10 text-oro-400'
            : 'border border-verde-200 bg-verde-50 text-verde-700'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${invertido ? 'bg-oro-400' : 'bg-verde-500'}`} />
          {kicker}
        </p>
      ) : null}
      <h2 className={`font-marca text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl lg:text-[2.75rem] ${
        invertido ? 'text-white' : 'text-marca-900'
      }`}>
        {titulo}
      </h2>
      {subtitulo ? (
        <p className={`mt-5 text-[16px] leading-relaxed ${invertido ? 'text-white/65' : 'text-acero-500'}`}>
          {subtitulo}
        </p>
      ) : null}
    </div>
  )
}



// ============================================================
// HERO - Pantalla completa con fondo industrial premium
// ============================================================
export function Hero({ contenido, totalProductos }: { contenido: Contenido; totalProductos: number }) {
  const imagen = textoOpcional(contenido, 'hero_imagen_url')
  const badges = lineasDe(contenido, 'hero_badges')

  return (
    <section className="relative min-h-[92vh] overflow-hidden gradient-hero">
      {/* Capas de fondo */}
      <div className="absolute inset-0 patron-grid" aria-hidden="true" />
      <div className="absolute inset-0 patron-marca opacity-80" aria-hidden="true" />

      {/* Orbes de luz ambiental */}
      <div className="absolute -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-verde-600/15 blur-[100px]" aria-hidden="true" />
      <div className="absolute -right-32 bottom-1/4 h-[400px] w-[400px] rounded-full bg-oro-400/10 blur-[80px]" aria-hidden="true" />
      <div className="absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-white/[0.02] blur-[60px]" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-28 pt-20 lg:grid-cols-12 lg:gap-8 lg:pb-36 lg:pt-28">
        {/* Texto principal */}
        <div className="flex flex-col justify-center lg:col-span-7">
          <div className="animate-aparecer">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-oro-400/25 bg-oro-400/[0.08] px-5 py-2 text-[12px] font-black uppercase tracking-[0.18em] text-oro-400 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-oro-400 animate-pulse-glow" />
              {texto(contenido, 'hero_kicker')}
            </p>
          </div>

          <h1 className="mt-8 font-marca text-4xl font-extrabold leading-[1.05] tracking-tight text-white animate-aparecer-arriba sm:text-5xl lg:text-[3.6rem]">
            {texto(contenido, 'hero_titulo')}
          </h1>

          <p className="mt-7 max-w-xl text-[17px] leading-[1.7] text-white/65">
            {texto(contenido, 'hero_subtitulo')}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/catalogo"
              className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-2xl bg-verde-600 px-8 py-5 text-[15px] font-bold text-white shadow-[0_20px_40px_-12px_rgba(22,130,60,0.6)] transition-all duration-300 hover:bg-verde-500 hover:shadow-[0_24px_48px_-12px_rgba(22,130,60,0.7)] hover:-translate-y-0.5"
            >
              <span className="absolute inset-0 shimmer" />
              <span className="relative">{texto(contenido, 'hero_boton_primario')}</span>
              <ArrowRight className="relative h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href={urlWhatsapp(contenido)}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/[0.04] px-8 py-5 text-[15px] font-bold text-white backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/[0.08] hover:-translate-y-0.5"
            >
              <IconoWhatsapp className="h-5 w-5 text-green-400" />
              {texto(contenido, 'hero_boton_secundario')}
            </a>
          </div>

          {/* Badges de confianza */}
          {badges.length > 0 ? (
            <ul className="mt-12 flex flex-wrap gap-x-7 gap-y-3">
              {badges.map((badge, i) => (
                <li key={badge} className="flex items-center gap-2.5 text-[13px] font-medium text-white/55" style={{ animationDelay: `${i * 100 + 400}ms` }}>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-verde-600/20 ring-1 ring-verde-500/30">
                    <Check className="h-3 w-3 text-verde-400" />
                  </span>
                  {badge}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Panel visual derecho */}
        <div className="relative hidden lg:col-span-5 lg:flex lg:items-center">
          <div className="relative w-full">
            {imagen ? (
              <div className="overflow-hidden rounded-3xl border border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]">
                <img src={imagen} alt="Abastecer Empresarial" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="relative">
                {/* Tarjeta principal con logo */}
                <div className="rounded-3xl bg-white/[0.03] p-1 ring-1 ring-white/10 backdrop-blur-sm">
                  <div className="rounded-[22px] bg-white p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)]">
                    <img
                      src="/logo-web.webp"
                      alt="Abastecer Empresarial S.A.S."
                      className="mx-auto h-auto w-full max-w-[280px]"
                    />
                  </div>
                </div>

                {/* Chips flotantes premium */}
                <div className="absolute -left-6 bottom-8 glass-dark rounded-2xl px-5 py-4 shadow-2xl animate-float" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-oro-400/15">
                      <Zap className="h-5 w-5 text-oro-400" />
                    </span>
                    <span className="text-left">
                      <span className="block text-[15px] font-extrabold text-white">24 horas</span>
                      <span className="text-[11px] text-white/50">Respuesta a cotizaciones</span>
                    </span>
                  </div>
                </div>

                <div className="absolute -right-4 top-8 glass-dark rounded-2xl px-5 py-4 shadow-2xl animate-float" style={{ animationDelay: '1.5s' }}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-verde-600/20">
                      <Shield className="h-5 w-5 text-verde-400" />
                    </span>
                    <span className="text-left">
                      <span className="block text-[15px] font-extrabold text-white">
                        {totalProductos > 0 ? `${totalProductos}+` : '11 líneas'}
                      </span>
                      <span className="text-[11px] text-white/50">
                        {totalProductos > 0 ? 'Productos en catálogo' : 'De abastecimiento'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="absolute -bottom-4 right-12 glass-dark rounded-2xl px-5 py-4 shadow-2xl animate-float" style={{ animationDelay: '2.5s' }}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/20">
                      <Award className="h-5 w-5 text-green-400" />
                    </span>
                    <span className="text-left">
                      <span className="block text-[15px] font-extrabold text-white">100%</span>
                      <span className="text-[11px] text-white/50">Factura electrónica</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wave separator */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg className="block h-[50px] w-full text-white sm:h-[70px]" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden="true">
          <path fill="currentColor" d="M0 70V35c180 20 360 35 540 30s360-25 540-35 360 5 360 15v25H0Z" />
        </svg>
      </div>
    </section>
  )
}



// ============================================================
// CIFRAS con contadores animados y diseño premium
// ============================================================
export function SeccionCifras({ contenido }: { contenido: Contenido }) {
  const cifras = filas(contenido, 'cifras', 2).filter(([valor]) => valor !== '')
  if (cifras.length === 0) return null

  return (
    <section className="relative -mt-1 bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {cifras.map(([valor, etiqueta], i) => (
            <Reveal key={`${valor}-${etiqueta}`} retraso={i * 100} className="text-center">
              <div className="relative">
                <p className="font-marca text-4xl font-extrabold tracking-tight text-marca-900 sm:text-5xl">
                  <ContadorAnimado valor={valor} />
                </p>
                <p className="mt-2 text-[13px] font-semibold leading-snug text-acero-500">{etiqueta}</p>
                {/* Linea decorativa debajo */}
                <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-gradient-to-r from-verde-500 to-oro-400 opacity-60" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// LINEAS DE PRODUCTO con diseño de tarjetas premium
// ============================================================
export function SeccionLineas({ lineas }: { contenido: Contenido; lineas: LineaWeb[] }) {
  if (lineas.length === 0) return null

  return (
    <section id="lineas" className="relative overflow-hidden bg-marca-50/40 py-24 lg:py-28">
      {/* Patron de fondo sutil */}
      <div className="absolute inset-0 patron-puntos opacity-40" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-6">
        <TituloSeccion
          kicker="Nuestras líneas"
          titulo="Todo lo que tu empresa necesita, organizado para ti"
          subtitulo="Desde la protección de tu personal hasta el café de la sala de juntas. Explora cada línea y arma tu lista de cotización."
        />

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lineas.map((linea, i) => (
            <Reveal key={linea.id} retraso={(i % 3) * 100}>
              <Link
                href={`/catalogo?linea=${linea.slug}`}
                className="group flex h-full flex-col card-premium rounded-2xl p-7"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-marca-900 text-oro-400 shadow-lg transition-all duration-400 group-hover:bg-verde-600 group-hover:text-white group-hover:shadow-verde-600/30 group-hover:scale-110">
                    <IconoSitio nombre={linea.icono} className="h-7 w-7" />
                  </span>
                  {linea.total_productos > 0 ? (
                    <span className="rounded-full bg-marca-50 px-3 py-1.5 text-[11px] font-bold tabular-nums text-acero-600 ring-1 ring-marca-100">
                      {linea.total_productos} {linea.total_productos === 1 ? 'producto' : 'productos'}
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-6 font-marca text-lg font-bold leading-snug text-marca-900 group-hover:text-verde-700 transition-colors">
                  {linea.nombre}
                </h3>

                {linea.descripcion_web ? (
                  <p className="mt-3 line-clamp-3 text-[13.5px] leading-relaxed text-acero-500">
                    {linea.descripcion_web}
                  </p>
                ) : null}

                <span className="mt-auto flex items-center gap-2 pt-6 text-[13px] font-bold text-verde-700 transition-all group-hover:gap-3">
                  Explorar productos
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}
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
    <section className="bg-white py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <TituloSeccion
            kicker="Catálogo"
            titulo="Productos destacados"
            subtitulo="Una muestra de lo que entregamos todas las semanas a empresas como la tuya."
            centrado={false}
          />
          <Link
            href="/catalogo"
            className="group inline-flex items-center gap-2 rounded-2xl border border-marca-200 px-6 py-3.5 text-sm font-bold text-marca-900 transition-all hover:border-verde-300 hover:bg-verde-50 hover:-translate-y-0.5"
          >
            Ver todo el catálogo
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {productos.slice(0, 8).map((producto, i) => (
            <Reveal key={producto.id} retraso={(i % 4) * 80} className="h-full">
              <TarjetaProducto producto={producto} prioritaria={i < 4} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// BENEFICIOS - Diseño oscuro premium con glassmorphism
// ============================================================
export function SeccionBeneficios({ contenido }: { contenido: Contenido }) {
  const beneficios = filas(contenido, 'beneficios', 3).filter(([, titulo]) => titulo !== '')
  if (beneficios.length === 0) return null

  return (
    <section className="relative overflow-hidden gradient-section-dark py-24 lg:py-32">
      <div className="absolute inset-0 patron-grid" aria-hidden="true" />
      <div className="absolute inset-0 patron-marca opacity-60" aria-hidden="true" />

      {/* Orbes de luz */}
      <div className="absolute -left-40 top-1/3 h-[400px] w-[400px] rounded-full bg-verde-600/10 blur-[100px]" aria-hidden="true" />
      <div className="absolute -right-40 bottom-1/4 h-[350px] w-[350px] rounded-full bg-oro-400/8 blur-[80px]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-6">
        <TituloSeccion
          kicker="Propuesta de valor"
          titulo={texto(contenido, 'beneficios_titulo')}
          subtitulo={texto(contenido, 'beneficios_subtitulo')}
          invertido
        />

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {beneficios.map(([icono, titulo, descripcion], i) => (
            <Reveal key={titulo} retraso={(i % 3) * 100} className="h-full">
              <div className="card-dark h-full rounded-2xl p-7">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-oro-400/10 ring-1 ring-oro-400/20">
                  <IconoSitio nombre={icono} className="h-7 w-7 text-oro-400" />
                </span>
                <h3 className="mt-6 font-marca text-[17px] font-bold text-white">{titulo}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-white/55">{descripcion}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}



// ============================================================
// MISION Y VISION - Premium con tarjetas elevadas
// ============================================================
export function SeccionMisionVision({ contenido }: { contenido: Contenido }) {
  const valores = filas(contenido, 'valores', 3).filter(([, titulo]) => titulo !== '')

  return (
    <section id="mision-vision" className="bg-white py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <TituloSeccion
          kicker="Nuestra esencia"
          titulo="Lo que nos mueve todos los días"
          subtitulo="No solo vendemos productos. Simplificamos el trabajo de las áreas de compras y de seguridad y salud en el trabajo."
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <Reveal className="h-full">
            <article className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-marca-50 via-white to-verde-50/30 p-10 ring-1 ring-marca-100">
              <div className="absolute -right-8 -top-8 text-marca-100/60" aria-hidden="true">
                <Target className="h-40 w-40" strokeWidth={0.8} />
              </div>
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl gradient-verde text-white shadow-lg glow-verde">
                <Target className="h-7 w-7" />
              </span>
              <h3 className="relative mt-7 font-marca text-2xl font-extrabold text-marca-900">Misión</h3>
              <p className="relative mt-4 text-[15px] leading-[1.8] text-acero-600">
                {texto(contenido, 'mision')}
              </p>
            </article>
          </Reveal>

          <Reveal retraso={150} className="h-full">
            <article className="relative h-full overflow-hidden rounded-3xl gradient-hero p-10 text-white">
              <div className="absolute inset-0 patron-grid opacity-50" aria-hidden="true" />
              <div className="absolute -right-8 -top-8 text-white/5" aria-hidden="true">
                <Telescope className="h-40 w-40" strokeWidth={0.8} />
              </div>
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-oro-400 text-marca-900 shadow-lg glow-oro">
                <Telescope className="h-7 w-7" />
              </span>
              <h3 className="relative mt-7 font-marca text-2xl font-extrabold">Visión</h3>
              <p className="relative mt-4 text-[15px] leading-[1.8] text-white/65">
                {texto(contenido, 'vision')}
              </p>
            </article>
          </Reveal>
        </div>

        {/* Valores */}
        {valores.length > 0 ? (
          <div className="mt-20">
            <h3 className="text-center font-marca text-[12px] font-black uppercase tracking-[0.2em] text-verde-600">
              Nuestros valores
            </h3>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {valores.map(([icono, titulo, descripcion], i) => (
                <Reveal key={titulo} retraso={i * 80} className="h-full">
                  <div className="card-premium flex h-full flex-col items-center rounded-2xl p-6 text-center">
                    <span className="flex h-13 w-13 items-center justify-center rounded-xl bg-verde-50 text-verde-600 ring-1 ring-verde-100">
                      <IconoSitio nombre={icono} className="h-6 w-6" />
                    </span>
                    <h4 className="mt-5 font-marca text-[13px] font-bold uppercase tracking-wide text-marca-900">
                      {titulo}
                    </h4>
                    <p className="mt-2 text-[12px] leading-relaxed text-acero-500">{descripcion}</p>
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
// COMO TRABAJAMOS - Timeline visual premium
// ============================================================
export function SeccionProceso({ contenido }: { contenido: Contenido }) {
  const pasos = filas(contenido, 'proceso_pasos', 2).filter(([titulo]) => titulo !== '')
  if (pasos.length === 0) return null

  return (
    <section className="relative overflow-hidden bg-marca-50/50 py-24 lg:py-28">
      <div className="absolute inset-0 patron-puntos opacity-30" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-6">
        <TituloSeccion
          kicker="El proceso"
          titulo={texto(contenido, 'proceso_titulo')}
          subtitulo={texto(contenido, 'proceso_subtitulo')}
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pasos.map(([titulo, descripcion], i) => (
            <Reveal key={titulo} retraso={i * 120} className="h-full">
              <div className="relative h-full card-premium rounded-2xl p-7">
                {/* Numero con gradiente */}
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-marca-900 font-marca text-xl font-extrabold text-oro-400 shadow-lg">
                  {i + 1}
                </span>
                {/* Linea conectora */}
                {i < pasos.length - 1 ? (
                  <span className="absolute right-0 top-[2.6rem] hidden h-[2px] w-8 bg-gradient-to-r from-marca-200 to-transparent lg:block" aria-hidden="true" />
                ) : null}
                <h3 className="mt-6 font-marca text-[16px] font-bold leading-snug text-marca-900">
                  {titulo}
                </h3>
                <p className="mt-3 text-[13.5px] leading-relaxed text-acero-500">{descripcion}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// SECTORES con iconos grandes y diseño de chips
// ============================================================
export function SeccionSectores({ contenido }: { contenido: Contenido }) {
  const sectores = filas(contenido, 'sectores', 2).filter(([, nombre]) => nombre !== '')
  if (sectores.length === 0) return null

  return (
    <section className="bg-white py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <TituloSeccion
          kicker="Cobertura"
          titulo={texto(contenido, 'sectores_titulo')}
          subtitulo={texto(contenido, 'sectores_subtitulo')}
        />

        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sectores.map(([icono, nombre], i) => (
            <Reveal key={nombre} retraso={(i % 4) * 80} className="h-full">
              <div className="card-premium flex h-full items-center gap-4 rounded-2xl px-6 py-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-marca-900 text-oro-400 shadow-md">
                  <IconoSitio nombre={icono} className="h-6 w-6" />
                </span>
                <span className="text-[14px] font-bold leading-snug text-marca-900">{nombre}</span>
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
    <section className="bg-white py-24 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-verde-200 bg-verde-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-verde-700">
            <span className="h-1.5 w-1.5 rounded-full bg-verde-500" />
            Quiénes somos
          </p>
          <h2 className="font-marca text-3xl font-extrabold leading-[1.1] tracking-tight text-marca-900 sm:text-4xl">
            {texto(contenido, 'nosotros_titulo')}
          </h2>

          <div className="mt-10 rounded-2xl bg-marca-900 p-7">
            <Quote className="h-7 w-7 text-oro-400" />
            <p className="mt-4 font-marca text-[18px] font-bold leading-snug text-white">
              {texto(contenido, 'marca_slogan')}
            </p>
            <p className="mt-2 text-[13px] text-white/50">{texto(contenido, 'marca_tagline')}</p>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="space-y-6 text-[16px] leading-[1.8] text-acero-600">
            {bloques.map((bloque, i) => (
              <Reveal key={i} retraso={i * 100}>
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
// LLAMADO A LA ACCION FINAL - Premium oscuro
// ============================================================
export function SeccionCTA({ contenido }: { contenido: Contenido }) {
  return (
    <section className="relative overflow-hidden gradient-hero">
      <div className="absolute inset-0 patron-grid" aria-hidden="true" />
      <div className="absolute inset-0 patron-marca opacity-70" aria-hidden="true" />
      {/* Orbe central */}
      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-verde-600/10 blur-[100px]" aria-hidden="true" />

      <div className="relative mx-auto max-w-4xl px-6 py-24 text-center lg:py-32">
        <h2 className="font-marca text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl">
          {texto(contenido, 'cta_titulo')}
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-white/60">
          {texto(contenido, 'cta_texto')}
        </p>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <a
            href={urlWhatsapp(contenido)}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-2xl bg-verde-600 px-9 py-5 text-[15px] font-bold text-white shadow-[0_20px_40px_-12px_rgba(22,130,60,0.6)] transition-all hover:bg-verde-500 hover:shadow-[0_24px_48px_-12px_rgba(22,130,60,0.7)] hover:-translate-y-0.5"
          >
            <span className="absolute inset-0 shimmer" />
            <IconoWhatsapp className="relative h-5 w-5" />
            <span className="relative">{texto(contenido, 'cta_boton')}</span>
          </a>
          <Link
            href="/contacto"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-9 py-5 text-[15px] font-bold text-white backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/[0.08] hover:-translate-y-0.5"
          >
            Escribir un mensaje
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
