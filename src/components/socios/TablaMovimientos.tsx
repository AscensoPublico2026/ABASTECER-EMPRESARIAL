import { formatCOP, formatFecha } from '@/lib/format'
import { TIPOS_MOVIMIENTO, type MovimientoConSocio } from '@/types/socios'
import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react'

interface TablaMovimientosProps {
  movimientos: MovimientoConSocio[]
}

export default function TablaMovimientos({ movimientos }: TablaMovimientosProps) {
  if (movimientos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Sin movimientos registrados</p>
        <p className="text-sm mt-1">
          Registra el primer aporte de capital para empezar.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="px-6 py-3 font-medium text-gray-500">Fecha</th>
            <th className="px-6 py-3 font-medium text-gray-500">Socio</th>
            <th className="px-6 py-3 font-medium text-gray-500">Tipo</th>
            <th className="px-6 py-3 font-medium text-gray-500">Descripcion</th>
            <th className="px-6 py-3 font-medium text-gray-500 text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => {
            const meta = TIPOS_MOVIMIENTO[m.tipo]
            const entra = meta?.direccion === 'ENTRA'
            return (
              <tr
                key={m.id}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition"
              >
                <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                  {formatFecha(m.fecha)}
                </td>
                <td className="px-6 py-4 font-medium text-gray-800">
                  {m.socio_nombre}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      meta?.color ?? 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {entra ? (
                      <ArrowDownLeft className="w-3 h-3" />
                    ) : (
                      <ArrowUpRight className="w-3 h-3" />
                    )}
                    {meta?.etiqueta ?? m.tipo}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                  {m.descripcion || <span className="text-gray-300">-</span>}
                </td>
                <td
                  className={`px-6 py-4 text-right font-medium tabular-nums whitespace-nowrap ${
                    entra ? 'text-green-600' : 'text-gray-700'
                  }`}
                >
                  {entra ? '+' : '-'} {formatCOP(m.monto)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
