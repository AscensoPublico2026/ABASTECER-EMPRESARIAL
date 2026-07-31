'use client'

import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Retencion {
  numero_factura: string
  fecha_pago: string | null
  total_factura: number
  monto_recibido: number
  retefuente: number
  reteiva: number
  reteica: number
  total_retenido: number
}

interface Props {
  retenciones: Retencion[]
  clienteNombre: string
}

export default function ReporteRetenciones({ retenciones, clienteNombre }: Props) {
  if (retenciones.length === 0) return null

  const totalRetefuente = retenciones.reduce((s, r) => s + r.retefuente, 0)
  const totalReteiva = retenciones.reduce((s, r) => s + r.reteiva, 0)
  const totalReteica = retenciones.reduce((s, r) => s + r.reteica, 0)
  const totalRetenido = retenciones.reduce((s, r) => s + r.total_retenido, 0)

  function descargar() {
    const datos = retenciones.map((r) => ({
      'Factura': r.numero_factura,
      'Fecha pago': r.fecha_pago ?? '',
      'Total factura': r.total_factura,
      'Monto recibido': r.monto_recibido,
      'Retefuente': r.retefuente,
      'ReteIVA': r.reteiva,
      'ReteICA': r.reteica,
      'Total retenido': r.total_retenido,
    }))

    // Fila de totales
    datos.push({
      'Factura': 'TOTAL AÑO',
      'Fecha pago': '',
      'Total factura': retenciones.reduce((s, r) => s + r.total_factura, 0),
      'Monto recibido': retenciones.reduce((s, r) => s + r.monto_recibido, 0),
      'Retefuente': totalRetefuente,
      'ReteIVA': totalReteiva,
      'ReteICA': totalReteica,
      'Total retenido': totalRetenido,
    })

    const ws = XLSX.utils.json_to_sheet(datos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Retenciones')
    XLSX.writeFile(wb, `Retenciones_${clienteNombre.replace(/\s+/g, '_')}_${new Date().getFullYear()}.xlsx`)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Retenciones aplicadas por este cliente</h3>
          <p className="text-xs text-gray-500 mt-0.5">Para comparar con el certificado de retencion a fin de año</p>
        </div>
        <button onClick={descargar} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium hover:bg-amber-100 transition">
          <Download className="w-3.5 h-3.5" /> Descargar reporte
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
              <th className="px-4 py-2 font-medium text-gray-500 text-xs">Factura</th>
              <th className="px-4 py-2 font-medium text-gray-500 text-xs">Fecha pago</th>
              <th className="px-4 py-2 font-medium text-gray-500 text-xs text-right">Retefuente</th>
              <th className="px-4 py-2 font-medium text-gray-500 text-xs text-right">ReteIVA</th>
              <th className="px-4 py-2 font-medium text-gray-500 text-xs text-right">ReteICA</th>
              <th className="px-4 py-2 font-medium text-gray-500 text-xs text-right">Total retenido</th>
            </tr>
          </thead>
          <tbody>
            {retenciones.map((r, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{r.numero_factura}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{r.fecha_pago ?? '-'}</td>
                <td className="px-4 py-2 text-right tabular-nums text-xs">${r.retefuente.toLocaleString('es-CO')}</td>
                <td className="px-4 py-2 text-right tabular-nums text-xs">${r.reteiva.toLocaleString('es-CO')}</td>
                <td className="px-4 py-2 text-right tabular-nums text-xs">${r.reteica.toLocaleString('es-CO')}</td>
                <td className="px-4 py-2 text-right tabular-nums text-xs font-medium">${r.total_retenido.toLocaleString('es-CO')}</td>
              </tr>
            ))}
            <tr className="bg-amber-50 font-medium">
              <td className="px-4 py-2 text-xs" colSpan={2}>TOTAL AÑO</td>
              <td className="px-4 py-2 text-right tabular-nums text-xs">${totalRetefuente.toLocaleString('es-CO')}</td>
              <td className="px-4 py-2 text-right tabular-nums text-xs">${totalReteiva.toLocaleString('es-CO')}</td>
              <td className="px-4 py-2 text-right tabular-nums text-xs">${totalReteica.toLocaleString('es-CO')}</td>
              <td className="px-4 py-2 text-right tabular-nums text-xs font-bold">${totalRetenido.toLocaleString('es-CO')}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 bg-amber-50/50 border-t border-amber-100">
        <p className="text-xs text-amber-700">Compara estos valores con el certificado que te entregue el cliente en Enero-Marzo del proximo año. Si no coinciden, reclama la diferencia.</p>
      </div>
    </div>
  )
}
