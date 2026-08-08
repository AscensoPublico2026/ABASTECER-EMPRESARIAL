-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Repartir un gasto entre varias ventas
-- Migracion 035
-- ============================================================
-- EL CASO REAL DEL DUENO
-- Tres pedidos de un mismo cliente se entregan en UN SOLO flete. El
-- transportador es persona natural no obligada a facturar y cobra 45.000.
-- Ese costo hay que meterlo en las TRES ventas, no en una.
--
-- POR QUE NO SE PODIA
-- gastos.cotizacion_id es UNA sola cotizacion. Un gasto solo podia
-- pertenecer a una venta. Para repartirlo tocaba crear tres gastos de
-- 15.000, o sea inventar tres documentos donde hubo uno: el documento
-- soporte se duplicaba y la trazabilidad quedaba mintiendo.
--
-- Y asignacion_costos no servia: exige factura_compra_item_id NOT NULL,
-- porque esta hecha para repartir lineas de una factura de compra.
--
-- LA SOLUCION
-- Tabla gasto_reparto: un gasto puede ir a N ventas con un monto en cada
-- una. El documento soporte se sigue emitiendo UNA sola vez, por los
-- 45.000 completos, que es lo correcto ante la DIAN.
--
-- Sirve igual para el flete CON factura electronica: se registra como
-- gasto con su soporte y se reparte del mismo modo.
--
-- Cierra la pestana del ERP antes de correrla.
-- ============================================================


-- ------------------------------------------------------------
-- PASO 1: la tabla de reparto
-- ------------------------------------------------------------
create table if not exists public.gasto_reparto (
  id            uuid primary key default gen_random_uuid(),
  gasto_id      uuid not null references public.gastos(id) on delete cascade,
  cotizacion_id uuid not null references public.cotizaciones(id) on delete cascade,
  monto         numeric(15,2) not null check (monto > 0),
  notas         text,
  created_at    timestamptz not null default now(),
  unique (gasto_id, cotizacion_id)
);

comment on table public.gasto_reparto is
  'Reparte UN gasto entre varias ventas. Ej: un flete de 45.000 que entrego 3 pedidos se divide en 3 filas de 15.000. El documento soporte se emite una sola vez por el total.';
comment on column public.gasto_reparto.monto is
  'Parte del gasto que le corresponde a esta venta. La suma de todas las filas no deberia pasar del monto del gasto.';

create index if not exists idx_gr_gasto on public.gasto_reparto(gasto_id);
create index if not exists idx_gr_cotizacion on public.gasto_reparto(cotizacion_id);

alter table public.gasto_reparto enable row level security;
drop policy if exists "gr_auth_all" on public.gasto_reparto;
create policy "gr_auth_all" on public.gasto_reparto
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- ------------------------------------------------------------
-- PASO 2: pasar los gastos que ya estaban vinculados a una venta
-- ------------------------------------------------------------
-- Cada gasto que hoy apunta a una cotizacion se convierte en una fila de
-- reparto por el 100% del monto. Asi nada cambia de valor y de ahora en
-- adelante todo pasa por la misma tabla.
insert into public.gasto_reparto (gasto_id, cotizacion_id, monto, notas)
select g.id, g.cotizacion_id, g.monto,
       'Migrado automaticamente: el gasto estaba vinculado a una sola venta'
from public.gastos g
where g.cotizacion_id is not null
  and g.es_costo_venta = true
  and g.monto > 0
  and not exists (
    select 1 from public.gasto_reparto gr where gr.gasto_id = g.id
  );


-- ------------------------------------------------------------
-- PASO 3: datos del tercero para no volver a digitarlos
-- ------------------------------------------------------------
-- El documento soporte pide nombre, tipo y numero de documento del
-- tercero. Si ese tercero ya existe como proveedor, esos datos ya estan
-- guardados: hay que poder traerlos en vez de escribirlos otra vez.
alter table public.proveedores
  add column if not exists tipo_documento text default 'NIT'
    check (tipo_documento in ('CC','CE','NIT','PASAPORTE','PEP'));

comment on column public.proveedores.tipo_documento is
  'Tipo de documento del tercero. Las personas naturales no obligadas a facturar normalmente son CC; las empresas, NIT. Se usa para llenar el documento soporte automaticamente.';

alter table public.gastos
  add column if not exists proveedor_id uuid references public.proveedores(id) on delete set null;

comment on column public.gastos.proveedor_id is
  'A quien se le pago. Si esta, los datos del tercero del documento soporte se llenan solos.';

create index if not exists idx_gastos_proveedor on public.gastos(proveedor_id);

alter table public.documentos_soporte
  add column if not exists proveedor_id uuid references public.proveedores(id) on delete set null;

create index if not exists idx_ds_proveedor on public.documentos_soporte(proveedor_id);


-- ------------------------------------------------------------
-- PASO 4: vista de control del reparto
-- ------------------------------------------------------------
create or replace view public.gastos_reparto_detalle as
select
  g.id                          as gasto_id,
  g.fecha,
  g.concepto,
  g.categoria,
  g.monto                       as monto_total,
  g.iva_incluido,
  g.es_costo_venta,
  g.tiene_soporte,
  g.deducible,
  g.tercero_nombre,
  pr.razon_social               as proveedor,
  ds.numero                     as documento_soporte,
  ds.id                         as documento_soporte_id,
  coalesce(sum(gr.monto), 0)    as monto_repartido,
  g.monto - coalesce(sum(gr.monto), 0) as sin_repartir,
  count(gr.id)                  as num_ventas,
  string_agg(c.numero, ', ' order by c.numero) as ventas
from public.gastos g
left join public.gasto_reparto gr on gr.gasto_id = g.id
left join public.cotizaciones c on c.id = gr.cotizacion_id
left join public.proveedores pr on pr.id = g.proveedor_id
left join public.documentos_soporte ds on ds.gasto_id = g.id
group by g.id, g.fecha, g.concepto, g.categoria, g.monto, g.iva_incluido,
         g.es_costo_venta, g.tiene_soporte, g.deducible, g.tercero_nombre,
         pr.razon_social, ds.numero, ds.id;

comment on view public.gastos_reparto_detalle is
  'Cada gasto con cuanto se repartio entre ventas y cuanto quedo sin repartir. sin_repartir > 0 en un costo de venta significa que hay costo que no esta entrando a ninguna venta.';


-- ------------------------------------------------------------
-- PASO 5: analisis_venta ahora lee el reparto de gastos
-- ------------------------------------------------------------
-- Se recrean las 4 vistas porque dependen en cadena de analisis_venta.
-- El unico cambio real esta en el CTE costos_gasto; el resto es identico
-- a la migracion 031 (y 032 para obligaciones_por_periodo).
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
  -- AHORA LEE DE gasto_reparto, no de gastos.cotizacion_id.
  --
  -- Un gasto puede estar repartido entre varias ventas (ej: un flete de
  -- 45.000 que entrego 3 pedidos). Antes solo podia pertenecer a UNA, y
  -- para repartirlo tocaba crear tres gastos, o sea inventar tres
  -- documentos donde hubo uno.
  --
  -- EL IVA SE PRORRATEA: si el gasto de 45.000 traia 7.185 de IVA y a esta
  -- venta le toca 15.000 (un tercio), le corresponde un tercio del IVA.
  -- Sin prorratear, cada venta se descontaria el IVA completo y se
  -- descontaria tres veces el mismo IVA.
  select
    gr.cotizacion_id,
    sum(gr.monto - (coalesce(g.iva_incluido, 0) * gr.monto / nullif(g.monto, 0)))
                                                as costo_gastos,
    sum(coalesce(g.iva_incluido, 0) * gr.monto / nullif(g.monto, 0))
                                                as iva_gastos,
    sum(case when g.deducible then 0 else gr.monto end) as costo_no_deducible,
    count(distinct g.id)                        as num_gastos,
    count(distinct g.id) filter (where not g.tiene_soporte) as num_gastos_sin_soporte
  from public.gasto_reparto gr
  join public.gastos g on g.id = gr.gasto_id
  where g.es_costo_venta = true
  group by gr.cotizacion_id
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

  -- ---------- BOLSILLO IVA ----------
  sum(av.iva_cobrado)                                      as iva_cobrado,
  sum(av.iva_pagado)                                       as iva_descontable,
  -- La reteIVA es anticipo del IVA. Se expone aparte para que la resta
  -- de la pantalla cuadre: iva_cobrado - iva_descontable - reteiva
  sum(av.retencion_reteiva)                                as reteiva,
  sum(av.iva_neto_dian)                                    as iva_a_pagar,
  sum(av.iva_saldo_favor)                                  as iva_saldo_favor,

  -- ---------- BOLSILLO SIMPLE ----------
  sum(av.impuesto_simple)                                  as simple_causado,
  -- Solo retefuente y reteICA son anticipo del Simple
  sum(av.retencion_retefuente)                             as retefuente,
  sum(av.retencion_reteica)                                as reteica,
  sum(av.retencion_retefuente + av.retencion_reteica)      as retenciones_del_simple,
  sum(av.impuesto_simple_pendiente)                        as simple_a_pagar,
  sum(av.simple_saldo_favor)                               as simple_saldo_favor,

  -- Total de las tres, se mantiene por compatibilidad con lo que ya
  -- existia. OJO: no usar este campo para restarlo de un solo impuesto.
  sum(av.retenciones)                                      as retenciones_a_favor,

  -- ---------- RESULTADO ----------
  sum(av.utilidad_bruta)                                   as utilidad_bruta,
  sum(av.utilidad_neta)                                    as utilidad_neta
from public.analisis_venta av
where av.estado in ('FACTURADA','DESPACHADA','ENTREGADO','POR_COBRAR','COBRADA','ENTREGA_PARCIAL','EN_ALISTAMIENTO','PAGADA')
group by 1, 2, 3
order by 1 desc, 3 desc;

comment on view public.obligaciones_por_periodo is
  'IVA y Simple por mes/bimestre, con las retenciones separadas por el bolsillo que descuentan. La reteIVA baja el IVA; la retefuente y la reteICA bajan el Simple. retenciones_a_favor suma las tres y solo sirve como total informativo: restarlo de un solo impuesto seria contarlo dos veces.';



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
-- COMPROBACION
-- ============================================================
-- 1. Los gastos migrados deben sumar igual que antes.
--    Si esto devuelve filas, algun gasto quedo mal repartido.
select g.concepto, g.monto as monto_gasto,
       coalesce(sum(gr.monto), 0) as repartido,
       g.monto - coalesce(sum(gr.monto), 0) as diferencia
from public.gastos g
left join public.gasto_reparto gr on gr.gasto_id = g.id
where g.es_costo_venta = true
group by g.id, g.concepto, g.monto
having abs(g.monto - coalesce(sum(gr.monto), 0)) > 1;

-- 2. Costo de gastos por venta, para comparar contra lo que veias antes
select numero, cliente_nombre, costo_gastos, iva_gastos, num_gastos
from public.analisis_venta
where costo_gastos > 0
order by numero;

-- 3. Gastos de venta con parte sin repartir: ese costo no entra a ninguna
--    venta y te esta inflando la utilidad
select concepto, monto_total, monto_repartido, sin_repartir, num_ventas, ventas
from public.gastos_reparto_detalle
where es_costo_venta and sin_repartir > 1
order by sin_repartir desc;
