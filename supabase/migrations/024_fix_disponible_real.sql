-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Corregir disponible_real
-- Migracion 024
-- ============================================================
-- PROBLEMA que corrige:
--
-- La formula anterior era:
--   disponible_real = saldo_operativo - impuestos - deudas
--
-- Esa formula descuenta los impuestos del saldo operativo SIEMPRE,
-- incluso cuando la plata ya se aparto fisicamente en la cuenta de
-- reserva. Resultado: el impuesto se descontaba DOS VECES.
--
-- Ejemplo real de Abastecer:
--   Saldo Bold ................. 2.466.720
--   Impuestos por pagar .......... 157.359  (IVA 129.839 + Simple 27.520)
--
--   ANTES de apartar la plata:
--     disponible = 2.466.720 - 157.359 = 2.309.361  <- correcto
--
--   DESPUES de trasladar 157.359 a la reserva:
--     saldo operativo = 2.309.361 (la plata salio de Bold)
--     disponible = 2.309.361 - 157.359 = 2.152.002  <- MAL
--
-- El disponible real NO puede cambiar solo por mover plata entre
-- cuentas propias. La plata sigue siendo de la empresa, solo esta
-- separada para no gastarla por error.
--
-- FORMULA CORRECTA:
--   Solo se descuenta la parte del impuesto que TODAVIA NO esta
--   apartada en la reserva:
--
--   disponible_real = saldo_operativo
--                   - greatest(impuestos - saldo_reservas, 0)
--                   - deudas_a_proveedores
--
--   ANTES  : 2.466.720 - greatest(157.359 - 0, 0)       = 2.309.361
--   DESPUES: 2.309.361 - greatest(157.359 - 157.359, 0)  = 2.309.361
--
--   El numero no cambia. Eso prueba que el calculo esta bien.
-- ============================================================

-- Hay que hacer DROP porque estamos agregando una columna nueva
-- (impuestos_sin_apartar) y reordenando, y PostgreSQL no lo permite
-- con CREATE OR REPLACE VIEW en ese caso.
drop view if exists public.posicion_financiera;

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
-- Aqui esta el arreglo: cuanto impuesto sigue pendiente de apartar
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
    -- Impuesto que TODAVIA esta dentro del saldo operativo
    greatest(ov.iva_por_pagar + ov.simple_por_pagar - s.saldo_reservas, 0)
      as impuestos_sin_apartar,
    ov.ventas_subtotal_acum,
    ov.costo_real_acum,
    ov.utilidad_bruta_acum,
    ov.utilidad_neta_acum,
    ov.num_ventas,
    go.gastos_operativos,
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
  cross join socios so
  cross join pipeline pl
)
select
  -- Caja
  c.saldo_operativo,
  c.saldo_reservas,
  c.saldo_total,

  -- Obligaciones (plata que NO es nuestra)
  c.iva_por_pagar,
  c.simple_por_pagar,
  c.impuestos_por_pagar,
  c.cuentas_por_pagar,
  c.impuestos_por_pagar + c.cuentas_por_pagar            as total_comprometido,

  -- Cuanto de los impuestos falta apartar en la reserva
  c.impuestos_sin_apartar,

  -- EL NUMERO CLAVE
  -- Solo se resta el impuesto que todavia esta en la cuenta operativa.
  -- Asi mover plata a la reserva NO cambia este numero.
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
  c.gastos_operativos,
  c.utilidad_neta_acum - c.gastos_operativos             as resultado_operativo,

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
  'Posicion financiera real. disponible_real = saldo operativo - impuestos que aun no estan apartados en la reserva - deudas a proveedores. Trasladar plata a la cuenta de reserva NO cambia el disponible_real, porque la plata sigue siendo de la empresa.';
