import Link from 'next/link'
import { Package, ExternalLink, Info } from 'lucide-react'
import {
  obtenerProductosAdminWeb,
  obtenerLineasAdminWeb,
  obtenerResumenSitio,
} from '@/lib/queries/sitioAdmin'
import NavSitioWeb from '../NavSitioWeb'
import AvisoMigracion from '../AvisoMigracion'
import PanelProductosWeb from './PanelProductosWeb'

export const dynamic = 'force-dynamic'

type Filtro = 'todos' | 'publicados' | 'ocultos' | 'sin-imagen' | 'destacados'

const FILTROS_VALIDOS: Filtro[] = ['todos', 'publicados', 'ocultos', 'sin-imagen', 'destacados']

export default async function PaginaProductosSitio({
  searchParams,
}: {
  searchParams: { filtro?: string }
}) {
  const [productos, lineas, resumen] = await Promise.all([
    obtenerProductosAdminWeb(),
    obtenerLineasAdminWeb(),
    obtenerResumenSitio(),
  ])

  const filtroInicial = FILTROS_VALIDOS.includes(searchParams.filtro as Filtro)
    ? (searchParams.filtro as Filtro)
    : 'todos'

  const categorias = lineas.map((l) => ({ id: l.id, nombre: l.nombre_web || l.nombre }))

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <Package className="h-6 w-6 text-blue-600" />
            Productos en la web
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Decide qué productos ve el cliente, súbeles foto y escríbeles una descripción comercial.
            La web nunca muestra precios ni costos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/inventario"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Crear producto
          </Link>
          <Link
            href="/catalogo"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            Ver catálogo web
          </Link>
        </div>
      </div>

      <NavSitioWeb solicitudesNuevas={resumen.solicitudesNuevas} />

      {!resumen.migracionLista ? <AvisoMigracion /> : null}

      <div className="flex gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 text-sm text-blue-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="leading-relaxed">
          Los productos se crean en <strong>Catálogo</strong> (el módulo de inventario) y aparecen
          aquí automáticamente. Aquí solo controlas <strong>cómo se ven en internet</strong>: foto,
          nombre comercial, descripción y si están publicados o no.
        </p>
      </div>

      <PanelProductosWeb
        productos={productos}
        categorias={categorias}
        filtroInicial={filtroInicial}
      />
    </div>
  )
}
