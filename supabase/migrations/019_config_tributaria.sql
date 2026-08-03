-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Configuracion tributaria
-- Migracion 019
-- ============================================================
-- Antes las tasas estaban quemadas en el codigo:
--   * 0.05  en ventas/actions.ts y compras/actions.ts
--   default 19.00 en varias tablas
--
-- Si cambia la tarifa del Regimen Simple o el IVA, habia que
-- tocar codigo y desplegar. Ahora se cambia un registro.
-- ============================================================

create table if not exists public.config_tributaria (
  id             uuid primary key default gen_random_uuid(),
  clave          text not null unique,
  valor          numeric(15,4) not null,
  unidad         text not null default 'PORCENTAJE'
                   check (unidad in ('PORCENTAJE','PESOS','UVT','NUMERO')),
  descripcion    text,
  vigente_desde  date not null default current_date,
  editable       boolean not null default true,
  updated_at     timestamptz not null default now()
);

comment on table public.config_tributaria is
  'Parametros tributarios. Evita tener tasas quemadas en el codigo.';

drop trigger if exists trg_config_trib_updated_at on public.config_tributaria;
create trigger trg_config_trib_updated_at
  before update on public.config_tributaria
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- Valores iniciales (Colombia 2026)
-- ------------------------------------------------------------
insert into public.config_tributaria (clave, valor, unidad, descripcion) values
  ('IVA_GENERAL',            19.0000, 'PORCENTAJE', 'Tarifa general de IVA'),
  ('SIMPLE_TARIFA',           5.0000, 'PORCENTAJE', 'Tarifa Regimen Simple de Tributacion para comercio al por mayor (grupo 2)'),
  ('UVT',                 49799.0000, 'PESOS',      'Unidad de Valor Tributario 2026'),
  ('RETEFUENTE_COMPRAS',      2.5000, 'PORCENTAJE', 'Retencion en la fuente por compras generales'),
  ('RETEFUENTE_SERVICIOS',    4.0000, 'PORCENTAJE', 'Retencion en la fuente por servicios'),
  ('RETEICA_CALI',            0.4140, 'PORCENTAJE', 'ReteICA Cali comercio (por mil / 100)'),
  ('RETEIVA',                15.0000, 'PORCENTAJE', 'ReteIVA sobre el valor del IVA'),
  ('MARGEN_MINIMO_VENTA',    30.0000, 'PORCENTAJE', 'Margen bruto minimo aceptable en una venta (politica interna)')
on conflict (clave) do nothing;


-- ------------------------------------------------------------
-- Funcion helper para leer un parametro
-- ------------------------------------------------------------
create or replace function public.param_tributario(p_clave text)
returns numeric
language sql
stable
as $$
  select coalesce((select valor from public.config_tributaria where clave = p_clave), 0);
$$;

comment on function public.param_tributario is
  'Devuelve el valor de un parametro tributario. Uso: select param_tributario(''SIMPLE_TARIFA'')';


-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.config_tributaria enable row level security;

drop policy if exists "config_trib_auth_all" on public.config_tributaria;
create policy "config_trib_auth_all" on public.config_tributaria
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
