'use client'

import { useState, useTransition } from 'react'
import { formatCOP, formatFecha } from '@/lib/format'
import { eliminarMovimientoTesoreria } from '@/app/(dashboard)/tesoreria/actions'
import { ArrowDownCircle, ArrowUpCircle, Search, Filter, Trash2, Loader2, FileText, Wallet } from 'lucide-react'
import type { MovimientoLibro } from '@/lib/queries/tesoreria'

interface Props {
  movimientos: MovimientoLibro[]
  cuentas: { id: string; nombre: string; es_reserva: boolean }[]
}

const ETIQUETA_CATEGORIA: Record<string, string> = {
  COBRO_CLIENTE: 'Cobro a cliente',
  PAGO_PROVEEDOR: 'Pago a proveedor',
  GASTO: 'Gasto',
  PAGO_IMPUESTO: 'Pago de impuesto',
  APORTE_SOCIO: 'Aporte de socio',
  PRESTAMO_SOCIO: 'Prestamo de socio',
  DEVOLUCION_PRESTAMO: 'Devolucion de prestamo',
  DIVIDENDO: 'Dividendo',
  TRASLADO_ENTRADA: 'Traslado (entra)',
  TRASLADO_SALIDA: 'Traslado (sale)',
  AJUSTE: 'Ajuste',
  OTRO: 'Otro',
}

export default function LibroTesoreria({ movimientos, cuentas }: Props) {
  const [filtroCuenta, setFiltroCuenta] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [borrando, setBorrando] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [, startTransition] = useTransition()

  const categorias = Array.from(new Set(movimientos.map((m) => m.categoria))).sort()

  const filtrados = movimientos.filter((m) => {
    if (filtroCuenta && m.cuenta_id !== filtroCuenta) return false
    if (filtroTipo && m.tipo !== filtroTipo) return false
    if (filtroCategoria && m.categoria !== filtroCategoria) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      const coincide = m.concepto.toLowerCase().includes(q)
        || m.origen.toLowerCase().includes(q)
        || (m.referencia ?? '').toLowerCase().includes(q)
        || m.cuenta_nombre.toLowerCase().includes(q)
      if (!coincide) return false
    }
    return true
  })

  const totalEntradas = filtrados.filter((m) => m.tipo === 'INGRESO').reduce((s, m) => s + m.monto, 0)
  const totalSalidas = filtrados.filter((m) => m.tipo === 'EGRESO').reduce((s, m) => s + m.monto, 0)
  const hayFiltros = filtroCuenta || filtroTipo || filtroCategoria || busqueda

  function borrar(m: MovimientoLibro) {
    const texto = m.movimiento_relacionado_id
      ? 'Este movimiento es un traslado. Se van a borrar los dos lados. Seguro?'
      : `Eliminar el movimiento "${m.concepto}" por ${formatCOP(m.monto)}?`
    if (!confirm(texto)) return

    setBorrando(m.id)
    setAviso(null)
    const fd = new FormData()
    fd.set('id', m.id)

    startTransition(async () => {
      const res = await eliminarMovimientoTesoreria(fd)
      setAviso(res)
      setBorrando(null)
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-800">Libro de movimientos</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Cada peso que entra y sale, con su origen
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="text-xs text-gray-400">Entradas</p>
              <p className="font-bold text-green-600 tabular-nums">{formatCOP(totalEntradas)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Salidas</p>
              <p className="font-bold text-red-600 tabular-nums">{formatCOP(totalSalidas)}</p>
            </div>
            <div className="text-right border-l border-gray-200 pl-4">
              <p className="text-xs text-gray-400">Neto</p>
              <p className={`font-bold tabular-nums ${totalEntradas - totalSalidas >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCOP(totalEntradas - totalSalidas)}
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por concepto, origen o referencia"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <select value={filtroCuenta} onChange={(e) => setFiltroCuenta(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm">
            <option value="">Todas las cuentas</option>
            {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm">
            <option value="">Entradas y salidas</option>
            <option value="INGRESO">Solo entradas</option>
            <option value="EGRESO">Solo salidas</option>
          </select>
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm">
            <option value="">Todas las categorias</option>
            {categorias.map((c) => <option key={c} value={c}>{ETIQUETA_CATEGORIA[c] ?? c}</option>)}
          </select>
          {hayFiltros && (
            <button
              onClick={() => { setFiltroCuenta(''); setFiltroTipo(''); setFiltroCategoria(''); setBusqueda('') }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:text-gray-700"
            >
              <Filter className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>

        {aviso && (
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${aviso.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {aviso.mensaje}
          </div>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="py-16 text-center">
          <Wallet className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="text-gray-500 mt-3 text-sm">
            {movimientos.length === 0
              ? 'Todavia no hay movimientos de dinero registrados.'
              : 'Ningun movimiento coincide con los filtros.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Fecha</th>
                <th className="px-6 py-3 text-left font-medium">Concepto</th>
                <th className="px-6 py-3 text-left font-medium">Origen</th>
                <th className="px-6 py-3 text-left font-medium">Cuenta</th>
                <th className="px-6 py-3 text-right font-medium">Entra</th>
                <th className="px-6 py-3 text-right font-medium">Sale</th>
                <th className="px-6 py-3 text-center font-medium">Soporte</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/60">
                  <td className="px-6 py-3.5 whitespace-nowrap text-gray-600">{formatFecha(m.fecha)}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-start gap-2">
                      {m.tipo === 'INGRESO'
                        ? <ArrowDownCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        : <ArrowUpCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800">{m.concepto}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {ETIQUETA_CATEGORIA[m.categoria] ?? m.categoria}
                          {m.referencia ? ` · ${m.referencia}` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-gray-600">{m.origen}</td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${m.cuenta_es_reserva ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                      {m.cuenta_nombre}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right tabular-nums font-medium text-green-600">
                    {m.tipo === 'INGRESO' ? formatCOP(m.monto) : ''}
                  </td>
                  <td className="px-6 py-3.5 text-right tabular-nums font-medium text-red-600">
                    {m.tipo === 'EGRESO' ? formatCOP(m.monto) : ''}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {m.soporte_url ? (
                      <a href={m.soporte_url} target="_blank" rel="noopener noreferrer" className="inline-flex text-blue-500 hover:text-blue-700" title="Ver soporte">
                        <FileText className="w-4 h-4" />
                      </a>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {m.es_manual ? (
                      <button
                        onClick={() => borrar(m)}
                        disabled={borrando === m.id}
                        title="Eliminar movimiento"
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-50"
                      >
                        {borrando === m.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300" title="Se corrige desde su modulo">auto</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
