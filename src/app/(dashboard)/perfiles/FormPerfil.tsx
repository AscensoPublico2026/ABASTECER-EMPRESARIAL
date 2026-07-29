'use client'

import { useState, useTransition } from 'react'
import { crearPerfil } from './actions'
import { PlusCircle, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

const MODULOS = [
  { value: 'ventas', label: 'Ventas/Cotizaciones' },
  { value: 'facturacion', label: 'Facturacion' },
  { value: 'compras', label: 'Compras' },
  { value: 'inventario', label: 'Inventario/Catalogo' },
  { value: 'gastos', label: 'Gastos' },
  { value: 'clientes', label: 'Clientes' },
  { value: 'proveedores', label: 'Proveedores' },
  { value: 'financiero', label: 'Centro Financiero' },
  { value: 'socios', label: 'Socios & Capital' },
  { value: 'indicadores', label: 'Indicadores' },
  { value: 'perfiles', label: 'Gestion de Perfiles' },
]

const PERFILES_PREDETERMINADOS = [
  { nombre: 'Ventas', modulos: ['ventas', 'facturacion', 'clientes', 'inventario'] },
  { nombre: 'Compras', modulos: ['compras', 'proveedores', 'inventario', 'gastos'] },
  { nombre: 'Almacen', modulos: ['inventario', 'compras'] },
  { nombre: 'Administrativo', modulos: ['ventas', 'facturacion', 'compras', 'gastos', 'clientes', 'proveedores', 'financiero'] },
]

export default function FormPerfil() {
  const [abierto, setAbierto] = useState(false)
  const [modulosSeleccionados, setModulosSeleccionados] = useState<string[]>([])
  const [rol, setRol] = useState('EMPLEADO')
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  function toggleModulo(m: string) {
    setModulosSeleccionados((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m])
  }

  function aplicarPredeterminado(modulos: string[]) {
    setModulosSeleccionados(modulos)
  }

  function handleSubmit(formData: FormData) {
    formData.set('modulos', JSON.stringify(modulosSeleccionados))
    formData.set('rol', rol)
    setResultado(null)
    startTransition(async () => {
      const res = await crearPerfil(formData)
      setResultado(res)
      if (res.ok) {
        setTimeout(() => { setAbierto(false); setResultado(null); setModulosSeleccionados([]) }, 1500)
      }
    })
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
        <PlusCircle className="w-4 h-4" /> Crear nuevo perfil
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Crear perfil</h3>
        <button onClick={() => { setAbierto(false); setResultado(null) }} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
      </div>

      <form action={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
            <input name="nombre" required placeholder="Ej: Juan Jose Perez" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input name="email" type="email" required placeholder="juan@abastecer.com" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            <p className="text-xs text-gray-400 mt-1">Debe coincidir con el email de Supabase Auth</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select value={rol} onChange={(e) => setRol(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
              <option value="MAESTRO">Maestro (ve todo)</option>
              <option value="EMPLEADO">Empleado (modulos asignados)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
            <input name="cargo" placeholder="Ej: Asesor comercial" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        {/* Modulos */}
        {rol === 'EMPLEADO' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modulos asignados</label>

            {/* Predeterminados */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs text-gray-500">Rapidos:</span>
              {PERFILES_PREDETERMINADOS.map((p) => (
                <button key={p.nombre} type="button" onClick={() => aplicarPredeterminado(p.modulos)} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-blue-50 hover:text-blue-600 transition">
                  {p.nombre}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {MODULOS.map((m) => (
                <label key={m.value} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition text-sm ${modulosSeleccionados.includes(m.value) ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="checkbox" checked={modulosSeleccionados.includes(m.value)} onChange={() => toggleModulo(m.value)} className="rounded border-gray-300 text-blue-600" />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {rol === 'MAESTRO' && (
          <div className="bg-purple-50 rounded-xl p-3 text-sm text-purple-700">
            Los perfiles Maestro tienen acceso a TODOS los modulos automaticamente.
          </div>
        )}

        {resultado && (
          <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
            <span>{resultado.mensaje}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => { setAbierto(false); setResultado(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={pendiente} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {pendiente && <Loader2 className="w-4 h-4 animate-spin" />} Crear perfil
          </button>
        </div>
      </form>
    </div>
  )
}
