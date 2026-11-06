// Formatos compartidos entre el PDF y la pantalla de la cotizacion.

export function fechaLarga(f?: string | null): string {
  if (!f) return '-'
  const [y, m, d] = f.slice(0, 10).split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)))
}

// ------------------------------------------------------------
// Numero en letras (pesos colombianos), p. ej. 3.614.030 ->
// "TRES MILLONES SEISCIENTOS CATORCE MIL TREINTA PESOS M/CTE"
// ------------------------------------------------------------
const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE']
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

function menorDeMil(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'CIEN'
  const c = Math.floor(n / 100)
  const r = n % 100
  let txt = CENTENAS[c]
  if (r > 0) {
    let d: string
    if (r < 30) d = UNIDADES[r]
    else {
      const u = r % 10
      d = DECENAS[Math.floor(r / 10)] + (u ? ' Y ' + UNIDADES[u] : '')
    }
    txt = (txt ? txt + ' ' : '') + d
  }
  return txt
}

/** "UNO" se apocopa delante de MIL / MILLONES: "veintiún mil", "treinta y un mil". */
function apocope(t: string): string {
  return t.replace(/VEINTIUNO$/, 'VEINTIÚN').replace(/UNO$/, 'UN')
}

function hastaMillon(n: number): string {
  const miles = Math.floor(n / 1000)
  const resto = n % 1000
  const p: string[] = []
  if (miles > 0) p.push(miles === 1 ? 'MIL' : `${apocope(menorDeMil(miles))} MIL`)
  if (resto > 0) p.push(menorDeMil(resto))
  return p.join(' ')
}

export function numeroEnLetras(valor: number): string {
  const n = Math.round(Math.abs(valor || 0))
  if (n === 0) return 'CERO PESOS M/CTE'
  if (n === 1) return 'UN PESO M/CTE'
  const millones = Math.floor(n / 1_000_000)
  const resto = n % 1_000_000
  const partes: string[] = []
  if (millones > 0) partes.push(millones === 1 ? 'UN MILLÓN' : `${apocope(hastaMillon(millones))} MILLONES`)
  if (resto > 0) partes.push(hastaMillon(resto))
  const exacto = millones > 0 && resto === 0
  // "ciento uno" -> "ciento un pesos"
  return `${apocope(partes.join(' '))}${exacto ? ' DE' : ''} PESOS M/CTE`
}

/** Separa "PRD-0179 - CINTA ..." en codigo y descripcion. */
export function separarCodigo(desc: string): { codigo: string; texto: string } {
  const m = desc.match(/^\s*([A-Z]{2,5}-\d{2,6})\s*-\s*([\s\S]*)$/)
  if (!m) return { codigo: '', texto: desc.trim() }
  return { codigo: m[1], texto: m[2].replace(/^-\s*/, '').trim() }
}

