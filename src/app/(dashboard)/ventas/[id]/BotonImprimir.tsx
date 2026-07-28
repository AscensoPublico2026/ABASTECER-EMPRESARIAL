'use client'

import { Printer } from 'lucide-react'

export default function BotonImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
    >
      <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
    </button>
  )
}
