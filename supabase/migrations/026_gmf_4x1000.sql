-- ============================================================
-- ABASTECER EMPRESARIAL SAS - GMF (4x1000) automatico
-- Migracion 026
-- ============================================================
-- Bold cobra el 4x1000 en CADA salida de dinero.
-- Este trigger genera automaticamente un segundo movimiento
-- con el cobro del banco cada vez que se registra un EGRESO.
--
-- Ejemplo: pagas $234.000 al proveedor
--   1. EGRESO $234.000  Compra FCJA1119          (lo crea el sistema)
--   2. EGRESO $936      GMF (4x1000) FCJA1119    (lo crea el trigger)
--
-- Asi el saldo de Bold siempre coincide con el extracto real.
-- ============================================================


-- 1. Agregar GMF como categoria valida
alter table public.movimientos_tesoreria
  drop constraint if exists movimientos_tesoreria_categoria_check;

alter table public.movimientos_tesoreria
  add constraint movimientos_tesoreria_categoria_check
    check (categoria in (
      'COBRO_CLIENTE','PAGO_PROVEEDOR','GASTO','PAGO_IMPUESTO',
      'APORTE_SOCIO','PRESTAMO_SOCIO','DEVOLUCION_PRESTAMO','DIVIDENDO',
      'TRASLADO_ENTRADA','TRASLADO_SALIDA','AJUSTE','OTRO',
      'GMF'
    ));


-- 2. Parametro tributario: tasa del GMF (4 por mil = 0.004)
insert into public.config_tributaria (clave, valor, unidad, descripcion) values
  ('GMF_TASA', 0.4000, 'PORCENTAJE', 'Gravamen a los Movimientos Financieros. 4 por mil. Se divide entre 1000 al calcular.')
on conflict (clave) do update set valor = excluded.valor, descripcion = excluded.descripcion;


-- 3. Columna para vincular el GMF con el movimiento que lo genero
alter table public.movimientos_tesoreria
  add column if not exists gmf_de_id uuid
    references public.movimientos_tesoreria(id) on delete cascade;

comment on column public.movimientos_tesoreria.gmf_de_id is
  'Si este movimiento es el cobro del GMF, apunta al movimiento original que lo genero. Permite borrar el GMF si se anula el movimiento padre.';

create index if not exists idx_mt_gmf_de
  on public.movimientos_tesoreria(gmf_de_id);


-- 4. Funcion: generar el cobro del GMF
create or replace function public.generar_gmf()
returns trigger
language plpgsql
as $$
declare
  tasa numeric;
  monto_gmf numeric;
  cuenta_cobra_gmf boolean;
begin
  -- Solo aplica a EGRESOS
  if new.tipo <> 'EGRESO' then
    return new;
  end if;

  -- No generar GMF del GMF (evitar recursion)
  if new.categoria = 'GMF' then
    return new;
  end if;

  -- No generar GMF de un traslado ENTRADA (solo el lado SALIDA genera GMF)
  if new.categoria = 'TRASLADO_ENTRADA' then
    return new;
  end if;

  -- Verificar si la cuenta cobra GMF
  select coalesce(c.cobra_gmf, true)
  into cuenta_cobra_gmf
  from public.cuentas c
  where c.id = new.cuenta_id;

  if not cuenta_cobra_gmf then
    return new;
  end if;

  -- Obtener la tasa (guardada como 0.4 PORCENTAJE = 4 por mil)
  select coalesce(
    (select valor / 1000 from public.config_tributaria where clave = 'GMF_TASA'),
    0.004
  ) into tasa;

  if tasa <= 0 then
    return new;
  end if;

  -- Calcular el monto (redondear al peso)
  monto_gmf := ceil(new.monto * tasa);

  if monto_gmf <= 0 then
    return new;
  end if;

  -- Insertar el movimiento del GMF
  insert into public.movimientos_tesoreria (
    cuenta_id, fecha, tipo, categoria, monto, concepto,
    factura_compra_id, cotizacion_id, gasto_id, movimiento_socio_id,
    medio_pago, creado_por_id, creado_por_nombre, gmf_de_id
  ) values (
    new.cuenta_id,
    new.fecha,
    'EGRESO',
    'GMF',
    monto_gmf,
    'GMF (4x1000) ' || left(new.concepto, 80),
    new.factura_compra_id,
    new.cotizacion_id,
    new.gasto_id,
    new.movimiento_socio_id,
    'Cobro bancario',
    new.creado_por_id,
    new.creado_por_nombre,
    new.id
  );

  return new;
end;
$$;

comment on function public.generar_gmf is
  'Trigger: cada EGRESO genera automaticamente un segundo movimiento con el cobro del GMF (4x1000).';


-- 5. Trigger AFTER INSERT (no BEFORE, porque necesitamos el ID del movimiento padre)
drop trigger if exists trg_gmf_automatico on public.movimientos_tesoreria;
create trigger trg_gmf_automatico
  after insert on public.movimientos_tesoreria
  for each row execute function public.generar_gmf();


-- 6. Columna en cuentas para poder marcar una cuenta como exenta de GMF
-- (por si en el futuro abren una cuenta exenta)
alter table public.cuentas
  add column if not exists cobra_gmf boolean not null default true;

comment on column public.cuentas.cobra_gmf is
  'Si es false, los egresos de esta cuenta no generan movimiento de GMF. Para cuentas con exencion de GMF (primeras 350 UVT/mes).';


-- 7. Actualizar la vista libro_tesoreria para que muestre el GMF bonito
-- Hay que hacer DROP porque se agrego la columna gmf_de_id y PostgreSQL
-- no permite agregar columnas con CREATE OR REPLACE VIEW.
drop view if exists public.libro_tesoreria;

create view public.libro_tesoreria as
select
  mt.id,
  mt.fecha,
  mt.tipo,
  mt.categoria,
  mt.monto,
  mt.concepto,
  mt.medio_pago,
  mt.referencia,
  mt.soporte_url,
  mt.notas,
  mt.creado_por_nombre,
  mt.created_at,
  mt.movimiento_relacionado_id,
  mt.gmf_de_id,
  c.id            as cuenta_id,
  c.nombre        as cuenta_nombre,
  c.es_reserva    as cuenta_es_reserva,
  mt.cotizacion_id,
  cot.numero      as cotizacion_numero,
  mt.factura_venta_id,
  fv.numero_factura_dian,
  mt.factura_compra_id,
  fc.numero_factura,
  mt.gasto_id,
  g.concepto      as gasto_concepto,
  mt.movimiento_socio_id,
  s.nombre        as socio_nombre,
  case
    when mt.categoria = 'GMF' then 'GMF (4x1000)'
    when mt.movimiento_socio_id is not null then 'Socio: ' || coalesce(s.nombre, '')
    when mt.factura_venta_id    is not null then 'Factura venta ' || coalesce(fv.numero_factura_dian, '')
    when mt.factura_compra_id   is not null then 'Factura compra ' || coalesce(fc.numero_factura, '')
    when mt.gasto_id            is not null then 'Gasto: ' || coalesce(g.concepto, '')
    when mt.cotizacion_id       is not null then 'Venta ' || coalesce(cot.numero, '')
    when mt.categoria in ('TRASLADO_ENTRADA','TRASLADO_SALIDA') then 'Traslado entre cuentas'
    else 'Manual'
  end as origen
from public.movimientos_tesoreria mt
join public.cuentas c on c.id = mt.cuenta_id
left join public.cotizaciones   cot on cot.id = mt.cotizacion_id
left join public.facturas_venta  fv on fv.id  = mt.factura_venta_id
left join public.facturas_compra fc on fc.id  = mt.factura_compra_id
left join public.gastos           g on g.id   = mt.gasto_id
left join public.movimientos_socio ms on ms.id = mt.movimiento_socio_id
left join public.socios            s on s.id  = ms.socio_id;

comment on view public.libro_tesoreria is
  'Libro de caja con el origen de cada movimiento. Incluye el GMF automatico.';
