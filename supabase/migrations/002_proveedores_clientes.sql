-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Modulo: Proveedores y Clientes
-- Migracion 002
-- ============================================================
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query
-- ============================================================


-- ------------------------------------------------------------
-- Tabla: proveedores
-- Referencia: Flujo 6 (Registro de proveedor) en vision-erp.md
-- ------------------------------------------------------------
create table if not exists public.proveedores (
  id                  uuid primary key default gen_random_uuid(),
  razon_social        text        not null,
  nit                 text,
  nombre_comercial    text,
  -- Contacto
  contacto_nombre     text,
  contacto_telefono   text,
  contacto_email      text,
  contacto_cargo      text,
  -- Direccion
  direccion           text,
  ciudad              text,
  departamento        text,
  -- Comercial
  categorias          text[]      default '{}',
  condiciones_pago    text        default 'Contado',
  dias_credito        integer     default 0,
  descuento_volumen   text,
  tiempo_entrega      text,
  pedido_minimo       numeric(15,2),
  -- Bancario
  banco               text,
  tipo_cuenta         text,
  numero_cuenta       text,
  -- Estado y metadata
  estado              text        not null default 'ACTIVO'
                        check (estado in ('ACTIVO', 'INACTIVO', 'EN_EVALUACION')),
  calificacion        integer     default 0 check (calificacion >= 0 and calificacion <= 5),
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.proveedores is 'Directorio de proveedores de Abastecer Empresarial. Decision #019: registro formal.';

create index if not exists idx_proveedores_estado on public.proveedores(estado);
create index if not exists idx_proveedores_razon on public.proveedores(razon_social);


-- ------------------------------------------------------------
-- Tabla: clientes
-- Referencia: Flujo 7 (Registro de cliente) en vision-erp.md
-- ------------------------------------------------------------
create table if not exists public.clientes (
  id                  uuid primary key default gen_random_uuid(),
  razon_social        text        not null,
  nit                 text,
  nombre_comercial    text,
  -- Contacto compras
  contacto_nombre     text,
  contacto_telefono   text,
  contacto_email      text,
  contacto_cargo      text,
  -- Contacto pagos (puede ser diferente)
  contacto_pagos_nombre   text,
  contacto_pagos_telefono text,
  contacto_pagos_email    text,
  -- Direccion
  direccion_entrega   text,
  ciudad              text,
  departamento        text,
  -- Comercial
  sector              text,
  tamano              text        check (tamano is null or tamano in (
                        'MICRO', 'PEQUENA', 'MEDIANA', 'GRANDE'
                      )),
  categorias_interes  text[]      default '{}',
  -- Credito
  tiene_credito       boolean     not null default false,
  dias_credito        integer     default 0,
  cupo_credito        numeric(15,2) default 0,
  -- Estado y metadata
  estado              text        not null default 'PROSPECTO'
                        check (estado in (
                          'PROSPECTO', 'ACTIVO', 'CREDITO_APROBADO', 'INACTIVO', 'MOROSO'
                        )),
  origen              text,
  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.clientes is 'Directorio de clientes B2B de Abastecer. Decision #019: registro formal. Politica: primera venta siempre de contado.';

create index if not exists idx_clientes_estado on public.clientes(estado);
create index if not exists idx_clientes_razon on public.clientes(razon_social);


-- ------------------------------------------------------------
-- Triggers: mantener updated_at
-- ------------------------------------------------------------
drop trigger if exists trg_proveedores_updated_at on public.proveedores;
create trigger trg_proveedores_updated_at
  before update on public.proveedores
  for each row execute function public.set_updated_at();

drop trigger if exists trg_clientes_updated_at on public.clientes;
create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.proveedores enable row level security;
alter table public.clientes    enable row level security;

drop policy if exists "proveedores_auth_all" on public.proveedores;
create policy "proveedores_auth_all" on public.proveedores
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "clientes_auth_all" on public.clientes;
create policy "clientes_auth_all" on public.clientes
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- ------------------------------------------------------------
-- Dato semilla: Evolti como primer cliente
-- ------------------------------------------------------------
insert into public.clientes (razon_social, nombre_comercial, estado, sector, tamano, categorias_interes, origen, notas)
select 'Evolti SAS', 'Evolti', 'ACTIVO', 'Servicios', 'MEDIANA',
       array['EPP', 'Dotacion', 'Identificacion'],
       'Relacion laboral directa',
       'Primer cliente. Julio y Laura trabajan ahi actualmente. Base de datos de compras disponible como referencia de precios.'
where not exists (select 1 from public.clientes where razon_social = 'Evolti SAS');
