-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Retenciones separadas por bolsillo
-- Migracion 032
-- ============================================================
-- POR QUE
-- La vista obligaciones_por_periodo entregaba las retenciones en un solo
-- campo, retenciones_a_favor, que sumaba las TRES (reteIVA + retefuente
-- + reteICA). Con ese dato es imposible que la tabla de /financiero
-- cuadre a la vista, porque cada retencion descuenta un impuesto
-- distinto:
--
--   reteIVA .................. descuenta el IVA
--   retefuente y reteICA ..... descuentan el Simple
--
-- Resultado en pantalla: la columna "IVA cobrado" menos "IVA
-- descontable" no daba la columna "IVA a pagar", porque en el medio
-- faltaba mostrar la reteIVA. El numero final era correcto, pero la
-- resta no se veia y parecia un error de calculo.
--
-- Este es el mismo problema que ya se corrigio en el panel de la venta,
-- pero del lado de los periodos.
--
-- QUE HACE
-- Expone las retenciones separadas por el bolsillo que descuentan, para
-- que las dos tablas se puedan mostrar cuadradas. NO cambia ningun
-- calculo: iva_a_pagar y simple_a_pagar siguen dando lo mismo.
--
-- Es idempotente. Cierra la pestana del ERP antes de correrla.
-- ============================================================

drop view if exists public.obligaciones_por_periodo;

create view public.obligaciones_por_periodo as
select
  to_char(av.fecha, 'YYYY')                                as anio,
  case
    when extract(month from av.fecha) in (1,2)   then 1
    when extract(month from av.fecha) in (3,4)   then 2
    when extract(month from av.fecha) in (5,6)   then 3
    when extract(month from av.fecha) in (7,8)   then 4
    when extract(month from av.fecha) in (9,10)  then 5
    else 6
  end                                                      as bimestre,
  to_char(av.fecha, 'YYYY-MM')                             as mes,
  count(*)                                                 as num_ventas,
  sum(av.venta_subtotal)                                   as base_gravable,

  -- ---------- BOLSILLO IVA ----------
  sum(av.iva_cobrado)                                      as iva_cobrado,
  sum(av.iva_pagado)                                       as iva_descontable,
  -- La reteIVA es anticipo del IVA. Se expone aparte para que la resta
  -- de la pantalla cuadre: iva_cobrado - iva_descontable - reteiva
  sum(av.retencion_reteiva)                                as reteiva,
  sum(av.iva_neto_dian)                                    as iva_a_pagar,
  sum(av.iva_saldo_favor)                                  as iva_saldo_favor,

  -- ---------- BOLSILLO SIMPLE ----------
  sum(av.impuesto_simple)                                  as simple_causado,
  -- Solo retefuente y reteICA son anticipo del Simple
  sum(av.retencion_retefuente)                             as retefuente,
  sum(av.retencion_reteica)                                as reteica,
  sum(av.retencion_retefuente + av.retencion_reteica)      as retenciones_del_simple,
  sum(av.impuesto_simple_pendiente)                        as simple_a_pagar,
  sum(av.simple_saldo_favor)                               as simple_saldo_favor,

  -- Total de las tres, se mantiene por compatibilidad con lo que ya
  -- existia. OJO: no usar este campo para restarlo de un solo impuesto.
  sum(av.retenciones)                                      as retenciones_a_favor,

  -- ---------- RESULTADO ----------
  sum(av.utilidad_bruta)                                   as utilidad_bruta,
  sum(av.utilidad_neta)                                    as utilidad_neta
from public.analisis_venta av
where av.estado in ('FACTURADA','DESPACHADA','ENTREGADO','POR_COBRAR','COBRADA','ENTREGA_PARCIAL','EN_ALISTAMIENTO','PAGADA')
group by 1, 2, 3
order by 1 desc, 3 desc;

comment on view public.obligaciones_por_periodo is
  'IVA y Simple por mes/bimestre, con las retenciones separadas por el bolsillo que descuentan. La reteIVA baja el IVA; la retefuente y la reteICA bajan el Simple. retenciones_a_favor suma las tres y solo sirve como total informativo: restarlo de un solo impuesto seria contarlo dos veces.';


-- ============================================================
-- COMPROBACION
-- ============================================================
-- Las dos restas deben cuadrar en TODAS las filas.
-- Si esto devuelve alguna fila, avisame.
select
  mes,
  iva_cobrado,
  iva_descontable,
  reteiva,
  iva_a_pagar,
  iva_saldo_favor,
  (iva_cobrado - iva_descontable - reteiva) as iva_calculado,
  simple_causado,
  retenciones_del_simple,
  simple_a_pagar,
  simple_saldo_favor,
  (simple_causado - retenciones_del_simple) as simple_calculado
from public.obligaciones_por_periodo
where abs((iva_cobrado - iva_descontable - reteiva) - (iva_a_pagar - iva_saldo_favor)) > 2
   or abs((simple_causado - retenciones_del_simple) - (simple_a_pagar - simple_saldo_favor)) > 2;
