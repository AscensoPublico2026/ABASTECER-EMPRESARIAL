'use client'

import { useState, useTransition, useRef } from 'react'
import { ESTADOS_FACTURA_VENTA, type EstadoFacturaVenta, type FacturaVentaConCliente } from '@/types/facturasVenta'
import { formatCOP, formatFecha } from '@/lib/format'
import { FileCheck2, Search, Filter, Loader2, Upload, FileCheck, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { marcarFacturaCobrada } from './actions'

interface Props {
  facturas: FacturaVentaConCliente[]
  clientes: string[]
}

function diasRestantes(fechaVencimiento: string | null): number | null {
  if (!fechaVencimiento) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const [y, m, d] = fechaVencimiento.split('-').map(Number)
  const venc = new Date(y, m - 1, d)
  const diff = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function TablaVentas({ facturas, clientes }: Props) {
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPago, setFiltroPago] = useState('')
  const [busqueda, setBusqueda] = useState('')

  // Modal cobrar
  const [modalCobrar, setModalCobrar] = useState<FacturaVentaConCliente | null>(null)
  const [soportePdf, setSoportePdf] = useState<File | null>(null)
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10))
  const [aplicaRetenciones, setAplicaRetenciones] = useState(false)
  const [retefuente, setRetefuente] = useState('')
  const [reteIva, setReteIva] = useState('')
  const [reteIca, setReteIca] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [pendiente, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

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

  const totalRetenciones = (Number(retefuente.replace(/\./g, '').replace(',', '.')) || 0) + (Number(reteIva.replace(/\./g, '').replace(',', '.')) || 0) + (Number(reteIca.replace(/\./g, '').replace(',', '.')) || 0)

  async function handleCobrar() {
    if (!modalCobrar) return
    if (!fechaPago) {
      setResultado({ ok: false, mensaje: 'Selecciona la fecha de pago.' })
      return
    }
    if (!soportePdf) {
      setResultado({ ok: false, mensaje: 'Debes cargar el soporte de pago (comprobante de transferencia, captura de Bold, etc.)' })
      return
    }
    setSubiendo(true)
    setResultado(null)

    try {
      const fd = new FormData()
      fd.set('factura_venta_id', modalCobrar.id)
      fd.set('fecha_pago', fechaPago)

      // Retenciones
      if (aplicaRetenciones) {
        fd.set('retefuente', String(Number(retefuente.replace(/\./g, '').replace(',', '.')) || 0))
        fd.set('rete_iva', String(Number(reteIva.replace(/\./g, '').replace(',', '.')) || 0))
        fd.set('rete_ica', String(Number(reteIca.replace(/\./g, '').replace(',', '.')) || 0))
      }

      // Subir soporte de pago si hay
      if (soportePdf) {
        const supabase = createClient()
        const ext = soportePdf.name.split('.').pop()
        const path = `factura_venta/${modalCobrar.id}/${Date.now()}_soporte.${ext}`
        const { error: errUpload } = await supabase.storage
          .from('documentos')
          .upload(path, soportePdf, { contentType: soportePdf.type })

        if (errUpload) {
          setResultado({ ok: false, mensaje: `Error subiendo soporte: ${errUpload.message}` })
          setSubiendo(false)
          return
        }

        const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path)
        fd.set('soporte_url', urlData.publicUrl)
        fd.set('soporte_nombre', soportePdf.name)
      }

      startTransition(async () => {
        const res = await marcarFacturaCobrada(fd)
        setResultado(res)
        setSubiendo(false)
        if (res.ok) {
          setTimeout(() => { setModalCobrar(null); setSoportePdf(null); setFechaPago(new Date().toISOString().slice(0, 10)); setAplicaRetenciones(false); setRetefuente(''); setReteIva(''); setReteIca(''); setResultado(null) }, 1500)
        }
      })
    } catch (err) {
      setResultado({ ok: false, mensaje: err instanceof Error ? err.message : 'Error.' })
      setSubiendo(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Barra de filtros */}
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar factura, cotizacion, cliente..."
              className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-56 focus:ring-1 focus:ring-blue-400 outline-none"
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
              Limpiar
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''}</span>
        </div>

        {filtradas.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <FileCheck2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-medium">{hayFiltros ? 'Sin resultados para este filtro' : 'Sin ventas cerradas'}</p>
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
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">Utilidad</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">Margen</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Estado</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Accion</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((fv) => {
                  const estado = ESTADOS_FACTURA_VENTA[fv.estado as EstadoFacturaVenta] ?? ESTADOS_FACTURA_VENTA.EMITIDA
                  const utilidadPositiva = fv.utilidad >= 0
                  const dias = diasRestantes(fv.fecha_vencimiento)
                  const diasColor = dias === null ? '' : dias < 0 ? 'text-red-600 font-bold' : dias <= 5 ? 'text-amber-600 font-semibold' : 'text-gray-600'
                  const diasLabel = dias === null ? '—' : dias < 0 ? `Vencida (${Math.abs(dias)}d)` : dias === 0 ? 'Hoy' : `${dias}d`

                  return (
                    <tr key={fv.id} className="border-b border-gray-50 last:border-0 hover:bg-green-50/30">
                      <td className="px-4 py-3 font-mono font-medium whitespace-nowrap">
                        <a href={`/ventas/factura/${fv.id}`} className="text-blue-600 hover:underline">
                          {fv.numero_factura_dian ?? '—'}
                        </a>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {fv.numero_cotizacion && fv.cotizacion_id ? (
                          <a href={`/ventas/${fv.cotizacion_id}`} className="text-blue-500 hover:underline">{fv.numero_cotizacion}</a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[140px] truncate">{fv.cliente_nombre ?? 'Sin cliente'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{formatFecha(fv.fecha)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fv.fecha_vencimiento ? formatFecha(fv.fecha_vencimiento) : '—'}</td>
                      <td className={`px-4 py-3 whitespace-nowrap text-xs ${diasColor}`}>{diasLabel}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${fv.dias_credito > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {fv.dias_credito > 0 ? `Credito ${fv.dias_credito}d` : 'Contado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatCOP(fv.total)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-medium ${utilidadPositiva ? 'text-green-600' : 'text-red-600'}`}>{formatCOP(fv.utilidad)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums text-xs ${utilidadPositiva ? 'text-green-600' : 'text-red-600'}`}>{fv.margen_pct.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${estado.color}`}>{estado.etiqueta}</span>
                      </td>
                      <td className="px-4 py-3">
                        {fv.estado === 'EMITIDA' && (
                          <button
                            onClick={() => setModalCobrar(fv)}
                            className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition whitespace-nowrap"
                          >
                            Cobrar
                          </button>
                        )}
                        {fv.estado === 'COBRADA' && (
                          <span className="text-xs text-green-600">✓ Pagada</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cobrar */}
      {modalCobrar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Registrar cobro</h3>
                <p className="text-xs text-gray-500 mt-0.5">Factura {modalCobrar.numero_factura_dian} · {modalCobrar.cliente_nombre}</p>
              </div>
              <button onClick={() => { setModalCobrar(null); setSoportePdf(null); setResultado(null) }} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-green-800 font-medium">Monto a cobrar: {formatCOP(modalCobrar.total)}</p>
                <p className="text-xs text-green-600 mt-1">Al marcar como cobrada, esta factura pasa a estado &quot;Cobrada&quot;</p>
              </div>

              {/* Fecha de pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha en que se recibio el pago *</label>
                <input
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>

              {/* Retenciones */}
              <div className="bg-amber-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-amber-800">¿El cliente aplico retenciones?</p>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={aplicaRetenciones} onChange={(e) => setAplicaRetenciones(e.target.checked)} className="rounded border-gray-300 text-amber-600" />
                    Si, retuvo
                  </label>
                </div>
                {aplicaRetenciones && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-amber-700 mb-1">Retefuente</label>
                        <input value={retefuente} onChange={(e) => setRetefuente(e.target.value)} inputMode="numeric" placeholder="0" className="w-full px-2 py-2 border border-amber-200 rounded-lg text-sm text-right bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs text-amber-700 mb-1">ReteIVA</label>
                        <input value={reteIva} onChange={(e) => setReteIva(e.target.value)} inputMode="numeric" placeholder="0" className="w-full px-2 py-2 border border-amber-200 rounded-lg text-sm text-right bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs text-amber-700 mb-1">ReteICA</label>
                        <input value={reteIca} onChange={(e) => setReteIca(e.target.value)} inputMode="numeric" placeholder="0" className="w-full px-2 py-2 border border-amber-200 rounded-lg text-sm text-right bg-white" />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-amber-200 space-y-1">
                      <div className="flex justify-between text-xs text-amber-700">
                        <span>Total retenciones:</span>
                        <span className="font-bold">{formatCOP(totalRetenciones)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium text-amber-900">
                        <span>Monto que recibes:</span>
                        <span>{formatCOP(modalCobrar.total - totalRetenciones)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-amber-600">Las retenciones se cruzan con impuestos al final del año. No son perdida.</p>
                  </div>
                )}
              </div>

              {/* Soporte de pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Soporte de pago (comprobante) *</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${
                    soportePdf ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  {soportePdf ? (
                    <>
                      <FileCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-green-700 font-medium truncate">{soportePdf.name}</p>
                        <p className="text-xs text-green-600">{(soportePdf.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSoportePdf(null); if (fileRef.current) fileRef.current.value = '' }} className="text-gray-400 hover:text-red-500 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Cargar soporte de pago (obligatorio)</p>
                        <p className="text-xs text-gray-400">Captura de Bold, comprobante de transferencia, recibo</p>
                      </div>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setSoportePdf(e.target.files?.[0] ?? null)} className="hidden" />
              </div>

              {resultado && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                  <span>{resultado.mensaje}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setModalCobrar(null); setSoportePdf(null); setResultado(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleCobrar} disabled={pendiente || subiendo} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {(pendiente || subiendo) && <Loader2 className="w-4 h-4 animate-spin" />}
                  Marcar como cobrada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
