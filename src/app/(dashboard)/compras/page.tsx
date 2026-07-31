import Header from '@/components/layout/Header'
import { obtenerFacturasCompra, obtenerProveedoresParaSelect } from '@/lib/queries/compras'
import { obtenerProductoParaSelect } from '@/lib/queries/productos'
import { formatCOP, formatFecha } from '@/lib/format'
import { ShoppingCart } from 'lucide-react'
import FormFacturaCompra from './FormFacturaCompra'
import SolicitudesCompra from './SolicitudesCompra'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ComprasPage() {
  const { data: facturas, error, totales } = await obtenerFacturasCompra()
  const proveedores = await obtenerProveedoresParaSelect()
  const productos = await obtenerProductoParaSelect()

  // Obtener solicitudes de compra pendientes
  const supabase = createServerSupabaseClient()
  const { data: solicitudesRaw } = await supabase
    .from('solicitudes_compra')
    .select('*, productos(nombre, codigo, margen_minimo_pct), cotizaciones(numero, cliente_id, clientes(razon_social))')
    .eq('estado', 'PENDIENTE')
    .order('created_at', { ascending: false })

  const solicitudes = (solicitudesRaw ?? []).map((s) => {
    const prod = s.productos as { nombre?: string; codigo?: string; margen_minimo_pct?: number } | null
    const cot = s.cotizaciones as { numero?: string; cliente_id?: string; clientes?: { razon_social?: string } } | null
    return {
      id: s.id,
      producto_id: s.producto_id,
      producto_nombre: prod?.nombre ?? '',
      producto_codigo: prod?.codigo ?? '',
      cotizacion_id: s.cotizacion_id,
      cotizacion_numero: cot?.numero ?? '',
      cliente_nombre: cot?.clientes?.razon_social ?? 'Sin cliente',
      cantidad_requerida: s.cantidad_requerida,
      cantidad_en_stock: s.cantidad_en_stock,
      cantidad_a_comprar: s.cantidad_a_comprar,
      fecha_necesidad: s.fecha_necesidad,
      prioridad: s.prioridad ?? 'MEDIA',
      precio_venta_unitario: 0, // Se llena abajo
      margen_minimo_pct: Number(prod?.margen_minimo_pct ?? 30),
    }
  })

  // Obtener precios de venta de cada item en su cotizacion
  for (const sol of solicitudes) {
    const { data: item } = await supabase
      .from('cotizacion_items')
      .select('precio_unitario')
      .eq('cotizacion_id', sol.cotizacion_id)
      .eq('producto_id', sol.producto_id)
      .single()
    if (item) sol.precio_venta_unitario = Number(item.precio_unitario)
  }

  // Obtener precios de proveedores para los productos solicitados
  const productoIds = Array.from(new Set(solicitudes.map((s) => s.producto_id)))
  const preciosPorProducto: Record<string, { proveedor: string; precio: number; tiempo_entrega: string | null }[]> = {}

  if (productoIds.length > 0) {
    const { data: preciosRaw } = await supabase
      .from('precios_proveedor')
      .select('producto_id, precio, tiempo_entrega, proveedores(razon_social)')
      .in('producto_id', productoIds)
      .eq('disponible', true)
      .order('precio', { ascending: true })

    for (const p of preciosRaw ?? []) {
      const prov = p.proveedores as { razon_social?: string } | null
      if (!preciosPorProducto[p.producto_id]) preciosPorProducto[p.producto_id] = []
      preciosPorProducto[p.producto_id].push({
        proveedor: prov?.razon_social ?? '',
        precio: Number(p.precio),
        tiempo_entrega: p.tiempo_entrega,
      })
    }
  }

  return (
    <>
      <Header title="Compras" subtitle="Solicitudes de compra y facturas de proveedores" />
      <div className="p-8 space-y-8">

        {/* Solicitudes de compra (alertas) */}
        <SolicitudesCompra solicitudes={solicitudes} preciosPorProducto={preciosPorProducto} />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Compras totales</p>
            <p className="text-2xl font-bold text-gray-800 mt-1 tabular-nums">{formatCOP(totales.total)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Subtotal (base)</p>
            <p className="text-2xl font-bold text-gray-800 mt-1 tabular-nums">{formatCOP(totales.subtotal)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">IVA pagado</p>
            <p className="text-2xl font-bold text-blue-600 mt-1 tabular-nums">{formatCOP(totales.iva)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Descontable en declaracion</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Por pagar a proveedores</p>
            <p className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">{formatCOP(totales.porPagar)}</p>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-800">Facturas de compra</h3>
              <p className="text-sm text-gray-500 mt-0.5">Registro de compras a proveedores</p>
            </div>
            <FormFacturaCompra proveedores={proveedores} productos={productos} />
          </div>

          {error && <div className="px-6 py-4 bg-red-50 text-red-700 text-sm border-b border-red-100">Error: {error}</div>}

          {facturas.length === 0 && !error ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Sin facturas de compra</p>
              <p className="text-sm mt-1">Registra tu primera factura de compra. El costo promedio y stock se actualizan automaticamente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 font-medium text-gray-500">Fecha</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Proveedor</th>
                    <th className="px-6 py-3 font-medium text-gray-500">No. Factura</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Subtotal</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">IVA</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Total</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((f) => {
                    let badgeColor = 'bg-amber-50 text-amber-700 border-amber-200'
                    let badgeLabel = 'Por pagar'
                    if (f.estado === 'PAGADA') {
                      badgeColor = 'bg-green-50 text-green-700 border-green-200'
                      badgeLabel = 'Pagada'
                    } else if (f.estado === 'ANULADA') {
                      badgeColor = 'bg-gray-50 text-gray-500 border-gray-200'
                      badgeLabel = 'Anulada'
                    }
                    return (
                      <tr key={f.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatFecha(f.fecha_factura)}</td>
                        <td className="px-6 py-4 font-medium text-gray-800">{f.proveedor_nombre ?? 'Sin proveedor'}</td>
                        <td className="px-6 py-4 font-mono text-gray-700 whitespace-nowrap">{f.numero_factura ?? '-'}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-gray-700">{formatCOP(f.subtotal)}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-gray-700">{formatCOP(f.iva_total)}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-gray-700 font-medium">{formatCOP(f.total)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${badgeColor}`}>{badgeLabel}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
