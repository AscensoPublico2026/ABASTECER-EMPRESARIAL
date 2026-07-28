'use client'

import { useState, useTransition } from 'react'
import { crearProducto } from './actions'
import { IVA_OPCIONES, UNIDADES_MEDIDA } from '@/types/productos'
import type { Categoria } from '@/types/productos'
import { PlusCircle, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  categorias: Categoria[]
}

export default function FormProducto({ categorias }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  function handleSubmit(formData: FormData) {
    setResultado(null)
    startTransition(async () => {
      const res = await crearProducto(formData)
      setResultado(res)
      if (res.ok) {
        setTimeout(() => { setAbierto(false); setResultado(null) }, 1200)
      }
    })
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
        <PlusCircle className="w-4 h-4" /> Nuevo Producto
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg my-8 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">Crear producto</h3>
            <p className="text-xs text-gray-500 mt-0.5">Se genera codigo automatico (PRD-0001)</p>
          </div>
          <button onClick={() => { setAbierto(false); setResultado(null) }} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <form action={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del producto *</label>
            <input name="nombre" required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="Ej: Gafa de seguridad transparente" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
            <textarea name="descripcion" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" placeholder="Detalles del producto..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select name="categoria_id" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                <option value="">Sin categoria</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de medida</label>
              <select name="unidad_medida" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                {UNIDADES_MEDIDA.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IVA del producto</label>
              <select name="iva_porcentaje" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                {IVA_OPCIONES.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Margen minimo %</label>
              <input name="margen_minimo_pct" type="number" defaultValue={20} min={0} max={100} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio de lista (opcional)</label>
              <input name="precio_lista" inputMode="numeric" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock minimo (alerta)</label>
              <input name="stock_minimo" type="number" defaultValue={0} min={0} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea name="notas" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" placeholder="Observaciones..." />
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
              {pendiente && <Loader2 className="w-4 h-4 animate-spin" />} Crear producto
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
