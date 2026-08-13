'use client'

import { useState, useTransition } from 'react'
import { editarRemision } from '../../actions'
import { Pencil, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'

interface Props {
  cotizacionId: string
  ocCliente: string
  observaciones: string
}

export default function FormEditarRemision({ cotizacionId, ocCliente, observaciones }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [oc, setOc] = useState(ocCliente)
  const [obs, setObs] = useState(observaciones)
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  function guardar() {
    const fd = new FormData()
    fd.set('cotizacion_id', cotizacionId)
    fd.set('oc_cliente', oc)
    fd.set('observaciones', obs)
    startTransition(async () => {
      const res = await editarRemision(fd)
      setResultado(res)
      if (res.ok) setTimeout(() => { setAbierto(false); setResultado(null) }, 1500)
    })
  }

  if (!abierto) {
    return (
      <div className="print:hidden max-w-[210mm] mx-auto mt-4 px-10">
        <button
          onClick={() => setAbierto(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 transition"
        >
          <Pencil className="w-3.5 h-3.5" />
          Editar OC del cliente y observaciones
        </button>
      </div>
    )
  }

  return (
    <div className="print:hidden max-w-[210mm] mx-auto mt-4 px-10">
      <div className="bg-white border border-indigo-200 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">Editar datos de la remision</h3>
          <button onClick={() => { setAbierto(false); setResultado(null) }} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numero de OC del cliente</label>
            <input
              value={oc}
              onChange={(e) => setOc(e.target.value)}
              placeholder="Ej: OC-12345"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Aparece en la remision y en el rotulo de la caja</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones de entrega</label>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ej: Entregar en recepcion, piso 3"
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none"
            />
          </div>
        </div>

        {resultado && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {resultado.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {resultado.mensaje}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => { setAbierto(false); setResultado(null) }} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={guardar} disabled={pendiente} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {pendiente && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
