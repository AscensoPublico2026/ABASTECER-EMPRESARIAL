-- ============================================================
-- ABASTECER EMPRESARIAL SAS
-- SCRIPT UNICO: Crea TODA la base de datos desde cero
-- ============================================================
-- INSTRUCCIONES:
-- 1. Abre Supabase → SQL Editor → New query
-- 2. Pega TODO este archivo
-- 3. Click en "Run"
-- 4. Listo. Recarga el ERP.
-- ============================================================


-- ============================================================
-- PASO 0: Limpiar si existian tablas viejas (no falla si no existen)
-- ============================================================
drop table if exists public.pagos cascade;
drop table if exists public.factura_venta_items cascade;
drop table if exists public.facturas_venta cascade;
drop table if exists public.factura_compra_items cascade;
drop table if exists public.facturas_compra cascade;
drop table if exists public.orden_compra_items cascade;
drop table if exists public.ordenes_compra cascade;
drop table if exists public.cotizacion_items cascade;
drop table if exists public.cotizaciones cascade;
drop table if exists public.precios_cliente cascade;
drop table if exists public.producto_nombres_proveedor cascade;
drop table if exists public.productos cascade;
drop table if exists public.categorias_producto cascade;
drop table if exists public.compra_items cascade;
drop table if exists public.venta_items cascade;
drop table if exists public.compras cascade;
drop table if exists public.ventas cascade;
drop table if exists public.movimientos_socio cascade;
drop table if exists public.socios cascade;
drop table if exists public.clientes cascade;
drop table if exists public.proveedores cascade;


-- ============================================================
-- PASO 1: Funcion auxiliar updated_at (usada por todos los triggers)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- PASO 2: SOCIOS Y CAPITAL (Migracion 001)
-- ============================================================
create table public.socios (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  documento         text,
  email             text,
  telefono          text,
  cargo             text,
  participacion_pct numeric(5,2) not null default 0
                      check (participacion_pct >= 0 and participacion_pct <= 100),
  activo            boolean not null default true,
  notas             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.movimientos_socio (
  id          uuid primary key default gen_random_uuid(),
  socio_id    uuid not null references public.socios(id) on delete cascade,
  tipo        text not null check (tipo in (
                'APORTE_CAPITAL','PRESTAMO_SOCIO','DEVOLUCION_PRESTAMO',
                'DIVIDENDO','REMUNERACION','REEMBOLSO'
              )),
  monto       numeric(15,2) not null check (monto > 0),
  fecha       date not null default current_date,
  descripcion text,
  soporte_url text,
  created_at  timestamptz not null default now()
);

create index idx_movimientos_socio_socio on public.movimientos_socio(socio_id);

create or replace view public.resumen_socios as
select
  s.id, s.nombre, s.cargo, s.participacion_pct, s.activo,
  coalesce(sum(m.monto) filter (where m.tipo = 'APORTE_CAPITAL'), 0) as capital_aportado,
  coalesce(sum(m.monto) filter (where m.tipo = 'PRESTAMO_SOCIO'), 0) as prestamos_otorgados,
  coalesce(sum(m.monto) filter (where m.tipo = 'DEVOLUCION_PRESTAMO'), 0) as prestamos_devueltos,
  coalesce(sum(m.monto) filter (where m.tipo = 'PRESTAMO_SOCIO'), 0)
    - coalesce(sum(m.monto) filter (where m.tipo = 'DEVOLUCION_PRESTAMO'), 0) as prestamo_pendiente,
  coalesce(sum(m.monto) filter (where m.tipo = 'DIVIDENDO'), 0) as dividendos_recibidos,
  coalesce(sum(m.monto) filter (where m.tipo = 'REMUNERACION'), 0) as remuneracion_total,
  coalesce(sum(m.monto) filter (where m.tipo = 'REEMBOLSO'), 0) as reembolsos_total
from public.socios s
left join public.movimientos_socio m on m.socio_id = s.id
group by s.id, s.nombre, s.cargo, s.participacion_pct, s.activo;

create trigger trg_socios_updated_at before update on public.socios
  for each row execute function public.set_updated_at();

-- Datos semilla: Julio y Laura 50/50
insert into public.socios (nombre, cargo, participacion_pct, activo, notas) values
  ('Julio', 'Socio fundador', 50.00, true, 'Socio fundador. Desarrollo del ERP y estrategia.'),
  ('Laura', 'Socia fundadora', 50.00, true, 'Socia fundadora. Operaciones y estrategia comercial.');


-- ============================================================
-- PASO 3: PROVEEDORES Y CLIENTES (Migracion 002)
-- ============================================================
create table public.proveedores (
  id                  uuid primary key default gen_random_uuid(),
  razon_social        text not null,
  nit                 text,
  nombre_comercial    text,
  contacto_nombre     text,
  contacto_telefono   text,
  contacto_email      text,
  contacto_cargo      text,
  direccion           text,
  ciudad              text,
  departamento        text,
  categorias          text[] default '{}',
  condiciones_pago    text default 'Contado',
  dias_credito        integer default 0,
  descuento_volumen   text,
  tiempo_entrega      text,
  pedido_minimo       numeric(15,2),
  banco               text,
  tipo_cuenta         text,
  numero_cuenta       text,
  estado              text not null default 'ACTIVO'
                        check (estado in ('ACTIVO', 'INACTIVO', 'EN_EVALUACION')),
  calificacion        integer default 0,
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.clientes (
  id                  uuid primary key default gen_random_uuid(),
  razon_social        text not null,
  nit                 text,
  nombre_comercial    text,
  contacto_nombre     text,
  contacto_telefono   text,
  contacto_email      text,
  contacto_cargo      text,
  contacto_pagos_nombre   text,
  contacto_pagos_telefono text,
  contacto_pagos_email    text,
  direccion_entrega   text,
  ciudad              text,
  departamento        text,
  sector              text,
  tamano              text check (tamano is null or tamano in ('MICRO','PEQUENA','MEDIANA','GRANDE')),
  categorias_interes  text[] default '{}',
  tiene_credito       boolean not null default false,
  dias_credito        integer default 0,
  cupo_credito        numeric(15,2) default 0,
  estado              text not null default 'PROSPECTO'
                        check (estado in ('PROSPECTO','ACTIVO','CREDITO_APROBADO','INACTIVO','MOROSO')),
  origen              text,
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_proveedores_updated_at before update on public.proveedores
  for each row execute function public.set_updated_at();
create trigger trg_clientes_updated_at before update on public.clientes
  for each row execute function public.set_updated_at();

-- Dato semilla: Evolti como primer cliente
insert into public.clientes (razon_social, nombre_comercial, estado, sector, tamano, categorias_interes, origen, notas) values
  ('Evolti SAS', 'Evolti', 'ACTIVO', 'Servicios', 'MEDIANA',
   array['EPP', 'Dotacion', 'Identificacion'],
   'Relacion laboral directa',
   'Primer cliente. Julio y Laura trabajan ahi actualmente.');


-- ============================================================
-- PASO 4: CATALOGO DE PRODUCTOS (Migracion 005)
-- ============================================================
create table public.categorias_producto (
  id    uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  orden  integer default 0
);

insert into public.categorias_producto (nombre, orden) values
  ('EPP', 1), ('Dotacion', 2), ('Aseo', 3), ('Cafeteria', 4),
  ('Papeleria', 5), ('Identificacion', 6), ('Extintores', 7),
  ('Senalizacion', 8), ('Ferreteria', 9), ('Tecnologia', 10),
  ('Material electrico', 11), ('Otro', 99);

create table public.productos (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique,
  nombre              text not null,
  descripcion         text,
  categoria_id        uuid references public.categorias_producto(id),
  unidad_medida       text default 'Unidad',
  iva_porcentaje      numeric(5,2) not null default 19.00,
  costo_promedio      numeric(15,2) not null default 0,
  ultimo_costo        numeric(15,2) default 0,
  margen_minimo_pct   numeric(5,2) not null default 20.00,
  precio_sugerido     numeric(15,2) default 0,
  precio_lista        numeric(15,2) default 0,
  stock_actual        numeric(10,2) not null default 0,
  stock_minimo        numeric(10,2) default 0,
  activo              boolean not null default true,
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_productos_codigo on public.productos(codigo);
create index idx_productos_nombre on public.productos(nombre);

create table public.producto_nombres_proveedor (
  id            uuid primary key default gen_random_uuid(),
  producto_id   uuid not null references public.productos(id) on delete cascade,
  proveedor_id  uuid not null references public.proveedores(id) on delete cascade,
  nombre_proveedor  text not null,
  ref_proveedor     text,
  created_at    timestamptz not null default now(),
  unique(producto_id, proveedor_id)
);

create table public.precios_cliente (
  id            uuid primary key default gen_random_uuid(),
  producto_id   uuid not null references public.productos(id) on delete cascade,
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  precio        numeric(15,2) not null,
  notas         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(producto_id, cliente_id)
);

-- Trigger: codigo automatico PRD-0001
create or replace function public.generar_codigo_producto()
returns trigger language plpgsql as $$
declare siguiente integer;
begin
  if new.codigo is null or new.codigo = '' then
    select coalesce(max(cast(regexp_replace(codigo, '[^0-9]', '', 'g') as integer)), 0) + 1
    into siguiente from public.productos where codigo ~ '^PRD-[0-9]+$';
    new.codigo := 'PRD-' || lpad(siguiente::text, 4, '0');
  end if;
  return new;
end; $$;

create trigger trg_codigo_producto before insert on public.productos
  for each row execute function public.generar_codigo_producto();

-- Trigger: precio sugerido automatico
create or replace function public.recalcular_precio_sugerido()
returns trigger language plpgsql as $$
begin
  if new.costo_promedio > 0 and new.margen_minimo_pct > 0 then
    new.precio_sugerido := round(new.costo_promedio / (1 - new.margen_minimo_pct / 100), 2);
  end if;
  return new;
end; $$;

create trigger trg_precio_sugerido before insert or update of costo_promedio, margen_minimo_pct on public.productos
  for each row execute function public.recalcular_precio_sugerido();

create trigger trg_productos_updated_at before update on public.productos
  for each row execute function public.set_updated_at();


-- ============================================================
-- PASO 5: COTIZACIONES (Migracion 006)
-- ============================================================
create table public.cotizaciones (
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
                        check (estado in ('PENDIENTE','APROBADA','RECHAZADA','VENCIDA','FACTURADA')),
  oc_cliente          text,
  oc_cliente_url      text,
  forma_pago          text default 'Contado',
  dias_credito        integer default 0,
  descuento_pct       numeric(5,2) default 0,
  descuento_valor     numeric(15,2) default 0,
  observaciones       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.cotizacion_items (
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

-- Trigger: numero automatico COT-2026-001
create or replace function public.generar_numero_cotizacion()
returns trigger language plpgsql as $$
declare anio text; siguiente integer;
begin
  if new.numero is null or new.numero = '' then
    anio := to_char(current_date, 'YYYY');
    select coalesce(max(cast(split_part(numero, '-', 3) as integer)), 0) + 1
    into siguiente from public.cotizaciones where numero like 'COT-' || anio || '-%';
    new.numero := 'COT-' || anio || '-' || lpad(siguiente::text, 3, '0');
  end if;
  return new;
end; $$;

create trigger trg_numero_cotizacion before insert on public.cotizaciones
  for each row execute function public.generar_numero_cotizacion();

create trigger trg_cotizaciones_updated_at before update on public.cotizaciones
  for each row execute function public.set_updated_at();


-- ============================================================
-- PASO 6: ORDENES DE COMPRA (Migracion 007)
-- ============================================================
create table public.ordenes_compra (
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
                        check (estado in ('BORRADOR','ENVIADA','CONFIRMADA','RECIBIDA_PARCIAL','RECIBIDA','PAGADA','CERRADA','ANULADA')),
  observaciones       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.orden_compra_items (
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

-- Trigger: numero OC-2026-001
create or replace function public.generar_numero_oc()
returns trigger language plpgsql as $$
declare anio text; siguiente integer;
begin
  if new.numero is null or new.numero = '' then
    anio := to_char(current_date, 'YYYY');
    select coalesce(max(cast(split_part(numero, '-', 3) as integer)), 0) + 1
    into siguiente from public.ordenes_compra where numero like 'OC-' || anio || '-%';
    new.numero := 'OC-' || anio || '-' || lpad(siguiente::text, 3, '0');
  end if;
  return new;
end; $$;

create trigger trg_numero_oc before insert on public.ordenes_compra
  for each row execute function public.generar_numero_oc();

create trigger trg_oc_updated_at before update on public.ordenes_compra
  for each row execute function public.set_updated_at();


-- ============================================================
-- PASO 7: FACTURAS DE COMPRA (Migracion 008)
-- ============================================================
create table public.facturas_compra (
  id                  uuid primary key default gen_random_uuid(),
  orden_compra_id     uuid references public.ordenes_compra(id),
  proveedor_id        uuid references public.proveedores(id),
  numero_factura      text,
  fecha_factura       date not null default current_date,
  fecha_vencimiento   date,
  subtotal            numeric(15,2) not null default 0,
  iva_total           numeric(15,2) not null default 0,
  retencion_total     numeric(15,2) not null default 0,
  total               numeric(15,2) not null default 0,
  forma_pago          text default 'Contado',
  dias_credito        integer default 0,
  estado              text not null default 'REGISTRADA'
                        check (estado in ('REGISTRADA','PAGADA','ANULADA')),
  soporte_url         text,
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.factura_compra_items (
  id                  uuid primary key default gen_random_uuid(),
  factura_compra_id   uuid not null references public.facturas_compra(id) on delete cascade,
  producto_id         uuid references public.productos(id),
  descripcion         text not null,
  cantidad            numeric(10,2) not null default 1,
  precio_unitario     numeric(15,2) not null,
  iva_porcentaje      numeric(5,2) default 19.00,
  iva_valor           numeric(15,2) not null default 0,
  subtotal            numeric(15,2) not null default 0,
  total               numeric(15,2) not null default 0,
  created_at          timestamptz not null default now()
);

-- TRIGGER MAGICO: actualiza costo promedio ponderado + stock
create or replace function public.actualizar_costo_promedio()
returns trigger language plpgsql as $$
declare stock_previo numeric; costo_previo numeric; nuevo_costo numeric;
begin
  if new.producto_id is null then return new; end if;
  select stock_actual, costo_promedio into stock_previo, costo_previo
  from public.productos where id = new.producto_id;
  if (stock_previo + new.cantidad) > 0 then
    nuevo_costo := (stock_previo * costo_previo + new.cantidad * new.precio_unitario) / (stock_previo + new.cantidad);
  else
    nuevo_costo := new.precio_unitario;
  end if;
  update public.productos
  set costo_promedio = round(nuevo_costo, 2), ultimo_costo = new.precio_unitario, stock_actual = stock_actual + new.cantidad
  where id = new.producto_id;
  return new;
end; $$;

create trigger trg_actualizar_costo after insert on public.factura_compra_items
  for each row execute function public.actualizar_costo_promedio();

create trigger trg_fc_updated_at before update on public.facturas_compra
  for each row execute function public.set_updated_at();


-- ============================================================
-- PASO 8: FACTURAS DE VENTA + PAGOS (Migracion 009)
-- ============================================================
create table public.facturas_venta (
  id                  uuid primary key default gen_random_uuid(),
  cotizacion_id       uuid references public.cotizaciones(id),
  cliente_id          uuid references public.clientes(id),
  numero_factura_dian text,
  fecha               date not null default current_date,
  fecha_vencimiento   date,
  subtotal            numeric(15,2) not null default 0,
  iva_total           numeric(15,2) not null default 0,
  retencion_total     numeric(15,2) not null default 0,
  total               numeric(15,2) not null default 0,
  costo_total         numeric(15,2) not null default 0,
  utilidad            numeric(15,2) not null default 0,
  margen_pct          numeric(5,2) not null default 0,
  forma_pago          text default 'Contado',
  dias_credito        integer default 0,
  estado              text not null default 'EMITIDA'
                        check (estado in ('EMITIDA','COBRADA','PARCIAL','ANULADA')),
  oc_cliente          text,
  oc_cliente_url      text,
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.factura_venta_items (
  id                  uuid primary key default gen_random_uuid(),
  factura_venta_id    uuid not null references public.facturas_venta(id) on delete cascade,
  producto_id         uuid references public.productos(id),
  descripcion         text not null,
  cantidad            numeric(10,2) not null default 1,
  precio_unitario     numeric(15,2) not null,
  costo_unitario      numeric(15,2) not null default 0,
  iva_porcentaje      numeric(5,2) default 19.00,
  iva_valor           numeric(15,2) not null default 0,
  subtotal            numeric(15,2) not null default 0,
  total               numeric(15,2) not null default 0,
  utilidad            numeric(15,2) not null default 0,
  created_at          timestamptz not null default now()
);

-- Trigger: descontar stock al facturar
create or replace function public.descontar_stock_venta()
returns trigger language plpgsql as $$
begin
  if new.producto_id is not null then
    update public.productos set stock_actual = stock_actual - new.cantidad where id = new.producto_id;
  end if;
  return new;
end; $$;

create trigger trg_descontar_stock after insert on public.factura_venta_items
  for each row execute function public.descontar_stock_venta();

create table public.pagos (
  id                  uuid primary key default gen_random_uuid(),
  tipo                text not null check (tipo in ('PAGO_PROVEEDOR', 'COBRO_CLIENTE')),
  proveedor_id        uuid references public.proveedores(id),
  cliente_id          uuid references public.clientes(id),
  factura_compra_id   uuid references public.facturas_compra(id),
  factura_venta_id    uuid references public.facturas_venta(id),
  monto               numeric(15,2) not null,
  fecha               date not null default current_date,
  medio_pago          text default 'Transferencia',
  referencia          text,
  banco               text,
  notas               text,
  created_at          timestamptz not null default now()
);

create trigger trg_fv_updated_at before update on public.facturas_venta
  for each row execute function public.set_updated_at();


-- ============================================================
-- PASO 9: ROW LEVEL SECURITY (todo de una)
-- ============================================================
alter table public.socios enable row level security;
alter table public.movimientos_socio enable row level security;
alter table public.proveedores enable row level security;
alter table public.clientes enable row level security;
alter table public.categorias_producto enable row level security;
alter table public.productos enable row level security;
alter table public.producto_nombres_proveedor enable row level security;
alter table public.precios_cliente enable row level security;
alter table public.cotizaciones enable row level security;
alter table public.cotizacion_items enable row level security;
alter table public.ordenes_compra enable row level security;
alter table public.orden_compra_items enable row level security;
alter table public.facturas_compra enable row level security;
alter table public.factura_compra_items enable row level security;
alter table public.facturas_venta enable row level security;
alter table public.factura_venta_items enable row level security;
alter table public.pagos enable row level security;

-- Politica unica: usuarios autenticados tienen acceso total
create policy "auth_all_socios" on public.socios for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_movimientos_socio" on public.movimientos_socio for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_proveedores" on public.proveedores for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_clientes" on public.clientes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_categorias_producto" on public.categorias_producto for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_productos" on public.productos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_producto_nombres_proveedor" on public.producto_nombres_proveedor for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_precios_cliente" on public.precios_cliente for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_cotizaciones" on public.cotizaciones for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_cotizacion_items" on public.cotizacion_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_ordenes_compra" on public.ordenes_compra for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_orden_compra_items" on public.orden_compra_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_facturas_compra" on public.facturas_compra for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_factura_compra_items" on public.factura_compra_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_facturas_venta" on public.facturas_venta for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_factura_venta_items" on public.factura_venta_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_pagos" on public.pagos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');


-- ============================================================
-- LISTO! La base de datos esta completa.
-- Datos creados: Julio (50%), Laura (50%), Evolti (cliente), 12 categorias.
-- ============================================================
