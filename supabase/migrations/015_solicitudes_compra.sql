-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Solicitudes de Compra
-- Migracion 015
-- ============================================================
-- Se generan automaticamente cuando una cotizacion pasa a EN_ALISTAMIENTO
-- y los items no tienen stock suficiente.
-- Se agrupan por producto para comprar en volumen.
-- ============================================================

create table if not exists public.solicitudes_compra (
  id              uuid primary key default gen_random_uuid(),
  producto_id     uuid not null references public.productos(id) on delete cascade,
  cotizacion_id   uuid not null references public.cotizaciones(id) on delete cascade,
  cantidad_requerida integer not null,
  cantidad_en_stock integer not null default 0,
  cantidad_a_comprar integer not null,
  estado          text not null default 'PENDIENTE'
                    check (estado in ('PENDIENTE', 'EN_COTIZACION', 'COMPRADO', 'CANCELADO')),
  prioridad       text default 'MEDIA'
                    check (prioridad in ('ALTA', 'MEDIA', 'BAJA')),
  fecha_necesidad date,
  notas           text,
  created_at      timestamptz not null default now()
);

comment on table public.solicitudes_compra is 'Solicitudes de compra generadas automaticamente al pasar cotizacion a EN_ALISTAMIENTO cuando no hay stock suficiente.';

create index if not exists idx_sc_producto on public.solicitudes_compra(producto_id);
create index if not exists idx_sc_cotizacion on public.solicitudes_compra(cotizacion_id);
create index if not exists idx_sc_estado on public.solicitudes_compra(estado);

alter table public.solicitudes_compra enable row level security;
create policy "sc_auth_all" on public.solicitudes_compra
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
