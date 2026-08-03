import Link from 'next/link'
import { Layers, Settings, Info } from 'lucide-react'
import { obtenerLineasAdminWeb, obtenerResumenSitio } from '@/lib/queries/sitioAdmin'
import NavSitioWeb from '../NavSitioWeb'
import AvisoMigracion from '../AvisoMigracion'
import PanelLineasWeb from './PanelLineasWeb'

export const dynamic = 'force-dynamic'

export default async function PaginaLineasSitio() {
  const [lineas, resumen] = await Promise.all([obtenerLineasAdminWeb(), obtenerResumenSitio()])

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <Layers className="h-6 w-6 text-blue-600" />
            Líneas de producto
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Son las categorías del catálogo, pero con la cara que ven los clientes: nombre bonito,
            descripción comercial e icono.
          </p>
        </div>

        <Link
          href="/configuracion"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <Settings className="h-4 w-4" />
          Crear o borrar categorías
        </Link>
      </div>

      <NavSitioWeb solicitudesNuevas={resumen.solicitudesNuevas} />

      {!resumen.migracionLista ? <AvisoMigracion /> : null}

      <div className="flex gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 text-sm text-blue-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="leading-relaxed">
          Las líneas sin productos publicados igual aparecen en la web, pero sin conteo. Si no quieres
          que una línea se vea todavía, desmárcala como visible.
        </p>
      </div>

      <PanelLineasWeb lineas={lineas} />
    </div>
  )
}
