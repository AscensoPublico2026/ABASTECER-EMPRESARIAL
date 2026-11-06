'use client'

import { useState, useTransition } from 'react'
import { editarCotizacion } from '../../actions'
import { Loader2, CheckCircle2, AlertCircle, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  EditorItemsCotizacion, ResumenCotizacion, BarraTotalCotizacion,
  ITEM_COTIZACION_VACIO, itemsParaGuardar, type ItemCotizacionLocal,
} from '@/components/ventas/EditorItemsCotizacion'

interface CotizacionData {
  id: string
  numero: string
  cliente_id: string
  fecha: string
  fecha_validez: string
  forma_pago: string
  observaciones: string
  estado: string
  items: ItemCotizacionLocal[]
}

interface Props {
  cotizacion: CotizacionData
  clientes: { id: string; razon_social: string }[]
  productos: { id: string; codigo: string; nombre: string; costo_promedio: number; iva_porcentaje: number; stock_actual: number }[]
}

export default function FormEditarCotizacion({ cotizacion, clientes, productos }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<ItemCotizacionLocal[]>(cotizacion.items.length > 0 ? cotizacion.items : [{ ...ITEM_COTIZACION_VACIO }])
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  function handleSubmit(formData: FormData) {
    const itemsParseados = itemsParaGuardar(items)

    formData.set('cotizacion_id', cotizacion.id)
    formData.set('items', JSON.stringify(itemsParseados))
    setResultado(null)
    startTransition(async () => {
      const res = await editarCotizacion(formData)
      setResultado(res)
      if (res.ok) {
        setTimeout(() => { router.push(`/ventas/${cotizacion.id}`) }, 1200)
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-6xl">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Editando: {cotizacion.numero}</h3>
        <p className="text-xs text-gray-500 mt-0.5">Estado actual: {cotizacion.estado} · Los cambios se guardan al presionar &quot;Guardar&quot;</p>
      </div>

      <form action={handleSubmit} className="p-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5 min-w-0">
        {/* Cliente y fechas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select name="cliente_id" defaultValue={cotizacion.cliente_id} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
              <option value="">Sin cliente registrado</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
            <select name="forma_pago" defaultValue={cotizacion.forma_pago} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
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
            <input name="fecha" type="date" defaultValue={cotizacion.fecha} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha validez</label>
            <input name="fecha_validez" type="date" defaultValue={cotizacion.fecha_validez} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        {/* Items */}
        <EditorItemsCotizacion items={items} onChange={setItems} productos={productos} />

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
          <textarea name="observaciones" rows={2} defaultValue={cotizacion.observaciones} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" placeholder="Observaciones..." />
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
          <button type="button" onClick={() => router.push(`/ventas/${cotizacion.id}`)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={pendiente} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {pendiente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
        </div>
        </aside>
      </form>
    </div>
  )
}
