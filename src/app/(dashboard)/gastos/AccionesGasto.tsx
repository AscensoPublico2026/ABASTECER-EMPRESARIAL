'use client'

import { useState, useTransition } from 'react'
import { eliminarGasto, completarDocumentoSoporte } from './actions'
import { formatCOP } from '@/lib/format'
import { Trash2, FilePlus2, Loader2, X, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Props {
  gasto: {
    id: string
    concepto: string
    monto: number
    deducible: boolean
    tieneDocumentoSoporte: boolean
  }
}

export default function AccionesGasto({ gasto }: Props) {
  const [pendiente, startTransition] = useTransition()
  const [modal, setModal] = useState<null | 'soporte' | 'eliminar'>(null)
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  function cerrar() {
    setModal(null)
    setResultado(null)
  }

  function handleSoporte(formData: FormData) {
    formData.set('gasto_id', gasto.id)
    setResultado(null)
    startTransition(async () => {
      const res = await completarDocumentoSoporte(formData)
      setResultado(res)
      if (res.ok) setTimeout(cerrar, 2000)
    })
  }

  function handleEliminar(formData: FormData) {
    formData.set('gasto_id', gasto.id)
    setResultado(null)
    startTransition(async () => {
      const res = await eliminarGasto(formData)
      setResultado(res)
      if (res.ok) setTimeout(cerrar, 1500)
    })
  }

  return (
    <>
      {!gasto.tieneDocumentoSoporte && !gasto.deducible && (
        <button
          onClick={() => setModal('soporte')}
          title="Generar documento soporte"
          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
        </button>
      )}

      <button
        onClick={() => setModal('eliminar')}
        title="Eliminar gasto"
        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* ===== MODAL DOCUMENTO SOPORTE ===== */}
      {modal === 'soporte' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Generar documento soporte</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {gasto.concepto} · {formatCOP(gasto.monto)}
                </p>
              </div>
              <button onClick={cerrar} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form action={handleSoporte} className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-blue-800">
                  Con el nombre y la cedula de la persona a la que le pagaste, este gasto
                  pasa a ser <strong>deducible</strong> de impuestos.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input name="tercero_nombre" required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tipo doc</label>
                  <select name="tercero_tipo_documento" className="w-full px-2 py-2.5 border border-gray-200 rounded-xl text-sm">
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="NIT">NIT</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="PEP">PEP</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Numero *</label>
                  <input name="tercero_documento" required inputMode="numeric" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Telefono</label>
                  <input name="tercero_telefono" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Direccion</label>
                  <input name="tercero_direccion" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>

              {resultado && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                  <span>{resultado.mensaje}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrar} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={pendiente} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {pendiente && <Loader2 className="w-4 h-4 animate-spin" />} Generar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL ELIMINAR ===== */}
      {modal === 'eliminar' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Eliminar gasto</h3>
              <button onClick={cerrar} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form action={handleEliminar} className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800 font-medium">
                  Se eliminara &quot;{gasto.concepto}&quot; por {formatCOP(gasto.monto)}
                </p>
                <ul className="text-xs text-red-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Se borra el movimiento de caja asociado</li>
                  <li>Se borra el documento soporte si lo tiene</li>
                  <li>Si era costo de una venta, se recalcula su utilidad</li>
                </ul>
              </div>

              {resultado && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                  <span>{resultado.mensaje}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrar} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={pendiente} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {pendiente && <Loader2 className="w-4 h-4 animate-spin" />} Eliminar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
