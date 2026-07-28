/**
 * Configuracion de Supabase para Abastecer Empresarial.
 *
 * Nota: La anon key es publica y segura de exponer en el cliente.
 * La seguridad real se maneja con Row Level Security (RLS) en la base de datos.
 * Ver: https://supabase.com/docs/guides/auth#row-level-security
 */

export const SUPABASE_URL = 'https://xfbhlofjdneexlrludlu.supabase.co'

export const SUPABASE_ANON_KEY = 'sb_publishable_0atQ-dr1zPvopkmOI8WI9w_W_-fD60d'

export function supabaseEstaConfigurado(): boolean {
  return true
}
