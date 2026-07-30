-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Precios de Proveedores por Producto
-- Migracion 013
-- ============================================================
-- Permite registrar multiples precios de diferentes proveedores
-- para un mismo producto. Sirve para comparar y decidir a quien comprar.
-- ============================================================

create table if not exists public.precios_proveedor (
  id              uuid primary key default gen_random_uuid(),
  producto_id     uuid not null references public.productos(id) on delete cascade,
  proveedor_id    uuid not null references public.proveedores(id) on delete cascade,
  precio          numeric(15,2) not null,
  iva_incluido    boolean default false,
  tiempo_entrega  text,          -- Ej: "2 dias", "1 semana", "Inmediato"
  disponible      boolean default true,
  referencia_proveedor text,     -- Como lo llama el proveedor
  url_catalogo    text,          -- Link al catalogo/pagina del proveedor
  fecha_cotizacion date default current_date,
  vigente_hasta   date,          -- Hasta cuando aplica ese precio
  notas           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.precios_proveedor is 'Precios de cada proveedor para un producto. Permite comparar y elegir el mejor.';

create index if not exists idx_pp_producto on public.precios_proveedor(producto_id);
create index if not exists idx_pp_proveedor on public.precios_proveedor(proveedor_id);
create index if not exists idx_pp_precio on public.precios_proveedor(precio);

-- Trigger updated_at
drop trigger if exists trg_pp_updated_at on public.precios_proveedor;
create trigger trg_pp_updated_at
  before update on public.precios_proveedor
  for each row execute function public.set_updated_at();

-- RLS
alter table public.precios_proveedor enable row level security;
create policy "pp_auth_all" on public.precios_proveedor
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
