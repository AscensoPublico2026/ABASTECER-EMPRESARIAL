'use client'

import Header from '@/components/layout/Header'
import { Receipt, Plus } from 'lucide-react'

export default function VentasPage() {
  return (
    <div>
      <Header title="Ventas" subtitle="Registro y seguimiento de ventas" />
      <div className="p-8">
        <div className="flex justify-end mb-6">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" />
            Nueva Venta
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Modulo en construccion</h3>
          <p className="text-sm text-gray-500 text-center max-w-md">Aqui podras registrar ventas, generar facturas y hacer seguimiento a los ingresos del negocio.</p>
        </div>
      </div>
    </div>
  )
}
