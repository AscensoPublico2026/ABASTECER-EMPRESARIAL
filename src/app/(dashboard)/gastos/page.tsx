import Header from '@/components/layout/Header'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCOP, formatFecha } from '@/lib/format'
import { Wallet } from 'lucide-react'
import FormGasto from './FormGasto'

export const dynamic = 'force-dynamic'

const CATEGORIAS: Record<string, string> = {
  CONSTITUCION: 'Constitucion',
  IMPUESTOS: 'Impuestos',
  SERVICIOS: 'Servicios',
  TRANSPORTE: 'Transporte',
  MARKETING: 'Marketing',
  TECNOLOGIA: 'Tecnologia',
  LEGAL: 'Legal',
  BANCARIO: 'Bancario',
  OTROS: 'Otros',
}

export default async function GastosPage() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('gastos')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(100)

  const gastos = data ?? []
  const totalGastos = gastos.reduce((s, g) => s + Number(g.monto ?? 0), 0)

  return (
    <>
      <Header title="Gastos" subtitle="Gastos operativos y de constitucion" />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total gastos</p>
            <p className="text-2xl font-bold text-gray-800 mt-1 tabular-nums">{formatCOP(totalGastos)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Registros</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{gastos.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-800">Gastos registrados</h3>
              <p className="text-sm text-gray-500 mt-0.5">Camara de comercio, certificados, transporte, etc.</p>
            </div>
            <FormGasto />
          </div>

          {error && <div className="px-6 py-4 bg-red-50 text-red-700 text-sm">Error: {error.message}</div>}

          {gastos.length === 0 && !error ? (
            <div className="text-center py-12 text-gray-400">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Sin gastos registrados</p>
              <p className="text-sm mt-1">Registra gastos operativos como Camara de Comercio, certificados, etc.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-3 font-medium text-gray-500">Fecha</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Concepto</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Categoria</th>
                  <th className="px-6 py-3 font-medium text-gray-500 text-right">Monto</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Pagado por</th>
                </tr></thead>
                <tbody>
                  {gastos.map((g) => (
                    <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-gray-500">{formatFecha(g.fecha)}</td>
                      <td className="px-6 py-4 font-medium text-gray-800">{g.concepto}</td>
                      <td className="px-6 py-4"><span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{CATEGORIAS[g.categoria] ?? g.categoria}</span></td>
                      <td className="px-6 py-4 text-right tabular-nums font-medium text-gray-800">{formatCOP(Number(g.monto))}</td>
                      <td className="px-6 py-4 text-gray-500">{g.pagado_por ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
