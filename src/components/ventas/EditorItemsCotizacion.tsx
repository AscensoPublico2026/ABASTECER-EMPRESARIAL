'use client'

import { Trash2, Plus, Package, AlertTriangle } from 'lucide-react'
import { ivaPorcentaje, montoDesdeTexto, cantidadValida } from '@/lib/numeros'

// ============================================================
// Editor de items y resumen de totales de una cotizacion.
// Lo usan "Crear cotizacion" y "Editar cotizacion" para que las dos
// pantallas calculen y se vean igual: cada item muestra su subtotal,
// su IVA y su total, y el resumen desglosa el IVA por tarifa.
// ============================================================

export interface ItemCotizacionLocal {
  id?: string
  producto_id: string
  descripcion: string
  cantidad: string
  precio_unitario: string
  costo_unitario: string
  iva_porcentaje: string
  _busqueda?: string
}

export interface ProductoSelect {
  id: string
  codigo: string
  nombre: string
  costo_promedio: number
  iva_porcentaje: number
  stock_actual: number
}

export const ITEM_COTIZACION_VACIO: ItemCotizacionLocal = {
  producto_id: '', descripcion: '', cantidad: '1', precio_unitario: '', costo_unitario: '', iva_porcentaje: '19', _busqueda: '',
}

/**
 * Numero de la base de datos -> texto para un input, con maximo 2 decimales.
 * Evita que un costo como 1234.5678 se lea como "miles" (12.345.678) al volver
 * a convertirlo con montoDesdeTexto.
 */
export function numeroAInput(valor: number | string | null | undefined): string {
  const n = Number(valor)
  if (valor === null || valor === undefined || valor === '' || !Number.isFinite(n)) return ''
  return String(Math.round(n * 100) / 100)
}

/** Pesos sin decimales para mostrar (los totales se guardan redondeados al peso). */
export function pesos(valor: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(valor || 0))
}

/** Calculo de una linea, igual al que hace el servidor al guardar. */
export function calcularLinea(item: ItemCotizacionLocal) {
  const cantidad = cantidadValida(item.cantidad)
  const precio = montoDesdeTexto(item.precio_unitario)
  const costo = montoDesdeTexto(item.costo_unitario)
  const ivaPct = ivaPorcentaje(item.iva_porcentaje)
  const subtotal = cantidad * precio
  const iva = subtotal * (ivaPct / 100)
  const costoTotal = cantidad * costo
  const utilidad = subtotal - costoTotal
  const margen = subtotal > 0 ? (utilidad / subtotal) * 100 : 0
  return { cantidad, precio, costo, ivaPct, subtotal, iva, total: subtotal + iva, costoTotal, utilidad, margen }
}

/** Totales de la cotizacion con el IVA desglosado por tarifa. */
export function calcularTotalesCotizacion(items: ItemCotizacionLocal[]) {
  let subtotal = 0, iva = 0, costoTotal = 0, sinCosto = 0
  const porTarifa = new Map<number, { base: number; iva: number }>()
  for (const item of items) {
    const l = calcularLinea(item)
    if (l.subtotal <= 0) continue
    subtotal += l.subtotal
    iva += l.iva
    costoTotal += l.costoTotal
    if (l.costo <= 0) sinCosto++
    const t = porTarifa.get(l.ivaPct) ?? { base: 0, iva: 0 }
    t.base += l.subtotal
    t.iva += l.iva
    porTarifa.set(l.ivaPct, t)
  }
  const utilidad = subtotal - costoTotal
  const margen = subtotal > 0 ? (utilidad / subtotal) * 100 : 0
  const tarifas = Array.from(porTarifa.entries()).sort((a, b) => b[0] - a[0]).map(([pct, v]) => ({ pct, ...v }))
  return { subtotal, iva, total: subtotal + iva, costoTotal, utilidad, margen, tarifas, sinCosto }
}

/** Items listos para enviar al servidor (descarta los vacios). */
export function itemsParaGuardar(items: ItemCotizacionLocal[]) {
  return items.map((item) => ({
    producto_id: item.producto_id || null,
    descripcion: item.descripcion,
    cantidad: cantidadValida(item.cantidad),
    precio_unitario: montoDesdeTexto(item.precio_unitario),
    costo_unitario: montoDesdeTexto(item.costo_unitario),
    iva_porcentaje: ivaPorcentaje(item.iva_porcentaje),
  })).filter((i) => i.descripcion.trim() !== '' && i.cantidad > 0)
}

// ------------------------------------------------------------
// Editor de items
// ------------------------------------------------------------

interface EditorProps {
  items: ItemCotizacionLocal[]
  onChange: (items: ItemCotizacionLocal[]) => void
  productos: ProductoSelect[]
  /** Botones extra junto a "Agregar item" (p. ej. crear producto). */
  accionesExtra?: React.ReactNode
}

export function EditorItemsCotizacion({ items, onChange, productos, accionesExtra }: EditorProps) {
  function actualizar(idx: number, cambios: Partial<ItemCotizacionLocal>) {
    onChange(items.map((item, i) => (i === idx ? { ...item, ...cambios } : item)))
  }

  function seleccionarProducto(idx: number, productoId: string) {
    const p = productos.find((x) => x.id === productoId)
    if (!p) return
    actualizar(idx, {
      producto_id: p.id,
      descripcion: `${p.codigo} - ${p.nombre}`,
      costo_unitario: numeroAInput(p.costo_promedio),
      iva_porcentaje: String(p.iva_porcentaje ?? 19),
      _busqueda: '',
    })
  }

  function coincidencias(busqueda: string) {
    const q = busqueda.toLowerCase().trim()
    if (!q) return []
    return productos.filter((p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)).slice(0, 15)
  }

  const inputBase = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none tabular-nums'

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Items de la cotizacion</p>
          <p className="text-xs text-gray-500">{items.length} {items.length === 1 ? 'item' : 'items'} · precios unitarios antes de IVA</p>
        </div>
        <div className="flex items-center gap-3">
          {accionesExtra}
          <button type="button" onClick={() => onChange([...items, { ...ITEM_COTIZACION_VACIO }])} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold">
            <Plus className="w-3.5 h-3.5" /> Agregar item
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const l = calcularLinea(item)
          const producto = item.producto_id ? productos.find((p) => p.id === item.producto_id) : undefined
          const textoBusqueda = item.producto_id && producto ? `${producto.codigo} - ${producto.nombre}` : (item._busqueda ?? '')
          const lista = !item.producto_id ? coincidencias(item._busqueda ?? '') : []
          const sinCosto = l.subtotal > 0 && l.costo <= 0
          const margenColor = sinCosto
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : l.utilidad < 0
              ? 'bg-red-50 text-red-700 border-red-200'
              : l.margen < 10
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'

          return (
            <div key={idx} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="p-3 space-y-2.5">
                {/* Producto */}
                <div className="flex gap-2 items-start">
                  <span className="mt-1.5 w-6 h-6 shrink-0 rounded-md bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={textoBusqueda}
                      onChange={(e) => actualizar(idx, { _busqueda: e.target.value, producto_id: '' })}
                      onFocus={() => { if (item.producto_id) actualizar(idx, { _busqueda: '', producto_id: '' }) }}
                      placeholder="Buscar producto por codigo o nombre..."
                      className={inputBase}
                      autoComplete="off"
                    />
                    {lista.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {lista.map((p) => (
                          <button key={p.id} type="button" onClick={() => seleccionarProducto(idx, p.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0">
                            <span className="font-mono text-xs text-blue-600">{p.codigo}</span> <span className="text-gray-800">{p.nombre}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {!item.producto_id && (item._busqueda ?? '').trim().length > 0 && lista.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1 px-1">Sin coincidencias en el catalogo. Puedes escribir la descripcion abajo.</p>
                    )}
                  </div>
                  <button type="button" onClick={() => items.length > 1 && onChange(items.filter((_, i) => i !== idx))} disabled={items.length === 1} title="Quitar item" className="mt-1 p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-2 items-center">
                  <span className="w-6 shrink-0" aria-hidden="true" />
                  <input
                    value={item.descripcion}
                    onChange={(e) => actualizar(idx, { descripcion: e.target.value })}
                    placeholder="Descripcion que vera el cliente"
                    title="Descripcion que vera el cliente en la cotizacion"
                    className={`${inputBase} flex-1 min-w-0 text-gray-600 bg-gray-50`}
                  />
                  <span className="w-7 shrink-0" aria-hidden="true" />
                </div>

                {/* Valores */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-8">
                  <label className="block">
                    <span className="block text-[11px] font-medium text-gray-500 mb-0.5">Cantidad</span>
                    <input value={item.cantidad} onChange={(e) => actualizar(idx, { cantidad: e.target.value })} type="number" min="0" className={`${inputBase} text-center`} />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-medium text-gray-500 mb-0.5">Precio unit. (sin IVA)</span>
                    <input value={item.precio_unitario} onChange={(e) => actualizar(idx, { precio_unitario: e.target.value })} inputMode="decimal" placeholder="0" className={`${inputBase} text-right`} />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-medium text-gray-500 mb-0.5">Costo unit.</span>
                    <input value={item.costo_unitario} onChange={(e) => actualizar(idx, { costo_unitario: e.target.value })} inputMode="decimal" placeholder="0" className={`${inputBase} text-right ${sinCosto ? 'border-amber-300 bg-amber-50/40' : ''}`} />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-medium text-gray-500 mb-0.5">IVA</span>
                    <select value={item.iva_porcentaje} onChange={(e) => actualizar(idx, { iva_porcentaje: e.target.value })} className={inputBase}>
                      <option value="19">19%</option>
                      <option value="5">5%</option>
                      <option value="0">0% (exento/excluido)</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Resultado de la linea */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 border-t border-gray-100 text-xs">
                <div className="bg-gray-50 px-3 py-2">
                  <span className="block text-gray-500">Subtotal</span>
                  <span className="font-semibold text-gray-800 tabular-nums">{pesos(l.subtotal)}</span>
                </div>
                <div className="bg-gray-50 px-3 py-2">
                  <span className="block text-gray-500">IVA {l.ivaPct}%</span>
                  <span className="font-semibold text-gray-800 tabular-nums">{pesos(l.iva)}</span>
                </div>
                <div className="bg-blue-50 px-3 py-2">
                  <span className="block text-blue-700">Total item</span>
                  <span className="font-bold text-blue-900 tabular-nums">{pesos(l.total)}</span>
                </div>
                <div className="bg-gray-50 px-3 py-2 flex items-center">
                  {l.subtotal > 0 ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-semibold ${margenColor}`}>
                      {sinCosto ? <><AlertTriangle className="w-3 h-3" /> Sin costo</> : <>Margen {l.margen.toFixed(1)}%</>}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button type="button" onClick={() => onChange([...items, { ...ITEM_COTIZACION_VACIO }])} className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600">
        <Package className="w-4 h-4" /> Agregar otro item
      </button>
    </div>
  )
}

// ------------------------------------------------------------
// Resumen de totales
// ------------------------------------------------------------

export function ResumenCotizacion({ items }: { items: ItemCotizacionLocal[] }) {
  const t = calcularTotalesCotizacion(items)
  const positiva = t.utilidad >= 0

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-blue-100 bg-white overflow-hidden">
        <div className="px-4 py-3 bg-blue-600 text-white">
          <p className="text-[11px] uppercase tracking-wide text-blue-100">Total a cobrar</p>
          <p className="text-2xl font-bold tabular-nums">{pesos(t.total)}</p>
        </div>
        <div className="p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="tabular-nums">{pesos(t.subtotal)}</span></div>
          {t.tarifas.length === 0 && (
            <div className="flex justify-between text-gray-600"><span>IVA</span><span className="tabular-nums">{pesos(0)}</span></div>
          )}
          {t.tarifas.map((tf) => (
            <div key={tf.pct} className="flex justify-between text-gray-600">
              <span>
                IVA {tf.pct}%
                <span className="block text-[11px] text-gray-400">sobre {pesos(tf.base)}</span>
              </span>
              <span className="tabular-nums">{tf.pct === 0 ? 'Exento' : pesos(tf.iva)}</span>
            </div>
          ))}
          {t.tarifas.length > 1 && (
            <div className="flex justify-between text-gray-700 font-medium pt-1 border-t border-dashed border-gray-200"><span>IVA total</span><span className="tabular-nums">{pesos(t.iva)}</span></div>
          )}
          <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200"><span>Total</span><span className="tabular-nums">{pesos(t.total)}</span></div>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 space-y-2 text-sm ${positiva ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex justify-between text-gray-600"><span>Costo total</span><span className="tabular-nums">{pesos(t.costoTotal)}</span></div>
        <div className={`flex justify-between font-bold pt-2 border-t ${positiva ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700'}`}>
          <span>Utilidad estimada</span><span className="tabular-nums">{pesos(t.utilidad)}</span>
        </div>
        <div className={`flex justify-between text-xs ${positiva ? 'text-emerald-700' : 'text-red-700'}`}><span>Margen</span><span className="tabular-nums">{t.margen.toFixed(2)}%</span></div>
        {t.sinCosto > 0 && (
          <p className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {t.sinCosto === 1 ? '1 item no tiene costo' : `${t.sinCosto} items no tienen costo`}: la utilidad y el margen salen inflados.
          </p>
        )}
      </div>
    </div>
  )
}

/** Barra fija con el total, visible mientras se editan los items (pantallas pequenas). */
export function BarraTotalCotizacion({ items }: { items: ItemCotizacionLocal[] }) {
  const t = calcularTotalesCotizacion(items)
  return (
    <div className="lg:hidden sticky bottom-0 -mx-6 px-6 py-3 bg-white/95 backdrop-blur border-t border-gray-200 flex items-center justify-between text-sm z-10">
      <div className="text-gray-500 text-xs leading-tight">
        Subtotal {pesos(t.subtotal)}<br />IVA {pesos(t.iva)}
      </div>
      <div className="text-right">
        <span className="block text-[11px] text-gray-500">Total</span>
        <span className="font-bold text-blue-700 text-base tabular-nums">{pesos(t.total)}</span>
      </div>
    </div>
  )
}
