-- ============================================================
-- ABASTECER EMPRESARIAL SAS - CHEQUEO DE INTEGRIDAD
-- ============================================================
-- Pega TODO este archivo en el SQL Editor de Supabase y dale RUN.
-- No modifica nada: solo mira y reporta.
--
-- Devuelve una sola tabla. Lee la columna ESTADO:
--   OK        -> todo bien, no hagas nada
--   REVISAR   -> algo puede estar mal, vale la pena mirarlo
--   ERROR     -> hay un descuadre real, hay que corregirlo
--
-- Corrolo una vez por semana, y siempre despues de editar o anular
-- una factura, para dormir tranquilo.
-- ============================================================

with

-- ------------------------------------------------------------
-- 1. FACTURAS DE COMPRA DUPLICADAS
-- Mismo proveedor + mismo numero de factura, las dos vivas.
-- Cada duplicado infla stock, caja y 4x1000.
-- ------------------------------------------------------------
c1 as (
  select count(*) as n
  from (
    select fc.proveedor_id, fc.numero_factura
    from public.facturas_compra fc
    where fc.estado <> 'ANULADA'
      and coalesce(fc.numero_factura, '') <> ''
    group by fc.proveedor_id, fc.numero_factura
    having count(*) > 1
  ) d
),

-- ------------------------------------------------------------
-- 2. FACTURAS DE COMPRA SIN ITEMS
-- Una factura sin items no aporta costo ni stock: la plata salio
-- del banco y el inventario no se movio.
-- ------------------------------------------------------------
c2 as (
  select count(*) as n
  from public.facturas_compra fc
  where fc.estado <> 'ANULADA'
    and not exists (
      select 1 from public.factura_compra_items i
      where i.factura_compra_id = fc.id
    )
),

-- ------------------------------------------------------------
-- 3. EL TOTAL DE LA FACTURA NO CUADRA CON SUS ITEMS
-- Pasa cuando se edita la cabecera y no los items (o al reves).
-- Tolerancia de 2 pesos por redondeos.
-- ------------------------------------------------------------
c3 as (
  select count(*) as n
  from public.facturas_compra fc
  join (
    select factura_compra_id, sum(subtotal) as suma_items
    from public.factura_compra_items
    group by factura_compra_id
  ) it on it.factura_compra_id = fc.id
  where fc.estado <> 'ANULADA'
    and abs(coalesce(fc.subtotal, 0) - it.suma_items) > 2
),

-- ------------------------------------------------------------
-- 4. total_neto MAL CALCULADO
-- total_neto debe ser total - retenciones. Si no, lo que el ERP
-- dice que le debes al proveedor no es lo que le vas a pagar.
-- ------------------------------------------------------------
c4 as (
  select count(*) as n
  from public.facturas_compra fc
  where fc.estado <> 'ANULADA'
    and abs(
      coalesce(fc.total_neto, 0)
      - (coalesce(fc.total, 0) - coalesce(fc.retencion_total, 0))
    ) > 2
),

-- ------------------------------------------------------------
-- 5. retencion_total NO ES LA SUMA DEL DESGLOSE
-- ------------------------------------------------------------
c5 as (
  select count(*) as n
  from public.facturas_compra fc
  where fc.estado <> 'ANULADA'
    and abs(
      coalesce(fc.retencion_total, 0)
      - (coalesce(fc.retencion_retefuente, 0)
       + coalesce(fc.retencion_reteiva, 0)
       + coalesce(fc.retencion_reteica, 0))
    ) > 2
),

-- ------------------------------------------------------------
-- 6. STOCK QUE NO CUADRA CON EL HISTORICO
-- stock_actual debe ser: comprado - vendido (facturas vivas).
-- Si no cuadra, el inventario esta mintiendo.
-- ------------------------------------------------------------
c6 as (
  select count(*) as n
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
  where abs(
    coalesce(p.stock_actual, 0)
    - (coalesce(ent.entradas, 0) - coalesce(sal.salidas, 0))
  ) > 0.01
),

-- ------------------------------------------------------------
-- 7. STOCK NEGATIVO
-- Vendiste mas de lo que compraste: falta registrar una compra.
-- ------------------------------------------------------------
c7 as (
  select count(*) as n
  from public.productos
  where coalesce(stock_actual, 0) < 0
),

-- ------------------------------------------------------------
-- 8. COSTO PROMEDIO QUE NO CUADRA CON LAS COMPRAS
-- Si esta inflado, el precio sugerido y el margen estan mal.
-- ------------------------------------------------------------
c8 as (
  select count(*) as n
  from public.productos p
  join (
    select
      fci.producto_id,
      round(sum(fci.subtotal) / nullif(sum(fci.cantidad), 0), 2) as costo_real
    from public.factura_compra_items fci
    join public.facturas_compra fc on fc.id = fci.factura_compra_id
    where fc.estado <> 'ANULADA' and fci.producto_id is not null
    group by fci.producto_id
  ) real on real.producto_id = p.id
  where real.costo_real is not null
    and abs(coalesce(p.costo_promedio, 0) - real.costo_real) > 2
),

-- ------------------------------------------------------------
-- 9. TRASLADOS A MEDIAS
-- Salida sin entrada = plata perdida.
-- Entrada sin salida = plata creada de la nada.
-- ------------------------------------------------------------
c9 as (
  select count(*) as n
  from public.movimientos_tesoreria mt
  where mt.categoria in ('TRASLADO_SALIDA','TRASLADO_ENTRADA')
    and not exists (
      select 1 from public.movimientos_tesoreria par
      where par.id <> mt.id
        and par.categoria in ('TRASLADO_SALIDA','TRASLADO_ENTRADA')
        and par.categoria <> mt.categoria
        and (par.movimiento_relacionado_id = mt.id
             or mt.movimiento_relacionado_id = par.id)
    )
),

-- ------------------------------------------------------------
-- 10. 4x1000 HUERFANO
-- Un GMF cuyo movimiento padre ya no existe: cobro sin causa.
-- ------------------------------------------------------------
c10 as (
  select count(*) as n
  from public.movimientos_tesoreria gmf
  where gmf.categoria = 'GMF'
    and (
      gmf.gmf_de_id is null
      or not exists (
        select 1 from public.movimientos_tesoreria padre
        where padre.id = gmf.gmf_de_id
      )
    )
),

-- ------------------------------------------------------------
-- 11. 4x1000 CON EL MONTO EQUIVOCADO
-- Debe ser el 0,4% del movimiento padre, redondeado hacia arriba.
-- ------------------------------------------------------------
c11 as (
  select count(*) as n
  from public.movimientos_tesoreria gmf
  join public.movimientos_tesoreria padre on padre.id = gmf.gmf_de_id
  where gmf.categoria = 'GMF'
    and gmf.monto <> ceil(padre.monto * 0.004)
),

-- ------------------------------------------------------------
-- 12. 4x1000 SOBRE TRASLADOS O AJUSTES
-- El banco no cobra por mover plata entre cuentas propias ni por
-- un ajuste manual de saldo.
-- ------------------------------------------------------------
c12 as (
  select count(*) as n
  from public.movimientos_tesoreria gmf
  join public.movimientos_tesoreria padre on padre.id = gmf.gmf_de_id
  where gmf.categoria = 'GMF'
    and padre.categoria in ('TRASLADO_SALIDA','TRASLADO_ENTRADA','AJUSTE')
),

-- ------------------------------------------------------------
-- 13. EGRESOS REALES SIN SU 4x1000
-- Si el banco lo cobro y no esta registrado, el saldo del ERP es
-- mayor que el del extracto.
-- ------------------------------------------------------------
c13 as (
  select count(*) as n
  from public.movimientos_tesoreria mt
  join public.cuentas c on c.id = mt.cuenta_id
  where mt.tipo = 'EGRESO'
    and mt.categoria not in ('GMF','TRASLADO_SALIDA','TRASLADO_ENTRADA','AJUSTE')
    and coalesce(c.cobra_gmf, true)
    and ceil(mt.monto * 0.004) > 0
    and not exists (
      select 1 from public.movimientos_tesoreria g where g.gmf_de_id = mt.id
    )
),

-- ------------------------------------------------------------
-- 14. PAGOS DE IMPUESTO SIN DECIR QUE IMPUESTO ERA
-- Sin tipo_impuesto la obligacion no se extingue: la plata sale
-- del banco y el ERP te sigue exigiendo apartarla.
-- ------------------------------------------------------------
c14 as (
  select count(*) as n
  from public.movimientos_tesoreria
  where categoria = 'PAGO_IMPUESTO'
    and tipo_impuesto is null
),

-- ------------------------------------------------------------
-- 15. CUENTAS CON SALDO NEGATIVO
-- Ninguna cuenta real puede quedar en negativo.
-- ------------------------------------------------------------
c15 as (
  select count(*) as n
  from public.saldos_cuentas
  where saldo_actual < 0
),

-- ------------------------------------------------------------
-- 16. MOVIMIENTOS APUNTANDO A DOCUMENTOS QUE NO EXISTEN
-- ------------------------------------------------------------
c16 as (
  select count(*) as n
  from public.movimientos_tesoreria mt
  where (mt.factura_compra_id is not null
         and not exists (select 1 from public.facturas_compra x where x.id = mt.factura_compra_id))
     or (mt.cotizacion_id is not null
         and not exists (select 1 from public.cotizaciones x where x.id = mt.cotizacion_id))
     or (mt.gasto_id is not null
         and not exists (select 1 from public.gastos x where x.id = mt.gasto_id))
),

-- ------------------------------------------------------------
-- 17. ASIGNACIONES DE COSTO HUERFANAS
-- Costo asignado a una venta o a una factura que ya no existe:
-- el margen de esa venta queda mal.
-- ------------------------------------------------------------
c17 as (
  select count(*) as n
  from public.asignacion_costos ac
  where (ac.cotizacion_id is not null
         and not exists (select 1 from public.cotizaciones x where x.id = ac.cotizacion_id))
     or (ac.factura_compra_id is not null
         and not exists (select 1 from public.facturas_compra x where x.id = ac.factura_compra_id))
),

-- ------------------------------------------------------------
-- 18. COSTO ASIGNADO A FACTURAS DE COMPRA ANULADAS
-- La factura se anulo pero su costo sigue restando margen.
-- ------------------------------------------------------------
c18 as (
  select count(*) as n
  from public.asignacion_costos ac
  join public.facturas_compra fc on fc.id = ac.factura_compra_id
  where fc.estado = 'ANULADA'
),

-- ------------------------------------------------------------
-- 19. VENTAS FACTURADAS SIN NINGUN COSTO ASIGNADO
-- El ERP las muestra con 100% de margen, que no es real.
-- ------------------------------------------------------------
c19 as (
  select count(*) as n
  from public.analisis_venta av
  where av.estado in ('FACTURADA','DESPACHADA','ENTREGADO','POR_COBRAR','COBRADA','PAGADA')
    and not av.tiene_costo_asignado
),

-- ------------------------------------------------------------
-- 20. EL TOTAL DE LA COTIZACION NO CUADRA CON SUS ITEMS
-- ------------------------------------------------------------
c20 as (
  select count(*) as n
  from public.cotizaciones c
  join (
    select cotizacion_id, sum(subtotal) as suma_items
    from public.cotizacion_items
    group by cotizacion_id
  ) it on it.cotizacion_id = c.id
  where c.estado <> 'RECHAZADA'
    and abs(coalesce(c.subtotal, 0) - it.suma_items) > 2
),

-- ------------------------------------------------------------
-- 21. RETENCIONES MAYORES AL TOTAL DE LA VENTA
-- Imposible: alguien digito mal.
-- ------------------------------------------------------------
c21 as (
  select count(*) as n
  from public.cotizaciones c
  where (coalesce(c.retencion_retefuente,0)
       + coalesce(c.retencion_reteiva,0)
       + coalesce(c.retencion_reteica,0)) > coalesce(c.total, 0)
    and coalesce(c.total, 0) > 0
),

-- ------------------------------------------------------------
-- 22. VENTAS COBRADAS SIN EL INGRESO EN TESORERIA
-- Dice que te pagaron pero la plata no aparece en ninguna cuenta.
-- ------------------------------------------------------------
c22 as (
  select count(*) as n
  from public.cotizaciones c
  where c.estado in ('COBRADA','PAGADA')
    and not exists (
      select 1 from public.movimientos_tesoreria mt
      where mt.cotizacion_id = c.id and mt.tipo = 'INGRESO'
    )
),

-- ------------------------------------------------------------
-- 23. FACTURAS DE VENTA CON NUMERO DIAN REPETIDO
-- ------------------------------------------------------------
c23 as (
  select count(*) as n
  from (
    select numero_factura_dian
    from public.facturas_venta
    where estado <> 'ANULADA' and coalesce(numero_factura_dian,'') <> ''
    group by numero_factura_dian
    having count(*) > 1
  ) d
),

-- ------------------------------------------------------------
-- 24. GASTOS DEDUCIBLES SIN SOPORTE
-- Sin factura ni documento soporte la DIAN los rechaza.
-- ------------------------------------------------------------
c24 as (
  select count(*) as n
  from public.gastos
  where deducible = true and coalesce(tiene_soporte, false) = false
),

-- ------------------------------------------------------------
-- 25. LA RESERVA DE IMPUESTOS NO ALCANZA
-- Informativo pero critico: es plata de la DIAN que te vas a gastar.
-- ------------------------------------------------------------
c25 as (
  select
    case when falta_trasladar > 0 then 1 else 0 end as n,
    falta_trasladar
  from public.estado_reserva_impuestos
),

-- ------------------------------------------------------------
-- 26. EL DISPONIBLE REAL ESTA EN NEGATIVO
-- Debes mas de lo que tienes.
-- ------------------------------------------------------------
c26 as (
  select
    case when disponible_real < 0 then 1 else 0 end as n,
    disponible_real
  from public.posicion_financiera
)

-- ============================================================
-- REPORTE
-- ============================================================
select * from (
  select  1 as nro, 'Facturas de compra duplicadas'                as chequeo, c1.n  as cuantos, case when c1.n  > 0 then 'ERROR'   else 'OK' end as estado, 'Anula el duplicado desde Compras. Cada uno duplico stock, caja y 4x1000.'                       as que_hacer from c1
  union all select  2, 'Facturas de compra sin items',               c2.n,  case when c2.n  > 0 then 'ERROR'   else 'OK' end, 'La plata salio y el inventario no se movio. Editala y agrega los items.'                          from c2
  union all select  3, 'Total de compra no cuadra con sus items',    c3.n,  case when c3.n  > 0 then 'ERROR'   else 'OK' end, 'Se edito la cabecera sin los items. Vuelve a guardar la factura.'                                 from c3
  union all select  4, 'total_neto mal calculado',                   c4.n,  case when c4.n  > 0 then 'ERROR'   else 'OK' end, 'Vuelve a guardar la factura para que el trigger lo recalcule.'                                    from c4
  union all select  5, 'retencion_total no es la suma del desglose', c5.n,  case when c5.n  > 0 then 'ERROR'   else 'OK' end, 'Vuelve a guardar la factura para que el trigger lo recalcule.'                                    from c5
  union all select  6, 'Stock no cuadra con el historico',           c6.n,  case when c6.n  > 0 then 'ERROR'   else 'OK' end, 'Corre de nuevo el bloque de recalculo de stock de la migracion 031.'                              from c6
  union all select  7, 'Productos con stock negativo',               c7.n,  case when c7.n  > 0 then 'REVISAR' else 'OK' end, 'Falta registrar una compra, o se vendio sin tener existencias.'                                   from c7
  union all select  8, 'Costo promedio no cuadra con las compras',   c8.n,  case when c8.n  > 0 then 'ERROR'   else 'OK' end, 'El margen y el precio sugerido estan mal. Recalcula desde la migracion 031.'                      from c8
  union all select  9, 'Traslados a medias',                         c9.n,  case when c9.n  > 0 then 'ERROR'   else 'OK' end, 'Salida sin entrada = plata perdida. Entrada sin salida = plata inventada. Borralo y rehazlo.'     from c9
  union all select 10, '4x1000 huerfano (sin movimiento padre)',     c10.n, case when c10.n > 0 then 'REVISAR' else 'OK' end, 'Cobro sin causa. Borralo desde Tesoreria.'                                                        from c10
  union all select 11, '4x1000 con el monto equivocado',             c11.n, case when c11.n > 0 then 'ERROR'   else 'OK' end, 'Debe ser el 0,4% del movimiento. Corre el bloque de recalculo de GMF.'                            from c11
  union all select 12, '4x1000 sobre traslados o ajustes',           c12.n, case when c12.n > 0 then 'ERROR'   else 'OK' end, 'El banco no cobra por mover plata entre cuentas propias. Borralos.'                               from c12
  union all select 13, 'Egresos reales sin su 4x1000',               c13.n, case when c13.n > 0 then 'REVISAR' else 'OK' end, 'Si el banco lo cobro, tu saldo del ERP esta mas alto que el del extracto.'                        from c13
  union all select 14, 'Pagos de impuesto sin decir cual impuesto',  c14.n, case when c14.n > 0 then 'ERROR'   else 'OK' end, 'Sin eso la obligacion no se descuenta. Borra el movimiento y registralo de nuevo.'                 from c14
  union all select 15, 'Cuentas con saldo negativo',                 c15.n, case when c15.n > 0 then 'ERROR'   else 'OK' end, 'Falta registrar un ingreso o hay un egreso duplicado.'                                            from c15
  union all select 16, 'Movimientos apuntando a documentos borrados',c16.n, case when c16.n > 0 then 'ERROR'   else 'OK' end, 'Cadena rota: el movimiento quedo sin su factura o venta.'                                         from c16
  union all select 17, 'Asignaciones de costo huerfanas',            c17.n, case when c17.n > 0 then 'ERROR'   else 'OK' end, 'El margen de esa venta esta mal calculado.'                                                       from c17
  union all select 18, 'Costo asignado a compras ANULADAS',          c18.n, case when c18.n > 0 then 'ERROR'   else 'OK' end, 'La factura se anulo pero su costo sigue restando margen. Borra la asignacion.'                    from c18
  union all select 19, 'Ventas facturadas sin ningun costo asignado',c19.n, case when c19.n > 0 then 'REVISAR' else 'OK' end, 'El ERP las muestra con 100% de margen. Asignale la compra o el gasto.'                            from c19
  union all select 20, 'Total de cotizacion no cuadra con items',    c20.n, case when c20.n > 0 then 'ERROR'   else 'OK' end, 'Vuelve a guardar la cotizacion.'                                                                  from c20
  union all select 21, 'Retenciones mayores al total de la venta',   c21.n, case when c21.n > 0 then 'ERROR'   else 'OK' end, 'Se digito mal. Corrige el cobro de esa venta.'                                                    from c21
  union all select 22, 'Ventas cobradas sin el ingreso en caja',     c22.n, case when c22.n > 0 then 'ERROR'   else 'OK' end, 'Dice que te pagaron pero la plata no aparece en ninguna cuenta.'                                  from c22
  union all select 23, 'Numero de factura DIAN repetido',            c23.n, case when c23.n > 0 then 'ERROR'   else 'OK' end, 'Dos facturas con el mismo numero. Anula la que sobra.'                                            from c23
  union all select 24, 'Gastos deducibles sin soporte',              c24.n, case when c24.n > 0 then 'REVISAR' else 'OK' end, 'Sin factura ni documento soporte la DIAN los rechaza. Sube el soporte o marcalo no deducible.'    from c24
  union all select 25, 'Falta plata en la reserva de impuestos',     c25.n, case when c25.n > 0 then 'REVISAR' else 'OK' end, 'Es plata de la DIAN. Traslada a la reserva desde Tesoreria.'                                      from c25
  union all select 26, 'Disponible real en negativo',                c26.n, case when c26.n > 0 then 'REVISAR' else 'OK' end, 'Debes mas de lo que tienes en caja. Revisa cuentas por pagar e impuestos.'                        from c26
) r
order by
  case r.estado when 'ERROR' then 1 when 'REVISAR' then 2 else 3 end,
  r.nro;
