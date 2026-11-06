'use client'

import { useState, useTransition } from 'react'
import { crearCotizacion } from './actions'
import { PlusCircle, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import MiniFormCliente from '@/components/inline/MiniFormCliente'
import MiniFormProducto from '@/components/inline/MiniFormProducto'
import {
  EditorItemsCotizacion, ResumenCotizacion, BarraTotalCotizacion,
  ITEM_COTIZACION_VACIO, itemsParaGuardar, type ItemCotizacionLocal,
} from '@/components/ventas/EditorItemsCotizacion'

interface Props {
  clientes: { id: string; razon_social: string }[]
  productos: { id: string; codigo: string; nombre: string; costo_promedio: number; iva_porcentaje: number; stock_actual: number }[]
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function hoyMas15() {
  const d = new Date()
  d.setDate(d.getDate() + 15)
  return d.toISOString().slice(0, 10)
}

export default function FormCotizacion({ clientes: clientesIniciales, productos: productosIniciales }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [listaClientes, setListaClientes] = useState(clientesIniciales)
  const [listaProductos, setListaProductos] = useState(productosIniciales)
  const [items, setItems] = useState<ItemCotizacionLocal[]>([{ ...ITEM_COTIZACION_VACIO }])
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  function handleSubmit(formData: FormData) {
    const itemsParseados = itemsParaGuardar(items)
    formData.set('items', JSON.stringify(itemsParseados))
    setResultado(null)
    startTransition(async () => {
      const res = await crearCotizacion(formData)
      setResultado(res)
      if (res.ok) {
        setTimeout(() => { setAbierto(false); setResultado(null); setItems([{ ...ITEM_COTIZACION_VACIO }]) }, 1500)
      }
    })
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
        <PlusCircle className="w-4 h-4" /> Nueva Cotizacion
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl my-8 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">Crear cotizacion</h3>
            <p className="text-xs text-gray-500 mt-0.5">Numeracion automatica COT-2026-XXX</p>
          </div>
          <button onClick={() => { setAbierto(false); setResultado(null) }} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <form action={handleSubmit} className="p-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5 min-w-0">
          {/* Cliente y fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select name="cliente_id" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                <option value="">Sin cliente registrado</option>
                {listaClientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
              <MiniFormCliente onCreado={(c) => setListaClientes((prev) => [...prev, c])} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
              <select name="forma_pago" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                <option value="Contado">Contado</option>
                <option value="Credito 15 dias">Credito 15 dias</option>
                <option value="Credito 30 dias">Credito 30 dias</option>
                <option value="Credito 45 dias">Credito 45 dias</option>
                <option value="Credito 60 dias">Credito 60 dias</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input name="fecha" type="date" defaultValue={hoy()} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha validez</label>
              <input name="fecha_validez" type="date" defaultValue={hoyMas15()} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>

          {/* Items */}
          <EditorItemsCotizacion
            items={items}
            onChange={setItems}
            productos={listaProductos}
            accionesExtra={<MiniFormProducto onCreado={(p) => setListaProductos((prev) => [...prev, p])} />}
          />

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea name="observaciones" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" placeholder="Observaciones..." />
          </div>

          <BarraTotalCotizacion items={items} />
          </div>

          {/* Resumen fijo a la derecha */}
          <aside className="space-y-4 lg:sticky lg:top-4 self-start">
            <ResumenCotizacion items={items} />
          {resultado && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
              <span>{resultado.mensaje}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => { setAbierto(false); setResultado(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={pendiente} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {pendiente && <Loader2 className="w-4 h-4 animate-spin" />} Crear cotizacion
            </button>
          </div>
          </aside>
        </form>
      </div>
    </div>
  )
}
