import Header from '@/components/layout/Header'
import { obtenerProductos, obtenerCategorias } from '@/lib/queries/productos'
import { formatCOP } from '@/lib/format'
import { Package, AlertTriangle } from 'lucide-react'
import FormProducto from './FormProducto'
import AccionesProducto from './AccionesProducto'

export const dynamic = 'force-dynamic'

export default async function InventarioPage() {
  const { data: productos, error } = await obtenerProductos()
  const categorias = await obtenerCategorias()

  const activos = productos.filter((p) => p.activo)
  const stockBajo = activos.filter((p) => p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo)
  const sinCosto = activos.filter((p) => p.costo_promedio === 0)

  return (
    <>
      <Header title="Catalogo de Productos" subtitle="Corazon del sistema: productos, costos y stock" />

      <div className="p-8 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Productos activos</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{activos.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Stock bajo (alerta)</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stockBajo.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Sin costo definido</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{sinCosto.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Se actualiza con la primera compra</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Categorias</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{categorias.length}</p>
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-800">Productos</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                El costo promedio se recalcula automaticamente con cada compra
              </p>
            </div>
            <FormProducto categorias={categorias} />
          </div>

          {error && (
            <div className="px-6 py-4 bg-red-50 text-red-700 text-sm border-b border-red-100">
              Error: {error}
            </div>
          )}

          {productos.length === 0 && !error ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Sin productos en el catalogo</p>
              <p className="text-sm mt-1">
                Crea tu primer producto. El costo se calculara automaticamente cuando registres una compra.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 font-medium text-gray-500">Codigo</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Producto</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Categoria</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Costo prom.</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">P. sugerido</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">P. lista</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-center">Stock</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-center">IVA</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p) => {
                    const stockCritico = p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo
                    return (
                      <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{p.codigo}</td>
                        <td className="px-6 py-4">
                          <a href={`/inventario/${p.id}`} className="hover:text-blue-600 hover:underline">
                            <p className="font-medium text-gray-800">{p.nombre}</p>
                            {p.descripcion && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{p.descripcion}</p>}
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          {p.categoria_nombre ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs">{p.categoria_nombre}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums">
                          {p.costo_promedio > 0 ? (
                            <span className="text-gray-700">{formatCOP(p.costo_promedio)}</span>
                          ) : (
                            <span className="text-gray-300 text-xs">Sin compras</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-gray-600">
                          {p.precio_sugerido > 0 ? formatCOP(p.precio_sugerido) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-gray-600">
                          {p.precio_lista > 0 ? formatCOP(p.precio_lista) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 ${stockCritico ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                            {stockCritico && <AlertTriangle className="w-3.5 h-3.5" />}
                            {p.stock_actual}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-xs text-gray-500">{p.iva_porcentaje}%</td>
                        <td className="px-6 py-4">
                          <AccionesProducto producto={{ id: p.id, codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion, categoria_id: p.categoria_id, unidad_medida: p.unidad_medida, iva_porcentaje: p.iva_porcentaje, margen_minimo_pct: p.margen_minimo_pct, precio_lista: p.precio_lista, stock_minimo: p.stock_minimo, notas: p.notas }} categorias={categorias} />
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
