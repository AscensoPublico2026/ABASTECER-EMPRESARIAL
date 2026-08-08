-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Trazabilidad lee del reparto de gastos
-- Migracion 036
-- ============================================================
-- POR QUE
-- trazabilidad_venta hace JOIN por gastos.cotizacion_id, que es el campo
-- viejo que apunta a UNA sola venta. Un gasto repartido entre 3 ventas
-- solo aparece en la primera: las otras dos no lo muestran en la historia
-- de la venta, ni en el centro de documentos, ni en el informe impreso.
--
-- El "me queda limpio" de analisis_venta SI se calcula bien (la 035
-- arreglo el CTE), pero la HISTORIA y el DETALLE visual estaban rotos.
--
-- Cierra la pestana del ERP antes de correrla.
-- ============================================================

drop view if exists public.trazabilidad_venta;

create or replace view public.trazabilidad_venta as
-- 1. La cotizacion misma
select
  c.id                as cotizacion_id,
  c.numero,
  'COTIZACION'        as documento_tipo,
  c.numero            as documento_numero,
  c.fecha             as documento_fecha,
  c.total             as valor,
  c.estado            as estado,
  null::uuid          as documento_id
from public.cotizaciones c

union all
-- 2. Remisiones
select r.cotizacion_id, c.numero, 'REMISION', r.numero, r.fecha, null, null, r.id
from public.remisiones r join public.cotizaciones c on c.id = r.cotizacion_id

union all
-- 3. Facturas de venta
select fv.cotizacion_id, c.numero, 'FACTURA_VENTA', fv.numero_factura_dian, fv.fecha, fv.total, fv.estado, fv.id
from public.facturas_venta fv join public.cotizaciones c on c.id = fv.cotizacion_id

union all
-- 4. Facturas de compra (via asignacion_costos)
select distinct ac.cotizacion_id, c.numero, 'FACTURA_COMPRA', fc.numero_factura, fc.fecha_factura, fc.total, fc.estado, fc.id
from public.asignacion_costos ac
join public.facturas_compra fc on fc.id = ac.factura_compra_id
join public.cotizaciones c on c.id = ac.cotizacion_id
where ac.cotizacion_id is not null

union all
-- 5. Gastos vinculados (AHORA via gasto_reparto, no via gastos.cotizacion_id)
-- Se muestra el monto que le corresponde a ESTA venta, no el total del gasto.
-- Asi si un flete de 45.000 se repartio entre 3, cada venta ve su parte (15.000).
select
  gr.cotizacion_id,
  c.numero,
  'GASTO',
  coalesce(ds.numero, g.concepto),
  g.fecha,
  gr.monto,
  case when g.deducible then 'DEDUCIBLE' else 'NO DEDUCIBLE' end,
  g.id
from public.gasto_reparto gr
join public.gastos g on g.id = gr.gasto_id
join public.cotizaciones c on c.id = gr.cotizacion_id
left join public.documentos_soporte ds on ds.gasto_id = g.id

union all
-- 6. Movimientos de tesoreria (ingresos y egresos vinculados a esta venta)
select mt.cotizacion_id, c.numero,
       case when mt.tipo = 'INGRESO' then 'INGRESO_CAJA' else 'EGRESO_CAJA' end,
       mt.concepto, mt.fecha, mt.monto, mt.categoria, mt.id
from public.movimientos_tesoreria mt
join public.cotizaciones c on c.id = mt.cotizacion_id
where mt.cotizacion_id is not null;

comment on view public.trazabilidad_venta is
  'Historia completa de una venta. Los gastos se leen de gasto_reparto para que un gasto repartido entre varias ventas aparezca en cada una con su parte.';
