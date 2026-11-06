'use client'

import { useEffect, useState } from 'react'
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { esCorreoAutorizado } from '@/lib/auth/acceso'
import PegarEnlace from '@/components/auth/PegarEnlace'

// Pagina a la que llega el enlace del correo "Cambiar contrasena".
// Valida el enlace, pide la contrasena nueva dos veces y la guarda.

type Estado = 'validando' | 'listo' | 'invalido' | 'guardado'

/** Traduce el error de Supabase a algo que el usuario entienda. */
function explicar(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('verifier') || m.includes('flow state'))
    return 'El correo se pidió desde otro navegador o pestaña privada. Pide un correo nuevo y pega la dirección en ESTE mismo navegador. (' + msg + ')'
  if (m.includes('expired') || m.includes('invalid'))
    return 'Ese enlace ya se usó o venció. Usa solo el ÚLTIMO correo que llegó. (' + msg + ')'
  return msg
}

export default function ActualizarClavePage() {
  const [estado, setEstado] = useState<Estado>('validando')
  const [detalle, setDetalle] = useState('')
  const [clave, setClave] = useState('')
  const [clave2, setClave2] = useState('')
  const [ver, setVer] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let activo = true
    async function validar() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!activo) return
        if (error) { setDetalle(explicar(error.message)); setEstado('invalido'); return }
        window.history.replaceState(null, '', '/actualizar-clave')
      }
      // Enlace con #access_token (flujo antiguo): el cliente lo lee solo.
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession()
        if (!activo) return
        if (data.session) {
          if (!esCorreoAutorizado(data.session.user.email)) setDetalle(`El enlace es de otro correo (${data.session.user.email}), que no tiene acceso.`)
          setEstado(esCorreoAutorizado(data.session.user.email) ? 'listo' : 'invalido')
          return
        }
        await new Promise((r) => setTimeout(r, 300))
      }
      const hashErr = new URLSearchParams(window.location.hash.slice(1)).get('error_description')
      setDetalle(hashErr ? explicar(hashErr) : 'No llegó ningún código en la dirección.')
      setEstado('invalido')
    }
    validar()
    return () => { activo = false }
  }, [])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (clave.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (clave !== clave2) { setError('Las dos contraseñas no son iguales.'); return }
    setGuardando(true)
    const { error } = await createClient().auth.updateUser({ password: clave })
    setGuardando(false)
    if (error) {
      setError(error.message.toLowerCase().includes('different') ? 'La contraseña nueva debe ser distinta a la anterior.' : error.message)
      return
    }
    setEstado('guardado')
    setTimeout(() => { router.push('/panel'); router.refresh() }, 1500)
  }

  const campo = (valor: string, cambiar: (v: string) => void, placeholder: string) => (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type={ver ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete="new-password"
        value={valor}
        onChange={(e) => cambiar(e.target.value)}
        required
        className="w-full pl-11 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#16B23C] focus:border-transparent outline-none"
      />
      <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar' : 'Mostrar'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {ver ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D1B2A] via-[#132B43] to-[#0D1B2A] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden texto-normal">
        <div className="flex h-1.5">
          <div className="flex-[6] bg-[#0D1B2A]" /><div className="flex-[2] bg-[#16B23C]" /><div className="flex-[1] bg-[#F2B705]" />
        </div>
        <div className="p-8">
          <div className="flex flex-col items-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icono.png" alt="Abastecer Empresarial" className="h-14 w-auto mb-3" />
            <h1 className="text-xl font-bold text-[#0D1B2A]">Cambiar contraseña</h1>
          </div>

          {estado === 'validando' && <p className="text-center text-sm text-gray-500">Revisando el enlace…</p>}

          {estado === 'invalido' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-red-600">El enlace no es válido o ya venció (dura 1 hora). Pide uno nuevo desde la pantalla de ingreso con &quot;¿Olvidaste tu contraseña?&quot;.</p>
              {detalle && <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-2 text-left break-words">Detalle: {detalle}</p>}
              <a href="/login" className="inline-block text-sm font-semibold text-[#0D1B2A] underline">Volver a ingresar</a>
              <div className="text-left"><PegarEnlace /></div>
            </div>
          )}

          {estado === 'guardado' && (
            <div className="flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="w-10 h-10 text-[#16B23C]" />
              <p className="text-sm text-gray-700">Contraseña actualizada. Entrando a la plataforma…</p>
            </div>
          )}

          {estado === 'listo' && (
            <form onSubmit={guardar} className="space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}
              {campo(clave, setClave, 'Contraseña nueva')}
              {campo(clave2, setClave2, 'Repite la contraseña nueva')}
              <button type="submit" disabled={guardando}
                className="w-full py-3 bg-[#0D1B2A] text-white font-semibold rounded-xl hover:bg-[#132B43] transition disabled:opacity-50">
                {guardando ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
