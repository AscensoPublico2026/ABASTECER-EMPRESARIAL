-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Gastos por venta y Documento Soporte
-- Migracion 018
-- ============================================================
-- Caso real que resuelve (COT-2026-012):
--   Se cobro un flete de $40.000 + IVA al cliente.
--   El transporte lo hizo un particular que cobro $60.000 sin factura.
--   Ese costo debe:
--     1. imputarse a la venta (para que la utilidad sea real)
--     2. quedar documentado con Documento Soporte para ser deducible
--
-- Un gasto puede ser:
--   COSTO DE VENTA    -> es_costo_venta = true  + cotizacion_id
--   GASTO OPERATIVO   -> es_costo_venta = false (arriendo, dominio, etc.)
-- ============================================================

-- ------------------------------------------------------------
-- Ampliar tabla gastos
-- ------------------------------------------------------------
alter table public.gastos
  add column if not exists cotizacion_id    uuid references public.cotizaciones(id) on delete set null,
  add column if not exists es_costo_venta   boolean not null default false,
  add column if not exists tiene_soporte    boolean not null default false,
  add column if not exists deducible        boolean not null default false,
  add column if not exists tercero_nombre   text,
  add column if not exists tercero_documento text;

comment on column public.gastos.cotizacion_id is
  'Si el gasto pertenece a una venta especifica (flete, mano de obra), se vincula aqui.';
comment on column public.gastos.es_costo_venta is
  'true = entra al costo de la venta y baja la utilidad de esa cotizacion. false = gasto operativo general.';
comment on column public.gastos.deducible is
  'true solo si hay factura o Documento Soporte valido. Sin soporte NO es deducible de renta/Simple.';

create index if not exists idx_gastos_cotizacion on public.gastos(cotizacion_id);
create index if not exists idx_gastos_costo_venta on public.gastos(es_costo_venta);


-- ------------------------------------------------------------
-- Tabla: documentos_soporte
-- Art. 55 Resolucion DIAN 000042 de 2020
-- Documento soporte en adquisiciones con no obligados a facturar
-- ------------------------------------------------------------
create table if not exists public.documentos_soporte (
  id                     uuid primary key default gen_random_uuid(),
  numero                 text not null unique,
  fecha                  date not null default current_date,

  -- Tercero (persona no obligada a facturar)
  tercero_nombre         text not null,
  tercero_tipo_documento text not null default 'CC'
                           check (tercero_tipo_documento in ('CC','CE','NIT','PASAPORTE','PEP')),
  tercero_documento      text not null,
  tercero_direccion      text,
  tercero_telefono       text,
  tercero_ciudad         text,

  -- Operacion
  concepto               text not null,
  cantidad               numeric(12,2) not null default 1,
  valor_unitario         numeric(15,2) not null,
  subtotal               numeric(15,2) not null default 0,

  -- Vinculos
  cotizacion_id          uuid references public.cotizaciones(id) on delete set null,
  gasto_id               uuid references public.gastos(id) on delete set null,

  -- Meta
  observaciones          text,
  pdf_url                text,
  creado_por_id          uuid,
  creado_por_nombre      text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.documentos_soporte is
  'Documento soporte en adquisiciones con no obligados a facturar. Lo emite Abastecer como comprador para poder deducir el gasto.';

create index if not exists idx_ds_cotizacion on public.documentos_soporte(cotizacion_id);
create index if not exists idx_ds_gasto      on public.documentos_soporte(gasto_id);
create index if not exists idx_ds_fecha      on public.documentos_soporte(fecha desc);
create index if not exists idx_ds_tercero    on public.documentos_soporte(tercero_documento);

-- Vinculo inverso desde gastos
alter table public.gastos
  add column if not exists documento_soporte_id uuid references public.documentos_soporte(id) on delete set null;


-- ------------------------------------------------------------
-- Trigger: numero DS-AAAA-NNN + subtotal
-- ------------------------------------------------------------
create or replace function public.preparar_documento_soporte()
returns trigger
language plpgsql
as $$
declare
  anio text;
  siguiente integer;
begin
  new.subtotal := round(new.cantidad * new.valor_unitario, 2);

  if new.numero is null or new.numero = '' then
    anio := to_char(coalesce(new.fecha, current_date), 'YYYY');
    select coalesce(max(
      cast(split_part(numero, '-', 3) as integer)
    ), 0) + 1
    into siguiente
    from public.documentos_soporte
    where numero like 'DS-' || anio || '-%';

    new.numero := 'DS-' || anio || '-' || lpad(siguiente::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_preparar_ds on public.documentos_soporte;
create trigger trg_preparar_ds
  before insert on public.documentos_soporte
  for each row execute function public.preparar_documento_soporte();

drop trigger if exists trg_ds_subtotal_update on public.documentos_soporte;
create trigger trg_ds_subtotal_update
  before update on public.documentos_soporte
  for each row execute function public.preparar_documento_soporte();

drop trigger if exists trg_ds_updated_at on public.documentos_soporte;
create trigger trg_ds_updated_at
  before update on public.documentos_soporte
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.documentos_soporte enable row level security;

drop policy if exists "ds_auth_all" on public.documentos_soporte;
create policy "ds_auth_all" on public.documentos_soporte
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
