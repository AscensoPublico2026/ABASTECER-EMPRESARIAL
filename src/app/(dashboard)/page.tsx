import { DollarSign, TrendingUp, ShoppingCart, Users, AlertCircle, Settings, Landmark, Truck } from 'lucide-react'

const kpis = [
  { title: 'Caja Libre', value: '$0', icon: DollarSign, color: 'bg-green-500' },
  { title: 'Ventas del mes', value: '$0', icon: TrendingUp, color: 'bg-blue-500' },
  { title: 'Compras del mes', value: '$0', icon: ShoppingCart, color: 'bg-purple-500' },
  { title: 'Clientes activos', value: '0', icon: Users, color: 'bg-orange-500' },
]

const alerts = [
  { message: 'Configuracion pendiente: completa los datos de tu empresa', icon: Settings, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { message: 'Registra el capital inicial de los socios', icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-50' },
  { message: 'Registra tus primeros proveedores', icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50' },
]

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Resumen general de tu negocio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 ${kpi.color} rounded-xl flex items-center justify-center`}>
                <kpi.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{kpi.value}</p>
            <p className="text-sm text-gray-500 mt-1">{kpi.title}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Salud Financiera</h3>
          <div className="flex items-center justify-center py-8">
            <div className="w-40 h-40 rounded-full border-8 border-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-sm text-center">Sin datos</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Alertas</h3>
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl ${alert.bg}`}>
                <AlertCircle className={`w-5 h-5 ${alert.color} flex-shrink-0`} />
                <p className={`text-sm font-medium ${alert.color}`}>{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
