-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Listado de precios e inteligencia de mercado
-- Migracion 034
-- ============================================================
-- OBJETIVO
-- Saber, producto por producto:
--   1. A cuanto lo vendo yo
--   2. Por debajo de cuanto tengo que conseguirlo para ganar mi margen
--   3. Quien me lo deja mas barato, y quien es la 2a y 3a opcion si el
--      primero no tiene existencias
--   4. A cuanto lo vende el mercado, para saber si soy competitivo
--
-- EL CAMBIO CLAVE: separar dos precios que hacen fuerzas contrarias
--   COSTO   = lo que a MI me cobran      -> es mi PISO, define el margen
--   MERCADO = lo que le cobran al CLIENTE -> es mi TECHO, define si compito
--
-- El dueno los va a conseguir preguntando desde dos numeros distintos:
-- de uno pide precio como cliente normal (MERCADO) y del otro pide
-- precio de distribuidor (COSTO).
--
-- Cierra la pestana del ERP antes de correrla.
-- ============================================================


-- ------------------------------------------------------------
-- PASO 1: distinguir el tipo de precio
-- ------------------------------------------------------------
alter table public.precios_proveedor
  add column if not exists tipo text not null default 'COSTO'
    check (tipo in ('COSTO', 'MERCADO'));

comment on column public.precios_proveedor.tipo is
  'COSTO: precio que a nosotros nos cobran (define el piso y el margen). MERCADO: precio al que ese tercero le vende al cliente final (define el techo y si somos competitivos). Un mismo tercero puede tener los dos.';

create index if not exists idx_pp_tipo on public.precios_proveedor(producto_id, tipo);

-- Todo lo que ya estaba cargado era precio de proveedor para nosotros
update public.precios_proveedor set tipo = 'COSTO' where tipo is null;


-- ------------------------------------------------------------
-- PASO 2: la vista del listado de precios
-- ------------------------------------------------------------
drop view if exists public.listado_precios;

create view public.listado_precios as
with
-- Precios de COSTO normalizados SIN IVA y ordenados: primero los que
-- estan disponibles, y dentro de esos el mas barato.
--
-- OJO CON EL IVA: algunos proveedores cotizan con IVA incluido y otros
-- sin IVA. Compararlos crudos daria un ganador equivocado (un precio con
-- IVA se ve 19% mas caro de lo que es). Aqui se bajan todos a la misma
-- base antes de rankear.
costos as (
  select
    pp.producto_id,
    pp.proveedor_id,
    case when pp.iva_incluido
         then round(pp.precio / (1 + coalesce(pr.iva_porcentaje, 19) / 100), 2)
         else pp.precio end                          as precio_neto,
    pp.precio                                        as precio_como_lo_cotizo,
    pp.iva_incluido,
    pp.disponible,
    pp.tiempo_entrega,
    pp.fecha_cotizacion,
    pp.vigente_hasta,
    pp.referencia_proveedor,
    row_number() over (
      partition by pp.producto_id
      order by pp.disponible desc,
               case when pp.iva_incluido
                    then pp.precio / (1 + coalesce(pr.iva_porcentaje, 19) / 100)
                    else pp.precio end asc,
               pp.fecha_cotizacion desc
    ) as puesto
  from public.precios_proveedor pp
  join public.productos pr on pr.id = pp.producto_id
  where pp.tipo = 'COSTO'
),
-- Precios de MERCADO (competencia), tambien normalizados sin IVA
mercado as (
  select
    pp.producto_id,
    min(case when pp.iva_incluido
             then round(pp.precio / (1 + coalesce(pr.iva_porcentaje, 19) / 100), 2)
             else pp.precio end)                     as mercado_min,
    round(avg(case when pp.iva_incluido
             then pp.precio / (1 + coalesce(pr.iva_porcentaje, 19) / 100)
             else pp.precio end), 2)                 as mercado_promedio,
    max(case when pp.iva_incluido
             then round(pp.precio / (1 + coalesce(pr.iva_porcentaje, 19) / 100), 2)
             else pp.precio end)                     as mercado_max,
    count(*)                                         as num_precios_mercado
  from public.precios_proveedor pp
  join public.productos pr on pr.id = pp.producto_id
  where pp.tipo = 'MERCADO'
  group by pp.producto_id
),
base as (
  select
    p.id                                             as producto_id,
    p.codigo,
    p.nombre,
    p.unidad_medida,
    p.activo,
    p.iva_porcentaje,
    p.margen_minimo_pct,
    p.stock_actual,
    p.costo_promedio,
    p.precio_lista,
    p.precio_sugerido,
    cat.nombre                                       as categoria,

    -- MI PRECIO DE VENTA: el de lista si lo pusieron a mano, si no el
    -- calculado desde el costo
    coalesce(nullif(p.precio_lista, 0), p.precio_sugerido, 0) as mi_precio_venta,

    -- 1a opcion
    c1.precio_neto      as op1_precio,
    c1.iva_incluido     as op1_iva_incluido,
    c1.disponible       as op1_disponible,
    c1.tiempo_entrega   as op1_entrega,
    c1.fecha_cotizacion as op1_fecha,
    c1.vigente_hasta    as op1_vigente_hasta,
    pv1.razon_social    as op1_proveedor,
    pv1.id              as op1_proveedor_id,

    -- 2a opcion
    c2.precio_neto      as op2_precio,
    c2.disponible       as op2_disponible,
    c2.tiempo_entrega   as op2_entrega,
    pv2.razon_social    as op2_proveedor,

    -- 3a opcion
    c3.precio_neto      as op3_precio,
    c3.disponible       as op3_disponible,
    c3.tiempo_entrega   as op3_entrega,
    pv3.razon_social    as op3_proveedor,

    -- cuantos proveedores tienen precio de costo
    (select count(*) from costos cc where cc.producto_id = p.id) as num_proveedores,

    m.mercado_min,
    m.mercado_promedio,
    m.mercado_max,
    coalesce(m.num_precios_mercado, 0)               as num_precios_mercado

  from public.productos p
  left join public.categorias_producto cat on cat.id = p.categoria_id
  left join costos c1 on c1.producto_id = p.id and c1.puesto = 1
  left join costos c2 on c2.producto_id = p.id and c2.puesto = 2
  left join costos c3 on c3.producto_id = p.id and c3.puesto = 3
  left join public.proveedores pv1 on pv1.id = c1.proveedor_id
  left join public.proveedores pv2 on pv2.id = c2.proveedor_id
  left join public.proveedores pv3 on pv3.id = c3.proveedor_id
  left join mercado m on m.producto_id = p.id
)
select
  b.*,

  -- ---------- EL NUMERO CLAVE ----------
  -- Por debajo de esto hay que conseguirlo para ganar el margen minimo.
  -- Formula de MARGEN (no de markup): precio x (1 - margen/100).
  round(b.mi_precio_venta * (1 - b.margen_minimo_pct / 100), 2) as costo_objetivo,

  -- Margen real que dejaria comprarle al mejor proveedor
  case when b.mi_precio_venta > 0 and b.op1_precio is not null
       then round(((b.mi_precio_venta - b.op1_precio) / b.mi_precio_venta) * 100, 1)
       else null end                                 as margen_mejor_opcion,

  -- Cuanto ganaria por unidad con la mejor opcion
  case when b.op1_precio is not null
       then round(b.mi_precio_venta - b.op1_precio, 2)
       else null end                                 as utilidad_por_unidad,

  -- Cuanto me sobra o me falta frente al costo objetivo
  case when b.op1_precio is not null
       then round(round(b.mi_precio_venta * (1 - b.margen_minimo_pct / 100), 2) - b.op1_precio, 2)
       else null end                                 as margen_de_maniobra,

  -- Que tan lejos estoy del mercado (negativo = mas barato que el mercado)
  case when b.mercado_promedio > 0 and b.mi_precio_venta > 0
       then round(((b.mi_precio_venta - b.mercado_promedio) / b.mercado_promedio) * 100, 1)
       else null end                                 as vs_mercado_pct,

  -- Precio al que podria vender manteniendo el margen si compro al mejor
  case when b.op1_precio is not null and b.margen_minimo_pct < 100
       then round(b.op1_precio / (1 - b.margen_minimo_pct / 100), 2)
       else null end                                 as precio_minimo_con_margen,

  -- ---------- SEMAFORO ----------
  case
    when b.mi_precio_venta <= 0                      then 'SIN_PRECIO_VENTA'
    when b.op1_precio is null                        then 'SIN_COTIZAR'
    when b.op1_precio >= b.mi_precio_venta           then 'PIERDE'
    when b.op1_precio <= round(b.mi_precio_venta * (1 - b.margen_minimo_pct / 100), 2)
                                                     then 'BIEN'
    when ((b.mi_precio_venta - b.op1_precio) / b.mi_precio_venta) * 100 >= 10
                                                     then 'JUSTO'
    else 'APRETADO'
  end                                                as semaforo,

  -- Aviso aparte: puede estar en verde y aun asi estar fuera de mercado
  (b.num_precios_mercado > 0 and b.mercado_max > 0 and b.mi_precio_venta > b.mercado_max)
                                                     as sobre_el_mercado,

  -- El precio mas viejo de los que se estan usando, para saber si hay que
  -- volver a pedir cotizacion
  case when b.op1_fecha is not null
       then (current_date - b.op1_fecha)
       else null end                                 as dias_del_precio,

  (b.op1_vigente_hasta is not null and b.op1_vigente_hasta < current_date)
                                                     as precio_vencido

from base b;

comment on view public.listado_precios is
  'Listado de precios con inteligencia de mercado. costo_objetivo es por debajo de cuanto hay que conseguir el producto para ganar el margen minimo. Los precios de proveedor se normalizan SIN IVA antes de compararse, porque unos cotizan con IVA y otros sin IVA y compararlos crudos elige al proveedor equivocado.';


-- ============================================================
-- COMPROBACION
-- ============================================================
-- 1. Que la vista responda y el semaforo reparta bien
select
  semaforo,
  count(*) as productos,
  round(avg(margen_mejor_opcion), 1) as margen_promedio
from public.listado_precios
group by semaforo
order by 2 desc;

-- 2. Revisar que la matematica del costo objetivo cuadre.
--    Si esto devuelve filas, el calculo esta mal.
select codigo, nombre, mi_precio_venta, margen_minimo_pct, costo_objetivo,
       round(mi_precio_venta * (1 - margen_minimo_pct/100), 2) as deberia_ser
from public.listado_precios
where mi_precio_venta > 0
  and abs(costo_objetivo - round(mi_precio_venta * (1 - margen_minimo_pct/100), 2)) > 0.01;

-- 3. Los que necesitan atencion ya mismo
select codigo, nombre, semaforo, mi_precio_venta, costo_objetivo,
       op1_proveedor, op1_precio, margen_mejor_opcion, num_proveedores
from public.listado_precios
where activo
  and semaforo in ('PIERDE', 'APRETADO', 'SIN_COTIZAR', 'SIN_PRECIO_VENTA')
order by
  case semaforo when 'PIERDE' then 1 when 'APRETADO' then 2
                when 'SIN_PRECIO_VENTA' then 3 else 4 end,
  nombre;
