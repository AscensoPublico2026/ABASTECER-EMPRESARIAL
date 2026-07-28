-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Modulo 1: Socios y Capital
-- Migracion 001
-- ============================================================
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query
-- ============================================================


-- ------------------------------------------------------------
-- Tabla: socios
-- ------------------------------------------------------------
create table if not exists public.socios (
  id                uuid primary key default gen_random_uuid(),
  nombre            text        not null,
  documento         text,
  email             text,
  telefono          text,
  cargo             text,
  participacion_pct numeric(5,2) not null default 0
                      check (participacion_pct >= 0 and participacion_pct <= 100),
  activo            boolean     not null default true,
  notas             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table  public.socios is 'Socios/accionistas de Abastecer Empresarial SAS';
comment on column public.socios.participacion_pct is 'Porcentaje de participacion accionaria. Define el reparto de dividendos.';


-- ------------------------------------------------------------
-- Tabla: movimientos_socio
-- ------------------------------------------------------------
-- Politica #011 (Retiro Clasificado): toda entrada o salida de dinero
-- entre la empresa y un socio DEBE tener un tipo definido.
--
--   APORTE_CAPITAL       Socio -> Empresa. Permanente. Suma al capital social.
--   PRESTAMO_SOCIO       Socio -> Empresa. Temporal. La empresa queda debiendo.
--   DEVOLUCION_PRESTAMO  Empresa -> Socio. Paga un prestamo previo.
--   DIVIDENDO            Empresa -> Socio. Reparto de utilidades (requiere semaforo verde).
--   REMUNERACION         Empresa -> Socio. Pago por trabajo realizado (sombrero trabajador).
--   REEMBOLSO            Empresa -> Socio. Devuelve un gasto que el socio pago de su bolsillo.
-- ------------------------------------------------------------
create table if not exists public.movimientos_socio (
  id          uuid primary key default gen_random_uuid(),
  socio_id    uuid not null references public.socios(id) on delete cascade,
  tipo        text not null check (tipo in (
                'APORTE_CAPITAL',
                'PRESTAMO_SOCIO',
                'DEVOLUCION_PRESTAMO',
                'DIVIDENDO',
                'REMUNERACION',
                'REEMBOLSO'
              )),
  monto       numeric(15,2) not null check (monto > 0),
  fecha       date        not null default current_date,
  descripcion text,
  soporte_url text,
  created_at  timestamptz not null default now()
);

comment on table  public.movimientos_socio is 'Movimientos de dinero entre la empresa y sus socios. Politica #011: todo movimiento clasificado.';
comment on column public.movimientos_socio.soporte_url is 'URL del soporte documental (factura, comprobante, acta).';

create index if not exists idx_movimientos_socio_socio  on public.movimientos_socio(socio_id);
create index if not exists idx_movimientos_socio_tipo   on public.movimientos_socio(tipo);
create index if not exists idx_movimientos_socio_fecha  on public.movimientos_socio(fecha desc);


-- ------------------------------------------------------------
-- Vista: resumen_socios
-- Consolida por socio los totales de cada tipo de movimiento.
-- ------------------------------------------------------------
create or replace view public.resumen_socios as
select
  s.id,
  s.nombre,
  s.cargo,
  s.participacion_pct,
  s.activo,
  coalesce(sum(m.monto) filter (where m.tipo = 'APORTE_CAPITAL'),      0) as capital_aportado,
  coalesce(sum(m.monto) filter (where m.tipo = 'PRESTAMO_SOCIO'),      0) as prestamos_otorgados,
  coalesce(sum(m.monto) filter (where m.tipo = 'DEVOLUCION_PRESTAMO'), 0) as prestamos_devueltos,
  coalesce(sum(m.monto) filter (where m.tipo = 'PRESTAMO_SOCIO'),      0)
    - coalesce(sum(m.monto) filter (where m.tipo = 'DEVOLUCION_PRESTAMO'), 0) as prestamo_pendiente,
  coalesce(sum(m.monto) filter (where m.tipo = 'DIVIDENDO'),           0) as dividendos_recibidos,
  coalesce(sum(m.monto) filter (where m.tipo = 'REMUNERACION'),        0) as remuneracion_total,
  coalesce(sum(m.monto) filter (where m.tipo = 'REEMBOLSO'),           0) as reembolsos_total
from public.socios s
left join public.movimientos_socio m on m.socio_id = s.id
group by s.id, s.nombre, s.cargo, s.participacion_pct, s.activo;


-- ------------------------------------------------------------
-- Trigger: mantener updated_at
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_socios_updated_at on public.socios;
create trigger trg_socios_updated_at
  before update on public.socios
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.socios            enable row level security;
alter table public.movimientos_socio enable row level security;

-- Solo usuarios autenticados pueden leer y escribir.
drop policy if exists "socios_auth_all" on public.socios;
create policy "socios_auth_all" on public.socios
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "movimientos_auth_all" on public.movimientos_socio;
create policy "movimientos_auth_all" on public.movimientos_socio
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- ------------------------------------------------------------
-- Datos semilla: los dos socios fundadores (50/50)
-- ------------------------------------------------------------
insert into public.socios (nombre, cargo, participacion_pct, activo, notas)
select 'Julio', 'Socio fundador', 50.00, true, 'Socio fundador. Desarrollo del ERP y estrategia.'
where not exists (select 1 from public.socios where nombre = 'Julio');

insert into public.socios (nombre, cargo, participacion_pct, activo, notas)
select 'Laura', 'Socia fundadora', 50.00, true, 'Socia fundadora. Operaciones y estrategia comercial.'
where not exists (select 1 from public.socios where nombre = 'Laura');
