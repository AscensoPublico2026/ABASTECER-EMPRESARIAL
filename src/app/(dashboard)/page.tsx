import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCOP } from '@/lib/format'
import { DollarSign, TrendingUp, ShoppingCart, Users, Receipt, AlertTriangle, FileCheck2, Wallet, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()

  // Obtener datos reales en paralelo
  const [ventasRes, comprasRes, clientesRes, cotizacionesRes, gastosRes, sociosRes] = await Promise.all([
    supabase.from('facturas_venta').select('total, utilidad, estado, fecha_vencimiento, dias_credito'),
    supabase.from('facturas_compra').select('total, estado'),
    supabase.from('clientes').select('id'),
    supabase.from('cotizaciones').select('total, estado, utilidad_estimada'),
    supabase.from('gastos').select('monto'),
    supabase.from('resumen_socios').select('capital_aportado, dividendos_recibidos'),
  ])

  const ventas = ventasRes.data ?? []
  const compras = comprasRes.data ?? []
  const clientesCount = clientesRes.data?.length ?? 0
  const cotizaciones = cotizacionesRes.data ?? []
  const gastos = gastosRes.data ?? []
  const socios = sociosRes.data ?? []

  // KPIs
  const totalVendido = ventas.reduce((s, v) => s + Number(v.total ?? 0), 0)
  const utilidadReal = ventas.reduce((s, v) => s + Number(v.utilidad ?? 0), 0)
  const totalCompras = compras.filter((c) => c.estado !== 'ANULADA').reduce((s, c) => s + Number(c.total ?? 0), 0)
  const totalGastos = gastos.reduce((s, g) => s + Number(g.monto ?? 0), 0)
  const capitalSocial = socios.reduce((s, r) => s + Number(r.capital_aportado ?? 0), 0)
  const dividendos = socios.reduce((s, r) => s + Number(r.dividendos_recibidos ?? 0), 0)

  const porCobrar = ventas.filter((v) => v.estado === 'EMITIDA').reduce((s, v) => s + Number(v.total ?? 0), 0)
  const porPagar = compras.filter((c) => c.estado === 'REGISTRADA' || c.estado === 'POR_PAGAR' || c.estado === 'VENCIDA').reduce((s, c) => s + Number(c.total ?? 0), 0)

  // Caja libre estimada
  const cajaLibre = capitalSocial + utilidadReal - dividendos - porPagar - totalGastos

  // Cotizaciones pendientes
  const cotPendientes = cotizaciones.filter((c) => c.estado === 'PENDIENTE' || c.estado === 'APROBADA')
  const totalCotizado = cotPendientes.reduce((s, c) => s + Number(c.total ?? 0), 0)

  // Alertas inteligentes
  const alertas: { mensaje: string; color: string; bg: string }[] = []
  const ventasVencidas = ventas.filter((v) => {
    if (v.estado !== 'EMITIDA' || !v.fecha_vencimiento) return false
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const [y,m,d] = (v.fecha_vencimiento as string).split('-').map(Number)
    return new Date(y, m-1, d) < hoy
  })
  if (ventasVencidas.length > 0) alertas.push({ mensaje: `${ventasVencidas.length} factura(s) vencida(s) por cobrar`, color: 'text-red-600', bg: 'bg-red-50' })
  if (porCobrar > 0) alertas.push({ mensaje: `Tienes ${formatCOP(porCobrar)} por cobrar de clientes`, color: 'text-amber-600', bg: 'bg-amber-50' })
  if (porPagar > 0) alertas.push({ mensaje: `Debes ${formatCOP(porPagar)} a proveedores`, color: 'text-red-600', bg: 'bg-red-50' })
  if (cotPendientes.length > 0) alertas.push({ mensaje: `${cotPendientes.length} cotizacion(es) pendientes de cerrar (${formatCOP(totalCotizado)})`, color: 'text-blue-600', bg: 'bg-blue-50' })
  if (alertas.length === 0) alertas.push({ mensaje: 'Todo al dia. Sin alertas pendientes.', color: 'text-green-600', bg: 'bg-green-50' })

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Resumen general de ABASTECER EMPRESARIAL S.A.S.</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className={`text-2xl font-bold tabular-nums ${cajaLibre >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCOP(cajaLibre)}</p>
          <p className="text-sm text-gray-500 mt-1">Caja libre estimada</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800 tabular-nums">{formatCOP(totalVendido)}</p>
          <p className="text-sm text-gray-500 mt-1">Total vendido ({ventas.length} facturas)</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800 tabular-nums">{formatCOP(totalCompras)}</p>
          <p className="text-sm text-gray-500 mt-1">Compras ({compras.length} facturas)</p>
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

      {/* Fila 2: utilidad, por cobrar, por pagar, gastos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <FileCheck2 className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-500 uppercase">Utilidad real</span>
          </div>
          <p className={`text-xl font-bold tabular-nums ${utilidadReal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCOP(utilidadReal)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-gray-500 uppercase">Por cobrar</span>
          </div>
          <p className="text-xl font-bold text-amber-600 tabular-nums">{formatCOP(porCobrar)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-4 h-4 text-red-600" />
            <span className="text-xs text-gray-500 uppercase">Por pagar</span>
          </div>
          <p className="text-xl font-bold text-red-600 tabular-nums">{formatCOP(porPagar)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-500 uppercase">Gastos operativos</span>
          </div>
          <p className="text-xl font-bold text-purple-600 tabular-nums">{formatCOP(totalGastos)}</p>
        </div>
      </div>

      {/* Alertas + Accesos rapidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Alertas
          </h3>
          <div className="space-y-2">
            {alertas.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${a.bg}`}>
                <p className={`text-sm font-medium ${a.color}`}>{a.mensaje}</p>
              </div>
            ))}
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
    </div>
  )
}
