import clsx from 'clsx'
import IconoSitio from './IconoSitio'

/**
 * Imagen de un producto del catalogo.
 * Si no tiene foto, muestra un placeholder premium con el icono de su linea
 * y un patron sutil que da la impresion de catalogo industrial.
 */
export default function ImagenProducto({
  url,
  alto,
  icono,
  className,
  prioritaria = false,
}: {
  url: string | null | undefined
  alto: string
  icono?: string | null
  className?: string
  prioritaria?: boolean
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alto}
        loading={prioritaria ? 'eager' : 'lazy'}
        decoding="async"
        className={clsx('h-full w-full object-cover', className)}
      />
    )
  }

  return (
    <div
      className={clsx(
        'relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-marca-50 via-white to-marca-100',
        className
      )}
      aria-hidden="true"
    >
      {/* Patron de fondo */}
      <div className="absolute inset-0 patron-puntos opacity-50" />
      {/* Circulo decorativo */}
      <div className="absolute h-[70%] w-[70%] rounded-full bg-marca-50 ring-1 ring-marca-100/50" />
      {/* Icono */}
      <IconoSitio nombre={icono ?? 'caja'} className="relative h-1/4 max-h-14 w-auto text-marca-300" />
    </div>
  )
}
