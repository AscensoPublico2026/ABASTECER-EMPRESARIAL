import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

/**
 * Rutas del SITIO WEB PUBLICO (abastecerempresarial.com).
 * Cualquiera en internet puede verlas sin iniciar sesion.
 * Todo lo demas (el ERP) sigue protegido con login.
 */
const RUTAS_PUBLICAS_EXACTAS = ['/', '/robots.txt', '/sitemap.xml', '/manifest.webmanifest']

const RUTAS_PUBLICAS_PREFIJO = [
  '/catalogo',
  '/nosotros',
  '/contacto',
  '/cotizacion',
  '/cotizar',
  '/soluciones',
  '/sectores',
  '/marcas',
  '/lineas',
  '/login',
]

function esRutaPublica(pathname: string): boolean {
  if (RUTAS_PUBLICAS_EXACTAS.includes(pathname)) return true
  return RUTAS_PUBLICAS_PREFIJO.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`)
  )
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const { pathname } = request.nextUrl

  // ============================================================
  // EL SITIO WEB PUBLICO SE SIRVE SIN PREGUNTAR NADA.
  // Si la ruta es publica, se devuelve INMEDIATAMENTE sin tocar
  // Supabase, sin revisar cookies, sin nada. Esto evita que un
  // error de conexion a Supabase o una cookie corrupta mande al
  // login a un visitante que solo quiere ver la pagina web.
  // ============================================================
  if (esRutaPublica(pathname)) {
    return response
  }

  // De aqui en adelante son rutas del ERP: necesitan sesion.
  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/panel'
    return NextResponse.redirect(url)
  }

  return response
}
