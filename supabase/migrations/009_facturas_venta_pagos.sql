-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Facturas de Venta + Pagos/Cobros
-- Migracion 009 (combina pasos 5/8 y 6/8 del rediseno)
-- ============================================================

-- ------------------------------------------------------------
-- Tabla: facturas_venta (vinculada a cotizacion aprobada)
-- El numero de factura se ingresa manualmente (lo da la DIAN)
-- ------------------------------------------------------------
create table if not exists public.facturas_venta (
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

comment on table public.facturas_venta is 'Facturas emitidas a clientes. Numero DIAN ingresado manual. Vinculada a cotizacion.';

create index if not exists idx_fv_cotizacion on public.facturas_venta(cotizacion_id);
create index if not exists idx_fv_cliente on public.facturas_venta(cliente_id);
create index if not exists idx_fv_estado on public.facturas_venta(estado);
create index if not exists idx_fv_fecha on public.facturas_venta(fecha desc);


-- ------------------------------------------------------------
-- Tabla: factura_venta_items
-- Hereda items de la cotizacion pero con costo real al momento de facturar
-- ------------------------------------------------------------
create table if not exists public.factura_venta_items (
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

create index if not exists idx_fvi_factura on public.factura_venta_items(factura_venta_id);
create index if not exists idx_fvi_producto on public.factura_venta_items(producto_id);


-- ------------------------------------------------------------
-- Tabla: pagos (registro de movimientos de dinero)
-- Tanto pagos A proveedores como cobros DE clientes
-- ------------------------------------------------------------
create table if not exists public.pagos (
  id                  uuid primary key default gen_random_uuid(),
  tipo                text not null check (tipo in ('PAGO_PROVEEDOR', 'COBRO_CLIENTE')),
  -- Referencia a quien
  proveedor_id        uuid references public.proveedores(id),
  cliente_id          uuid references public.clientes(id),
  -- Referencia a que factura
  factura_compra_id   uuid references public.facturas_compra(id),
  factura_venta_id    uuid references public.facturas_venta(id),
  -- Monto
  monto               numeric(15,2) not null,
  fecha               date not null default current_date,
  -- Medio
  medio_pago          text default 'Transferencia',
  referencia          text,
  banco               text,
  -- Meta
  notas               text,
  created_at          timestamptz not null default now()
);

comment on table public.pagos is 'Registro de pagos a proveedores y cobros de clientes. Cada pago se vincula a una factura.';

create index if not exists idx_pagos_tipo on public.pagos(tipo);
create index if not exists idx_pagos_proveedor on public.pagos(proveedor_id);
create index if not exists idx_pagos_cliente on public.pagos(cliente_id);
create index if not exists idx_pagos_fecha on public.pagos(fecha desc);
create index if not exists idx_pagos_fc on public.pagos(factura_compra_id);
create index if not exists idx_pagos_fv on public.pagos(factura_venta_id);


-- ------------------------------------------------------------
-- Trigger: descontar stock al facturar venta
-- ------------------------------------------------------------
create or replace function public.descontar_stock_venta()
returns trigger
language plpgsql
as $$
begin
  if new.producto_id is not null then
    update public.productos
    set stock_actual = stock_actual - new.cantidad
    where id = new.producto_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_descontar_stock on public.factura_venta_items;
create trigger trg_descontar_stock
  after insert on public.factura_venta_items
  for each row execute function public.descontar_stock_venta();


-- ------------------------------------------------------------
-- Triggers y RLS
-- ------------------------------------------------------------
drop trigger if exists trg_fv_updated_at on public.facturas_venta;
create trigger trg_fv_updated_at
  before update on public.facturas_venta
  for each row execute function public.set_updated_at();

alter table public.facturas_venta enable row level security;
alter table public.factura_venta_items enable row level security;
alter table public.pagos enable row level security;

create policy "fv_auth_all" on public.facturas_venta
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "fvi_auth_all" on public.factura_venta_items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "pagos_auth_all" on public.pagos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
