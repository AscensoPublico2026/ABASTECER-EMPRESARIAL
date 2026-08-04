-- ============================================================
-- ABASTECER EMPRESARIAL SAS - El GMF como gasto operativo
-- Migracion 027
-- ============================================================
-- DECISION DE NEGOCIO (Opcion A):
--
-- El 4x1000 es un GASTO FINANCIERO, no un costo de la mercancia.
-- Va debajo de la utilidad bruta, junto con las comisiones bancarias.
--
-- Por que NO se suma al costo de la venta:
--   El 4x1000 no lo causa la venta, lo causa COMO mueves la plata.
--   Si pagas una compra en 3 transferencias en vez de 1, pagas 3 veces
--   el GMF pero la venta es la misma. Sumarlo al costo ensuciaria la
--   comparacion de margenes entre ventas.
--
-- Que hace esta migracion:
--   1. analisis_venta: agrega gmf_venta como dato INFORMATIVO.
--      No toca costo_real, utilidad_bruta ni margen_bruto_pct.
--   2. posicion_financiera: agrega gmf_pagado y lo descuenta del
--      resultado_operativo (antes la plata salia del banco pero no
--      aparecia como gasto en ninguna parte).
--   3. gmf_por_periodo: acumulado por mes para ver cuanto se come
--      el banco.
--
-- OJO: hay que hacer DROP de las vistas porque se agregan columnas
-- nuevas y PostgreSQL no lo permite con CREATE OR REPLACE VIEW.
--
-- CUATRO vistas dependen de analisis_venta y hay que recrearlas todas:
--   1. posicion_financiera        (024)
--   2. estado_reserva_impuestos   (023)
--   3. obligaciones_por_periodo   (022)
--   4. analisis_venta             (021) <- la base
--
-- analisis_venta_items NO depende de analisis_venta (usa
-- asignacion_costos directo), asi que no hay que tocarla.
-- ============================================================


-- ------------------------------------------------------------
-- PASO 1: Borrar en orden inverso de dependencia
-- ------------------------------------------------------------
drop view if exists public.posicion_financiera;
drop view if exists public.estado_reserva_impuestos;
drop view if exists public.obligaciones_por_periodo;
drop view if exists public.analisis_venta;


-- ------------------------------------------------------------
-- PASO 2: analisis_venta con el GMF informativo
-- ------------------------------------------------------------
create view public.analisis_venta as
with
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
-- NUEVO: el 4x1000 que genero esta venta (informativo, no es costo)
gmf_de_venta as (
  select
    mt.cotizacion_id,
    sum(mt.monto) as gmf_venta,
    count(*)      as num_gmf
  from public.movimientos_tesoreria mt
  where mt.categoria = 'GMF' and mt.cotizacion_id is not null
  group by mt.cotizacion_id
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

  -- ---------- COSTOS (el GMF NO entra aqui) ----------
  coalesce(cc.costo_compras, 0)               as costo_compras,
  coalesce(cg.costo_gastos, 0)                as costo_gastos,
  coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0) as costo_real,

  -- ---------- IVA ----------
  coalesce(cc.iva_compras, 0)                 as iva_compras,
  coalesce(cg.iva_gastos, 0)                  as iva_gastos,
  coalesce(cc.iva_compras, 0) + coalesce(cg.iva_gastos, 0)     as iva_pagado,
  c.iva_total - (coalesce(cc.iva_compras, 0) + coalesce(cg.iva_gastos, 0)) as iva_neto_dian,

  -- ---------- UTILIDAD BRUTA (limpia, sin GMF) ----------
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

  -- ---------- GMF: INFORMATIVO ----------
  -- Lo que el banco cobro por mover la plata de esta venta.
  -- No afecta el margen bruto, es un gasto financiero.
  coalesce(gv.gmf_venta, 0)                   as gmf_venta,
  coalesce(gv.num_gmf, 0)                     as num_gmf,
  -- Utilidad despues de descontar el 4x1000 (para el que quiera el dato exacto)
  c.subtotal
    - (coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0))
    - round(c.subtotal * t.simple_pct / 100, 2)
    - coalesce(gv.gmf_venta, 0)               as utilidad_neta_con_gmf,

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
left join costos_gasto  cg   on cg.cotizacion_id = c.id
left join gmf_de_venta  gv   on gv.cotizacion_id = c.id;

comment on view public.analisis_venta is
  'Analisis financiero por venta. El GMF (gmf_venta) es informativo: no entra al costo_real ni al margen bruto porque es un gasto financiero, no un costo de la mercancia.';


-- ------------------------------------------------------------
-- PASO 2b: obligaciones_por_periodo (identica, se recrea porque
-- dependia de analisis_venta)
-- ------------------------------------------------------------
create view public.obligaciones_por_periodo as
select
  to_char(av.fecha, 'YYYY')                                as anio,
  case
    when extract(month from av.fecha) in (1,2)   then 1
    when extract(month from av.fecha) in (3,4)   then 2
    when extract(month from av.fecha) in (5,6)   then 3
    when extract(month from av.fecha) in (7,8)   then 4
    when extract(month from av.fecha) in (9,10)  then 5
    else 6
  end                                                      as bimestre,
  to_char(av.fecha, 'YYYY-MM')                             as mes,
  count(*)                                                 as num_ventas,
  sum(av.venta_subtotal)                                   as base_gravable,
  sum(av.iva_cobrado)                                      as iva_cobrado,
  sum(av.iva_pagado)                                       as iva_descontable,
  sum(av.iva_neto_dian)                                    as iva_a_pagar,
  sum(av.impuesto_simple)                                  as simple_causado,
  sum(av.retenciones)                                      as retenciones_a_favor,
  sum(av.impuesto_simple_pendiente)                        as simple_a_pagar,
  sum(av.utilidad_bruta)                                   as utilidad_bruta,
  sum(av.utilidad_neta)                                    as utilidad_neta
from public.analisis_venta av
where av.estado in ('FACTURADA','DESPACHADA','ENTREGADO','POR_COBRAR','COBRADA','ENTREGA_PARCIAL')
group by 1, 2, 3
order by 1 desc, 3 desc;

comment on view public.obligaciones_por_periodo is
  'IVA e impuesto Simple agrupados por mes y bimestre, para saber cuanto declarar en cada periodo.';


-- ------------------------------------------------------------
-- PASO 3: estado_reserva_impuestos (igual que estaba, se recrea
-- porque dependia de analisis_venta)
-- ------------------------------------------------------------
create view public.estado_reserva_impuestos as
with
obligaciones as (
  select
    coalesce(sum(av.iva_neto_dian), 0)             as iva_por_pagar,
    coalesce(sum(av.impuesto_simple_pendiente), 0) as simple_por_pagar
  from public.analisis_venta av
  where av.estado in ('FACTURADA','DESPACHADA','ENTREGADO','POR_COBRAR','COBRADA','ENTREGA_PARCIAL')
),
reserva as (
  select
    coalesce(sum(saldo_actual), 0) as saldo_reserva,
    min(id::text)                  as cuenta_reserva_id
  from public.saldos_cuentas
  where es_reserva and activa
),
operativa as (
  select coalesce(sum(saldo_actual), 0) as saldo_operativo
  from public.saldos_cuentas
  where not es_reserva and activa
)
select
  o.iva_por_pagar,
  o.simple_por_pagar,
  o.iva_por_pagar + o.simple_por_pagar                        as debe_estar_reservado,
  r.saldo_reserva                                             as esta_reservado,
  greatest(o.iva_por_pagar + o.simple_por_pagar - r.saldo_reserva, 0) as falta_trasladar,
  greatest(r.saldo_reserva - (o.iva_por_pagar + o.simple_por_pagar), 0) as sobra_en_reserva,
  op.saldo_operativo,
  (op.saldo_operativo >= greatest(o.iva_por_pagar + o.simple_por_pagar - r.saldo_reserva, 0)) as alcanza_para_trasladar,
  r.cuenta_reserva_id
from obligaciones o
cross join reserva r
cross join operativa op;

comment on view public.estado_reserva_impuestos is
  'Cuanto deberia estar apartado para impuestos, cuanto hay y cuanto falta trasladar.';


-- ------------------------------------------------------------
-- PASO 4: posicion_financiera con el GMF en el resultado operativo
-- ------------------------------------------------------------
create view public.posicion_financiera as
with
saldos as (
  select
    coalesce(sum(case when not es_reserva then saldo_actual else 0 end), 0) as saldo_operativo,
    coalesce(sum(case when es_reserva     then saldo_actual else 0 end), 0) as saldo_reservas,
    coalesce(sum(saldo_actual), 0)                                          as saldo_total
  from public.saldos_cuentas
  where activa
),
obligaciones_venta as (
  select
    coalesce(sum(av.iva_neto_dian), 0)              as iva_por_pagar,
    coalesce(sum(av.impuesto_simple_pendiente), 0)  as simple_por_pagar,
    coalesce(sum(av.utilidad_bruta), 0)             as utilidad_bruta_acum,
    coalesce(sum(av.utilidad_neta), 0)              as utilidad_neta_acum,
    coalesce(sum(av.venta_subtotal), 0)             as ventas_subtotal_acum,
    coalesce(sum(av.costo_real), 0)                 as costo_real_acum,
    count(*)                                        as num_ventas
  from public.analisis_venta av
  where av.estado in ('FACTURADA','DESPACHADA','ENTREGADO','POR_COBRAR','COBRADA','ENTREGA_PARCIAL')
),
por_pagar as (
  select coalesce(sum(total), 0) as cuentas_por_pagar
  from public.facturas_compra
  where estado in ('REGISTRADA','POR_PAGAR','VENCIDA')
),
por_cobrar as (
  select coalesce(sum(total - coalesce(retencion_total,0)), 0) as cuentas_por_cobrar
  from public.facturas_venta
  where estado = 'EMITIDA'
),
gastos_op as (
  select coalesce(sum(monto), 0) as gastos_operativos
  from public.gastos
  where es_costo_venta = false
),
-- NUEVO: todo el 4x1000 que ha cobrado el banco
gmf_total as (
  select coalesce(sum(monto), 0) as gmf_pagado
  from public.movimientos_tesoreria
  where categoria = 'GMF'
),
socios as (
  select
    coalesce(sum(capital_aportado), 0)     as capital_social,
    coalesce(sum(prestamo_pendiente), 0)   as prestamos_socios,
    coalesce(sum(dividendos_recibidos), 0) as dividendos_pagados
  from public.resumen_socios
),
pipeline as (
  select
    coalesce(sum(total), 0) as pipeline_total,
    count(*)                as pipeline_num
  from public.cotizaciones
  where estado in ('PENDIENTE','APROBADA')
),
calculo as (
  select
    s.saldo_operativo,
    s.saldo_reservas,
    s.saldo_total,
    ov.iva_por_pagar,
    ov.simple_por_pagar,
    ov.iva_por_pagar + ov.simple_por_pagar as impuestos_por_pagar,
    pp.cuentas_por_pagar,
    pc.cuentas_por_cobrar,
    greatest(ov.iva_por_pagar + ov.simple_por_pagar - s.saldo_reservas, 0)
      as impuestos_sin_apartar,
    ov.ventas_subtotal_acum,
    ov.costo_real_acum,
    ov.utilidad_bruta_acum,
    ov.utilidad_neta_acum,
    ov.num_ventas,
    go.gastos_operativos,
    gt.gmf_pagado,
    so.capital_social,
    so.prestamos_socios,
    so.dividendos_pagados,
    pl.pipeline_total,
    pl.pipeline_num
  from saldos s
  cross join obligaciones_venta ov
  cross join por_pagar pp
  cross join por_cobrar pc
  cross join gastos_op go
  cross join gmf_total gt
  cross join socios so
  cross join pipeline pl
)
select
  -- Caja
  c.saldo_operativo,
  c.saldo_reservas,
  c.saldo_total,

  -- Obligaciones
  c.iva_por_pagar,
  c.simple_por_pagar,
  c.impuestos_por_pagar,
  c.cuentas_por_pagar,
  c.impuestos_por_pagar + c.cuentas_por_pagar            as total_comprometido,
  c.impuestos_sin_apartar,

  -- EL NUMERO CLAVE
  c.saldo_operativo - c.impuestos_sin_apartar - c.cuentas_por_pagar
                                                         as disponible_real,

  -- Cartera
  c.cuentas_por_cobrar,
  c.saldo_operativo + c.cuentas_por_cobrar
    - c.impuestos_sin_apartar - c.cuentas_por_pagar       as disponible_proyectado,

  -- Resultados
  c.ventas_subtotal_acum,
  c.costo_real_acum,
  c.utilidad_bruta_acum,
  c.utilidad_neta_acum,
  case when c.ventas_subtotal_acum > 0
       then round((c.utilidad_bruta_acum / c.ventas_subtotal_acum) * 100, 2)
       else 0 end                                        as margen_bruto_pct,

  -- Gastos: los operativos y el 4x1000 por separado
  c.gastos_operativos,
  c.gmf_pagado,
  c.gastos_operativos + c.gmf_pagado                     as gastos_operativos_total,

  -- El resultado operativo ahora SI descuenta el 4x1000
  c.utilidad_neta_acum - c.gastos_operativos - c.gmf_pagado as resultado_operativo,

  -- Capital
  c.capital_social,
  c.prestamos_socios,
  c.dividendos_pagados,

  -- Actividad
  c.num_ventas,
  c.pipeline_total,
  c.pipeline_num,

  -- Alertas
  (c.saldo_reservas < c.impuestos_por_pagar)             as reserva_insuficiente,
  (c.saldo_operativo - c.impuestos_sin_apartar - c.cuentas_por_pagar) < 0 as en_riesgo

from calculo c;

comment on view public.posicion_financiera is
  'Posicion financiera real. El GMF (gmf_pagado) se descuenta del resultado_operativo como gasto financiero, no del margen bruto.';


-- ------------------------------------------------------------
-- PASO 5: Acumulado del GMF por mes
-- ------------------------------------------------------------
create or replace view public.gmf_por_periodo as
select
  to_char(mt.fecha, 'YYYY')    as anio,
  to_char(mt.fecha, 'YYYY-MM') as mes,
  count(*)                     as num_transacciones,
  sum(mt.monto)                as gmf_pagado,
  -- Cuanta plata se movio para generar ese GMF (monto / 0.004)
  round(sum(mt.monto) / 0.004) as base_aproximada
from public.movimientos_tesoreria mt
where mt.categoria = 'GMF'
group by 1, 2
order by 2 desc;

comment on view public.gmf_por_periodo is
  'Cuanto se ha ido en 4x1000 por mes y cuantas transacciones lo generaron.';
