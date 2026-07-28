'use client'

import { useState, useTransition } from 'react'
import { crearCliente } from './actions'
import { CATEGORIAS_DISPONIBLES } from '@/types/proveedores'
import { PlusCircle, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

const SECTORES = [
  'Construccion',
  'Industria',
  'Ingenieria',
  'Logistica',
  'Transporte',
  'Salud',
  'Educacion',
  'Call center',
  'Seguridad',
  'Hoteleria',
  'Restaurantes',
  'Gobierno',
  'Servicios',
  'Comercio',
  'Otro',
]

const TAMANOS = [
  { value: 'MICRO', label: 'Micro (1-10 empleados)' },
  { value: 'PEQUENA', label: 'Pequena (11-50)' },
  { value: 'MEDIANA', label: 'Mediana (51-200)' },
  { value: 'GRANDE', label: 'Grande (200+)' },
]

export default function FormCliente() {
  const [abierto, setAbierto] = useState(false)
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([])

  function toggleCategoria(cat: string) {
    setCategoriasSeleccionadas((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  function handleSubmit(formData: FormData) {
    formData.set('categorias_interes', categoriasSeleccionadas.join(','))
    setResultado(null)
    startTransition(async () => {
      const res = await crearCliente(formData)
      setResultado(res)
      if (res.ok) {
        setTimeout(() => {
          setAbierto(false)
          setResultado(null)
          setCategoriasSeleccionadas([])
        }, 1200)
      }
    })
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
      >
        <PlusCircle className="w-4 h-4" /> Nuevo Cliente
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg my-8 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Registrar cliente</h3>
          <button
            onClick={() => { setAbierto(false); setResultado(null) }}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form action={handleSubmit} className="p-6 space-y-4">
          {/* Razon social */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razon social *</label>
            <input
              name="razon_social"
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              placeholder="Ej: Construcciones XYZ SAS"
            />
          </div>

          {/* NIT y Ciudad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
              <input
                name="nit"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                placeholder="900.123.456-7"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input
                name="ciudad"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                placeholder="Bogota"
              />
            </div>
          </div>

          {/* Contacto nombre y telefono */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
              <input
                name="contacto_nombre"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
              <input
                name="contacto_telefono"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                placeholder="311-xxx-xxxx"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              name="contacto_email"
              type="email"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              placeholder="compras@empresa.com"
            />
          </div>

          {/* Sector y Tamano */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
              <select
                name="sector"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              >
                <option value="">Seleccionar...</option>
                {SECTORES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tamano</label>
              <select
                name="tamano"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              >
                <option value="">Seleccionar...</option>
                {TAMANOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Categorias de interes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Categorias de interes</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS_DISPONIBLES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategoria(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    categoriasSeleccionadas.includes(cat)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Direccion entrega */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Direccion de entrega</label>
            <input
              name="direccion_entrega"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              placeholder="Cra 10 #20-30, Bodega 5"
            />
          </div>

          {/* Origen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origen (como lo encontramos)</label>
            <input
              name="origen"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              placeholder="Referido, Google, Puerta a puerta..."
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              name="notas"
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none"
              placeholder="Observaciones..."
            />
          </div>

          {/* Resultado */}
          {resultado && (
            <div
              className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
                resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {resultado.ok ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5" />
              )}
              <span>{resultado.mensaje}</span>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setAbierto(false); setResultado(null) }}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pendiente}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {pendiente && <Loader2 className="w-4 h-4 animate-spin" />} Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
