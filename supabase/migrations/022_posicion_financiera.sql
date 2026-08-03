-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Posicion financiera real
-- Migracion 022
-- ============================================================
-- Responde la pregunta del dueno:
--   "Cuanta plata tengo REALMENTE disponible hoy?"
--
-- Politica #012 (El banco miente):
--   Saldo bancario NO es plata disponible. Hay que restar lo que
--   ya esta comprometido: IVA de la DIAN, impuesto Simple,
--   deudas a proveedores.
-- ============================================================

-- ------------------------------------------------------------
-- Vista: posicion_financiera (una sola fila)
-- ------------------------------------------------------------
create or replace view public.posicion_financiera as
with
saldos as (
  select
    coalesce(sum(case when not es_reserva then saldo_actual else 0 end), 0) as saldo_operativo,
    coalesce(sum(case when es_reserva     then saldo_actual else 0 end), 0) as saldo_reservas,
    coalesce(sum(saldo_actual), 0)                                          as saldo_total
  from public.saldos_cuentas
  where activa
),
-- IVA e impuestos acumulados de todas las ventas facturadas o despachadas
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
-- Lo que debemos a proveedores
por_pagar as (
  select coalesce(sum(total), 0) as cuentas_por_pagar
  from public.facturas_compra
  where estado in ('REGISTRADA','POR_PAGAR','VENCIDA')
),
-- Lo que nos deben los clientes
por_cobrar as (
  select coalesce(sum(total - coalesce(retencion_total,0)), 0) as cuentas_por_cobrar
  from public.facturas_venta
  where estado = 'EMITIDA'
),
-- Gastos operativos (no de venta)
gastos_op as (
  select coalesce(sum(monto), 0) as gastos_operativos
  from public.gastos
  where es_costo_venta = false
),
-- Capital y socios
socios as (
  select
    coalesce(sum(capital_aportado), 0)     as capital_social,
    coalesce(sum(prestamo_pendiente), 0)   as prestamos_socios,
    coalesce(sum(dividendos_recibidos), 0) as dividendos_pagados
  from public.resumen_socios
),
-- Cotizaciones activas (pipeline)
pipeline as (
  select
    coalesce(sum(total), 0) as pipeline_total,
    count(*)                as pipeline_num
  from public.cotizaciones
  where estado in ('PENDIENTE','APROBADA')
)
select
  -- Caja
  s.saldo_operativo,
  s.saldo_reservas,
  s.saldo_total,

  -- Obligaciones (plata que NO es nuestra)
  ov.iva_por_pagar,
  ov.simple_por_pagar,
  ov.iva_por_pagar + ov.simple_por_pagar                as impuestos_por_pagar,
  pp.cuentas_por_pagar,
  ov.iva_por_pagar + ov.simple_por_pagar + pp.cuentas_por_pagar as total_comprometido,

  -- EL NUMERO CLAVE
  s.saldo_operativo - (ov.iva_por_pagar + ov.simple_por_pagar + pp.cuentas_por_pagar)
                                                        as disponible_real,

  -- Cartera
  pc.cuentas_por_cobrar,
  s.saldo_operativo + pc.cuentas_por_cobrar
    - (ov.iva_por_pagar + ov.simple_por_pagar + pp.cuentas_por_pagar)
                                                        as disponible_proyectado,

  -- Resultados
  ov.ventas_subtotal_acum,
  ov.costo_real_acum,
  ov.utilidad_bruta_acum,
  ov.utilidad_neta_acum,
  case when ov.ventas_subtotal_acum > 0
       then round((ov.utilidad_bruta_acum / ov.ventas_subtotal_acum) * 100, 2)
       else 0 end                                       as margen_bruto_pct,
  go.gastos_operativos,
  ov.utilidad_neta_acum - go.gastos_operativos          as resultado_operativo,

  -- Capital
  so.capital_social,
  so.prestamos_socios,
  so.dividendos_pagados,

  -- Actividad
  ov.num_ventas,
  pl.pipeline_total,
  pl.pipeline_num,

  -- Alertas
  (s.saldo_reservas < (ov.iva_por_pagar + ov.simple_por_pagar))  as reserva_insuficiente,
  (s.saldo_operativo - (ov.iva_por_pagar + ov.simple_por_pagar + pp.cuentas_por_pagar)) < 0 as en_riesgo

from saldos s
cross join obligaciones_venta ov
cross join por_pagar pp
cross join por_cobrar pc
cross join gastos_op go
cross join socios so
cross join pipeline pl;

comment on view public.posicion_financiera is
  'Posicion financiera real. disponible_real = saldo operativo - IVA - impuesto Simple - deudas a proveedores. Es la plata que se puede usar sin comprometer obligaciones.';


-- ------------------------------------------------------------
-- Vista: obligaciones tributarias por periodo
-- El IVA en Colombia se declara por bimestre o cuatrimestre
-- ------------------------------------------------------------
create or replace view public.obligaciones_por_periodo as
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
