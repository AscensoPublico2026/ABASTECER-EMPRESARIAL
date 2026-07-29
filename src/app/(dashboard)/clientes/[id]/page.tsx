import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import { ESTADOS_CLIENTE } from '@/types/clientes'
import { formatCOP, formatFecha } from '@/lib/format'
import type { EstadoCliente } from '@/types/clientes'
import Link from 'next/link'
import { ArrowLeft, Receipt, ShoppingBag } from 'lucide-react'
import FormEditarCliente from './FormEditarCliente'

export const dynamic = 'force-dynamic'

export default async function ClienteDetallePage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: cliente } = await supabase.from('clientes').select('*').eq('id', params.id).single()
  if (!cliente) notFound()

  // Historial de cotizaciones/ventas a este cliente
  const { data: cotizaciones } = await supabase
    .from('cotizaciones')
    .select('id, numero, fecha, total, utilidad_estimada, margen_pct, estado')
    .eq('cliente_id', params.id)
    .order('fecha', { ascending: false })
    .limit(20)

  const { data: facturas } = await supabase
    .from('facturas_venta')
    .select('id, numero_factura_dian, fecha, total, utilidad, estado')
    .eq('cliente_id', params.id)
    .order('fecha', { ascending: false })
    .limit(20)

  const estado = ESTADOS_CLIENTE[cliente.estado as EstadoCliente]
  const historialCot = cotizaciones ?? []
  const historialFact = facturas ?? []

  return (
    <>
      <Header title={cliente.razon_social} subtitle="Perfil completo del cliente" />
      <div className="p-8 space-y-6">
        <Link href="/clientes" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm w-fit">
          <ArrowLeft className="w-4 h-4" /> Volver a clientes
        </Link>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${estado.color}`}>{estado.etiqueta}</span>
          {cliente.nit && <span className="text-sm text-gray-500">NIT: {cliente.nit}</span>}
          {cliente.tiene_credito && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-medium">Credito {cliente.dias_credito} dias | Cupo: {formatCOP(Number(cliente.cupo_credito))}</span>}
        </div>

        <FormEditarCliente cliente={cliente} />

        {/* Historial de cotizaciones */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Historial de cotizaciones ({historialCot.length})</h3>
          </div>
          {historialCot.length === 0 ? (
            <p className="px-6 py-6 text-sm text-gray-400">Sin cotizaciones a este cliente.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-2 font-medium text-gray-500">Numero</th>
                  <th className="px-6 py-2 font-medium text-gray-500">Fecha</th>
                  <th className="px-6 py-2 font-medium text-gray-500 text-right">Total</th>
                  <th className="px-6 py-2 font-medium text-gray-500 text-right">Utilidad</th>
                  <th className="px-6 py-2 font-medium text-gray-500">Estado</th>
                </tr></thead>
                <tbody>
                  {historialCot.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-mono text-xs"><a href={`/ventas/${c.id}`} className="text-blue-600 hover:underline">{c.numero}</a></td>
                      <td className="px-6 py-3 text-gray-500">{formatFecha(c.fecha)}</td>
                      <td className="px-6 py-3 text-right tabular-nums">{formatCOP(Number(c.total))}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-green-600">{formatCOP(Number(c.utilidad_estimada))}</td>
                      <td className="px-6 py-3"><span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{c.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Historial de facturas de venta */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-800">Facturas de venta ({historialFact.length})</h3>
          </div>
          {historialFact.length === 0 ? (
            <p className="px-6 py-6 text-sm text-gray-400">Sin facturas emitidas a este cliente.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-2 font-medium text-gray-500">Factura DIAN</th>
                  <th className="px-6 py-2 font-medium text-gray-500">Fecha</th>
                  <th className="px-6 py-2 font-medium text-gray-500 text-right">Total</th>
                  <th className="px-6 py-2 font-medium text-gray-500 text-right">Utilidad</th>
                  <th className="px-6 py-2 font-medium text-gray-500">Estado</th>
                </tr></thead>
                <tbody>
                  {historialFact.map((f) => (
                    <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-mono text-xs">{f.numero_factura_dian ?? '-'}</td>
                      <td className="px-6 py-3 text-gray-500">{formatFecha(f.fecha)}</td>
                      <td className="px-6 py-3 text-right tabular-nums">{formatCOP(Number(f.total))}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-green-600">{formatCOP(Number(f.utilidad))}</td>
                      <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${f.estado === 'COBRADA' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{f.estado}</span></td>
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
