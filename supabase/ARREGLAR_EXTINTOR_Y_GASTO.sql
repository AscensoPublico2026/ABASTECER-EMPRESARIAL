-- ============================================================
--   ARREGLAR: EL EXTINTOR SIN ASIGNAR + EL FLETE DE 45.000
-- ============================================================
-- Corre TODO este archivo de una sola vez en el SQL Editor de Supabase.
-- Es idempotente: si lo corres dos veces no se daña nada.
--
-- Al final salen 4 tablas de verificacion. Manda esas 4 y con eso se
-- confirma que quedo bien. No hay nada mas que hacer a mano.
-- ============================================================


-- ############################################################
-- ##  PARTE 1  --  EL EXTINTOR QUE NO CRUZABA
-- ############################################################
-- QUE PASO
-- En la cotizacion COT-2026-011 vendiste:
--    PRD-0017  EXTINTOR CO2 10 LIBRAS              (444411e4...)
--    PRD-0018  BASE PARA EXTINTOR 20 LIBRAS        (f5e5fc92...)
--
-- Pero al registrar la compra asignaste:
--    PRD-0013  EXTINTOR CO2 10 LIBRAS (CON BASE + LETRERO)  (5ed6db6b...)
--    PRD-0018  BASE PARA EXTINTOR                           (f5e5fc92...)
--
-- La base cruzo porque el producto coincide. El extintor NO, porque
-- PRD-0013 y PRD-0017 son productos distintos del catalogo: compraste el
-- kit y lo vendiste por separado.
--
-- La vista analisis_venta_items cruza por producto_id. Al no coincidir
-- muestra "sin asignar" y margen del 100%, que no es real.
--
-- FIX: apuntar la asignacion al producto que SI esta en la cotizacion.
-- Para eso existe asignacion_costos: mapear lo comprado contra lo
-- vendido, aunque no sean el mismo SKU.

update public.asignacion_costos
set producto_id = '444411e4-87d3-4b54-98be-b29a030c6a53'   -- PRD-0017, el vendido
where producto_id = '5ed6db6b-c5e1-4b51-a8fa-aa22bc6ce456'  -- PRD-0013, el comprado
  and cotizacion_id = 'a281bfef-c2a1-403f-8a43-e4f9f7f50d54'
  and destino = 'VENTA';



-- ############################################################
-- ##  PARTE 2  --  EL FLETE DE 45.000 QUE NO SE REPARTIO
-- ############################################################
-- QUE PASO (esta es la causa raiz, confirmada)
--
-- Tu registraste el gasto ANTES de que existiera la tabla gasto_reparto.
-- En ese momento un gasto solo podia apuntar a UNA venta, en el campo
-- gastos.cotizacion_id. Cuando corriste la migracion 035, el PASO 2 de
-- esa migracion tomo los gastos viejos y creo UNA fila de reparto por el
-- 100% del monto, hacia la unica venta que el gasto tenia guardada.
--
-- Resultado: gasto_reparto quedo con UNA sola fila de 45.000 apuntando a
-- COT-2026-011. Por eso:
--   - el documento soporte muestra 45.000 (esa venta si tiene 45.000
--     asignados, el sistema no esta mintiendo, el dato de origen esta mal)
--   - no aparece en COT-2026-013 ni en COT-2026-015 (no tienen fila)
--
-- El codigo ya quedo bien: el formulario nuevo y el de edicion si dejan
-- meter varias ventas, y el centro de documentos ya busca por gasto_id.
-- Lo que falta es CORREGIR EL DATO que quedo mal migrado.
--
-- FIX: borrar el reparto malo y volverlo a crear entre las 3 ventas que
-- realmente uso ese flete, en partes iguales de 15.000.
-- El documento soporte sigue siendo UNO por los 45.000 completos, que es
-- lo correcto ante la DIAN.


-- ------------------------------------------------------------
-- 2.1  Asegurar que el gasto esta marcado como costo de venta
-- ------------------------------------------------------------
update public.gastos g
set es_costo_venta = true
where g.monto = 45000
  and (g.concepto ilike '%domicilio%' or g.concepto ilike '%flete%')
  and g.es_costo_venta is distinct from true;


-- ------------------------------------------------------------
-- 2.2  Borrar el reparto mal migrado de ese gasto
-- ------------------------------------------------------------
delete from public.gasto_reparto gr
using public.gastos g
where g.id = gr.gasto_id
  and g.monto = 45000
  and (g.concepto ilike '%domicilio%' or g.concepto ilike '%flete%');


-- ------------------------------------------------------------
-- 2.3  Repartirlo entre las 3 ventas: 15.000 a cada una
-- ------------------------------------------------------------
-- El sobrante de la division (si el monto no fuera divisible exacto) se
-- le suma a la primera venta, para que la suma del reparto cuadre al
-- peso con el monto del gasto y no quede plata sin asignar.
with el_gasto as (
  select g.id, g.monto
  from public.gastos g
  where g.monto = 45000
    and (g.concepto ilike '%domicilio%' or g.concepto ilike '%flete%')
  order by g.fecha desc, g.created_at desc
  limit 1
),
las_ventas as (
  select
    c.id,
    c.numero,
    row_number() over (order by c.numero) as rn,
    count(*)      over ()                 as n
  from public.cotizaciones c
  where c.numero in ('COT-2026-011', 'COT-2026-013', 'COT-2026-015')
)
insert into public.gasto_reparto (gasto_id, cotizacion_id, monto, notas)
select
  eg.id,
  v.id,
  case
    when v.rn = 1
      then floor(eg.monto / v.n) + (eg.monto - floor(eg.monto / v.n) * v.n)
    else floor(eg.monto / v.n)
  end,
  'Reparto corregido: un solo flete entrego los 3 pedidos (COT 11, 13 y 15)'
from el_gasto eg
cross join las_ventas v
on conflict (gasto_id, cotizacion_id)
do update set monto = excluded.monto, notas = excluded.notas;


-- ------------------------------------------------------------
-- 2.4  Dejar gastos.cotizacion_id apuntando a la primera del reparto
-- ------------------------------------------------------------
-- Es el campo viejo. Ya no se usa para calcular, pero se mantiene
-- coherente para que ninguna pantalla vieja muestre algo distinto.
update public.gastos g
set cotizacion_id = sub.cotizacion_id
from (
  select gr.gasto_id, gr.cotizacion_id
  from public.gasto_reparto gr
  join public.cotizaciones c on c.id = gr.cotizacion_id
  join public.gastos g2 on g2.id = gr.gasto_id
  where g2.monto = 45000
    and (g2.concepto ilike '%domicilio%' or g2.concepto ilike '%flete%')
  order by c.numero
  limit 1
) sub
where g.id = sub.gasto_id;


-- ------------------------------------------------------------
-- 2.5  Amarrar el documento soporte al gasto, si quedo suelto
-- ------------------------------------------------------------
-- Si ds.gasto_id esta NULL, el centro de documentos no puede saber cuanto
-- le toca a cada venta y muestra el total. Y tampoco aparece en las otras
-- dos ventas, porque la busqueda va por gasto_id.
update public.documentos_soporte ds
set gasto_id = eg.id
from (
  select g.id
  from public.gastos g
  where g.monto = 45000
    and (g.concepto ilike '%domicilio%' or g.concepto ilike '%flete%')
  order by g.fecha desc, g.created_at desc
  limit 1
) eg
where ds.gasto_id is null
  and ds.subtotal = 45000;

-- Y al revés: si el gasto no sabe cual es su documento soporte
update public.gastos g
set documento_soporte_id = ds.id,
    tiene_soporte = true
from public.documentos_soporte ds
where ds.gasto_id = g.id
  and g.documento_soporte_id is null;



-- ############################################################
-- ##  PARTE 3  --  RECALCULAR TODO LO QUE CAMBIO
-- ############################################################
-- Cambiaron dos cosas: el costo del extintor en COT-2026-011 y el reparto
-- del flete en las 3 ventas. Hay que recalcular costo_unitario y utilidad
-- de los items, y despues los totales de cada cotizacion.
--
-- Se hace en SQL para que quede reflejado YA, sin depender de que abras
-- cada venta en la app para que se recalcule.

-- ------------------------------------------------------------
-- 3.1  Costo de los items (viene de asignacion_costos)
-- ------------------------------------------------------------
with ventas_afectadas as (
  select 'a281bfef-c2a1-403f-8a43-e4f9f7f50d54'::uuid as id
  union
  select c.id from public.cotizaciones c
  where c.numero in ('COT-2026-011', 'COT-2026-013', 'COT-2026-015')
),
costo_por_producto as (
  select
    ac.cotizacion_id,
    ac.producto_id,
    sum(ac.cantidad) as cantidad,
    sum(ac.subtotal) as subtotal
  from public.asignacion_costos ac
  where ac.cotizacion_id in (select id from ventas_afectadas)
    and ac.destino = 'VENTA'
    and ac.producto_id is not null
  group by ac.cotizacion_id, ac.producto_id
)
update public.cotizacion_items ci
set costo_unitario = round(cp.subtotal / nullif(cp.cantidad, 0), 2),
    utilidad = round(ci.subtotal - (round(cp.subtotal / nullif(cp.cantidad, 0), 2) * ci.cantidad))
from costo_por_producto cp
where ci.cotizacion_id = cp.cotizacion_id
  and ci.producto_id  = cp.producto_id
  and cp.cantidad > 0;


-- ------------------------------------------------------------
-- 3.2  Totales de cada cotizacion (items + gastos repartidos)
-- ------------------------------------------------------------
-- El IVA del gasto se prorratea: si el flete de 45.000 traia IVA y a esta
-- venta le toca 15.000 (un tercio), le corresponde un tercio del IVA. Sin
-- prorratear, el mismo IVA se descontaria tres veces.
with ventas_afectadas as (
  select 'a281bfef-c2a1-403f-8a43-e4f9f7f50d54'::uuid as id
  union
  select c.id from public.cotizaciones c
  where c.numero in ('COT-2026-011', 'COT-2026-013', 'COT-2026-015')
),
costo_items as (
  select ci.cotizacion_id,
         coalesce(sum(ci.costo_unitario * ci.cantidad), 0) as costo
  from public.cotizacion_items ci
  where ci.cotizacion_id in (select id from ventas_afectadas)
  group by ci.cotizacion_id
),
costo_gastos as (
  select gr.cotizacion_id,
         coalesce(sum(
           gr.monto - (coalesce(g.iva_incluido, 0) * gr.monto / nullif(g.monto, 0))
         ), 0) as costo
  from public.gasto_reparto gr
  join public.gastos g on g.id = gr.gasto_id
  where gr.cotizacion_id in (select id from ventas_afectadas)
    and g.es_costo_venta = true
  group by gr.cotizacion_id
)
update public.cotizaciones c
set costo_total       = round(coalesce(ci.costo, 0) + coalesce(cg.costo, 0)),
    utilidad_estimada = round(c.subtotal - coalesce(ci.costo, 0) - coalesce(cg.costo, 0)),
    margen_pct        = case when c.subtotal > 0
      then round((((c.subtotal - coalesce(ci.costo, 0) - coalesce(cg.costo, 0)) / c.subtotal) * 100)::numeric, 2)
      else 0 end
from ventas_afectadas va
left join costo_items  ci on ci.cotizacion_id = va.id
left join costo_gastos cg on cg.cotizacion_id = va.id
where c.id = va.id;



-- ############################################################
-- ##  PARTE 4  --  VERIFICACION (manda estas 4 tablas)
-- ############################################################

-- 4.a  EL REPARTO DEL FLETE: deben salir 3 filas de 15.000
select
  g.concepto,
  g.monto                                        as monto_total_gasto,
  c.numero                                       as venta,
  gr.monto                                       as le_toca_a_esta_venta,
  case when gr.monto = 15000 then 'OK' else 'REVISAR' end as estado
from public.gasto_reparto gr
join public.gastos g       on g.id = gr.gasto_id
join public.cotizaciones c on c.id = gr.cotizacion_id
where g.monto = 45000
   or g.concepto ilike '%domicilio%'
   or g.concepto ilike '%flete%'
order by c.numero;


-- 4.b  EL DOCUMENTO SOPORTE: debe tener gasto_id y reparto
select
  ds.numero              as documento_soporte,
  ds.subtotal            as total_del_documento,
  ds.tercero_nombre,
  ds.gasto_id,
  (select count(*) from public.gasto_reparto gr where gr.gasto_id = ds.gasto_id) as ventas_en_reparto,
  case
    when ds.gasto_id is null then 'MAL: sin gasto_id, va a seguir mostrando el total'
    when (select count(*) from public.gasto_reparto gr where gr.gasto_id = ds.gasto_id) = 3
      then 'OK: va a mostrar 15.000 en cada una de las 3 ventas'
    else 'REVISAR: el reparto no tiene 3 ventas'
  end as diagnostico
from public.documentos_soporte ds
order by ds.numero;


-- 4.c  EL EXTINTOR: ya debe tener costo
select
  ci.descripcion,
  ci.cantidad,
  ci.precio_unitario   as lo_vendi_c_u,
  ci.costo_unitario    as me_costo_c_u,
  ci.utilidad          as gane,
  case when ci.costo_unitario > 0 then 'OK, ya cruza' else 'SIGUE SIN ASIGNAR' end as estado
from public.cotizacion_items ci
where ci.cotizacion_id = 'a281bfef-c2a1-403f-8a43-e4f9f7f50d54'
order by ci.descripcion;


-- 4.d  LAS 3 VENTAS: costo, utilidad y margen actualizados
select
  numero, subtotal, costo_total, utilidad_estimada, margen_pct
from public.cotizaciones
where numero in ('COT-2026-011', 'COT-2026-013', 'COT-2026-015')
order by numero;


-- 4.e  CONTROL FINAL: ningun gasto de venta con plata sin repartir
-- Si esto sale VACIO, todo el costo esta entrando a alguna venta.
select concepto, monto_total, monto_repartido, sin_repartir, num_ventas, ventas
from public.gastos_reparto_detalle
where es_costo_venta and sin_repartir > 1
order by sin_repartir desc;
