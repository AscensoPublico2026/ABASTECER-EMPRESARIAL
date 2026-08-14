/**
 * PRUEBA QUE UN GASTO ASIGNADO A UNA VENTA LLEGA AL INFORME
 *
 * POR QUE EXISTE
 * El dueno registro el gasto del transporte de dos ventas, le asigno la
 * venta, la pantalla dijo "guardado" y el gasto NO aparecio en el informe
 * de la cotizacion. La causa: uppercaseFormData convertia la bandera
 * es_costo_venta de 'true' a 'TRUE', la comparacion `=== 'true'` daba
 * false, y las filas de gasto_reparto (de donde el informe lee los
 * gastos) nunca se creaban. La utilidad de esas ventas quedaba inflada
 * porque el costo del transporte no entraba.
 *
 * Esta prueba corre sobre Postgres de verdad (PGlite) y verifica:
 *   1. Un gasto bien asignado SI aparece en analisis_venta.
 *   2. El caso roto (gasto con cotizacion_id pero sin reparto) queda
 *      detectado por la vista gastos_sin_venta_asignada.
 *   3. La migracion 041 lo repara: crea el reparto, marca la bandera y
 *      la utilidad de la venta baja por el costo del gasto.
 *
 *   npm run probar-gastos-venta
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
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table if not exists storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text, name text, owner uuid
  );
  create table if not exists auth.users (
    id uuid primary key default gen_random_uuid(), email text
  );
`)
for (const rol of ['anon', 'authenticated', 'service_role']) {
  try { await db.exec(`create role ${rol}`) } catch { /* ya existe */ }
}

// ---- Correr todas las migraciones MENOS la 041 ----
// La 041 se corre despues, a proposito, para comprobar que repara.
const archivos = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()
const reparacion = archivos.find((f) => f.startsWith('041_'))
for (const f of archivos.filter((x) => x !== reparacion)) {
  await db.exec(readFileSync(join(DIR, f), 'utf8'))
}

let fallas = 0
function revisar(titulo, ok, detalle) {
  console.log(`${ok ? 'OK      ' : 'FALLA   '} ${titulo}`)
  if (!ok) { fallas++; console.log('          ', detalle) }
}
const uno = async (sql) => (await db.query(sql)).rows[0]

// ============================================================
// MONTAR EL ESCENARIO
// ============================================================
await db.exec(`
  insert into public.clientes (id, razon_social, nit)
  values ('11111111-1111-1111-1111-111111111111', 'EVOLTI COMPANY SAS', '900123456');

  -- Venta de 1.000.000 antes de IVA, sin ningun costo todavia
  insert into public.cotizaciones
    (id, numero, cliente_id, fecha, subtotal, iva_total, total,
     costo_total, utilidad_estimada, margen_pct, estado)
  values
    ('22222222-2222-2222-2222-222222222222', 'COT-2026-015',
     '11111111-1111-1111-1111-111111111111', current_date,
     1000000, 190000, 1190000, 0, 1000000, 100, 'DESPACHADA');
`)

// ---- CASO 1: gasto bien asignado (como debe quedar de ahora en adelante)
await db.exec(`
  insert into public.gastos (id, fecha, concepto, categoria, monto, es_costo_venta, cotizacion_id)
  values ('33333333-3333-3333-3333-333333333333', current_date,
          'TRANSPORTE COT-015', 'TRANSPORTE', 150000, true,
          '22222222-2222-2222-2222-222222222222');
  insert into public.gasto_reparto (gasto_id, cotizacion_id, monto)
  values ('33333333-3333-3333-3333-333333333333',
          '22222222-2222-2222-2222-222222222222', 150000);
`)

let r = await uno(`
  select costo_gastos, num_gastos, utilidad_bruta
  from public.analisis_venta
  where cotizacion_id = '22222222-2222-2222-2222-222222222222'
`)
revisar('un gasto bien asignado aparece en el informe de la venta',
  Number(r.costo_gastos) === 150000 && Number(r.num_gastos) === 1,
  `costo_gastos=${r.costo_gastos} num_gastos=${r.num_gastos} (se esperaba 150000 y 1)`)

revisar('la utilidad baja por el costo del gasto',
  Number(r.utilidad_bruta) === 850000,
  `utilidad_bruta=${r.utilidad_bruta} (se esperaba 1000000 - 150000 = 850000)`)

// ============================================================
// CASO 2: reproducir EXACTAMENTE el bug
// ============================================================
// Asi quedaban los gastos: con cotizacion_id grabado, pero
// es_costo_venta = false y SIN filas en gasto_reparto.
await db.exec(`
  insert into public.cotizaciones
    (id, numero, cliente_id, fecha, subtotal, iva_total, total,
     costo_total, utilidad_estimada, margen_pct, estado)
  values
    ('44444444-4444-4444-4444-444444444444', 'COT-2026-011',
     '11111111-1111-1111-1111-111111111111', current_date,
     2000000, 380000, 2380000, 0, 2000000, 100, 'DESPACHADA');

  insert into public.gastos (id, fecha, concepto, categoria, monto, es_costo_venta, cotizacion_id)
  values ('55555555-5555-5555-5555-555555555555', current_date,
          'TRANSPORTE COT-011', 'TRANSPORTE', 200000, false,
          '44444444-4444-4444-4444-444444444444');
`)

r = await uno(`
  select costo_gastos, num_gastos
  from public.analisis_venta
  where cotizacion_id = '44444444-4444-4444-4444-444444444444'
`)
revisar('BUG REPRODUCIDO: el gasto existe pero el informe no lo ve',
  Number(r.costo_gastos) === 0 && Number(r.num_gastos) === 0,
  `costo_gastos=${r.costo_gastos} num_gastos=${r.num_gastos} (el bug daba 0 y 0)`)

// ============================================================
// CORRER LA REPARACION (migracion 041)
// ============================================================
await db.exec(readFileSync(join(DIR, reparacion), 'utf8'))

r = await uno(`
  select count(*)::int as n from public.gasto_reparto
  where gasto_id = '55555555-5555-5555-5555-555555555555'
`)
revisar('la reparacion crea el reparto que faltaba', r.n === 1, `filas=${r.n}`)

r = await uno(`
  select es_costo_venta from public.gastos
  where id = '55555555-5555-5555-5555-555555555555'
`)
revisar('la reparacion marca el gasto como costo de venta',
  r.es_costo_venta === true, `es_costo_venta=${r.es_costo_venta}`)

r = await uno(`
  select costo_gastos, num_gastos, utilidad_bruta
  from public.analisis_venta
  where cotizacion_id = '44444444-4444-4444-4444-444444444444'
`)
revisar('despues de reparar, el gasto YA aparece en el informe',
  Number(r.costo_gastos) === 200000 && Number(r.num_gastos) === 1,
  `costo_gastos=${r.costo_gastos} num_gastos=${r.num_gastos}`)

r = await uno(`
  select costo_total, utilidad_estimada, margen_pct
  from public.cotizaciones
  where id = '44444444-4444-4444-4444-444444444444'
`)
revisar('la utilidad y el margen del listado quedan recalculados',
  Number(r.costo_total) === 200000
    && Number(r.utilidad_estimada) === 1800000
    && Number(r.margen_pct) === 90,
  `costo_total=${r.costo_total} utilidad=${r.utilidad_estimada} margen=${r.margen_pct} (se esperaba 200000 / 1800000 / 90)`)

// ---- Idempotencia: correrla dos veces no puede duplicar nada ----
await db.exec(readFileSync(join(DIR, reparacion), 'utf8'))
r = await uno(`select count(*)::int as n from public.gasto_reparto`)
revisar('correr la reparacion dos veces no duplica el reparto', r.n === 2, `filas=${r.n} (se esperaban 2)`)

// ---- El caso que NO se puede recuperar queda reportado ----
await db.exec(`
  insert into public.gastos (id, fecha, concepto, categoria, monto, es_costo_venta, cotizacion_id)
  values ('66666666-6666-6666-6666-666666666666', current_date,
          'TRANSPORTE SIN VENTA', 'TRANSPORTE', 90000, true, null);
`)
r = await uno(`
  select count(*)::int as n from public.gastos_sin_venta_asignada
  where gasto_id = '66666666-6666-6666-6666-666666666666'
`)
revisar('un gasto que perdio la venta sale en el reporte para reasignarlo',
  r.n === 1, `filas=${r.n}`)

// ---- Los activos fijos NO se tocan ----
await db.exec(`
  insert into public.gastos (id, fecha, concepto, categoria, monto, es_costo_venta, cotizacion_id)
  values ('77777777-7777-7777-7777-777777777777', current_date,
          'IMPRESORA', 'ACTIVO_FIJO', 779070, false,
          '22222222-2222-2222-2222-222222222222');
`)
await db.exec(readFileSync(join(DIR, reparacion), 'utf8'))
r = await uno(`
  select count(*)::int as n from public.gasto_reparto
  where gasto_id = '77777777-7777-7777-7777-777777777777'
`)
revisar('un ACTIVO_FIJO no se convierte en costo de venta', r.n === 0, `filas=${r.n}`)

console.log('')
if (fallas > 0) {
  console.log(`${fallas} PRUEBA(S) FALLARON`)
  process.exit(1)
}
console.log('TODAS LAS PRUEBAS PASAN: el gasto asignado a una venta llega al informe')
