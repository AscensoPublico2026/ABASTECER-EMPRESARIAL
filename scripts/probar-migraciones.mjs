/**
 * EJECUTA TODAS LAS MIGRACIONES CONTRA UN POSTGRES DE VERDAD
 *
 * POR QUE EXISTE
 * Se le entregaron al dueno dos migraciones con errores que solo aparecen
 * al EJECUTARLAS: `comment on view ... as` (sintaxis) y `min(uuid)` (esa
 * funcion no existe en Postgres). Las dos las descubrio el pegandolas en
 * Supabase y perdiendo tiempo y creditos.
 *
 * El validador de sintaxis no alcanza: `min(uuid)` es sintacticamente
 * valido. La unica forma de estar seguro es CORRERLO.
 *
 * PGlite es Postgres compilado a WASM: el motor real, sin servidor. Se crea
 * una base vacia, se corren las 40 migraciones en orden y si alguna falla
 * se ve exactamente donde.
 *
 *   npm run probar-migraciones
 *
 * QUE NO PRUEBA
 * Los datos reales del dueno. Aca la base queda vacia, asi que valida que el
 * SQL es correcto (tablas, columnas, tipos, funciones, vistas, triggers),
 * no que los numeros de su operacion cuadren.
 */
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'supabase/migrations'

const db = await PGlite.create()

/**
 * Supabase trae cosas que no existen en un Postgres pelado. Sin estos
 * remiendos las migraciones fallarian por el entorno, no por estar mal, y
 * serian falsas alarmas.
 */
await db.exec(`
  create schema if not exists auth;
  create or replace function auth.role() returns text
    language sql stable as $fn$ select 'authenticated'::text $fn$;
  create or replace function auth.uid() returns uuid
    language sql stable as $fn$ select null::uuid $fn$;
  create schema if not exists storage;
  create table if not exists storage.buckets (
    id text primary key,
    name text,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table if not exists storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text,
    name text,
    owner uuid
  );
  -- auth.users la crea Supabase, no las migraciones. Sin este remedo la 012
  -- fallaria por el entorno de prueba y no por estar mal.
  create table if not exists auth.users (
    id uuid primary key default gen_random_uuid(),
    email text
  );
`)

// Roles que crea Supabase, no las migraciones. Sin ellos los GRANT fallan
// por el entorno de prueba y no porque el SQL este mal.
for (const rol of ['anon', 'authenticated', 'service_role']) {
  try {
    await db.exec(`create role ${rol}`)
  } catch {
    /* ya existe */
  }
}
// gen_random_uuid() ya es nativa desde Postgres 13, no hace falta pgcrypto.

const archivos = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()

let fallas = 0
let corridas = 0

for (const f of archivos) {
  const sql = readFileSync(join(DIR, f), 'utf8')
  try {
    await db.exec(sql)
    corridas++
    console.log('OK      ', f)
  } catch (e) {
    fallas++
    console.log('FALLA   ', f)
    console.log('          ', String(e.message).split('\n')[0])
    for (const campo of ['detail', 'hint', 'where', 'position']) {
      if (e[campo]) console.log(`           ${campo}: ${e[campo]}`)
    }
    if (e.position) {
      const pos = Number(e.position)
      const linea = sql.slice(0, pos).split('\n').length
      console.log(`           linea ~${linea}: ${sql.split('\n')[linea - 1]?.trim()}`)
    }
    // Se sigue con las demas: interesa la lista completa, no la primera
  }
}

console.log(`\n${corridas} de ${archivos.length} migraciones corrieron sin error`)

// Si todo paso, comprobar que las vistas del dinero existen y se pueden
// consultar. Una vista puede crearse y fallar al leerla.
if (fallas === 0) {
  const vistas = [
    'analisis_venta', 'analisis_venta_items', 'posicion_financiera',
    'estado_reserva_impuestos', 'obligaciones_por_periodo', 'saldos_cuentas',
    'trazabilidad_venta', 'gastos_reparto_detalle', 'gmf_por_periodo',
    'activos_fijos', 'gmf_descuadre', 'gastos_iva_sospechoso',
    'auditoria_integridad', 'libro_tesoreria', 'documentos_soporte',
  ]
  console.log('\nConsultando cada vista:')
  for (const v of vistas) {
    try {
      await db.query(`select * from public.${v} limit 1`)
      console.log('  OK      ', v)
    } catch (e) {
      fallas++
      console.log('  FALLA   ', v, '->', String(e.message).split('\n')[0])
    }
  }
}

await db.close()

console.log(
  fallas === 0
    ? '\nTODAS LAS MIGRACIONES CORREN Y TODAS LAS VISTAS SE CONSULTAN'
    : `\n${fallas} PROBLEMA(S)`,
)
process.exit(fallas === 0 ? 0 : 1)
