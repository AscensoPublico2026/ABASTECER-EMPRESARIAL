'use client'

import Header from '@/components/layout/Header'
import { BarChart3 } from 'lucide-react'

export default function IndicadoresPage() {
  return (
    <div>
      <Header title="Indicadores" subtitle="Metricas y KPIs del negocio" />
      <div className="p-8">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-cyan-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Modulo en construccion</h3>
          <p className="text-sm text-gray-500 text-center max-w-md">Aqui podras visualizar indicadores clave de rendimiento, graficas de tendencias y reportes financieros.</p>
        </div>
      </div>
    </div>
  )
}
