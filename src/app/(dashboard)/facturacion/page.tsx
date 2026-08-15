import Header from '@/components/layout/Header'
import { obtenerFacturasVenta } from '@/lib/queries/facturasVenta'
import { formatCOP } from '@/lib/format'
import TablaFacturacion from './TablaFacturacion'
import AvisoSincronizarPagos from './AvisoSincronizarPagos'
import { facturasDesfasadas } from '../ventas/actions'

export const dynamic = 'force-dynamic'

export default async function FacturacionPage() {
  const { data: facturas, error } = await obtenerFacturasVenta()

  // KPIs
  const totalFacturado = facturas.reduce((s, fv) => s + fv.total, 0)
  const porCobrar = facturas.filter((fv) => fv.estado === 'EMITIDA').reduce((s, fv) => s + fv.total, 0)
  const cobradas = facturas.filter((fv) => fv.estado === 'COBRADA').reduce((s, fv) => s + fv.total, 0)

  // Mora: facturas con fecha_vencimiento pasada y estado EMITIDA
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const enMora = facturas.filter((fv) => {
    if (fv.estado !== 'EMITIDA' || !fv.fecha_vencimiento) return false
    const [y, m, d] = fv.fecha_vencimiento.split('-').map(Number)
    return new Date(y, m - 1, d) < hoy
  })
  const totalMora = enMora.reduce((s, fv) => s + fv.total, 0)

  const nombresClientes = Array.from(new Set(facturas.map((fv) => fv.cliente_nombre).filter(Boolean))) as string[]

  // Facturas que dicen Pendiente aunque su venta ya esta pagada
  const desfasadas = await facturasDesfasadas()

  return (
    <>
      <Header title="Facturacion" subtitle="Todas las facturas emitidas — control de cobros y mora" />
      <div className="p-8 space-y-6">
        {error && <div className="px-6 py-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">Error: {error}</div>}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total facturado</p>
            <p className="text-xl font-bold text-gray-800 mt-1 tabular-nums">{formatCOP(totalFacturado)}</p>
            <p className="text-xs text-gray-400">{facturas.length} facturas</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Cobradas</p>
            <p className="text-xl font-bold text-green-600 mt-1 tabular-nums">{formatCOP(cobradas)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Por cobrar</p>
            <p className="text-xl font-bold text-amber-600 mt-1 tabular-nums">{formatCOP(porCobrar)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-200 bg-red-50/30">
            <p className="text-xs text-red-600 uppercase tracking-wide font-semibold">En mora</p>
            <p className="text-xl font-bold text-red-600 mt-1 tabular-nums">{formatCOP(totalMora)}</p>
            <p className="text-xs text-red-500">{enMora.length} factura{enMora.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Tabla completa */}
        <AvisoSincronizarPagos desfasadas={desfasadas} />

        <TablaFacturacion facturas={facturas} clientes={nombresClientes} />
      </div>
    </>
  )
}
