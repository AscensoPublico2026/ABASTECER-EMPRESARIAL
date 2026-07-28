/**
 * Utilidades de formato para Colombia (COP, es-CO)
 */

/** Formatea un valor como pesos colombianos sin decimales: $1.500.000 */
export function formatCOP(valor: number | null | undefined): string {
  const n = Number(valor ?? 0)
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

/** Formatea un numero con separadores de miles: 1.500.000 */
export function formatNumero(valor: number | null | undefined): string {
  const n = Number(valor ?? 0)
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
  }).format(n)
}

/** Formatea un porcentaje: 50,00 % */
export function formatPorcentaje(valor: number | null | undefined): string {
  const n = Number(valor ?? 0)
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + ' %'
}

/** Formatea una fecha ISO (YYYY-MM-DD) a formato legible: 25 jul 2026 */
export function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return '-'
  // Se construye en UTC para evitar corrimiento de un dia por zona horaria
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return '-'
  const date = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** Convierte texto de input a numero, tolerando puntos y comas */
export function parseMonto(texto: string): number {
  if (!texto) return 0
  const limpio = texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number(limpio)
  return Number.isFinite(n) ? n : 0
}
