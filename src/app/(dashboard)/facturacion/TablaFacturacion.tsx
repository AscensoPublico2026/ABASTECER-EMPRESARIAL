'use client'

import { useState } from 'react'
import { type FacturaVentaConCliente } from '@/types/facturasVenta'
import { formatCOP, formatFecha } from '@/lib/format'
import { FileText, Search, Filter, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Props {
  facturas: FacturaVentaConCliente[]
  clientes: string[]
}

function calcDias(fechaVencimiento: string | null): number | null {
  if (!fechaVencimiento) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const [y, m, d] = fechaVencimiento.split('-').map(Number)
  const venc = new Date(y, m - 1, d)
  return Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

function estadoConMora(fv: FacturaVentaConCliente): { label: string; color: string } {
  if (fv.estado === 'COBRADA') return { label: 'Cobrada', color: 'bg-green-50 text-green-700 border-green-200' }
  if (fv.estado === 'ANULADA') return { label: 'Anulada', color: 'bg-red-50 text-red-700 border-red-200' }
  if (fv.estado === 'PARCIAL') return { label: 'Pago parcial', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' }
  // EMITIDA - verificar mora
  const dias = calcDias(fv.fecha_vencimiento)
  if (dias !== null && dias < 0) return { label: `En mora (${Math.abs(dias)}d)`, color: 'bg-red-50 text-red-700 border-red-300 font-semibold' }
  return { label: 'Pendiente', color: 'bg-amber-50 text-amber-700 border-amber-200' }
}

export default function TablaFacturacion({ facturas, clientes }: Props) {
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPago, setFiltroPago] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const filtradas = facturas.filter((fv) => {
    if (filtroCliente && (fv.cliente_nombre ?? '') !== filtroCliente) return false
    if (filtroEstado === 'MORA') {
      const dias = calcDias(fv.fecha_vencimiento)
      if (!(fv.estado === 'EMITIDA' && dias !== null && dias < 0)) return false
    } else if (filtroEstado && fv.estado !== filtroEstado) return false
    if (filtroPago === 'CONTADO' && fv.dias_credito > 0) return false
    if (filtroPago === 'CREDITO' && fv.dias_credito === 0) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!(fv.numero_factura_dian ?? '').toLowerCase().includes(q)
        && !(fv.numero_cotizacion ?? '').toLowerCase().includes(q)
        && !(fv.cliente_nombre ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const hayFiltros = filtroCliente || filtroEstado || filtroPago || busqueda

  function exportarExcel() {
    const datos = filtradas.map((fv) => {
      const dias = calcDias(fv.fecha_vencimiento)
      const est = estadoConMora(fv)
      return {
        'Factura DIAN': fv.numero_factura_dian ?? '',
        'Cotizacion': fv.numero_cotizacion ?? '',
        'Cliente': fv.cliente_nombre ?? '',
        'Fecha': fv.fecha,
        'Vencimiento': fv.fecha_vencimiento ?? '',
        'Dias restantes': dias ?? '',
        'Pago': fv.dias_credito > 0 ? `Credito ${fv.dias_credito}d` : 'Contado',
        'Total': fv.total,
        'Utilidad': fv.utilidad,
        'Margen %': fv.margen_pct,
        'Estado': est.label,
      }
    })
    const ws = XLSX.utils.json_to_sheet(datos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Facturacion')
    XLSX.writeFile(wb, `Facturacion_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function exportarEstadoCuenta() {
    if (!filtroCliente) {
      alert('Selecciona un cliente primero para generar su estado de cuenta.')
      return
    }
    const datos = filtradas.map((fv) => {
      const dias = calcDias(fv.fecha_vencimiento)
      const est = estadoConMora(fv)
      return {
        'Factura DIAN': fv.numero_factura_dian ?? '',
        'Fecha': fv.fecha,
        'Vencimiento': fv.fecha_vencimiento ?? '',
        'Dias': dias ?? '',
        'Total': fv.total,
        'Estado': est.label,
        'Pago': fv.dias_credito > 0 ? `Credito ${fv.dias_credito}d` : 'Contado',
      }
    })
    const ws = XLSX.utils.json_to_sheet(datos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Estado de Cuenta')
    XLSX.writeFile(wb, `Estado_Cuenta_${filtroCliente.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Barra de filtros */}
      <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar..." className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-44 focus:ring-1 focus:ring-blue-400 outline-none" />
        </div>
        <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600">
          <option value="">Todos los clientes</option>
          {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600">
          <option value="">Todos los estados</option>
          <option value="EMITIDA">Pendiente</option>
          <option value="COBRADA">Cobrada</option>
          <option value="MORA">En mora</option>
          <option value="ANULADA">Anulada</option>
        </select>
        <select value={filtroPago} onChange={(e) => setFiltroPago(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600">
          <option value="">Todos</option>
          <option value="CONTADO">Contado</option>
          <option value="CREDITO">Credito</option>
        </select>
        {hayFiltros && (
          <button onClick={() => { setFiltroCliente(''); setFiltroEstado(''); setFiltroPago(''); setBusqueda('') }} className="text-xs text-blue-600 hover:underline">Limpiar</button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={exportarExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition">
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
          {filtroCliente && (
            <button onClick={exportarEstadoCuenta} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition">
              <Download className="w-3.5 h-3.5" /> Estado de cuenta
            </button>
          )}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="font-medium">{hayFiltros ? 'Sin resultados' : 'Sin facturas emitidas'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left bg-gray-50/50">
                <th className="px-4 py-3 font-medium text-gray-500">Factura DIAN</th>
                <th className="px-4 py-3 font-medium text-gray-500">Cotizacion</th>
                <th className="px-4 py-3 font-medium text-gray-500">Cliente</th>
                <th className="px-4 py-3 font-medium text-gray-500">Fecha</th>
                <th className="px-4 py-3 font-medium text-gray-500">Vencimiento</th>
                <th className="px-4 py-3 font-medium text-gray-500">Dias</th>
                <th className="px-4 py-3 font-medium text-gray-500">Pago</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Total</th>
                <th className="px-4 py-3 font-medium text-gray-500">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((fv) => {
                const dias = calcDias(fv.fecha_vencimiento)
                const est = estadoConMora(fv)
                const diasColor = dias === null ? '' : dias < 0 ? 'text-red-600 font-bold' : dias <= 5 ? 'text-amber-600 font-semibold' : 'text-gray-600'

                return (
                  <tr key={fv.id} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30">
                    <td className="px-4 py-3 font-mono font-medium whitespace-nowrap">
                      <a href={`/ventas/factura/${fv.id}`} className="text-blue-600 hover:underline">{fv.numero_factura_dian ?? '—'}</a>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                      {fv.numero_cotizacion && fv.cotizacion_id ? (
                        <a href={`/ventas/${fv.cotizacion_id}`} className="text-blue-500 hover:underline">{fv.numero_cotizacion}</a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[140px] truncate">{fv.cliente_nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{formatFecha(fv.fecha)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fv.fecha_vencimiento ? formatFecha(fv.fecha_vencimiento) : '—'}</td>
                    <td className={`px-4 py-3 whitespace-nowrap text-xs ${diasColor}`}>
                      {dias === null ? '—' : dias < 0 ? `${Math.abs(dias)}d mora` : dias === 0 ? 'Hoy' : `${dias}d`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${fv.dias_credito > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {fv.dias_credito > 0 ? `Credito ${fv.dias_credito}d` : 'Contado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 font-medium">{formatCOP(fv.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${est.color}`}>{est.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
        {filtradas.length} factura{filtradas.length !== 1 ? 's' : ''} · Total: {formatCOP(filtradas.reduce((s, fv) => s + fv.total, 0))}
      </div>
    </div>
  )
}
