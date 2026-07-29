-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Gastos operativos
-- Migracion 011
-- ============================================================
-- Para registrar gastos que NO son compra de mercancia:
-- Camara de comercio, dominio, certificados, transporte, etc.
-- ============================================================

create table if not exists public.gastos (
  id              uuid primary key default gen_random_uuid(),
  fecha           date not null default current_date,
  concepto        text not null,
  categoria       text not null default 'OTROS' check (categoria in (
    'CONSTITUCION', 'IMPUESTOS', 'SERVICIOS', 'TRANSPORTE',
    'MARKETING', 'TECNOLOGIA', 'LEGAL', 'BANCARIO', 'OTROS'
  )),
  monto           numeric(15,2) not null check (monto > 0),
  iva_incluido    numeric(15,2) default 0,
  pagado_por      text,
  forma_pago      text default 'Efectivo',
  soporte_url     text,
  notas           text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_gastos_fecha on public.gastos(fecha desc);
create index if not exists idx_gastos_categoria on public.gastos(categoria);

alter table public.gastos enable row level security;
create policy "gastos_auth_all" on public.gastos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
