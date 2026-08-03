'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProductoCreado {
  id: string
  codigo: string
  nombre: string
  costo_promedio: number
  iva_porcentaje: number
  stock_actual: number
}

interface Props {
  onCreado: (producto: ProductoCreado) => void
}

export default function MiniFormProducto({ onCreado }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [iva, setIva] = useState('19')
  const [unidad, setUnidad] = useState('Unidad')
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [pendiente, startTransition] = useTransition()

  function abrir() {
    setNombre('')
    setIva('19')
    setUnidad('Unidad')
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
          .from('productos')
          .insert({
            codigo: '', // trigger genera PRD-XXXX
            nombre: nombre.trim().toUpperCase(),
            iva_porcentaje: Number(iva) || 19,
            unidad_medida: unidad || 'Unidad',
          })
          .select('id, codigo, nombre, costo_promedio, iva_porcentaje, stock_actual')
          .single()

        if (error) {
          setResultado({ ok: false, mensaje: error.message })
          return
        }

        setResultado({ ok: true, mensaje: `Producto "${data.codigo} - ${data.nombre}" creado.` })
        onCreado({
          id: data.id,
          codigo: data.codigo ?? '',
          nombre: data.nombre,
          costo_promedio: Number(data.costo_promedio ?? 0),
          iva_porcentaje: Number(data.iva_porcentaje ?? 19),
          stock_actual: Number(data.stock_actual ?? 0),
        })
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
        <Plus className="w-3.5 h-3.5" /> Crear producto
      </button>
    )
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-green-800">Crear producto rapido</span>
        <button type="button" onClick={() => setAbierto(false)} className="p-1 rounded hover:bg-green-100">
          <X className="w-4 h-4 text-green-400" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-2">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del producto *"
            className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm bg-white"
            autoFocus
          />
        </div>
        <div>
          <select
            value={iva}
            onChange={(e) => setIva(e.target.value)}
            className="w-full px-2 py-2 border border-green-200 rounded-lg text-sm bg-white"
          >
            <option value="19">IVA 19%</option>
            <option value="5">IVA 5%</option>
            <option value="0">IVA 0%</option>
          </select>
        </div>
        <div>
          <select
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
            className="w-full px-2 py-2 border border-green-200 rounded-lg text-sm bg-white"
          >
            <option value="Unidad">Unidad</option>
            <option value="Kg">Kg</option>
            <option value="Metro">Metro</option>
            <option value="Litro">Litro</option>
            <option value="Servicio">Servicio</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 items-center justify-between">
        <p className="text-xs text-green-600">
          Se genera el codigo PRD-XXXX automatico. Completa los datos en Catalogo despues.
        </p>
        <button
          type="button"
          onClick={guardar}
          disabled={pendiente}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex-shrink-0"
        >
          {pendiente ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Crear
        </button>
      </div>

      {resultado && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${resultado.ok ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {resultado.ok && <CheckCircle2 className="w-3.5 h-3.5" />}
          {resultado.mensaje}
        </div>
      )}
    </div>
  )
}
