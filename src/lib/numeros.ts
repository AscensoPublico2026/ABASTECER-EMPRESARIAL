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
 *
 *   "1.250.000"  -> 1250000    (punto como separador de miles)
 *   "1.250,50"   -> 1250.50    (coma como decimal)
 *   "2500.50"    -> 2500.50    (punto como decimal, caso anglosajon)
 *   "32275"      -> 32275
 *
 * OJO: la version anterior hacia replace(/\./g, '') a ciegas, asi que
 * "2500.50" se volvia 250050 (100x mas). Eso causaba que una retencion
 * de 2.500,50 se registrara como 250.050.
 *
 * Regla: si hay coma, la coma es el decimal y los puntos son miles.
 * Si NO hay coma y hay UN solo punto con 1-2 digitos despues, ese punto
 * es decimal. Si hay varios puntos, o 3 digitos despues, son miles.
 */
export function montoDesdeTexto(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) return 0
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0

  const texto = String(valor).trim()
  if (texto === '') return 0

  let normalizado: string

  if (texto.includes(',')) {
    // Formato colombiano: puntos son miles, coma es decimal
    normalizado = texto.replace(/\./g, '').replace(',', '.')
  } else {
    const puntos = (texto.match(/\./g) ?? []).length
    if (puntos === 1) {
      const despues = texto.split('.')[1] ?? ''
      // Un punto con 1 o 2 digitos despues = decimal ("2500.50")
      // Un punto con 3 digitos despues = miles ("1.250")
      normalizado = despues.length <= 2 ? texto : texto.replace(/\./g, '')
    } else {
      // Varios puntos o ninguno: son separadores de miles
      normalizado = texto.replace(/\./g, '')
    }
  }

  const n = Number(normalizado)
  return Number.isFinite(n) ? n : 0
}


/**
 * Convierte la cantidad de un item a numero, respetando el CERO.
 *
 * OJO: no usar `Number(x) || 1` porque el cero es falsy y una cantidad
 * de 0 se convertia en 1 unidad. En pantalla el item valia $0 y al
 * guardar aparecia cobrando 1 unidad: si el precio era $400.000, la
 * cotizacion salia $400.000 mas alta de lo que vio el vendedor.
 *
 * Devuelve 0 si el valor no es un numero valido, para que el filtro
 * de items lo descarte explicitamente en vez de inventar una unidad.
 */
export function cantidadValida(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined || valor === '') return 0
  const n = Number(valor)
  return Number.isFinite(n) && n >= 0 ? n : 0
}
