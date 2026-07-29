import Header from '@/components/layout/Header'
import { obtenerCotizaciones } from '@/lib/queries/cotizaciones'
import { obtenerFacturasVenta } from '@/lib/queries/facturasVenta'
import { formatCOP } from '@/lib/format'
import { Receipt, FileCheck2, TrendingUp } from 'lucide-react'
import FormCotizacion from './FormCotizacion'
import FormVentaDirecta from './FormVentaDirecta'
import TablaCotizaciones from './TablaCotizaciones'
import TablaVentas from './TablaVentas'
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

  // Separar cotizaciones: solo las que NO están facturadas
  const cotizacionesActivas = cotizaciones.filter((c) => c.estado !== 'FACTURADA')
  const cotizacionesPendientes = cotizacionesActivas.filter((c) => c.estado === 'PENDIENTE' || c.estado === 'APROBADA')

  // KPIs Cotizaciones
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

  // Extraer lista de clientes unicos para filtros
  const nombresClientesCot = Array.from(new Set(cotizacionesActivas.map((c) => c.cliente_nombre).filter(Boolean))) as string[]
  const nombresClientesFv = Array.from(new Set(facturas.map((fv) => fv.cliente_nombre).filter(Boolean))) as string[]

  return (
    <>
      <Header title="Ventas" subtitle="Cotizaciones en proceso y ventas cerradas" />
      <div className="p-8 space-y-8">

        {error && <div className="px-6 py-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">Error: {error}</div>}

        {/* ============================================================ */}
        {/* SECCION 1: COTIZACIONES (en proceso) */}
        {/* ============================================================ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Cotizaciones</h2>
                <p className="text-sm text-gray-500">En proceso — pendientes de aprobacion o por facturar</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FormCotizacion clientes={clientes} productos={productos} />
              <FormVentaDirecta clientes={clientes} productos={productos} />
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

          {/* Tabla Cotizaciones con filtros */}
          <TablaCotizaciones cotizaciones={cotizacionesActivas} clientes={nombresClientesCot} />
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

          {/* Tabla Ventas con filtros */}
          <TablaVentas facturas={facturas} clientes={nombresClientesFv} />
        </section>

      </div>
    </>
  )
}
