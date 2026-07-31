import Header from '@/components/layout/Header'
import { obtenerCotizaciones } from '@/lib/queries/cotizaciones'
import { formatCOP } from '@/lib/format'
import { Receipt, Package, ArrowRight } from 'lucide-react'
import FormCotizacion from './FormCotizacion'
import FormVentaDirecta from './FormVentaDirecta'
import TablaCotizaciones from './TablaCotizaciones'
import { obtenerClientesParaSelect } from '@/lib/queries/clientes'
import { obtenerProductoParaSelect } from '@/lib/queries/productos'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function VentasPage() {
  const { data: cotizaciones, error } = await obtenerCotizaciones()
  const clientes = await obtenerClientesParaSelect()
  const productos = await obtenerProductoParaSelect()

  // NIVEL 1: Cotizaciones (PENDIENTE, APROBADA)
  const nivel1 = cotizaciones.filter((c) => c.estado === 'PENDIENTE' || c.estado === 'APROBADA')

  // NIVEL 2: En proceso (PAGADA, EN_ALISTAMIENTO)
  const nivel2 = cotizaciones.filter((c) => c.estado === 'PAGADA' || c.estado === 'EN_ALISTAMIENTO')

  // KPIs Nivel 1
  const totalCotizado = nivel1.reduce((sum, c) => sum + c.total, 0)
  const utilidadEstimada = nivel1.reduce((sum, c) => sum + c.utilidad_estimada, 0)
  const pendientes = nivel1.filter((c) => c.estado === 'PENDIENTE').length
  const aprobadas = nivel1.filter((c) => c.estado === 'APROBADA').length

  // KPIs Nivel 2
  const totalEnProceso = nivel2.reduce((sum, c) => sum + c.total, 0)
  const enAlistamiento = nivel2.filter((c) => c.estado === 'EN_ALISTAMIENTO').length
  const pagadas = nivel2.filter((c) => c.estado === 'PAGADA').length

  // Nombres clientes para filtros
  const nombresClientesN1 = Array.from(new Set(nivel1.map((c) => c.cliente_nombre).filter(Boolean))) as string[]
  const nombresClientesN2 = Array.from(new Set(nivel2.map((c) => c.cliente_nombre).filter(Boolean))) as string[]

  return (
    <>
      <Header title="Ventas" subtitle="Cotizaciones, alistamiento y proceso de venta" />
      <div className="p-8 space-y-8">

        {error && <div className="px-6 py-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">Error: {error}</div>}

        {/* ============================================================ */}
        {/* NIVEL 1: COTIZACIONES (PENDIENTE, APROBADA) */}
        {/* ============================================================ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Cotizaciones</h2>
                <p className="text-sm text-gray-500">Negociando con el cliente — pendientes o aprobadas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FormCotizacion clientes={clientes} productos={productos} />
              <FormVentaDirecta clientes={clientes} productos={productos} />
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total cotizado</p>
              <p className="text-xl font-bold text-gray-800 mt-1 tabular-nums">{formatCOP(totalCotizado)}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Utilidad estimada</p>
              <p className="text-xl font-bold text-green-600 mt-1 tabular-nums">{formatCOP(utilidadEstimada)}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Pendientes</p>
              <p className="text-xl font-bold text-blue-600 mt-1 tabular-nums">{pendientes}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Aprobadas</p>
              <p className="text-xl font-bold text-green-600 mt-1 tabular-nums">{aprobadas}</p>
            </div>
          </div>

          <TablaCotizaciones cotizaciones={nivel1} clientes={nombresClientesN1} />
        </section>

        {/* ============================================================ */}
        {/* SEPARADOR */}
        {/* ============================================================ */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gray-50 px-4 py-1 flex items-center gap-2 text-sm font-medium text-orange-600 rounded-full border border-orange-200">
              <Package className="w-4 h-4" />
              En proceso
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* NIVEL 2: EN PROCESO (PAGADA, EN_ALISTAMIENTO) */}
        {/* ============================================================ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">En proceso</h2>
              <p className="text-sm text-gray-500">Pagadas o en alistamiento — comprando/preparando productos</p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-100">
              <p className="text-xs text-orange-600 uppercase tracking-wide">Total en proceso</p>
              <p className="text-xl font-bold text-gray-800 mt-1 tabular-nums">{formatCOP(totalEnProceso)}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">En alistamiento</p>
              <p className="text-xl font-bold text-orange-600 mt-1 tabular-nums">{enAlistamiento}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Pagadas (por alistar)</p>
              <p className="text-xl font-bold text-emerald-600 mt-1 tabular-nums">{pagadas}</p>
            </div>
          </div>

          {nivel2.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Sin ventas en proceso</p>
              <p className="text-sm mt-1">Cuando un cliente pague o apruebes una venta a credito, aparecera aqui.</p>
            </div>
          ) : (
            <TablaCotizaciones cotizaciones={nivel2} clientes={nombresClientesN2} />
          )}
        </section>

        {/* ============================================================ */}
        {/* LINK A FACTURACIÓN */}
        {/* ============================================================ */}
        <Link href="/facturacion" className="flex items-center justify-between p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition group">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Facturacion</h3>
              <p className="text-sm text-gray-500">Ver facturas emitidas, cobros, mora y retenciones</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition" />
        </Link>

      </div>
    </>
  )
}
