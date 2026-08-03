'use client'

import { useState, useTransition, useRef } from 'react'
import { anularFacturaCompra, pagarFacturaCompra, editarDatosFacturaCompra } from './actions'
import { createClient } from '@/lib/supabase/client'
import { formatCOP } from '@/lib/format'
import {
  Pencil, Ban, DollarSign, FileText, Loader2, X,
  AlertCircle, CheckCircle2, Upload, FileCheck,
} from 'lucide-react'

interface Props {
  factura: {
    id: string
    numero_factura: string | null
    fecha_factura: string
    forma_pago: string
    estado: string
    total: number
    soporte_url: string | null
    proveedor_id?: string | null
  }
  proveedores: { id: string; razon_social: string }[]
  cuentas: { id: string; nombre: string; es_reserva: boolean }[]
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

export default function AccionesFacturaCompra({ factura, proveedores, cuentas }: Props) {
  const [pendiente, startTransition] = useTransition()
  const [modal, setModal] = useState<null | 'editar' | 'pagar' | 'anular'>(null)
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [pdf, setPdf] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const pdfRef = useRef<HTMLInputElement>(null)

  const anulada = factura.estado === 'ANULADA'
  const pagada = factura.estado === 'PAGADA'
  const cuentasOperativas = cuentas.filter((c) => !c.es_reserva)
  const ocupado = pendiente || subiendo

  function cerrar() {
    setModal(null)
    setResultado(null)
    setPdf(null)
  }

  async function handleEditar(formData: FormData) {
    formData.set('factura_id', factura.id)
    setResultado(null)
    setSubiendo(true)

    try {
      if (pdf) {
        const supabase = createClient()
        const ext = pdf.name.split('.').pop()
        const path = `factura_compra/${factura.id}/${Date.now()}_factura.${ext}`
        const { error } = await supabase.storage.from('documentos').upload(path, pdf, { contentType: pdf.type })
        if (error) {
          setResultado({ ok: false, mensaje: error.message })
          setSubiendo(false)
          return
        }
        const { data } = supabase.storage.from('documentos').getPublicUrl(path)
        formData.set('soporte_url', data.publicUrl)
        formData.set('soporte_nombre', pdf.name)
      }

      startTransition(async () => {
        const res = await editarDatosFacturaCompra(formData)
        setResultado(res)
        setSubiendo(false)
        if (res.ok) setTimeout(cerrar, 1500)
      })
    } catch (e) {
      setResultado({ ok: false, mensaje: e instanceof Error ? e.message : 'Error.' })
      setSubiendo(false)
    }
  }

  function handlePagar(formData: FormData) {
    formData.set('factura_id', factura.id)
    setResultado(null)
    startTransition(async () => {
      const res = await pagarFacturaCompra(formData)
      setResultado(res)
      if (res.ok) setTimeout(cerrar, 1500)
    })
  }

  function handleAnular(formData: FormData) {
    formData.set('factura_id', factura.id)
    setResultado(null)
    startTransition(async () => {
      const res = await anularFacturaCompra(formData)
      setResultado(res)
      if (res.ok) setTimeout(cerrar, 2000)
    })
  }

  return (
    <div className="flex items-center gap-1">
      {factura.soporte_url && (
        <a
          href={factura.soporte_url}
          target="_blank"
          rel="noopener noreferrer"
          title="Ver factura del proveedor"
          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
        >
          <FileText className="w-3.5 h-3.5" />
        </a>
      )}

      {!anulada && (
        <button
          onClick={() => setModal('editar')}
          title="Editar datos de la factura"
          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}

      {!anulada && !pagada && cuentasOperativas.length > 0 && (
        <button
          onClick={() => setModal('pagar')}
          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-100 transition"
        >
          <DollarSign className="w-3 h-3" /> Pagar
        </button>
      )}

      {!anulada && (
        <button
          onClick={() => setModal('anular')}
          title="Anular factura"
          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
        >
          <Ban className="w-3.5 h-3.5" />
        </button>
      )}

      {/* ===== MODAL EDITAR ===== */}
      {modal === 'editar' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Editar factura de compra</h3>
                <p className="text-xs text-gray-500 mt-0.5">{factura.numero_factura}</p>
              </div>
              <button onClick={cerrar} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form action={handleEditar} className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-blue-800">
                  Esto corrige los datos de la factura y permite adjuntar el PDF.
                  Para cambiar productos o cantidades, anula la factura y registrala de nuevo.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <select name="proveedor_id" defaultValue={factura.proveedor_id ?? ''} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                  <option value="">Sin cambio</option>
                  {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No. Factura</label>
                <input name="numero_factura" defaultValue={factura.numero_factura ?? ''} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input name="fecha_factura" type="date" defaultValue={factura.fecha_factura?.slice(0, 10)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
                  <select name="forma_pago" defaultValue={factura.forma_pago} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                    <option value="Contado">Contado</option>
                    <option value="Credito 15 dias">Credito 15 dias</option>
                    <option value="Credito 30 dias">Credito 30 dias</option>
                    <option value="Credito 45 dias">Credito 45 dias</option>
                    <option value="Credito 60 dias">Credito 60 dias</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PDF de la factura {factura.soporte_url ? '(reemplazar)' : ''}
                </label>
                <div
                  onClick={() => pdfRef.current?.click()}
                  className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${pdf ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  {pdf ? (
                    <>
                      <FileCheck className="w-5 h-5 text-green-600" />
                      <p className="text-sm text-green-700 font-medium truncate flex-1">{pdf.name}</p>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPdf(null) }} className="text-gray-400 hover:text-red-500 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-gray-400" />
                      <p className="text-sm text-gray-600">Cargar PDF</p>
                    </>
                  )}
                </div>
                <input ref={pdfRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} className="hidden" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea name="notas" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" />
              </div>

              {resultado && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                  <span>{resultado.mensaje}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrar} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={ocupado} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {ocupado && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL PAGAR ===== */}
      {modal === 'pagar' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Registrar pago al proveedor</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {factura.numero_factura} · {formatCOP(factura.total)}
                </p>
              </div>
              <button onClick={cerrar} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form action={handlePagar} className="p-6 space-y-4">
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-sm text-emerald-800 font-medium">
                  Se registra la salida de {formatCOP(factura.total)} de la cuenta que elijas.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta de donde sale *</label>
                <select name="cuenta_id" required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                  <option value="">Seleccionar cuenta</option>
                  {cuentasOperativas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de pago *</label>
                  <input name="fecha_pago" type="date" defaultValue={hoy()} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medio</label>
                  <select name="medio_pago" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
                <input name="referencia" placeholder="No. de transaccion" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>

              {resultado && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                  <span>{resultado.mensaje}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrar} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={ocupado} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                  {ocupado && <Loader2 className="w-4 h-4 animate-spin" />} Registrar pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL ANULAR ===== */}
      {modal === 'anular' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Anular factura de compra</h3>
                <p className="text-xs text-gray-500 mt-0.5">{factura.numero_factura}</p>
              </div>
              <button onClick={cerrar} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form action={handleAnular} className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800 font-medium">Al anular esta factura:</p>
                <ul className="text-xs text-red-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Se devuelve el stock que habia sumado</li>
                  <li>Se borra la asignacion de costos a las ventas</li>
                  <li>Se recalcula la utilidad de las ventas afectadas</li>
                  <li>Se borran los movimientos de caja de esta factura</li>
                  <li>Las solicitudes de compra vuelven a PENDIENTE</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de la anulacion</label>
                <textarea name="motivo" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" placeholder="Ej: se registro con valores equivocados" />
              </div>

              {resultado && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                  <span>{resultado.mensaje}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrar} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={ocupado} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {ocupado && <Loader2 className="w-4 h-4 animate-spin" />} Anular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
