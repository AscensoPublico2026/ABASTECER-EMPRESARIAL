/**
 * Los nombres de producto se cargan en el ERP en MAYÚSCULAS (así salen en
 * cotizaciones y facturas). En la web se leen mejor en tipo oración.
 * Se respetan siglas y códigos (N95, CO2, PVC, VI0179, AZ...).
 */
const SIGLAS = new Set(['EPP', 'PVC', 'AZ', 'USB', 'LED', 'CO2', 'N95', 'SST', 'ABC', 'PQS', 'HP', 'XL', 'XXL', 'XXXL', 'S', 'M', 'L', 'IPS', 'NTC', 'ANSI', 'II', 'III', 'IV', 'UND', 'CM', 'MM', 'KG', 'LB'])

export function nombreLegible(nombre: string): string {
  const letras = nombre.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '')
  if (!letras) return nombre
  const mayus = letras.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length / letras.length
  if (mayus < 0.7) return nombre

  const palabras = nombre.split(/(\s+)/)
  let primera = true
  return palabras
    .map((p) => {
      if (/^\s+$/.test(p)) return p
      const limpia = p.replace(/[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/g, '')
      if (/\d/.test(limpia) || (SIGLAS.has(limpia) && limpia !== 'Y')) {
        primera = false
        return p
      }
      const baja = p.toLocaleLowerCase('es-CO')
      if (primera) {
        primera = false
        return baja.charAt(0).toLocaleUpperCase('es-CO') + baja.slice(1)
      }
      return baja
    })
    .join('')
}
