'use client'

import { useState, useTransition, useRef } from 'react'
import { aprobarCotizacion, registrarPagoContado, pasarAlistamiento, cerrarVenta } from './actions'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, FileText, Loader2, AlertCircle, X, Upload, FileCheck, Pencil, Package, Truck, DollarSign } from 'lucide-react'

interface Props {
  cotizacionId: string
  estado: string
  numero: string
  diasCredito?: number
  total?: number
}

export default function AccionesCotizacion({ cotizacionId, estado, numero, diasCredito = 0, total = 0 }: Props) {
  const [pendiente, startTransition] = useTransition()
  const [modalPago, setModalPago] = useState(false)
  const [modalCerrar, setModalCerrar] = useState(false)
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  // Pago contado states
  const [soportePdf, setSoportePdf] = useState<File | null>(null)
  const [montoRecibido, setMontoRecibido] = useState('')
  const [retefuente, setRetefuente] = useState('')
  const [reteIva, setReteIva] = useState('')
  const [reteIca, setReteIca] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Cerrar venta states
  const [facturaPdf, setFacturaPdf] = useState<File | null>(null)
  const [ocPdf, setOcPdf] = useState<File | null>(null)
  const facturaRef = useRef<HTMLInputElement>(null)
  const ocRef = useRef<HTMLInputElement>(null)

  const esCredito = diasCredito > 0
  const montoRecibidoNum = Number(montoRecibido.replace(/\./g, '').replace(',', '.')) || 0
  const diferenciaRetenida = montoRecibidoNum > 0 ? total - montoRecibidoNum : 0
  const totalRetencionesManuales = (Number(retefuente.replace(/\./g, '').replace(',', '.')) || 0) + (Number(reteIva.replace(/\./g, '').replace(',', '.')) || 0) + (Number(reteIca.replace(/\./g, '').replace(',', '.')) || 0)
  const retencionCuadra = diferenciaRetenida === 0 || Math.abs(totalRetencionesManuales - diferenciaRetenida) < 2
  const hayRetencion = diferenciaRetenida > 0
  const mostrarValidacion = totalRetencionesManuales > 0 && totalRetencionesManuales >= diferenciaRetenida * 0.5

  function handleAprobar() {
    const fd = new FormData()
    fd.set('id', cotizacionId)
    setResultado(null)
    startTransition(async () => {
      const res = await aprobarCotizacion(fd)
      setResultado(res)
      if (res.ok) setTimeout(() => setResultado(null), 2000)
    })
  }

  function handleAlistamiento() {
    const fd = new FormData()
    fd.set('id', cotizacionId)
    setResultado(null)
    startTransition(async () => {
      const res = await pasarAlistamiento(fd)
      setResultado(res)
      if (res.ok) setTimeout(() => setResultado(null), 2000)
    })
  }

  async function handleRegistrarPago(formData: FormData) {
    if (!soportePdf) {
      setResultado({ ok: false, mensaje: 'Debes cargar el soporte de pago.' })
      return
    }
    if (!montoRecibido) {
      setResultado({ ok: false, mensaje: 'Ingresa el monto que recibiste.' })
      return
    }
    if (hayRetencion && !retencionCuadra) {
      setResultado({ ok: false, mensaje: `Las retenciones ingresadas ($${totalRetencionesManuales.toLocaleString('es-CO')}) no coinciden con la diferencia ($${diferenciaRetenida.toLocaleString('es-CO')}). Verifica los valores.` })
      return
    }
    formData.set('cotizacion_id', cotizacionId)
    formData.set('monto_recibido', String(montoRecibidoNum))
    setSubiendo(true)
    setResultado(null)

    try {
      const supabase = createClient()
      const ext = soportePdf.name.split('.').pop()
      const path = `cotizacion/${cotizacionId}/${Date.now()}_soporte.${ext}`
      const { error: errUpload } = await supabase.storage.from('documentos').upload(path, soportePdf, { contentType: soportePdf.type })
      if (errUpload) { setResultado({ ok: false, mensaje: errUpload.message }); setSubiendo(false); return }
      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path)
      formData.set('soporte_url', urlData.publicUrl)

      if (hayRetencion) {
        formData.set('retefuente', String(Number(retefuente.replace(/\./g, '').replace(',', '.')) || 0))
        formData.set('rete_iva', String(Number(reteIva.replace(/\./g, '').replace(',', '.')) || 0))
        formData.set('rete_ica', String(Number(reteIca.replace(/\./g, '').replace(',', '.')) || 0))
      }

      startTransition(async () => {
        const res = await registrarPagoContado(formData)
        setResultado(res)
        setSubiendo(false)
        if (res.ok) { setModalPago(false); setSoportePdf(null); setMontoRecibido(''); setRetefuente(''); setReteIva(''); setReteIca(''); setTimeout(() => setResultado(null), 2000) }
      })
    } catch (err) {
      setResultado({ ok: false, mensaje: err instanceof Error ? err.message : 'Error.' })
      setSubiendo(false)
    }
  }

  async function handleCerrarVenta(formData: FormData) {
    if (!facturaPdf) { setResultado({ ok: false, mensaje: 'Debes cargar el PDF de la factura DIAN.' }); return }
    if (esCredito && !ocPdf) { setResultado({ ok: false, mensaje: 'Para credito, debes cargar el PDF de la OC.' }); return }

    formData.set('cotizacion_id', cotizacionId)
    setSubiendo(true)
    setResultado(null)

    try {
      const supabase = createClient()

      // Subir factura
      const fExt = facturaPdf.name.split('.').pop()
      const fPath = `factura_venta/${cotizacionId}/${Date.now()}_factura.${fExt}`
      const { error: errF } = await supabase.storage.from('documentos').upload(fPath, facturaPdf, { contentType: facturaPdf.type })
      if (errF) { setResultado({ ok: false, mensaje: errF.message }); setSubiendo(false); return }
      const { data: urlF } = supabase.storage.from('documentos').getPublicUrl(fPath)
      formData.set('factura_pdf_url', urlF.publicUrl)
      formData.set('factura_pdf_nombre', facturaPdf.name)

      // Subir OC si hay
      if (ocPdf) {
        const oExt = ocPdf.name.split('.').pop()
        const oPath = `factura_venta/${cotizacionId}/${Date.now()}_oc.${oExt}`
        const { error: errO } = await supabase.storage.from('documentos').upload(oPath, ocPdf, { contentType: ocPdf.type })
        if (errO) { setResultado({ ok: false, mensaje: errO.message }); setSubiendo(false); return }
        const { data: urlO } = supabase.storage.from('documentos').getPublicUrl(oPath)
        formData.set('oc_pdf_url', urlO.publicUrl)
        formData.set('oc_pdf_nombre', ocPdf.name)
      }

      startTransition(async () => {
        const res = await cerrarVenta(formData)
        setResultado(res)
        setSubiendo(false)
        if (res.ok) { setModalCerrar(false); setFacturaPdf(null); setOcPdf(null); setTimeout(() => setResultado(null), 3000) }
      })
    } catch (err) {
      setResultado({ ok: false, mensaje: err instanceof Error ? err.message : 'Error.' })
      setSubiendo(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Editar (PENDIENTE o APROBADA) */}
      {(estado === 'PENDIENTE' || estado === 'APROBADA') && (
        <a href={`/ventas/${cotizacionId}/editar`} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition" title="Editar">
          <Pencil className="w-3.5 h-3.5" />
        </a>
      )}

      {/* Aprobar (PENDIENTE) */}
      {estado === 'PENDIENTE' && (
        <button onClick={handleAprobar} disabled={pendiente} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition disabled:opacity-50">
          {pendiente ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Aprobar
        </button>
      )}

      {/* Registrar pago — solo contado (APROBADA y dias_credito = 0) */}
      {estado === 'APROBADA' && !esCredito && (
        <button onClick={() => setModalPago(true)} disabled={pendiente} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-100 transition disabled:opacity-50">
          <DollarSign className="w-3 h-3" />
          Registrar pago
        </button>
      )}

      {/* Pasar a alistamiento — credito (APROBADA y dias_credito > 0) */}
      {estado === 'APROBADA' && esCredito && (
        <button onClick={handleAlistamiento} disabled={pendiente} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-xs font-medium hover:bg-orange-100 transition disabled:opacity-50">
          <Package className="w-3 h-3" />
          Alistar
        </button>
      )}

      {/* Pasar a alistamiento — contado ya pagado */}
      {estado === 'PAGADA' && (
        <button onClick={handleAlistamiento} disabled={pendiente} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-xs font-medium hover:bg-orange-100 transition disabled:opacity-50">
          <Package className="w-3 h-3" />
          Alistar
        </button>
      )}

      {/* Cerrar venta / Facturar (EN_ALISTAMIENTO) */}
      {estado === 'EN_ALISTAMIENTO' && (
        <button onClick={() => setModalCerrar(true)} disabled={pendiente} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition disabled:opacity-50">
          <FileText className="w-3 h-3" />
          Facturar
        </button>
      )}

      {/* Estado visual */}
      {estado === 'FACTURADA' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-purple-600"><Truck className="w-3 h-3" /> Despachar</span>
      )}

      {resultado && !modalPago && !modalCerrar && (
        <span className={`text-xs ${resultado.ok ? 'text-green-600' : 'text-red-600'}`}>
          {resultado.ok ? '✓' : '✗'} {resultado.mensaje.slice(0, 35)}
        </span>
      )}

      {/* ===== MODAL REGISTRAR PAGO (contado) ===== */}
      {modalPago && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-semibold text-gray-800">Registrar pago del cliente</h3>
                <p className="text-xs text-gray-500 mt-0.5">{numero} · Contado · Total: ${total.toLocaleString('es-CO')}</p>
              </div>
              <button onClick={() => { setModalPago(false); setResultado(null); setSoportePdf(null) }} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form action={handleRegistrarPago} className="p-6 space-y-4">
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-sm text-emerald-800 font-medium">El cliente pago esta cotizacion de contado.</p>
                <p className="text-xs text-emerald-600 mt-1">Al registrar el pago, pasa a &quot;En alistamiento&quot; (comprar/preparar productos).</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de pago *</label>
                <input name="fecha_pago" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>

              {/* Monto recibido → calcula retenciones automaticamente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto recibido (lo que entro a Bold) *</label>
                <input value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} inputMode="numeric" placeholder={String(total)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                <p className="text-xs text-gray-400 mt-1">Total de la factura: ${total.toLocaleString('es-CO')}</p>
              </div>

              {/* Si hay diferencia = retenciones */}
              {hayRetencion && (
                <div className="bg-amber-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-amber-800">Te retuvieron: ${diferenciaRetenida.toLocaleString('es-CO')}</p>
                  </div>
                  <p className="text-xs text-amber-600">Selecciona que retenciones te aplicaron. La suma debe coincidir con ${diferenciaRetenida.toLocaleString('es-CO')}.</p>
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
                  <div className="pt-2 border-t border-amber-200">
                    <div className="flex justify-between text-xs">
                      <span className="text-amber-700">Suma retenciones:</span>
                      <span className={`font-bold ${!mostrarValidacion ? 'text-gray-400' : retencionCuadra ? 'text-green-600' : 'text-red-600'}`}>
                        ${totalRetencionesManuales.toLocaleString('es-CO')} {mostrarValidacion && (retencionCuadra ? '✓ Cuadra' : '✗ No cuadra')}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-amber-700">Diferencia esperada:</span>
                      <span className="text-amber-800 font-medium">${diferenciaRetenida.toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                </div>
              )}

              {montoRecibidoNum > 0 && !hayRetencion && montoRecibidoNum === total && (
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-green-700">✓ Pago completo. Sin retenciones.</p>
                </div>
              )}

              {/* Soporte de pago OBLIGATORIO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Soporte de pago (comprobante) *</label>
                <div onClick={() => fileRef.current?.click()} className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${soportePdf ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300'}`}>
                  {soportePdf ? (
                    <>
                      <FileCheck className="w-5 h-5 text-green-600" />
                      <div className="flex-1 min-w-0"><p className="text-sm text-green-700 font-medium truncate">{soportePdf.name}</p></div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSoportePdf(null) }} className="text-gray-400 hover:text-red-500 p-1"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <><Upload className="w-5 h-5 text-gray-400" /><div><p className="text-sm text-gray-600">Cargar soporte (obligatorio)</p><p className="text-xs text-gray-400">Captura de Bold, comprobante, etc.</p></div></>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setSoportePdf(e.target.files?.[0] ?? null)} className="hidden" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OC del cliente (opcional para contado)</label>
                <input name="oc_cliente" placeholder="Ej: OC-12345" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>

              {resultado && !resultado.ok && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-sm bg-red-50 text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5" /><span>{resultado.mensaje}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalPago(false); setResultado(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={pendiente || subiendo} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                  {(pendiente || subiendo) && <Loader2 className="w-4 h-4 animate-spin" />} Registrar pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL CERRAR VENTA / FACTURAR ===== */}
      {modalCerrar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-semibold text-gray-800">Facturar venta</h3>
                <p className="text-xs text-gray-500 mt-0.5">{numero} · {esCredito ? `Credito ${diasCredito}d` : 'Contado'}</p>
              </div>
              <button onClick={() => { setModalCerrar(false); setResultado(null) }} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form action={handleCerrarVenta} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero de factura DIAN *</label>
                <input name="numero_factura_dian" required placeholder="Ej: AE1" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PDF de la factura DIAN *</label>
                <div onClick={() => facturaRef.current?.click()} className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${facturaPdf ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300'}`}>
                  {facturaPdf ? (
                    <><FileCheck className="w-5 h-5 text-green-600" /><div className="flex-1 min-w-0"><p className="text-sm text-green-700 font-medium truncate">{facturaPdf.name}</p></div><button type="button" onClick={(e) => { e.stopPropagation(); setFacturaPdf(null) }} className="text-gray-400 hover:text-red-500 p-1"><X className="w-4 h-4" /></button></>
                  ) : (
                    <><Upload className="w-5 h-5 text-gray-400" /><div><p className="text-sm text-gray-600">Cargar factura DIAN</p></div></>
                  )}
                </div>
                <input ref={facturaRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFacturaPdf(e.target.files?.[0] ?? null)} className="hidden" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OC del cliente {esCredito && <span className="text-red-500">*</span>}</label>
                <input name="oc_cliente" required={esCredito} placeholder="Numero de OC" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PDF de la OC {esCredito && <span className="text-red-500">*</span>}</label>
                <div onClick={() => ocRef.current?.click()} className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${ocPdf ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300'}`}>
                  {ocPdf ? (
                    <><FileCheck className="w-5 h-5 text-green-600" /><div className="flex-1 min-w-0"><p className="text-sm text-green-700 font-medium truncate">{ocPdf.name}</p></div><button type="button" onClick={(e) => { e.stopPropagation(); setOcPdf(null) }} className="text-gray-400 hover:text-red-500 p-1"><X className="w-4 h-4" /></button></>
                  ) : (
                    <><Upload className="w-5 h-5 text-gray-400" /><div><p className="text-sm text-gray-600">{esCredito ? 'Cargar OC (obligatorio)' : 'Cargar OC (opcional)'}</p></div></>
                  )}
                </div>
                <input ref={ocRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setOcPdf(e.target.files?.[0] ?? null)} className="hidden" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea name="observaciones" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" placeholder="Notas adicionales..." />
              </div>

              {resultado && !resultado.ok && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-sm bg-red-50 text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5" /><span>{resultado.mensaje}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalCerrar(false); setResultado(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={pendiente || subiendo} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {(pendiente || subiendo) && <Loader2 className="w-4 h-4 animate-spin" />} Facturar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
