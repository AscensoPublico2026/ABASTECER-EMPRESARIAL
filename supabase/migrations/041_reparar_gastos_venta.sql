-- ============================================================
-- 041 · REPARAR LOS GASTOS QUE NUNCA LLEGARON A SU VENTA
-- ============================================================
--
-- *** NO HACE FALTA CORRER ESTO A MANO ***
-- La reparacion ya se hace desde la plataforma: al entrar a /gastos
-- aparece un aviso con el boton "Reparar ahora" que hace exactamente lo
-- mismo (ver repararGastosSinVenta en src/app/(dashboard)/gastos/actions.ts).
-- Este archivo se conserva porque deja dos vistas de auditoria utiles y
-- porque documenta el arreglo. Es idempotente: correrlo no daña nada.
--
-- QUE PASO
-- --------
-- Al registrar un gasto y asignarle una venta, el formulario mandaba la
-- bandera es_costo_venta = 'true'. Antes de leerla, uppercaseFormData la
-- convertia en 'TRUE', y la comparacion `=== 'true'` daba false.
--
-- Consecuencia en cadena:
--   1. El gasto se guardaba con es_costo_venta = false (operativo).
--   2. NUNCA se creaban las filas en gasto_reparto, que es de donde el
--      informe de la venta lee los gastos.
--   3. La pantalla decia "guardado" en verde. Nada avisaba del problema.
--   4. El informe de la cotizacion mostraba costo_gastos = 0, y por lo
--      tanto la UTILIDAD y el MARGEN de la venta salian INFLADOS.
--   5. Peor: al editar el gasto para "volver a asignar la venta", la
--      accion borraba el reparto y no lo volvia a crear, y ademas ponia
--      gastos.cotizacion_id = null. Cada intento de arreglarlo a mano
--      destruia mas informacion.
--
-- Lo que SI se salvo: al crear el gasto se escribia gastos.cotizacion_id
-- (columna vieja). De ahi se puede reconstruir el vinculo, siempre que
-- el gasto no se haya editado despues.
--
-- QUE HACE ESTA MIGRACION
-- -----------------------
--   PASO 1: reconstruye gasto_reparto desde gastos.cotizacion_id.
--   PASO 2: marca esos gastos como es_costo_venta = true.
--   PASO 3: recalcula costo_total, utilidad_estimada y margen_pct de las
--           cotizaciones afectadas, tomando los numeros de la vista
--           analisis_venta para que la lista de ventas y el informe
--           digan exactamente lo mismo.
--   PASO 4: deja un reporte de lo que reparo y de lo que NO se pudo
--           recuperar, para reasignarlo a mano.
--
-- Es idempotente: se puede correr varias veces sin duplicar nada.
-- ============================================================

-- ------------------------------------------------------------
-- PASO 1 · Reconstruir el reparto desde la columna vieja
-- ------------------------------------------------------------
-- Solo gastos que: tienen cotizacion_id, NO tienen reparto todavia, y
-- no son activos fijos (esos no son costo de venta).
insert into public.gasto_reparto (gasto_id, cotizacion_id, monto)
select g.id, g.cotizacion_id, g.monto
from public.gastos g
where g.cotizacion_id is not null
  and g.categoria <> 'ACTIVO_FIJO'
  and not exists (
    select 1 from public.gasto_reparto gr where gr.gasto_id = g.id
  )
on conflict (gasto_id, cotizacion_id) do nothing;

-- ------------------------------------------------------------
-- PASO 2 · Marcarlos como costo de venta
-- ------------------------------------------------------------
-- La vista analisis_venta exige es_costo_venta = true para contar el
-- gasto. Sin esto, el reparto del paso 1 seguiria siendo invisible.
update public.gastos g
set es_costo_venta = true
where exists (
        select 1 from public.gasto_reparto gr where gr.gasto_id = g.id
      )
  and coalesce(g.es_costo_venta, false) = false;

-- ------------------------------------------------------------
-- PASO 3 · Recalcular utilidad y margen de las ventas afectadas
-- ------------------------------------------------------------
-- Se toman los valores de analisis_venta (la misma fuente que usa el
-- informe) para que el listado de ventas y el informe no puedan
-- contradecirse.
update public.cotizaciones c
set costo_total       = round(av.costo_real),
    utilidad_estimada = round(av.utilidad_bruta),
    margen_pct        = av.margen_bruto_pct
from public.analisis_venta av
where av.cotizacion_id = c.id
  and c.id in (select distinct cotizacion_id from public.gasto_reparto)
  and (
        c.costo_total       is distinct from round(av.costo_real)
     or c.utilidad_estimada is distinct from round(av.utilidad_bruta)
     or c.margen_pct        is distinct from av.margen_bruto_pct
  );

-- ------------------------------------------------------------
-- PASO 4 · Reporte permanente de control
-- ------------------------------------------------------------
-- Gastos que quedaron marcados como costo de venta pero SIN reparto:
-- son los que perdieron el vinculo (se editaron mientras el bug estaba
-- activo) y hay que reasignarlos a mano en /gastos.
create or replace view public.gastos_sin_venta_asignada as
select
  g.id            as gasto_id,
  g.fecha,
  g.concepto,
  g.categoria,
  g.monto,
  case
    when g.es_costo_venta and g.cotizacion_id is null
      then 'MARCADO COMO COSTO DE VENTA PERO SIN VENTA: reasignar en /gastos'
    when g.cotizacion_id is not null
      then 'TIENE VENTA VIEJA PERO NO REPARTO: volver a correr esta migracion'
    else 'REVISAR'
  end             as que_hacer
from public.gastos g
where g.categoria <> 'ACTIVO_FIJO'
  and not exists (select 1 from public.gasto_reparto gr where gr.gasto_id = g.id)
  and (g.es_costo_venta = true or g.cotizacion_id is not null)
order by g.fecha desc;

comment on view public.gastos_sin_venta_asignada is
  'Gastos que deberian estar imputados a una venta pero no tienen reparto. Si sale alguna fila, ese costo NO esta entrando a ninguna venta y la utilidad de esa venta esta inflada.';

-- ------------------------------------------------------------
-- VERIFICACION · que quedo reparado
-- ------------------------------------------------------------
create or replace view public.reporte_gastos_por_venta as
select
  c.numero                          as venta,
  c.estado,
  count(gr.id)                      as num_gastos,
  coalesce(sum(gr.monto), 0)        as total_gastos_imputados,
  c.costo_total,
  c.utilidad_estimada,
  c.margen_pct
from public.cotizaciones c
join public.gasto_reparto gr on gr.cotizacion_id = c.id
group by c.id, c.numero, c.estado, c.costo_total, c.utilidad_estimada, c.margen_pct
order by c.numero desc;

comment on view public.reporte_gastos_por_venta is
  'Cuantos gastos y cuanta plata quedo imputada a cada venta, con la utilidad ya recalculada.';
