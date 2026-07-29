'use client'

import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Factura {
  id: string
  numero_factura_dian: string | null
  fecha: string
  fecha_vencimiento?: string | null
  total: number
  utilidad: number
  estado: string
  dias_credito?: number
  forma_pago?: string
}

interface Props {
  facturas: Factura[]
  clienteNombre: string
}

export default function DescargarEstadoCuenta({ facturas, clienteNombre }: Props) {
  function descargar() {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

    const datos = facturas.map((f) => {
      let dias: number | string = ''
      let estadoFinal = f.estado
      if (f.fecha_vencimiento && f.estado === 'EMITIDA') {
        const [y, m, d] = (f.fecha_vencimiento as string).split('-').map(Number)
        const diff = Math.ceil((new Date(y, m - 1, d).getTime() - hoy.getTime()) / 86400000)
        dias = diff
        if (diff < 0) estadoFinal = `EN MORA (${Math.abs(diff)} dias)`
      }
      if (f.estado === 'COBRADA') estadoFinal = 'COBRADA'

      return {
        'Factura DIAN': f.numero_factura_dian ?? '',
        'Fecha emision': f.fecha,
        'Fecha vencimiento': f.fecha_vencimiento ?? '',
        'Dias restantes': dias,
        'Total': Number(f.total),
        'Estado': estadoFinal,
        'Tipo pago': Number(f.dias_credito ?? 0) > 0 ? `Credito ${f.dias_credito}d` : 'Contado',
      }
    })

    const ws = XLSX.utils.json_to_sheet(datos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Estado de Cuenta')
    XLSX.writeFile(wb, `Estado_Cuenta_${clienteNombre.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <button onClick={descargar} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition">
      <Download className="w-3.5 h-3.5" /> Descargar estado de cuenta
    </button>
  )
}
