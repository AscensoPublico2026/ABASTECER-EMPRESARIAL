'use client'

import { useState, useTransition } from 'react'
import { editarCotizacion } from '../../actions'
import { formatCOP } from '@/lib/format'
import { X, Loader2, CheckCircle2, AlertCircle, Trash2, Plus, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ItemLocal {
  id?: string
  producto_id: string
  descripcion: string
  cantidad: string
  precio_unitario: string
  costo_unitario: string
  iva_porcentaje: string
}

interface CotizacionData {
  id: string
  numero: string
  cliente_id: string
  fecha: string
  fecha_validez: string
  forma_pago: string
  observaciones: string
  estado: string
  items: ItemLocal[]
}

interface Props {
  cotizacion: CotizacionData
  clientes: { id: string; razon_social: string }[]
  productos: { id: string; codigo: string; nombre: string; costo_promedio: number; iva_porcentaje: number; stock_actual: number }[]
}

const ITEM_VACIO: ItemLocal = { producto_id: '', descripcion: '', cantidad: '1', precio_unitario: '', costo_unitario: '', iva_porcentaje: '19' }

export default function FormEditarCotizacion({ cotizacion, clientes, productos }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<ItemLocal[]>(cotizacion.items.length > 0 ? cotizacion.items : [{ ...ITEM_VACIO }])
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  function agregarItem() {
    setItems([...items, { ...ITEM_VACIO }])
  }

  function eliminarItem(idx: number) {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== idx))
  }

  function actualizarItem(idx: number, campo: keyof ItemLocal, valor: string) {
    setItems(items.map((item, i) => i === idx ? { ...item, [campo]: valor } : item))
  }

  function seleccionarProducto(idx: number, productoId: string) {
    const producto = productos.find((p) => p.id === productoId)
    setItems(items.map((item, i) => {
      if (i !== idx) return item
      if (!producto) return { ...item, producto_id: '', costo_unitario: '', iva_porcentaje: '19' }
      return {
        ...item,
        producto_id: producto.id,
        descripcion: `${producto.codigo} - ${producto.nombre}`,
        costo_unitario: String(producto.costo_promedio),
        iva_porcentaje: String(producto.iva_porcentaje),
      }
    }))
  }

  function calcularTotales() {
    let subtotal = 0
    let iva = 0
    let costoTotal = 0
    items.forEach((item) => {
      const cant = Number(item.cantidad) || 0
      const precio = Number(item.precio_unitario.replace(/\./g, '').replace(',', '.')) || 0
      const costo = Number(item.costo_unitario.replace(/\./g, '').replace(',', '.')) || 0
      const ivaPct = Number(item.iva_porcentaje) || 0
      const sub = cant * precio
      subtotal += sub
      iva += sub * (ivaPct / 100)
      costoTotal += cant * costo
    })
    const utilidad = subtotal - costoTotal
    const margen = subtotal > 0 ? (utilidad / subtotal) * 100 : 0
    return { subtotal, iva, total: subtotal + iva, costoTotal, utilidad, margen }
  }

  function handleSubmit(formData: FormData) {
    const itemsParseados = items.map((item) => ({
      producto_id: item.producto_id || null,
      descripcion: item.descripcion,
      cantidad: Number(item.cantidad) || 1,
      precio_unitario: Number(item.precio_unitario.replace(/\./g, '').replace(',', '.')) || 0,
      costo_unitario: Number(item.costo_unitario.replace(/\./g, '').replace(',', '.')) || 0,
      iva_porcentaje: Number(item.iva_porcentaje) || 19,
    })).filter((i) => i.descripcion && i.precio_unitario > 0)

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

  const totales = calcularTotales()

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Editando: {cotizacion.numero}</h3>
        <p className="text-xs text-gray-500 mt-0.5">Estado actual: {cotizacion.estado} · Los cambios se guardan al presionar &quot;Guardar&quot;</p>
      </div>

      <form action={handleSubmit} className="p-6 space-y-5">
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
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Items de la cotizacion</label>
            <button type="button" onClick={agregarItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              <Plus className="w-3.5 h-3.5" /> Agregar item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-xl space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <select
                      value={item.producto_id}
                      onChange={(e) => seleccionarProducto(idx, e.target.value)}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="">-- Seleccionar producto del catalogo --</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" onClick={() => eliminarItem(idx)} disabled={items.length === 1} className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 items-start">
                  <input
                    value={item.descripcion}
                    onChange={(e) => actualizarItem(idx, 'descripcion', e.target.value)}
                    placeholder="Descripcion"
                    className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Cantidad</label>
                    <input
                      value={item.cantidad}
                      onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)}
                      type="number"
                      min="1"
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">P. Venta</label>
                    <input
                      value={item.precio_unitario}
                      onChange={(e) => actualizarItem(idx, 'precio_unitario', e.target.value)}
                      placeholder="Precio"
                      inputMode="numeric"
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Costo</label>
                    <input
                      value={item.costo_unitario}
                      onChange={(e) => actualizarItem(idx, 'costo_unitario', e.target.value)}
                      placeholder="Costo"
                      inputMode="numeric"
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">IVA</label>
                    <select
                      value={item.iva_porcentaje}
                      onChange={(e) => actualizarItem(idx, 'iva_porcentaje', e.target.value)}
                      className="w-full px-1 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="19">19%</option>
                      <option value="5">5%</option>
                      <option value="0">0%</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totales */}
        <div className="space-y-3">
          <div className="bg-blue-50 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span className="tabular-nums">{formatCOP(totales.subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>IVA:</span><span className="tabular-nums">{formatCOP(totales.iva)}</span></div>
            <div className="flex justify-between font-bold text-gray-800 text-base pt-1.5 border-t border-blue-200"><span>Total:</span><span className="tabular-nums">{formatCOP(totales.total)}</span></div>
          </div>
          <div className={`rounded-xl p-4 space-y-1.5 text-sm ${totales.utilidad >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex justify-between text-gray-600"><span>Costo:</span><span className="tabular-nums">{formatCOP(totales.costoTotal)}</span></div>
            <div className={`flex justify-between font-bold text-base pt-1.5 border-t ${totales.utilidad >= 0 ? 'border-green-200 text-green-700' : 'border-red-200 text-red-700'}`}>
              <span>Utilidad:</span><span className="tabular-nums">{formatCOP(totales.utilidad)}</span>
            </div>
            <div className={`flex justify-between text-xs ${totales.utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <span>Margen:</span><span className="tabular-nums">{totales.margen.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
          <textarea name="observaciones" rows={2} defaultValue={cotizacion.observaciones} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" placeholder="Observaciones..." />
        </div>

        {resultado && (
          <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
            <span>{resultado.mensaje}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.push(`/ventas/${cotizacion.id}`)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={pendiente} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {pendiente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}
