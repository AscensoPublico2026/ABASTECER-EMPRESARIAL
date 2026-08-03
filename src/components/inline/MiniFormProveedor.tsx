'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProveedorCreado {
  id: string
  razon_social: string
}

interface Props {
  onCreado: (proveedor: ProveedorCreado) => void
}

export default function MiniFormProveedor({ onCreado }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [nit, setNit] = useState('')
  const [telefono, setTelefono] = useState('')
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [pendiente, startTransition] = useTransition()

  function abrir() {
    setNombre('')
    setNit('')
    setTelefono('')
    setResultado(null)
    setAbierto(true)
  }

  function guardar() {
    if (!nombre.trim()) {
      setResultado({ ok: false, mensaje: 'El nombre es obligatorio.' })
      return
    }

    startTransition(async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('proveedores')
          .insert({
            razon_social: nombre.trim().toUpperCase(),
            nit: nit.trim().toUpperCase() || null,
            contacto_telefono: telefono.trim() || null,
            estado: 'ACTIVO',
          })
          .select('id, razon_social')
          .single()

        if (error) {
          setResultado({ ok: false, mensaje: error.message })
          return
        }

        setResultado({ ok: true, mensaje: `Proveedor "${data.razon_social}" creado.` })
        onCreado({ id: data.id, razon_social: data.razon_social })
        setTimeout(() => setAbierto(false), 1200)
      } catch (e) {
        setResultado({ ok: false, mensaje: e instanceof Error ? e.message : 'Error.' })
      }
    })
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={abrir}
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
      >
        <Plus className="w-3.5 h-3.5" /> Crear proveedor
      </button>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-blue-800">Crear proveedor rapido</span>
        <button type="button" onClick={() => setAbierto(false)} className="p-1 rounded hover:bg-blue-100">
          <X className="w-4 h-4 text-blue-400" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Razon social / Nombre *"
            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
            autoFocus
          />
        </div>
        <div>
          <input
            type="text"
            value={nit}
            onChange={(e) => setNit(e.target.value)}
            placeholder="NIT / CC"
            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
          />
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Telefono (opcional)"
          className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
        />
        <button
          type="button"
          onClick={guardar}
          disabled={pendiente}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {pendiente ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Crear
        </button>
      </div>

      {resultado && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {resultado.ok && <CheckCircle2 className="w-3.5 h-3.5" />}
          {resultado.mensaje}
        </div>
      )}

      <p className="text-xs text-blue-600">
        Solo necesitas el nombre. Despues puedes completar los demas datos en Proveedores.
      </p>
    </div>
  )
}
