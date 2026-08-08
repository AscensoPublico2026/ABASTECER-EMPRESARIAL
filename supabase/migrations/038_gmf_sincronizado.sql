-- ============================================================
-- ABASTECER EMPRESARIAL SAS - El 4x1000 tiene que seguir al movimiento
-- Migracion 038
-- ============================================================
-- COMO SE DESCUBRIO ESTO
--
-- En el libro de tesoreria, la impresora aparece asi:
--
--   02/08/2026  IMPRESORA HP SMART TANK 580   EGRESO   $ 654.881
--   02/08/2026  GMF (4x1000) IMPRESORA HP     EGRESO   $   2.819
--
-- El trigger del GMF calcula ceil(monto * 0.004). Entonces:
--
--   Si el movimiento fuera 654.881  ->  el GMF seria 2.620
--   Para que el GMF sea 2.819       ->  el monto tenia que ser ~704.750
--
-- O sea que cuando se creo el movimiento, el monto era 704.750, y despues
-- quedo en 654.881. Hay 49.869 de diferencia que el banco SI cobro y el
-- ERP NO tiene registrados.
--
-- EL 4x1000 ES UN TESTIGO. Es el unico dato del libro que el banco calcula
-- solo, asi que sirve para auditar si el monto que quedo guardado es el que
-- de verdad salio de la cuenta.
--
-- LOS DOS PROBLEMAS
--
-- 1. El trigger generar_gmf es AFTER INSERT solamente. Si el monto de un
--    egreso cambia despues, el GMF se queda con el valor viejo y el saldo
--    de la cuenta queda mal para siempre, sin que nada avise.
--
-- 2. No habia ninguna forma de detectarlo. El descuadre se queda callado.
--
-- LO QUE HACE ESTA MIGRACION
-- 1. El GMF se recalcula tambien cuando el egreso cambia de monto o cuenta.
-- 2. Vista gmf_descuadre: lista los egresos cuyo GMF no corresponde al
--    monto, con el monto que el banco realmente vio.
-- 3. NO corrige montos por su cuenta: no puede inventar cual de los dos
--    numeros es el correcto. Los muestra para que se revise con la factura.
--
-- Cierra la pestana del ERP antes de correrla.
-- ============================================================


-- ------------------------------------------------------------
-- PASO 1: el GMF se recalcula cuando el egreso cambia
-- ------------------------------------------------------------
create or replace function public.resincronizar_gmf()
returns trigger
language plpgsql
as $$
declare
  tasa numeric;
  monto_gmf numeric;
  cuenta_cobra_gmf boolean;
begin
  -- Solo importa si cambio el monto o la cuenta. Cambiar el concepto o la
  -- fecha no altera lo que cobra el banco.
  if new.monto = old.monto and new.cuenta_id = old.cuenta_id then
    return new;
  end if;

  -- El GMF de un GMF no existe
  if new.categoria = 'GMF' then
    return new;
  end if;

  if new.tipo <> 'EGRESO' or new.categoria = 'TRASLADO_ENTRADA' then
    -- Si dejo de ser un egreso que causa GMF, el GMF viejo sobra
    delete from public.movimientos_tesoreria where gmf_de_id = new.id;
    return new;
  end if;

  select coalesce(c.cobra_gmf, true) into cuenta_cobra_gmf
  from public.cuentas c where c.id = new.cuenta_id;

  if not cuenta_cobra_gmf then
    delete from public.movimientos_tesoreria where gmf_de_id = new.id;
    return new;
  end if;

  select coalesce(
    (select valor / 100 from public.config_tributaria where clave = 'GMF_TASA'),
    0.004
  ) into tasa;

  monto_gmf := ceil(new.monto * tasa);

  if monto_gmf <= 0 then
    delete from public.movimientos_tesoreria where gmf_de_id = new.id;
    return new;
  end if;

  -- Si ya existe el GMF se ajusta; si no, se crea
  if exists (select 1 from public.movimientos_tesoreria where gmf_de_id = new.id) then
    update public.movimientos_tesoreria
    set monto      = monto_gmf,
        cuenta_id  = new.cuenta_id,
        fecha      = new.fecha,
        concepto   = 'GMF (4x1000) ' || left(new.concepto, 80)
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

comment on function public.resincronizar_gmf is
  'Si a un egreso le cambian el monto o la cuenta, su GMF se recalcula. Sin esto el GMF quedaba con el valor viejo y el saldo de la cuenta quedaba mal para siempre sin que nada avisara.';

drop trigger if exists trg_gmf_resincronizar on public.movimientos_tesoreria;
create trigger trg_gmf_resincronizar
  after update on public.movimientos_tesoreria
  for each row execute function public.resincronizar_gmf();


-- ------------------------------------------------------------
-- PASO 2: la vista que detecta el descuadre
-- ------------------------------------------------------------
-- El GMF es el testigo: el banco lo cobra sobre el monto que de verdad
-- salio. Si no corresponde con el monto guardado, uno de los dos esta mal
-- y hay que revisarlo con la factura en la mano.
create or replace view public.gmf_descuadre as
with tasa as (
  select coalesce(
    (select valor / 100 from public.config_tributaria where clave = 'GMF_TASA'),
    0.004
  ) as t
)
select
  m.id                                as movimiento_id,
  m.fecha,
  m.concepto,
  m.categoria,
  cu.nombre                           as cuenta,
  m.monto                             as monto_registrado,
  g.monto                             as gmf_cobrado,
  ceil(m.monto * t.t)                 as gmf_que_corresponde,
  g.monto - ceil(m.monto * t.t)       as diferencia_gmf,
  -- Cuanto vio el banco realmente, deducido del GMF que cobro
  round(g.monto / t.t)                as monto_que_vio_el_banco,
  round(g.monto / t.t) - m.monto      as plata_sin_registrar,
  m.gasto_id,
  m.factura_compra_id,
  m.cotizacion_id
from public.movimientos_tesoreria m
cross join tasa t
join public.movimientos_tesoreria g on g.gmf_de_id = m.id
left join public.cuentas cu on cu.id = m.cuenta_id
where g.monto <> ceil(m.monto * t.t)
order by abs(round(g.monto / t.t) - m.monto) desc;

comment on view public.gmf_descuadre is
  'Egresos cuyo 4x1000 no corresponde al monto guardado. El GMF es el unico dato del libro que calcula el banco, asi que sirve de testigo: monto_que_vio_el_banco es lo que de verdad salio de la cuenta, y plata_sin_registrar es lo que falta por registrar.';


-- ------------------------------------------------------------
-- PASO 3: control de coherencia del IVA en los gastos
-- ------------------------------------------------------------
-- En Colombia las tarifas son 0%, 5% y 19%. Si el IVA guardado no da
-- ninguna, casi siempre se digito mal y el total que salio del banco quedo
-- equivocado.
create or replace view public.gastos_iva_sospechoso as
select
  g.id,
  g.fecha,
  g.concepto,
  g.categoria,
  g.monto                                   as total_registrado,
  coalesce(g.iva_incluido, 0)               as iva_registrado,
  g.monto - coalesce(g.iva_incluido, 0)     as base,
  case when g.monto - coalesce(g.iva_incluido, 0) > 0
       then round((coalesce(g.iva_incluido, 0)
                   / (g.monto - coalesce(g.iva_incluido, 0))) * 100, 2)
  end                                       as iva_pct_real,
  -- Lo que seria el total si la base fuera correcta y el IVA 19%
  round((g.monto - coalesce(g.iva_incluido, 0)) * 1.19)  as total_si_iva_19,
  case
    when coalesce(g.iva_incluido, 0) = 0 then 'SIN IVA: revisa si la factura traia IVA'
    else 'EL IVA NO DA NINGUNA TARIFA (0, 5 o 19%)'
  end                                       as diagnostico
from public.gastos g
where g.monto > 0
  and (
    coalesce(g.iva_incluido, 0) = 0
    or not exists (
      select 1 from (values (0.0), (5.0), (19.0)) as t(tarifa)
      where abs(
        ((coalesce(g.iva_incluido, 0) / nullif(g.monto - coalesce(g.iva_incluido, 0), 0)) * 100)
        - t.tarifa
      ) < 0.6
    )
  )
order by g.fecha desc;

comment on view public.gastos_iva_sospechoso as
  'Gastos cuyo IVA no corresponde a ninguna tarifa colombiana (0, 5 o 19%). Casi siempre significa que se digito el subtotal en el campo del total, y entonces el movimiento del banco quedo por menos plata de la que salio.';



-- ============================================================
-- DIAGNOSTICO: QUE PASO CON LA IMPRESORA
-- ============================================================

-- 1. TODOS los descuadres del banco. Aqui debe salir la impresora.
--    plata_sin_registrar es lo que falta por registrar en la cuenta.
select fecha, concepto, cuenta, monto_registrado, gmf_cobrado,
       gmf_que_corresponde, monto_que_vio_el_banco, plata_sin_registrar
from public.gmf_descuadre;


-- 2. El gasto de la impresora, con su IVA
select fecha, concepto, categoria, total_registrado, iva_registrado,
       base, iva_pct_real, total_si_iva_19, diagnostico
from public.gastos_iva_sospechoso
where concepto ilike '%impres%';


-- 3. Los dos movimientos de la impresora, lado a lado
select m.fecha, m.categoria, m.concepto, m.monto,
       case when m.categoria = 'GMF' then 'lo cobro el banco'
            else 'lo registramos nosotros' end as origen
from public.movimientos_tesoreria m
where m.concepto ilike '%impres%'
order by m.categoria, m.fecha;


-- 4. Cuanto suma cada cuenta hoy, para comparar contra el extracto
select nombre, saldo_actual, es_reserva
from public.saldos_cuentas
where activa
order by orden, nombre;
