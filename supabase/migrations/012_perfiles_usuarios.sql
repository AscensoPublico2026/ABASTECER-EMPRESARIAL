-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Perfiles de Usuario
-- Migracion 012
-- ============================================================
-- Sistema de perfiles: maestros (Julio, Laura) + empleados
-- Cada perfil se vincula a un auth.users via user_id
-- Los modulos asignados controlan que puede ver cada persona
-- ============================================================

-- ------------------------------------------------------------
-- Tabla: perfiles
-- ------------------------------------------------------------
create table if not exists public.perfiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique references auth.users(id) on delete set null,
  nombre          text not null,
  email           text not null,
  rol             text not null default 'EMPLEADO'
                    check (rol in ('MAESTRO', 'EMPLEADO')),
  cargo           text,
  -- Modulos asignados (array de strings)
  -- Ej: ['ventas','compras','inventario','gastos','clientes','proveedores','facturacion','financiero','socios','indicadores']
  modulos         text[] not null default '{}',
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.perfiles is 'Perfiles de usuario del ERP. Maestros ven todo, empleados solo modulos asignados.';

create index if not exists idx_perfiles_user_id on public.perfiles(user_id);
create index if not exists idx_perfiles_rol on public.perfiles(rol);
create index if not exists idx_perfiles_activo on public.perfiles(activo);

-- Trigger updated_at
drop trigger if exists trg_perfiles_updated_at on public.perfiles;
create trigger trg_perfiles_updated_at
  before update on public.perfiles
  for each row execute function public.set_updated_at();

-- RLS
alter table public.perfiles enable row level security;
create policy "perfiles_auth_all" on public.perfiles
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- Agregar campos de usuario a cotizaciones y facturas_venta
-- Estos campos guardan QUIEN hizo la operacion
-- ------------------------------------------------------------
alter table public.cotizaciones
  add column if not exists creado_por_id uuid references public.perfiles(id),
  add column if not exists creado_por_nombre text;

alter table public.facturas_venta
  add column if not exists creado_por_id uuid references public.perfiles(id),
  add column if not exists creado_por_nombre text;

alter table public.facturas_compra
  add column if not exists creado_por_id uuid references public.perfiles(id),
  add column if not exists creado_por_nombre text;

-- ------------------------------------------------------------
-- Insertar perfiles maestros iniciales (Julio y Laura)
-- NOTA: Los user_id se vinculan despues cuando ellos inicien sesion
-- por ahora dejamos null y se vincula automaticamente
-- ------------------------------------------------------------
-- (Se crean desde la interfaz o se vinculan manualmente)
