-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Ordenes de Compra a Proveedores
-- Migracion 007
-- ============================================================

-- ------------------------------------------------------------
-- Tabla: ordenes_compra (OC a proveedores)
-- ------------------------------------------------------------
create table if not exists public.ordenes_compra (
  id                  uuid primary key default gen_random_uuid(),
  numero              text not null unique,
  proveedor_id        uuid references public.proveedores(id),
  cotizacion_id       uuid references public.cotizaciones(id),
  fecha               date not null default current_date,
  fecha_entrega_esperada date,
  subtotal            numeric(15,2) not null default 0,
  iva_total           numeric(15,2) not null default 0,
  total               numeric(15,2) not null default 0,
  forma_pago          text default 'Contado',
  dias_credito        integer default 0,
  estado              text not null default 'BORRADOR'
                        check (estado in (
                          'BORRADOR','ENVIADA','CONFIRMADA','RECIBIDA_PARCIAL','RECIBIDA','PAGADA','CERRADA','ANULADA'
                        )),
  observaciones       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_oc_proveedor on public.ordenes_compra(proveedor_id);
create index if not exists idx_oc_cotizacion on public.ordenes_compra(cotizacion_id);
create index if not exists idx_oc_estado on public.ordenes_compra(estado);


-- ------------------------------------------------------------
-- Tabla: orden_compra_items
-- ------------------------------------------------------------
create table if not exists public.orden_compra_items (
  id              uuid primary key default gen_random_uuid(),
  orden_compra_id uuid not null references public.ordenes_compra(id) on delete cascade,
  producto_id     uuid references public.productos(id),
  descripcion     text not null,
  cantidad        numeric(10,2) not null default 1,
  precio_unitario numeric(15,2) not null,
  iva_porcentaje  numeric(5,2) default 19.00,
  iva_valor       numeric(15,2) not null default 0,
  subtotal        numeric(15,2) not null default 0,
  total           numeric(15,2) not null default 0,
  cantidad_recibida numeric(10,2) default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_oci_oc on public.orden_compra_items(orden_compra_id);
create index if not exists idx_oci_producto on public.orden_compra_items(producto_id);


-- ------------------------------------------------------------
-- Funcion: generar numero OC-AAAA-NNN
-- ------------------------------------------------------------
create or replace function public.generar_numero_oc()
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
    from public.ordenes_compra
    where numero like 'OC-' || anio || '-%';

    new.numero := 'OC-' || anio || '-' || lpad(siguiente::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_numero_oc on public.ordenes_compra;
create trigger trg_numero_oc
  before insert on public.ordenes_compra
  for each row execute function public.generar_numero_oc();


-- ------------------------------------------------------------
-- Triggers y RLS
-- ------------------------------------------------------------
drop trigger if exists trg_oc_updated_at on public.ordenes_compra;
create trigger trg_oc_updated_at
  before update on public.ordenes_compra
  for each row execute function public.set_updated_at();

alter table public.ordenes_compra enable row level security;
alter table public.orden_compra_items enable row level security;

create policy "oc_auth_all" on public.ordenes_compra
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "oci_auth_all" on public.orden_compra_items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
