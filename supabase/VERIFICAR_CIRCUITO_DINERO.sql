-- ============================================================
-- VERIFICAR EL CIRCUITO DEL DINERO
-- ============================================================
-- Corre este script en el SQL Editor de Supabase DESPUES de haber
-- ejecutado las migraciones 023 y 024, y despues de registrar el
-- flujo completo en el ERP.
--
-- No modifica nada. Solo lee y compara.
-- ============================================================


-- ------------------------------------------------------------
-- 1. TODOS LOS MOVIMIENTOS EN ORDEN, CON SALDO CORRIENDO
-- ------------------------------------------------------------
-- Esta es la columna "saldo_despues": debe ir subiendo y bajando
-- igual que el extracto del banco.
select
  lt.fecha,
  lt.cuenta_nombre,
  lt.concepto,
  lt.origen,
  case when lt.tipo = 'INGRESO' then lt.monto end as entra,
  case when lt.tipo = 'EGRESO'  then lt.monto end as sale,
  sum(case when lt.tipo = 'INGRESO' then lt.monto else -lt.monto end)
    over (partition by lt.cuenta_id order by lt.fecha, lt.created_at)
    as saldo_despues
from public.libro_tesoreria lt
order by lt.cuenta_nombre, lt.fecha, lt.created_at;


-- ------------------------------------------------------------
-- 2. SALDO DE CADA CUENTA
-- ------------------------------------------------------------
-- El saldo_actual de la cuenta operativa debe ser IGUAL al saldo
-- que ves en Bold. Si no coincide, falta registrar algo.
select
  nombre,
  es_reserva,
  saldo_inicial,
  total_ingresos,
  total_egresos,
  saldo_actual,
  num_movimientos
from public.saldos_cuentas
where activa
order by es_reserva, orden;


-- ------------------------------------------------------------
-- 3. CUADRE: EL LIBRO CONTRA EL SALDO DE LA CUENTA
-- ------------------------------------------------------------
-- La columna "diferencia" tiene que ser 0 en todas las filas.
with libro as (
  select
    cuenta_id,
    sum(case when tipo = 'INGRESO' then monto else -monto end) as neto_libro
  from public.movimientos_tesoreria
  group by cuenta_id
)
select
  sc.nombre,
  sc.saldo_inicial,
  coalesce(l.neto_libro, 0)                             as neto_movimientos,
  sc.saldo_inicial + coalesce(l.neto_libro, 0)          as saldo_calculado,
  sc.saldo_actual                                       as saldo_de_la_vista,
  sc.saldo_actual - (sc.saldo_inicial + coalesce(l.neto_libro, 0)) as diferencia
from public.saldos_cuentas sc
left join libro l on l.cuenta_id = sc.id
where sc.activa
order by sc.orden;


-- ------------------------------------------------------------
-- 4. ESTADO DE LA RESERVA DE IMPUESTOS
-- ------------------------------------------------------------
-- debe_estar_reservado = IVA + Simple
-- falta_trasladar = lo que hay que mover a la cuenta de reserva
select
  iva_por_pagar,
  simple_por_pagar,
  debe_estar_reservado,
  esta_reservado,
  falta_trasladar,
  sobra_en_reserva,
  saldo_operativo,
  alcanza_para_trasladar
from public.estado_reserva_impuestos;


-- ------------------------------------------------------------
-- 5. POSICION FINANCIERA
-- ------------------------------------------------------------
-- LA PRUEBA DE FUEGO:
-- Corre esta consulta ANTES de apartar la plata de impuestos,
-- anota el disponible_real, haz el traslado a la reserva y
-- vuelve a correrla. El disponible_real DEBE SER EL MISMO.
--
-- El saldo_operativo si baja (la plata salio de Bold) y el
-- saldo_reservas sube, pero el disponible_real no se mueve,
-- porque la plata sigue siendo de la empresa.
select
  saldo_operativo,
  saldo_reservas,
  saldo_total,
  impuestos_por_pagar,
  impuestos_sin_apartar,
  cuentas_por_pagar,
  disponible_real,        -- <<< este numero no debe cambiar al trasladar
  cuentas_por_cobrar,
  disponible_proyectado,
  reserva_insuficiente,
  en_riesgo
from public.posicion_financiera;


-- ------------------------------------------------------------
-- 6. MOVIMIENTOS HUERFANOS
-- ------------------------------------------------------------
-- Movimientos manuales que no vienen de ningun modulo.
-- Deberian ser pocos y estar justificados.
select fecha, cuenta_nombre, tipo, categoria, monto, concepto, creado_por_nombre
from public.libro_tesoreria
where origen = 'Manual'
order by fecha desc;


-- ------------------------------------------------------------
-- 7. TRASLADOS: LOS DOS LADOS DEBEN ESTAR EMPAREJADOS
-- ------------------------------------------------------------
-- Si alguna fila muestra "SIN PAREJA" hay un traslado a medias
-- y el dinero total esta mal.
select
  mt.fecha,
  mt.categoria,
  mt.monto,
  mt.concepto,
  case
    when mt.movimiento_relacionado_id is null then 'SIN PAREJA'
    else 'ok'
  end as estado_pareja
from public.movimientos_tesoreria mt
where mt.categoria in ('TRASLADO_ENTRADA','TRASLADO_SALIDA')
order by mt.fecha, mt.created_at;


-- ------------------------------------------------------------
-- 8. VENTAS SIN COSTO ASIGNADO
-- ------------------------------------------------------------
-- Si una venta no tiene costo asignado, la utilidad y el IVA
-- descontable estan incompletos y el disponible_real sale mal.
select
  numero,
  cliente_nombre,
  estado,
  venta_total,
  costo_real,
  utilidad_bruta,
  iva_neto_dian,
  impuesto_simple_pendiente,
  tiene_costo_asignado
from public.analisis_venta
where estado in ('FACTURADA','DESPACHADA','ENTREGADO','POR_COBRAR','COBRADA','ENTREGA_PARCIAL')
order by fecha desc;


-- ------------------------------------------------------------
-- 9. FACTURAS DE COMPRA PAGADAS SIN SALIDA DE DINERO
-- ------------------------------------------------------------
-- Toda factura PAGADA debe tener su movimiento de tesoreria.
-- Si aparece algo aqui, el saldo del ERP esta inflado.
select
  fc.numero_factura,
  fc.fecha_factura,
  fc.estado,
  fc.total,
  'NO TIENE MOVIMIENTO DE CAJA' as problema
from public.facturas_compra fc
where fc.estado = 'PAGADA'
  and not exists (
    select 1 from public.movimientos_tesoreria mt
    where mt.factura_compra_id = fc.id
  );


-- ------------------------------------------------------------
-- 10. GASTOS SIN SALIDA DE DINERO
-- ------------------------------------------------------------
-- Un gasto es plata que ya salio. Si aparece algo aqui, el
-- saldo del ERP esta inflado.
select
  g.fecha,
  g.concepto,
  g.monto,
  'NO TIENE MOVIMIENTO DE CAJA' as problema
from public.gastos g
where not exists (
  select 1 from public.movimientos_tesoreria mt
  where mt.gasto_id = g.id
)
order by g.fecha desc;
