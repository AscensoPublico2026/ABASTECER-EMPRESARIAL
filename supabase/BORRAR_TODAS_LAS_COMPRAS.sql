-- ============================================================
--   ABASTECER EMPRESARIAL SAS
--   BORRAR TODAS LAS COMPRAS Y DEJAR TODO CUADRADO
-- ============================================================
--
-- >>> ESTO NO SE PUEDE DESHACER. <<<
--
-- Borra TODAS las facturas de compra y todo lo que cuelga de ellas,
-- dejando el resto del sistema consistente. Las ventas, los clientes,
-- los productos, los proveedores, los gastos y los aportes de socios
-- NO SE TOCAN.
--
-- ------------------------------------------------------------
-- POR QUE NO SIRVE UN "DELETE FROM facturas_compra" A SECAS
-- ------------------------------------------------------------
-- 1. FALLA. La tabla "pagos" apunta a facturas_compra sin ON DELETE,
--    asi que Postgres bloquea el borrado con un error de llave ajena.
-- 2. Los EGRESOS del banco quedan huerfanos. movimientos_tesoreria
--    tiene ON DELETE SET NULL: la factura se va pero el egreso (y su
--    4x1000) se queda sin dueno. Tu saldo de Bold quedaria mal y no
--    sabrias de que era ese pago.
-- 3. El STOCK queda inflado. No hay ningun trigger que devuelva stock
--    al borrar items de compra, asi que los productos seguirian
--    diciendo que tienes unidades que ya no tienen respaldo.
-- 4. El COSTO PROMEDIO queda con el valor viejo, sin compras detras.
-- 5. Las COTIZACIONES quedan con costo_total y margen calculados
--    sobre compras que ya no existen: la utilidad seria mentira.
-- 6. Las SOLICITUDES DE COMPRA quedan cerradas como "COMPRADO"
--    aunque la compra ya no exista.
--
-- Este script resuelve los 6 puntos, en el orden correcto.
--
-- ------------------------------------------------------------
-- COMO CORRERLO
-- ------------------------------------------------------------
-- PASO 1: Corre SOLO la PARTE 0 y GUARDA EL RESULTADO. Es la lista de
--         lo que estas a punto de borrar. La vas a necesitar para
--         volver a digitar las compras. Exportala a CSV o hazle
--         captura. Si no la guardas, pierdes los datos.
-- PASO 2: Cierra la pestana del ERP.
-- PASO 3: Corre la PARTE 1 completa.
-- PASO 4: Corre supabase/VERIFICAR_INTEGRIDAD.sql.
--
-- ------------------------------------------------------------
-- QUE VAS A VER DESPUES (Y ES NORMAL)
-- ------------------------------------------------------------
-- * STOCK NEGATIVO en los productos que ya vendiste. Es correcto:
--   vendiste 3 extintores y ahora no hay ninguna compra que los
--   respalde, entonces el sistema dice -3. Cuando vuelvas a registrar
--   la compra de esos 3, queda en 0 solo. El chequeo 7 de
--   VERIFICAR_INTEGRIDAD lo va a marcar REVISAR hasta que termines de
--   digitar las compras. El chequeo 6 (el importante) debe decir OK.
-- * Costo promedio en 0 y margenes al 100% en las ventas, hasta que
--   registres las compras y les asignes la cotizacion.
-- * El saldo de tus cuentas SUBE, porque se van los egresos de esas
--   compras. Vuelve a bajar cuando las registres de nuevo.
-- ============================================================



-- ############################################################
-- ##  PARTE 0  --  RESPALDO. CORRE ESTO PRIMERO Y GUARDALO.
-- ############################################################
-- Esta es tu chuleta para volver a digitar todo. No borra nada.

-- 0.a  Cabecera de cada factura
select
  fc.fecha_factura,
  fc.fecha_vencimiento,
  p.razon_social                as proveedor,
  p.nit,
  fc.numero_factura,
  fc.estado,
  fc.subtotal,
  fc.iva_total,
  fc.total,
  fc.retencion_retefuente,
  fc.retencion_reteiva,
  fc.retencion_reteica,
  fc.retencion_total,
  fc.total_neto                 as lo_que_pagaste,
  fc.forma_pago,
  fc.dias_credito,
  fc.notas,
  fc.soporte_url
from public.facturas_compra fc
left join public.proveedores p on p.id = fc.proveedor_id
order by fc.fecha_factura, p.razon_social, fc.numero_factura;


-- 0.b  Items de cada factura (el detalle producto por producto)
select
  fc.fecha_factura,
  p.razon_social         as proveedor,
  fc.numero_factura,
  fci.descripcion,
  pr.nombre              as producto_catalogo,
  fci.cantidad,
  fci.precio_unitario,
  fci.iva_porcentaje,
  fci.iva_valor,
  fci.subtotal,
  fci.total
from public.factura_compra_items fci
join public.facturas_compra fc on fc.id = fci.factura_compra_id
left join public.proveedores p on p.id = fc.proveedor_id
left join public.productos pr  on pr.id = fci.producto_id
order by fc.fecha_factura, p.razon_social, fc.numero_factura, fci.descripcion;


-- 0.c  A que venta estaba asignado cada costo (para volver a cruzarlo)
select
  fc.numero_factura,
  p.razon_social      as proveedor,
  c.numero            as cotizacion,
  cl.razon_social     as cliente,
  pr.nombre           as producto,
  ac.destino,
  ac.cantidad,
  ac.subtotal
from public.asignacion_costos ac
join public.facturas_compra fc on fc.id = ac.factura_compra_id
left join public.proveedores p  on p.id = fc.proveedor_id
left join public.cotizaciones c on c.id = ac.cotizacion_id
left join public.clientes cl    on cl.id = c.cliente_id
left join public.productos pr   on pr.id = ac.producto_id
order by fc.numero_factura, c.numero;


-- 0.d  Los pagos que salieron del banco por estas compras
select
  mt.fecha,
  cu.nombre           as cuenta,
  mt.categoria,
  mt.monto,
  mt.concepto,
  fc.numero_factura,
  p.razon_social      as proveedor
from public.movimientos_tesoreria mt
join public.cuentas cu          on cu.id = mt.cuenta_id
left join public.facturas_compra fc on fc.id = mt.factura_compra_id
left join public.proveedores p      on p.id = fc.proveedor_id
where mt.factura_compra_id is not null
order by mt.fecha, mt.monto desc;


-- 0.e  Resumen de lo que se va a borrar
select
  (select count(*) from public.facturas_compra)                                   as facturas_de_compra,
  (select count(*) from public.factura_compra_items)                              as items,
  (select count(*) from public.asignacion_costos)                                 as asignaciones_de_costo,
  (select count(*) from public.pagos where factura_compra_id is not null)          as pagos_a_proveedores,
  (select count(*) from public.movimientos_tesoreria where factura_compra_id is not null) as movimientos_de_banco,
  (select coalesce(sum(monto),0) from public.movimientos_tesoreria
     where factura_compra_id is not null and tipo = 'EGRESO')                     as plata_que_vuelve_al_saldo,
  (select count(*) from public.documentos_soporte where factura_compra_id is not null) as documentos_soporte,
  (select count(*) from public.documentos where entidad_tipo = 'FACTURA_COMPRA')   as archivos_adjuntos;



-- ############################################################
-- ##  PARTE 1  --  EL BORRADO. CORRE ESTO DESPUES.
-- ############################################################
-- Todo va dentro de una transaccion: o se borra completo, o no se
-- borra nada. No queda a mitad de camino.

begin;


-- ------------------------------------------------------------
-- 1. Quitar el indice unico mientras limpiamos
-- ------------------------------------------------------------
-- No estorba para borrar, pero si vuelve a existir al final nos
-- asegura que no puedas volver a duplicar al digitar.
-- (Se recrea en el paso 12.)


-- ------------------------------------------------------------
-- 2. PAGOS a proveedores
-- ------------------------------------------------------------
-- ESTE ES EL QUE BLOQUEA EL DELETE. pagos.factura_compra_id no tiene
-- ON DELETE, asi que hay que borrarlo a mano ANTES que la factura.
delete from public.pagos
where factura_compra_id is not null;


-- ------------------------------------------------------------
-- 3. MOVIMIENTOS DE BANCO de esas compras (y su 4x1000)
-- ------------------------------------------------------------
-- movimientos_tesoreria tiene ON DELETE SET NULL, asi que si no los
-- borramos aqui quedarian egresos sin dueno y tu saldo de Bold
-- quedaria mal para siempre.
--
-- El 4x1000 hijo cae solo por el ON DELETE CASCADE de gmf_de_id, pero
-- igual lo cubrimos porque el GMF hereda el factura_compra_id.
delete from public.movimientos_tesoreria
where factura_compra_id is not null;

-- Por si quedo algun 4x1000 cuyo padre ya se fue
delete from public.movimientos_tesoreria gmf
where gmf.categoria = 'GMF'
  and gmf.gmf_de_id is not null
  and not exists (
    select 1 from public.movimientos_tesoreria padre
    where padre.id = gmf.gmf_de_id
  );


-- ------------------------------------------------------------
-- 4. DOCUMENTOS SOPORTE generados desde compras
-- ------------------------------------------------------------
-- OJO: esto libera los consecutivos de DS que ya habias usado. Si la
-- DIAN te los pide, primero exportalos de la PARTE 0.
delete from public.documentos_soporte
where factura_compra_id is not null;


-- ------------------------------------------------------------
-- 5. ARCHIVOS ADJUNTOS (facturas escaneadas, PDFs)
-- ------------------------------------------------------------
-- La tabla documentos no tiene llave ajena a facturas_compra (usa
-- entidad_tipo + entidad_id), asi que estos no se borran solos:
-- quedarian apuntando a facturas que ya no existen.
delete from public.documentos
where entidad_tipo = 'FACTURA_COMPRA';


-- ------------------------------------------------------------
-- 6. LAS FACTURAS DE COMPRA
-- ------------------------------------------------------------
-- Al borrar la factura caen en cascada:
--   - factura_compra_items  (ON DELETE CASCADE)
--   - asignacion_costos     (ON DELETE CASCADE)
--
-- El trigger trg_revertir_costo_item se dispara por cada item y va
-- recalculando el costo_promedio. En el paso 8 lo dejamos en 0 de
-- todos modos, porque ya no queda ninguna compra de respaldo.
delete from public.facturas_compra;


-- ------------------------------------------------------------
-- 7. Barrido de asignaciones que hubieran quedado sueltas
-- ------------------------------------------------------------
delete from public.asignacion_costos
where factura_compra_id is null
   or not exists (
     select 1 from public.facturas_compra fc where fc.id = asignacion_costos.factura_compra_id
   );


-- ------------------------------------------------------------
-- 8. STOCK y COSTO PROMEDIO de todos los productos
-- ------------------------------------------------------------
-- No existe ningun trigger que devuelva stock al borrar items de
-- compra, asi que hay que recalcular a mano con la misma formula que
-- usa el chequeo de integridad:
--
--   stock = comprado (facturas vivas) - vendido (facturas vivas)
--
-- Como ya no hay compras, queda el negativo de lo vendido. ESO ES
-- CORRECTO: cuando vuelvas a digitar la compra, se pone en cero solo.
-- Primero: todo a cero (asi los productos que nunca se vendieron
-- quedan limpios de una)
update public.productos
set stock_actual = 0,
    costo_promedio = 0;

-- Segundo: los que ya se vendieron quedan en el negativo de lo vendido
update public.productos p
set stock_actual = 0 - sal.salidas
from (
  select fvi.producto_id, sum(fvi.cantidad) as salidas
  from public.factura_venta_items fvi
  join public.facturas_venta fv on fv.id = fvi.factura_venta_id
  where fv.estado <> 'ANULADA'
    and fvi.producto_id is not null
  group by fvi.producto_id
) sal
where p.id = sal.producto_id;


-- ------------------------------------------------------------
-- 9. COSTOS Y MARGENES de las cotizaciones
-- ------------------------------------------------------------
-- Estaban calculados sobre compras que ya no existen. Se dejan en
-- cero para que no muestren una utilidad inventada. Se vuelven a
-- llenar cuando registres las compras y les asignes la cotizacion.
update public.cotizacion_items
set costo_unitario = 0,
    utilidad = 0
where coalesce(costo_unitario, 0) <> 0
   or coalesce(utilidad, 0) <> 0;

update public.cotizaciones
set costo_total = 0,
    utilidad_estimada = 0,
    margen_pct = 0
where coalesce(costo_total, 0) <> 0
   or coalesce(utilidad_estimada, 0) <> 0
   or coalesce(margen_pct, 0) <> 0;


-- ------------------------------------------------------------
-- 10. SOLICITUDES DE COMPRA
-- ------------------------------------------------------------
-- Las que se habian cerrado como COMPRADO ya no tienen compra detras.
-- Se reabren para que vuelvan a aparecer en la pantalla de Compras y
-- sepas exactamente que te falta digitar.
update public.solicitudes_compra
set estado = 'PENDIENTE',
    notas = 'Reabierta: se borraron todas las compras para digitarlas de nuevo.'
where estado in ('COMPRADO', 'EN_COTIZACION');


-- ------------------------------------------------------------
-- 11. GASTOS vinculados a compras
-- ------------------------------------------------------------
-- Los gastos son un modulo aparte y NO se borran (fletes, camara de
-- comercio, camisas, etc. siguen siendo gastos reales). Solo se deja
-- constancia si alguno apuntaba a una compra.
-- No hay nada que hacer aqui: gastos no tiene factura_compra_id.


-- ------------------------------------------------------------
-- 12. Reconstruir el indice que evita duplicados al digitar
-- ------------------------------------------------------------
drop index if exists public.idx_facturas_compra_no_duplicar;

create unique index idx_facturas_compra_no_duplicar
  on public.facturas_compra (proveedor_id, numero_factura)
  where estado <> 'ANULADA' and numero_factura is not null and numero_factura <> '';

comment on index public.idx_facturas_compra_no_duplicar is
  'Evita registrar dos veces la misma factura mientras no este anulada. Protege contra doble clic y condiciones de carrera.';


commit;


-- ############################################################
-- ##  PARTE 2  --  COMPROBACION
-- ############################################################
-- Todo debe quedar en cero. Si algo sale distinto de 0, avisame.

select
  (select count(*) from public.facturas_compra)                                    as facturas_compra_deben_ser_0,
  (select count(*) from public.factura_compra_items)                               as items_deben_ser_0,
  (select count(*) from public.asignacion_costos)                                  as asignaciones_deben_ser_0,
  (select count(*) from public.pagos where factura_compra_id is not null)           as pagos_deben_ser_0,
  (select count(*) from public.movimientos_tesoreria where factura_compra_id is not null) as movs_deben_ser_0,
  (select count(*) from public.documentos where entidad_tipo = 'FACTURA_COMPRA')    as adjuntos_deben_ser_0,
  (select count(*) from public.productos where coalesce(costo_promedio,0) <> 0)     as costos_deben_ser_0,
  (select count(*) from public.cotizaciones where coalesce(costo_total,0) <> 0)     as costos_venta_deben_ser_0;

-- Como quedaron tus cuentas (el saldo sube porque se fueron los pagos)
select nombre, saldo_inicial, total_ingresos, total_egresos, saldo_actual
from public.saldos_cuentas
order by orden, nombre;

-- Que productos quedaron en negativo (es lo esperado: lo que ya
-- vendiste y todavia no tiene compra que lo respalde). Esta lista es
-- justo lo que te falta digitar.
select nombre, codigo, stock_actual
from public.productos
where coalesce(stock_actual, 0) < 0
order by stock_actual;
