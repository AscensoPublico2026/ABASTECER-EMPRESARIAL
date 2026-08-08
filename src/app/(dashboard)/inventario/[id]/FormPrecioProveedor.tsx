'use client'

import { useState, useTransition } from 'react'
import { agregarPrecioProveedor, crearProveedorRapido } from './actions'
import { PlusCircle, X, Loader2, CheckCircle2, AlertCircle, Plus } from 'lucide-react'

interface Props {
  productoId: string
  proveedores: { id: string; razon_social: string }[]
}

export default function FormPrecioProveedor({ productoId, proveedores }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [listaProveedores, setListaProveedores] = useState(proveedores)
  const [nuevoProveedor, setNuevoProveedor] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoContacto, setNuevoContacto] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState('')
  const [tipoPrecio, setTipoPrecio] = useState<'COSTO' | 'MERCADO'>('COSTO')

  async function handleCrearProveedor() {
    if (!nuevoNombre.trim()) return
    const fd = new FormData()
    fd.set('nombre', nuevoNombre.trim())
    fd.set('contacto', nuevoContacto.trim())
    fd.set('telefono', nuevoTelefono.trim())
    startTransition(async () => {
      const res = await crearProveedorRapido(fd)
      if (res.ok && res.id) {
        setListaProveedores([...listaProveedores, { id: res.id, razon_social: nuevoNombre.trim() }])
        setProveedorSeleccionado(res.id)
        setNuevoProveedor(false)
        setNuevoNombre('')
        setNuevoContacto('')
        setNuevoTelefono('')
      } else {
        setResultado({ ok: false, mensaje: res.mensaje })
      }
    })
  }

  function handleSubmit(formData: FormData) {
    formData.set('producto_id', productoId)
    formData.set('proveedor_id', proveedorSeleccionado)
    formData.set('tipo', tipoPrecio)
    setResultado(null)
    startTransition(async () => {
      const res = await agregarPrecioProveedor(formData)
      setResultado(res)
      if (res.ok) setTimeout(() => { setAbierto(false); setResultado(null); setProveedorSeleccionado('') }, 1200)
    })
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
        <PlusCircle className="w-4 h-4" /> Agregar precio
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Agregar precio de proveedor</h3>
          <button onClick={() => { setAbierto(false); setResultado(null) }} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form action={handleSubmit} className="p-6 space-y-4">
          {/* Proveedor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Proveedor *</label>
              <button type="button" onClick={() => setNuevoProveedor(!nuevoProveedor)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> {nuevoProveedor ? 'Seleccionar existente' : 'Crear nuevo'}
              </button>
            </div>
            {nuevoProveedor ? (
              <div className="space-y-2 p-3 bg-blue-50 rounded-xl">
                <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre del proveedor/negocio *" className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={nuevoContacto} onChange={(e) => setNuevoContacto(e.target.value)} placeholder="Nombre vendedor" className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm" />
                  <input value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} placeholder="Telefono" className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm" />
                </div>
                <button type="button" onClick={handleCrearProveedor} disabled={!nuevoNombre.trim() || pendiente} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                  {pendiente ? 'Creando...' : 'Crear y seleccionar'}
                </button>
              </div>
            ) : listaProveedores.length === 0 ? (
              /* Si no hay ninguno, decirlo con palabras en vez de mostrar un
                 desplegable vacio. Antes esto pasaba por un bug de la
                 consulta y era imposible saber si el problema era que no
                 habia proveedores o que el sistema no los estaba trayendo. */
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <p className="text-xs text-amber-900">
                  Todavia no tienes proveedores activos. Usa
                  <strong> Crear nuevo</strong> aqui arriba para agregar el primero.
                </p>
              </div>
            ) : (
              <select value={proveedorSeleccionado} onChange={(e) => setProveedorSeleccionado(e.target.value)} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                <option value="">Seleccionar proveedor ({listaProveedores.length} disponible{listaProveedores.length !== 1 ? 's' : ''})</option>
                {listaProveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
              </select>
            )}
          </div>

          {/* QUE CLASE DE PRECIO ES.
              Los dos hacen fuerzas contrarias y hay que guardarlos aparte:
              el de costo define el piso (mi margen) y el de mercado define
              el techo (si soy competitivo). Un mismo tercero puede darte
              los dos, preguntando desde numeros distintos. */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Que precio es este *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoPrecio('COSTO')}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 text-left transition ${
                  tipoPrecio === 'COSTO'
                    ? 'border-green-400 bg-green-50 text-green-800'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                Me lo venden a mi
                <span className="block text-xs font-normal opacity-80 mt-0.5">
                  Precio de distribuidor. Es mi costo.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTipoPrecio('MERCADO')}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 text-left transition ${
                  tipoPrecio === 'MERCADO'
                    ? 'border-purple-400 bg-purple-50 text-purple-800'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                Asi lo vende al cliente
                <span className="block text-xs font-normal opacity-80 mt-0.5">
                  Precio de la competencia. Es mi techo.
                </span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              {tipoPrecio === 'COSTO'
                ? 'Se usa para calcular tu margen y elegir a quien comprarle.'
                : 'Se usa para saber si tu precio de venta es competitivo. No cuenta como costo.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
              <input name="precio" required inputMode="numeric" placeholder="627000" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IVA</label>
              <select name="iva_incluido" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                <option value="false">+ IVA (no incluido)</option>
                <option value="true">IVA incluido</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo de entrega</label>
              <input name="tiempo_entrega" placeholder="Ej: 2 dias, Inmediato" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha cotizacion</label>
              <input name="fecha_cotizacion" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia del proveedor</label>
            <input name="referencia_proveedor" placeholder="Ej: EXT-ABC-10LB (como lo llama el proveedor)" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea name="notas" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" placeholder="Ej: Precio por unidad, minimo 5 unidades, pago anticipado..." />
          </div>

          {resultado && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
              <span>{resultado.mensaje}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setAbierto(false); setResultado(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={pendiente || !proveedorSeleccionado} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {pendiente && <Loader2 className="w-4 h-4 animate-spin" />} Agregar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
