'use client'

import { useState, useTransition } from 'react'
import { aprobarCotizacion, cerrarVenta } from './actions'
import { CheckCircle2, FileText, Loader2, AlertCircle, X } from 'lucide-react'

interface Props {
  cotizacionId: string
  estado: string
  numero: string
}

export default function AccionesCotizacion({ cotizacionId, estado, numero }: Props) {
  const [pendiente, startTransition] = useTransition()
  const [modalCerrar, setModalCerrar] = useState(false)
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  function handleAprobar() {
    const fd = new FormData()
    fd.set('id', cotizacionId)
    setResultado(null)
    startTransition(async () => {
      const res = await aprobarCotizacion(fd)
      setResultado(res)
      if (res.ok) setTimeout(() => setResultado(null), 2000)
    })
  }

  function handleCerrarVenta(formData: FormData) {
    formData.set('cotizacion_id', cotizacionId)
    setResultado(null)
    startTransition(async () => {
      const res = await cerrarVenta(formData)
      setResultado(res)
      if (res.ok) { setModalCerrar(false); setTimeout(() => setResultado(null), 3000) }
    })
  }

  return (
    <div className="flex items-center gap-2">
      {estado === 'PENDIENTE' && (
        <button
          onClick={handleAprobar}
          disabled={pendiente}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition disabled:opacity-50"
        >
          {pendiente ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Aprobar
        </button>
      )}

      {estado === 'APROBADA' && (
        <button
          onClick={() => setModalCerrar(true)}
          disabled={pendiente}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition disabled:opacity-50"
        >
          <FileText className="w-3 h-3" />
          Cerrar venta
        </button>
      )}

      {resultado && (
        <span className={`text-xs ${resultado.ok ? 'text-green-600' : 'text-red-600'}`}>
          {resultado.ok ? '✓' : '✗'} {resultado.mensaje.slice(0, 40)}
        </span>
      )}

      {/* Modal cerrar venta */}
      {modalCerrar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Cerrar venta</h3>
                <p className="text-xs text-gray-500 mt-0.5">Cotizacion {numero}</p>
              </div>
              <button onClick={() => setModalCerrar(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form action={handleCerrarVenta} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero de factura DIAN *</label>
                <input name="numero_factura_dian" required placeholder="Ej: SETP-1" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                <p className="text-xs text-gray-400 mt-1">Este es el numero que te da el sistema de la DIAN al facturar</p>
              </div>

              {resultado && !resultado.ok && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-sm bg-red-50 text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <span>{resultado.mensaje}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalCerrar(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={pendiente} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {pendiente && <Loader2 className="w-4 h-4 animate-spin" />} Cerrar venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
