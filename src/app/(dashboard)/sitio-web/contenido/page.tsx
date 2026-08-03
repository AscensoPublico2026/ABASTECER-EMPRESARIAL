import Link from 'next/link'
import { FileText, ExternalLink } from 'lucide-react'
import { obtenerCamposContenido, obtenerResumenSitio } from '@/lib/queries/sitioAdmin'
import NavSitioWeb from '../NavSitioWeb'
import AvisoMigracion from '../AvisoMigracion'
import FormContenido from './FormContenido'

export const dynamic = 'force-dynamic'

export default async function PaginaContenidoSitio() {
  const [campos, resumen] = await Promise.all([obtenerCamposContenido(), obtenerResumenSitio()])

  return (
    <div className="texto-normal space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <FileText className="h-6 w-6 text-blue-600" />
            Contenido de la web
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Todo lo que dice la página web se edita aquí. Escribe con tildes y mayúsculas normales:
            este texto lo lee el cliente.
          </p>
        </div>

        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <ExternalLink className="h-4 w-4" />
          Ver la web
        </Link>
      </div>

      <NavSitioWeb solicitudesNuevas={resumen.solicitudesNuevas} />

      {!resumen.migracionLista ? <AvisoMigracion /> : null}

      <FormContenido campos={campos} />
    </div>
  )
}
