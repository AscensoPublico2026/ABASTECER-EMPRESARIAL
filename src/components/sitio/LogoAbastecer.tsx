import clsx from 'clsx'

/**
 * Logo de ABASTECER EMPRESARIAL para el sitio web.
 *
 * public/logo.png es la version VERTICAL (icono arriba, texto abajo). Para la
 * barra superior y el pie de pagina se usa la version ICONO del manual de
 * identidad (public/logo-icono.png, generada con scripts/generar-imagenes-marca.mjs)
 * y al lado se escribe el nombre con Montserrat, la tipografia de la marca.
 */

export function IconoLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-icono.png"
      alt=""
      width={320}
      height={269}
      className={clsx('block w-auto object-contain', className)}
      aria-hidden="true"
    />
  )
}

type Tamano = 'sm' | 'md' | 'lg'

const TAMANOS: Record<Tamano, { icono: string; nombre: string; sufijo: string }> = {
  sm: { icono: 'h-8', nombre: 'text-base', sufijo: 'text-[0.58rem]' },
  md: { icono: 'h-11', nombre: 'text-xl', sufijo: 'text-[0.7rem]' },
  lg: { icono: 'h-16', nombre: 'text-3xl', sufijo: 'text-[1rem]' },
}

export default function LogoAbastecer({
  tamano = 'md',
  invertido = false,
  conTagline = false,
  tagline,
  className,
}: {
  tamano?: Tamano
  /** true = sobre fondo oscuro (texto blanco) */
  invertido?: boolean
  conTagline?: boolean
  tagline?: string
  className?: string
}) {
  const t = TAMANOS[tamano]

  return (
    <span className={clsx('flex items-center gap-2.5', className)}>
      <IconoLogo className={t.icono} />
      <span className="flex flex-col justify-center leading-none">
        <span
          className={clsx(
            'font-marca font-extrabold tracking-tight',
            t.nombre,
            invertido ? 'text-white' : 'text-marca-900'
          )}
        >
          ABASTECER
        </span>
        <span
          className={clsx(
            'font-marca font-bold uppercase tracking-[0.2em] mt-0.5',
            t.sufijo,
            invertido ? 'text-verde-300' : 'text-verde-600'
          )}
        >
          Empresarial
        </span>
        {conTagline && tagline ? (
          <span
            className={clsx(
              'font-marca mt-1 text-[0.6rem] font-medium tracking-wide',
              invertido ? 'text-white/60' : 'text-acero-500'
            )}
          >
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  )
}
