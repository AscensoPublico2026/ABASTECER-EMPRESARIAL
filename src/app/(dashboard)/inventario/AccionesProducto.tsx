'use client'

import { useState, useTransition, useRef } from 'react'
import { editarProducto, eliminarProducto } from './actions'
import { createClient } from '@/lib/supabase/client'
import { Pencil, Trash2, X, Loader2, CheckCircle2, AlertCircle, Save, Upload, FileCheck } from 'lucide-react'

interface Producto {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  categoria_id: string | null
  unidad_medida: string
  iva_porcentaje: number
  margen_minimo_pct: number
  precio_lista: number
  stock_minimo: number
  notas: string | null
}

interface Categoria {
  id: string
  nombre: string
}

interface Props {
  producto: Producto
  categorias: Categoria[]
}

export default function AccionesProducto({ producto, categorias }: Props) {
  const [editando, setEditando] = useState(false)
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [fichaPdf, setFichaPdf] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleEditar(formData: FormData) {
    formData.set('id', producto.id)
    setResultado(null)
    setSubiendo(true)

    try {
      // Subir ficha tecnica si se selecciono
      if (fichaPdf) {
        const supabase = createClient()
        const ext = fichaPdf.name.split('.').pop()
        const path = `productos/${producto.id}/${Date.now()}_ficha.${ext}`
        const { error: errUpload } = await supabase.storage
          .from('documentos')
          .upload(path, fichaPdf, { contentType: fichaPdf.type })

        if (errUpload) {
          setResultado({ ok: false, mensaje: `Error subiendo ficha: ${errUpload.message}` })
          setSubiendo(false)
          return
        }

        const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path)

        // Registrar en tabla documentos
        await supabase.from('documentos').insert({
          entidad_tipo: 'COTIZACION', // usamos tipo generico para productos
          entidad_id: producto.id,
          tipo_documento: 'OTRO',
          nombre_archivo: fichaPdf.name,
          url_archivo: urlData.publicUrl,
          notas: 'Ficha tecnica del producto',
        })
      }

      startTransition(async () => {
        const res = await editarProducto(formData)
        setResultado(res)
        setSubiendo(false)
        if (res.ok) {
          setFichaPdf(null)
          setTimeout(() => { setEditando(false); setResultado(null) }, 1000)
        }
      })
    } catch (err) {
      setResultado({ ok: false, mensaje: err instanceof Error ? err.message : 'Error.' })
      setSubiendo(false)
    }
  }

  function handleEliminar() {
    if (!confirm(`¿Eliminar "${producto.nombre}"? Se marcara como inactivo.`)) return
    const fd = new FormData()
    fd.set('id', producto.id)
    startTransition(async () => {
      const res = await eliminarProducto(fd)
      setResultado(res)
    })
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button onClick={() => setEditando(true)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleEliminar} disabled={pendiente} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition disabled:opacity-50">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modal editar */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-semibold text-gray-800">Editar producto</h3>
                <p className="text-xs text-gray-500">{producto.codigo}</p>
              </div>
              <button onClick={() => { setEditando(false); setResultado(null) }} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form action={handleEditar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input name="nombre" defaultValue={producto.nombre} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
                <input name="descripcion" defaultValue={producto.descripcion ?? ''} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select name="categoria_id" defaultValue={producto.categoria_id ?? ''} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                    <option value="">Sin categoria</option>
                    {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                  <select name="unidad_medida" defaultValue={producto.unidad_medida} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                    <option value="Unidad">Unidad</option>
                    <option value="Par">Par</option>
                    <option value="Caja">Caja</option>
                    <option value="Metro">Metro</option>
                    <option value="Kilo">Kilo</option>
                    <option value="Litro">Litro</option>
                    <option value="Servicio">Servicio</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IVA %</label>
                  <select name="iva_porcentaje" defaultValue={producto.iva_porcentaje} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                    <option value="19">19%</option>
                    <option value="5">5%</option>
                    <option value="0">0%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Margen %</label>
                  <input name="margen_minimo_pct" type="number" defaultValue={producto.margen_minimo_pct} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock min</label>
                  <input name="stock_minimo" type="number" defaultValue={producto.stock_minimo} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio de lista</label>
                <input name="precio_lista" defaultValue={producto.precio_lista > 0 ? producto.precio_lista : ''} inputMode="numeric" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="Opcional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ficha tecnica (PDF)</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${
                    fichaPdf ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  {fichaPdf ? (
                    <>
                      <FileCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-green-700 font-medium truncate">{fichaPdf.name}</p>
                        <p className="text-xs text-green-600">{(fichaPdf.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setFichaPdf(null); if (fileRef.current) fileRef.current.value = '' }} className="text-gray-400 hover:text-red-500 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Cargar ficha tecnica</p>
                        <p className="text-xs text-gray-400">PDF, PNG o JPG</p>
                      </div>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFichaPdf(e.target.files?.[0] ?? null)} className="hidden" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea name="notas" rows={2} defaultValue={producto.notas ?? ''} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" />
              </div>

              {resultado && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                  <span>{resultado.mensaje}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setEditando(false); setResultado(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={pendiente || subiendo} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {(pendiente || subiendo) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {subiendo ? 'Subiendo...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
