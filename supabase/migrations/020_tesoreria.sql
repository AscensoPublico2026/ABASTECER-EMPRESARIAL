-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Tesoreria
-- Migracion 020
-- ============================================================
-- Antes NO existia ninguna tabla de saldos ni movimientos de caja.
-- El "disponible" del Centro Financiero era una estimacion con
-- valores inventados (|| 500000, meses = facturas/4).
--
-- Ahora cada peso que entra o sale queda registrado con su origen.
-- El saldo de cada cuenta es la suma de sus movimientos.
-- ============================================================

-- ------------------------------------------------------------
-- Tabla: cuentas (donde esta la plata)
-- ------------------------------------------------------------
create table if not exists public.cuentas (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  tipo            text not null default 'BANCO'
                    check (tipo in ('BANCO','EFECTIVO','BILLETERA','RESERVA')),
  banco           text,
  numero_cuenta   text,
  saldo_inicial   numeric(15,2) not null default 0,
  es_reserva      boolean not null default false,
  activa          boolean not null default true,
  orden           integer not null default 0,
  notas           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.cuentas is 'Cuentas donde Abastecer guarda dinero. Incluye cuentas de reserva para impuestos.';
comment on column public.cuentas.es_reserva is
  'true = cuenta destinada a guardar plata que no es de la empresa (IVA, impuesto Simple). No cuenta como disponible.';

drop trigger if exists trg_cuentas_updated_at on public.cuentas;
create trigger trg_cuentas_updated_at
  before update on public.cuentas
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- Tabla: movimientos_tesoreria
-- ------------------------------------------------------------
create table if not exists public.movimientos_tesoreria (
  id                 uuid primary key default gen_random_uuid(),
  cuenta_id          uuid not null references public.cuentas(id) on delete restrict,
  fecha              date not null default current_date,
  tipo               text not null check (tipo in ('INGRESO','EGRESO')),
  categoria          text not null default 'OTRO'
                       check (categoria in (
                         'COBRO_CLIENTE','PAGO_PROVEEDOR','GASTO','PAGO_IMPUESTO',
                         'APORTE_SOCIO','PRESTAMO_SOCIO','DEVOLUCION_PRESTAMO','DIVIDENDO',
                         'TRASLADO_ENTRADA','TRASLADO_SALIDA','AJUSTE','OTRO'
                       )),
  monto              numeric(15,2) not null check (monto > 0),
  concepto           text not null,

  -- Trazabilidad: de donde viene este movimiento
  cotizacion_id      uuid references public.cotizaciones(id) on delete set null,
  factura_venta_id   uuid references public.facturas_venta(id) on delete set null,
  factura_compra_id  uuid references public.facturas_compra(id) on delete set null,
  gasto_id           uuid references public.gastos(id) on delete set null,
  movimiento_socio_id uuid references public.movimientos_socio(id) on delete set null,

  -- Detalle
  medio_pago         text default 'Transferencia',
  referencia         text,
  soporte_url        text,
  notas              text,
  creado_por_id      uuid,
  creado_por_nombre  text,
  created_at         timestamptz not null default now()
);

comment on table public.movimientos_tesoreria is
  'Libro de caja real. Cada entrada y salida de dinero con su origen trazable.';

create index if not exists idx_mt_cuenta     on public.movimientos_tesoreria(cuenta_id);
create index if not exists idx_mt_fecha      on public.movimientos_tesoreria(fecha desc);
create index if not exists idx_mt_tipo       on public.movimientos_tesoreria(tipo);
create index if not exists idx_mt_categoria  on public.movimientos_tesoreria(categoria);
create index if not exists idx_mt_cotizacion on public.movimientos_tesoreria(cotizacion_id);
create index if not exists idx_mt_fv         on public.movimientos_tesoreria(factura_venta_id);
create index if not exists idx_mt_fc         on public.movimientos_tesoreria(factura_compra_id);


-- ------------------------------------------------------------
-- Vista: saldo de cada cuenta
-- ------------------------------------------------------------
create or replace view public.saldos_cuentas as
select
  c.id,
  c.nombre,
  c.tipo,
  c.banco,
  c.numero_cuenta,
  c.es_reserva,
  c.activa,
  c.orden,
  c.saldo_inicial,
  coalesce(sum(case when m.tipo = 'INGRESO' then m.monto else 0 end), 0) as total_ingresos,
  coalesce(sum(case when m.tipo = 'EGRESO'  then m.monto else 0 end), 0) as total_egresos,
  c.saldo_inicial
    + coalesce(sum(case when m.tipo = 'INGRESO' then m.monto else 0 end), 0)
    - coalesce(sum(case when m.tipo = 'EGRESO'  then m.monto else 0 end), 0) as saldo_actual,
  count(m.id) as num_movimientos
from public.cuentas c
left join public.movimientos_tesoreria m on m.cuenta_id = c.id
group by c.id, c.nombre, c.tipo, c.banco, c.numero_cuenta,
         c.es_reserva, c.activa, c.orden, c.saldo_inicial;

comment on view public.saldos_cuentas is 'Saldo actual de cada cuenta = saldo inicial + ingresos - egresos.';


-- ------------------------------------------------------------
-- Cuentas iniciales de Abastecer
-- ------------------------------------------------------------
insert into public.cuentas (nombre, tipo, banco, numero_cuenta, es_reserva, orden, notas) values
  ('Bold - Cuenta principal', 'BANCO', 'Bold. Compania de Financiamiento S.A.', '1700-1337-9217', false, 1, 'Cuenta operativa de la empresa'),
  ('Efectivo caja',           'EFECTIVO', null, null, false, 2, 'Dinero en efectivo'),
  ('Reserva impuestos',       'RESERVA', null, null, true,  3, 'IVA e impuesto Simple. Esta plata NO es de la empresa.')
on conflict do nothing;


-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.cuentas enable row level security;
alter table public.movimientos_tesoreria enable row level security;

drop policy if exists "cuentas_auth_all" on public.cuentas;
create policy "cuentas_auth_all" on public.cuentas
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "mt_auth_all" on public.movimientos_tesoreria;
create policy "mt_auth_all" on public.movimientos_tesoreria
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
