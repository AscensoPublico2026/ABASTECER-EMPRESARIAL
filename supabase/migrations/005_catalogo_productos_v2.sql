-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Catalogo de Productos v2
-- Migracion 005
-- ============================================================
-- Este es el CORAZON del sistema. Todo se vincula a productos.
-- El costo promedio se recalcula automaticamente con cada compra.
-- ============================================================

-- ------------------------------------------------------------
-- Eliminar tabla productos vieja (de migracion 003) y recrear
-- ------------------------------------------------------------
drop table if exists public.compra_items cascade;
drop table if exists public.venta_items cascade;
drop table if exists public.compras cascade;
drop table if exists public.ventas cascade;
drop table if exists public.productos cascade;


-- ------------------------------------------------------------
-- Tabla: categorias_producto
-- ------------------------------------------------------------
create table if not exists public.categorias_producto (
  id    uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  orden  integer default 0
);

insert into public.categorias_producto (nombre, orden) values
  ('EPP', 1),
  ('Dotacion', 2),
  ('Aseo', 3),
  ('Cafeteria', 4),
  ('Papeleria', 5),
  ('Identificacion', 6),
  ('Extintores', 7),
  ('Senalizacion', 8),
  ('Ferreteria', 9),
  ('Tecnologia', 10),
  ('Material electrico', 11),
  ('Otro', 99)
on conflict (nombre) do nothing;


-- ------------------------------------------------------------
-- Tabla: productos (catalogo maestro)
-- ------------------------------------------------------------
create table if not exists public.productos (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique,
  nombre              text not null,
  descripcion         text,
  categoria_id        uuid references public.categorias_producto(id),
  unidad_medida       text default 'Unidad',
  -- IVA
  iva_porcentaje      numeric(5,2) not null default 19.00,
  -- Costos (calculados automaticamente)
  costo_promedio      numeric(15,2) not null default 0,
  ultimo_costo        numeric(15,2) default 0,
  -- Precios
  margen_minimo_pct   numeric(5,2) not null default 20.00,
  precio_sugerido     numeric(15,2) default 0,
  precio_lista        numeric(15,2) default 0,
  -- Stock
  stock_actual        numeric(10,2) not null default 0,
  stock_minimo        numeric(10,2) default 0,
  -- Estado
  activo              boolean not null default true,
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.productos is 'Catalogo maestro. El costo_promedio se recalcula con cada compra. El precio_sugerido = costo / (1 - margen_minimo/100).';

create index if not exists idx_productos_codigo on public.productos(codigo);
create index if not exists idx_productos_nombre on public.productos(nombre);
create index if not exists idx_productos_categoria on public.productos(categoria_id);
create index if not exists idx_productos_activo on public.productos(activo);


-- ------------------------------------------------------------
-- Tabla: producto_nombres_proveedor (equivalencias de nombre)
-- El proveedor llama "Gafa B105", nosotros "Gafa seguridad transparente"
-- ------------------------------------------------------------
create table if not exists public.producto_nombres_proveedor (
  id            uuid primary key default gen_random_uuid(),
  producto_id   uuid not null references public.productos(id) on delete cascade,
  proveedor_id  uuid not null references public.proveedores(id) on delete cascade,
  nombre_proveedor  text not null,
  ref_proveedor     text,
  created_at    timestamptz not null default now(),
  unique(producto_id, proveedor_id)
);

comment on table public.producto_nombres_proveedor is 'Equivalencia de nombres: como llama cada proveedor a nuestro producto.';


-- ------------------------------------------------------------
-- Tabla: precios_cliente (precio especial por cliente)
-- ------------------------------------------------------------
create table if not exists public.precios_cliente (
  id            uuid primary key default gen_random_uuid(),
  producto_id   uuid not null references public.productos(id) on delete cascade,
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  precio        numeric(15,2) not null,
  notas         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(producto_id, cliente_id)
);

comment on table public.precios_cliente is 'Precios especiales por cliente. Si existe, se usa en vez del precio_lista.';


-- ------------------------------------------------------------
-- Funcion: generar codigo automatico PRD-NNN
-- ------------------------------------------------------------
create or replace function public.generar_codigo_producto()
returns trigger
language plpgsql
as $$
declare
  siguiente integer;
begin
  if new.codigo is null or new.codigo = '' then
    select coalesce(max(
      cast(regexp_replace(codigo, '[^0-9]', '', 'g') as integer)
    ), 0) + 1
    into siguiente
    from public.productos
    where codigo ~ '^PRD-[0-9]+$';

    new.codigo := 'PRD-' || lpad(siguiente::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_codigo_producto on public.productos;
create trigger trg_codigo_producto
  before insert on public.productos
  for each row execute function public.generar_codigo_producto();


-- ------------------------------------------------------------
-- Funcion: recalcular precio sugerido cuando cambia costo o margen
-- ------------------------------------------------------------
create or replace function public.recalcular_precio_sugerido()
returns trigger
language plpgsql
as $$
begin
  if new.costo_promedio > 0 and new.margen_minimo_pct > 0 then
    new.precio_sugerido := round(
      new.costo_promedio / (1 - new.margen_minimo_pct / 100), 2
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_precio_sugerido on public.productos;
create trigger trg_precio_sugerido
  before insert or update of costo_promedio, margen_minimo_pct on public.productos
  for each row execute function public.recalcular_precio_sugerido();


-- ------------------------------------------------------------
-- Triggers: updated_at
-- ------------------------------------------------------------
drop trigger if exists trg_productos_updated_at on public.productos;
create trigger trg_productos_updated_at
  before update on public.productos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_precios_cliente_updated_at on public.precios_cliente;
create trigger trg_precios_cliente_updated_at
  before update on public.precios_cliente
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.categorias_producto enable row level security;
alter table public.productos enable row level security;
alter table public.producto_nombres_proveedor enable row level security;
alter table public.precios_cliente enable row level security;

create policy "categorias_auth_all" on public.categorias_producto
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "productos_v2_auth_all" on public.productos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "nombres_prov_auth_all" on public.producto_nombres_proveedor
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "precios_cliente_auth_all" on public.precios_cliente
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
