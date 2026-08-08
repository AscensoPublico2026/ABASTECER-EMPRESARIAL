-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Categoria ACTIVO FIJO en gastos
-- Migracion 037
-- ============================================================
-- EL CASO REAL
-- Compraron una impresora. La plata salio del banco, asi que hay que
-- registrarla o el saldo del ERP no cuadra con el extracto. Pero una
-- impresora NO es un gasto del mes: es un ACTIVO. La empresa cambio
-- plata por una cosa que sigue valiendo.
--
-- POR QUE NO SE PODIA REGISTRAR BIEN
-- gastos.categoria no tenia 'ACTIVO_FIJO'. Si lo metias como TECNOLOGIA,
-- la plata si salia del banco (bien) pero se sumaba a gastos_operativos y
-- el resultado operativo del mes salia hundido por una compra que en
-- realidad es una inversion. El banco cuadraba, la utilidad no.
--
-- LO QUE HACE ESTA MIGRACION
-- 1. Agrega la categoria ACTIVO_FIJO.
-- 2. Agrega los datos del activo: garantia, vida util, serie, estado.
-- 3. Saca los activos fijos de gastos_operativos en posicion_financiera y
--    los muestra aparte como inversion.
-- 4. Crea la vista activos_fijos: cuantos hay y cuanto valen.
--
-- LO QUE NO HACE (a proposito)
-- No calcula depreciacion contra el impuesto. En Regimen Simple el
-- impuesto va sobre INGRESOS BRUTOS, asi que la depreciacion no lo baja.
-- La vista si muestra el valor en libros para saber cuanto vale de verdad
-- lo que se tiene, pero no toca ningun impuesto.
--
-- Cierra la pestana del ERP antes de correrla.
-- ============================================================


-- ------------------------------------------------------------
-- PASO 1: la categoria nueva
-- ------------------------------------------------------------
alter table public.gastos
  drop constraint if exists gastos_categoria_check;

alter table public.gastos
  add constraint gastos_categoria_check
    check (categoria in (
      'CONSTITUCION', 'IMPUESTOS', 'SERVICIOS', 'TRANSPORTE',
      'MARKETING', 'TECNOLOGIA', 'LEGAL', 'BANCARIO',
      'ACTIVO_FIJO', 'MANTENIMIENTO_ACTIVO',
      'OTROS'
    ));

comment on column public.gastos.categoria is
  'ACTIVO_FIJO: no es gasto del periodo, es una inversion (impresora, computador, estanteria). Sale del banco pero no baja el resultado operativo. MANTENIMIENTO_ACTIVO: el arreglo o repuesto de un activo, ese SI es gasto del periodo.';


-- ------------------------------------------------------------
-- PASO 2: los datos del activo
-- ------------------------------------------------------------
-- Todo opcional: si no los llenas, el activo igual queda registrado y el
-- banco igual cuadra. Sirven para saber que se tiene y hasta cuando esta
-- cubierto por garantia.
alter table public.gastos
  add column if not exists activo_nombre        text,
  add column if not exists activo_serie         text,
  add column if not exists activo_garantia_meses int,
  add column if not exists activo_vida_util_meses int,
  add column if not exists activo_estado        text default 'EN_USO',
  add column if not exists activo_padre_id      uuid references public.gastos(id) on delete set null;

alter table public.gastos
  drop constraint if exists gastos_activo_estado_check;
alter table public.gastos
  add constraint gastos_activo_estado_check
    check (activo_estado is null or activo_estado in ('EN_USO','EN_REPARACION','DE_BAJA','VENDIDO'));

comment on column public.gastos.activo_nombre is
  'Como se llama el activo. Ej: IMPRESORA EPSON L3250. Si esta vacio se usa el concepto.';
comment on column public.gastos.activo_garantia_meses is
  'Meses de garantia desde la fecha de compra. La impresora con 2 anios son 24.';
comment on column public.gastos.activo_vida_util_meses is
  'Cuantos meses se espera que sirva. Solo para saber el valor en libros, no toca impuestos.';
comment on column public.gastos.activo_padre_id is
  'Si este gasto es un MANTENIMIENTO, apunta al activo que se le hizo. Asi se sabe cuanto ha costado mantener esa impresora.';

create index if not exists idx_gastos_activo_padre on public.gastos(activo_padre_id);


-- ------------------------------------------------------------
-- PASO 3: la vista de activos fijos
-- ------------------------------------------------------------
-- Responde: cuantos activos hay, cuanto costaron, cuanto valen hoy,
-- cuales siguen en garantia y cuanto se ha gastado manteniendo cada uno.
create or replace view public.activos_fijos as
with mantenimientos as (
  select
    m.activo_padre_id            as activo_id,
    coalesce(sum(m.monto), 0)    as gasto_mantenimiento,
    count(*)                     as num_mantenimientos,
    max(m.fecha)                 as ultimo_mantenimiento
  from public.gastos m
  where m.categoria = 'MANTENIMIENTO_ACTIVO'
    and m.activo_padre_id is not null
  group by m.activo_padre_id
)
select
  a.id,
  a.fecha                                            as fecha_compra,
  coalesce(nullif(a.activo_nombre, ''), a.concepto)  as activo,
  a.activo_serie                                     as serie,
  a.monto                                            as costo_total,
  coalesce(a.iva_incluido, 0)                        as iva,
  a.monto - coalesce(a.iva_incluido, 0)              as costo_sin_iva,
  coalesce(a.activo_estado, 'EN_USO')                as estado,
  pr.razon_social                                    as proveedor,
  a.tercero_nombre,
  a.tiene_soporte,
  a.deducible,

  -- ---------- GARANTIA ----------
  a.activo_garantia_meses                            as garantia_meses,
  case when a.activo_garantia_meses > 0
       then (a.fecha + (a.activo_garantia_meses || ' months')::interval)::date
  end                                                as garantia_hasta,
  case
    when coalesce(a.activo_garantia_meses, 0) = 0 then 'SIN GARANTIA REGISTRADA'
    when (a.fecha + (a.activo_garantia_meses || ' months')::interval)::date >= current_date
      then 'EN GARANTIA'
    else 'GARANTIA VENCIDA'
  end                                                as estado_garantia,
  case when a.activo_garantia_meses > 0
       then greatest(
              ((a.fecha + (a.activo_garantia_meses || ' months')::interval)::date - current_date),
              0)
  end                                                as dias_de_garantia_restantes,

  -- ---------- VALOR EN LIBROS ----------
  -- Depreciacion lineal simple: el costo repartido entre los meses de
  -- vida util. NO baja ningun impuesto: en Regimen Simple el impuesto va
  -- sobre ingresos brutos. Sirve para saber cuanto vale hoy lo que tienes.
  a.activo_vida_util_meses                           as vida_util_meses,
  case when coalesce(a.activo_vida_util_meses, 0) > 0
       then least(
              round(
                ((a.monto - coalesce(a.iva_incluido, 0)) / a.activo_vida_util_meses)
                * greatest(
                    (extract(year from current_date) - extract(year from a.fecha)) * 12
                    + (extract(month from current_date) - extract(month from a.fecha)),
                    0)
              , 2),
              a.monto - coalesce(a.iva_incluido, 0))
       else 0 end                                    as depreciacion_acumulada,
  case when coalesce(a.activo_vida_util_meses, 0) > 0
       then greatest(
              (a.monto - coalesce(a.iva_incluido, 0))
              - least(
                  round(
                    ((a.monto - coalesce(a.iva_incluido, 0)) / a.activo_vida_util_meses)
                    * greatest(
                        (extract(year from current_date) - extract(year from a.fecha)) * 12
                        + (extract(month from current_date) - extract(month from a.fecha)),
                        0)
                  , 2),
                  a.monto - coalesce(a.iva_incluido, 0)),
              0)
       else a.monto - coalesce(a.iva_incluido, 0) end as valor_en_libros,

  -- ---------- MANTENIMIENTO ----------
  coalesce(mt.gasto_mantenimiento, 0)                as gasto_mantenimiento,
  coalesce(mt.num_mantenimientos, 0)                 as num_mantenimientos,
  mt.ultimo_mantenimiento,
  a.monto + coalesce(mt.gasto_mantenimiento, 0)      as costo_total_de_propiedad

from public.gastos a
left join public.proveedores pr on pr.id = a.proveedor_id
left join mantenimientos mt     on mt.activo_id = a.id
where a.categoria = 'ACTIVO_FIJO'
order by a.fecha desc;

comment on view public.activos_fijos is
  'Los activos fijos de la empresa: que son, cuanto costaron, si siguen en garantia, cuanto valen en libros y cuanto se ha gastado manteniendolos. La depreciacion es informativa: en Regimen Simple no baja el impuesto.';


-- ------------------------------------------------------------
-- PASO 4: posicion_financiera deja de contar los activos como gasto
-- ------------------------------------------------------------
-- Solo cambia el CTE gastos_op (excluye ACTIVO_FIJO) y se agregan dos
-- campos nuevos: activos_fijos y activos_fijos_num. El resto es identico
-- a la migracion 035.
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
    coalesce(sum(av.iva_neto_dian), 0)              as iva_causado,
    coalesce(sum(av.impuesto_simple_pendiente), 0)  as simple_causado,
    coalesce(sum(av.utilidad_bruta), 0)             as utilidad_bruta_acum,
    coalesce(sum(av.utilidad_neta), 0)              as utilidad_neta_acum,
    coalesce(sum(av.venta_subtotal), 0)             as ventas_subtotal_acum,
    coalesce(sum(av.costo_real), 0)                 as costo_real_acum,
    count(*)                                        as num_ventas
  from public.analisis_venta av
  where av.estado in ('FACTURADA','DESPACHADA','ENTREGADO','POR_COBRAR','COBRADA','ENTREGA_PARCIAL','EN_ALISTAMIENTO','PAGADA')
),
por_pagar as (
  select coalesce(sum(coalesce(total_neto, total - coalesce(retencion_total, 0))), 0) as cuentas_por_pagar
  from public.facturas_compra
  where estado in ('REGISTRADA','POR_PAGAR','VENCIDA')
),
por_cobrar as (
  select coalesce(sum(total - coalesce(retencion_total,0)), 0) as cuentas_por_cobrar
  from public.facturas_venta
  where estado = 'EMITIDA'
),
-- AQUI ESTA EL CAMBIO DE ESTA MIGRACION.
-- La compra de una impresora no es un gasto del periodo: es cambiar plata
-- por una cosa que sigue valiendo. Si se cuenta como gasto, el resultado
-- operativo del mes sale hundido por una inversion.
gastos_op as (
  select coalesce(sum(monto), 0) as gastos_operativos
  from public.gastos
  where es_costo_venta = false
    and categoria <> 'ACTIVO_FIJO'
),
inversion_activos as (
  select
    coalesce(sum(monto), 0) as activos_fijos,
    count(*)                as activos_fijos_num
  from public.gastos
  where categoria = 'ACTIVO_FIJO'
    and coalesce(activo_estado, 'EN_USO') <> 'DE_BAJA'
),
gmf_total as (
  select coalesce(sum(monto), 0) as gmf_pagado
  from public.movimientos_tesoreria
  where categoria = 'GMF'
),
retenciones_causadas as (
  select coalesce(sum(retencion_total), 0) as total_causado
  from public.facturas_compra
  where estado <> 'ANULADA'
),
impuestos_pagados as (
  select
    coalesce(sum(case when tipo_impuesto = 'IVA' then monto else 0 end), 0)    as iva_pagado,
    coalesce(sum(case when tipo_impuesto = 'SIMPLE' then monto else 0 end), 0) as simple_pagado,
    coalesce(sum(case when tipo_impuesto in ('RETEFUENTE','RETEICA') then monto else 0 end), 0) as retenciones_pagadas
  from public.movimientos_tesoreria
  where categoria = 'PAGO_IMPUESTO' and tipo_impuesto is not null
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
    greatest(ov.iva_causado - ip.iva_pagado, 0)                   as iva_por_pagar,
    greatest(ov.simple_causado - ip.simple_pagado, 0)             as simple_por_pagar,
    greatest(rc.total_causado - ip.retenciones_pagadas, 0)        as retenciones_por_declarar,
    pp.cuentas_por_pagar,
    pc.cuentas_por_cobrar,
    ov.ventas_subtotal_acum,
    ov.costo_real_acum,
    ov.utilidad_bruta_acum,
    ov.utilidad_neta_acum,
    ov.num_ventas,
    go.gastos_operativos,
    ia.activos_fijos,
    ia.activos_fijos_num,
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
  cross join inversion_activos ia
  cross join gmf_total gt
  cross join retenciones_causadas rc
  cross join impuestos_pagados ip
  cross join socios so
  cross join pipeline pl
),
final as (
  select
    c.*,
    c.iva_por_pagar + c.simple_por_pagar + c.retenciones_por_declarar as impuestos_por_pagar,
    greatest(
      c.iva_por_pagar + c.simple_por_pagar + c.retenciones_por_declarar - c.saldo_reservas,
      0
    ) as impuestos_sin_apartar
  from calculo c
)
select
  -- Caja
  f.saldo_operativo,
  f.saldo_reservas,
  f.saldo_total,

  -- Obligaciones
  f.iva_por_pagar,
  f.simple_por_pagar,
  f.retenciones_por_declarar,
  f.impuestos_por_pagar,
  f.cuentas_por_pagar,
  f.impuestos_por_pagar + f.cuentas_por_pagar            as total_comprometido,
  f.impuestos_sin_apartar,

  -- EL NUMERO CLAVE
  f.saldo_operativo - f.impuestos_sin_apartar - f.cuentas_por_pagar
                                                         as disponible_real,

  -- Cartera
  f.cuentas_por_cobrar,
  f.saldo_operativo + f.cuentas_por_cobrar
    - f.impuestos_sin_apartar - f.cuentas_por_pagar       as disponible_proyectado,

  -- Resultados
  f.ventas_subtotal_acum,
  f.costo_real_acum,
  f.utilidad_bruta_acum,
  f.utilidad_neta_acum,
  case when f.ventas_subtotal_acum > 0
       then round((f.utilidad_bruta_acum / f.ventas_subtotal_acum) * 100, 2)
       else 0 end                                        as margen_bruto_pct,

  -- Gastos (ya SIN los activos fijos)
  f.gastos_operativos,
  f.gmf_pagado,
  f.gastos_operativos + f.gmf_pagado                     as gastos_operativos_total,
  f.utilidad_neta_acum - f.gastos_operativos - f.gmf_pagado as resultado_operativo,

  -- Inversion en activos fijos: salio del banco pero NO es gasto
  f.activos_fijos,
  f.activos_fijos_num,

  -- Capital
  f.capital_social,
  f.prestamos_socios,
  f.dividendos_pagados,

  -- Actividad
  f.num_ventas,
  f.pipeline_total,
  f.pipeline_num,

  -- Alertas
  (f.saldo_reservas < f.impuestos_por_pagar)             as reserva_insuficiente,
  (f.saldo_operativo - f.impuestos_sin_apartar - f.cuentas_por_pagar) < 0 as en_riesgo

from final f;

comment on view public.posicion_financiera is
  'Posicion financiera real. Los activos fijos ya NO se cuentan como gasto operativo: salen del banco pero son inversion, y se reportan aparte en activos_fijos. cuentas_por_pagar usa el neto. Las obligaciones se extinguen con los pagos registrados como PAGO_IMPUESTO con su tipo_impuesto.';



-- ============================================================
-- COMPROBACION
-- ============================================================
-- 1. Que la categoria nueva ya se acepte
select 'ACTIVO_FIJO ya se puede usar' as resultado
where exists (
  select 1 from information_schema.check_constraints
  where constraint_name = 'gastos_categoria_check'
    and check_clause like '%ACTIVO_FIJO%'
);

-- 2. Los activos fijos que haya (al principio va a salir vacio)
select activo, fecha_compra, costo_total, estado_garantia,
       garantia_hasta, valor_en_libros, gasto_mantenimiento
from public.activos_fijos;

-- 3. Que los activos no esten inflando los gastos operativos
select gastos_operativos, activos_fijos, activos_fijos_num, resultado_operativo
from public.posicion_financiera;
