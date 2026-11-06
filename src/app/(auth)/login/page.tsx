'use client'

import { useEffect, useState } from 'react'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { esCorreoAutorizado, CORREOS_AUTORIZADOS } from '@/lib/auth/acceso'

// Solo inicio de sesion: no existe registro de cuentas nuevas.
// Unicamente el correo autorizado (lib/auth/acceso.ts) puede entrar.

const MENSAJE_NO_AUTORIZADO = 'Este correo no tiene acceso a la plataforma.'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const router = useRouter()

  // "Olvide mi contrasena": envia el correo para cambiarla. Solo al correo autorizado.
  const recuperar = async () => {
    setError(''); setAviso('')
    const correo = esCorreoAutorizado(email) ? email.trim().toLowerCase() : CORREOS_AUTORIZADOS[0]
    setEnviando(true)
    const { error } = await createClient().auth.resetPasswordForEmail(correo, {
      redirectTo: `${window.location.origin}/actualizar-clave`,
    })
    setEnviando(false)
    if (error) {
      setError(error.message.toLowerCase().includes('rate') ? 'Ya se envió un correo hace poco. Espera unos minutos y revisa tu bandeja (y la carpeta de spam).' : error.message)
      return
    }
    setAviso(`Te enviamos un correo a ${correo}. Ábrelo en este mismo navegador y da clic en el enlace para poner la contraseña nueva. Revisa también la carpeta de spam.`)
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'no-autorizado') {
      setError(MENSAJE_NO_AUTORIZADO)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!esCorreoAutorizado(email)) {
      setError(MENSAJE_NO_AUTORIZADO)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) {
      setError(
        error.message.toLowerCase().includes('invalid')
          ? 'Correo o contraseña incorrectos.'
          : error.message
      )
      setLoading(false)
      return
    }
    if (!esCorreoAutorizado(data.user?.email)) {
      await supabase.auth.signOut()
      setError(MENSAJE_NO_AUTORIZADO)
      setLoading(false)
      return
    }

    router.push('/panel')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D1B2A] via-[#132B43] to-[#0D1B2A] px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex h-1.5">
            <div className="flex-[6] bg-[#0D1B2A]" />
            <div className="flex-[2] bg-[#16B23C]" />
            <div className="flex-[1] bg-[#F2B705]" />
          </div>
          <div className="p-8">
            <div className="flex flex-col items-center mb-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icono.png" alt="Abastecer Empresarial" className="h-16 w-auto mb-4" />
              <h1 className="text-2xl font-bold text-[#0D1B2A]">ABASTECER EMPRESARIAL</h1>
              <p className="text-sm text-[#636B73] mt-1">Plataforma de gestión</p>
            </div>

            <h2 className="text-lg font-semibold text-center text-gray-700 mb-6">Iniciar sesión</h2>

            {aviso && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                {aviso}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            {/* texto-normal: aqui no se fuerzan MAYUSCULAS (la contrasena se ve tal cual se escribe) */}
            <form onSubmit={handleSubmit} className="space-y-4 texto-normal">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#16B23C] focus:border-transparent outline-none"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contraseña"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#16B23C] focus:border-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#0D1B2A] text-white font-semibold rounded-xl hover:bg-[#132B43] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={recuperar}
                disabled={enviando}
                className="text-sm font-medium text-[#0D1B2A] hover:text-[#16B23C] underline-offset-2 hover:underline disabled:opacity-50"
              >
                {enviando ? 'Enviando correo…' : '¿Olvidaste tu contraseña?'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
