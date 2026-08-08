import Header from '@/components/layout/Header'
import { obtenerListadoPrecios } from '@/lib/queries/listadoPrecios'
import TablaPrecios from './TablaPrecios'
import { AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PreciosPage() {
  const { filas, error } = await obtenerListadoPrecios()

  return (
    <>
      <Header
        title="Listado de precios"
        subtitle="A cuanto vender, por debajo de cuanto comprar, y como esta el mercado"
      />
      <div className="p-8 print:p-0 space-y-6">

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 print:hidden">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-red-800">No se pudo cargar el listado</p>
              <p className="text-red-700 mt-0.5 font-mono text-xs">{error}</p>
              <p className="text-red-700 mt-1.5">
                Si dice que no encuentra <code>listado_precios</code>, falta correr la
                migracion <strong>034_listado_precios.sql</strong> en Supabase.
              </p>
            </div>
          </div>
        )}

        {!error && filas.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-12 text-center print:hidden">
            <p className="font-medium text-gray-700">Todavia no hay productos en el catalogo</p>
            <p className="text-sm text-gray-500 mt-1">
              Crea productos en Inventario y agregales los precios que te dan los proveedores.
            </p>
            <a
              href="/inventario"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
            >
              Ir a Inventario
            </a>
          </div>
        )}

        {filas.length > 0 && <TablaPrecios filas={filas} />}
      </div>
    </>
  )
}
