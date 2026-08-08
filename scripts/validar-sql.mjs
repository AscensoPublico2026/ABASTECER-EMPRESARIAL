/**
 * VALIDADOR DE SINTAXIS SQL
 *
 * POR QUE EXISTE
 * Se le entrego al dueno una migracion con un error de sintaxis tonto
 * (`comment on view ... as` en vez de `is`). El la pego en Supabase, le
 * reboto, y perdio tiempo y creditos en un ida y vuelta que no debio pasar.
 *
 * Revisar el SQL "leyendolo con cuidado" no es un metodo: es exactamente lo
 * que falla. libpg-query es el parser REAL de Postgres (el mismo codigo C
 * que corre en el servidor), asi que si un archivo pasa por aca, no va a
 * fallar por sintaxis en Supabase.
 *
 * COMO SE USA
 *   npm run validar-sql                      -> valida todo
 *   node scripts/validar-sql.mjs archivo.sql -> valida uno
 *
 * QUE NO VALIDA
 * Solo sintaxis. Que una tabla o columna exista, o que la logica sea
 * correcta, hay que verificarlo aparte: eso no lo sabe el parser.
 */
import pkg from 'libpg-query'
import { readFileSync } from 'node:fs'

const { parse, loadModule } = pkg
await loadModule()

const archivos = process.argv.slice(2)

if (archivos.length === 0) {
  console.error('Uso: node scripts/validar-sql.mjs <archivo.sql> [...]')
  process.exit(1)
}

let fallas = 0

for (const f of archivos) {
  let sql
  try {
    sql = readFileSync(f, 'utf8')
  } catch {
    console.log('NO SE PUDO LEER', f)
    fallas++
    continue
  }

  try {
    await parse(sql)
    console.log('OK      ', f)
  } catch (e) {
    fallas++
    console.log('FALLA   ', f)
    console.log('         ', e.message)

    // Ubicar el error en el archivo, para no tener que buscarlo a mano
    const pos = e.cursorPosition ?? e.cursorpos
    if (pos) {
      const linea = sql.slice(0, pos).split('\n').length
      const trozo = sql.slice(Math.max(0, pos - 100), pos + 100).replace(/\n/g, ' ⏎ ')
      console.log(`          linea ~${linea}`)
      console.log(`          ...${trozo}...`)
    }
  }
}

console.log(
  fallas === 0
    ? `\n${archivos.length} archivo(s): TODOS PASAN EL PARSER DE POSTGRES`
    : `\n${fallas} ARCHIVO(S) CON ERROR DE SINTAXIS`,
)

process.exit(fallas === 0 ? 0 : 1)
