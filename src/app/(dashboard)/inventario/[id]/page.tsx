import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCOP, formatFecha } from '@/lib/format'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { ArrowLeft, Package, TrendingDown, Clock } from 'lucide-react'
import FormPrecioProveedor from './FormPrecioProveedor'
import { obtenerProveedoresParaSelect } from '@/lib/queries/compras'

export const dynamic = 'force-dynamic'

export default async function ProductoDetallePage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: producto } = await supabase
    .from('productos')
    .select('*, categorias_producto(nombre)')
    .eq('id', params.id)
    .single()

  if (!producto) notFound()

  // Obtener precios de proveedores
  const { data: preciosData } = await supabase
    .from('precios_proveedor')
    .select('*, proveedores(razon_social)')
    .eq('producto_id', params.id)
    .order('precio', { ascending: true })

  // Proveedores para el formulario de precios.
  //
  // BUG QUE ESTO ARREGLA: aqui habia una consulta propia que filtraba por
  // .eq('activo', true), pero la tabla proveedores NO tiene columna
  // 'activo': tiene 'estado' con valores ACTIVO / INACTIVO /
  // EN_EVALUACION. Al pedir una columna inexistente Supabase devolvia
  // error, data quedaba null y la lista salia VACIA. Y como el error no se
  // revisaba, fallaba en silencio: el usuario veia el desplegable sin
  // ningun proveedor aunque los tuviera creados.
  //
  // Ahora se usa la funcion compartida, la misma que usa Compras y que si
  // filtra bien por estado.
  const proveedores = await obtenerProveedoresParaSelect()

  const precios = preciosData ?? []
  const categoria = producto.categorias_producto as { nombre?: string } | null
  const precioMenor = precios.length > 0 ? precios[0] : null

  return (
    <>
      <Header title={producto.nombre} subtitle={`${producto.codigo} · Detalle del producto`} />
      <div className="p-8 space-y-6">
        <Link href="/compras" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm w-fit">
          <ArrowLeft className="w-4 h-4" /> Volver a compras
        </Link>

        {/* Info del producto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{producto.nombre}</h3>
                <p className="text-xs text-gray-500">{producto.codigo}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {producto.descripcion && <div><span className="text-gray-500">Descripcion:</span> <span className="text-gray-800">{producto.descripcion}</span></div>}
              <div><span className="text-gray-500">Categoria:</span> <span className="text-gray-800">{categoria?.nombre ?? 'Sin categoria'}</span></div>
              <div><span className="text-gray-500">Unidad:</span> <span className="text-gray-800">{producto.unidad_medida}</span></div>
              <div><span className="text-gray-500">IVA:</span> <span className="text-gray-800">{producto.iva_porcentaje}%</span></div>
              <div><span className="text-gray-500">Margen minimo:</span> <span className="text-gray-800">{producto.margen_minimo_pct}%</span></div>
              <div><span className="text-gray-500">Stock actual:</span> <span className="text-gray-800 font-medium">{producto.stock_actual}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Precios y costos</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Costo promedio (compras)</span>
                <span className="font-bold text-gray-800 tabular-nums">{Number(producto.costo_promedio) > 0 ? formatCOP(Number(producto.costo_promedio)) : 'Sin compras'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Precio sugerido (con margen)</span>
                <span className="font-bold text-gray-800 tabular-nums">{Number(producto.precio_sugerido) > 0 ? formatCOP(Number(producto.precio_sugerido)) : '—'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Precio de lista</span>
                <span className="font-bold text-gray-800 tabular-nums">{Number(producto.precio_lista) > 0 ? formatCOP(Number(producto.precio_lista)) : '—'}</span>
              </div>
              {precioMenor && (
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl border border-green-200">
                  <span className="text-sm text-green-700 font-medium">Mejor precio proveedor</span>
                  <div className="text-right">
                    <span className="font-bold text-green-700 tabular-nums">{formatCOP(Number(precioMenor.precio))}</span>
                    <p className="text-xs text-green-600">{(precioMenor.proveedores as { razon_social?: string })?.razon_social}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comparador de precios de proveedores */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-800">Precios de proveedores</h3>
                <p className="text-xs text-gray-500">Compara precios y elige la mejor opcion</p>
              </div>
            </div>
            <FormPrecioProveedor productoId={params.id} proveedores={proveedores} />
          </div>

          {precios.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Sin precios registrados</p>
              <p className="text-sm mt-1">Agrega los precios que te dan los proveedores para comparar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left bg-gray-50/50">
                    <th className="px-6 py-3 font-medium text-gray-500">#</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Proveedor</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Precio</th>
                    <th className="px-6 py-3 font-medium text-gray-500">IVA</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Entrega</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Referencia</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Fecha cotiz.</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Notas</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {precios.map((p, idx) => {
                    const prov = p.proveedores as { razon_social?: string } | null
                    const esMejor = idx === 0
                    return (
                      <tr key={p.id} className={`border-b border-gray-50 last:border-0 ${esMejor ? 'bg-green-50/50' : 'hover:bg-gray-50/50'}`}>
                        <td className="px-6 py-4">
                          {esMejor && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">1°</span>}
                          {!esMejor && <span className="text-gray-400 text-xs">{idx + 1}</span>}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-800">{prov?.razon_social ?? '—'}</td>
                        <td className={`px-6 py-4 text-right tabular-nums font-bold ${esMejor ? 'text-green-700' : 'text-gray-700'}`}>
                          {formatCOP(Number(p.precio))}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">{p.iva_incluido ? 'Incluido' : '+ IVA'}</td>
                        <td className="px-6 py-4">
                          {p.tiempo_entrega ? (
                            <span className="flex items-center gap-1 text-xs text-gray-600"><Clock className="w-3 h-3" />{p.tiempo_entrega}</span>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">{p.referencia_proveedor ?? '—'}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">{p.fecha_cotizacion ? formatFecha(p.fecha_cotizacion) : '—'}</td>
                        <td className="px-6 py-4 text-xs text-gray-500 max-w-[150px] truncate">{p.notas ?? ''}</td>
                        <td className="px-6 py-4">
                          <a href={`/inventario/${params.id}/editar-precio/${p.id}`} className="text-xs text-blue-600 hover:underline">Editar</a>
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
