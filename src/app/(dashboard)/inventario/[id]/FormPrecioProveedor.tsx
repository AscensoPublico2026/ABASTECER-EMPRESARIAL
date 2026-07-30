'use client'

import { useState, useTransition } from 'react'
import { agregarPrecioProveedor } from './actions'
import { PlusCircle, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  productoId: string
  proveedores: { id: string; razon_social: string }[]
}

export default function FormPrecioProveedor({ productoId, proveedores }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  function handleSubmit(formData: FormData) {
    formData.set('producto_id', productoId)
    setResultado(null)
    startTransition(async () => {
      const res = await agregarPrecioProveedor(formData)
      setResultado(res)
      if (res.ok) setTimeout(() => { setAbierto(false); setResultado(null) }, 1200)
    })
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
        <PlusCircle className="w-4 h-4" /> Agregar precio
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Agregar precio de proveedor</h3>
          <button onClick={() => { setAbierto(false); setResultado(null) }} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form action={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
            <select name="proveedor_id" required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
              <option value="">Seleccionar proveedor</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
              <input name="precio" required inputMode="numeric" placeholder="627000" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IVA</label>
              <select name="iva_incluido" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                <option value="false">+ IVA (no incluido)</option>
                <option value="true">IVA incluido</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo de entrega</label>
              <input name="tiempo_entrega" placeholder="Ej: 2 dias, Inmediato" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha cotizacion</label>
              <input name="fecha_cotizacion" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia del proveedor</label>
            <input name="referencia_proveedor" placeholder="Ej: EXT-ABC-10LB (como lo llama el proveedor)" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="disponible" defaultChecked className="rounded border-gray-300 text-blue-600" />
              Disponible actualmente
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea name="notas" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" placeholder="Ej: Precio por unidad, minimo 5 unidades..." />
          </div>

          {resultado && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
              <span>{resultado.mensaje}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setAbierto(false); setResultado(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={pendiente} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {pendiente && <Loader2 className="w-4 h-4 animate-spin" />} Agregar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
