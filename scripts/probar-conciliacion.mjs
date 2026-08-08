/**
 * PRUEBA CON LOS DATOS REALES DE LA CONCILIACION DEL DUENO
 *
 * Corre las 40 migraciones contra un Postgres de verdad (PGlite), carga los
 * movimientos EXACTOS de la conciliacion bancaria del 30 de julio al 3 de
 * agosto, y comprueba que el ERP da los mismos totales que la hoja:
 *
 *   ingresos   13.734.720,00
 *   egresos     6.074.835,54
 *   disponible  7.659.884,46   (+ caja menor 100.000 = 7.759.884,46)
 *
 * POR QUE EXISTE
 * Que las migraciones "corran sin error" no significa que los numeros
 * queden bien. Esto verifica lo unico que importa: que el saldo del ERP sea
 * igual al del banco.
 *
 *   npm run probar-conciliacion
 */
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'supabase/migrations'
const db = await PGlite.create()

await db.exec(`
  create schema if not exists auth;
  create or replace function auth.role() returns text
    language sql stable as $fn$ select 'authenticated'::text $fn$;
  create or replace function auth.uid() returns uuid
    language sql stable as $fn$ select null::uuid $fn$;
  create schema if not exists storage;
  create table if not exists storage.buckets (
    id text primary key, name text, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]);
  create table if not exists storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text, name text, owner uuid);
  create table if not exists auth.users (
    id uuid primary key default gen_random_uuid(), email text);
`)
for (const rol of ['anon', 'authenticated', 'service_role']) {
  try { await db.exec(`create role ${rol}`) } catch { /* ya existe */ }
}

// Las migraciones se aplican SIN la 039, para simular la base como esta hoy
const archivos = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()
for (const f of archivos) {
  if (f.startsWith('039')) continue
  await db.exec(readFileSync(join(DIR, f), 'utf8'))
}

// ------------------------------------------------------------
// Las cuentas: Bold (banco) y Caja menor
// ------------------------------------------------------------
await db.exec(`delete from public.cuentas;`)
await db.exec(`
  insert into public.cuentas (nombre, tipo, es_reserva, activa, orden, saldo_inicial, cobra_gmf) values
    ('Bold - Cuenta principal', 'BANCO',    false, true, 1, 0, true),
    ('Caja menor',              'EFECTIVO', false, true, 2, 0, false),
    ('Reserva impuestos',       'RESERVA',  true,  true, 3, 0, true);
`)
const { rows: cuentas } = await db.query(`select id, nombre from public.cuentas order by orden`)
const BOLD = cuentas[0].id
const CAJA = cuentas[1].id
const RESERVA = cuentas[2].id

/**
 * Los movimientos EXACTOS de la conciliacion. El 4x1000 NO se inserta: lo
 * genera el trigger. Si el trigger esta bien, los totales cuadran solos; es
 * justamente lo que se quiere probar.
 */
const ingresos = [
  ['2026-07-30', 'APORTE CAPITAL LAURA', 249000, 'APORTE_SOCIO'],
  ['2026-07-30', 'APORTE CAPITAL JULIO', 249000, 'APORTE_SOCIO'],
  ['2026-07-30', 'CAPITAL INICIAL JULIO CESAR', 1000000, 'APORTE_SOCIO'],
  ['2026-07-30', 'CAPITAL INICIAL LAURA SOFIA', 750000, 'APORTE_SOCIO'],
  ['2026-07-30', 'PAGO EVOLTI COT-2026-012', 1486720, 'COBRO_CLIENTE'],
  ['2026-08-03', 'INGRESO PRESTAMO SOCIO JULIO', 3000000, 'PRESTAMO_SOCIO'],
  ['2026-08-03', 'INGRESO PRESTAMO SOCIO JULIO 2', 3000000, 'PRESTAMO_SOCIO'],
  ['2026-08-03', 'INGRESO PRESTAMO SOCIO JULIO 3', 2000000, 'PRESTAMO_SOCIO'],
  ['2026-08-03', 'INGRESO PRESTAMO SOCIO JULIO 4', 2000000, 'PRESTAMO_SOCIO'],
]

// [fecha, concepto, monto, categoria, exento_gmf]
// exento = los que en la hoja NO llevan linea de 4x1000
const egresos = [
  ['2026-07-30', 'CAMARA DE COMERCIO INICIAL', 498000, 'GASTO', true],
  ['2026-07-31', 'EL PALACIO DEL HOGAR', 234000, 'PAGO_PROVEEDOR', false],
  ['2026-07-31', 'HERNANDO RAMIREZ ARIAS', 476000, 'PAGO_PROVEEDOR', false],
  ['2026-08-01', 'LA BODEGA DE LAS CAMISAS ARITEX', 23800, 'PAGO_PROVEEDOR', false],
  ['2026-08-01', 'DISTRIBUIDORA EXTRA', 93200, 'PAGO_PROVEEDOR', false],
  ['2026-08-01', 'MULTIREDES', 857000, 'PAGO_PROVEEDOR', false],
  ['2026-08-02', 'ALKOSTO CALI NORTE - IMPRESORA', 779070, 'GASTO', false],
  ['2026-08-03', 'POSITEX', 25300, 'PAGO_PROVEEDOR', false],
  ['2026-08-03', 'PLASTICOS LA TORRE', 13000, 'PAGO_PROVEEDOR', false],
  ['2026-08-03', 'PLASTICOS Y DESECHABLES LA 12', 15000, 'PAGO_PROVEEDOR', false],
  ['2026-08-03', 'PAGO TRANSPORTE CANASTILLAS', 60000, 'GASTO', false],
  ['2026-08-03', 'ELSISO', 1150000, 'PAGO_PROVEEDOR', false],
  ['2026-08-03', 'SEBASTIAN HERNANDEZ PROCOLDEXT', 1504015, 'PAGO_PROVEEDOR', false],
  ['2026-08-03', 'PAGO TRANSPORTE EXTINTOR Y CAMILLA TAXI', 22500, 'GASTO', false],
  ['2026-08-03', 'PAGO TRANSPORTE ENTREGA A EVOLTI', 45000, 'GASTO', false],
]

// La columna exento_gmf la agrega la 039. Antes de eso no existe, asi que
// se agrega aca para poder cargar los datos y probar el comportamiento.
await db.exec(`
  alter table public.movimientos_tesoreria
    add column if not exists exento_gmf boolean not null default false;
`)
// Y se aplica la 039 (que redefine los triggers con centavos y exenciones)
await db.exec(readFileSync(join(DIR, '039_auditoria_integral.sql'), 'utf8'))

for (const [fecha, concepto, monto, categoria] of ingresos) {
  await db.query(
    `insert into public.movimientos_tesoreria (cuenta_id, fecha, tipo, categoria, monto, concepto)
     values ($1, $2, 'INGRESO', $3, $4, $5)`,
    [BOLD, fecha, categoria, monto, concepto],
  )
}
for (const [fecha, concepto, monto, categoria, exento] of egresos) {
  await db.query(
    `insert into public.movimientos_tesoreria (cuenta_id, fecha, tipo, categoria, monto, concepto, exento_gmf)
     values ($1, $2, 'EGRESO', $3, $4, $5, $6)`,
    [BOLD, fecha, categoria, monto, concepto, exento],
  )
}

// Los traslados al bolsillo de impuestos: salen del banco, entran a reserva.
// En la hoja NO llevan 4x1000 (es cuenta propia).
// Se usa la MISMA funcion que usa la app (trasladar_entre_cuentas), para
// probar el comportamiento real y no una simulacion. Ella decide si el
// traslado lleva 4x1000 segun el destino.
for (const [concepto, monto] of [
  ['BOLSILLO IVA - COT-2026-012', 93359],
  ['BOLSILLO IMP SIMPLE - COT-2026-012', 64000],
]) {
  const { rows } = await db.query(
    `select public.trasladar_entre_cuentas($1, $2, $3, '2026-08-02', $4) as r`,
    [BOLD, RESERVA, monto, concepto],
  )
  if (!rows[0].r.ok) console.log('  ojo, traslado rechazado:', rows[0].r.mensaje)
}

// El retiro a caja menor: destino EFECTIVO, asi que SI debe llevar 4x1000
{
  const { rows } = await db.query(
    `select public.trasladar_entre_cuentas($1, $2, 100000, '2026-08-03', 'RETIRO PARA CAJA MENOR') as r`,
    [BOLD, CAJA],
  )
  if (!rows[0].r.ok) console.log('  ojo, retiro rechazado:', rows[0].r.mensaje)
}

// ------------------------------------------------------------
// COMPROBACION
// ------------------------------------------------------------
const f = (n) => Number(n).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const { rows: conc } = await db.query(`select * from public.conciliacion_bancaria`)
const banco = conc.find((c) => c.cuenta.startsWith('Bold'))
const caja = conc.find((c) => c.cuenta === 'Caja menor')

const ESPERADO = {
  ingresos: 13734720,
  egresos: 6074835.54,
  disponible: 7659884.46,
  total: 7759884.46,
}

console.log('=== CONCILIACION: ERP contra la hoja del banco ===\n')
console.log('CUENTA BANCARIA (Bold)')
const filas = [
  ['Ingresos', Number(banco.ingresos), ESPERADO.ingresos],
  ['Egresos (con 4x1000)', Number(banco.egresos), ESPERADO.egresos],
  ['Disponible', Number(banco.disponible), ESPERADO.disponible],
]
let fallas = 0
for (const [etiqueta, erp, hoja] of filas) {
  const ok = Math.abs(erp - hoja) < 0.01
  if (!ok) fallas++
  console.log(
    `  ${etiqueta.padEnd(24)} ERP ${f(erp).padStart(15)}   hoja ${f(hoja).padStart(15)}   ${ok ? 'CUADRA' : 'DIFERENCIA ' + f(erp - hoja)}`,
  )
}
console.log(`  ${'del cual 4x1000'.padEnd(24)}     ${f(banco.del_cual_4x1000).padStart(15)}`)

const total = Number(banco.disponible) + Number(caja.disponible)
const okTotal = Math.abs(total - ESPERADO.total) < 0.01
if (!okTotal) fallas++
console.log(`\n  ${'Caja menor'.padEnd(24)}     ${f(caja.disponible).padStart(15)}`)
console.log(
  `  ${'DINERO DISPONIBLE TOTAL'.padEnd(24)} ERP ${f(total).padStart(15)}   hoja ${f(ESPERADO.total).padStart(15)}   ${okTotal ? 'CUADRA' : 'DIFERENCIA ' + f(total - ESPERADO.total)}`,
)

const reserva = conc.find((c) => c.es_reserva)
console.log(`\n  ${'Apartado para la DIAN'.padEnd(24)}     ${f(reserva.disponible).padStart(15)}   (93.359 IVA + 64.000 Simple = 157.359)`)

// El 4x1000 movimiento por movimiento contra la hoja
console.log('\n=== EL 4x1000 QUE GENERO EL ERP ===')
const esperadoGmf = {
  'EL PALACIO DEL HOGAR': 936, 'HERNANDO RAMIREZ ARIAS': 1904,
  'LA BODEGA DE LAS CAMISAS ARITEX': 95.2, 'DISTRIBUIDORA EXTRA': 372.8,
  MULTIREDES: 3428, 'ALKOSTO CALI NORTE - IMPRESORA': 3116.28,
  POSITEX: 101.2, 'PLASTICOS LA TORRE': 52,
  'PLASTICOS Y DESECHABLES LA 12': 60, 'PAGO TRANSPORTE CANASTILLAS': 240,
  ELSISO: 4600, 'SEBASTIAN HERNANDEZ PROCOLDEXT': 6016.06,
  'PAGO TRANSPORTE EXTINTOR Y CAMILLA TAXI': 90,
  'PAGO TRANSPORTE ENTREGA A EVOLTI': 180,
  // Retiro a efectivo: este SI lo cobra el banco
  'RETIRO PARA CAJA MENOR': 400,
}
const { rows: gmfs } = await db.query(`
  select p.concepto, g.monto
  from public.movimientos_tesoreria g
  join public.movimientos_tesoreria p on p.id = g.gmf_de_id
  where g.categoria = 'GMF' order by p.concepto
`)
// trasladar_entre_cuentas le agrega " (sale de X)" al concepto, asi que se
// compara por prefijo. Si se comparara exacto, un traslado con 4x1000 de mas
// pasaria desapercibido y la prueba mentiria.
const buscar = (concepto) => gmfs.find((g) => g.concepto.startsWith(concepto))

for (const [concepto, esperado] of Object.entries(esperadoGmf)) {
  const encontrado = buscar(concepto)
  const val = encontrado ? Number(encontrado.monto) : null
  const ok = val !== null && Math.abs(val - esperado) < 0.01
  if (!ok) fallas++
  console.log(`  ${concepto.padEnd(42)} ERP ${(val === null ? 'NO GENERADO' : f(val)).padStart(11)}   hoja ${f(esperado).padStart(10)}   ${ok ? 'OK' : 'MAL'}`)
}

// Que NO haya generado 4x1000 donde la hoja no lo tiene
console.log('\n=== NO DEBE HABER 4x1000 EN ESTOS ===')
for (const concepto of ['CAMARA DE COMERCIO INICIAL', 'BOLSILLO IVA - COT-2026-012', 'BOLSILLO IMP SIMPLE - COT-2026-012']) {
  const encontrado = buscar(concepto)
  const ok = !encontrado
  if (!ok) fallas++
  console.log(`  ${concepto.padEnd(42)} ${ok ? 'OK, sin 4x1000' : 'MAL: genero ' + f(encontrado.monto)}`)
}

// La auditoria no debe reportar nada
const { rows: hallazgos } = await db.query(`select * from public.auditoria_integridad`)
console.log(`\n=== AUDITORIA: ${hallazgos.length} hallazgo(s) ===`)
for (const h of hallazgos) console.log(`  [${h.gravedad}] ${h.area}: ${h.problema} -> ${h.detalle} (${f(h.diferencia)})`)
if (hallazgos.length > 0) fallas++

await db.close()
console.log(fallas === 0
  ? '\nEL ERP DA EXACTAMENTE LO MISMO QUE LA CONCILIACION BANCARIA'
  : `\n${fallas} DIFERENCIA(S) CONTRA LA CONCILIACION`)
process.exit(fallas === 0 ? 0 : 1)
