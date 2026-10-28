import Link from 'next/link'
import clsx from 'clsx'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { IconoWhatsapp } from './IconosRedes'
import IconoSitio from './IconoSitio'
import {
  COLORES,
  imagenFoto,
  imagenProducto,
  type Linea,
  type Producto,
} from '@/lib/sitio/portafolio'

/* ============================================================
 * Sistema visual del portafolio (mismo lenguaje del catálogo PDF)
 * ============================================================ */

/** Marca de sección: dos paralelogramos verde y amarillo */
export function Marca({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex shrink-0', className)} aria-hidden="true">
      <i className="block h-[9px] w-[11px] -skew-x-[22deg] bg-[#16823c]" />
      <i className="-ml-px block h-[9px] w-[11px] -skew-x-[22deg] bg-oro-400" />
    </span>
  )
}

export function Antetitulo({
  children,
  tono = 'verde',
  className,
}: {
  children: React.ReactNode
  tono?: 'verde' | 'oro'
  className?: string
}) {
  return (
    <p
      className={clsx(
        'flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.24em]',
        tono === 'oro' ? 'text-oro-400' : 'text-[#16823c]',
        className
      )}
    >
      <Marca />
      {children}
    </p>
  )
}

export function Encabezado({
  antetitulo,
  titulo,
  texto,
  invertido = false,
  centrado = false,
  className,
}: {
  antetitulo?: string
  titulo: React.ReactNode
  texto?: React.ReactNode
  invertido?: boolean
  centrado?: boolean
  className?: string
}) {
  return (
    <div className={clsx(centrado ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl', className)}>
      {antetitulo ? (
        <Antetitulo tono={invertido ? 'oro' : 'verde'} className={centrado ? 'justify-center' : ''}>
          {antetitulo}
        </Antetitulo>
      ) : null}
      <h2
        className={clsx(
          'mt-4 font-marca text-[1.9rem] font-extrabold leading-[1.1] tracking-[-0.01em] sm:text-[2.4rem]',
          invertido ? 'text-white' : 'text-marca-900'
        )}
      >
        {titulo}
      </h2>
      {texto ? (
        <p className={clsx('mt-4 text-[15.5px] leading-relaxed', invertido ? 'text-white/65' : 'text-acero-500')}>
          {texto}
        </p>
      ) : null}
    </div>
  )
}

/** Franja diagonal amarillo + verde (portada del catálogo) */
export function FranjaDiagonal({ fondoAbajo = '#ffffff', className }: { fondoAbajo?: string; className?: string }) {
  return (
    <svg
      className={clsx('block h-[44px] w-full sm:h-[64px]', className)}
      viewBox="0 0 1440 64"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon points="0,46 1440,4 1440,15 0,57" fill="#f2b705" />
      <polygon points="0,57 1440,15 1440,26 0,64" fill="#16823c" />
      <polygon points="0,64 1440,26 1440,64" fill={fondoAbajo} />
    </svg>
  )
}

/** Esquina amarilla y verde (pie de la portada) */
export function EsquinaMarca({ className }: { className?: string }) {
  return (
    <svg className={clsx('pointer-events-none', className)} viewBox="0 0 212 74" preserveAspectRatio="none" aria-hidden="true">
      <polygon points="7,74 87,0 212,0 212,74" fill="#16823c" />
      <polygon points="0,74 80,0 108,0 28,74" fill="#f2b705" />
    </svg>
  )
}

export function BotonWhatsapp({
  href,
  children,
  variante = 'verde',
  className,
}: {
  href: string
  children: React.ReactNode
  variante?: 'verde' | 'oro' | 'claro' | 'oscuro'
  className?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        'inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-4 text-[13px] font-extrabold uppercase tracking-[0.12em] transition duration-200 hover:-translate-y-0.5',
        variante === 'verde' && 'bg-[#16823c] text-white shadow-[0_14px_30px_-12px_rgba(22,130,60,0.7)] hover:bg-[#12702f]',
        variante === 'oro' && 'bg-oro-400 text-marca-900 shadow-[0_14px_30px_-12px_rgba(242,183,5,0.7)] hover:bg-[#ffc61a]',
        variante === 'claro' && 'border border-white/20 bg-white/5 text-white hover:bg-white/10',
        variante === 'oscuro' && 'bg-marca-900 text-white hover:bg-marca-800',
        className
      )}
    >
      <IconoWhatsapp className="h-[18px] w-[18px]" />
      {children}
    </a>
  )
}

export function BotonEnlace({
  href,
  children,
  variante = 'borde',
  className,
}: {
  href: string
  children: React.ReactNode
  variante?: 'borde' | 'claro' | 'oro'
  className?: string
}) {
  return (
    <Link
      href={href}
      className={clsx(
        'group inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-[13px] font-extrabold uppercase tracking-[0.12em] transition duration-200 hover:-translate-y-0.5',
        variante === 'borde' && 'border border-marca-200 bg-white text-marca-900 hover:border-marca-900',
        variante === 'claro' && 'border border-white/20 bg-white/5 text-white hover:bg-white/10',
        variante === 'oro' && 'bg-oro-400 text-marca-900 hover:bg-[#ffc61a]',
        className
      )}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

export function Migas({ items, invertido = true }: { items: { nombre: string; href?: string }[]; invertido?: boolean }) {
  return (
    <nav aria-label="Ruta de navegación" className={clsx('flex flex-wrap items-center gap-1.5 text-xs', invertido ? 'text-white/50' : 'text-acero-400')}>
      {items.map((item, i) => (
        <span key={item.nombre} className="flex items-center gap-1.5">
          {i > 0 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
          {item.href ? (
            <Link href={item.href} className="transition hover:text-oro-400">
              {item.nombre}
            </Link>
          ) : (
            <span className={invertido ? 'text-white/85' : 'text-marca-900'}>{item.nombre}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

/** Encabezado oscuro de las páginas internas */
export function CabeceraPagina({
  migas,
  antetitulo,
  titulo,
  texto,
  children,
}: {
  migas: { nombre: string; href?: string }[]
  antetitulo: string
  titulo: React.ReactNode
  texto?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <section className="relative overflow-hidden bg-marca-900">
      <div className="absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-[radial-gradient(closest-side,rgba(242,183,5,0.12),transparent)]" aria-hidden="true" />
      <div className="absolute -left-40 bottom-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(22,130,60,0.22),transparent)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 pb-14 pt-10 sm:px-6 lg:pb-16 lg:pt-12">
        <Migas items={migas} />
        <Antetitulo tono="oro" className="mt-6">{antetitulo}</Antetitulo>
        <h1 className="mt-4 max-w-4xl font-marca text-[2.2rem] font-extrabold leading-[1.06] tracking-[-0.015em] text-white sm:text-5xl lg:text-[clamp(2.4rem,min(3.6vw,6.5svh),3.4rem)]">
          {titulo}
        </h1>
        {texto ? <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-white/65">{texto}</p> : null}
        {children}
      </div>
      <FranjaDiagonal className="-mb-px" />
    </section>
  )
}

/** Puntos de color de una referencia */
export function PuntosColor({ colores, etiqueta = true, className }: { colores?: string[]; etiqueta?: boolean; className?: string }) {
  if (!colores || colores.length === 0) return null
  return (
    <div className={clsx('flex flex-wrap items-center gap-[5px]', className)} title={colores.join(', ')}>
      {etiqueta ? (
        <span className="mr-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-acero-500">Colores</span>
      ) : null}
      {colores.map((c) => (
        <i
          key={c}
          className="block h-[11px] w-[11px] rounded-full ring-1 ring-black/15"
          style={{ background: COLORES[c] ?? '#ccc' }}
          aria-label={c}
        />
      ))}
    </div>
  )
}

/** Tarjeta de producto del portafolio (fondo gris, foto, etiqueta blanca) */
export function TarjetaPortafolio({ producto, alto = 'normal' }: { producto: Producto; alto?: 'normal' | 'alto' }) {
  const src = producto.foto ? imagenFoto(producto.imagen) : imagenProducto(producto.imagen)
  return (
    <article
      className={clsx(
        'group relative overflow-hidden rounded-[22px] bg-[#f3f3f3] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_-24px_rgba(13,27,42,0.45)]',
        alto === 'alto' ? 'h-[330px] sm:h-[360px]' : 'h-[290px] sm:h-[310px]'
      )}
    >
      {producto.foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={producto.nombre} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
      ) : (
        <div className={clsx('absolute inset-x-5 bottom-[84px] flex items-end justify-center', producto.colores ? 'top-11' : 'top-6')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={producto.nombre}
            loading="lazy"
            className="relative z-[1] max-h-full max-w-full object-contain drop-shadow-[0_10px_10px_rgba(13,27,42,0.16)] transition duration-500 group-hover:scale-[1.04]"
          />
          <span className="absolute -bottom-2 left-[18%] right-[18%] h-4 rounded-[50%] bg-[radial-gradient(closest-side,rgba(13,27,42,0.18),transparent)]" aria-hidden="true" />
        </div>
      )}
      {producto.colores ? <PuntosColor colores={producto.colores} className="absolute left-4 right-4 top-4 z-[2]" /> : null}
      <div className="absolute bottom-3.5 left-3.5 right-3.5 z-[2] rounded-[14px] bg-white px-4 py-3 shadow-[0_6px_16px_-10px_rgba(13,27,42,0.4)]">
        <h3 className="font-marca text-[14px] font-bold leading-tight text-marca-900">{producto.nombre}</h3>
        {producto.detalle ? <p className="mt-1 text-[12px] leading-snug text-acero-500">{producto.detalle}</p> : null}
      </div>
    </article>
  )
}

/** Productos principales + recuadro de consulta por WhatsApp */
export function PrincipalesYConsulta({
  principales,
  nota,
  urlWhatsapp,
}: {
  principales?: string[]
  nota?: string
  urlWhatsapp: string
}) {
  if (!principales || principales.length === 0) {
    return (
      <div className="mt-5 flex flex-col items-start justify-between gap-5 rounded-[22px] bg-[#eef6f0] p-6 sm:flex-row sm:items-center sm:p-7">
        <div>
          <p className="font-marca text-[16px] font-bold text-marca-900">¿Necesitas algo específico de esta línea?</p>
          <p className="mt-1 text-[14px] text-acero-500">{nota ?? 'Si no lo ves en el listado, pregúntanos.'}</p>
        </div>
        <BotonWhatsapp href={urlWhatsapp}>Pregúntanos por WhatsApp</BotonWhatsapp>
      </div>
    )
  }
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="rounded-[22px] border border-[#e3e6ea] bg-white p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#16823c]">Productos principales</p>
        <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
          {principales.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[14.5px] leading-snug text-marca-900">
              <span className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full bg-[#16823c]" />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col justify-between rounded-[22px] bg-[#eef6f0] p-6 sm:p-7">
        <div>
          <p className="font-marca text-[16px] font-bold leading-snug text-marca-900">¿Necesitas algo específico de esta línea?</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-acero-500">{nota ?? 'Si no lo ves en el listado, pregúntanos.'}</p>
        </div>
        <BotonWhatsapp href={urlWhatsapp} className="mt-6 w-full !px-4">
          Pregúntanos por WhatsApp
        </BotonWhatsapp>
      </div>
    </div>
  )
}

/** Mosaico de las 12 líneas (página 2 del catálogo) */
export function MosaicoLineas({ lineas }: { lineas: Linea[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-[repeat(4,minmax(0,1fr))]">
      {lineas.map((l, i) => {
        const grande = l.slug === 'dotacion'
        const ancha = l.slug === 'proteccion-personal-epp'
        return (
          <Link
            key={l.slug}
            href={`/soluciones/${l.slug}`}
            className={clsx(
              'group relative flex flex-col overflow-hidden rounded-[22px] bg-gradient-to-br from-white to-[#eef0f3] p-4 text-marca-900 transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_50px_-28px_rgba(0,0,0,0.6)] sm:p-5',
              grande && 'col-span-2 row-span-2 from-white to-[#e9f4ed] lg:min-h-[470px]',
              ancha && 'col-span-2 from-white to-[#fdf6df]',
              !grande && !ancha && 'min-h-[210px] sm:min-h-[230px]'
            )}
          >
            <span
              className={clsx(
                'font-marca font-extrabold leading-none text-transparent [-webkit-text-stroke:1.2px_#c3c9d2]',
                grande ? 'text-6xl sm:text-7xl' : ancha ? 'text-5xl' : 'text-[2.1rem]'
              )}
            >
              {l.numero}
            </span>
            <span className="absolute right-4 top-4 rounded-full bg-marca-900 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-oro-400 sm:right-5 sm:top-5">
              Ver línea
            </span>
            <div className={clsx('flex min-h-0 flex-1 items-end justify-center gap-2', grande ? 'py-6' : 'py-3')}>
              {l.portada.map((img, k) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img}
                  src={imagenProducto(img)}
                  alt=""
                  loading={i < 4 ? 'eager' : 'lazy'}
                  className={clsx(
                    'w-auto object-contain drop-shadow-[0_8px_8px_rgba(13,27,42,0.18)] transition duration-500 group-hover:scale-[1.04]',
                    grande ? (k === 0 ? 'max-h-[300px]' : 'max-h-[190px]') : ancha ? 'max-h-[120px]' : 'max-h-[118px]',
                    grande || ancha ? 'max-w-[30%]' : 'max-w-[46%]'
                  )}
                />
              ))}
            </div>
            <div className={clsx('border-t pt-3', grande ? 'border-t-[3px] border-[#16823c]' : ancha ? 'border-t-[3px] border-oro-400' : 'border-[#dfe3e8]')}>
              <h3 className={clsx('font-marca font-extrabold leading-tight', grande || ancha ? 'text-xl sm:text-2xl' : 'text-[14px] sm:text-[15px]')}>
                {l.nombre}
              </h3>
              {grande || ancha ? <p className="mt-1.5 text-[13.5px] text-acero-500">{l.resumen}</p> : null}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export function IconoCirculo({ nombre, className }: { nombre: string; className?: string }) {
  return (
    <span className={clsx('flex shrink-0 items-center justify-center rounded-2xl bg-oro-400/12 text-oro-400 ring-1 ring-oro-400/25', className ?? 'h-12 w-12')}>
      <IconoSitio nombre={nombre} className="h-[22px] w-[22px]" />
    </span>
  )
}
