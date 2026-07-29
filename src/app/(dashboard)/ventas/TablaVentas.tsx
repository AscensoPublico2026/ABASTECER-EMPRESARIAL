'use client'

import { useState } from 'react'
import { ESTADOS_FACTURA_VENTA, type EstadoFacturaVenta, type FacturaVentaConCliente } from '@/types/facturasVenta'
import { formatCOP, formatFecha } from '@/lib/format'
import { FileCheck2, Search, Filter } from 'lucide-react'

interface Props {
  facturas: FacturaVentaConCliente[]
  clientes: string[]
}

export default function TablaVentas({ facturas, clientes }: Props) {
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPago, setFiltroPago] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const filtradas = facturas.filter((fv) => {
    if (filtroCliente && (fv.cliente_nombre ?? '') !== filtroCliente) return false
    if (filtroEstado && fv.estado !== filtroEstado) return false
    if (filtroPago === 'CONTADO' && fv.dias_credito > 0) return false
    if (filtroPago === 'CREDITO' && fv.dias_credito === 0) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      const coincide = (fv.numero_factura_dian ?? '').toLowerCase().includes(q)
        || (fv.numero_cotizacion ?? '').toLowerCase().includes(q)
        || (fv.cliente_nombre ?? '').toLowerCase().includes(q)
      if (!coincide) return false
    }
    return true
  })

  const hayFiltros = filtroCliente || filtroEstado || filtroPago || busqueda

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Barra de filtros */}
      <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar factura, cotizacion..."
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-52 focus:ring-1 focus:ring-blue-400 outline-none"
          />
        </div>
        <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600">
          <option value="">Todos los clientes</option>
          {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600">
          <option value="">Todos los estados</option>
          <option value="EMITIDA">Por cobrar</option>
          <option value="COBRADA">Cobrada</option>
          <option value="PARCIAL">Pago parcial</option>
          <option value="ANULADA">Anulada</option>
        </select>
        <select value={filtroPago} onChange={(e) => setFiltroPago(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600">
          <option value="">Contado y Credito</option>
          <option value="CONTADO">Solo Contado</option>
          <option value="CREDITO">Solo Credito</option>
        </select>
        {hayFiltros && (
          <button onClick={() => { setFiltroCliente(''); setFiltroEstado(''); setFiltroPago(''); setBusqueda('') }} className="text-xs text-blue-600 hover:underline">
            Limpiar filtros
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''}</span>
      </div>

      {filtradas.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <FileCheck2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="font-medium">{hayFiltros ? 'Sin resultados para este filtro' : 'Sin ventas cerradas'}</p>
          <p className="text-sm mt-1">{hayFiltros ? 'Intenta con otros filtros.' : 'Cuando cierres una cotizacion, aparecera aqui.'}</p>
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
              {filtradas.map((fv) => {
                const estado = ESTADOS_FACTURA_VENTA[fv.estado as EstadoFacturaVenta] ?? ESTADOS_FACTURA_VENTA.EMITIDA
                const utilidadPositiva = fv.utilidad >= 0
                return (
                  <tr key={fv.id} className="border-b border-gray-50 last:border-0 hover:bg-green-50/30 cursor-pointer">
                    <td className="px-6 py-4 font-mono font-medium whitespace-nowrap">
                      <a href={`/ventas/${fv.cotizacion_id ?? fv.id}`} className="text-blue-600 hover:underline">
                        {fv.numero_factura_dian ?? '—'}
                      </a>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-500 whitespace-nowrap text-xs">
                      {fv.numero_cotizacion ? (
                        <a href={`/ventas/${fv.cotizacion_id}`} className="text-blue-500 hover:underline">{fv.numero_cotizacion}</a>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">{fv.cliente_nombre ?? 'Sin cliente'}</td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatFecha(fv.fecha)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${fv.dias_credito > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {fv.dias_credito > 0 ? `Credito ${fv.dias_credito}d` : 'Contado'}
                      </span>
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
  )
}
