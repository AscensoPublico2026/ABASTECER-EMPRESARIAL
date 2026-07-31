'use client'

import { useState } from 'react'
import { formatCOP } from '@/lib/format'
import { AlertTriangle, ChevronDown, ChevronUp, Clock, ExternalLink } from 'lucide-react'

interface Solicitud {
  id: string
  producto_id: string
  producto_nombre: string
  producto_codigo: string
  cotizacion_id: string
  cotizacion_numero: string
  cliente_nombre: string
  cantidad_requerida: number
  cantidad_en_stock: number
  cantidad_a_comprar: number
  fecha_necesidad: string | null
  prioridad: string
  precio_venta_unitario: number
  margen_minimo_pct: number
}

interface ProductoAgrupado {
  producto_id: string
  producto_nombre: string
  producto_codigo: string
  total_a_comprar: number
  num_pedidos: number
  prioridad_max: string
  precio_venta_promedio: number
  precio_maximo_compra: number
  solicitudes: Solicitud[]
  precios: { proveedor: string; precio: number; tiempo_entrega: string | null }[]
}

interface Props {
  solicitudes: Solicitud[]
  preciosPorProducto: Record<string, { proveedor: string; precio: number; tiempo_entrega: string | null }[]>
}

function prioridadColor(p: string) {
  if (p === 'ALTA') return 'text-red-600 bg-red-50 border-red-200'
  if (p === 'MEDIA') return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-green-600 bg-green-50 border-green-200'
}

function prioridadIcon(p: string) {
  if (p === 'ALTA') return '🔴'
  if (p === 'MEDIA') return '🟡'
  return '🟢'
}

export default function SolicitudesCompra({ solicitudes, preciosPorProducto }: Props) {
  const [expandido, setExpandido] = useState<string | null>(null)

  if (solicitudes.length === 0) return null

  // Agrupar por producto
  const agrupados: ProductoAgrupado[] = []
  const mapaProductos = new Map<string, ProductoAgrupado>()

  for (const s of solicitudes) {
    if (!mapaProductos.has(s.producto_id)) {
      mapaProductos.set(s.producto_id, {
        producto_id: s.producto_id,
        producto_nombre: s.producto_nombre,
        producto_codigo: s.producto_codigo,
        total_a_comprar: 0,
        num_pedidos: 0,
        prioridad_max: 'BAJA',
        precio_venta_promedio: 0,
        precio_maximo_compra: 0,
        solicitudes: [],
        precios: preciosPorProducto[s.producto_id] ?? [],
      })
    }
    const grupo = mapaProductos.get(s.producto_id)!
    grupo.total_a_comprar += s.cantidad_a_comprar
    grupo.num_pedidos += 1
    grupo.solicitudes.push(s)
    if (s.prioridad === 'ALTA' || (s.prioridad === 'MEDIA' && grupo.prioridad_max === 'BAJA')) {
      grupo.prioridad_max = s.prioridad
    }
  }

  // Calcular precios promedio y maximo de compra
  mapaProductos.forEach((grupo) => {
    const preciosVenta = grupo.solicitudes.filter((s) => s.precio_venta_unitario > 0).map((s) => s.precio_venta_unitario)
    grupo.precio_venta_promedio = preciosVenta.length > 0 ? preciosVenta.reduce((a, b) => a + b, 0) / preciosVenta.length : 0
    const margen = grupo.solicitudes[0]?.margen_minimo_pct || 30
    grupo.precio_maximo_compra = grupo.precio_venta_promedio > 0 ? Math.round(grupo.precio_venta_promedio * (1 - margen / 100)) : 0
    agrupados.push(grupo)
  })
  agrupados.sort((a, b) => {
    const p = { ALTA: 0, MEDIA: 1, BAJA: 2 }
    return (p[a.prioridad_max as keyof typeof p] ?? 2) - (p[b.prioridad_max as keyof typeof p] ?? 2)
  })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-red-100 bg-red-50/30 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <div>
          <h3 className="font-semibold text-gray-800">Solicitudes de compra</h3>
          <p className="text-xs text-gray-500">Items que necesitas comprar para cumplir pedidos</p>
        </div>
        <span className="ml-auto px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">{agrupados.length} producto{agrupados.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="divide-y divide-gray-100">
        {agrupados.map((grupo) => (
          <div key={grupo.producto_id}>
            {/* Fila principal */}
            <div
              className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 transition"
              onClick={() => setExpandido(expandido === grupo.producto_id ? null : grupo.producto_id)}
            >
              <span className="text-lg">{prioridadIcon(grupo.prioridad_max)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{grupo.producto_nombre}</p>
                <p className="text-xs text-gray-500">{grupo.producto_codigo}</p>
              </div>
              <div className="text-center px-3">
                <p className="text-lg font-bold text-gray-800">{grupo.total_a_comprar}</p>
                <p className="text-xs text-gray-500">uds</p>
              </div>
              <div className="text-center px-3">
                <p className="text-sm font-medium text-gray-600">{grupo.num_pedidos}</p>
                <p className="text-xs text-gray-500">pedido{grupo.num_pedidos !== 1 ? 's' : ''}</p>
              </div>
              {grupo.precio_venta_promedio > 0 && (
                <div className="text-center px-3">
                  <p className="text-xs text-gray-500">Vendido a</p>
                  <p className="text-sm font-medium text-blue-700">{formatCOP(grupo.precio_venta_promedio)}</p>
                </div>
              )}
              {grupo.precio_maximo_compra > 0 && (
                <div className="text-center px-3">
                  <p className="text-xs text-gray-500">Max compra</p>
                  <p className="text-sm font-bold text-red-600">{formatCOP(grupo.precio_maximo_compra)}</p>
                </div>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${prioridadColor(grupo.prioridad_max)}`}>
                {grupo.prioridad_max}
              </span>
              {expandido === grupo.producto_id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>

            {/* Detalle expandido */}
            {expandido === grupo.producto_id && (
              <div className="px-6 pb-4 space-y-4">
                {/* Detalle por cotizacion */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Pedidos que requieren este producto:</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500">
                        <th className="pb-2">Cotizacion</th>
                        <th className="pb-2">Cliente</th>
                        <th className="pb-2 text-center">Necesita</th>
                        <th className="pb-2 text-center">En stock</th>
                        <th className="pb-2 text-center">Comprar</th>
                        <th className="pb-2">Entrega</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.solicitudes.map((s) => (
                        <tr key={s.id} className="border-t border-gray-200">
                          <td className="py-2">
                            <a href={`/ventas/${s.cotizacion_id}`} className="text-blue-600 hover:underline font-mono text-xs">{s.cotizacion_numero}</a>
                          </td>
                          <td className="py-2 text-gray-700">{s.cliente_nombre}</td>
                          <td className="py-2 text-center font-medium">{s.cantidad_requerida}</td>
                          <td className="py-2 text-center text-gray-500">{s.cantidad_en_stock}</td>
                          <td className="py-2 text-center font-bold text-red-600">{s.cantidad_a_comprar}</td>
                          <td className="py-2 text-xs text-gray-500">{s.fecha_necesidad ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Precios de proveedores */}
                {grupo.precios.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Proveedores con precio registrado:</p>
                    <div className="space-y-2">
                      {grupo.precios.map((p, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${i === 0 ? 'text-green-700' : 'text-gray-500'}`}>{i + 1}°</span>
                            <span className="text-sm text-gray-800">{p.proveedor}</span>
                            {p.tiempo_entrega && (
                              <span className="flex items-center gap-1 text-xs text-gray-500"><Clock className="w-3 h-3" />{p.tiempo_entrega}</span>
                            )}
                          </div>
                          <span className={`font-bold tabular-nums ${i === 0 ? 'text-green-700' : 'text-gray-600'}`}>{formatCOP(p.precio)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {grupo.precios.length === 0 && (
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-xs text-amber-700">Sin precios de proveedores registrados. <a href={`/inventario/${grupo.producto_id}`} className="underline font-medium">Agregar precios</a></p>
                  </div>
                )}

                {/* Link al producto */}
                <div className="flex gap-2">
                  <a href={`/inventario/${grupo.producto_id}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition">
                    <ExternalLink className="w-3 h-3" /> Ver producto y precios
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
