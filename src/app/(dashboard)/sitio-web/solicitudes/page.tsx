import { Inbox, Info } from 'lucide-react'
import { obtenerSolicitudesSitio, obtenerResumenSitio } from '@/lib/queries/sitioAdmin'
import NavSitioWeb from '../NavSitioWeb'
import AvisoMigracion from '../AvisoMigracion'
import PanelSolicitudes from './PanelSolicitudes'

export const dynamic = 'force-dynamic'

export default async function PaginaSolicitudesSitio() {
  const [solicitudes, resumen] = await Promise.all([
    obtenerSolicitudesSitio(),
    obtenerResumenSitio(),
  ])

  return (
    <div className="space-y-6 p-8">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <Inbox className="h-6 w-6 text-blue-600" />
          Solicitudes de la web
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Todo lo que envían los clientes desde la página web llega aquí: mensajes de contacto y
          listas de cotización.
        </p>
      </div>

      <NavSitioWeb solicitudesNuevas={resumen.solicitudesNuevas} />

      {!resumen.migracionLista ? <AvisoMigracion /> : null}

      <div className="flex gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 text-sm text-blue-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="leading-relaxed">
          Cuando cierres una venta a partir de una solicitud, registra el cliente en{' '}
          <strong>Clientes</strong> y genera la cotización formal en <strong>Cotizaciones</strong>.
          Aquí solo se hace el seguimiento del contacto inicial.
        </p>
      </div>

      <PanelSolicitudes solicitudes={solicitudes} />
    </div>
  )
}
