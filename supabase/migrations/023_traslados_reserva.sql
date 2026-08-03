-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Traslados entre cuentas y reserva
-- Migracion 023
-- ============================================================
-- Cierra el circuito del dinero:
--   1. Empareja los dos lados de un traslado entre cuentas
--   2. Vista que dice cuanta plata deberia estar en la reserva
--      de impuestos y cuanta falta trasladar
-- ============================================================

-- ------------------------------------------------------------
-- Emparejar los dos lados de un traslado
-- Un traslado genera 2 movimientos: EGRESO de una cuenta e
-- INGRESO en otra. Se vinculan entre si para poder anularlos juntos.
-- ------------------------------------------------------------
alter table public.movimientos_tesoreria
  add column if not exists movimiento_relacionado_id uuid
    references public.movimientos_tesoreria(id) on delete set null;

comment on column public.movimientos_tesoreria.movimiento_relacionado_id is
  'En un traslado entre cuentas, apunta al movimiento del otro lado (el EGRESO apunta al INGRESO y viceversa).';

create index if not exists idx_mt_relacionado
  on public.movimientos_tesoreria(movimiento_relacionado_id);


-- ------------------------------------------------------------
-- Vista: estado de la reserva de impuestos
-- Responde: cuanto debo tener apartado y cuanto me falta
-- ------------------------------------------------------------
create or replace view public.estado_reserva_impuestos as
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
  -- Se puede trasladar lo que falta sin quedar en negativo?
  (op.saldo_operativo >= greatest(o.iva_por_pagar + o.simple_por_pagar - r.saldo_reserva, 0)) as alcanza_para_trasladar,
  r.cuenta_reserva_id
from obligaciones o
cross join reserva r
cross join operativa op;

comment on view public.estado_reserva_impuestos is
  'Cuanto deberia estar apartado para impuestos, cuanto hay y cuanto falta trasladar.';


-- ------------------------------------------------------------
-- Vista: libro de movimientos con su origen legible
-- ------------------------------------------------------------
create or replace view public.libro_tesoreria as
select
  mt.id,
  mt.fecha,
  mt.tipo,
  mt.categoria,
  mt.monto,
  mt.concepto,
  mt.medio_pago,
  mt.referencia,
  mt.soporte_url,
  mt.notas,
  mt.creado_por_nombre,
  mt.created_at,
  mt.movimiento_relacionado_id,
  c.id            as cuenta_id,
  c.nombre        as cuenta_nombre,
  c.es_reserva    as cuenta_es_reserva,
  mt.cotizacion_id,
  cot.numero      as cotizacion_numero,
  mt.factura_venta_id,
  fv.numero_factura_dian,
  mt.factura_compra_id,
  fc.numero_factura,
  mt.gasto_id,
  g.concepto      as gasto_concepto,
  mt.movimiento_socio_id,
  s.nombre        as socio_nombre,
  -- Origen legible para mostrar en la interfaz
  case
    when mt.movimiento_socio_id is not null then 'Socio: ' || coalesce(s.nombre, '')
    when mt.factura_venta_id    is not null then 'Factura venta ' || coalesce(fv.numero_factura_dian, '')
    when mt.factura_compra_id   is not null then 'Factura compra ' || coalesce(fc.numero_factura, '')
    when mt.gasto_id            is not null then 'Gasto: ' || coalesce(g.concepto, '')
    when mt.cotizacion_id       is not null then 'Venta ' || coalesce(cot.numero, '')
    when mt.categoria in ('TRASLADO_ENTRADA','TRASLADO_SALIDA') then 'Traslado entre cuentas'
    else 'Manual'
  end as origen
from public.movimientos_tesoreria mt
join public.cuentas c on c.id = mt.cuenta_id
left join public.cotizaciones   cot on cot.id = mt.cotizacion_id
left join public.facturas_venta  fv on fv.id  = mt.factura_venta_id
left join public.facturas_compra fc on fc.id  = mt.factura_compra_id
left join public.gastos           g on g.id   = mt.gasto_id
left join public.movimientos_socio ms on ms.id = mt.movimiento_socio_id
left join public.socios            s on s.id  = ms.socio_id;

comment on view public.libro_tesoreria is
  'Libro de caja con el origen de cada movimiento resuelto para mostrar en la interfaz.';
