import Header from '@/components/layout/Header'
import { obtenerDatosFinancieros } from '@/lib/queries/financiero'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCOP } from '@/lib/format'
import {
  DollarSign, TrendingUp, AlertTriangle,
  ArrowDownLeft, ArrowUpRight, Shield, CheckCircle2,
  XCircle, Info, Wallet,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function FinancieroPage() {
  const { datos, error } = await obtenerDatosFinancieros()

  // Gastos operativos
  const supabase = createServerSupabaseClient()
  const { data: gastosData } = await supabase.from('gastos').select('monto')
  const totalGastos = (gastosData ?? []).reduce((s, g) => s + Number(g.monto ?? 0), 0)

  const semaforoColor = {
    VERDE: 'bg-green-500',
    AMARILLO: 'bg-yellow-400',
    ROJO: 'bg-red-500',
  }[datos.semaforoDividendos]

  const semaforoTexto = {
    VERDE: 'Dividendos: PERMITIDOS',
    AMARILLO: 'Dividendos: REVISAR',
    ROJO: 'Dividendos: NO RECOMENDADOS',
  }[datos.semaforoDividendos]

  return (
    <>
      <Header title="Centro de Control Financiero" subtitle="La verdad sobre el dinero de Abastecer" />

      <div className="p-8 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 text-red-700 text-sm">
            Error al cargar datos: {error}
          </div>
        )}

        {/* Regla del Dia Siguiente */}
        <div className={`rounded-2xl p-6 border-2 ${datos.sobrevive60Dias ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${datos.sobrevive60Dias ? 'bg-green-100' : 'bg-red-100'}`}>
              {datos.sobrevive60Dias ? <Shield className="w-6 h-6 text-green-600" /> : <AlertTriangle className="w-6 h-6 text-red-600" />}
            </div>
            <div>
              <h3 className={`font-bold text-lg ${datos.sobrevive60Dias ? 'text-green-800' : 'text-red-800'}`}>
                Regla del Dia Siguiente
              </h3>
              <p className={`text-sm mt-1 ${datos.sobrevive60Dias ? 'text-green-700' : 'text-red-700'}`}>
                {datos.sobrevive60Dias
                  ? `Si manana dejamos de vender, la empresa sobrevive ~${datos.diasEstimados} dias. Estamos en zona segura.`
                  : `La empresa sobreviviria solo ~${datos.diasEstimados} dias sin vender. Necesitamos fortalecer la caja antes de crecer.`
                }
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Decision #010: &quot;Si manana dejamos de vender 60 dias, la empresa sigue viva?&quot;
              </p>
            </div>
          </div>
        </div>

        {/* KPIs principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Utilidad bruta</span>
            </div>
            <p className="text-2xl font-bold text-green-600 tabular-nums">{formatCOP(datos.utilidadBruta)}</p>
            <p className="text-xs text-gray-400 mt-1">Margen promedio: {datos.margenPromedio.toFixed(1)}%</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Capital social</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 tabular-nums">{formatCOP(datos.capitalSocial)}</p>
            <p className="text-xs text-gray-400 mt-1">Aportes permanentes de socios</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm text-gray-500">Por cobrar (clientes)</span>
            </div>
            <p className="text-2xl font-bold text-amber-600 tabular-nums">{formatCOP(datos.cuentasPorCobrar)}</p>
            <p className="text-xs text-gray-400 mt-1">Facturas pendientes de pago</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-sm text-gray-500">Por pagar (proveedores)</span>
            </div>
            <p className="text-2xl font-bold text-red-600 tabular-nums">{formatCOP(datos.cuentasPorPagar)}</p>
            <p className="text-xs text-gray-400 mt-1">Facturas de compra pendientes</p>
          </div>
        </div>

        {/* IVA y Semaforo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cruce de IVA */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Cruce de IVA</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">IVA cobrado (ventas)</span>
                <span className="font-medium text-blue-600 tabular-nums">{formatCOP(datos.ivaCobrado)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">IVA pagado (compras)</span>
                <span className="font-medium text-gray-600 tabular-nums">- {formatCOP(datos.ivaPagado)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-800">IVA estimado a pagar DIAN</span>
                <span className={`font-bold text-lg tabular-nums ${datos.ivaPorPagar > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCOP(datos.ivaPorPagar)}
                </span>
              </div>
            </div>
            <div className="mt-4 bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-700">
                <strong>Recuerda:</strong> Este dinero NO es tuyo. Es de la DIAN.
                Debe estar separado y disponible para cuando llegue la fecha de declarar.
                (Politica #014)
              </p>
            </div>
          </div>

          {/* Semaforo de dividendos */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Semaforo de Dividendos</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-8 h-8 rounded-full ${semaforoColor}`}></div>
              <span className="font-medium text-gray-800">{semaforoTexto}</span>
            </div>
            {datos.semaforoDividendos !== 'VERDE' && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Condiciones pendientes:</p>
                {datos.motivoSemaforo.map((motivo, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span>{motivo}</span>
                  </div>
                ))}
              </div>
            )}
            {datos.semaforoDividendos === 'VERDE' && (
              <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-xl">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Todas las condiciones se cumplen. Se puede considerar repartir dividendos.</span>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-4">Politica #007: 7 condiciones simultaneas</p>
          </div>
        </div>

        {/* Resumen de operaciones */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Resumen de operaciones</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <p className="text-sm text-gray-500">Ventas facturadas</p>
              <p className="text-xl font-bold text-gray-800 mt-1 tabular-nums">{formatCOP(datos.ventasTotales)}</p>
              <p className="text-xs text-gray-400">{datos.numeroVentasFacturadas} facturas</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Compras</p>
              <p className="text-xl font-bold text-gray-800 mt-1 tabular-nums">{formatCOP(datos.comprasTotales)}</p>
              <p className="text-xs text-gray-400">{datos.numeroCompras} facturas</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gastos operativos</p>
              <p className="text-xl font-bold text-purple-600 mt-1 tabular-nums">{formatCOP(totalGastos)}</p>
              <p className="text-xs text-gray-400">Gastos registrados</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cotizaciones activas</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{datos.numeroCotizaciones}</p>
              <p className="text-xs text-gray-400">Pendientes/aprobadas</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Prestamos socios</p>
              <p className="text-xl font-bold text-indigo-600 mt-1 tabular-nums">{formatCOP(datos.prestamosSocios)}</p>
              <p className="text-xs text-gray-400">Por devolver</p>
            </div>
          </div>
        </div>

        {/* Nota conceptual */}
        <div className="flex items-start gap-3 bg-blue-50/60 border border-blue-100 rounded-2xl px-5 py-4">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-900 leading-relaxed">
            <strong>El banco miente.</strong> Este panel muestra la realidad financiera, no el saldo bancario.
            Cada peso tiene un nombre y un proposito (Politica #012). La caja libre real es lo que queda
            DESPUES de restar: IVA por pagar, cuentas a proveedores, y reservas.
          </p>
        </div>
      </div>
    </>
  )
}
