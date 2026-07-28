-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Facturas de Compra v2
-- Migracion 008
-- ============================================================
-- Vinculada a Orden de Compra. Actualiza costo promedio y stock.
-- ============================================================

-- ------------------------------------------------------------
-- Tabla: facturas_compra (factura del proveedor)
-- ------------------------------------------------------------
create table if not exists public.facturas_compra (
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

create index if not exists idx_fc_oc on public.facturas_compra(orden_compra_id);
create index if not exists idx_fc_proveedor on public.facturas_compra(proveedor_id);
create index if not exists idx_fc_estado on public.facturas_compra(estado);
create index if not exists idx_fc_fecha on public.facturas_compra(fecha_factura desc);


-- ------------------------------------------------------------
-- Tabla: factura_compra_items
-- ------------------------------------------------------------
create table if not exists public.factura_compra_items (
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

create index if not exists idx_fci_factura on public.factura_compra_items(factura_compra_id);
create index if not exists idx_fci_producto on public.factura_compra_items(producto_id);


-- ------------------------------------------------------------
-- Funcion: actualizar costo promedio ponderado y stock
-- Se ejecuta cada vez que se inserta un item de factura de compra
-- ------------------------------------------------------------
create or replace function public.actualizar_costo_promedio()
returns trigger
language plpgsql
as $$
declare
  stock_previo numeric;
  costo_previo numeric;
  nuevo_costo numeric;
begin
  -- Solo actuar si hay producto vinculado
  if new.producto_id is null then
    return new;
  end if;

  -- Obtener datos actuales del producto
  select stock_actual, costo_promedio
  into stock_previo, costo_previo
  from public.productos
  where id = new.producto_id;

  -- Calcular nuevo costo promedio ponderado
  -- Formula: (stock_actual * costo_actual + cantidad_nueva * precio_nuevo) / (stock_actual + cantidad_nueva)
  if (stock_previo + new.cantidad) > 0 then
    nuevo_costo := (stock_previo * costo_previo + new.cantidad * new.precio_unitario)
                   / (stock_previo + new.cantidad);
  else
    nuevo_costo := new.precio_unitario;
  end if;

  -- Actualizar producto: costo promedio, ultimo costo, stock
  update public.productos
  set costo_promedio = round(nuevo_costo, 2),
      ultimo_costo = new.precio_unitario,
      stock_actual = stock_actual + new.cantidad
  where id = new.producto_id;

  return new;
end;
$$;

drop trigger if exists trg_actualizar_costo on public.factura_compra_items;
create trigger trg_actualizar_costo
  after insert on public.factura_compra_items
  for each row execute function public.actualizar_costo_promedio();


-- ------------------------------------------------------------
-- Triggers y RLS
-- ------------------------------------------------------------
drop trigger if exists trg_fc_updated_at on public.facturas_compra;
create trigger trg_fc_updated_at
  before update on public.facturas_compra
  for each row execute function public.set_updated_at();

alter table public.facturas_compra enable row level security;
alter table public.factura_compra_items enable row level security;

create policy "fc_auth_all" on public.facturas_compra
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "fci_auth_all" on public.factura_compra_items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
