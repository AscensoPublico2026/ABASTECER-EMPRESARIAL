-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Analisis financiero por venta
-- Migracion 021
-- ============================================================
-- Esta vista replica EXACTAMENTE el analisis del Excel
-- "PLANTILLA Analisis de Venta" pero calculado automaticamente.
--
-- Referencia validada con COT-2026-012:
--   venta_subtotal        1.280.000
--   iva_cobrado             243.200
--   costo_real              656.639   (196.639 + 400.000 + 60.000 flete)
--   iva_pagado              113.361
--   iva_neto_dian           129.839
--   utilidad_bruta          623.361
--   impuesto_simple          64.000
--   retenciones              36.480
--   utilidad_neta           559.361
--   total_a_separar         157.359
-- ============================================================

-- ------------------------------------------------------------
-- Vista principal: analisis_venta
-- ------------------------------------------------------------
create or replace view public.analisis_venta as
with
-- Costos que vienen de facturas de compra asignadas a esta venta
costos_compra as (
  select
    ac.cotizacion_id,
    sum(ac.subtotal)  as costo_compras,
    sum(ac.iva_valor) as iva_compras,
    count(distinct ac.factura_compra_id) as num_facturas_compra
  from public.asignacion_costos ac
  where ac.destino = 'VENTA' and ac.cotizacion_id is not null
  group by ac.cotizacion_id
),
-- Costos que vienen de gastos imputados a esta venta (fletes, mano de obra)
costos_gasto as (
  select
    g.cotizacion_id,
    sum(g.monto - coalesce(g.iva_incluido, 0)) as costo_gastos,
    sum(coalesce(g.iva_incluido, 0))           as iva_gastos,
    sum(case when g.deducible then 0 else g.monto end) as costo_no_deducible,
    count(*)                                    as num_gastos,
    count(*) filter (where not g.tiene_soporte) as num_gastos_sin_soporte
  from public.gastos g
  where g.cotizacion_id is not null and g.es_costo_venta = true
  group by g.cotizacion_id
),
tarifas as (
  select
    public.param_tributario('SIMPLE_TARIFA') as simple_pct,
    public.param_tributario('IVA_GENERAL')   as iva_pct
)
select
  c.id                                        as cotizacion_id,
  c.numero,
  c.cliente_id,
  cl.razon_social                             as cliente_nombre,
  c.fecha,
  c.estado,
  c.forma_pago,
  c.dias_credito,

  -- ---------- VENTA ----------
  c.subtotal                                  as venta_subtotal,
  c.iva_total                                 as iva_cobrado,
  c.total                                     as venta_total,

  -- ---------- COSTOS ----------
  coalesce(cc.costo_compras, 0)               as costo_compras,
  coalesce(cg.costo_gastos, 0)                as costo_gastos,
  coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0) as costo_real,

  -- ---------- IVA ----------
  coalesce(cc.iva_compras, 0)                 as iva_compras,
  coalesce(cg.iva_gastos, 0)                  as iva_gastos,
  coalesce(cc.iva_compras, 0) + coalesce(cg.iva_gastos, 0)     as iva_pagado,
  c.iva_total - (coalesce(cc.iva_compras, 0) + coalesce(cg.iva_gastos, 0)) as iva_neto_dian,

  -- ---------- UTILIDAD BRUTA ----------
  c.subtotal - (coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0)) as utilidad_bruta,
  case when c.subtotal > 0
       then round(
              ((c.subtotal - (coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0)))
               / c.subtotal) * 100, 2)
       else 0 end                             as margen_bruto_pct,

  -- ---------- IMPUESTOS ----------
  round(c.subtotal * t.simple_pct / 100, 2)   as impuesto_simple,
  coalesce(c.retencion_total, 0)              as retenciones,
  coalesce(c.retencion_retefuente, 0)         as retencion_retefuente,
  coalesce(c.retencion_reteiva, 0)            as retencion_reteiva,
  coalesce(c.retencion_reteica, 0)            as retencion_reteica,
  greatest(round(c.subtotal * t.simple_pct / 100, 2) - coalesce(c.retencion_total, 0), 0)
                                              as impuesto_simple_pendiente,

  -- ---------- UTILIDAD NETA ----------
  c.subtotal
    - (coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0))
    - round(c.subtotal * t.simple_pct / 100, 2)                  as utilidad_neta,
  case when c.subtotal > 0
       then round(
              ((c.subtotal
                - (coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0))
                - round(c.subtotal * t.simple_pct / 100, 2))
               / c.subtotal) * 100, 2)
       else 0 end                             as margen_neto_pct,

  -- ---------- DINERO A SEPARAR ----------
  (c.iva_total - (coalesce(cc.iva_compras, 0) + coalesce(cg.iva_gastos, 0)))
    + greatest(round(c.subtotal * t.simple_pct / 100, 2) - coalesce(c.retencion_total, 0), 0)
                                              as total_a_separar,

  -- ---------- FLUJO DE CAJA ----------
  coalesce(c.monto_recibido, 0)               as monto_recibido,

  -- ---------- CALIDAD DEL DATO ----------
  coalesce(cc.num_facturas_compra, 0)         as num_facturas_compra,
  coalesce(cg.num_gastos, 0)                  as num_gastos,
  coalesce(cg.num_gastos_sin_soporte, 0)      as num_gastos_sin_soporte,
  coalesce(cg.costo_no_deducible, 0)          as costo_no_deducible,
  (coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0)) > 0 as tiene_costo_asignado

from public.cotizaciones c
cross join tarifas t
left join public.clientes cl on cl.id = c.cliente_id
left join costos_compra cc   on cc.cotizacion_id = c.id
left join costos_gasto  cg   on cg.cotizacion_id = c.id;

comment on view public.analisis_venta is
  'Analisis financiero completo por venta: costo real, IVA neto, utilidad bruta y neta, impuestos y dinero a separar. Equivale al Excel de analisis manual.';


-- ------------------------------------------------------------
-- Vista: analisis por item (compra vs venta unitario)
-- Replica la tabla "EL NEGOCIO EN UNA SOLA TABLA" del Excel
-- ------------------------------------------------------------
create or replace view public.analisis_venta_items as
with costo_item as (
  select
    ac.cotizacion_id,
    ac.producto_id,
    sum(ac.cantidad)  as cantidad_asignada,
    sum(ac.subtotal)  as costo_total,
    sum(ac.iva_valor) as iva_total,
    case when sum(ac.cantidad) > 0
         then round(sum(ac.subtotal) / sum(ac.cantidad), 2)
         else 0 end   as costo_unitario_real
  from public.asignacion_costos ac
  where ac.destino = 'VENTA' and ac.cotizacion_id is not null
  group by ac.cotizacion_id, ac.producto_id
)
select
  ci.cotizacion_id,
  c.numero                                    as cotizacion_numero,
  ci.id                                       as cotizacion_item_id,
  ci.producto_id,
  ci.descripcion,
  ci.cantidad,
  ci.precio_unitario                          as precio_venta_unitario,
  coalesce(k.costo_unitario_real, 0)          as costo_unitario_real,
  ci.subtotal                                 as venta_subtotal,
  coalesce(k.costo_total, 0)                  as costo_subtotal,
  ci.subtotal - coalesce(k.costo_total, 0)    as utilidad,
  case when ci.precio_unitario > 0 and coalesce(k.costo_unitario_real, 0) > 0
       then round(ci.precio_unitario / k.costo_unitario_real, 2)
       else null end                          as multiplicador,
  case when ci.subtotal > 0
       then round(((ci.subtotal - coalesce(k.costo_total, 0)) / ci.subtotal) * 100, 2)
       else 0 end                             as margen_pct,
  coalesce(k.cantidad_asignada, 0)            as cantidad_con_costo,
  coalesce(k.costo_unitario_real, 0) > 0      as tiene_costo_real
from public.cotizacion_items ci
join public.cotizaciones c on c.id = ci.cotizacion_id
left join costo_item k
       on k.cotizacion_id = ci.cotizacion_id
      and k.producto_id   = ci.producto_id;

comment on view public.analisis_venta_items is
  'Comparativo por item: precio de venta vs costo real pagado, utilidad y multiplicador de inversion.';


-- ------------------------------------------------------------
-- Vista: trazabilidad completa de una venta
-- Todos los documentos y movimientos que la componen
-- ------------------------------------------------------------
create or replace view public.trazabilidad_venta as
select
  c.id                as cotizacion_id,
  c.numero            as cotizacion_numero,
  'COTIZACION'        as documento_tipo,
  c.numero            as documento_numero,
  c.fecha             as documento_fecha,
  c.total             as valor,
  c.estado            as estado,
  null::uuid          as documento_id
from public.cotizaciones c

union all
select r.cotizacion_id, c.numero, 'REMISION', r.numero, r.fecha, null, null, r.id
from public.remisiones r join public.cotizaciones c on c.id = r.cotizacion_id

union all
select fv.cotizacion_id, c.numero, 'FACTURA_VENTA', fv.numero_factura_dian, fv.fecha, fv.total, fv.estado, fv.id
from public.facturas_venta fv join public.cotizaciones c on c.id = fv.cotizacion_id

union all
select distinct ac.cotizacion_id, c.numero, 'FACTURA_COMPRA', fc.numero_factura, fc.fecha_factura, fc.total, fc.estado, fc.id
from public.asignacion_costos ac
join public.facturas_compra fc on fc.id = ac.factura_compra_id
join public.cotizaciones c on c.id = ac.cotizacion_id
where ac.cotizacion_id is not null

union all
select g.cotizacion_id, c.numero, 'GASTO', coalesce(ds.numero, g.concepto), g.fecha, g.monto,
       case when g.deducible then 'DEDUCIBLE' else 'NO DEDUCIBLE' end, g.id
from public.gastos g
join public.cotizaciones c on c.id = g.cotizacion_id
left join public.documentos_soporte ds on ds.gasto_id = g.id
where g.cotizacion_id is not null

union all
select mt.cotizacion_id, c.numero,
       case when mt.tipo = 'INGRESO' then 'INGRESO_CAJA' else 'EGRESO_CAJA' end,
       mt.concepto, mt.fecha, mt.monto, mt.categoria, mt.id
from public.movimientos_tesoreria mt
join public.cotizaciones c on c.id = mt.cotizacion_id
where mt.cotizacion_id is not null;

comment on view public.trazabilidad_venta is
  'Todos los documentos y movimientos de dinero asociados a una venta, en orden cronologico.';
