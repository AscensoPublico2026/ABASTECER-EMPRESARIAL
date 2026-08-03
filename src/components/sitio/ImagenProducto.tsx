import clsx from 'clsx'
import IconoSitio from './IconoSitio'

/**
 * Imagen de un producto del catalogo.
 * Si todavia no le han cargado foto, dibuja un marcador de posicion elegante
 * con el icono de su linea: el catalogo se ve bien desde el primer dia.
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
        'flex h-full w-full items-center justify-center bg-gradient-to-br from-marca-50 via-white to-marca-100 patron-puntos',
        className
      )}
      aria-hidden="true"
    >
      <IconoSitio nombre={icono ?? 'caja'} className="h-1/3 max-h-16 w-auto text-marca-200" />
    </div>
  )
}
