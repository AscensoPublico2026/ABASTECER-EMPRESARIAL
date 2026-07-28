-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Modulo: Compras
-- Migracion 003
-- ============================================================

-- ------------------------------------------------------------
-- Tabla: productos (catalogo maestro)
-- ------------------------------------------------------------
create table if not exists public.productos (
  id                uuid primary key default gen_random_uuid(),
  nombre            text        not null,
  categoria         text,
  unidad_medida     text        default 'Unidad',
  iva_porcentaje    numeric(5,2) default 19.00,
  margen_minimo_pct numeric(5,2) default 20.00,
  precio_sugerido   numeric(15,2),
  activo            boolean     not null default true,
  notas             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.productos is 'Catalogo maestro de productos. Cada producto tiene su tasa de IVA y margen minimo.';
create index if not exists idx_productos_categoria on public.productos(categoria);
create index if not exists idx_productos_nombre on public.productos(nombre);


-- ------------------------------------------------------------
-- Tabla: compras (factura de compra / encabezado)
-- ------------------------------------------------------------
create table if not exists public.compras (
  id                uuid primary key default gen_random_uuid(),
  proveedor_id      uuid        references public.proveedores(id),
  numero_factura    text,
  fecha             date        not null default current_date,
  subtotal          numeric(15,2) not null default 0,
  iva_total         numeric(15,2) not null default 0,
  retencion_total   numeric(15,2) not null default 0,
  total             numeric(15,2) not null default 0,
  forma_pago        text        default 'Contado',
  dias_credito      integer     default 0,
  fecha_vencimiento date,
  estado            text        not null default 'PAGADA'
                      check (estado in ('PAGADA', 'POR_PAGAR', 'VENCIDA', 'ANULADA')),
  soporte_url       text,
  notas             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.compras is 'Facturas de compra a proveedores. Cada compra puede tener multiples items.';
create index if not exists idx_compras_proveedor on public.compras(proveedor_id);
create index if not exists idx_compras_fecha on public.compras(fecha desc);
create index if not exists idx_compras_estado on public.compras(estado);


-- ------------------------------------------------------------
-- Tabla: compra_items (lineas de la factura de compra)
-- ------------------------------------------------------------
create table if not exists public.compra_items (
  id              uuid primary key default gen_random_uuid(),
  compra_id       uuid        not null references public.compras(id) on delete cascade,
  producto_id     uuid        references public.productos(id),
  descripcion     text        not null,
  cantidad        numeric(10,2) not null default 1,
  precio_unitario numeric(15,2) not null,
  iva_porcentaje  numeric(5,2)  default 19.00,
  iva_valor       numeric(15,2) not null default 0,
  subtotal        numeric(15,2) not null default 0,
  total           numeric(15,2) not null default 0,
  created_at      timestamptz not null default now()
);

comment on table public.compra_items is 'Items individuales de una factura de compra.';
create index if not exists idx_compra_items_compra on public.compra_items(compra_id);
create index if not exists idx_compra_items_producto on public.compra_items(producto_id);


-- ------------------------------------------------------------
-- Vista: resumen_compras
-- ------------------------------------------------------------
create or replace view public.resumen_compras as
select
  c.id,
  c.fecha,
  c.numero_factura,
  c.subtotal,
  c.iva_total,
  c.total,
  c.forma_pago,
  c.estado,
  c.dias_credito,
  c.fecha_vencimiento,
  p.razon_social as proveedor_nombre,
  p.nit as proveedor_nit,
  (select count(*) from public.compra_items ci where ci.compra_id = c.id) as num_items
from public.compras c
left join public.proveedores p on p.id = c.proveedor_id;


-- ------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------
drop trigger if exists trg_productos_updated_at on public.productos;
create trigger trg_productos_updated_at
  before update on public.productos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_compras_updated_at on public.compras;
create trigger trg_compras_updated_at
  before update on public.compras
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.productos    enable row level security;
alter table public.compras      enable row level security;
alter table public.compra_items enable row level security;

drop policy if exists "productos_auth_all" on public.productos;
create policy "productos_auth_all" on public.productos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "compras_auth_all" on public.compras;
create policy "compras_auth_all" on public.compras
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "compra_items_auth_all" on public.compra_items;
create policy "compra_items_auth_all" on public.compra_items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
