import Link from 'next/link'
import {
  Globe, Package, ImageOff, Star, Layers, Inbox, ExternalLink, ArrowRight,
  FileText, CheckCircle2, Rocket,
} from 'lucide-react'
import { obtenerResumenSitio } from '@/lib/queries/sitioAdmin'
import { SITIO_URL } from '@/lib/sitio/config'
import NavSitioWeb from './NavSitioWeb'
import AvisoMigracion from './AvisoMigracion'

export const dynamic = 'force-dynamic'

export default async function PaginaSitioWeb() {
  const resumen = await obtenerResumenSitio()

  const tarjetas = [
    {
      etiqueta: 'Productos publicados',
      valor: resumen.productosPublicados,
      detalle: `de ${resumen.productosActivos} activos en el catálogo interno`,
      icono: Package,
      color: 'bg-green-100 text-green-600',
      href: '/sitio-web/productos',
    },
    {
      etiqueta: 'Sin foto',
      valor: resumen.productosSinImagen,
      detalle: 'productos publicados que aún no tienen imagen',
      icono: ImageOff,
      color: 'bg-amber-100 text-amber-600',
      href: '/sitio-web/productos?filtro=sin-imagen',
    },
    {
      etiqueta: 'Destacados',
      valor: resumen.productosDestacados,
      detalle: 'aparecen en la página de inicio',
      icono: Star,
      color: 'bg-blue-100 text-blue-600',
      href: '/sitio-web/productos?filtro=destacados',
    },
    {
      etiqueta: 'Solicitudes nuevas',
      valor: resumen.solicitudesNuevas,
      detalle: `${resumen.solicitudesTotal} en total recibidas desde la web`,
      icono: Inbox,
      color: resumen.solicitudesNuevas > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500',
      href: '/sitio-web/solicitudes',
    },
  ]

  const accesos = [
    {
      titulo: 'Editar los textos de la web',
      descripcion:
        'Título principal, misión, visión, valores, beneficios, teléfonos, WhatsApp, redes sociales. Todo sin tocar código.',
      href: '/sitio-web/contenido',
      icono: FileText,
      color: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
    },
    {
      titulo: 'Publicar y editar productos',
      descripcion:
        'Elige qué productos ve el cliente, súbeles foto, descripción comercial y márcalos como destacados.',
      href: '/sitio-web/productos',
      icono: Package,
      color: 'text-green-600 bg-green-50 hover:bg-green-100',
    },
    {
      titulo: 'Organizar las líneas',
      descripcion:
        'Nombre, descripción e icono de cada línea de producto tal como aparece en la web.',
      href: '/sitio-web/lineas',
      icono: Layers,
      color: 'text-purple-600 bg-purple-50 hover:bg-purple-100',
    },
    {
      titulo: 'Revisar solicitudes',
      descripcion:
        'Bandeja de mensajes y solicitudes de cotización que llegan desde la página web.',
      href: '/sitio-web/solicitudes',
      icono: Inbox,
      color: 'text-amber-600 bg-amber-50 hover:bg-amber-100',
    },
  ]

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <Globe className="h-6 w-6 text-blue-600" />
            Sitio Web
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Administra la página web pública de ABASTECER EMPRESARIAL sin depender de nadie.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            Ver la web
          </Link>
          <Link
            href="/sitio-web/contenido"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Editar contenido
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <NavSitioWeb solicitudesNuevas={resumen.solicitudesNuevas} />

      {!resumen.migracionLista ? <AvisoMigracion /> : null}

      {/* Indicadores */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((tarjeta) => (
          <Link
            key={tarjeta.etiqueta}
            href={tarjeta.href}
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:border-blue-200"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tarjeta.color}`}>
              <tarjeta.icono className="h-5 w-5" />
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums text-gray-800">{tarjeta.valor}</p>
            <p className="mt-1 text-sm text-gray-500">{tarjeta.etiqueta}</p>
            <p className="mt-0.5 text-xs text-gray-400">{tarjeta.detalle}</p>
          </Link>
        ))}
      </div>

      {/* Accesos */}
      <div className="grid gap-4 lg:grid-cols-2">
        {accesos.map((acceso) => (
          <Link
            key={acceso.href}
            href={acceso.href}
            className="group flex gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:border-blue-200"
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${acceso.color}`}
            >
              <acceso.icono className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="flex items-center gap-1.5 font-semibold text-gray-800">
                {acceso.titulo}
                <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">{acceso.descripcion}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Como funciona */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 font-semibold text-gray-800">
          <Rocket className="h-5 w-5 text-blue-600" />
          Cómo funciona la web
        </h3>
        <ul className="mt-4 space-y-3 text-sm text-gray-600">
          {[
            'Cada producto que creas en Catálogo aparece automáticamente en la web (puedes ocultarlo cuando quieras).',
            'La web NO muestra precios: el cliente arma su lista y te llega la solicitud de cotización aquí mismo.',
            'Los costos, márgenes y stock nunca salen a internet: la web solo lee un catálogo depurado sin esa información.',
            'Cuando editas un texto o publicas un producto, la web se actualiza en segundos. No hay que llamar a nadie.',
          ].map((linea) => (
            <li key={linea} className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              <span className="leading-relaxed">{linea}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
          Dirección pública configurada:{' '}
          <span className="font-mono font-semibold text-gray-700">{SITIO_URL}</span>. Para conectar el
          dominio revisa{' '}
          <span className="font-mono">docs/sitio-web/dominio-y-despliegue.md</span> en el repositorio.
        </div>
      </div>
    </div>
  )
}
