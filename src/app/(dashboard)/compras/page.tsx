'use client'

import Header from '@/components/layout/Header'
import { ShoppingCart, Plus } from 'lucide-react'

export default function ComprasPage() {
  return (
    <div>
      <Header title="Compras" subtitle="Registro y seguimiento de compras" />
      <div className="p-8">
        <div className="flex justify-end mb-6">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" />
            Nueva Compra
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-4">
            <ShoppingCart className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Modulo en construccion</h3>
          <p className="text-sm text-gray-500 text-center max-w-md">Aqui podras registrar las compras a proveedores, gestionar ordenes de compra y controlar los costos de adquisicion.</p>
        </div>
      </div>
    </div>
  )
}
