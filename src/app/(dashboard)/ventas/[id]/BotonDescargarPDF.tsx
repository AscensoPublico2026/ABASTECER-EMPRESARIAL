'use client'

import { Download } from 'lucide-react'

interface Props {
  cotizacionId: string
}

export default function BotonDescargarPDF({ cotizacionId }: Props) {
  function descargar() {
    window.open(`/api/cotizacion-pdf/${cotizacionId}`, '_blank')
  }

  return (
    <button
      onClick={descargar}
      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
    >
      <Download className="w-4 h-4" /> Descargar PDF
    </button>
  )
}
