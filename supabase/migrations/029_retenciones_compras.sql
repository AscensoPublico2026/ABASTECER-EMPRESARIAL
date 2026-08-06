-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Retenciones practicadas a proveedores
-- Migracion 029
-- ============================================================
-- CONTEXTO: al comprarle a un proveedor formal (agente obligado a que
-- le retengan), la empresa puede tener que practicar RETEFUENTE /
-- RETEIVA / RETEICA y pagarle al proveedor el NETO (total - retencion).
--
-- Esa retencion NO es plata de la empresa: es un pasivo con la DIAN
-- que se debe declarar y pagar en la declaracion de retenciones.
--
-- Antes de esta migracion:
--   - facturas_compra.retencion_total existia pero estaba MUERTA
--     (nunca se escribia ni se leia desde el codigo)
--   - El EGRESO de caja siempre salia por el TOTAL de la factura,
--     nunca por el neto, asi que si en la practica se pagaba menos,
--     el saldo del banco en el ERP quedaba mas bajo que el real
--
-- IMPORTANTE (Regimen Simple): el Art. 911 par. 4 ET dice que los
-- contribuyentes del Regimen Simple NO son agentes de retencion ni
-- autorretenedores (salvo pagos laborales). Si un proveedor calculo
-- una retencion en su factura, puede que no aplicara. Este sistema
-- solo registra lo que el usuario confirme que se pago realmente;
-- no valida si la retencion era procedente.
-- ============================================================


-- ------------------------------------------------------------
-- PASO 1: columnas de retencion desagregadas (mismo patron que
-- cotizaciones/facturas_venta)
-- ------------------------------------------------------------
alter table public.facturas_compra
  add column if not exists retencion_retefuente numeric(15,2) not null default 0,
  add column if not exists retencion_reteiva    numeric(15,2) not null default 0,
  add column if not exists retencion_reteica     numeric(15,2) not null default 0,
  add column if not exists total_neto            numeric(15,2);

comment on column public.facturas_compra.retencion_retefuente is
  'Retencion en la fuente que el proveedor descuenta al pagarle (o que la empresa practica). Pasivo con la DIAN, no utilidad.';
comment on column public.facturas_compra.retencion_reteiva is
  'ReteIVA practicada sobre el IVA de la factura.';
comment on column public.facturas_compra.retencion_reteica is
  'ReteICA practicada sobre el subtotal de la factura.';
comment on column public.facturas_compra.total_neto is
  'Total de la factura menos las retenciones. Es lo que REALMENTE sale de la cuenta bancaria.';

-- Mantener retencion_total (ya existia) como la suma, para no romper
-- nada que la lea. Se actualiza con un trigger.
create or replace function public.calcular_retencion_compra()
returns trigger
language plpgsql
as $$
begin
  new.retencion_total := coalesce(new.retencion_retefuente, 0)
                        + coalesce(new.retencion_reteiva, 0)
                        + coalesce(new.retencion_reteica, 0);
  new.total_neto := coalesce(new.total, 0) - new.retencion_total;
  return new;
end;
$$;

drop trigger if exists trg_calcular_retencion_compra on public.facturas_compra;
create trigger trg_calcular_retencion_compra
  before insert or update on public.facturas_compra
  for each row execute function public.calcular_retencion_compra();

-- Recalcular las filas que ya existen (retencion_total quedaba en 0)
update public.facturas_compra
set retencion_retefuente = coalesce(retencion_retefuente, 0);


-- ------------------------------------------------------------
-- PASO 2: vista del pasivo pendiente con la DIAN por retenciones
-- practicadas (analoga a estado_reserva_impuestos)
-- ------------------------------------------------------------
create or replace view public.retenciones_practicadas as
select
  coalesce(sum(fc.retencion_retefuente), 0) as retefuente_total,
  coalesce(sum(fc.retencion_reteiva), 0)    as reteiva_total,
  coalesce(sum(fc.retencion_reteica), 0)    as reteica_total,
  coalesce(sum(fc.retencion_total), 0)      as total_retenido,
  count(*) filter (where fc.retencion_total > 0) as num_facturas_con_retencion
from public.facturas_compra fc
where fc.estado <> 'ANULADA';

comment on view public.retenciones_practicadas is
  'Cuanto se ha retenido a proveedores. Es un pasivo con la DIAN (se debe declarar y pagar), no utilidad de la empresa.';


-- ------------------------------------------------------------
-- PASO 3: incluir el pasivo de retenciones en posicion_financiera
-- Hay que hacer DROP porque se agrega una columna nueva.
-- ------------------------------------------------------------
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
gmf_total as (
  select coalesce(sum(monto), 0) as gmf_pagado
  from public.movimientos_tesoreria
  where categoria = 'GMF'
),
-- NUEVO: retenciones practicadas a proveedores, pendientes de declarar
retenciones as (
  select coalesce(sum(retencion_total), 0) as retenciones_por_declarar
  from public.facturas_compra
  where estado <> 'ANULADA'
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
    rt.retenciones_por_declarar,
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
  cross join retenciones rt
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
  c.retenciones_por_declarar,
  c.impuestos_por_pagar + c.cuentas_por_pagar + c.retenciones_por_declarar as total_comprometido,
  c.impuestos_sin_apartar,

  -- EL NUMERO CLAVE
  -- Nota: cuentas_por_pagar ya usa el total bruto de la factura (lo que
  -- se le debe al proveedor si es a credito). Las retenciones de
  -- facturas PAGADAS no estan en cuentas_por_pagar, por eso se restan
  -- aparte: son plata que ya salio de la cuenta operativa como "ahorro"
  -- pero en realidad hay que declararla y pagarla a la DIAN.
  c.saldo_operativo - c.impuestos_sin_apartar - c.cuentas_por_pagar - c.retenciones_por_declarar
                                                         as disponible_real,

  -- Cartera
  c.cuentas_por_cobrar,
  c.saldo_operativo + c.cuentas_por_cobrar
    - c.impuestos_sin_apartar - c.cuentas_por_pagar - c.retenciones_por_declarar as disponible_proyectado,

  -- Resultados
  c.ventas_subtotal_acum,
  c.costo_real_acum,
  c.utilidad_bruta_acum,
  c.utilidad_neta_acum,
  case when c.ventas_subtotal_acum > 0
       then round((c.utilidad_bruta_acum / c.ventas_subtotal_acum) * 100, 2)
       else 0 end                                        as margen_bruto_pct,

  -- Gastos
  c.gastos_operativos,
  c.gmf_pagado,
  c.gastos_operativos + c.gmf_pagado                     as gastos_operativos_total,

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
  (c.saldo_operativo - c.impuestos_sin_apartar - c.cuentas_por_pagar - c.retenciones_por_declarar) < 0 as en_riesgo

from calculo c;

comment on view public.posicion_financiera is
  'Posicion financiera real. Resta impuestos sin apartar, deudas a proveedores y retenciones practicadas pendientes de declarar. Trasladar plata entre cuentas propias NO cambia el disponible_real.';
