'use client'

import { useState, useTransition } from 'react'
import { actualizarProveedor } from './actions'
import { Loader2, CheckCircle2, AlertCircle, Save } from 'lucide-react'

interface Props {
  proveedor: Record<string, unknown>
}

export default function FormEditarProveedor({ proveedor }: Props) {
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  function handleSubmit(formData: FormData) {
    formData.set('id', String(proveedor.id))
    setResultado(null)
    startTransition(async () => {
      const res = await actualizarProveedor(formData)
      setResultado(res)
      if (res.ok) setTimeout(() => setResultado(null), 3000)
    })
  }

  return (
    <form action={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Razon social *</label>
          <input name="razon_social" defaultValue={String(proveedor.razon_social ?? '')} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
          <input name="nit" defaultValue={String(proveedor.nit ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="900.123.456-7" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre comercial</label>
          <input name="nombre_comercial" defaultValue={String(proveedor.nombre_comercial ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
          <input name="ciudad" defaultValue={String(proveedor.ciudad ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Direccion</label>
          <input name="direccion" defaultValue={String(proveedor.direccion ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
      </div>

      <h4 className="font-medium text-gray-800 pt-2">Contacto</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input name="contacto_nombre" defaultValue={String(proveedor.contacto_nombre ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
          <input name="contacto_telefono" defaultValue={String(proveedor.contacto_telefono ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input name="contacto_email" defaultValue={String(proveedor.contacto_email ?? '')} type="email" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
          <input name="contacto_cargo" defaultValue={String(proveedor.contacto_cargo ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
      </div>

      <h4 className="font-medium text-gray-800 pt-2">Condiciones y otros</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones de pago</label>
          <select name="condiciones_pago" defaultValue={String(proveedor.condiciones_pago ?? 'Contado')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
            <option value="Contado">Contado</option>
            <option value="Credito 15 dias">Credito 15 dias</option>
            <option value="Credito 30 dias">Credito 30 dias</option>
            <option value="Credito 45 dias">Credito 45 dias</option>
            <option value="Credito 60 dias">Credito 60 dias</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo de entrega</label>
          <input name="tiempo_entrega" defaultValue={String(proveedor.tiempo_entrega ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="3 dias habiles" />
        </div>
      </div>

      <h4 className="font-medium text-gray-800 pt-2">Datos bancarios del proveedor</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
          <input name="banco" defaultValue={String(proveedor.banco ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="Bancolombia" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cuenta</label>
          <select name="tipo_cuenta" defaultValue={String(proveedor.tipo_cuenta ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
            <option value="">Sin definir</option>
            <option value="Ahorros">Ahorros</option>
            <option value="Corriente">Corriente</option>
            <option value="Deposito">Deposito</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Numero de cuenta</label>
          <input name="numero_cuenta" defaultValue={String(proveedor.numero_cuenta ?? '')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="123-456-789" />
        </div>
      </div>

      <h4 className="font-medium text-gray-800 pt-2">Otros</h4>

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
