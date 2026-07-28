import Header from '@/components/layout/Header'
import { obtenerCompras, obtenerProveedoresParaSelect } from '@/lib/queries/compras'
import { ESTADOS_COMPRA, type EstadoCompra } from '@/types/compras'
import { formatCOP, formatFecha } from '@/lib/format'
import { ShoppingCart } from 'lucide-react'
import FormCompra from './FormCompra'

export const dynamic = 'force-dynamic'

export default async function ComprasPage() {
  const { data: compras, error, totales } = await obtenerCompras()
  const proveedores = await obtenerProveedoresParaSelect()

  return (
    <>
      <Header title="Compras" subtitle="Facturas de compra, IVA pagado y cuentas por pagar" />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Compras totales</p>
            <p className="text-2xl font-bold text-gray-800 mt-1 tabular-nums">{formatCOP(totales.total)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Subtotal (base)</p>
            <p className="text-2xl font-bold text-gray-700 mt-1 tabular-nums">{formatCOP(totales.subtotal)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">IVA pagado</p>
            <p className="text-2xl font-bold text-blue-600 mt-1 tabular-nums">{formatCOP(totales.iva)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Descontable en declaracion</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Por pagar a proveedores</p>
            <p className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">{formatCOP(totales.porPagar)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-800">Facturas de compra</h3>
              <p className="text-sm text-gray-500 mt-0.5">Cada compra calcula IVA automaticamente</p>
            </div>
            <FormCompra proveedores={proveedores} />
          </div>

          {error && <div className="px-6 py-4 bg-red-50 text-red-700 text-sm border-b border-red-100">Error: {error}</div>}

          {compras.length === 0 && !error ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Sin compras registradas</p>
              <p className="text-sm mt-1">Registra tu primera compra para ver el IVA y las cuentas por pagar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 font-medium text-gray-500">Fecha</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Proveedor</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Factura</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Subtotal</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">IVA</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Total</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {compras.map((c) => {
                    const estado = ESTADOS_COMPRA[c.estado as EstadoCompra] ?? ESTADOS_COMPRA.PAGADA
                    return (
                      <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatFecha(c.fecha)}</td>
                        <td className="px-6 py-4 font-medium text-gray-800">{c.proveedor_nombre ?? 'Sin proveedor'}</td>
                        <td className="px-6 py-4 text-gray-500">{c.numero_factura ?? '-'}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-gray-600">{formatCOP(c.subtotal)}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-blue-600">{formatCOP(c.iva_total)}</td>
                        <td className="px-6 py-4 text-right tabular-nums font-medium text-gray-800">{formatCOP(c.total)}</td>
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
