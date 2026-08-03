-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Asignacion de costos reales
-- Migracion 017
-- ============================================================
-- NUCLEO DEL MODELO DE COSTO (Opcion C - hibrido).
--
-- Problema que resuelve:
--   Antes el costo de una venta se tomaba del costo_promedio ponderado
--   del producto. Eso hace que la utilidad de una venta CAMBIE cada vez
--   que se compra el mismo producto a otro precio.
--
-- Solucion:
--   Cada linea de factura de compra se reparte entre:
--     - una o varias cotizaciones (destino = VENTA)
--     - inventario general        (destino = STOCK)
--   Se guarda el costo REAL pagado en esa compra. La utilidad de una
--   venta queda congelada y auditable.
--
-- costo_promedio sigue existiendo para valorar el inventario.
-- asignacion_costos manda para calcular la utilidad de una venta.
-- ============================================================

create table if not exists public.asignacion_costos (
  id                     uuid primary key default gen_random_uuid(),

  -- De donde viene el costo
  factura_compra_id      uuid not null references public.facturas_compra(id) on delete cascade,
  factura_compra_item_id uuid not null references public.factura_compra_items(id) on delete cascade,
  producto_id            uuid references public.productos(id),

  -- A donde va
  destino                text not null default 'VENTA'
                           check (destino in ('VENTA','STOCK')),
  cotizacion_id          uuid references public.cotizaciones(id) on delete set null,

  -- Cuanto y a que costo real
  cantidad               numeric(12,2) not null check (cantidad > 0),
  costo_unitario         numeric(15,2) not null default 0,
  iva_unitario           numeric(15,2) not null default 0,
  subtotal               numeric(15,2) not null default 0,
  iva_valor              numeric(15,2) not null default 0,

  notas                  text,
  created_at             timestamptz not null default now(),

  -- Si va a una venta, la cotizacion es obligatoria
  constraint chk_destino_venta
    check (destino <> 'VENTA' or cotizacion_id is not null)
);

comment on table public.asignacion_costos is
  'Reparte cada linea de compra entre ventas especificas y/o stock, guardando el costo REAL pagado. Fuente de verdad para la utilidad de una venta.';
comment on column public.asignacion_costos.destino is
  'VENTA = el costo se imputa a una cotizacion. STOCK = queda en inventario para ventas futuras.';
comment on column public.asignacion_costos.costo_unitario is
  'Precio real pagado al proveedor en ESTA compra, sin IVA. No es promedio ponderado.';

create index if not exists idx_ac_factura    on public.asignacion_costos(factura_compra_id);
create index if not exists idx_ac_item       on public.asignacion_costos(factura_compra_item_id);
create index if not exists idx_ac_cotizacion on public.asignacion_costos(cotizacion_id);
create index if not exists idx_ac_producto   on public.asignacion_costos(producto_id);
create index if not exists idx_ac_destino    on public.asignacion_costos(destino);


-- ------------------------------------------------------------
-- Trigger: calcular subtotal e iva_valor
-- ------------------------------------------------------------
create or replace function public.calcular_asignacion_costo()
returns trigger
language plpgsql
as $$
begin
  new.subtotal  := round(new.cantidad * new.costo_unitario, 2);
  new.iva_valor := round(new.cantidad * new.iva_unitario, 2);
  return new;
end;
$$;

drop trigger if exists trg_calcular_asignacion on public.asignacion_costos;
create trigger trg_calcular_asignacion
  before insert or update on public.asignacion_costos
  for each row execute function public.calcular_asignacion_costo();


-- ------------------------------------------------------------
-- Trigger: no asignar mas cantidad de la que se compro
-- ------------------------------------------------------------
create or replace function public.validar_cantidad_asignada()
returns trigger
language plpgsql
as $$
declare
  cantidad_comprada numeric;
  cantidad_asignada numeric;
begin
  select cantidad into cantidad_comprada
  from public.factura_compra_items
  where id = new.factura_compra_item_id;

  if cantidad_comprada is null then
    raise exception 'La linea de factura de compra no existe';
  end if;

  select coalesce(sum(cantidad), 0) into cantidad_asignada
  from public.asignacion_costos
  where factura_compra_item_id = new.factura_compra_item_id
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if (cantidad_asignada + new.cantidad) > cantidad_comprada then
    raise exception 'Asignacion invalida: se compraron % unidades y se intenta asignar % (ya asignadas: %)',
      cantidad_comprada, new.cantidad, cantidad_asignada;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_asignacion on public.asignacion_costos;
create trigger trg_validar_asignacion
  before insert or update on public.asignacion_costos
  for each row execute function public.validar_cantidad_asignada();


-- ------------------------------------------------------------
-- Vista: cuanto queda sin asignar de cada linea de compra
-- ------------------------------------------------------------
create or replace view public.compra_items_pendientes_asignar as
select
  fci.id                                   as factura_compra_item_id,
  fci.factura_compra_id,
  fc.numero_factura,
  fc.fecha_factura,
  p.razon_social                           as proveedor,
  fci.producto_id,
  fci.descripcion,
  fci.cantidad                             as cantidad_comprada,
  coalesce(sum(ac.cantidad), 0)            as cantidad_asignada,
  fci.cantidad - coalesce(sum(ac.cantidad), 0) as cantidad_pendiente,
  fci.precio_unitario                      as costo_unitario,
  case when fci.cantidad > 0
       then round(fci.iva_valor / fci.cantidad, 2)
       else 0 end                          as iva_unitario
from public.factura_compra_items fci
join public.facturas_compra fc on fc.id = fci.factura_compra_id
left join public.proveedores p on p.id = fc.proveedor_id
left join public.asignacion_costos ac on ac.factura_compra_item_id = fci.id
where fc.estado <> 'ANULADA'
group by fci.id, fci.factura_compra_id, fc.numero_factura, fc.fecha_factura,
         p.razon_social, fci.producto_id, fci.descripcion, fci.cantidad,
         fci.precio_unitario, fci.iva_valor;

comment on view public.compra_items_pendientes_asignar is
  'Lineas de compra con saldo sin asignar. Sirve para completar la trazabilidad.';


-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.asignacion_costos enable row level security;

drop policy if exists "ac_auth_all" on public.asignacion_costos;
create policy "ac_auth_all" on public.asignacion_costos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
