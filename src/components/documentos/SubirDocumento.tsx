'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'

interface Documento {
  id: string
  tipo_documento: string
  nombre_archivo: string
  url_archivo: string
  created_at: string
}

interface Props {
  entidadTipo: 'CLIENTE' | 'PROVEEDOR' | 'COTIZACION' | 'FACTURA_COMPRA' | 'FACTURA_VENTA' | 'PAGO'
  entidadId: string
  tiposPermitidos: { value: string; label: string }[]
  documentosExistentes: Documento[]
}

const TIPO_LABELS: Record<string, string> = {
  RUT: 'RUT',
  CAMARA_COMERCIO: 'Camara de Comercio',
  CERTIFICADO_BANCARIO: 'Certificado Bancario',
  ESTADOS_FINANCIEROS: 'Estados Financieros',
  ORDEN_COMPRA: 'Orden de Compra',
  FACTURA: 'Factura',
  SOPORTE_PAGO: 'Soporte de Pago',
  COTIZACION_PDF: 'Cotizacion PDF',
  OTRO: 'Otro',
}

export default function SubirDocumento({ entidadTipo, entidadId, tiposPermitidos, documentosExistentes }: Props) {
  const [subiendo, setSubiendo] = useState(false)
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [docs, setDocs] = useState<Documento[]>(documentosExistentes)
  const [tipoSeleccionado, setTipoSeleccionado] = useState(tiposPermitidos[0]?.value ?? 'OTRO')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setSubiendo(true)
    setResultado(null)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${entidadTipo.toLowerCase()}/${entidadId}/${Date.now()}.${ext}`

      // Subir a Storage
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(path, file, { contentType: file.type })

      if (uploadError) {
        setResultado({ ok: false, mensaje: uploadError.message })
        setSubiendo(false)
        return
      }

      // Obtener URL
      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path)

      // Registrar en la tabla
      const { data: doc, error: dbError } = await supabase.from('documentos').insert({
        entidad_tipo: entidadTipo,
        entidad_id: entidadId,
        tipo_documento: tipoSeleccionado,
        nombre_archivo: file.name,
        url_archivo: urlData.publicUrl ?? path,
        tamano_bytes: file.size,
        mime_type: file.type,
      }).select().single()

      if (dbError) {
        setResultado({ ok: false, mensaje: dbError.message })
      } else {
        setResultado({ ok: true, mensaje: 'Documento subido correctamente.' })
        if (doc) setDocs([doc, ...docs])
        setTimeout(() => setResultado(null), 3000)
      }
    } catch (err) {
      setResultado({ ok: false, mensaje: err instanceof Error ? err.message : 'Error al subir.' })
    }

    setSubiendo(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleEliminar(docId: string) {
    const supabase = createClient()
    await supabase.from('documentos').delete().eq('id', docId)
    setDocs(docs.filter((d) => d.id !== docId))
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <FileText className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-800">Documentos adjuntos</h3>
      </div>

      <div className="p-6 space-y-4">
        {/* Subir nuevo */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de documento</label>
            <select value={tipoSeleccionado} onChange={(e) => setTipoSeleccionado(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              {tiposPermitidos.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${subiendo ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'}`}>
            {subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {subiendo ? 'Subiendo...' : 'Subir archivo'}
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleSubir} disabled={subiendo} className="hidden" />
          </label>
        </div>

        {resultado && (
          <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {resultado.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {resultado.mensaje}
          </div>
        )}

        {/* Lista de documentos */}
        {docs.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Sin documentos adjuntos.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 truncate">{doc.nombre_archivo}</p>
                    <p className="text-xs text-gray-400">{TIPO_LABELS[doc.tipo_documento] ?? doc.tipo_documento}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={doc.url_archivo} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Ver</a>
                  <button onClick={() => handleEliminar(doc.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
