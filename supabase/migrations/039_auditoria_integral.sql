-- ============================================================
-- ABASTECER EMPRESARIAL SAS - AUDITORIA INTEGRAL DEL DINERO
-- Migracion 039
-- ============================================================
-- Corre TODO este archivo de una sola vez. Es idempotente.
-- Requiere haber corrido antes la 037 y la 038.
--
-- LA FUENTE DE LA VERDAD ES LA CONCILIACION BANCARIA DEL DUENO.
-- Se comprobo linea por linea y cuadra al centavo:
--   ingresos  13.734.720,00
--   egresos    6.074.835,54
--   disponible 7.659.884,46  + caja menor 100.000 = 7.759.884,46
-- El ERP tiene que dar exactamente eso.
--
-- POR QUE CAMBIO ESTA MIGRACION RESPECTO A LA PRIMERA VERSION
-- La primera version deducia el monto real de un egreso a partir del
-- 4x1000 cobrado. Con la impresora eso habria puesto 704.750, cuando la
-- verdad es 779.070: se habria equivocado por 74.320 y habria dejado el
-- dato PEOR. La leccion: el 4x1000 guardado en el ERP tampoco es confiable
-- si se genero mal. Solo la conciliacion del banco manda.
-- Ahora el 4x1000 solo se usa para AVISAR, nunca para reescribir montos.
-- ============================================================


-- ############################################################
-- ##  PARTE A  --  CORRECCIONES
-- ############################################################

-- ------------------------------------------------------------
-- A0. LA FUNCION slugificar() ESTABA ROTA DESDE LA MIGRACION 023
-- ------------------------------------------------------------
-- Tenia un parametro de mas: trim(both '-' from <texto>, '-'), que es
-- btrim con 3 argumentos y no existe en Postgres. La funcion NUNCA se
-- pudo crear. Se descubrio ejecutando las 40 migraciones contra un
-- Postgres real.
create or replace function public.slugificar(texto text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(texto, ''),
      'ÁÀÂÄÃÅáàâäãåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÖÕóòôöõÚÙÛÜúùûüÑñÇç',
      'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCc')),
    '[^a-z0-9]+', '-', 'g'))
$$;


-- ------------------------------------------------------------
-- A1. DOCUMENTOS SOPORTE PEGADOS A LA VENTA EQUIVOCADA
-- ------------------------------------------------------------
-- EL CASO: el DS-2026-002 seguia apareciendo en la COT-2026-013 aunque el
-- gasto ya se habia repartido a otras ventas.
--
-- POR QUE: documentos_soporte.cotizacion_id se escribe cuando se CREA el
-- DS, y editarGasto nunca lo volvia a tocar. Quedaba clavado en la venta
-- original para siempre.
--
-- LA REGLA: si el DS pertenece a un GASTO, la verdad de a que ventas
-- pertenece esta en gasto_reparto. Ese campo solo sirve si el gasto va a
-- UNA sola venta; si se reparte, queda en null.
update public.documentos_soporte ds
set cotizacion_id = sub.cotizacion_unica
from (
  select
    g.id as gasto_id,
    -- min() no acepta uuid en Postgres: se compara como texto y se
    -- devuelve a uuid. Como solo entra cuando hay UNA fila, el min es
    -- esa misma fila.
    case when count(gr.id) = 1
         then min(gr.cotizacion_id::text)::uuid
         else null end as cotizacion_unica
  from public.gastos g
  left join public.gasto_reparto gr on gr.gasto_id = g.id
  group by g.id
) sub
where ds.gasto_id = sub.gasto_id
  and ds.cotizacion_id is distinct from sub.cotizacion_unica;


-- ------------------------------------------------------------
-- A2. DOCUMENTOS SOPORTE DE COMPRAS CON EL VALOR INFLADO
-- ------------------------------------------------------------
-- El codigo mandaba cantidad = numero de lineas y valor_unitario = total.
-- El trigger calcula subtotal = cantidad * valor_unitario, asi que una
-- factura de 3 lineas por 500.000 generaba un DS por 1.500.000.
-- Un documento soporte es un documento ante la DIAN: estaba declarando el
-- triple de lo que se pago.
update public.documentos_soporte ds
set cantidad = 1,
    valor_unitario = fc.total
from public.facturas_compra fc
where ds.factura_compra_id = fc.id
  and (ds.cantidad <> 1 or ds.valor_unitario <> fc.total);


-- ------------------------------------------------------------
-- A3. DOCUMENTOS SOPORTE DESACTUALIZADOS RESPECTO A SU GASTO
-- ------------------------------------------------------------
-- editarGasto cambiaba monto, fecha y concepto del gasto pero no tocaba
-- el DS. Quedaba un documento DIAN diciendo una cifra y el gasto otra.
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
-- A4. MOVIMIENTOS EXENTOS DE 4x1000
-- ------------------------------------------------------------
-- En la conciliacion del banco hay egresos que NO llevan 4x1000:
--   - los traslados al bolsillo de impuestos (cuenta propia)
--   - el pago de la camara de comercio
-- El ERP le ponia 4x1000 a TODO egreso, asi que inventaba un cobro que el
-- banco nunca hizo y el saldo nunca podia cuadrar.
alter table public.movimientos_tesoreria
  add column if not exists exento_gmf boolean not null default false;

comment on column public.movimientos_tesoreria.exento_gmf is
  'Marca los egresos a los que el banco NO les cobra 4x1000 (traslados entre cuentas propias, movimientos exentos). Si esta en true no se genera el cobro.';

-- LA DISTINCION IMPORTA, Y LA CONCILIACION LA MUESTRA CLARITA:
--
--   BOLSILLO IVA       93.359  -> traslado a cuenta propia -> SIN 4x1000
--   BOLSILLO SIMPLE    64.000  -> traslado a cuenta propia -> SIN 4x1000
--   RETIRO CAJA MENOR 100.000  -> retiro a efectivo        -> 4x1000 de 400
--
-- O sea: NO se puede exentar todo traslado. Un traslado entre cuentas
-- bancarias propias es exento; sacar la plata a efectivo si lo cobran.
-- La regla es el destino: si la plata queda en otra cuenta de banco, exento;
-- si sale a efectivo, se cobra.
update public.movimientos_tesoreria ms
set exento_gmf = true
where ms.categoria = 'TRASLADO_SALIDA'
  and ms.exento_gmf = false
  and exists (
    select 1
    from public.movimientos_tesoreria me
    join public.cuentas cd on cd.id = me.cuenta_id
    where me.categoria = 'TRASLADO_ENTRADA'
      and me.fecha = ms.fecha
      and me.monto = ms.monto
      and cd.tipo <> 'EFECTIVO'
  );


-- ------------------------------------------------------------
-- A5. LA IMPRESORA: EL VALOR REAL ES EL DE LA CONCILIACION
-- ------------------------------------------------------------
-- ALKOSTO CALI NORTE - IMPRESORA - ACTIVO FIJO = 779.070, con 4x1000 de
-- 3.116,28 (que es exactamente 779.070 x 0,004).
--
-- El ERP tenia 654.881, que es casi la BASE sin IVA (654.680,67): se
-- digito el subtotal de la factura en el campo del total, y ademas con un
-- 8 donde iba un 6.
--
-- Faltaban 124.189 por descontar de la cuenta.
update public.gastos
set monto = 779070,
    iva_incluido = 124389.33,   -- 19% sobre la base de 654.680,67
    categoria = 'ACTIVO_FIJO',
    activo_nombre = coalesce(nullif(activo_nombre, ''), concepto),
    activo_estado = coalesce(activo_estado, 'EN_USO'),
    activo_garantia_meses = coalesce(activo_garantia_meses, 24)
where concepto ilike '%impres%'
  and monto <> 779070;

update public.movimientos_tesoreria m
set monto = g.monto
from public.gastos g
where m.gasto_id = g.id
  and g.concepto ilike '%impres%'
  and m.categoria <> 'GMF'
  and m.monto <> g.monto;


-- ------------------------------------------------------------
-- A6. EL 4x1000 SE COBRA CON CENTAVOS, NO REDONDEADO AL PESO
-- ------------------------------------------------------------
-- El ERP usaba ceil(): redondeaba hacia arriba al peso. El banco cobra el
-- valor exacto con centavos. Comparado contra la conciliacion:
--
--   ARITEX 23.800     -> banco 95,20    el ERP ponia 96
--   ALKOSTO 779.070   -> banco 3.116,28 el ERP ponia 3.117
--   PROCOLDEXT        -> banco 6.016,06 el ERP ponia 6.017
--
-- Son centavos, pero mientras exista esa diferencia el saldo del ERP
-- JAMAS va a dar igual al extracto, y entonces no sirve para conciliar.
create or replace function public.generar_gmf()
returns trigger
language plpgsql
as $$
declare
  tasa numeric;
  monto_gmf numeric;
  cuenta_cobra_gmf boolean;
begin
  if new.tipo <> 'EGRESO' then return new; end if;
  if new.categoria = 'GMF' then return new; end if;
  if new.categoria = 'TRASLADO_ENTRADA' then return new; end if;
  if coalesce(new.exento_gmf, false) then return new; end if;

  select coalesce(c.cobra_gmf, true) into cuenta_cobra_gmf
  from public.cuentas c where c.id = new.cuenta_id;
  if not cuenta_cobra_gmf then return new; end if;

  select coalesce(
    (select valor / 100 from public.config_tributaria where clave = 'GMF_TASA'),
    0.004) into tasa;
  if tasa <= 0 then return new; end if;

  -- round a 2 decimales, NO ceil: asi coincide con lo que cobra el banco
  monto_gmf := round(new.monto * tasa, 2);
  if monto_gmf <= 0 then return new; end if;

  insert into public.movimientos_tesoreria (
    cuenta_id, fecha, tipo, categoria, monto, concepto,
    factura_compra_id, cotizacion_id, gasto_id, movimiento_socio_id,
    medio_pago, creado_por_id, creado_por_nombre, gmf_de_id
  ) values (
    new.cuenta_id, new.fecha, 'EGRESO', 'GMF', monto_gmf,
    'GMF (4x1000) ' || left(new.concepto, 80),
    new.factura_compra_id, new.cotizacion_id, new.gasto_id,
    new.movimiento_socio_id, 'Cobro bancario',
    new.creado_por_id, new.creado_por_nombre, new.id
  );
  return new;
end;
$$;

comment on function public.generar_gmf is
  'Cada egreso genera su cobro de 4x1000, con centavos (round a 2 decimales, no ceil) para que el saldo cuadre con el extracto. Respeta exento_gmf y cuentas.cobra_gmf.';

-- El de la 038 (cuando cambia el monto) con la misma precision y la misma
-- regla de exencion.
create or replace function public.resincronizar_gmf()
returns trigger
language plpgsql
as $$
declare
  tasa numeric;
  monto_gmf numeric;
  cuenta_cobra_gmf boolean;
begin
  if new.monto = old.monto
     and new.cuenta_id = old.cuenta_id
     and coalesce(new.exento_gmf, false) = coalesce(old.exento_gmf, false) then
    return new;
  end if;

  if new.categoria = 'GMF' then return new; end if;

  select coalesce(c.cobra_gmf, true) into cuenta_cobra_gmf
  from public.cuentas c where c.id = new.cuenta_id;

  if new.tipo <> 'EGRESO'
     or new.categoria = 'TRASLADO_ENTRADA'
     or coalesce(new.exento_gmf, false)
     or not cuenta_cobra_gmf then
    delete from public.movimientos_tesoreria where gmf_de_id = new.id;
    return new;
  end if;

  select coalesce(
    (select valor / 100 from public.config_tributaria where clave = 'GMF_TASA'),
    0.004) into tasa;

  monto_gmf := round(new.monto * tasa, 2);

  if monto_gmf <= 0 then
    delete from public.movimientos_tesoreria where gmf_de_id = new.id;
    return new;
  end if;

  if exists (select 1 from public.movimientos_tesoreria where gmf_de_id = new.id) then
    update public.movimientos_tesoreria
    set monto = monto_gmf, cuenta_id = new.cuenta_id, fecha = new.fecha,
        concepto = 'GMF (4x1000) ' || left(new.concepto, 80)
    where gmf_de_id = new.id;
  else
    insert into public.movimientos_tesoreria (
      cuenta_id, fecha, tipo, categoria, monto, concepto,
      factura_compra_id, cotizacion_id, gasto_id, movimiento_socio_id,
      medio_pago, creado_por_id, creado_por_nombre, gmf_de_id
    ) values (
      new.cuenta_id, new.fecha, 'EGRESO', 'GMF', monto_gmf,
      'GMF (4x1000) ' || left(new.concepto, 80),
      new.factura_compra_id, new.cotizacion_id, new.gasto_id,
      new.movimiento_socio_id, 'Cobro bancario',
      new.creado_por_id, new.creado_por_nombre, new.id
    );
  end if;
  return new;
end;
$$;


-- ------------------------------------------------------------
-- A6b. EL TRASLADO DEBE DECIDIR SI LLEVA 4x1000
-- ------------------------------------------------------------
-- La funcion trasladar_entre_cuentas tenia este comentario:
--   "los traslados no generan GMF (ver generar_gmf)"
-- y era FALSO: generar_gmf solo se saltaba TRASLADO_ENTRADA, asi que el
-- lado de SALIDA si generaba el cobro. Por eso el ERP le ponia 4x1000 a
-- los traslados al bolsillo de impuestos, que el banco nunca cobro.
--
-- Ahora la funcion decide segun el DESTINO, que es lo que determina el
-- cobro de verdad:
--   destino cuenta bancaria propia -> exento
--   destino efectivo (retiro)      -> lo cobra el banco
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
  v_tipo_destino   text;
  v_exento         boolean;
  v_id_salida      uuid;
  v_id_entrada     uuid;
begin
  if p_cuenta_origen = p_cuenta_destino then
    return json_build_object('ok', false, 'mensaje', 'La cuenta de origen y la de destino son la misma.');
  end if;

  if p_monto is null or p_monto <= 0 then
    return json_build_object('ok', false, 'mensaje', 'El monto debe ser mayor a cero.');
  end if;

  perform 1 from public.cuentas
   where id in (p_cuenta_origen, p_cuenta_destino) for update;

  select sc.saldo_actual, sc.nombre
    into v_saldo_origen, v_nombre_origen
    from public.saldos_cuentas sc where sc.id = p_cuenta_origen;

  if v_nombre_origen is null then
    return json_build_object('ok', false, 'mensaje', 'La cuenta de origen no existe.');
  end if;

  select c.nombre, c.tipo into v_nombre_destino, v_tipo_destino
    from public.cuentas c where c.id = p_cuenta_destino;

  if v_nombre_destino is null then
    return json_build_object('ok', false, 'mensaje', 'La cuenta de destino no existe.');
  end if;

  -- Sacar la plata a efectivo si causa 4x1000; moverla a otra cuenta
  -- bancaria propia no.
  v_exento := (v_tipo_destino <> 'EFECTIVO');

  if v_saldo_origen < p_monto then
    return json_build_object(
      'ok', false,
      'mensaje', v_nombre_origen || ' solo tiene ' || to_char(v_saldo_origen, 'FM999,999,999') ||
                 ' y quieres trasladar ' || to_char(p_monto, 'FM999,999,999') || '.'
    );
  end if;

  insert into public.movimientos_tesoreria (
    cuenta_id, fecha, tipo, categoria, monto, concepto,
    medio_pago, creado_por_id, creado_por_nombre, exento_gmf
  ) values (
    p_cuenta_origen, p_fecha, 'EGRESO', 'TRASLADO_SALIDA', p_monto,
    p_concepto || ' (sale de ' || v_nombre_origen || ')',
    'Transferencia', p_usuario_id, p_usuario_nombre, v_exento
  ) returning id into v_id_salida;

  insert into public.movimientos_tesoreria (
    cuenta_id, fecha, tipo, categoria, monto, concepto,
    medio_pago, movimiento_relacionado_id, creado_por_id, creado_por_nombre
  ) values (
    p_cuenta_destino, p_fecha, 'INGRESO', 'TRASLADO_ENTRADA', p_monto,
    p_concepto || ' (entra a ' || v_nombre_destino || ')',
    'Transferencia', v_id_salida, p_usuario_id, p_usuario_nombre
  ) returning id into v_id_entrada;

  update public.movimientos_tesoreria
     set movimiento_relacionado_id = v_id_entrada
   where id = v_id_salida;

  return json_build_object(
    'ok', true,
    'mensaje', to_char(p_monto, 'FM999,999,999') || ' trasladados de ' ||
               v_nombre_origen || ' a ' || v_nombre_destino ||
               case when v_exento then ' (sin 4x1000, es cuenta propia).'
                    else ' (con 4x1000, sale a efectivo).' end,
    'id_salida', v_id_salida,
    'id_entrada', v_id_entrada
  );
end;
$$;

comment on function public.trasladar_entre_cuentas is
  'Traslada plata entre dos cuentas en UNA transaccion. Marca exento_gmf segun el destino: a cuenta bancaria propia no causa 4x1000, a efectivo si. Antes generaba 4x1000 en todo traslado y el saldo nunca cuadraba con el extracto.';


-- ------------------------------------------------------------
-- A7. RECALCULAR EL 4x1000 DE TODOS LOS MOVIMIENTOS
-- ------------------------------------------------------------
-- A7.1 Borrar el que no deberia existir.
-- OJO: no se excluye TRASLADO_SALIDA en bloque, porque el retiro a efectivo
-- SI lleva 4x1000 (400 en la conciliacion). Manda exento_gmf, que ya quedo
-- puesto en A4 segun el destino del traslado.
delete from public.movimientos_tesoreria gmf
using public.movimientos_tesoreria padre
left join public.cuentas cu on cu.id = padre.cuenta_id
where gmf.gmf_de_id = padre.id
  and (
    padre.tipo <> 'EGRESO'
    or padre.categoria in ('GMF', 'TRASLADO_ENTRADA')
    or coalesce(padre.exento_gmf, false)
    or coalesce(cu.cobra_gmf, true) = false
  );

-- A7.2 Corregir el valor de los que si van
with tasa as (
  select coalesce(
    (select valor / 100 from public.config_tributaria where clave = 'GMF_TASA'),
    0.004) as t
)
update public.movimientos_tesoreria gmf
set monto = round(padre.monto * t.t, 2),
    cuenta_id = padre.cuenta_id,
    fecha = padre.fecha
from public.movimientos_tesoreria padre, tasa t
where gmf.gmf_de_id = padre.id
  and gmf.categoria = 'GMF'
  and gmf.monto <> round(padre.monto * t.t, 2);

-- A7.3 Crear el que falta
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
  round(m.monto * t.t, 2),
  'GMF (4x1000) ' || left(m.concepto, 80),
  m.factura_compra_id, m.cotizacion_id, m.gasto_id, m.movimiento_socio_id,
  'Cobro bancario', m.creado_por_id, m.creado_por_nombre, m.id
from public.movimientos_tesoreria m
cross join tasa t
join public.cuentas cu on cu.id = m.cuenta_id
where m.tipo = 'EGRESO'
  and m.categoria not in ('GMF', 'TRASLADO_ENTRADA')
  and coalesce(m.exento_gmf, false) = false
  and coalesce(cu.cobra_gmf, true) = true
  and round(m.monto * t.t, 2) > 0
  and not exists (
    select 1 from public.movimientos_tesoreria g where g.gmf_de_id = m.id
  );


-- ------------------------------------------------------------
-- A8. FORZAR EL RECALCULO DE LOS CAMPOS DERIVADOS
-- ------------------------------------------------------------
update public.facturas_compra set updated_at = now();
update public.asignacion_costos set notas = notas;
update public.documentos_soporte set updated_at = now();


-- ------------------------------------------------------------
-- A9. COSTO Y UTILIDAD DE CADA ITEM VENDIDO
-- ------------------------------------------------------------
with costo_por_producto as (
  select
    ac.cotizacion_id, ac.producto_id,
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
  and ci.costo_unitario is distinct from round(cp.subtotal / nullif(cp.cantidad, 0), 2);

-- Los items sin ninguna compra asignada deben quedar en cero, no con un
-- costo viejo que ya no corresponde.
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
-- A10. COSTO, UTILIDAD Y MARGEN DE CADA COTIZACION
-- ------------------------------------------------------------
-- costo_total = productos + gastos repartidos. El IVA del gasto se
-- prorratea: si el flete de 45.000 traia IVA y a esta venta le toca un
-- tercio, le corresponde un tercio del IVA. Sin prorratear, el mismo IVA
-- se descontaria tres veces.
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
-- ##  PARTE B  --  LA CONCILIACION Y LA AUDITORIA PERMANENTES
-- ############################################################

-- ------------------------------------------------------------
-- B1. CONCILIACION BANCARIA: los mismos totales de la hoja
-- ------------------------------------------------------------
create or replace view public.conciliacion_bancaria as
select
  c.nombre                                as cuenta,
  c.es_reserva,
  c.saldo_inicial,
  coalesce(sum(case when m.tipo = 'INGRESO' then m.monto end), 0) as ingresos,
  coalesce(sum(case when m.tipo = 'EGRESO'  then m.monto end), 0) as egresos,
  coalesce(sum(case when m.categoria = 'GMF' then m.monto end), 0) as del_cual_4x1000,
  c.saldo_inicial
    + coalesce(sum(case when m.tipo = 'INGRESO' then m.monto end), 0)
    - coalesce(sum(case when m.tipo = 'EGRESO'  then m.monto end), 0) as disponible,
  count(m.id)                             as num_movimientos
from public.cuentas c
left join public.movimientos_tesoreria m on m.cuenta_id = c.id
where c.activa
group by c.id, c.nombre, c.es_reserva, c.saldo_inicial, c.orden
order by c.orden, c.nombre;

comment on view public.conciliacion_bancaria is
  'Ingresos, egresos y disponible por cuenta, para comparar directo contra la conciliacion bancaria hecha a mano. Tiene que dar identico al extracto.';


-- ------------------------------------------------------------
-- B2. AUDITORIA: todo lo descuadrado en un solo lugar
-- ------------------------------------------------------------
create or replace view public.auditoria_integridad as
with tasa as (
  select coalesce(
    (select valor / 100 from public.config_tributaria where clave = 'GMF_TASA'),
    0.004) as t
)

-- 1. El 4x1000 no corresponde al monto del egreso
select
  'BANCO'                                       as area,
  'GRAVE'                                       as gravedad,
  'El 4x1000 no corresponde al monto del egreso' as problema,
  m.concepto                                    as detalle,
  g.monto - round(m.monto * t.t, 2)             as diferencia,
  m.id::text                                    as referencia
from public.movimientos_tesoreria m
cross join tasa t
join public.movimientos_tesoreria g on g.gmf_de_id = m.id
where g.monto <> round(m.monto * t.t, 2)

union all

-- 2. Egreso sin su 4x1000 (el banco lo cobro y no esta registrado)
select
  'BANCO', 'GRAVE',
  'Egreso sin su 4x1000 registrado',
  m.concepto,
  round(m.monto * t.t, 2),
  m.id::text
from public.movimientos_tesoreria m
cross join tasa t
join public.cuentas cu on cu.id = m.cuenta_id
where m.tipo = 'EGRESO'
  and m.categoria not in ('GMF', 'TRASLADO_ENTRADA')
  and coalesce(m.exento_gmf, false) = false
  and coalesce(cu.cobra_gmf, true)
  and round(m.monto * t.t, 2) > 0
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

-- 4. Gasto de venta con plata sin repartir (infla la utilidad)
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

-- 9. Gasto cuyo IVA no da ninguna tarifa colombiana
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
    select 1 from (values (5.0), (19.0)) as t2(tarifa)
    where abs(((g.iva_incluido / nullif(g.monto - g.iva_incluido, 0)) * 100) - t2.tarifa) < 0.6
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

-- 12. Ingreso de cliente colgado: la venta volvio atras
--     Criterio estrecho a proposito, para no senalar las ventas a credito
--     que se cobran por la factura y nunca escriben monto_recibido.
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
  'Todo lo descuadrado en el circuito del dinero, en un solo lugar. Si devuelve cero filas, las cuentas cuadran.';



-- ############################################################
-- ##  PARTE C  --  QUE QUEDO (manda estas tablas)
-- ############################################################

-- C.1  CONCILIACION: comparar contra la hoja
--      Bancaria deberia dar 7.659.884,46 y caja menor 100.000,00
select cuenta, es_reserva, saldo_inicial, ingresos, egresos,
       del_cual_4x1000, disponible, num_movimientos
from public.conciliacion_bancaria;

-- C.1b TOTAL DISPONIBLE (sin contar la reserva, que no es plata libre)
select
  sum(case when not es_reserva then disponible else 0 end) as disponible_total,
  sum(case when es_reserva then disponible else 0 end)     as apartado_para_dian,
  sum(ingresos)                                            as ingresos_totales,
  sum(egresos)                                             as egresos_totales
from public.conciliacion_bancaria;

-- C.2  LO QUE SIGUE MAL. Si sale vacio, todo cuadra.
select area, gravedad, problema, detalle, diferencia
from public.auditoria_integridad
order by case gravedad when 'GRAVE' then 1 else 2 end,
         area, abs(coalesce(diferencia, 0)) desc;

-- C.3  EL 4x1000 DE CADA MOVIMIENTO, UNO POR UNO
select
  m.fecha, m.concepto, m.categoria, m.monto,
  m.exento_gmf,
  gmf.monto                        as gmf_registrado,
  round(m.monto * 0.004, 2)        as gmf_que_corresponde,
  case
    when m.exento_gmf then 'EXENTO, no lleva'
    when gmf.id is null and m.tipo = 'EGRESO'
         and m.categoria not in ('GMF','TRASLADO_ENTRADA')
      then 'FALTA'
    when gmf.id is null then 'no aplica'
    when gmf.monto <> round(m.monto * 0.004, 2) then 'DESCUADRADO'
    else 'OK'
  end                              as estado
from public.movimientos_tesoreria m
left join public.movimientos_tesoreria gmf on gmf.gmf_de_id = m.id
where m.categoria <> 'GMF'
order by m.fecha, m.concepto;

-- C.4  TODAS LAS VENTAS: la resta tiene que dar
select
  numero, cliente_nombre, estado,
  venta_subtotal, costo_compras, costo_gastos, costo_real,
  utilidad_bruta, margen_bruto_pct,
  venta_subtotal - costo_real as comprobacion,
  case when abs((venta_subtotal - costo_real) - utilidad_bruta) < 1
       then 'OK' else 'REVISAR' end as cuadra
from public.analisis_venta
order by numero;

-- C.5  LOS DOCUMENTOS SOPORTE: a que venta pertenecen de verdad
select
  ds.numero, ds.fecha, ds.tercero_nombre, ds.subtotal,
  c.numero as venta_directa,
  (select string_agg(c2.numero, ', ' order by c2.numero)
     from public.gasto_reparto gr
     join public.cotizaciones c2 on c2.id = gr.cotizacion_id
    where gr.gasto_id = ds.gasto_id) as ventas_del_reparto,
  fc.numero_factura as factura_compra
from public.documentos_soporte ds
left join public.cotizaciones c on c.id = ds.cotizacion_id
left join public.facturas_compra fc on fc.id = ds.factura_compra_id
order by ds.numero;

-- C.6  ACTIVOS FIJOS (la impresora debe salir en 779.070)
select activo, fecha_compra, costo_total, iva, costo_sin_iva,
       estado_garantia, garantia_hasta, valor_en_libros
from public.activos_fijos;
