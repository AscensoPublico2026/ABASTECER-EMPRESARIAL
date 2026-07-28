-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Cotizaciones a Clientes
-- Migracion 006
-- ============================================================

-- ------------------------------------------------------------
-- Tabla: cotizaciones
-- ------------------------------------------------------------
create table if not exists public.cotizaciones (
  id                  uuid primary key default gen_random_uuid(),
  numero              text not null unique,
  cliente_id          uuid references public.clientes(id),
  fecha               date not null default current_date,
  fecha_validez       date,
  subtotal            numeric(15,2) not null default 0,
  iva_total           numeric(15,2) not null default 0,
  total               numeric(15,2) not null default 0,
  costo_total         numeric(15,2) not null default 0,
  utilidad_estimada   numeric(15,2) not null default 0,
  margen_pct          numeric(5,2) not null default 0,
  estado              text not null default 'PENDIENTE'
                        check (estado in (
                          'PENDIENTE','APROBADA','RECHAZADA','VENCIDA','FACTURADA'
                        )),
  -- OC del cliente (para credito)
  oc_cliente          text,
  oc_cliente_url      text,
  -- Credito
  forma_pago          text default 'Contado',
  dias_credito        integer default 0,
  -- Descuento
  descuento_pct       numeric(5,2) default 0,
  descuento_valor     numeric(15,2) default 0,
  -- Meta
  observaciones       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_cotizaciones_cliente on public.cotizaciones(cliente_id);
create index if not exists idx_cotizaciones_estado on public.cotizaciones(estado);
create index if not exists idx_cotizaciones_fecha on public.cotizaciones(fecha desc);


-- ------------------------------------------------------------
-- Tabla: cotizacion_items
-- ------------------------------------------------------------
create table if not exists public.cotizacion_items (
  id                uuid primary key default gen_random_uuid(),
  cotizacion_id     uuid not null references public.cotizaciones(id) on delete cascade,
  producto_id       uuid references public.productos(id),
  descripcion       text not null,
  cantidad          numeric(10,2) not null default 1,
  precio_unitario   numeric(15,2) not null,
  costo_unitario    numeric(15,2) not null default 0,
  iva_porcentaje    numeric(5,2) default 19.00,
  iva_valor         numeric(15,2) not null default 0,
  subtotal          numeric(15,2) not null default 0,
  total             numeric(15,2) not null default 0,
  utilidad          numeric(15,2) not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists idx_cotizacion_items_cot on public.cotizacion_items(cotizacion_id);
create index if not exists idx_cotizacion_items_prod on public.cotizacion_items(producto_id);


-- ------------------------------------------------------------
-- Funcion: generar numero automatico COT-AAAA-NNN
-- ------------------------------------------------------------
create or replace function public.generar_numero_cotizacion()
returns trigger
language plpgsql
as $$
declare
  anio text;
  siguiente integer;
begin
  if new.numero is null or new.numero = '' then
    anio := to_char(current_date, 'YYYY');
    select coalesce(max(
      cast(split_part(numero, '-', 3) as integer)
    ), 0) + 1
    into siguiente
    from public.cotizaciones
    where numero like 'COT-' || anio || '-%';

    new.numero := 'COT-' || anio || '-' || lpad(siguiente::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_numero_cotizacion on public.cotizaciones;
create trigger trg_numero_cotizacion
  before insert on public.cotizaciones
  for each row execute function public.generar_numero_cotizacion();


-- ------------------------------------------------------------
-- Triggers y RLS
-- ------------------------------------------------------------
drop trigger if exists trg_cotizaciones_updated_at on public.cotizaciones;
create trigger trg_cotizaciones_updated_at
  before update on public.cotizaciones
  for each row execute function public.set_updated_at();

alter table public.cotizaciones enable row level security;
alter table public.cotizacion_items enable row level security;

create policy "cotizaciones_auth_all" on public.cotizaciones
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "cotizacion_items_auth_all" on public.cotizacion_items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
