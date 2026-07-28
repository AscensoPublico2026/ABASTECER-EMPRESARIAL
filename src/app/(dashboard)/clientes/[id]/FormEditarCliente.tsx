'use client'

import { useState, useTransition } from 'react'
import { actualizarCliente } from './actions'
import { Loader2, CheckCircle2, AlertCircle, Save } from 'lucide-react'

interface Props {
  cliente: Record<string, unknown>
}

export default function FormEditarCliente({ cliente }: Props) {
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  function handleSubmit(formData: FormData) {
    formData.set('id', String(cliente.id))
    setResultado(null)
    startTransition(async () => {
      const res = await actualizarCliente(formData)
      setResultado(res)
      if (res.ok) setTimeout(() => setResultado(null), 3000)
    })
  }

  return (
    <form action={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Razon social *</label>
          <input name="razon_social" defaultValue={String(cliente.razon_social ?? '')} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
          <input name="nit" defaultValue={String(cliente.nit ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="900.123.456-7" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre comercial</label>
          <input name="nombre_comercial" defaultValue={String(cliente.nombre_comercial ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
          <input name="ciudad" defaultValue={String(cliente.ciudad ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
      </div>

      <h4 className="font-medium text-gray-800 pt-2">Contacto de compras</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input name="contacto_nombre" defaultValue={String(cliente.contacto_nombre ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
          <input name="contacto_telefono" defaultValue={String(cliente.contacto_telefono ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input name="contacto_email" defaultValue={String(cliente.contacto_email ?? '')} type="email" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
      </div>

      <h4 className="font-medium text-gray-800 pt-2">Contacto de pagos</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input name="contacto_pagos_nombre" defaultValue={String(cliente.contacto_pagos_nombre ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
          <input name="contacto_pagos_telefono" defaultValue={String(cliente.contacto_pagos_telefono ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input name="contacto_pagos_email" defaultValue={String(cliente.contacto_pagos_email ?? '')} type="email" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
      </div>

      <h4 className="font-medium text-gray-800 pt-2">Direccion y otros</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Direccion de entrega</label>
          <input name="direccion_entrega" defaultValue={String(cliente.direccion_entrega ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
          <input name="sector" defaultValue={String(cliente.sector ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea name="notas" defaultValue={String(cliente.notas ?? '')} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select name="estado" defaultValue={String(cliente.estado ?? 'ACTIVO')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
            <option value="PROSPECTO">Prospecto</option>
            <option value="ACTIVO">Activo</option>
            <option value="CREDITO_APROBADO">Credito aprobado</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
      </div>

      {resultado && (
        <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
          <span>{resultado.mensaje}</span>
        </div>
      )}

      <button type="submit" disabled={pendiente} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
        {pendiente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Guardar cambios
      </button>
    </form>
  )
}
