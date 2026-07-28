import { formatCOP, formatPorcentaje } from '@/lib/format'
import type { ResumenSocio } from '@/types/socios'
import { Users } from 'lucide-react'

interface TablaSociosProps {
  socios: ResumenSocio[]
}

export default function TablaSocios({ socios }: TablaSociosProps) {
  if (socios.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Aun no hay socios registrados</p>
        <p className="text-sm mt-1">
          Ejecuta el script SQL para crear a Julio y Laura.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="px-6 py-3 font-medium text-gray-500">Socio</th>
            <th className="px-6 py-3 font-medium text-gray-500 text-right">
              Participacion
            </th>
            <th className="px-6 py-3 font-medium text-gray-500 text-right">
              Capital aportado
            </th>
            <th className="px-6 py-3 font-medium text-gray-500 text-right">
              Prestamo pendiente
            </th>
            <th className="px-6 py-3 font-medium text-gray-500 text-right">
              Dividendos
            </th>
            <th className="px-6 py-3 font-medium text-gray-500 text-right">
              Remuneracion
            </th>
          </tr>
        </thead>
        <tbody>
          {socios.map((s) => (
            <tr
              key={s.id}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {s.nombre.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{s.nombre}</p>
                    {s.cargo && (
                      <p className="text-xs text-gray-400">{s.cargo}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-right font-medium text-gray-700 tabular-nums">
                {formatPorcentaje(s.participacion_pct)}
              </td>
              <td className="px-6 py-4 text-right text-gray-700 tabular-nums">
                {formatCOP(s.capital_aportado)}
              </td>
              <td className="px-6 py-4 text-right tabular-nums">
                {s.prestamo_pendiente > 0 ? (
                  <span className="text-indigo-600 font-medium">
                    {formatCOP(s.prestamo_pendiente)}
                  </span>
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
              <td className="px-6 py-4 text-right text-gray-700 tabular-nums">
                {s.dividendos_recibidos > 0
                  ? formatCOP(s.dividendos_recibidos)
                  : <span className="text-gray-300">-</span>}
              </td>
              <td className="px-6 py-4 text-right text-gray-700 tabular-nums">
                {s.remuneracion_total > 0
                  ? formatCOP(s.remuneracion_total)
                  : <span className="text-gray-300">-</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="px-6 py-4 text-xs text-gray-400 border-t border-gray-50">
        Los dividendos se reparten segun la participacion accionaria. La
        remuneracion depende del trabajo realizado y puede ser distinta entre
        socios (Decision #009: separar propiedad de trabajo).
      </p>
    </div>
  )
}
