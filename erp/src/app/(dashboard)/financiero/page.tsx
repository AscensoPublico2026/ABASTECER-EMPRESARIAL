'use client'

import Header from '@/components/layout/Header'
import { DollarSign, Plus } from 'lucide-react'

export default function FinancieroPage() {
  return (
    <div>
      <Header title="Centro Financiero" subtitle="Gestion de finanzas y tesoreria" />
      <div className="p-8">
        <div className="flex justify-end mb-6">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" />
            Nuevo Movimiento
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
            <DollarSign className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Modulo en construccion</h3>
          <p className="text-sm text-gray-500 text-center max-w-md">Aqui podras gestionar la tesoreria, registrar movimientos financieros y controlar el flujo de caja.</p>
        </div>
      </div>
    </div>
  )
}
