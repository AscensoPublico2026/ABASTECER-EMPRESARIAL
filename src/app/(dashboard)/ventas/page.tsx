import Header from '@/components/layout/Header'
import { obtenerCotizaciones } from '@/lib/queries/cotizaciones'
import { obtenerFacturasVenta } from '@/lib/queries/facturasVenta'
import { ESTADOS_COTIZACION, type EstadoCotizacion } from '@/types/cotizaciones'
import { ESTADOS_FACTURA_VENTA, type EstadoFacturaVenta } from '@/types/facturasVenta'
import { formatCOP, formatFecha } from '@/lib/format'
import { Receipt, FileCheck2, TrendingUp } from 'lucide-react'
import FormCotizacion from './FormCotizacion'
import FormVentaDirecta from './FormVentaDirecta'
import AccionesCotizacion from './AccionesCotizacion'
import { obtenerClientesParaSelect } from '@/lib/queries/clientes'
import { obtenerProductoParaSelect } from '@/lib/queries/productos'

export const dynamic = 'force-dynamic'

export default async function VentasPage() {
  const [{ data: cotizaciones, error: errorCot }, { data: facturas, error: errorFv }] = await Promise.all([
    obtenerCotizaciones(),
    obtenerFacturasVenta(),
  ])
  const clientes = await obtenerClientesParaSelect()
  const productos = await obtenerProductoParaSelect()

  // Separar cotizaciones: solo las que NO están facturadas (pendientes/aprobadas/rechazadas/vencidas)
  const cotizacionesActivas = cotizaciones.filter((c) => c.estado !== 'FACTURADA')
  const cotizacionesPendientes = cotizacionesActivas.filter((c) => c.estado === 'PENDIENTE' || c.estado === 'APROBADA')

  // KPIs
  const totalCotizado = cotizacionesPendientes.reduce((sum, c) => sum + c.total, 0)
  const utilidadEstimadaCot = cotizacionesPendientes.reduce((sum, c) => sum + c.utilidad_estimada, 0)
  const pendientes = cotizacionesActivas.filter((c) => c.estado === 'PENDIENTE').length
  const aprobadas = cotizacionesActivas.filter((c) => c.estado === 'APROBADA').length

  // KPIs ventas cerradas
  const totalVendido = facturas.reduce((sum, fv) => sum + fv.total, 0)
  const utilidadReal = facturas.reduce((sum, fv) => sum + fv.utilidad, 0)
  const porCobrar = facturas.filter((fv) => fv.estado === 'EMITIDA').reduce((sum, fv) => sum + fv.total, 0)
  const cobradas = facturas.filter((fv) => fv.estado === 'COBRADA').length

  const error = errorCot || errorFv

  return (
    <>
      <Header title="Ventas" subtitle="Cotizaciones en proceso y ventas cerradas" />
      <div className="p-8 space-y-8">

        {error && <div className="px-6 py-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">Error: {error}</div>}

        {/* ============================================================ */}
        {/* SECCION 1: COTIZACIONES (en proceso) */}
        {/* ============================================================ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Cotizaciones</h2>
              <p className="text-sm text-gray-500">En proceso — pendientes de aprobacion o por facturar</p>
            </div>
          </div>

          {/* KPI Cards Cotizaciones */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total cotizado</p>
              <p className="text-xl font-bold text-gray-800 mt-1 tabular-nums">{formatCOP(totalCotizado)}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Utilidad estimada</p>
              <p className="text-xl font-bold text-green-600 mt-1 tabular-nums">{formatCOP(utilidadEstimadaCot)}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Pendientes</p>
              <p className="text-xl font-bold text-blue-600 mt-1 tabular-nums">{pendientes}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Aprobadas (por facturar)</p>
              <p className="text-xl font-bold text-green-600 mt-1 tabular-nums">{aprobadas}</p>
            </div>
          </div>

          {/* Tabla Cotizaciones */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
              <p className="text-sm text-gray-500">El costo se calcula automaticamente del catalogo</p>
              <div className="flex items-center gap-2">
                <FormCotizacion clientes={clientes} productos={productos} />
                <FormVentaDirecta clientes={clientes} productos={productos} />
              </div>
            </div>

            {cotizacionesActivas.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Sin cotizaciones en proceso</p>
                <p className="text-sm mt-1">Crea tu primera cotizacion arriba.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left bg-gray-50/50">
                      <th className="px-6 py-3 font-medium text-gray-500">Numero</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Cliente</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Fecha</th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-right">Total</th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-right">Utilidad</th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-right">Margen %</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Estado</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cotizacionesActivas.map((c) => {
                      const estado = ESTADOS_COTIZACION[c.estado as EstadoCotizacion] ?? ESTADOS_COTIZACION.PENDIENTE
                      const utilidadPositiva = c.utilidad_estimada >= 0
                      return (
                        <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <td className="px-6 py-4 font-mono text-gray-700 whitespace-nowrap">
                            <a href={`/ventas/${c.id}`} className="hover:text-blue-600 hover:underline">{c.numero}</a>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-800">{c.cliente_nombre ?? 'Sin cliente'}</td>
                          <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatFecha(c.fecha)}</td>
                          <td className="px-6 py-4 text-right tabular-nums text-gray-700">{formatCOP(c.total)}</td>
                          <td className={`px-6 py-4 text-right tabular-nums font-medium ${utilidadPositiva ? 'text-green-600' : 'text-red-600'}`}>{formatCOP(c.utilidad_estimada)}</td>
                          <td className={`px-6 py-4 text-right tabular-nums ${utilidadPositiva ? 'text-green-600' : 'text-red-600'}`}>{c.margen_pct.toFixed(1)}%</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${estado.color}`}>{estado.etiqueta}</span>
                          </td>
                          <td className="px-6 py-4">
                            <AccionesCotizacion cotizacionId={c.id} estado={c.estado} numero={c.numero} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ============================================================ */}
        {/* SEPARADOR VISUAL */}
        {/* ============================================================ */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gray-50 px-4 py-1 flex items-center gap-2 text-sm font-medium text-gray-500 rounded-full border border-gray-200">
              <TrendingUp className="w-4 h-4" />
              Ventas cerradas
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECCION 2: VENTAS CERRADAS (facturadas) */}
        {/* ============================================================ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Ventas</h2>
              <p className="text-sm text-gray-500">Facturadas con la DIAN — la venta ya se cerro</p>
            </div>
          </div>

          {/* KPI Cards Ventas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total vendido</p>
              <p className="text-xl font-bold text-gray-800 mt-1 tabular-nums">{formatCOP(totalVendido)}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Utilidad real</p>
              <p className="text-xl font-bold text-green-600 mt-1 tabular-nums">{formatCOP(utilidadReal)}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Por cobrar</p>
              <p className="text-xl font-bold text-amber-600 mt-1 tabular-nums">{formatCOP(porCobrar)}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Cobradas</p>
              <p className="text-xl font-bold text-green-600 mt-1 tabular-nums">{cobradas}</p>
            </div>
          </div>

          {/* Tabla Ventas Cerradas */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {facturas.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <FileCheck2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Sin ventas cerradas</p>
                <p className="text-sm mt-1">Cuando cierres una cotizacion (factura DIAN), aparecera aqui.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left bg-gray-50/50">
                      <th className="px-6 py-3 font-medium text-gray-500">Factura DIAN</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Cotizacion</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Cliente</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Fecha</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Pago</th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-right">Total</th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-right">Utilidad</th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-right">Margen %</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturas.map((fv) => {
                      const estado = ESTADOS_FACTURA_VENTA[fv.estado as EstadoFacturaVenta] ?? ESTADOS_FACTURA_VENTA.EMITIDA
                      const utilidadPositiva = fv.utilidad >= 0
                      return (
                        <tr key={fv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <td className="px-6 py-4 font-mono font-medium text-gray-800 whitespace-nowrap">
                            {fv.numero_factura_dian ?? '—'}
                          </td>
                          <td className="px-6 py-4 font-mono text-gray-500 whitespace-nowrap text-xs">
                            {fv.numero_cotizacion ?? '—'}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-800">{fv.cliente_nombre ?? 'Sin cliente'}</td>
                          <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatFecha(fv.fecha)}</td>
                          <td className="px-6 py-4 text-gray-600 whitespace-nowrap text-xs">
                            {fv.dias_credito > 0 ? `Credito ${fv.dias_credito}d` : 'Contado'}
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums text-gray-700">{formatCOP(fv.total)}</td>
                          <td className={`px-6 py-4 text-right tabular-nums font-medium ${utilidadPositiva ? 'text-green-600' : 'text-red-600'}`}>{formatCOP(fv.utilidad)}</td>
                          <td className={`px-6 py-4 text-right tabular-nums ${utilidadPositiva ? 'text-green-600' : 'text-red-600'}`}>{fv.margen_pct.toFixed(1)}%</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${estado.color}`}>{estado.etiqueta}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

      </div>
    </>
  )
}
