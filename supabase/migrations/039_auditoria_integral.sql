-- ============================================================
-- ABASTECER EMPRESARIAL SAS - AUDITORIA INTEGRAL DEL DINERO
-- Migracion 039
-- ============================================================
-- Corre TODO este archivo de una sola vez. Es idempotente: si lo corres
-- dos veces no se dana nada.
--
-- PARTE A: corrige los datos que estan mal.
-- PARTE B: crea la vista auditoria_integridad, que de aqui en adelante
--          lista sola todo lo que este descuadrado.
-- PARTE C: muestra que quedo (esas son las tablas que hay que mandar).
--
-- REQUISITO: hay que haber corrido antes la 037 y la 038.
-- ============================================================


-- ############################################################
-- ##  PARTE A  --  CORRECCIONES
-- ############################################################

-- ------------------------------------------------------------
-- A1. DOCUMENTOS SOPORTE PEGADOS A LA VENTA EQUIVOCADA
-- ------------------------------------------------------------
-- EL CASO: el DS-2026-002 seguia apareciendo en la COT-2026-013 aunque el
-- gasto ya se habia repartido a otras ventas.
--
-- POR QUE: documentos_soporte.cotizacion_id se escribe cuando se CREA el
-- DS, y editarGasto nunca lo volvia a tocar. Entonces el DS quedaba
-- clavado en la venta original para siempre, aunque el reparto cambiara.
--
-- LA REGLA CORRECTA: si el DS pertenece a un GASTO, la verdad de a que
-- ventas pertenece esta en gasto_reparto, no en ese campo. El campo solo
-- tiene sentido si el gasto va a UNA sola venta.
update public.documentos_soporte ds
set cotizacion_id = sub.cotizacion_unica
from (
  select
    g.id as gasto_id,
    case when count(gr.id) = 1 then min(gr.cotizacion_id) else null end
      as cotizacion_unica
  from public.gastos g
  left join public.gasto_reparto gr on gr.gasto_id = g.id
  group by g.id
) sub
where ds.gasto_id = sub.gasto_id
  and ds.cotizacion_id is distinct from sub.cotizacion_unica;


-- ------------------------------------------------------------
-- A2. DOCUMENTOS SOPORTE DE COMPRAS CON EL VALOR INFLADO
-- ------------------------------------------------------------
-- ERROR ENCONTRADO EN LA AUDITORIA (no se habia detectado antes).
--
-- Al crear el DS de una factura de compra, el codigo mandaba
-- cantidad = numero de lineas de la factura y valor_unitario = total.
-- El trigger calcula subtotal = cantidad * valor_unitario, asi que:
--
--   factura de 3 lineas por 500.000  ->  DS por 1.500.000
--
-- Un documento soporte es un documento ante la DIAN. Estaba declarando
-- el triple de lo que se pago.
--
-- FIX: cantidad = 1 y valor_unitario = el total de la factura. El trigger
-- recalcula el subtotal solo.
update public.documentos_soporte ds
set cantidad = 1,
    valor_unitario = fc.total
from public.facturas_compra fc
where ds.factura_compra_id = fc.id
  and (ds.cantidad <> 1 or ds.valor_unitario <> fc.total);


-- ------------------------------------------------------------
-- A3. DOCUMENTOS SOPORTE DESACTUALIZADOS RESPECTO A SU GASTO
-- ------------------------------------------------------------
-- editarGasto cambiaba el monto, la fecha y el concepto del gasto pero
-- nunca actualizaba el DS. Quedaba un documento diciendo una cifra y el
-- gasto diciendo otra.
update public.documentos_soporte ds
set cantidad = 1,
    valor_unitario = g.monto,
    fecha = g.fecha,
    concepto = g.concepto
from public.gastos g
where ds.gasto_id = g.id
  and (ds.valor_unitario <> g.monto or ds.cantidad <> 1
       or ds.fecha <> g.fecha or ds.concepto <> g.concepto);


-- ------------------------------------------------------------
-- A4. PLATA QUE SALIO DEL BANCO Y NO ESTABA REGISTRADA
-- ------------------------------------------------------------
-- EL CASO DE LA IMPRESORA: el movimiento decia 654.881 pero el 4x1000
-- cobrado (2.819) solo se explica con un egreso de 704.750. El banco
-- descontó 704.750; el ERP tenia 49.869 menos.
--
-- EL 4x1000 ES EL TESTIGO: es el unico dato del libro que calcula el
-- banco. Si no corresponde con el monto guardado, el monto esta mal.
--
-- FIX AUTORIZADO POR EL DUENO: "el valor que salio de nuestra cuenta fue
-- completo, por lo tanto debe descontarlo completo". Se corrige el monto
-- al que vio el banco.

-- A4.1 Corregir el GASTO (el trigger de la 038 ajusta su movimiento)
with tasa as (
  select coalesce(
    (select valor / 100 from public.config_tributaria where clave = 'GMF_TASA'),
    0.004) as t
),
descuadre as (
  select
    m.gasto_id,
    round(g_gmf.monto / t.t) as monto_real_banco
  from public.movimientos_tesoreria m
  cross join tasa t
  join public.movimientos_tesoreria g_gmf on g_gmf.gmf_de_id = m.id
  where m.gasto_id is not null
    and g_gmf.monto <> ceil(m.monto * t.t)
)
update public.gastos g
set monto = d.monto_real_banco,
    -- El IVA se reparte a la tarifa del 19%, que es la de equipos y
    -- servicios en Colombia. Si la factura tenia otra tarifa, se corrige
    -- a mano; la vista de la PARTE B lo deja visible.
    iva_incluido = case
      when coalesce(g.iva_incluido, 0) > 0
        then round(d.monto_real_banco - (d.monto_real_banco / 1.19), 2)
      else 0 end
from descuadre d
where g.id = d.gasto_id
  and g.monto <> d.monto_real_banco;

-- A4.2 Corregir el MOVIMIENTO de tesoreria al monto que vio el banco
with tasa as (
  select coalesce(
    (select valor / 100 from public.config_tributaria where clave = 'GMF_TASA'),
    0.004) as t
),
descuadre as (
  select m.id as movimiento_id, round(g_gmf.monto / t.t) as monto_real_banco
  from public.movimientos_tesoreria m
  cross join tasa t
  join public.movimientos_tesoreria g_gmf on g_gmf.gmf_de_id = m.id
  where g_gmf.monto <> ceil(m.monto * t.t)
)
update public.movimientos_tesoreria m
set monto = d.monto_real_banco
from descuadre d
where m.id = d.movimiento_id
  and m.monto <> d.monto_real_banco;


-- ------------------------------------------------------------
-- A5. EL 4x1000 DE TODOS LOS MOVIMIENTOS
-- ------------------------------------------------------------
-- Se revisa uno por uno: que exista donde debe, que valga lo que debe y
-- que no exista donde no debe.

-- A5.1 Corregir los que existen pero con el valor equivocado
with tasa as (
  select coalesce(
    (select valor / 100 from public.config_tributaria where clave = 'GMF_TASA'),
    0.004) as t
)
update public.movimientos_tesoreria gmf
set monto = ceil(padre.monto * t.t),
    cuenta_id = padre.cuenta_id,
    fecha = padre.fecha
from public.movimientos_tesoreria padre, tasa t
where gmf.gmf_de_id = padre.id
  and gmf.categoria = 'GMF'
  and gmf.monto <> ceil(padre.monto * t.t);

-- A5.2 Crear el 4x1000 que falta
-- Un egreso de una cuenta que cobra GMF y que no tiene su cobro.
with tasa as (
  select coalesce(
    (select valor / 100 from public.config_tributaria where clave = 'GMF_TASA'),
    0.004) as t
)
insert into public.movimientos_tesoreria (
  cuenta_id, fecha, tipo, categoria, monto, concepto,
  factura_compra_id, cotizacion_id, gasto_id, movimiento_socio_id,
  medio_pago, creado_por_id, creado_por_nombre, gmf_de_id
)
select
  m.cuenta_id, m.fecha, 'EGRESO', 'GMF',
  ceil(m.monto * t.t),
  'GMF (4x1000) ' || left(m.concepto, 80),
  m.factura_compra_id, m.cotizacion_id, m.gasto_id, m.movimiento_socio_id,
  'Cobro bancario', m.creado_por_id, m.creado_por_nombre, m.id
from public.movimientos_tesoreria m
cross join tasa t
join public.cuentas cu on cu.id = m.cuenta_id
where m.tipo = 'EGRESO'
  and m.categoria not in ('GMF', 'TRASLADO_ENTRADA')
  and coalesce(cu.cobra_gmf, true) = true
  and ceil(m.monto * t.t) > 0
  and not exists (
    select 1 from public.movimientos_tesoreria g where g.gmf_de_id = m.id
  );

-- A5.3 Borrar el 4x1000 que no deberia existir
-- (cuentas exentas, o movimientos que dejaron de ser egresos que lo causan)
delete from public.movimientos_tesoreria gmf
using public.movimientos_tesoreria padre
left join public.cuentas cu on cu.id = padre.cuenta_id
where gmf.gmf_de_id = padre.id
  and (
    padre.tipo <> 'EGRESO'
    or padre.categoria in ('GMF', 'TRASLADO_ENTRADA')
    or coalesce(cu.cobra_gmf, true) = false
  );


-- ------------------------------------------------------------
-- A6. FORZAR EL RECALCULO DE LOS CAMPOS DERIVADOS
-- ------------------------------------------------------------
-- Estos campos los calculan triggers. Si alguna vez se escribieron a
-- mano o el trigger se agrego despues, quedaron con basura. Un update
-- que no cambia nada dispara el trigger y los deja bien.

-- retencion_total y total_neto de las compras (trigger de la 029)
update public.facturas_compra set updated_at = now();

-- subtotal e iva_valor de las asignaciones (trigger de la 017)
update public.asignacion_costos set notas = notas;

-- subtotal de los documentos soporte (trigger de la 018)
update public.documentos_soporte set updated_at = now();


-- ------------------------------------------------------------
-- A7. COSTO Y UTILIDAD DE CADA ITEM VENDIDO
-- ------------------------------------------------------------
-- Se recalcula desde asignacion_costos, que es la verdad de lo que se
-- pago por cada producto. Antes esto solo pasaba cuando la app tocaba la
-- venta; si el costo cambiaba por otro lado, el item quedaba viejo.
with costo_por_producto as (
  select
    ac.cotizacion_id,
    ac.producto_id,
    sum(ac.cantidad) as cantidad,
    sum(ac.subtotal) as subtotal
  from public.asignacion_costos ac
  where ac.destino = 'VENTA'
    and ac.cotizacion_id is not null
    and ac.producto_id is not null
  group by ac.cotizacion_id, ac.producto_id
)
update public.cotizacion_items ci
set costo_unitario = round(cp.subtotal / nullif(cp.cantidad, 0), 2),
    utilidad = round(ci.subtotal - (round(cp.subtotal / nullif(cp.cantidad, 0), 2) * ci.cantidad))
from costo_por_producto cp
where ci.cotizacion_id = cp.cotizacion_id
  and ci.producto_id = cp.producto_id
  and cp.cantidad > 0
  and (ci.costo_unitario is distinct from round(cp.subtotal / nullif(cp.cantidad, 0), 2));

-- Los items que NO tienen ninguna compra asignada deben quedar en cero,
-- no con un costo viejo que ya no corresponde.
update public.cotizacion_items ci
set costo_unitario = 0,
    utilidad = ci.subtotal
where ci.costo_unitario <> 0
  and not exists (
    select 1 from public.asignacion_costos ac
    where ac.cotizacion_id = ci.cotizacion_id
      and ac.producto_id = ci.producto_id
      and ac.destino = 'VENTA'
  );


-- ------------------------------------------------------------
-- A8. COSTO, UTILIDAD Y MARGEN DE CADA COTIZACION
-- ------------------------------------------------------------
-- costo_total = costo de los productos + gastos repartidos a esta venta.
-- El IVA del gasto se prorratea: si el flete de 45.000 traia IVA y a esta
-- venta le toca un tercio, le corresponde un tercio del IVA. Sin
-- prorratear, el mismo IVA se descontaria tres veces.
with costo_items as (
  select ci.cotizacion_id,
         coalesce(sum(ci.costo_unitario * ci.cantidad), 0) as costo
  from public.cotizacion_items ci
  group by ci.cotizacion_id
),
costo_gastos as (
  select gr.cotizacion_id,
         coalesce(sum(
           gr.monto - (coalesce(g.iva_incluido, 0) * gr.monto / nullif(g.monto, 0))
         ), 0) as costo
  from public.gasto_reparto gr
  join public.gastos g on g.id = gr.gasto_id
  where g.es_costo_venta = true
  group by gr.cotizacion_id
)
update public.cotizaciones c
set costo_total       = round(coalesce(ci.costo, 0) + coalesce(cg.costo, 0)),
    utilidad_estimada = round(c.subtotal - coalesce(ci.costo, 0) - coalesce(cg.costo, 0)),
    margen_pct        = case when c.subtotal > 0
      then round((((c.subtotal - coalesce(ci.costo, 0) - coalesce(cg.costo, 0)) / c.subtotal) * 100)::numeric, 2)
      else 0 end
from public.cotizaciones cc
left join costo_items  ci on ci.cotizacion_id = cc.id
left join costo_gastos cg on cg.cotizacion_id = cc.id
where c.id = cc.id;



-- ############################################################
-- ##  PARTE B  --  LA VISTA QUE AUDITA SOLA DE AQUI EN ADELANTE
-- ############################################################
-- Un solo lugar donde se ve todo lo que esta descuadrado. Si devuelve
-- cero filas, el circuito del dinero esta sano.
create or replace view public.auditoria_integridad as

-- 1. El banco vio salir mas plata de la que tenemos registrada
with tasa as (
  select coalesce(
    (select valor / 100 from public.config_tributaria where clave = 'GMF_TASA'),
    0.004) as t
)
select
  'BANCO'                                       as area,
  'GRAVE'                                       as gravedad,
  'El 4x1000 no corresponde al monto: el banco vio salir otra cifra' as problema,
  m.concepto                                    as detalle,
  round(g.monto / t.t) - m.monto                as diferencia,
  m.id::text                                    as referencia
from public.movimientos_tesoreria m
cross join tasa t
join public.movimientos_tesoreria g on g.gmf_de_id = m.id
where g.monto <> ceil(m.monto * t.t)

union all

-- 2. Egresos sin su 4x1000 (el banco lo cobro y no esta registrado)
select
  'BANCO', 'GRAVE',
  'Egreso sin su 4x1000 registrado',
  m.concepto,
  ceil(m.monto * t.t),
  m.id::text
from public.movimientos_tesoreria m
cross join tasa t
join public.cuentas cu on cu.id = m.cuenta_id
where m.tipo = 'EGRESO'
  and m.categoria not in ('GMF', 'TRASLADO_ENTRADA')
  and coalesce(cu.cobra_gmf, true)
  and ceil(m.monto * t.t) > 0
  and not exists (select 1 from public.movimientos_tesoreria g where g.gmf_de_id = m.id)

union all

-- 3. Costo de compra que no aterriza en ningun producto de la venta
--    (el caso del extintor: se compro el kit y se vendio por separado)
select
  'COSTOS', 'GRAVE',
  'Compra asignada a un producto que no esta en la cotizacion: el margen sale inflado',
  c.numero || ' - ' || coalesce(p.nombre, 'producto sin nombre'),
  sum(ac.subtotal),
  c.id::text
from public.asignacion_costos ac
join public.cotizaciones c on c.id = ac.cotizacion_id
left join public.productos p on p.id = ac.producto_id
where ac.destino = 'VENTA'
  and not exists (
    select 1 from public.cotizacion_items ci
    where ci.cotizacion_id = ac.cotizacion_id
      and ci.producto_id = ac.producto_id
  )
group by c.id, c.numero, p.nombre

union all

-- 4. Gastos de venta con plata sin repartir (infla la utilidad)
select
  'COSTOS', 'MEDIA',
  'Gasto de venta con parte sin repartir: ese costo no entra a ninguna venta',
  g.concepto,
  g.monto - coalesce(sum(gr.monto), 0),
  g.id::text
from public.gastos g
left join public.gasto_reparto gr on gr.gasto_id = g.id
where g.es_costo_venta
group by g.id, g.concepto, g.monto
having g.monto - coalesce(sum(gr.monto), 0) > 1

union all

-- 5. Reparto que suma MAS que el gasto (se descontaria doble)
select
  'COSTOS', 'GRAVE',
  'El reparto suma mas que el gasto: se esta descontando de mas',
  g.concepto,
  coalesce(sum(gr.monto), 0) - g.monto,
  g.id::text
from public.gastos g
join public.gasto_reparto gr on gr.gasto_id = g.id
group by g.id, g.concepto, g.monto
having coalesce(sum(gr.monto), 0) - g.monto > 1

union all

-- 6. Documento soporte pegado a una venta que ya no le corresponde
select
  'DOCUMENTOS', 'MEDIA',
  'Documento soporte apuntando a una venta que no esta en el reparto del gasto',
  ds.numero || ' -> ' || c.numero,
  ds.subtotal,
  ds.id::text
from public.documentos_soporte ds
join public.cotizaciones c on c.id = ds.cotizacion_id
where ds.gasto_id is not null
  and not exists (
    select 1 from public.gasto_reparto gr
    where gr.gasto_id = ds.gasto_id and gr.cotizacion_id = ds.cotizacion_id
  )

union all

-- 7. Documento soporte con valor distinto al gasto que respalda
select
  'DOCUMENTOS', 'GRAVE',
  'El documento soporte declara un valor distinto al del gasto',
  ds.numero || ' - ' || ds.concepto,
  ds.subtotal - g.monto,
  ds.id::text
from public.documentos_soporte ds
join public.gastos g on g.id = ds.gasto_id
where abs(ds.subtotal - g.monto) > 1

union all

-- 8. Documento soporte con valor distinto a la factura de compra
select
  'DOCUMENTOS', 'GRAVE',
  'El documento soporte declara un valor distinto al de la factura de compra',
  ds.numero,
  ds.subtotal - fc.total,
  ds.id::text
from public.documentos_soporte ds
join public.facturas_compra fc on fc.id = ds.factura_compra_id
where abs(ds.subtotal - fc.total) > 1

union all

-- 9. Gastos cuyo IVA no da ninguna tarifa colombiana
select
  'IVA', 'MEDIA',
  'El IVA de este gasto no da 0%, 5% ni 19%: revisa la factura',
  g.concepto,
  coalesce(g.iva_incluido, 0),
  g.id::text
from public.gastos g
where g.monto > 0
  and coalesce(g.iva_incluido, 0) > 0
  and not exists (
    select 1 from (values (5.0), (19.0)) as t(tarifa)
    where abs(((g.iva_incluido / nullif(g.monto - g.iva_incluido, 0)) * 100) - t.tarifa) < 0.6
  )

union all

-- 10. Factura de compra marcada PAGADA sin salida de plata registrada
select
  'BANCO', 'GRAVE',
  'Factura de compra marcada PAGADA pero sin egreso registrado en ninguna cuenta',
  coalesce(fc.numero_factura, 'sin numero') || ' - ' || coalesce(pr.razon_social, ''),
  coalesce(fc.total_neto, fc.total),
  fc.id::text
from public.facturas_compra fc
left join public.proveedores pr on pr.id = fc.proveedor_id
where fc.estado = 'PAGADA'
  and not exists (
    select 1 from public.movimientos_tesoreria m
    where m.factura_compra_id = fc.id and m.tipo = 'EGRESO' and m.categoria <> 'GMF'
  )

union all

-- 11. Cotizacion cuyo total no cuadra con la suma de sus items
--     (solo las que no tienen descuento, donde el total debe ser exacto)
select
  'VENTAS', 'GRAVE',
  'El total de la cotizacion no cuadra con la suma de sus items',
  c.numero,
  c.subtotal - coalesce(si.suma, 0),
  c.id::text
from public.cotizaciones c
left join (
  select cotizacion_id, sum(subtotal) as suma
  from public.cotizacion_items group by cotizacion_id
) si on si.cotizacion_id = c.id
where coalesce(c.descuento_pct, 0) = 0
  and coalesce(c.descuento_valor, 0) = 0
  and abs(c.subtotal - coalesce(si.suma, 0)) > 1

union all

-- 12. Ingreso de cliente colgado: la venta ya no dice que le pagaron
--     CRITERIO ESTRECHO A PROPOSITO: solo cuando la venta volvio a un
--     estado anterior al pago Y no hay factura de venta viva. Asi no se
--     senalan las ventas a credito, que se cobran por la factura y nunca
--     escriben monto_recibido en la cotizacion.
select
  'BANCO', 'GRAVE',
  'Ingreso de cliente registrado pero la venta volvio atras: infla el saldo',
  m.concepto,
  m.monto,
  m.id::text
from public.movimientos_tesoreria m
join public.cotizaciones c on c.id = m.cotizacion_id
where m.tipo = 'INGRESO'
  and m.categoria = 'COBRO_CLIENTE'
  and c.estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA')
  and coalesce(c.monto_recibido, 0) = 0
  and not exists (
    select 1 from public.facturas_venta fv
    where fv.cotizacion_id = c.id and fv.estado <> 'ANULADA'
  );

comment on view public.auditoria_integridad is
  'Todo lo que esta descuadrado en el circuito del dinero, en un solo lugar. Si devuelve cero filas, las cuentas cuadran. Se revisa con: select * from auditoria_integridad order by gravedad, area;';



-- ############################################################
-- ##  PARTE C  --  QUE QUEDO (manda estas tablas)
-- ############################################################

-- C.1  LO QUE SIGUE MAL. Si sale vacio, todo cuadra.
select area, gravedad, problema, detalle, diferencia
from public.auditoria_integridad
order by
  case gravedad when 'GRAVE' then 1 else 2 end,
  area, abs(coalesce(diferencia, 0)) desc;


-- C.2  SALDO DE CADA CUENTA. Comparar con el extracto del banco.
select nombre, tipo, saldo_inicial, total_ingresos, total_egresos,
       saldo_actual, num_movimientos
from public.saldos_cuentas
where activa
order by orden, nombre;


-- C.3  TODAS LAS VENTAS, CON SUS NUMEROS YA RECALCULADOS.
--      La resta tiene que dar: venta - costo = utilidad.
select
  numero, cliente_nombre, estado,
  venta_subtotal, costo_compras, costo_gastos, costo_real,
  utilidad_bruta, margen_bruto_pct,
  venta_subtotal - costo_real as comprobacion_utilidad,
  case when abs((venta_subtotal - costo_real) - utilidad_bruta) < 1
       then 'OK' else 'REVISAR' end as cuadra
from public.analisis_venta
order by numero;


-- C.4  EL 4x1000 DE CADA MOVIMIENTO, UNO POR UNO.
select
  m.fecha, m.concepto, m.categoria, m.monto,
  gmf.monto                                as gmf_cobrado,
  ceil(m.monto * 0.004)                    as gmf_correcto,
  case
    when gmf.id is null and m.tipo = 'EGRESO' and m.categoria not in ('GMF','TRASLADO_ENTRADA')
      then 'FALTA EL 4x1000'
    when gmf.monto <> ceil(m.monto * 0.004) then 'DESCUADRADO'
    else 'OK'
  end                                      as estado
from public.movimientos_tesoreria m
left join public.movimientos_tesoreria gmf on gmf.gmf_de_id = m.id
where m.categoria <> 'GMF'
order by m.fecha desc, m.concepto;


-- C.5  LOS DOCUMENTOS SOPORTE: a que venta y a que gasto pertenecen.
select
  ds.numero, ds.fecha, ds.tercero_nombre, ds.subtotal,
  c.numero                                 as venta_del_campo_directo,
  (select string_agg(c2.numero, ', ' order by c2.numero)
     from public.gasto_reparto gr
     join public.cotizaciones c2 on c2.id = gr.cotizacion_id
    where gr.gasto_id = ds.gasto_id)       as ventas_del_reparto,
  fc.numero_factura                        as factura_compra
from public.documentos_soporte ds
left join public.cotizaciones c on c.id = ds.cotizacion_id
left join public.facturas_compra fc on fc.id = ds.factura_compra_id
order by ds.numero;


-- C.6  ACTIVOS FIJOS (la impresora deberia estar aqui si la recategorizaste)
select activo, fecha_compra, costo_total, estado_garantia,
       garantia_hasta, valor_en_libros, gasto_mantenimiento
from public.activos_fijos;
