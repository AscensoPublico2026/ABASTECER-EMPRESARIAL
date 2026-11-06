'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * El enlace del correo "cambiar contrasena" puede abrir una pagina de error
 * ("localhost ha rechazado la conexion") porque en Supabase quedo configurada
 * una direccion de pruebas. El enlace igual trae el codigo valido: aqui la
 * persona pega la direccion de esa pagina de error (o el enlace del correo)
 * y seguimos el cambio de contrasena en esta plataforma.
 */
export function extraerEnlace(texto: string): { code?: string; hash?: string; token?: string } {
  const t = texto.trim()
  const code = t.match(/[?&]code=([^&#\s]+)/)?.[1]
  if (code) return { code }
  const hash = t.match(/#(.*access_token=[^\s]+)/)?.[1]
  if (hash) return { hash }
  const token = t.match(/[?&]token=([^&#\s]+)/)?.[1]
  if (token && /type=recovery/.test(t)) return { token }
  return {}
}

export default function PegarEnlace() {
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function continuar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const { code, hash, token } = extraerEnlace(texto)
    if (code) { window.location.href = `/actualizar-clave?code=${encodeURIComponent(code)}`; return }
    if (hash) { window.location.href = `/actualizar-clave#${hash}`; return }
    if (token) {
      setCargando(true)
      const { error } = await createClient().auth.verifyOtp({ token_hash: token, type: 'recovery' })
      setCargando(false)
      if (error) { setError('Ese enlace ya venció. Pide un correo nuevo con "¿Olvidaste tu contraseña?".'); return }
      window.location.href = '/actualizar-clave'
      return
    }
    setError('No encontré el código en ese texto. Copia toda la dirección de la página de error (o el enlace del correo) y pégala aquí.')
  }

  return (
    <form onSubmit={continuar} className="mt-4 rounded-xl border border-[#E2E7EE] bg-[#F2F4F7] p-4 space-y-3 texto-normal">
      <p className="text-xs text-gray-700 leading-relaxed">
        <strong>¿El enlace del correo te abrió una página de error (&quot;localhost&quot;)?</strong> Copia la dirección que
        aparece arriba en esa página (toda la línea) y pégala aquí:
      </p>
      <input
        type="text"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="localhost:3000/?code=…"
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#16B23C] focus:border-transparent outline-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={cargando || !texto.trim()}
        className="w-full py-2.5 bg-[#16B23C] text-white text-sm font-semibold rounded-lg hover:bg-[#0C9632] transition disabled:opacity-50"
      >
        {cargando ? 'Revisando…' : 'Continuar para cambiar la contraseña'}
      </button>
    </form>
  )
}
