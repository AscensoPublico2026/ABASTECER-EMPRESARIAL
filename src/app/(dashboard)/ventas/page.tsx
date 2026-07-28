import Header from '@/components/layout/Header'
import { obtenerCotizaciones } from '@/lib/queries/cotizaciones'
import { ESTADOS_COTIZACION, type EstadoCotizacion } from '@/types/cotizaciones'
import { formatCOP, formatFecha } from '@/lib/format'
import { Receipt } from 'lucide-react'
import FormCotizacion from './FormCotizacion'
import AccionesCotizacion from './AccionesCotizacion'
import { obtenerClientesParaSelect } from '@/lib/queries/clientes'
import { obtenerProductoParaSelect } from '@/lib/queries/productos'

export const dynamic = 'force-dynamic'

export default async function VentasPage() {
  const { data: cotizaciones, error } = await obtenerCotizaciones()
  const clientes = await obtenerClientesParaSelect()
  const productos = await obtenerProductoParaSelect()

  // KPI calculations
  const cotizacionesActivas = cotizaciones.filter((c) => c.estado !== 'RECHAZADA')
  const totalCotizado = cotizacionesActivas.reduce((sum, c) => sum + c.total, 0)
  const utilidadEstimada = cotizacionesActivas.reduce((sum, c) => sum + c.utilidad_estimada, 0)
  const pendientes = cotizaciones.filter((c) => c.estado === 'PENDIENTE').length
  const aprobadas = cotizaciones.filter((c) => c.estado === 'APROBADA').length

  return (
    <>
      <Header title="Cotizaciones" subtitle="Gestiona cotizaciones y calcula utilidad estimada" />
      <div className="p-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total cotizado</p>
            <p className="text-2xl font-bold text-gray-800 mt-1 tabular-nums">{formatCOP(totalCotizado)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Utilidad estimada</p>
            <p className="text-2xl font-bold text-green-600 mt-1 tabular-nums">{formatCOP(utilidadEstimada)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Pendientes de respuesta</p>
            <p className="text-2xl font-bold text-blue-600 mt-1 tabular-nums">{pendientes}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Aprobadas</p>
            <p className="text-2xl font-bold text-green-600 mt-1 tabular-nums">{aprobadas}</p>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-800">Cotizaciones</h3>
              <p className="text-sm text-gray-500 mt-0.5">El costo se calcula automaticamente del catalogo</p>
            </div>
            <FormCotizacion clientes={clientes} productos={productos} />
          </div>

          {error && <div className="px-6 py-4 bg-red-50 text-red-700 text-sm border-b border-red-100">Error: {error}</div>}

          {cotizaciones.length === 0 && !error ? (
            <div className="text-center py-12 text-gray-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Sin cotizaciones</p>
              <p className="text-sm mt-1">Crea tu primera cotizacion. El costo se calcula automaticamente del catalogo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 font-medium text-gray-500">Numero</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Cliente</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Fecha</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Total</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Utilidad</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Margen %</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Estado</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizaciones.map((c) => {
                    const estado = ESTADOS_COTIZACION[c.estado as EstadoCotizacion] ?? ESTADOS_COTIZACION.PENDIENTE
                    const utilidadPositiva = c.utilidad_estimada >= 0
                    return (
                      <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-mono text-gray-700 whitespace-nowrap">{c.numero}</td>
                        <td className="px-6 py-4 font-medium text-gray-800">{c.cliente_nombre ?? 'Sin cliente'}</td>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatFecha(c.fecha)}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-gray-700">{formatCOP(c.total)}</td>
                        <td className={`px-6 py-4 text-right tabular-nums font-medium ${utilidadPositiva ? 'text-green-600' : 'text-red-600'}`}>{formatCOP(c.utilidad_estimada)}</td>
                        <td className={`px-6 py-4 text-right tabular-nums ${utilidadPositiva ? 'text-green-600' : 'text-red-600'}`}>{c.margen_pct.toFixed(1)}%</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${estado.color}`}>{estado.etiqueta}</span>
                        </td>
                        <td className="px-6 py-4">
                          <AccionesCotizacion cotizacionId={c.id} estado={c.estado} numero={c.numero} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
