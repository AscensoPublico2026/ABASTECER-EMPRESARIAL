import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  titulo: string
  valor: string
  descripcion?: string
  icono: LucideIcon
  color?: 'blue' | 'green' | 'indigo' | 'purple' | 'amber'
}

const COLORES = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  purple: 'bg-purple-50 text-purple-600',
  amber: 'bg-amber-50 text-amber-600',
}

export default function KpiCard({
  titulo,
  valor,
  descripcion,
  icono: Icono,
  color = 'blue',
}: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${COLORES[color]}`}>
          <Icono className="w-5 h-5" />
        </div>
        <span className="text-sm text-gray-500">{titulo}</span>
      </div>
      <p className="text-2xl font-bold text-gray-800 tabular-nums">{valor}</p>
      {descripcion && (
        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{descripcion}</p>
      )}
    </div>
  )
}
