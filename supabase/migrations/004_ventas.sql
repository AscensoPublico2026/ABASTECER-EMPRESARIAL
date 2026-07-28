-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Modulo: Ventas
-- Migracion 004
-- ============================================================

-- ------------------------------------------------------------
-- Tabla: ventas (cotizacion / factura de venta)
-- ------------------------------------------------------------
create table if not exists public.ventas (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid        references public.clientes(id),
  numero_cotizacion   text,
  numero_factura      text,
  fecha               date        not null default current_date,
  subtotal            numeric(15,2) not null default 0,
  iva_total           numeric(15,2) not null default 0,
  total               numeric(15,2) not null default 0,
  costo_total         numeric(15,2) not null default 0,
  utilidad_bruta      numeric(15,2) not null default 0,
  margen_pct          numeric(5,2)  not null default 0,
  forma_pago          text        default 'Contado',
  dias_credito        integer     default 0,
  fecha_vencimiento   date,
  estado              text        not null default 'COTIZACION'
                        check (estado in (
                          'COTIZACION','APROBADA','FACTURADA','COBRADA','ANULADA'
                        )),
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.ventas is 'Cotizaciones y facturas de venta. Incluye calculo de utilidad por operacion.';
create index if not exists idx_ventas_cliente on public.ventas(cliente_id);
create index if not exists idx_ventas_fecha on public.ventas(fecha desc);
create index if not exists idx_ventas_estado on public.ventas(estado);


-- ------------------------------------------------------------
-- Tabla: venta_items (lineas de la venta)
-- ------------------------------------------------------------
create table if not exists public.venta_items (
  id              uuid primary key default gen_random_uuid(),
  venta_id        uuid        not null references public.ventas(id) on delete cascade,
  producto_id     uuid        references public.productos(id),
  descripcion     text        not null,
  cantidad        numeric(10,2) not null default 1,
  precio_unitario numeric(15,2) not null,
  costo_unitario  numeric(15,2) not null default 0,
  iva_porcentaje  numeric(5,2)  default 19.00,
  iva_valor       numeric(15,2) not null default 0,
  subtotal        numeric(15,2) not null default 0,
  total           numeric(15,2) not null default 0,
  utilidad        numeric(15,2) not null default 0,
  created_at      timestamptz not null default now()
);

comment on table public.venta_items is 'Items de venta con costo y utilidad por linea.';
create index if not exists idx_venta_items_venta on public.venta_items(venta_id);


-- ------------------------------------------------------------
-- Vista: resumen_ventas
-- ------------------------------------------------------------
create or replace view public.resumen_ventas as
select
  v.id,
  v.fecha,
  v.numero_cotizacion,
  v.numero_factura,
  v.subtotal,
  v.iva_total,
  v.total,
  v.costo_total,
  v.utilidad_bruta,
  v.margen_pct,
  v.forma_pago,
  v.estado,
  v.dias_credito,
  v.fecha_vencimiento,
  c.razon_social as cliente_nombre,
  (select count(*) from public.venta_items vi where vi.venta_id = v.id) as num_items
from public.ventas v
left join public.clientes c on c.id = v.cliente_id;


-- ------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------
drop trigger if exists trg_ventas_updated_at on public.ventas;
create trigger trg_ventas_updated_at
  before update on public.ventas
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.ventas      enable row level security;
alter table public.venta_items enable row level security;

drop policy if exists "ventas_auth_all" on public.ventas;
create policy "ventas_auth_all" on public.ventas
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "venta_items_auth_all" on public.venta_items;
create policy "venta_items_auth_all" on public.venta_items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
