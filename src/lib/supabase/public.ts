import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

/**
 * Cliente de Supabase para el SITIO WEB PUBLICO.
 *
 * A diferencia de createServerSupabaseClient(), este no lee cookies:
 * el visitante de la web no tiene sesion. Eso permite que Next.js pueda
 * cachear las paginas publicas (mas rapidas y mejor posicionadas en Google).
 *
 * Solo puede leer las vistas catalogo_web / lineas_web y la tabla
 * sitio_contenido. Los costos, margenes y stock NUNCA salen a internet.
 */
export function createPublicSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-abastecer-origen': 'sitio-web' } },
  })
}
