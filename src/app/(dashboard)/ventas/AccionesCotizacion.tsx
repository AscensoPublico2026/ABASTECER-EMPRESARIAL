'use client'

import { useState, useTransition, useRef } from 'react'
import { aprobarCotizacion, cerrarVenta } from './actions'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, FileText, Loader2, AlertCircle, X, Upload, FileCheck, Pencil } from 'lucide-react'

interface Props {
  cotizacionId: string
  estado: string
  numero: string
  diasCredito?: number
}

export default function AccionesCotizacion({ cotizacionId, estado, numero, diasCredito = 0 }: Props) {
  const [pendiente, startTransition] = useTransition()
  const [modalCerrar, setModalCerrar] = useState(false)
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  // File states
  const [facturaPdf, setFacturaPdf] = useState<File | null>(null)
  const [ocPdf, setOcPdf] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const facturaRef = useRef<HTMLInputElement>(null)
  const ocRef = useRef<HTMLInputElement>(null)

  const esCredito = diasCredito > 0

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

  async function handleCerrarVenta(formData: FormData) {
    // Validar PDF factura obligatorio
    if (!facturaPdf) {
      setResultado({ ok: false, mensaje: 'Debes cargar el PDF de la factura DIAN.' })
      return
    }

    // Validar PDF OC obligatorio para credito
    if (esCredito && !ocPdf) {
      setResultado({ ok: false, mensaje: 'Para ventas a credito, debes cargar el PDF de la Orden de Compra del cliente.' })
      return
    }

    formData.set('cotizacion_id', cotizacionId)
    setResultado(null)
    setSubiendo(true)

    try {
      const supabase = createClient()

      // 1. Subir PDF de factura
      const facturaExt = facturaPdf.name.split('.').pop()
      const facturaPath = `factura_venta/${cotizacionId}/${Date.now()}_factura.${facturaExt}`
      const { error: errFactura } = await supabase.storage
        .from('documentos')
        .upload(facturaPath, facturaPdf, { contentType: facturaPdf.type })

      if (errFactura) {
        setResultado({ ok: false, mensaje: `Error subiendo factura: ${errFactura.message}` })
        setSubiendo(false)
        return
      }

      const { data: urlFactura } = supabase.storage.from('documentos').getPublicUrl(facturaPath)
      formData.set('factura_pdf_url', urlFactura.publicUrl)
      formData.set('factura_pdf_nombre', facturaPdf.name)

      // 2. Subir PDF de OC (si hay)
      if (ocPdf) {
        const ocExt = ocPdf.name.split('.').pop()
        const ocPath = `factura_venta/${cotizacionId}/${Date.now()}_oc.${ocExt}`
        const { error: errOc } = await supabase.storage
          .from('documentos')
          .upload(ocPath, ocPdf, { contentType: ocPdf.type })

        if (errOc) {
          setResultado({ ok: false, mensaje: `Error subiendo OC: ${errOc.message}` })
          setSubiendo(false)
          return
        }

        const { data: urlOc } = supabase.storage.from('documentos').getPublicUrl(ocPath)
        formData.set('oc_pdf_url', urlOc.publicUrl)
        formData.set('oc_pdf_nombre', ocPdf.name)
      }

      // 3. Llamar server action
      startTransition(async () => {
        const res = await cerrarVenta(formData)
        setResultado(res)
        setSubiendo(false)
        if (res.ok) {
          setModalCerrar(false)
          setFacturaPdf(null)
          setOcPdf(null)
          setTimeout(() => setResultado(null), 3000)
        }
      })
    } catch (err) {
      setResultado({ ok: false, mensaje: err instanceof Error ? err.message : 'Error al subir archivos.' })
      setSubiendo(false)
    }
  }

  function resetModal() {
    setModalCerrar(false)
    setFacturaPdf(null)
    setOcPdf(null)
    setResultado(null)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Boton Editar (solo PENDIENTE o APROBADA) */}
      {(estado === 'PENDIENTE' || estado === 'APROBADA') && (
        <a
          href={`/ventas/${cotizacionId}/editar`}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100 transition"
        >
          <Pencil className="w-3 h-3" />
          Editar
        </a>
      )}

      {estado === 'PENDIENTE' && (
        <button
          onClick={handleAprobar}
          disabled={pendiente}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition disabled:opacity-50"
        >
          {pendiente ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Aprobar
        </button>
      )}

      {estado === 'APROBADA' && (
        <button
          onClick={() => setModalCerrar(true)}
          disabled={pendiente}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition disabled:opacity-50"
        >
          <FileText className="w-3 h-3" />
          Cerrar venta
        </button>
      )}

      {resultado && !modalCerrar && (
        <span className={`text-xs ${resultado.ok ? 'text-green-600' : 'text-red-600'}`}>
          {resultado.ok ? '✓' : '✗'} {resultado.mensaje.slice(0, 40)}
        </span>
      )}

      {/* Modal cerrar venta */}
      {modalCerrar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-semibold text-gray-800">Cerrar venta</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Cotizacion {numero} · {esCredito ? `Credito a ${diasCredito} dias` : 'Contado'}
                </p>
              </div>
              <button onClick={resetModal} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form action={handleCerrarVenta} className="p-6 space-y-5">

              {/* Numero factura DIAN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero de factura DIAN *</label>
                <input name="numero_factura_dian" required placeholder="Ej: SETP-1" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                <p className="text-xs text-gray-400 mt-1">El numero que te da el sistema de la DIAN al facturar</p>
              </div>

              {/* PDF Factura DIAN (OBLIGATORIO) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PDF de la factura DIAN *</label>
                <div
                  onClick={() => facturaRef.current?.click()}
                  className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${
                    facturaPdf
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  {facturaPdf ? (
                    <>
                      <FileCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-green-700 font-medium truncate">{facturaPdf.name}</p>
                        <p className="text-xs text-green-600">{(facturaPdf.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFacturaPdf(null); if (facturaRef.current) facturaRef.current.value = '' }}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Haz clic para cargar la factura</p>
                        <p className="text-xs text-gray-400">PDF, PNG o JPG (max 10MB)</p>
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={facturaRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setFacturaPdf(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>

              {/* Numero OC */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OC del cliente (numero) {esCredito && <span className="text-red-500">*</span>}
                </label>
                <input
                  name="oc_cliente"
                  required={esCredito}
                  placeholder={esCredito ? 'Ej: OC-12345 (obligatorio)' : 'Ej: OC-12345 (opcional para contado)'}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {esCredito && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">⚠️ Venta a credito: OC obligatoria (Decision #019)</p>
                )}
              </div>

              {/* PDF OC (obligatorio para credito) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PDF de la Orden de Compra {esCredito && <span className="text-red-500">*</span>}
                </label>
                <div
                  onClick={() => ocRef.current?.click()}
                  className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${
                    ocPdf
                      ? 'border-green-300 bg-green-50'
                      : esCredito
                        ? 'border-amber-200 hover:border-amber-300 bg-amber-50/30'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  {ocPdf ? (
                    <>
                      <FileCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-green-700 font-medium truncate">{ocPdf.name}</p>
                        <p className="text-xs text-green-600">{(ocPdf.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setOcPdf(null); if (ocRef.current) ocRef.current.value = '' }}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">
                          {esCredito ? 'Carga la OC del cliente (obligatorio)' : 'Carga la OC del cliente (opcional)'}
                        </p>
                        <p className="text-xs text-gray-400">PDF, PNG o JPG (max 10MB)</p>
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={ocRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setOcPdf(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>

              {/* Mensaje de error */}
              {resultado && !resultado.ok && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-sm bg-red-50 text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{resultado.mensaje}</span>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetModal} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pendiente || subiendo}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {(pendiente || subiendo) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {subiendo ? 'Subiendo archivos...' : 'Cerrar venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
