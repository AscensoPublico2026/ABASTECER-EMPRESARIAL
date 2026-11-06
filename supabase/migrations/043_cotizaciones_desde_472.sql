-- ============================================================
-- 043 · COTIZACIONES: LA COT-2026-072 PASA A COT-2026-472
-- ============================================================
--
-- Pedido del dueno: la cotizacion COT-2026-072 cambia de numero a
-- COT-2026-472 y desde ahi la numeracion sigue consecutiva:
-- la proxima cotizacion sera COT-2026-473, luego 474, etc.
--
-- QUE HACE
--   1. Renombra COT-2026-072 -> COT-2026-472 (solo el numero; el id,
--      los items, pagos, facturas, remisiones y documentos siguen
--      unidos a la misma cotizacion porque se relacionan por id).
--   2. Ajusta la funcion que numera las cotizaciones para que en 2026
--      nunca baje de 472. Como la funcion toma el mayor numero del ano
--      y le suma 1, despues del cambio la proxima sale 473.
--
-- Es idempotente: si ya se corrio, no vuelve a cambiar nada.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Renombrar la cotizacion
-- ------------------------------------------------------------
do $$
begin
  if exists (select 1 from public.cotizaciones where numero = 'COT-2026-472') then
    raise notice 'COT-2026-472 ya existe: no se cambia nada.';
  elsif exists (select 1 from public.cotizaciones where numero = 'COT-2026-072') then
    update public.cotizaciones
       set numero = 'COT-2026-472'
     where numero = 'COT-2026-072';
    raise notice 'COT-2026-072 renombrada a COT-2026-472.';
  else
    raise notice 'No se encontro COT-2026-072: no se renombro nada (la numeracion igual sigue desde 472).';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 2. Numeracion: en 2026 arranca minimo en 472
-- ------------------------------------------------------------
create or replace function public.generar_numero_cotizacion()
returns trigger
language plpgsql
as $$
declare
  anio text;
  siguiente integer;
begin
  if new.numero is null or new.numero = '' then
    anio := to_char(current_date, 'YYYY');
    select coalesce(max(
      cast(split_part(numero, '-', 3) as integer)
    ), 0) + 1
    into siguiente
    from public.cotizaciones
    where numero like 'COT-' || anio || '-%';

    -- Pedido del dueno (migracion 043): en 2026 la numeracion salta a 472.
    if anio = '2026' then
      siguiente := greatest(siguiente, 472);
    end if;

    new.numero := 'COT-' || anio || '-' || lpad(siguiente::text, 3, '0');
  end if;
  return new;
end;
$$;

comment on function public.generar_numero_cotizacion is
  'Genera el numero COT-AAAA-NNN (mayor del ano + 1). En 2026 nunca baja de 472 (migracion 043).';

-- ------------------------------------------------------------
-- Verificacion: ultimas cotizaciones de 2026 por numero
-- ------------------------------------------------------------
select numero, fecha, estado, total
from public.cotizaciones
where numero like 'COT-2026-%'
order by cast(split_part(numero, '-', 3) as integer) desc
limit 5;
