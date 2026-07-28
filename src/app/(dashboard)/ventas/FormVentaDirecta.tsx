'use client'

import { useState, useTransition } from 'react'
import { ventaDirecta } from './actions'
import { formatCOP } from '@/lib/format'
import { ShoppingBag, X, Loader2, CheckCircle2, AlertCircle, Trash2, Plus, AlertTriangle } from 'lucide-react'

interface Props {
  clientes: { id: string; razon_social: string }[]
  productos: { id: string; codigo: string; nombre: string; costo_promedio: number; iva_porcentaje: number; stock_actual: number; precio_sugerido: number; margen_minimo_pct: number }[]
}

interface ItemLocal {
  producto_id: string
  descripcion: string
  cantidad: string
  precio_unitario: string
  costo_unitario: string
  iva_porcentaje: string
  margen_minimo: number
}

const ITEM_VACIO: ItemLocal = { producto_id: '', descripcion: '', cantidad: '1', precio_unitario: '', costo_unitario: '', iva_porcentaje: '19', margen_minimo: 20 }

export default function FormVentaDirecta({ clientes, productos }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [items, setItems] = useState<ItemLocal[]>([{ ...ITEM_VACIO }])
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  function agregarItem() { setItems([...items, { ...ITEM_VACIO }]) }
  function eliminarItem(idx: number) { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)) }
  function actualizarItem(idx: number, campo: keyof ItemLocal, valor: string | number) {
    setItems(items.map((item, i) => i === idx ? { ...item, [campo]: valor } : item))
  }

  function seleccionarProducto(idx: number, productoId: string) {
    const p = productos.find((x) => x.id === productoId)
    setItems(items.map((item, i) => {
      if (i !== idx) return item
      if (!p) return { ...ITEM_VACIO }
      return {
        ...item,
        producto_id: p.id,
        descripcion: `${p.codigo} - ${p.nombre}`,
        costo_unitario: String(p.costo_promedio),
        precio_unitario: String(p.precio_sugerido > 0 ? p.precio_sugerido : ''),
        iva_porcentaje: String(p.iva_porcentaje),
        margen_minimo: p.margen_minimo_pct,
      }
    }))
  }

  function calcularTotales() {
    let subtotal = 0, iva = 0, costoTotal = 0
    const alertas: string[] = []
    items.forEach((item, idx) => {
      const cant = Number(item.cantidad) || 0
      const precio = Number(item.precio_unitario.toString().replace(/\./g, '').replace(',', '.')) || 0
      const costo = Number(item.costo_unitario.toString().replace(/\./g, '').replace(',', '.')) || 0
      const ivaPct = Number(item.iva_porcentaje) || 0
      const sub = cant * precio
      subtotal += sub
      iva += sub * (ivaPct / 100)
      costoTotal += cant * costo
      // Check margin
      if (precio > 0 && costo > 0) {
        const margenReal = ((precio - costo) / precio) * 100
        if (margenReal < item.margen_minimo) {
          alertas.push(`Item ${idx + 1}: margen ${margenReal.toFixed(1)}% < minimo ${item.margen_minimo}%`)
        }
      }
    })
    const utilidad = subtotal - costoTotal
    const margen = subtotal > 0 ? (utilidad / subtotal) * 100 : 0
    return { subtotal, iva, total: subtotal + iva, costoTotal, utilidad, margen, alertas }
  }

  function handleSubmit(formData: FormData) {
    const itemsParseados = items.map((item) => ({
      producto_id: item.producto_id || null,
      descripcion: item.descripcion,
      cantidad: Number(item.cantidad) || 1,
      precio_unitario: Number(item.precio_unitario.toString().replace(/\./g, '').replace(',', '.')) || 0,
      costo_unitario: Number(item.costo_unitario.toString().replace(/\./g, '').replace(',', '.')) || 0,
      iva_porcentaje: Number(item.iva_porcentaje) || 19,
    })).filter((i) => i.descripcion && i.precio_unitario > 0)
    formData.set('items', JSON.stringify(itemsParseados))
    setResultado(null)
    startTransition(async () => {
      const res = await ventaDirecta(formData)
      setResultado(res)
      if (res.ok) setTimeout(() => { setAbierto(false); setResultado(null); setItems([{ ...ITEM_VACIO }]) }, 1500)
    })
  }

  const totales = calcularTotales()

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition">
        <ShoppingBag className="w-4 h-4" /> Venta directa
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">Venta directa (sin cotizacion)</h3>
            <p className="text-xs text-gray-500 mt-0.5">Para clientes que ya conocen los precios</p>
          </div>
          <button onClick={() => { setAbierto(false); setResultado(null) }} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <form action={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select name="cliente_id" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                <option value="">Sin cliente</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. Factura DIAN *</label>
              <input name="numero_factura_dian" required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="SETP-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
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

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Items</label>
              <button type="button" onClick={agregarItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"><Plus className="w-3.5 h-3.5" /> Agregar</button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-xl space-y-2">
                  <div className="flex gap-2">
                    <select value={item.producto_id} onChange={(e) => seleccionarProducto(idx, e.target.value)} className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm">
                      <option value="">-- Producto del catalogo --</option>
                      {productos.map((p) => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre} ({formatCOP(p.precio_sugerido)})</option>)}
                    </select>
                    <button type="button" onClick={() => eliminarItem(idx)} disabled={items.length === 1} className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <input value={item.descripcion} onChange={(e) => actualizarItem(idx, 'descripcion', e.target.value)} placeholder="Descripcion" className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm" />
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Cant</label>
                      <input value={item.cantidad} onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)} type="number" min="1" className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-center" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">P. Venta</label>
                      <input value={item.precio_unitario} onChange={(e) => actualizarItem(idx, 'precio_unitario', e.target.value)} inputMode="numeric" className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-right" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Costo</label>
                      <input value={item.costo_unitario} onChange={(e) => actualizarItem(idx, 'costo_unitario', e.target.value)} inputMode="numeric" className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-right bg-gray-100" readOnly={!!item.producto_id} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">IVA</label>
                      <select value={item.iva_porcentaje} onChange={(e) => actualizarItem(idx, 'iva_porcentaje', e.target.value)} className="w-full px-1 py-2 border border-gray-200 rounded-lg text-sm">
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

          {/* Alertas de margen */}
          {totales.alertas.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
              {totales.alertas.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-red-700">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {a}
                </div>
              ))}
            </div>
          )}

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
                <span>UTILIDAD:</span><span className="tabular-nums">{formatCOP(totales.utilidad)}</span>
              </div>
              <div className={`flex justify-between text-xs ${totales.utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span>Margen:</span><span>{totales.margen.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {resultado && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
              <span>{resultado.mensaje}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setAbierto(false); setResultado(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={pendiente} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {pendiente && <Loader2 className="w-4 h-4 animate-spin" />} Registrar venta
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
