'use client'

import { useState, useTransition } from 'react'
import { crearCategoria, editarCategoria, eliminarCategoria } from './actions'
import { Plus, Pencil, Trash2, Loader2, CheckCircle2, AlertCircle, Tag } from 'lucide-react'

interface Categoria {
  id: string
  nombre: string
}

interface Props {
  categorias: Categoria[]
}

export default function GestionCategorias({ categorias }: Props) {
  const [nuevaNombre, setNuevaNombre] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editandoNombre, setEditandoNombre] = useState('')
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  function handleCrear() {
    if (!nuevaNombre.trim()) return
    const fd = new FormData()
    fd.set('nombre', nuevaNombre.trim())
    fd.set('orden', String(categorias.length + 1))
    setResultado(null)
    startTransition(async () => {
      const res = await crearCategoria(fd)
      setResultado(res)
      if (res.ok) { setNuevaNombre(''); setTimeout(() => setResultado(null), 2000) }
    })
  }

  function handleEditar(id: string) {
    if (!editandoNombre.trim()) return
    const fd = new FormData()
    fd.set('id', id)
    fd.set('nombre', editandoNombre.trim())
    setResultado(null)
    startTransition(async () => {
      const res = await editarCategoria(fd)
      setResultado(res)
      if (res.ok) { setEditandoId(null); setTimeout(() => setResultado(null), 2000) }
    })
  }

  function handleEliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar la categoria "${nombre}"?`)) return
    const fd = new FormData()
    fd.set('id', id)
    setResultado(null)
    startTransition(async () => {
      const res = await eliminarCategoria(fd)
      setResultado(res)
      setTimeout(() => setResultado(null), 3000)
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <Tag className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-800">Categorias de producto</h3>
        <span className="ml-auto text-xs text-gray-400">{categorias.length} categorias</span>
      </div>

      <div className="p-6 space-y-4">
        {/* Crear nueva */}
        <div className="flex items-center gap-2">
          <input
            value={nuevaNombre}
            onChange={(e) => setNuevaNombre(e.target.value)}
            placeholder="Nueva categoria (ej: Aseo industrial)"
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleCrear()}
          />
          <button onClick={handleCrear} disabled={pendiente || !nuevaNombre.trim()} className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            {pendiente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Agregar
          </button>
        </div>

        {resultado && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {resultado.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{resultado.mensaje}</span>
          </div>
        )}

        {/* Lista */}
        <div className="divide-y divide-gray-100">
          {categorias.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between py-3">
              {editandoId === cat.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={editandoNombre}
                    onChange={(e) => setEditandoNombre(e.target.value)}
                    className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-400 outline-none"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditar(cat.id); if (e.key === 'Escape') setEditandoId(null) }}
                  />
                  <button onClick={() => handleEditar(cat.id)} disabled={pendiente} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">Guardar</button>
                  <button onClick={() => setEditandoId(null)} className="px-3 py-2 border border-gray-200 text-gray-500 rounded-lg text-xs hover:bg-gray-50">Cancelar</button>
                </div>
              ) : (
                <>
                  <span className="text-sm text-gray-800">{cat.nombre}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditandoId(cat.id); setEditandoNombre(cat.nombre) }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleEliminar(cat.id, cat.nombre)} disabled={pendiente} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {categorias.length === 0 && (
            <p className="py-4 text-sm text-gray-400 text-center">Sin categorias. Agrega la primera arriba.</p>
          )}
        </div>
      </div>
    </div>
  )
}
