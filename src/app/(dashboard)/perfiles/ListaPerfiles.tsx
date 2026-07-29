'use client'

import { useState, useTransition } from 'react'
import { editarPerfil } from './actions'
import type { Perfil } from '@/lib/queries/perfil'
import { Crown, User, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

const MODULO_LABELS: Record<string, string> = {
  ventas: 'Ventas', facturacion: 'Facturacion', compras: 'Compras',
  inventario: 'Inventario', gastos: 'Gastos', clientes: 'Clientes',
  proveedores: 'Proveedores', financiero: 'Financiero', socios: 'Socios',
  indicadores: 'Indicadores', perfiles: 'Perfiles',
}

interface Props {
  perfiles: Perfil[]
}

export default function ListaPerfiles({ perfiles }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  function handleGuardar(formData: FormData) {
    setResultado(null)
    startTransition(async () => {
      const res = await editarPerfil(formData)
      setResultado(res)
      if (res.ok) { setEditando(null); setTimeout(() => setResultado(null), 2000) }
    })
  }

  if (perfiles.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
        <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="font-medium">Sin perfiles creados</p>
        <p className="text-sm mt-1">Crea el primer perfil maestro arriba.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Perfiles registrados</h3>
      </div>

      {resultado && (
        <div className={`mx-6 mt-4 flex items-center gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {resultado.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span>{resultado.mensaje}</span>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {perfiles.map((p) => (
          <div key={p.id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.rol === 'MAESTRO' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                  {p.rol === 'MAESTRO' ? <Crown className="w-5 h-5 text-purple-600" /> : <User className="w-5 h-5 text-gray-500" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800">{p.nombre}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.rol === 'MAESTRO' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{p.rol}</span>
                    {!p.activo && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Inactivo</span>}
                  </div>
                  <p className="text-xs text-gray-500">{p.email}{p.cargo ? ` · ${p.cargo}` : ''}</p>
                </div>
              </div>
              <button onClick={() => setEditando(editando === p.id ? null : p.id)} className="text-xs text-blue-600 hover:underline font-medium">
                {editando === p.id ? 'Cerrar' : 'Editar'}
              </button>
            </div>

            {/* Modulos asignados */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.rol === 'MAESTRO' ? (
                <span className="text-xs text-purple-600 italic">Acceso total a todos los modulos</span>
              ) : (
                p.modulos.map((m) => (
                  <span key={m} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{MODULO_LABELS[m] ?? m}</span>
                ))
              )}
            </div>

            {/* Vincular user_id */}
            {!p.user_id && (
              <p className="mt-2 text-xs text-amber-600">⚠️ Pendiente de vincular — se vincula automaticamente cuando inicia sesion con este email.</p>
            )}
            {p.user_id && (
              <p className="mt-2 text-xs text-green-600">✓ Vinculado a cuenta de autenticacion</p>
            )}

            {/* Form edicion inline */}
            {editando === p.id && (
              <form action={handleGuardar} className="mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
                <input type="hidden" name="id" value={p.id} />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                    <input name="nombre" defaultValue={p.nombre} className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cargo</label>
                    <input name="cargo" defaultValue={p.cargo ?? ''} className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Rol</label>
                    <select name="rol" defaultValue={p.rol} className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm">
                      <option value="MAESTRO">Maestro</option>
                      <option value="EMPLEADO">Empleado</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="hidden" name="activo" value={p.activo ? 'true' : 'false'} />
                    <input type="checkbox" defaultChecked={p.activo} onChange={(e) => { const input = e.target.closest('form')?.querySelector<HTMLInputElement>('input[name=activo]'); if (input) input.value = e.target.checked ? 'true' : 'false' }} className="rounded" />
                    Activo
                  </label>
                </div>
                <input type="hidden" name="modulos" value={JSON.stringify(p.modulos)} />
                <button type="submit" disabled={pendiente} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {pendiente && <Loader2 className="w-3 h-3 animate-spin" />} Guardar
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
