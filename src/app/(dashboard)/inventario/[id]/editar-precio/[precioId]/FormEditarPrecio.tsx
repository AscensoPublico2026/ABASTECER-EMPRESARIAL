'use client'

import { useState, useTransition } from 'react'
import { editarPrecioProveedor, eliminarPrecioProveedor } from '../../actions'
import { Loader2, CheckCircle2, AlertCircle, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  precioId: string
  productoId: string
  proveedorNombre: string
  datos: {
    precio: string
    iva_incluido: string
    tiempo_entrega: string
    referencia_proveedor: string
    fecha_cotizacion: string
    notas: string
  }
}

export default function FormEditarPrecio({ precioId, productoId, proveedorNombre, datos }: Props) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  function handleGuardar(formData: FormData) {
    formData.set('id', precioId)
    setResultado(null)
    startTransition(async () => {
      const res = await editarPrecioProveedor(formData)
      setResultado(res)
      if (res.ok) setTimeout(() => router.push(`/inventario/${productoId}`), 1000)
    })
  }

  function handleEliminar() {
    if (!confirm('¿Eliminar este precio? No se puede deshacer.')) return
    const fd = new FormData()
    fd.set('id', precioId)
    fd.set('producto_id', productoId)
    startTransition(async () => {
      const res = await eliminarPrecioProveedor(fd)
      if (res.ok) router.push(`/inventario/${productoId}`)
      else setResultado(res)
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Proveedor: {proveedorNombre}</h3>
        </div>
        <button onClick={handleEliminar} disabled={pendiente} className="flex items-center gap-1 px-3 py-1.5 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50">
          <Trash2 className="w-3.5 h-3.5" /> Eliminar
        </button>
      </div>
      <form action={handleGuardar} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
            <input name="precio" defaultValue={datos.precio} inputMode="numeric" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IVA</label>
            <select name="iva_incluido" defaultValue={datos.iva_incluido} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
              <option value="false">+ IVA</option>
              <option value="true">IVA incluido</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo de entrega</label>
            <input name="tiempo_entrega" defaultValue={datos.tiempo_entrega} placeholder="Ej: 2 dias" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha cotizacion</label>
            <input name="fecha_cotizacion" type="date" defaultValue={datos.fecha_cotizacion} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Referencia proveedor</label>
          <input name="referencia_proveedor" defaultValue={datos.referencia_proveedor} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
          <textarea name="notas" rows={2} defaultValue={datos.notas} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" />
        </div>

        {resultado && (
          <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
            <span>{resultado.mensaje}</span>
          </div>
        )}

        <button type="submit" disabled={pendiente} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {pendiente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar cambios
        </button>
      </form>
    </div>
  )
}
