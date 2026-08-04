/**
 * Convierte el IVA de un input a numero respetando el CERO.
 *
 * OJO: no usar `Number(x) || 19` porque el cero es falsy en JavaScript
 * y se convertiria en 19. Si el usuario elige IVA 0% (productos exentos,
 * fletes de personas naturales, etc.) hay que guardar 0.
 */
export function ivaPorcentaje(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined || valor === '') return 19
  const n = Number(valor)
  return Number.isFinite(n) && n >= 0 ? n : 19
}

/**
 * Convierte un texto con formato colombiano a numero.
 * "1.250.000" -> 1250000    "1.250,50" -> 1250.50
 */
export function montoDesdeTexto(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) return 0
  const texto = String(valor).replace(/\./g, '').replace(',', '.')
  const n = Number(texto)
  return Number.isFinite(n) ? n : 0
}
