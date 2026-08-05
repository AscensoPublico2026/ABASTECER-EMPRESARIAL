-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Remisiones desde el 200
-- Migracion 028
-- ============================================================
-- La numeracion de remisiones arrancaba en 051. Ahora arranca en 201.
-- La proxima remision sera REM-2026-201.
-- ============================================================

create or replace function public.generar_numero_remision()
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
    ), 200) + 1
    into siguiente
    from public.remisiones
    where numero like 'REM-' || anio || '-%';

    new.numero := 'REM-' || anio || '-' || lpad(siguiente::text, 3, '0');
  end if;
  return new;
end;
$$;

comment on function public.generar_numero_remision is
  'Genera el numero de remision REM-AAAA-NNN. Arranca en 201.';
