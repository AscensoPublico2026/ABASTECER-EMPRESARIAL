-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Remisiones de entrega
-- Migracion 016
-- ============================================================
-- El codigo ya usaba la tabla 'remisiones' y las columnas
-- cotizaciones.remision_* pero nunca se crearon. Esta migracion
-- las formaliza.
--
-- Una remision permite entregar mercancia SIN factura todavia.
-- Flujo: EN_ALISTAMIENTO -> (remision) -> DESPACHADA -> (factura) -> FACTURADA
-- ============================================================

-- ------------------------------------------------------------
-- Columnas de remision en cotizaciones
-- ------------------------------------------------------------
alter table public.cotizaciones
  add column if not exists remision_numero        text,
  add column if not exists remision_fecha         date,
  add column if not exists remision_observaciones text;

comment on column public.cotizaciones.remision_numero is 'Numero de la remision con la que se entrego (REM-AAAA-NNN)';


-- ------------------------------------------------------------
-- Tabla: remisiones
-- ------------------------------------------------------------
create table if not exists public.remisiones (
  id                 uuid primary key default gen_random_uuid(),
  numero             text not null unique,
  cotizacion_id      uuid not null references public.cotizaciones(id) on delete cascade,
  cliente_id         uuid references public.clientes(id),
  fecha              date not null default current_date,
  -- Entrega
  recibido_por       text,
  recibido_documento text,
  firmada_url        text,
  -- Meta
  observaciones      text,
  creado_por_id      uuid,
  creado_por_nombre  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.remisiones is 'Comprobantes de entrega de mercancia sin factura. No son documento fiscal.';

create index if not exists idx_rem_cotizacion on public.remisiones(cotizacion_id);
create index if not exists idx_rem_cliente    on public.remisiones(cliente_id);
create index if not exists idx_rem_fecha      on public.remisiones(fecha desc);


-- ------------------------------------------------------------
-- Funcion: generar numero REM-AAAA-NNN
-- Arranca en 051 por decision del negocio (numeracion previa manual)
-- ------------------------------------------------------------
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
    ), 50) + 1
    into siguiente
    from public.remisiones
    where numero like 'REM-' || anio || '-%';

    new.numero := 'REM-' || anio || '-' || lpad(siguiente::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_numero_remision on public.remisiones;
create trigger trg_numero_remision
  before insert on public.remisiones
  for each row execute function public.generar_numero_remision();

drop trigger if exists trg_rem_updated_at on public.remisiones;
create trigger trg_rem_updated_at
  before update on public.remisiones
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.remisiones enable row level security;

drop policy if exists "remisiones_auth_all" on public.remisiones;
create policy "remisiones_auth_all" on public.remisiones
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
