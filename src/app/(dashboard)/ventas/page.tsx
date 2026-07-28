import Header from '@/components/layout/Header'
import { obtenerVentas, obtenerClientesParaSelect } from '@/lib/queries/ventas'
import { ESTADOS_VENTA, type EstadoVenta } from '@/types/ventas'
import { formatCOP, formatFecha } from '@/lib/format'
import { Receipt } from 'lucide-react'
import FormVenta from './FormVenta'

export const dynamic = 'force-dynamic'

export default async function VentasPage() {
  const { data: ventas, error, totales } = await obtenerVentas()
  const clientes = await obtenerClientesParaSelect()

  return (
    <>
      <Header title="Ventas" subtitle="Cotizaciones, facturas y utilidad bruta" />
      <div className="p-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Ventas totales</p>
            <p className="text-2xl font-bold text-gray-800 mt-1 tabular-nums">{formatCOP(totales.total)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">IVA cobrado</p>
            <p className="text-2xl font-bold text-blue-600 mt-1 tabular-nums">{formatCOP(totales.iva)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Costo total</p>
            <p className="text-2xl font-bold text-gray-700 mt-1 tabular-nums">{formatCOP(totales.costo)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Utilidad bruta</p>
            <p className="text-2xl font-bold text-green-600 mt-1 tabular-nums">{formatCOP(totales.utilidad)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Por cobrar</p>
            <p className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">{formatCOP(totales.porCobrar)}</p>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-800">Cotizaciones y facturas</h3>
              <p className="text-sm text-gray-500 mt-0.5">Cada venta calcula utilidad automaticamente</p>
            </div>
            <FormVenta clientes={clientes} />
          </div>

          {error && <div className="px-6 py-4 bg-red-50 text-red-700 text-sm border-b border-red-100">Error: {error}</div>}

          {ventas.length === 0 && !error ? (
            <div className="text-center py-12 text-gray-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Sin ventas registradas</p>
              <p className="text-sm mt-1">Crea tu primera cotizacion para calcular la utilidad.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 font-medium text-gray-500">Fecha</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Cliente</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Cotizacion/Factura</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Subtotal</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Costo</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Utilidad</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Margen %</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((v) => {
                    const estado = ESTADOS_VENTA[v.estado as EstadoVenta] ?? ESTADOS_VENTA.COTIZACION
                    const utilidadPositiva = v.utilidad_bruta >= 0
                    return (
                      <tr key={v.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatFecha(v.fecha)}</td>
                        <td className="px-6 py-4 font-medium text-gray-800">{v.cliente_nombre ?? 'Sin cliente'}</td>
                        <td className="px-6 py-4 text-gray-500">{v.numero_cotizacion ?? v.numero_factura ?? '-'}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-gray-600">{formatCOP(v.subtotal)}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-gray-600">{formatCOP(v.costo_total)}</td>
                        <td className={`px-6 py-4 text-right tabular-nums font-medium ${utilidadPositiva ? 'text-green-600' : 'text-red-600'}`}>{formatCOP(v.utilidad_bruta)}</td>
                        <td className={`px-6 py-4 text-right tabular-nums ${utilidadPositiva ? 'text-green-600' : 'text-red-600'}`}>{v.margen_pct.toFixed(1)}%</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${estado.color}`}>{estado.etiqueta}</span>
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
