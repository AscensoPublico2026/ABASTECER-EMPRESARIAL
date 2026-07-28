import Header from '@/components/layout/Header'
import { ShoppingCart } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ComprasPage() {
  return (
    <>
      <Header title="Compras" subtitle="Facturas de compra y ordenes a proveedores" />
      <div className="p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Modulo de Compras v2</h3>
            <p className="text-sm text-gray-500 mt-0.5">En reconstruccion — vinculado al catalogo de productos</p>
          </div>
          <div className="text-center py-12 text-gray-400">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Compras v2 en desarrollo</p>
            <p className="text-sm mt-1">Este modulo se reconstruye vinculado al catalogo de productos y ordenes de compra. Proximo paso del rediseno.</p>
          </div>
        </div>
      </div>
    </>
  )
}
