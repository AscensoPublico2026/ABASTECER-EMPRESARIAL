-- ============================================================
--   ABASTECER EMPRESARIAL SAS
--   BUSCAR UN PAGO QUE NO APARECE  (caso COT-2026-012)
-- ============================================================
--
-- CAUSA CONOCIDA
-- El registro del pago hacia el insert en tesoreria dentro de un
-- `if (cuenta_id)`, y el selector "A que cuenta entro" tenia una opcion
-- llamada "No registrar en caja". Si se elegia esa opcion (o si no habia
-- ninguna cuenta activa cuando se cargo la pantalla), pasaba esto:
--
--   * cotizaciones.monto_recibido  -> SI se guardaba
--   * cotizaciones.fecha_pago      -> SI se guardaba
--   * cotizaciones.estado          -> SI cambiaba
--   * movimientos_tesoreria        -> NO se insertaba NADA
--
-- Y la accion devolvia un mensaje VERDE de exito. Resultado: la venta
-- dice que te pagaron, pero la plata no existe en ninguna cuenta, no
-- suma al saldo, no sale en el Libro de Tesoreria y no aparece en la
-- trazabilidad de la venta.
--
-- El codigo ya quedo corregido (la cuenta es obligatoria y si el insert
-- falla se revierte todo). Este script encuentra y repara los pagos que
-- ya se registraron mal.
--
-- COMO USARLO: corre las PARTES 1 y 2 (solo consultan). Segun lo que
-- salga, corre el bloque de la PARTE 3 que corresponda.
-- ============================================================


-- ############################################################
-- ##  PARTE 1  --  RADIOGRAFIA DE LA COT-2026-012
-- ############################################################

-- 1.a  Que dice la cotizacion
select
  c.numero,
  c.estado,
  cl.razon_social            as cliente,
  c.fecha,
  c.total,
  c.forma_pago,
  c.dias_credito,
  c.fecha_pago,
  c.monto_recibido,
  c.retencion_total,
  c.soporte_pago_url is not null as tiene_soporte,
  c.id                       as cotizacion_id
from public.cotizaciones c
left join public.clientes cl on cl.id = c.cliente_id
where c.numero = 'COT-2026-012';


-- 1.b  Hay movimiento de banco de esta venta?
--      Si esto sale VACIO, el pago nunca entro a ninguna cuenta.
select
  mt.fecha,
  cu.nombre        as cuenta,
  mt.tipo,
  mt.categoria,
  mt.monto,
  mt.concepto,
  mt.creado_por_nombre
from public.movimientos_tesoreria mt
join public.cuentas cu on cu.id = mt.cuenta_id
join public.cotizaciones c on c.id = mt.cotizacion_id
where c.numero = 'COT-2026-012'
order by mt.fecha;


-- 1.c  Hay factura de venta? (flujo a credito)
select
  fv.numero_factura_dian,
  fv.estado,
  fv.fecha,
  fv.total,
  fv.retencion_total,
  fv.id as factura_venta_id
from public.facturas_venta fv
join public.cotizaciones c on c.id = fv.cotizacion_id
where c.numero = 'COT-2026-012';


-- 1.d  Hay registro en la tabla pagos?
select p.fecha, p.tipo, p.monto, p.medio_pago, p.notas
from public.pagos p
left join public.facturas_venta fv on fv.id = p.factura_venta_id
left join public.cotizaciones c on c.id = fv.cotizacion_id
where c.numero = 'COT-2026-012';


-- 1.e  EL DIAGNOSTICO EN UNA FILA
select
  c.numero,
  c.estado,
  c.monto_recibido,
  c.fecha_pago,
  (select count(*) from public.movimientos_tesoreria mt
     where mt.cotizacion_id = c.id and mt.tipo = 'INGRESO')      as ingresos_en_banco,
  case
    when c.fecha_pago is null and c.monto_recibido = 0
      then 'El pago NUNCA se registro en el sistema. Registralo desde la venta.'
    when c.fecha_pago is not null and not exists (
      select 1 from public.movimientos_tesoreria mt
      where mt.cotizacion_id = c.id and mt.tipo = 'INGRESO')
      then 'PAGO HUERFANO: la venta dice que te pagaron pero la plata no entro a ninguna cuenta. Corre el bloque 3.A.'
    when c.fecha_pago is null and exists (
      select 1 from public.movimientos_tesoreria mt
      where mt.cotizacion_id = c.id and mt.tipo = 'INGRESO')
      then 'Al contrario: la plata SI esta en el banco pero la venta no quedo marcada como pagada. Corre el bloque 3.B.'
    else 'Todo cuadra. El pago esta en la venta Y en el banco. Si no lo ves, es un filtro de pantalla (mira la PARTE 4).'
  end as diagnostico
from public.cotizaciones c
where c.numero = 'COT-2026-012';



-- ############################################################
-- ##  PARTE 2  --  TODOS LOS PAGOS HUERFANOS DEL SISTEMA
-- ############################################################
-- No solo la 012. Si el problema paso una vez, pudo pasar mas.

-- 2.a  Ventas que dicen estar pagadas pero sin plata en el banco
select
  c.numero,
  cl.razon_social        as cliente,
  c.estado,
  c.fecha_pago,
  c.monto_recibido       as dice_que_recibio,
  0                      as hay_en_banco,
  c.monto_recibido       as plata_que_falta,
  c.id                   as cotizacion_id
from public.cotizaciones c
left join public.clientes cl on cl.id = c.cliente_id
where c.fecha_pago is not null
  and coalesce(c.monto_recibido, 0) > 0
  and not exists (
    select 1 from public.movimientos_tesoreria mt
    where mt.cotizacion_id = c.id and mt.tipo = 'INGRESO'
  )
order by c.fecha_pago;


-- 2.b  Al contrario: plata en el banco de una venta que no figura pagada
select
  c.numero,
  cl.razon_social     as cliente,
  c.estado,
  c.monto_recibido    as dice_la_venta,
  sum(mt.monto)       as hay_en_banco,
  c.id                as cotizacion_id
from public.movimientos_tesoreria mt
join public.cotizaciones c on c.id = mt.cotizacion_id
left join public.clientes cl on cl.id = c.cliente_id
where mt.tipo = 'INGRESO'
group by c.id, c.numero, cl.razon_social, c.estado, c.monto_recibido
having coalesce(c.monto_recibido, 0) = 0
    or abs(coalesce(c.monto_recibido, 0) - sum(mt.monto)) > 2
order by c.numero;


-- 2.c  Facturas marcadas COBRADA sin plata en el banco
select
  fv.numero_factura_dian,
  cl.razon_social      as cliente,
  fv.total,
  fv.retencion_total,
  fv.total - coalesce(fv.retencion_total, 0) as deberia_haber_entrado,
  fv.id                as factura_venta_id
from public.facturas_venta fv
left join public.clientes cl on cl.id = fv.cliente_id
where fv.estado = 'COBRADA'
  and not exists (
    select 1 from public.movimientos_tesoreria mt
    where mt.factura_venta_id = fv.id and mt.tipo = 'INGRESO'
  );



-- ############################################################
-- ##  PARTE 3  --  REPARACION
-- ############################################################
-- Corre SOLO el bloque que te indico el diagnostico de la 1.e.


-- ------------------------------------------------------------
-- 3.A  PAGO HUERFANO: meter la plata al banco
-- ------------------------------------------------------------
-- La venta dice que te pagaron y es verdad (la plata llego a tu cuenta
-- real), lo que falta es el registro en el ERP.
--
-- ANTES DE CORRERLO: mira el resultado de esta consulta y confirma que
-- la cuenta y el monto son los correctos.

select
  cu.id      as cuenta_id,
  cu.nombre  as cuenta,
  sc.saldo_actual
from public.cuentas cu
join public.saldos_cuentas sc on sc.id = cu.id
where cu.activa and not cu.es_reserva
order by cu.orden;

-- Ahora si, la reparacion. Crea el INGRESO que falto, en la cuenta
-- operativa principal (la de menor "orden"), con la fecha y el monto que
-- ya estaban guardados en la venta.
--
-- OJO: los INGRESOS no generan 4x1000 (el trigger solo aplica a
-- egresos), asi que esto no inventa ningun cobro bancario.

insert into public.movimientos_tesoreria (
  cuenta_id, fecha, tipo, categoria, monto, concepto,
  cotizacion_id, medio_pago, soporte_url, notas, creado_por_nombre
)
select
  (select id from public.cuentas
    where activa and not es_reserva order by orden, id limit 1),
  c.fecha_pago,
  'INGRESO',
  'COBRO_CLIENTE',
  c.monto_recibido,
  'Pago de cliente ' || c.numero,
  c.id,
  'Transferencia',
  c.soporte_pago_url,
  'Recuperado por auditoria: el pago se habia guardado en la venta pero nunca entro a una cuenta.',
  'SISTEMA (recuperacion)'
from public.cotizaciones c
where c.numero = 'COT-2026-012'          -- <-- cambia o quita esta linea
  and c.fecha_pago is not null
  and coalesce(c.monto_recibido, 0) > 0
  and not exists (
    select 1 from public.movimientos_tesoreria mt
    where mt.cotizacion_id = c.id and mt.tipo = 'INGRESO'
  );

-- Para reparar TODAS las ventas huerfanas de una vez, corre lo mismo
-- pero borrando la linea del numero de cotizacion. Revisa primero la
-- lista de la 2.a para estar seguro de que todas esas plata SI llego.


-- ------------------------------------------------------------
-- 3.B  AL CONTRARIO: la plata esta pero la venta no figura pagada
-- ------------------------------------------------------------
-- Pasa si se uso "Deshacer el ultimo paso": limpia fecha_pago y
-- monto_recibido de la cotizacion pero NO borra el movimiento de
-- tesoreria. Esto vuelve a marcar la venta con lo que hay en el banco.

update public.cotizaciones c
set fecha_pago = sub.fecha,
    monto_recibido = sub.total
from (
  select mt.cotizacion_id, min(mt.fecha) as fecha, sum(mt.monto) as total
  from public.movimientos_tesoreria mt
  where mt.tipo = 'INGRESO' and mt.categoria = 'COBRO_CLIENTE'
  group by mt.cotizacion_id
) sub
where c.id = sub.cotizacion_id
  and c.numero = 'COT-2026-012'          -- <-- cambia o quita esta linea
  and c.fecha_pago is null;



-- ############################################################
-- ##  PARTE 4  --  SI TODO CUADRA Y AUN NO LO VES
-- ############################################################
-- Entonces no es un dato perdido, es un filtro de pantalla. Estos son
-- los filtros reales del ERP, para que sepas donde mirar:
--
-- * /ventas  solo muestra estos estados:
--     Bloque "Cotizaciones" .. PENDIENTE, APROBADA
--     Bloque "En proceso" .... PAGADA, EN_ALISTAMIENTO, DESPACHADA
--   Si la venta quedo en FACTURADA o COBRADA, DESAPARECE de /ventas.
--
-- * /financiero y los indicadores de posicion financiera solo cuentan:
--     FACTURADA, DESPACHADA, ENTREGADO, POR_COBRAR, COBRADA,
--     ENTREGA_PARCIAL, EN_ALISTAMIENTO, PAGADA
--
-- * El Libro de Tesoreria NO tiene filtro de fecha ni de tipo, pero
--   solo trae los 500 movimientos mas recientes.
--
-- * Las tarjetas de saldo solo muestran cuentas con activa = true.
--   Si la cuenta esta inactiva, el saldo no se ve (los movimientos si).

-- 4.a  Esta la plata en el Libro de Tesoreria? (busca por el numero)
select fecha, cuenta_nombre, tipo, categoria, monto, concepto, origen
from public.libro_tesoreria
where concepto ilike '%COT-2026-012%'
   or origen   ilike '%COT-2026-012%'
order by fecha desc;

-- 4.b  Hay alguna cuenta inactiva escondiendo saldo?
select nombre, activa, es_reserva, saldo_actual, num_movimientos
from public.saldos_cuentas
order by activa desc, orden;

-- 4.c  Como quedo la venta despues de reparar
select
  c.numero, c.estado, c.fecha_pago, c.monto_recibido,
  (select coalesce(sum(mt.monto),0) from public.movimientos_tesoreria mt
    where mt.cotizacion_id = c.id and mt.tipo = 'INGRESO') as en_banco
from public.cotizaciones c
where c.numero = 'COT-2026-012';
