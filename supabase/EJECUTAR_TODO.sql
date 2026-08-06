-- ============================================================
--   ABASTECER EMPRESARIAL SAS
--   >>> CORRE SOLO ESTE ARCHIVO <<<
-- ============================================================
--
-- Este archivo contiene TODO lo que falta ejecutar, ya en el orden
-- correcto. Reemplaza a las migraciones 029, 030 y 031: no corras
-- esas por separado.
--
-- OJO CON LA 030: crea un indice unico sobre (proveedor + numero de
-- factura). Si la corres suelta AHORA, FALLA, porque todavia existen
-- las facturas duplicadas (PROCOLDEXT FECL434 y MULTIREDES FEC1-25585).
-- Aqui el indice se crea DESPUES de anular los duplicados, que es el
-- unico orden que funciona.
--
-- ------------------------------------------------------------
-- COMO CORRERLO
-- ------------------------------------------------------------
-- 1. CIERRA LA PESTANA DEL ERP. Esto recrea vistas y altera tablas,
--    y necesita bloqueo exclusivo. Si el ERP esta abierto consultando,
--    Postgres tira "deadlock detected".
-- 2. Copia TODO este archivo y pegalo en el SQL Editor de Supabase.
-- 3. RUN. Una sola vez, de corrido. Se puede repetir sin dano.
-- 4. Cuando termine, corre supabase/VERIFICAR_INTEGRIDAD.sql.
--    Todas las filas deben decir OK.
--
-- ------------------------------------------------------------
-- QUE CONTIENE
-- ------------------------------------------------------------
-- PARTE 1 (029) - Retenciones practicadas a proveedores:
--   columnas retencion_retefuente / reteiva / reteica / total_neto
--   en facturas_compra. La 031 las necesita, por eso van primero.
--
-- PARTE 2 (031) - Correcciones de la auditoria:
--   arregla el doble conteo de retenciones, la reteIVA que caia en la
--   cubeta del Simple, el 4x1000 cobrado en traslados propios, el
--   costo_promedio inflado, las obligaciones con la DIAN que nunca se
--   extinguian, y anula automaticamente las facturas duplicadas.
--   Incluye el indice unico de la 030 al final, cuando ya no hay
--   duplicados que lo bloqueen.
-- ============================================================


-- ############################################################
-- ##  PARTE 1 de 2  --  migracion 029
-- ############################################################

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


-- ############################################################
-- ##  PARTE 2 de 2  --  migracion 031
-- ############################################################

-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Correcciones de la auditoria
-- Migracion 031
-- ============================================================
-- Corrige los errores de calculo encontrados en la auditoria
-- completa del 2026-08-06. Cada bloque explica QUE estaba mal,
-- CUANTO costaba en pesos, y COMO queda.
--
-- Es idempotente: se puede correr varias veces sin dano.
--
-- ------------------------------------------------------------
-- ANTES DE CORRER, LEE ESTO
-- ------------------------------------------------------------
-- 1. Corre primero la 029 y la 030 (esta migracion usa las
--    columnas de retenciones de facturas_compra que crea la 029).
-- 2. CIERRA LA PESTANA DEL ERP. Esta migracion recrea vistas y
--    altera tablas, y necesita bloqueo exclusivo. Si el ERP esta
--    abierto consultando, Postgres tira "deadlock detected".
-- 3. Pega TODO el archivo de una sola vez y dale RUN.
-- 4. Cuando termine, corre supabase/VERIFICAR_INTEGRIDAD.sql:
--    todas las filas deben decir OK.
-- ============================================================


-- ============================================================
-- BUG 1: DOBLE CONTEO de retenciones en facturas a credito
-- ============================================================
-- cuentas_por_pagar sumaba el total BRUTO de la factura, y aparte
-- se restaba retenciones_por_declarar. Como una factura a credito
-- aparece en los dos lados, la retencion se restaba DOS VECES.
--
-- Ejemplo: factura de 1.536.290 con retencion de 32.275 a credito
--   Deuda real al proveedor ..... 1.504.015  (el neto)
--   Deuda real a la DIAN ........... 32.275
--   Compromiso real ............. 1.536.290
--   Lo que restaba la vista ..... 1.568.565  <- 32.275 de mas
--
-- FIX: cuentas_por_pagar usa el NETO (lo que realmente se le debe
-- al proveedor). La retencion se cuenta una sola vez, aparte.
-- ============================================================


-- ============================================================
-- BUG 2: El pasivo con la DIAN era PERPETUO
-- ============================================================
-- retenciones_por_declarar sumaba TODAS las facturas no anuladas,
-- para siempre. Cuando el usuario pagaba la declaracion, la plata
-- salia del banco Y la obligacion seguia restando. Se descontaba
-- dos veces, permanentemente.
--
-- Lo mismo pasaba con el IVA y el Simple: nada los reducia al
-- declarar, y si se pagaban DESDE la cuenta de reserva, el saldo
-- de reserva bajaba y impuestos_sin_apartar los RESUCITABA.
--
-- FIX: se agrega tipo_impuesto a los movimientos de PAGO_IMPUESTO
-- y las obligaciones se reducen con lo ya pagado.
-- ============================================================

alter table public.movimientos_tesoreria
  add column if not exists tipo_impuesto text
    check (tipo_impuesto is null or tipo_impuesto in (
      'IVA','SIMPLE','RETEFUENTE','RETEICA','ICA','OTRO'
    ));

-- ============================================================
-- BUG 2b: CADENA ROTA - las retenciones del flujo a CREDITO no
-- llegaban al analisis de la venta
-- ============================================================
-- En contado, registrarPagoContado escribia las retenciones en
-- cotizaciones. En credito, marcarFacturaCobrada las escribia en
-- facturas_venta.retencion_total (solo el total, sin desglose) y
-- NUNCA en la cotizacion.
--
-- La vista analisis_venta leia solo de cotizaciones, asi que para
-- TODA venta a credito las retenciones eran 0. Con el caso real
-- (reteIVA 36.480) el sistema exigia apartar 36.480 de mas por venta.
--
-- FIX: facturas_venta tambien guarda el desglose, y la vista lee
-- de ambos lados.
-- ============================================================

alter table public.facturas_venta
  add column if not exists retencion_retefuente numeric(15,2) not null default 0,
  add column if not exists retencion_reteiva    numeric(15,2) not null default 0,
  add column if not exists retencion_reteica    numeric(15,2) not null default 0;

comment on column public.facturas_venta.retencion_retefuente is
  'Retefuente que el cliente practico. Anticipo del impuesto de renta/Simple.';
comment on column public.facturas_venta.retencion_reteiva is
  'ReteIVA que el cliente practico. Anticipo del IVA, NO del Simple.';
comment on column public.facturas_venta.retencion_reteica is
  'ReteICA que el cliente practico. Anticipo del ICA/Simple.';

comment on column public.movimientos_tesoreria.tipo_impuesto is
  'Solo para movimientos de categoria PAGO_IMPUESTO: que impuesto se pago. Permite extinguir la obligacion correspondiente.';

create index if not exists idx_mt_tipo_impuesto
  on public.movimientos_tesoreria(tipo_impuesto)
  where tipo_impuesto is not null;


-- ============================================================
-- BUG 3: El GMF se cobraba en traslados entre cuentas propias
-- ============================================================
-- Mover plata de Bold a la "Reserva impuestos" (que es una cuenta
-- logica, un sobre virtual, sin banco real) generaba un cobro de
-- 4x1000 inventado. Ejemplo: trasladar 157.359 cobraba 630 pesos
-- que el banco nunca cobro, descuadrando el saldo.
--
-- Ademas el trigger era solo AFTER INSERT: si se editaba el monto
-- de un movimiento, el GMF viejo quedaba con el valor equivocado.
--
-- FIX: no generar GMF en traslados entre cuentas propias, y
-- recalcular el GMF cuando cambie el monto del movimiento padre.
-- ============================================================

create or replace function public.generar_gmf()
returns trigger
language plpgsql
as $$
declare
  tasa numeric;
  monto_gmf numeric;
  cuenta_cobra_gmf boolean;
begin
  -- Solo egresos
  if new.tipo <> 'EGRESO' then
    return new;
  end if;

  -- No generar GMF del GMF (evita recursion infinita)
  if new.categoria = 'GMF' then
    return new;
  end if;

  -- Los traslados entre cuentas PROPIAS no generan 4x1000.
  -- Mover plata de Bold al sobre de reserva no es una salida real
  -- de dinero: el banco no lo cobra porque es la misma titularidad
  -- (y la cuenta de reserva del sistema es logica, no bancaria).
  -- Un AJUSTE es una correccion manual del saldo (para cuadrar con
  -- el extracto), no una salida real de plata. Cobrarle 4x1000
  -- obligaria a hacer otro ajuste, y otro, sin fin.
  if new.categoria in ('TRASLADO_SALIDA','TRASLADO_ENTRADA','AJUSTE') then
    return new;
  end if;

  -- Si la cuenta esta marcada como exenta, no cobrar
  select coalesce(c.cobra_gmf, true)
  into cuenta_cobra_gmf
  from public.cuentas c
  where c.id = new.cuenta_id;

  if not cuenta_cobra_gmf then
    return new;
  end if;

  -- Tasa: se guarda como 0.4 con unidad PORCENTAJE (0.4% = 4 por mil)
  select coalesce(
    (select valor / 100 from public.config_tributaria where clave = 'GMF_TASA'),
    0.004
  ) into tasa;

  if tasa <= 0 then
    return new;
  end if;

  monto_gmf := ceil(new.monto * tasa);

  if monto_gmf <= 0 then
    return new;
  end if;

  insert into public.movimientos_tesoreria (
    cuenta_id, fecha, tipo, categoria, monto, concepto,
    factura_compra_id, cotizacion_id, gasto_id, movimiento_socio_id,
    medio_pago, creado_por_id, creado_por_nombre, gmf_de_id
  ) values (
    new.cuenta_id,
    new.fecha,
    'EGRESO',
    'GMF',
    monto_gmf,
    'GMF (4x1000) ' || left(new.concepto, 80),
    new.factura_compra_id,
    new.cotizacion_id,
    new.gasto_id,
    new.movimiento_socio_id,
    'Cobro bancario',
    new.creado_por_id,
    new.creado_por_nombre,
    new.id
  );

  return new;
end;
$$;

comment on function public.generar_gmf is
  'Cada EGRESO real genera su cobro de 4x1000. No aplica a traslados entre cuentas propias ni a cuentas marcadas exentas.';


-- Recalcular el GMF cuando cambia el monto del movimiento padre
create or replace function public.recalcular_gmf()
returns trigger
language plpgsql
as $$
declare
  tasa numeric;
  monto_gmf numeric;
begin
  -- Solo si cambio el monto y no es el GMF mismo
  if new.categoria = 'GMF' then
    return new;
  end if;
  if old.monto = new.monto then
    return new;
  end if;

  select coalesce(
    (select valor / 100 from public.config_tributaria where clave = 'GMF_TASA'),
    0.004
  ) into tasa;

  monto_gmf := ceil(new.monto * tasa);

  -- Actualizar el GMF hijo si existe
  update public.movimientos_tesoreria
  set monto = monto_gmf,
      concepto = 'GMF (4x1000) ' || left(new.concepto, 80),
      fecha = new.fecha
  where gmf_de_id = new.id
    and categoria = 'GMF'
    and monto_gmf > 0;

  return new;
end;
$$;

comment on function public.recalcular_gmf is
  'Si se corrige el monto de un movimiento, su 4x1000 se ajusta solo. Antes quedaba con el valor viejo y descuadraba el banco.';

drop trigger if exists trg_gmf_recalcular on public.movimientos_tesoreria;
create trigger trg_gmf_recalcular
  after update of monto on public.movimientos_tesoreria
  for each row execute function public.recalcular_gmf();


-- ============================================================
-- LIMPIEZA AUTOMATICA DE DATOS YA REGISTRADOS
-- ============================================================

-- 1. Borrar los GMF que se generaron sobre traslados entre cuentas
--    propias y sobre ajustes manuales (cobros que el banco nunca hizo)
delete from public.movimientos_tesoreria gmf
where gmf.categoria = 'GMF'
  and exists (
    select 1 from public.movimientos_tesoreria padre
    where padre.id = gmf.gmf_de_id
      and padre.categoria in ('TRASLADO_SALIDA','TRASLADO_ENTRADA','AJUSTE')
  );

-- 2. Recalcular los GMF que quedaron con monto equivocado
--    (por el bug de /1000 en vez de /100, o por ediciones)
update public.movimientos_tesoreria gmf
set monto = ceil(padre.monto * 0.004)
from public.movimientos_tesoreria padre
where gmf.gmf_de_id = padre.id
  and gmf.categoria = 'GMF'
  and padre.categoria not in ('TRASLADO_SALIDA','TRASLADO_ENTRADA','AJUSTE')
  and gmf.monto <> ceil(padre.monto * 0.004);

-- 3. Generar los GMF que faltan (movimientos sin su cobro)
insert into public.movimientos_tesoreria (
  cuenta_id, fecha, tipo, categoria, monto, concepto,
  factura_compra_id, cotizacion_id, gasto_id, movimiento_socio_id,
  medio_pago, creado_por_nombre, gmf_de_id
)
select
  mt.cuenta_id, mt.fecha, 'EGRESO', 'GMF',
  ceil(mt.monto * 0.004),
  'GMF (4x1000) ' || left(mt.concepto, 80),
  mt.factura_compra_id, mt.cotizacion_id, mt.gasto_id, mt.movimiento_socio_id,
  'Cobro bancario', 'SISTEMA (auditoria)', mt.id
from public.movimientos_tesoreria mt
join public.cuentas c on c.id = mt.cuenta_id
where mt.tipo = 'EGRESO'
  and mt.categoria not in ('GMF','TRASLADO_SALIDA','TRASLADO_ENTRADA','AJUSTE')
  and coalesce(c.cobra_gmf, true)
  and ceil(mt.monto * 0.004) > 0
  and not exists (
    select 1 from public.movimientos_tesoreria g where g.gmf_de_id = mt.id
  );

-- 4. Recalcular retencion_total y total_neto de todas las facturas
--    de compra (el trigger solo corria en insert/update nuevos)
update public.facturas_compra
set retencion_retefuente = coalesce(retencion_retefuente, 0)
where total_neto is null
   or retencion_total <> (coalesce(retencion_retefuente,0)
                        + coalesce(retencion_reteiva,0)
                        + coalesce(retencion_reteica,0));


-- ============================================================
-- BUG 4: analisis_venta - retenciones en la cubeta equivocada
-- ============================================================
-- La reteIVA es un anticipo del IVA, pero la vista la restaba del
-- impuesto SIMPLE. Resultado con el caso real (reteIVA 36.480):
--   SIMPLE sub-reservado en 36.480
--   IVA sobre-reservado en 36.480
--
-- Ademas:
--  - iva_neto_dian no tenia piso: una venta con IVA negativo
--    (mas IVA pagado que cobrado) TAPABA la obligacion de otra
--  - el saldo a favor cuando las retenciones superan el impuesto
--    se truncaba a 0 y desaparecia de todos los reportes
--
-- FIX: cada retencion a su cubeta, piso por venta, y el saldo a
-- favor queda visible.
-- ============================================================

drop view if exists public.posicion_financiera;
drop view if exists public.estado_reserva_impuestos;
drop view if exists public.obligaciones_por_periodo;
drop view if exists public.analisis_venta;

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
gmf_de_venta as (
  select
    mt.cotizacion_id,
    sum(mt.monto) as gmf_venta,
    count(*)      as num_gmf
  from public.movimientos_tesoreria mt
  where mt.categoria = 'GMF' and mt.cotizacion_id is not null
  group by mt.cotizacion_id
),
-- Las retenciones pueden venir de la cotizacion (contado) o de la
-- factura de venta (credito). Se toma el mayor de los dos para no
-- perder el dato si el flujo escribio en uno solo.
retenciones_venta as (
  select
    c.id as cotizacion_id,
    greatest(coalesce(c.retencion_retefuente, 0), coalesce(fv.ret_retefuente, 0)) as ret_retefuente,
    greatest(coalesce(c.retencion_reteiva, 0),    coalesce(fv.ret_reteiva, 0))    as ret_reteiva,
    greatest(coalesce(c.retencion_reteica, 0),    coalesce(fv.ret_reteica, 0))    as ret_reteica
  from public.cotizaciones c
  left join (
    select
      cotizacion_id,
      sum(coalesce(retencion_retefuente, 0)) as ret_retefuente,
      sum(coalesce(retencion_reteiva, 0))    as ret_reteiva,
      sum(coalesce(retencion_reteica, 0))    as ret_reteica
    from public.facturas_venta
    where estado <> 'ANULADA' and cotizacion_id is not null
    group by cotizacion_id
  ) fv on fv.cotizacion_id = c.id
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
  -- La reteIVA es anticipo del IVA: se resta AQUI, no del Simple.
  coalesce(cc.iva_compras, 0)                 as iva_compras,
  coalesce(cg.iva_gastos, 0)                  as iva_gastos,
  coalesce(cc.iva_compras, 0) + coalesce(cg.iva_gastos, 0)     as iva_pagado,
  rv.ret_reteiva                              as retencion_reteiva,
  -- IVA a pagar, con piso en 0 por venta para que una venta con
  -- saldo a favor no tape la obligacion de otra
  greatest(
    c.iva_total
      - (coalesce(cc.iva_compras, 0) + coalesce(cg.iva_gastos, 0))
      - rv.ret_reteiva,
    0
  )                                           as iva_neto_dian,
  -- El saldo a favor de IVA queda visible en vez de perderse
  greatest(
    (coalesce(cc.iva_compras, 0) + coalesce(cg.iva_gastos, 0) + rv.ret_reteiva)
      - c.iva_total,
    0
  )                                           as iva_saldo_favor,

  -- ---------- UTILIDAD BRUTA ----------
  c.subtotal - (coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0)) as utilidad_bruta,
  case when c.subtotal > 0
       then round(
              ((c.subtotal - (coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0)))
               / c.subtotal) * 100, 2)
       else 0 end                             as margen_bruto_pct,

  -- ---------- IMPUESTO SIMPLE ----------
  -- Solo retefuente y reteICA son anticipo de renta/Simple.
  round(c.subtotal * t.simple_pct / 100, 2)   as impuesto_simple,
  rv.ret_retefuente                           as retencion_retefuente,
  rv.ret_reteica                               as retencion_reteica,
  rv.ret_retefuente + rv.ret_reteica + rv.ret_reteiva as retenciones,
  greatest(
    round(c.subtotal * t.simple_pct / 100, 2) - (rv.ret_retefuente + rv.ret_reteica),
    0
  )                                           as impuesto_simple_pendiente,
  -- Saldo a favor del Simple, visible en vez de truncado
  greatest(
    (rv.ret_retefuente + rv.ret_reteica) - round(c.subtotal * t.simple_pct / 100, 2),
    0
  )                                           as simple_saldo_favor,

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
  greatest(
    c.iva_total
      - (coalesce(cc.iva_compras, 0) + coalesce(cg.iva_gastos, 0))
      - rv.ret_reteiva,
    0
  )
  + greatest(
    round(c.subtotal * t.simple_pct / 100, 2) - (rv.ret_retefuente + rv.ret_reteica),
    0
  )                                           as total_a_separar,

  -- ---------- FLUJO DE CAJA ----------
  coalesce(c.monto_recibido, 0)               as monto_recibido,

  -- ---------- GMF (informativo) ----------
  coalesce(gv.gmf_venta, 0)                   as gmf_venta,
  coalesce(gv.num_gmf, 0)                     as num_gmf,
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
left join gmf_de_venta  gv   on gv.cotizacion_id = c.id
join retenciones_venta  rv   on rv.cotizacion_id = c.id;

comment on view public.analisis_venta is
  'Analisis por venta. La reteIVA reduce el IVA y la retefuente/reteICA reducen el Simple (cada una en su cubeta). Los saldos a favor quedan visibles. Las retenciones se leen de la cotizacion (contado) o de la factura de venta (credito).';


-- ------------------------------------------------------------
-- obligaciones_por_periodo (se recrea, dependia de analisis_venta)
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
  sum(av.iva_saldo_favor)                                  as iva_saldo_favor,
  sum(av.impuesto_simple)                                  as simple_causado,
  sum(av.retenciones)                                      as retenciones_a_favor,
  sum(av.impuesto_simple_pendiente)                        as simple_a_pagar,
  sum(av.simple_saldo_favor)                               as simple_saldo_favor,
  sum(av.utilidad_bruta)                                   as utilidad_bruta,
  sum(av.utilidad_neta)                                    as utilidad_neta
from public.analisis_venta av
where av.estado in ('FACTURADA','DESPACHADA','ENTREGADO','POR_COBRAR','COBRADA','ENTREGA_PARCIAL','EN_ALISTAMIENTO','PAGADA')
group by 1, 2, 3
order by 1 desc, 3 desc;

comment on view public.obligaciones_por_periodo is
  'IVA y Simple por mes/bimestre. Incluye EN_ALISTAMIENTO y PAGADA: en el flujo de contado la plata ya entro al banco y la obligacion existe aunque no se haya facturado.';


-- ------------------------------------------------------------
-- BUG 5: estado_reserva_impuestos omitia las retenciones
-- practicadas a proveedores y no descontaba lo ya pagado
-- ------------------------------------------------------------
-- debe_estar_reservado solo sumaba IVA + Simple. Las retenciones
-- que la empresa le practica a sus proveedores tambien hay que
-- declararlas y pagarlas, y no se estaban apartando.
-- Con 20 facturas de 32.275 quedaban 645.500 de la DIAN
-- presentados como plata disponible.
-- ------------------------------------------------------------
create view public.estado_reserva_impuestos as
with
obligaciones as (
  select
    coalesce(sum(av.iva_neto_dian), 0)             as iva_causado,
    coalesce(sum(av.impuesto_simple_pendiente), 0) as simple_causado
  from public.analisis_venta av
  where av.estado in ('FACTURADA','DESPACHADA','ENTREGADO','POR_COBRAR','COBRADA','ENTREGA_PARCIAL','EN_ALISTAMIENTO','PAGADA')
),
retenciones_practicadas_cte as (
  select coalesce(sum(retencion_total), 0) as retenciones_causadas
  from public.facturas_compra
  where estado <> 'ANULADA'
),
-- Lo que ya se le pago a la DIAN, por tipo
pagado as (
  select
    coalesce(sum(case when tipo_impuesto = 'IVA' then monto else 0 end), 0)    as iva_pagado,
    coalesce(sum(case when tipo_impuesto = 'SIMPLE' then monto else 0 end), 0) as simple_pagado,
    coalesce(sum(case when tipo_impuesto in ('RETEFUENTE','RETEICA') then monto else 0 end), 0) as retenciones_pagadas
  from public.movimientos_tesoreria
  where categoria = 'PAGO_IMPUESTO' and tipo_impuesto is not null
),
reserva as (
  select
    coalesce(sum(saldo_actual), 0) as saldo_reserva,
    (select id::text from public.saldos_cuentas
      where es_reserva and activa order by orden, id limit 1) as cuenta_reserva_id
  from public.saldos_cuentas
  where es_reserva and activa
),
operativa as (
  select coalesce(sum(saldo_actual), 0) as saldo_operativo
  from public.saldos_cuentas
  where not es_reserva and activa
),
calc as (
  select
    greatest(o.iva_causado - p.iva_pagado, 0)                    as iva_por_pagar,
    greatest(o.simple_causado - p.simple_pagado, 0)              as simple_por_pagar,
    greatest(rp.retenciones_causadas - p.retenciones_pagadas, 0) as retenciones_por_pagar,
    r.saldo_reserva,
    r.cuenta_reserva_id,
    op.saldo_operativo
  from obligaciones o
  cross join retenciones_practicadas_cte rp
  cross join pagado p
  cross join reserva r
  cross join operativa op
)
select
  c.iva_por_pagar,
  c.simple_por_pagar,
  c.retenciones_por_pagar,
  c.iva_por_pagar + c.simple_por_pagar + c.retenciones_por_pagar as debe_estar_reservado,
  c.saldo_reserva                                                as esta_reservado,
  greatest(c.iva_por_pagar + c.simple_por_pagar + c.retenciones_por_pagar - c.saldo_reserva, 0) as falta_trasladar,
  greatest(c.saldo_reserva - (c.iva_por_pagar + c.simple_por_pagar + c.retenciones_por_pagar), 0) as sobra_en_reserva,
  c.saldo_operativo,
  (c.saldo_operativo >= greatest(c.iva_por_pagar + c.simple_por_pagar + c.retenciones_por_pagar - c.saldo_reserva, 0)) as alcanza_para_trasladar,
  c.cuenta_reserva_id
from calc c;

comment on view public.estado_reserva_impuestos is
  'Cuanto debe estar apartado para la DIAN: IVA + Simple + retenciones practicadas a proveedores, menos lo ya pagado. Antes omitia las retenciones y nunca descontaba los pagos.';


-- ------------------------------------------------------------
-- posicion_financiera corregida
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
-- FIX BUG 1: usa el NETO, que es lo que realmente se le debe al
-- proveedor. La retencion se cuenta aparte, una sola vez.
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
retenciones_causadas as (
  select coalesce(sum(retencion_total), 0) as total_causado
  from public.facturas_compra
  where estado <> 'ANULADA'
),
-- FIX BUG 2: lo que ya se le pago a la DIAN extingue la obligacion
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
  cross join retenciones_causadas rc
  cross join impuestos_pagados ip
  cross join socios so
  cross join pipeline pl
),
final as (
  select
    c.*,
    c.iva_por_pagar + c.simple_por_pagar + c.retenciones_por_declarar as impuestos_por_pagar,
    -- Lo que falta apartar en la reserva
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

  -- Gastos
  f.gastos_operativos,
  f.gmf_pagado,
  f.gastos_operativos + f.gmf_pagado                     as gastos_operativos_total,
  f.utilidad_neta_acum - f.gastos_operativos - f.gmf_pagado as resultado_operativo,

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
  'Posicion financiera real. cuentas_por_pagar usa el neto (sin la retencion, que se cuenta aparte). Las obligaciones se extinguen con los pagos registrados como PAGO_IMPUESTO con su tipo_impuesto.';


-- ============================================================
-- BUG 6: costo_promedio no se revertia al borrar items de compra
-- ============================================================
-- Al editar o anular una factura, el codigo revertia el stock pero
-- NO el costo_promedio. Cada edicion volvia a promediar el mismo
-- precio contra si mismo:
--   10u@10.000 + factura 10u@20.000 -> cp 15.000 (correcto)
--   editar sin cambiar nada        -> cp 17.500 (mal)
--   editar otra vez               -> cp 18.750 (peor)
-- El inventario quedaba sobrevalorado hasta +33% y el
-- precio_sugerido inflado.
--
-- FIX: al borrar items de compra, recalcular el costo_promedio
-- desde cero con las compras que siguen vivas.
-- ============================================================

create or replace function public.revertir_costo_al_borrar_item()
returns trigger
language plpgsql
as $$
declare
  nuevo_stock numeric;
  nuevo_costo numeric;
  suma_subtotal numeric;
  suma_cantidad numeric;
begin
  if old.producto_id is null then
    return old;
  end if;

  -- Recalcular el costo promedio desde las compras vivas
  -- (excluyendo el item que se esta borrando y las facturas anuladas)
  select
    coalesce(sum(fci.subtotal), 0),
    coalesce(sum(fci.cantidad), 0)
  into suma_subtotal, suma_cantidad
  from public.factura_compra_items fci
  join public.facturas_compra fc on fc.id = fci.factura_compra_id
  where fci.producto_id = old.producto_id
    and fci.id <> old.id
    and fc.estado <> 'ANULADA';

  if suma_cantidad > 0 then
    nuevo_costo := round(suma_subtotal / suma_cantidad, 2);
    update public.productos
    set costo_promedio = nuevo_costo
    where id = old.producto_id;
  end if;

  return old;
end;
$$;

comment on function public.revertir_costo_al_borrar_item is
  'Al borrar un item de factura de compra, recalcula el costo_promedio del producto desde las compras que siguen vivas. Antes el costo quedaba inflado tras cada edicion.';

drop trigger if exists trg_revertir_costo_item on public.factura_compra_items;
create trigger trg_revertir_costo_item
  after delete on public.factura_compra_items
  for each row execute function public.revertir_costo_al_borrar_item();


-- Recalcular AHORA el costo_promedio de todos los productos, para
-- corregir la deriva que ya se acumulo
update public.productos p
set costo_promedio = sub.costo_real
from (
  select
    fci.producto_id,
    round(sum(fci.subtotal) / nullif(sum(fci.cantidad), 0), 2) as costo_real
  from public.factura_compra_items fci
  join public.facturas_compra fc on fc.id = fci.factura_compra_id
  where fc.estado <> 'ANULADA'
    and fci.producto_id is not null
  group by fci.producto_id
) sub
where p.id = sub.producto_id
  and sub.costo_real is not null
  and p.costo_promedio <> sub.costo_real;


-- ============================================================
-- BUG 7: facturas de compra duplicadas
-- ============================================================
-- Se registraron facturas repetidas (mismo proveedor + numero +
-- total) por doble clic o reintento tras error. Cada duplicado
-- duplico el stock, el pago de caja y el GMF.
--
-- FIX AUTOMATICO: anular los duplicados dejando solo el mas
-- antiguo de cada grupo, y revertir su efecto.
-- ============================================================

do $$
declare
  dup record;
begin
  for dup in
    select fc.id, fc.numero_factura, fc.total
    from public.facturas_compra fc
    where fc.estado <> 'ANULADA'
      and fc.numero_factura is not null
      and fc.numero_factura <> ''
      and exists (
        select 1 from public.facturas_compra otra
        where otra.proveedor_id = fc.proveedor_id
          and otra.numero_factura = fc.numero_factura
          and otra.estado <> 'ANULADA'
          and otra.created_at < fc.created_at
      )
  loop
    -- Borrar los items (el trigger nuevo recalcula stock y costo)
    delete from public.factura_compra_items where factura_compra_id = dup.id;
    -- Borrar los movimientos de caja y su GMF (cascade)
    delete from public.movimientos_tesoreria where factura_compra_id = dup.id;
    -- Marcar como anulada
    update public.facturas_compra
    set estado = 'ANULADA',
        notas = coalesce(notas || ' | ', '') || 'ANULADA AUTOMATICAMENTE: duplicado detectado en auditoria'
    where id = dup.id;

    raise notice 'Factura duplicada anulada: % por %', dup.numero_factura, dup.total;
  end loop;
end $$;


-- Ahora que no hay duplicados, crear el indice unico que los previene
create unique index if not exists idx_facturas_compra_no_duplicar
  on public.facturas_compra (proveedor_id, numero_factura)
  where estado <> 'ANULADA' and numero_factura is not null and numero_factura <> '';

comment on index public.idx_facturas_compra_no_duplicar is
  'Evita registrar dos veces la misma factura mientras no este anulada. Protege contra doble clic y condiciones de carrera.';


-- Recalcular el stock de todos los productos desde cero, para
-- corregir lo que quedo mal por los duplicados
update public.productos p
set stock_actual = coalesce(sub.entradas, 0) - coalesce(sal.salidas, 0)
from (
  select fci.producto_id, sum(fci.cantidad) as entradas
  from public.factura_compra_items fci
  join public.facturas_compra fc on fc.id = fci.factura_compra_id
  where fc.estado <> 'ANULADA' and fci.producto_id is not null
  group by fci.producto_id
) sub
left join (
  select fvi.producto_id, sum(fvi.cantidad) as salidas
  from public.factura_venta_items fvi
  join public.facturas_venta fv on fv.id = fvi.factura_venta_id
  where fv.estado <> 'ANULADA' and fvi.producto_id is not null
  group by fvi.producto_id
) sal on sal.producto_id = sub.producto_id
where p.id = sub.producto_id;



-- ============================================================
-- BUG 8: Los traslados entre cuentas no eran atomicos
-- ============================================================
-- ejecutarTraslado hacia 3 llamadas REST sueltas:
--   1. INSERT del EGRESO (sale de la cuenta origen)
--   2. INSERT del INGRESO (entra a la cuenta destino)
--   3. UPDATE para emparejar los dos lados
--
-- Si fallaba el paso 2, la compensacion (borrar el egreso) era
-- best-effort y no se verificaba: si tambien fallaba, quedaba un
-- EGRESO huerfano -> la plata salia de Bold y no entraba a ningun
-- lado. DINERO PERDIDO.
--
-- Si fallaba el paso 3, el emparejamiento quedaba en un solo
-- sentido: borrar la salida dejaba vivo el ingreso -> DINERO
-- CREADO DE LA NADA en la cuenta destino.
--
-- Ademas la validacion de saldo no contaba el GMF que el trigger
-- iba a agregar, asi que trasladar el saldo exacto dejaba la
-- cuenta en negativo.
--
-- FIX: una funcion plpgsql que hace todo en UNA transaccion.
-- O pasa completo, o no pasa nada.
-- ============================================================

create or replace function public.trasladar_entre_cuentas(
  p_cuenta_origen  uuid,
  p_cuenta_destino uuid,
  p_monto          numeric,
  p_fecha          date,
  p_concepto       text,
  p_usuario_id     uuid default null,
  p_usuario_nombre text default null
)
returns json
language plpgsql
as $$
declare
  v_saldo_origen   numeric;
  v_nombre_origen  text;
  v_nombre_destino text;
  v_id_salida      uuid;
  v_id_entrada     uuid;
begin
  if p_cuenta_origen = p_cuenta_destino then
    return json_build_object('ok', false, 'mensaje', 'La cuenta de origen y la de destino son la misma.');
  end if;

  if p_monto is null or p_monto <= 0 then
    return json_build_object('ok', false, 'mensaje', 'El monto debe ser mayor a cero.');
  end if;

  -- Bloquear las cuentas para que dos traslados simultaneos no
  -- puedan dejar el saldo en negativo
  perform 1 from public.cuentas
   where id in (p_cuenta_origen, p_cuenta_destino)
   for update;

  select sc.saldo_actual, sc.nombre
    into v_saldo_origen, v_nombre_origen
    from public.saldos_cuentas sc
   where sc.id = p_cuenta_origen;

  if v_nombre_origen is null then
    return json_build_object('ok', false, 'mensaje', 'La cuenta de origen no existe.');
  end if;

  select c.nombre into v_nombre_destino
    from public.cuentas c
   where c.id = p_cuenta_destino;

  if v_nombre_destino is null then
    return json_build_object('ok', false, 'mensaje', 'La cuenta de destino no existe.');
  end if;

  if v_saldo_origen < p_monto then
    return json_build_object(
      'ok', false,
      'mensaje', v_nombre_origen || ' solo tiene ' || to_char(v_saldo_origen, 'FM999,999,999') ||
                 ' y quieres trasladar ' || to_char(p_monto, 'FM999,999,999') || '.'
    );
  end if;

  -- Los dos lados en la misma transaccion.
  -- Nota: los traslados no generan GMF (ver generar_gmf), asi que no
  -- hay que reservar saldo extra para el 4x1000.
  insert into public.movimientos_tesoreria (
    cuenta_id, fecha, tipo, categoria, monto, concepto,
    medio_pago, creado_por_id, creado_por_nombre
  ) values (
    p_cuenta_origen, p_fecha, 'EGRESO', 'TRASLADO_SALIDA', p_monto,
    p_concepto || ' (sale de ' || v_nombre_origen || ')',
    'Transferencia', p_usuario_id, p_usuario_nombre
  ) returning id into v_id_salida;

  insert into public.movimientos_tesoreria (
    cuenta_id, fecha, tipo, categoria, monto, concepto,
    medio_pago, movimiento_relacionado_id, creado_por_id, creado_por_nombre
  ) values (
    p_cuenta_destino, p_fecha, 'INGRESO', 'TRASLADO_ENTRADA', p_monto,
    p_concepto || ' (entra a ' || v_nombre_destino || ')',
    'Transferencia', v_id_salida, p_usuario_id, p_usuario_nombre
  ) returning id into v_id_entrada;

  -- Cerrar el emparejamiento en el otro sentido
  update public.movimientos_tesoreria
     set movimiento_relacionado_id = v_id_entrada
   where id = v_id_salida;

  return json_build_object(
    'ok', true,
    'mensaje', to_char(p_monto, 'FM999,999,999') || ' trasladados de ' ||
               v_nombre_origen || ' a ' || v_nombre_destino || '.',
    'id_salida', v_id_salida,
    'id_entrada', v_id_entrada
  );
end;
$$;

comment on function public.trasladar_entre_cuentas is
  'Traslada plata entre dos cuentas en UNA sola transaccion. Bloquea las cuentas para evitar saldos negativos por concurrencia. O pasa completo, o no pasa nada.';


-- ============================================================
-- Reparar traslados que quedaron a medias (si hay alguno)
-- ============================================================

-- Traslados de SALIDA sin su contrapartida de ENTRADA: la plata
-- salio y no entro a ningun lado. Se anulan devolviendo el dinero.
do $$
declare
  huerfano record;
begin
  for huerfano in
    select mt.id, mt.cuenta_id, mt.monto, mt.concepto, mt.fecha
    from public.movimientos_tesoreria mt
    where mt.categoria = 'TRASLADO_SALIDA'
      and not exists (
        select 1 from public.movimientos_tesoreria par
        where par.categoria = 'TRASLADO_ENTRADA'
          and (par.movimiento_relacionado_id = mt.id
               or mt.movimiento_relacionado_id = par.id)
      )
  loop
    delete from public.movimientos_tesoreria where id = huerfano.id;
    raise notice 'Traslado huerfano eliminado (salida sin entrada): % por %',
      huerfano.concepto, huerfano.monto;
  end loop;
end $$;

-- Traslados de ENTRADA sin su contrapartida de SALIDA: plata que
-- aparecio de la nada. Se elimina.
do $$
declare
  huerfano record;
begin
  for huerfano in
    select mt.id, mt.monto, mt.concepto
    from public.movimientos_tesoreria mt
    where mt.categoria = 'TRASLADO_ENTRADA'
      and not exists (
        select 1 from public.movimientos_tesoreria par
        where par.categoria = 'TRASLADO_SALIDA'
          and (par.movimiento_relacionado_id = mt.id
               or mt.movimiento_relacionado_id = par.id)
      )
  loop
    delete from public.movimientos_tesoreria where id = huerfano.id;
    raise notice 'Traslado huerfano eliminado (entrada sin salida): % por %',
      huerfano.concepto, huerfano.monto;
  end loop;
end $$;
