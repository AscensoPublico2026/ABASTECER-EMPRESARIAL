'use client'

import { useState } from 'react'
import { ESTADOS_COTIZACION, type EstadoCotizacion, type CotizacionConCliente } from '@/types/cotizaciones'
import { formatCOP, formatFecha } from '@/lib/format'
import { Receipt, Search, Filter } from 'lucide-react'
import AccionesCotizacion from './AccionesCotizacion'

interface Props {
  cotizaciones: CotizacionConCliente[]
  clientes: string[] // Lista de nombres de clientes unicos para el filtro
}

export default function TablaCotizaciones({ cotizaciones, clientes }: Props) {
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPago, setFiltroPago] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const filtradas = cotizaciones.filter((c) => {
    if (filtroCliente && (c.cliente_nombre ?? '') !== filtroCliente) return false
    if (filtroEstado && c.estado !== filtroEstado) return false
    if (filtroPago === 'CONTADO' && c.dias_credito > 0) return false
    if (filtroPago === 'CREDITO' && c.dias_credito === 0) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      const coincide = (c.numero ?? '').toLowerCase().includes(q)
        || (c.cliente_nombre ?? '').toLowerCase().includes(q)
        || (c.observaciones ?? '').toLowerCase().includes(q)
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
            placeholder="Buscar..."
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-40 focus:ring-1 focus:ring-blue-400 outline-none"
          />
        </div>
        <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600">
          <option value="">Todos los clientes</option>
          {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600">
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="APROBADA">Aprobada</option>
          <option value="RECHAZADA">Rechazada</option>
          <option value="VENCIDA">Vencida</option>
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
          <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="font-medium">{hayFiltros ? 'Sin resultados para este filtro' : 'Sin cotizaciones en proceso'}</p>
          <p className="text-sm mt-1">{hayFiltros ? 'Intenta con otros filtros.' : 'Crea tu primera cotizacion.'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left bg-gray-50/50">
                <th className="px-6 py-3 font-medium text-gray-500">Numero</th>
                <th className="px-6 py-3 font-medium text-gray-500">Cliente</th>
                <th className="px-6 py-3 font-medium text-gray-500">Fecha</th>
                <th className="px-6 py-3 font-medium text-gray-500">Pago</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Total</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Utilidad</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Margen %</th>
                <th className="px-6 py-3 font-medium text-gray-500">Estado</th>
                <th className="px-6 py-3 font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => {
                const estado = ESTADOS_COTIZACION[c.estado as EstadoCotizacion] ?? ESTADOS_COTIZACION.PENDIENTE
                const utilidadPositiva = c.utilidad_estimada >= 0
                return (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 cursor-pointer group">
                    <td className="px-6 py-4 font-mono text-gray-700 whitespace-nowrap">
                      <a href={`/ventas/${c.id}`} className="text-blue-600 hover:underline font-medium">{c.numero}</a>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">{c.cliente_nombre ?? 'Sin cliente'}</td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatFecha(c.fecha)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.dias_credito > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {c.dias_credito > 0 ? `Credito ${c.dias_credito}d` : 'Contado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-gray-700">{formatCOP(c.total)}</td>
                    <td className={`px-6 py-4 text-right tabular-nums font-medium ${utilidadPositiva ? 'text-green-600' : 'text-red-600'}`}>{formatCOP(c.utilidad_estimada)}</td>
                    <td className={`px-6 py-4 text-right tabular-nums ${utilidadPositiva ? 'text-green-600' : 'text-red-600'}`}>{c.margen_pct.toFixed(1)}%</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${estado.color}`}>{estado.etiqueta}</span>
                    </td>
                    <td className="px-6 py-4">
                      <AccionesCotizacion cotizacionId={c.id} estado={c.estado} numero={c.numero} diasCredito={c.dias_credito} />
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
