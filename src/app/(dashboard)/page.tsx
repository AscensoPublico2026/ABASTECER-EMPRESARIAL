import { createServerSupabaseClient } from '@/lib/supabase/server'
import { obtenerPosicionFinanciera } from '@/lib/queries/tesoreria'
import { obtenerAnalisisVentas } from '@/lib/queries/analisisVenta'
import { formatCOP } from '@/lib/format'
import {
  DollarSign, TrendingUp, ShoppingCart, Users, Receipt, AlertTriangle,
  FileCheck2, Wallet, ArrowRight, Landmark, Target,
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()

  const [{ datos: p }, ventasAnalisis, ventasRes, comprasRes, clientesRes] = await Promise.all([
    obtenerPosicionFinanciera(),
    obtenerAnalisisVentas(),
    supabase.from('facturas_venta').select('total, estado, fecha_vencimiento'),
    supabase.from('facturas_compra').select('id, estado'),
    supabase.from('clientes').select('id'),
  ])

  const ventas = ventasRes.data ?? []
  const compras = (comprasRes.data ?? []).filter((c) => c.estado !== 'ANULADA')
  const clientesCount = clientesRes.data?.length ?? 0

  const ventasSinCosto = ventasAnalisis.filter(
    (v) =>
      !v.tiene_costo_asignado &&
      ['FACTURADA', 'DESPACHADA', 'ENTREGADO', 'POR_COBRAR', 'COBRADA', 'ENTREGA_PARCIAL'].includes(v.estado)
  )

  // ---- Alertas ----
  const alertas: { mensaje: string; color: string; bg: string; href?: string }[] = []

  const ventasVencidas = ventas.filter((v) => {
    if (v.estado !== 'EMITIDA' || !v.fecha_vencimiento) return false
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const [y, m, d] = String(v.fecha_vencimiento).split('-').map(Number)
    return new Date(y, m - 1, d) < hoy
  })

  if (p.en_riesgo) {
    alertas.push({
      mensaje: `Disponible real negativo: ${formatCOP(p.disponible_real)}. Las obligaciones superan la caja.`,
      color: 'text-red-700', bg: 'bg-red-50', href: '/financiero',
    })
  }
  if (p.reserva_insuficiente && p.impuestos_por_pagar > 0) {
    alertas.push({
      mensaje: `Falta ${formatCOP(p.impuestos_por_pagar - p.saldo_reservas)} en la cuenta de reserva de impuestos`,
      color: 'text-amber-700', bg: 'bg-amber-50', href: '/financiero',
    })
  }
  if (ventasSinCosto.length > 0) {
    alertas.push({
      mensaje: `${ventasSinCosto.length} venta(s) sin costo asignado: la utilidad esta inflada`,
      color: 'text-amber-700', bg: 'bg-amber-50', href: '/compras',
    })
  }
  if (ventasVencidas.length > 0) {
    alertas.push({
      mensaje: `${ventasVencidas.length} factura(s) vencida(s) por cobrar`,
      color: 'text-red-600', bg: 'bg-red-50', href: '/facturacion',
    })
  }
  if (p.cuentas_por_cobrar > 0) {
    alertas.push({
      mensaje: `Tienes ${formatCOP(p.cuentas_por_cobrar)} por cobrar de clientes`,
      color: 'text-amber-600', bg: 'bg-amber-50', href: '/facturacion',
    })
  }
  if (p.cuentas_por_pagar > 0) {
    alertas.push({
      mensaje: `Debes ${formatCOP(p.cuentas_por_pagar)} a proveedores`,
      color: 'text-red-600', bg: 'bg-red-50', href: '/compras',
    })
  }
  if (p.pipeline_num > 0) {
    alertas.push({
      mensaje: `${p.pipeline_num} cotizacion(es) por cerrar (${formatCOP(p.pipeline_total)})`,
      color: 'text-blue-600', bg: 'bg-blue-50', href: '/ventas',
    })
  }
  if (alertas.length === 0) {
    alertas.push({ mensaje: 'Todo al dia. Sin alertas pendientes.', color: 'text-green-600', bg: 'bg-green-50' })
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Resumen general de ABASTECER EMPRESARIAL S.A.S.</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/financiero" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-green-200 transition">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className={`text-2xl font-bold tabular-nums ${p.disponible_real >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCOP(p.disponible_real)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Disponible real</p>
          <p className="text-xs text-gray-400 mt-0.5">Ya descontados impuestos y deudas</p>
        </Link>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800 tabular-nums">{formatCOP(p.ventas_subtotal_acum)}</p>
          <p className="text-sm text-gray-500 mt-1">Vendido ({p.num_ventas} venta{p.num_ventas !== 1 ? 's' : ''})</p>
          <p className="text-xs text-gray-400 mt-0.5">Base sin IVA</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800 tabular-nums">{formatCOP(p.costo_real_acum)}</p>
          <p className="text-sm text-gray-500 mt-1">Costo real ({compras.length} factura{compras.length !== 1 ? 's' : ''})</p>
          <p className="text-xs text-gray-400 mt-0.5">Lo que costo lo vendido</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{clientesCount}</p>
          <p className="text-sm text-gray-500 mt-1">Clientes registrados</p>
        </div>
      </div>

      {/* Fila 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <FileCheck2 className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-500 uppercase">Utilidad neta</span>
          </div>
          <p className={`text-xl font-bold tabular-nums ${p.utilidad_neta_acum >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCOP(p.utilidad_neta_acum)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Margen {p.margen_bruto_pct.toFixed(1)}%</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="w-4 h-4 text-red-600" />
            <span className="text-xs text-gray-500 uppercase">Impuestos</span>
          </div>
          <p className="text-xl font-bold text-red-600 tabular-nums">{formatCOP(p.impuestos_por_pagar)}</p>
          <p className="text-xs text-gray-400 mt-0.5">IVA + Simple por pagar</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-gray-500 uppercase">Por cobrar</span>
          </div>
          <p className="text-xl font-bold text-amber-600 tabular-nums">{formatCOP(p.cuentas_por_cobrar)}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-4 h-4 text-red-600" />
            <span className="text-xs text-gray-500 uppercase">Por pagar</span>
          </div>
          <p className="text-xl font-bold text-red-600 tabular-nums">{formatCOP(p.cuentas_por_pagar)}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-500 uppercase">Gastos operativos</span>
          </div>
          <p className="text-xl font-bold text-purple-600 tabular-nums">{formatCOP(p.gastos_operativos)}</p>
        </div>
      </div>

      {/* Alertas + Accesos rapidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Alertas
          </h3>
          <div className="space-y-2">
            {alertas.map((a, i) =>
              a.href ? (
                <Link key={i} href={a.href} className={`flex items-center justify-between gap-3 p-3 rounded-xl transition hover:brightness-95 ${a.bg}`}>
                  <p className={`text-sm font-medium ${a.color}`}>{a.mensaje}</p>
                  <ArrowRight className={`w-4 h-4 flex-shrink-0 ${a.color}`} />
                </Link>
              ) : (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${a.bg}`}>
                  <p className={`text-sm font-medium ${a.color}`}>{a.mensaje}</p>
                </div>
              )
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Accesos rapidos</h3>
          <div className="space-y-2">
            {[
              { label: 'Nueva cotizacion', href: '/ventas', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
              { label: 'Registrar compra', href: '/compras', color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
              { label: 'Registrar gasto', href: '/gastos', color: 'text-red-600 bg-red-50 hover:bg-red-100' },
              { label: 'Centro Financiero', href: '/financiero', color: 'text-green-600 bg-green-50 hover:bg-green-100' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className={`flex items-center justify-between p-3 rounded-xl text-sm font-medium transition ${item.color}`}>
                {item.label}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Ultimas ventas con analisis */}
      {ventasAnalisis.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-800">Ultimas ventas</h3>
            </div>
            <Link href="/financiero" className="text-xs text-blue-600 hover:underline">Ver analisis completo</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {ventasAnalisis.slice(0, 5).map((v) => (
              <Link
                key={v.cotizacion_id}
                href={`/ventas/${v.cotizacion_id}`}
                className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50/50 transition"
              >
                <span className="font-mono text-xs text-blue-600 w-28">{v.numero}</span>
                <span className="text-sm text-gray-700 flex-1 truncate">{v.cliente_nombre ?? 'Sin cliente'}</span>
                <span className="text-xs text-gray-400 hidden sm:inline w-32 truncate">{v.estado}</span>
                <span className="tabular-nums text-sm text-gray-700 w-28 text-right">{formatCOP(v.venta_subtotal)}</span>
                <span className={`tabular-nums text-sm w-28 text-right font-medium ${
                  v.tiene_costo_asignado
                    ? v.utilidad_neta >= 0 ? 'text-green-600' : 'text-red-600'
                    : 'text-gray-300'
                }`}>
                  {v.tiene_costo_asignado ? formatCOP(v.utilidad_neta) : 'sin costo'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
