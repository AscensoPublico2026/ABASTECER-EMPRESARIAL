-- ============================================================
--   ABASTECER EMPRESARIAL SAS
--   SACAR DEL BANCO LOS COBROS DE VENTAS QUE SE DESHICIERON
-- ============================================================
--
-- QUE PASO
-- El boton "Deshacer el ultimo paso" de una venta cambiaba el estado y
-- limpiaba los datos de pago de la cotizacion, pero NUNCA borraba el
-- ingreso de tesoreria.
--
-- Entonces al devolver las cotizaciones a PENDIENTE quedo esto:
--   cotizaciones.estado          -> PENDIENTE
--   cotizaciones.monto_recibido  -> 0
--   cotizaciones.fecha_pago      -> null
--   movimientos_tesoreria        -> EL INGRESO SIGUE AHI
--
-- Por eso en Tesoreria sigue apareciendo "Pago de cliente COT-2026-012"
-- por $1.486.720 e infla el saldo de Bold, aunque la venta ya no exista
-- como cobrada.
--
-- Y no se puede borrar desde la pantalla, porque el ERP bloquea a
-- proposito el borrado manual de movimientos que vienen de una venta
-- (para que nadie descuadre la plata por accidente).
--
-- El codigo ya quedo corregido: de ahora en adelante deshacer una venta
-- saca la plata del banco, devuelve el stock y borra el soporte. Este
-- script limpia lo que quedo colgado de antes.
--
-- COMO USARLO: corre la PARTE 1, revisa la lista, y si estas de acuerdo
-- corre la PARTE 2.
-- ============================================================


-- ############################################################
-- ##  PARTE 1  --  QUE PLATA ESTA COLGADA
-- ############################################################

-- 1.a  Ingresos en el banco de ventas que NO figuran cobradas
--      ESTA ES LA LISTA DE LO QUE SE VA A SACAR.
select
  mt.fecha,
  cu.nombre           as cuenta,
  mt.monto,
  mt.concepto,
  c.numero            as venta,
  c.estado            as estado_de_la_venta,
  c.monto_recibido    as la_venta_dice_que_recibio,
  cl.razon_social     as cliente,
  mt.id               as movimiento_id
from public.movimientos_tesoreria mt
join public.cuentas cu       on cu.id = mt.cuenta_id
join public.cotizaciones c   on c.id = mt.cotizacion_id
left join public.clientes cl on cl.id = c.cliente_id
where mt.tipo = 'INGRESO'
  and (
    -- la venta ya no esta en un estado de cobrada
    c.estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA')
    -- o la venta dice que no recibio nada
    or coalesce(c.monto_recibido, 0) = 0
    or c.fecha_pago is null
  )
order by mt.fecha, mt.monto desc;


-- 1.b  Cuanto suma en total y como quedaria cada cuenta
select
  cu.nombre                                   as cuenta,
  sc.saldo_actual                             as saldo_hoy,
  coalesce(sum(mt.monto), 0)                  as plata_colgada,
  sc.saldo_actual - coalesce(sum(mt.monto), 0) as saldo_despues_de_limpiar
from public.cuentas cu
join public.saldos_cuentas sc on sc.id = cu.id
left join public.movimientos_tesoreria mt
  on mt.cuenta_id = cu.id
 and mt.tipo = 'INGRESO'
 and mt.cotizacion_id is not null
 and exists (
   select 1 from public.cotizaciones c
   where c.id = mt.cotizacion_id
     and (c.estado in ('PENDIENTE','APROBADA','RECHAZADA','VENCIDA')
          or coalesce(c.monto_recibido, 0) = 0
          or c.fecha_pago is null)
 )
group by cu.nombre, sc.saldo_actual, cu.orden
order by cu.orden;


-- 1.c  Facturas de venta que quedaron vivas de esas mismas ventas
--      (si la venta volvio a PENDIENTE, su factura no deberia seguir
--      activa, y su stock deberia estar devuelto)
select
  fv.numero_factura_dian,
  fv.estado           as estado_factura,
  fv.total,
  c.numero            as venta,
  c.estado            as estado_venta,
  fv.id               as factura_venta_id
from public.facturas_venta fv
join public.cotizaciones c on c.id = fv.cotizacion_id
where fv.estado <> 'ANULADA'
  and c.estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA')
order by fv.numero_factura_dian;


-- 1.d  Solicitudes de compra colgadas de ventas que volvieron atras
select c.numero as venta, c.estado, count(*) as solicitudes
from public.solicitudes_compra sc
join public.cotizaciones c on c.id = sc.cotizacion_id
where c.estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA')
  and sc.estado in ('PENDIENTE', 'EN_COTIZACION')
group by c.numero, c.estado;



-- ############################################################
-- ##  PARTE 2  --  LA LIMPIEZA
-- ############################################################
-- Todo en una transaccion: o queda completo, o no cambia nada.

begin;


-- ------------------------------------------------------------
-- 2.1  Devolver el stock de las facturas que se van a anular
--      ANTES de anularlas (si no, se pierde la referencia)
-- ------------------------------------------------------------
-- El trigger de stock solo RESTA al insertar los items. No existe
-- ninguno que sume al anular, asi que hay que devolverlo a mano.
update public.productos p
set stock_actual = p.stock_actual + dev.unidades
from (
  select fvi.producto_id, sum(fvi.cantidad) as unidades
  from public.factura_venta_items fvi
  join public.facturas_venta fv on fv.id = fvi.factura_venta_id
  join public.cotizaciones c    on c.id = fv.cotizacion_id
  where fv.estado <> 'ANULADA'
    and c.estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA')
    and fvi.producto_id is not null
  group by fvi.producto_id
) dev
where p.id = dev.producto_id;


-- ------------------------------------------------------------
-- 2.2  Anular las facturas de venta de ventas que volvieron atras
-- ------------------------------------------------------------
-- Se ANULAN, no se borran: una factura es un documento fiscal y hay que
-- poder rastrearla. Al quedar ANULADA sale de todos los calculos.
update public.facturas_venta fv
set estado = 'ANULADA',
    notas = coalesce(fv.notas || ' | ', '') ||
            'ANULADA automaticamente: la venta se devolvio a un estado anterior.'
from public.cotizaciones c
where c.id = fv.cotizacion_id
  and fv.estado <> 'ANULADA'
  and c.estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA');


-- ------------------------------------------------------------
-- 2.3  Borrar los registros de pago de esas facturas
-- ------------------------------------------------------------
delete from public.pagos p
where p.factura_venta_id in (
  select fv.id
  from public.facturas_venta fv
  join public.cotizaciones c on c.id = fv.cotizacion_id
  where c.estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA')
);


-- ------------------------------------------------------------
-- 2.4  SACAR LA PLATA DEL BANCO  (el arreglo principal)
-- ------------------------------------------------------------
-- Los ingresos por cobro de ventas que ya no figuran cobradas.
-- Los INGRESOS no generan 4x1000, asi que no hay ningun GMF hijo que
-- limpiar por este lado.
delete from public.movimientos_tesoreria mt
where mt.tipo = 'INGRESO'
  and mt.cotizacion_id is not null
  and exists (
    select 1 from public.cotizaciones c
    where c.id = mt.cotizacion_id
      and (c.estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA')
           or coalesce(c.monto_recibido, 0) = 0
           or c.fecha_pago is null)
  );


-- ------------------------------------------------------------
-- 2.5  Borrar los soportes de pago colgados
-- ------------------------------------------------------------
delete from public.documentos d
where d.entidad_tipo = 'COTIZACION'
  and d.tipo_documento in ('SOPORTE_PAGO', 'FACTURA')
  and exists (
    select 1 from public.cotizaciones c
    where c.id = d.entidad_id
      and c.estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA')
  );


-- ------------------------------------------------------------
-- 2.6  Borrar remisiones de ventas que volvieron atras
-- ------------------------------------------------------------
delete from public.remisiones r
where exists (
  select 1 from public.cotizaciones c
  where c.id = r.cotizacion_id
    and c.estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA')
);

-- Y limpiar los campos de remision que quedaron en la cotizacion
update public.cotizaciones
set remision_numero = null,
    remision_fecha = null,
    remision_observaciones = null
where estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA')
  and remision_numero is not null;


-- ------------------------------------------------------------
-- 2.7  Borrar solicitudes de compra de ventas que volvieron atras
-- ------------------------------------------------------------
delete from public.solicitudes_compra sc
where exists (
  select 1 from public.cotizaciones c
  where c.id = sc.cotizacion_id
    and c.estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA')
);


-- ------------------------------------------------------------
-- 2.8  Dejar en cero las provisiones y los datos de pago
-- ------------------------------------------------------------
update public.cotizaciones
set fecha_pago = null,
    monto_recibido = 0,
    retencion_retefuente = 0,
    retencion_reteiva = 0,
    retencion_reteica = 0,
    retencion_total = 0,
    soporte_pago_url = null,
    provision_iva = 0,
    provision_simple = 0
where estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA')
  and (fecha_pago is not null
       or coalesce(monto_recibido, 0) <> 0
       or coalesce(retencion_total, 0) <> 0);


commit;



-- ############################################################
-- ##  PARTE 3  --  COMPROBACION
-- ############################################################

-- 3.a  Ya no debe quedar plata colgada. Debe salir 0.
select count(*) as ingresos_colgados_deben_ser_0
from public.movimientos_tesoreria mt
join public.cotizaciones c on c.id = mt.cotizacion_id
where mt.tipo = 'INGRESO'
  and (c.estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA')
       or coalesce(c.monto_recibido, 0) = 0
       or c.fecha_pago is null);


-- 3.b  Como quedaron tus cuentas
select nombre, es_reserva, saldo_inicial, total_ingresos, total_egresos, saldo_actual, num_movimientos
from public.saldos_cuentas
order by orden, nombre;


-- 3.c  Que quedo en el libro de movimientos
select fecha, cuenta_nombre, tipo, categoria, monto, concepto, origen
from public.libro_tesoreria
order by fecha desc, created_at desc
limit 50;


-- 3.d  Stock: debe cuadrar con el historico (compras - ventas vivas)
select
  p.nombre,
  p.stock_actual                                        as dice_el_sistema,
  coalesce(ent.entradas, 0) - coalesce(sal.salidas, 0)  as deberia_ser,
  p.stock_actual - (coalesce(ent.entradas, 0) - coalesce(sal.salidas, 0)) as diferencia
from public.productos p
left join (
  select fci.producto_id, sum(fci.cantidad) as entradas
  from public.factura_compra_items fci
  join public.facturas_compra fc on fc.id = fci.factura_compra_id
  where fc.estado <> 'ANULADA' and fci.producto_id is not null
  group by fci.producto_id
) ent on ent.producto_id = p.id
left join (
  select fvi.producto_id, sum(fvi.cantidad) as salidas
  from public.factura_venta_items fvi
  join public.facturas_venta fv on fv.id = fvi.factura_venta_id
  where fv.estado <> 'ANULADA' and fvi.producto_id is not null
  group by fvi.producto_id
) sal on sal.producto_id = p.id
where abs(p.stock_actual - (coalesce(ent.entradas, 0) - coalesce(sal.salidas, 0))) > 0.01
order by p.nombre;
-- Si esto sale VACIO, el inventario cuadra perfecto.
