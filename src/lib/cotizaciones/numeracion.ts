import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// Numeracion de cotizaciones desde la app (sin tocar la base de datos)
// ------------------------------------------------------------
// Pedido del dueno (06/nov/2026): la COT-2026-072 pasa a ser la
// COT-2026-472 y desde ahi se sigue consecutivo: 473, 474, ...
//
// La migracion 043 hace lo mismo dentro de la base de datos, pero
// mientras no se aplique la app se encarga sola:
//   1. renombrarCotizacionPedida(): si existe COT-2026-072 y aun no
//      existe COT-2026-472, la renombra. Es idempotente (despues de la
//      primera vez no hace nada). Se llama al abrir Ventas y al crear.
//   2. siguienteNumeroCotizacion(): calcula el proximo numero del ano
//      (mayor + 1) y en 2026 nunca baja de 472. La app inserta la
//      cotizacion YA con ese numero; el trigger de la base solo numera
//      cuando el numero llega vacio, asi que lo respeta.
// Si la migracion 043 ya se aplico, todo esto da el mismo resultado.
// ============================================================

const RENOMBRAR = { de: 'COT-2026-072', a: 'COT-2026-472' }
const MINIMO_POR_ANIO: Record<string, number> = { '2026': 472 }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cliente = SupabaseClient<any, any, any>

export async function renombrarCotizacionPedida(supabase: Cliente): Promise<void> {
  try {
    const { data } = await supabase
      .from('cotizaciones')
      .select('id, numero')
      .in('numero', [RENOMBRAR.de, RENOMBRAR.a])
    const filas = (data ?? []) as { id: string; numero: string }[]
    const vieja = filas.find((f) => f.numero === RENOMBRAR.de)
    const yaExiste = filas.some((f) => f.numero === RENOMBRAR.a)
    if (!vieja || yaExiste) return
    await supabase.from('cotizaciones').update({ numero: RENOMBRAR.a }).eq('id', vieja.id)
  } catch {
    // Nunca bloquear la pantalla por esto; se reintenta la proxima vez.
  }
}

/** Proximo numero COT-AAAA-NNN para el ano de hoy (hora Colombia). */
export async function siguienteNumeroCotizacion(supabase: Cliente): Promise<string | null> {
  const anio = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric' }).format(new Date())
  const prefijo = `COT-${anio}-`
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('numero')
    .like('numero', `${prefijo}%`)
  if (error) return null
  let mayor = 0
  for (const fila of (data ?? []) as { numero: string }[]) {
    const n = parseInt(fila.numero.slice(prefijo.length), 10)
    if (Number.isFinite(n) && n > mayor) mayor = n
  }
  const siguiente = Math.max(mayor + 1, MINIMO_POR_ANIO[anio] ?? 1)
  return `${prefijo}${String(siguiente).padStart(3, '0')}`
}
