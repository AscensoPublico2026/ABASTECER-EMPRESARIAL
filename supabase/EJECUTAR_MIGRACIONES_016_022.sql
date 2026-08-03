-- ============================================================
-- ABASTECER EMPRESARIAL SAS
-- MOTOR FINANCIERO v2 — Migraciones 016 a 022 en un solo archivo
-- ============================================================
-- COMO EJECUTAR:
--   1. Supabase Dashboard -> SQL Editor -> New query
--   2. Pegar TODO este archivo
--   3. Run
--
-- Es idempotente: se puede correr varias veces sin romper nada.
--
-- QUE INSTALA:
--   016  Tabla remisiones (el codigo ya la usaba y no existia)
--   017  asignacion_costos: costo REAL por venta (opcion C)
--   018  Gastos por venta + documentos_soporte DIAN
--   019  config_tributaria: fin de las tasas quemadas en codigo
--   020  Tesoreria: cuentas, movimientos, saldos
--   021  Vistas analisis_venta / analisis_venta_items / trazabilidad_venta
--   022  Vistas posicion_financiera / obligaciones_por_periodo
-- ============================================================



-- ############################################################
-- ARCHIVO: migrations/016_remisiones.sql
-- ############################################################
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


-- ############################################################
-- ARCHIVO: migrations/017_asignacion_costos.sql
-- ############################################################
-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Asignacion de costos reales
-- Migracion 017
-- ============================================================
-- NUCLEO DEL MODELO DE COSTO (Opcion C - hibrido).
--
-- Problema que resuelve:
--   Antes el costo de una venta se tomaba del costo_promedio ponderado
--   del producto. Eso hace que la utilidad de una venta CAMBIE cada vez
--   que se compra el mismo producto a otro precio.
--
-- Solucion:
--   Cada linea de factura de compra se reparte entre:
--     - una o varias cotizaciones (destino = VENTA)
--     - inventario general        (destino = STOCK)
--   Se guarda el costo REAL pagado en esa compra. La utilidad de una
--   venta queda congelada y auditable.
--
-- costo_promedio sigue existiendo para valorar el inventario.
-- asignacion_costos manda para calcular la utilidad de una venta.
-- ============================================================

create table if not exists public.asignacion_costos (
  id                     uuid primary key default gen_random_uuid(),

  -- De donde viene el costo
  factura_compra_id      uuid not null references public.facturas_compra(id) on delete cascade,
  factura_compra_item_id uuid not null references public.factura_compra_items(id) on delete cascade,
  producto_id            uuid references public.productos(id),

  -- A donde va
  destino                text not null default 'VENTA'
                           check (destino in ('VENTA','STOCK')),
  cotizacion_id          uuid references public.cotizaciones(id) on delete set null,

  -- Cuanto y a que costo real
  cantidad               numeric(12,2) not null check (cantidad > 0),
  costo_unitario         numeric(15,2) not null default 0,
  iva_unitario           numeric(15,2) not null default 0,
  subtotal               numeric(15,2) not null default 0,
  iva_valor              numeric(15,2) not null default 0,

  notas                  text,
  created_at             timestamptz not null default now(),

  -- Si va a una venta, la cotizacion es obligatoria
  constraint chk_destino_venta
    check (destino <> 'VENTA' or cotizacion_id is not null)
);

comment on table public.asignacion_costos is
  'Reparte cada linea de compra entre ventas especificas y/o stock, guardando el costo REAL pagado. Fuente de verdad para la utilidad de una venta.';
comment on column public.asignacion_costos.destino is
  'VENTA = el costo se imputa a una cotizacion. STOCK = queda en inventario para ventas futuras.';
comment on column public.asignacion_costos.costo_unitario is
  'Precio real pagado al proveedor en ESTA compra, sin IVA. No es promedio ponderado.';

create index if not exists idx_ac_factura    on public.asignacion_costos(factura_compra_id);
create index if not exists idx_ac_item       on public.asignacion_costos(factura_compra_item_id);
create index if not exists idx_ac_cotizacion on public.asignacion_costos(cotizacion_id);
create index if not exists idx_ac_producto   on public.asignacion_costos(producto_id);
create index if not exists idx_ac_destino    on public.asignacion_costos(destino);


-- ------------------------------------------------------------
-- Trigger: calcular subtotal e iva_valor
-- ------------------------------------------------------------
create or replace function public.calcular_asignacion_costo()
returns trigger
language plpgsql
as $$
begin
  new.subtotal  := round(new.cantidad * new.costo_unitario, 2);
  new.iva_valor := round(new.cantidad * new.iva_unitario, 2);
  return new;
end;
$$;

drop trigger if exists trg_calcular_asignacion on public.asignacion_costos;
create trigger trg_calcular_asignacion
  before insert or update on public.asignacion_costos
  for each row execute function public.calcular_asignacion_costo();


-- ------------------------------------------------------------
-- Trigger: no asignar mas cantidad de la que se compro
-- ------------------------------------------------------------
create or replace function public.validar_cantidad_asignada()
returns trigger
language plpgsql
as $$
declare
  cantidad_comprada numeric;
  cantidad_asignada numeric;
begin
  select cantidad into cantidad_comprada
  from public.factura_compra_items
  where id = new.factura_compra_item_id;

  if cantidad_comprada is null then
    raise exception 'La linea de factura de compra no existe';
  end if;

  select coalesce(sum(cantidad), 0) into cantidad_asignada
  from public.asignacion_costos
  where factura_compra_item_id = new.factura_compra_item_id
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if (cantidad_asignada + new.cantidad) > cantidad_comprada then
    raise exception 'Asignacion invalida: se compraron % unidades y se intenta asignar % (ya asignadas: %)',
      cantidad_comprada, new.cantidad, cantidad_asignada;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_asignacion on public.asignacion_costos;
create trigger trg_validar_asignacion
  before insert or update on public.asignacion_costos
  for each row execute function public.validar_cantidad_asignada();


-- ------------------------------------------------------------
-- Vista: cuanto queda sin asignar de cada linea de compra
-- ------------------------------------------------------------
create or replace view public.compra_items_pendientes_asignar as
select
  fci.id                                   as factura_compra_item_id,
  fci.factura_compra_id,
  fc.numero_factura,
  fc.fecha_factura,
  p.razon_social                           as proveedor,
  fci.producto_id,
  fci.descripcion,
  fci.cantidad                             as cantidad_comprada,
  coalesce(sum(ac.cantidad), 0)            as cantidad_asignada,
  fci.cantidad - coalesce(sum(ac.cantidad), 0) as cantidad_pendiente,
  fci.precio_unitario                      as costo_unitario,
  case when fci.cantidad > 0
       then round(fci.iva_valor / fci.cantidad, 2)
       else 0 end                          as iva_unitario
from public.factura_compra_items fci
join public.facturas_compra fc on fc.id = fci.factura_compra_id
left join public.proveedores p on p.id = fc.proveedor_id
left join public.asignacion_costos ac on ac.factura_compra_item_id = fci.id
where fc.estado <> 'ANULADA'
group by fci.id, fci.factura_compra_id, fc.numero_factura, fc.fecha_factura,
         p.razon_social, fci.producto_id, fci.descripcion, fci.cantidad,
         fci.precio_unitario, fci.iva_valor;

comment on view public.compra_items_pendientes_asignar is
  'Lineas de compra con saldo sin asignar. Sirve para completar la trazabilidad.';


-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.asignacion_costos enable row level security;

drop policy if exists "ac_auth_all" on public.asignacion_costos;
create policy "ac_auth_all" on public.asignacion_costos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- ############################################################
-- ARCHIVO: migrations/018_gastos_venta_documento_soporte.sql
-- ############################################################
-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Gastos por venta y Documento Soporte
-- Migracion 018
-- ============================================================
-- Caso real que resuelve (COT-2026-012):
--   Se cobro un flete de $40.000 + IVA al cliente.
--   El transporte lo hizo un particular que cobro $60.000 sin factura.
--   Ese costo debe:
--     1. imputarse a la venta (para que la utilidad sea real)
--     2. quedar documentado con Documento Soporte para ser deducible
--
-- Un gasto puede ser:
--   COSTO DE VENTA    -> es_costo_venta = true  + cotizacion_id
--   GASTO OPERATIVO   -> es_costo_venta = false (arriendo, dominio, etc.)
-- ============================================================

-- ------------------------------------------------------------
-- Ampliar tabla gastos
-- ------------------------------------------------------------
alter table public.gastos
  add column if not exists cotizacion_id    uuid references public.cotizaciones(id) on delete set null,
  add column if not exists es_costo_venta   boolean not null default false,
  add column if not exists tiene_soporte    boolean not null default false,
  add column if not exists deducible        boolean not null default false,
  add column if not exists tercero_nombre   text,
  add column if not exists tercero_documento text;

comment on column public.gastos.cotizacion_id is
  'Si el gasto pertenece a una venta especifica (flete, mano de obra), se vincula aqui.';
comment on column public.gastos.es_costo_venta is
  'true = entra al costo de la venta y baja la utilidad de esa cotizacion. false = gasto operativo general.';
comment on column public.gastos.deducible is
  'true solo si hay factura o Documento Soporte valido. Sin soporte NO es deducible de renta/Simple.';

create index if not exists idx_gastos_cotizacion on public.gastos(cotizacion_id);
create index if not exists idx_gastos_costo_venta on public.gastos(es_costo_venta);


-- ------------------------------------------------------------
-- Tabla: documentos_soporte
-- Art. 55 Resolucion DIAN 000042 de 2020
-- Documento soporte en adquisiciones con no obligados a facturar
-- ------------------------------------------------------------
create table if not exists public.documentos_soporte (
  id                     uuid primary key default gen_random_uuid(),
  numero                 text not null unique,
  fecha                  date not null default current_date,

  -- Tercero (persona no obligada a facturar)
  tercero_nombre         text not null,
  tercero_tipo_documento text not null default 'CC'
                           check (tercero_tipo_documento in ('CC','CE','NIT','PASAPORTE','PEP')),
  tercero_documento      text not null,
  tercero_direccion      text,
  tercero_telefono       text,
  tercero_ciudad         text,

  -- Operacion
  concepto               text not null,
  cantidad               numeric(12,2) not null default 1,
  valor_unitario         numeric(15,2) not null,
  subtotal               numeric(15,2) not null default 0,

  -- Vinculos
  cotizacion_id          uuid references public.cotizaciones(id) on delete set null,
  gasto_id               uuid references public.gastos(id) on delete set null,

  -- Meta
  observaciones          text,
  pdf_url                text,
  creado_por_id          uuid,
  creado_por_nombre      text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.documentos_soporte is
  'Documento soporte en adquisiciones con no obligados a facturar. Lo emite Abastecer como comprador para poder deducir el gasto.';

create index if not exists idx_ds_cotizacion on public.documentos_soporte(cotizacion_id);
create index if not exists idx_ds_gasto      on public.documentos_soporte(gasto_id);
create index if not exists idx_ds_fecha      on public.documentos_soporte(fecha desc);
create index if not exists idx_ds_tercero    on public.documentos_soporte(tercero_documento);

-- Vinculo inverso desde gastos
alter table public.gastos
  add column if not exists documento_soporte_id uuid references public.documentos_soporte(id) on delete set null;


-- ------------------------------------------------------------
-- Trigger: numero DS-AAAA-NNN + subtotal
-- ------------------------------------------------------------
create or replace function public.preparar_documento_soporte()
returns trigger
language plpgsql
as $$
declare
  anio text;
  siguiente integer;
begin
  new.subtotal := round(new.cantidad * new.valor_unitario, 2);

  if new.numero is null or new.numero = '' then
    anio := to_char(coalesce(new.fecha, current_date), 'YYYY');
    select coalesce(max(
      cast(split_part(numero, '-', 3) as integer)
    ), 0) + 1
    into siguiente
    from public.documentos_soporte
    where numero like 'DS-' || anio || '-%';

    new.numero := 'DS-' || anio || '-' || lpad(siguiente::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_preparar_ds on public.documentos_soporte;
create trigger trg_preparar_ds
  before insert on public.documentos_soporte
  for each row execute function public.preparar_documento_soporte();

drop trigger if exists trg_ds_subtotal_update on public.documentos_soporte;
create trigger trg_ds_subtotal_update
  before update on public.documentos_soporte
  for each row execute function public.preparar_documento_soporte();

drop trigger if exists trg_ds_updated_at on public.documentos_soporte;
create trigger trg_ds_updated_at
  before update on public.documentos_soporte
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.documentos_soporte enable row level security;

drop policy if exists "ds_auth_all" on public.documentos_soporte;
create policy "ds_auth_all" on public.documentos_soporte
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- ############################################################
-- ARCHIVO: migrations/019_config_tributaria.sql
-- ############################################################
-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Configuracion tributaria
-- Migracion 019
-- ============================================================
-- Antes las tasas estaban quemadas en el codigo:
--   * 0.05  en ventas/actions.ts y compras/actions.ts
--   default 19.00 en varias tablas
--
-- Si cambia la tarifa del Regimen Simple o el IVA, habia que
-- tocar codigo y desplegar. Ahora se cambia un registro.
-- ============================================================

create table if not exists public.config_tributaria (
  id             uuid primary key default gen_random_uuid(),
  clave          text not null unique,
  valor          numeric(15,4) not null,
  unidad         text not null default 'PORCENTAJE'
                   check (unidad in ('PORCENTAJE','PESOS','UVT','NUMERO')),
  descripcion    text,
  vigente_desde  date not null default current_date,
  editable       boolean not null default true,
  updated_at     timestamptz not null default now()
);

comment on table public.config_tributaria is
  'Parametros tributarios. Evita tener tasas quemadas en el codigo.';

drop trigger if exists trg_config_trib_updated_at on public.config_tributaria;
create trigger trg_config_trib_updated_at
  before update on public.config_tributaria
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- Valores iniciales (Colombia 2026)
-- ------------------------------------------------------------
insert into public.config_tributaria (clave, valor, unidad, descripcion) values
  ('IVA_GENERAL',            19.0000, 'PORCENTAJE', 'Tarifa general de IVA'),
  ('SIMPLE_TARIFA',           5.0000, 'PORCENTAJE', 'Tarifa Regimen Simple de Tributacion para comercio al por mayor (grupo 2)'),
  ('UVT',                 49799.0000, 'PESOS',      'Unidad de Valor Tributario 2026'),
  ('RETEFUENTE_COMPRAS',      2.5000, 'PORCENTAJE', 'Retencion en la fuente por compras generales'),
  ('RETEFUENTE_SERVICIOS',    4.0000, 'PORCENTAJE', 'Retencion en la fuente por servicios'),
  ('RETEICA_CALI',            0.4140, 'PORCENTAJE', 'ReteICA Cali comercio (por mil / 100)'),
  ('RETEIVA',                15.0000, 'PORCENTAJE', 'ReteIVA sobre el valor del IVA'),
  ('MARGEN_MINIMO_VENTA',    30.0000, 'PORCENTAJE', 'Margen bruto minimo aceptable en una venta (politica interna)')
on conflict (clave) do nothing;


-- ------------------------------------------------------------
-- Funcion helper para leer un parametro
-- ------------------------------------------------------------
create or replace function public.param_tributario(p_clave text)
returns numeric
language sql
stable
as $$
  select coalesce((select valor from public.config_tributaria where clave = p_clave), 0);
$$;

comment on function public.param_tributario is
  'Devuelve el valor de un parametro tributario. Uso: select param_tributario(''SIMPLE_TARIFA'')';


-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.config_tributaria enable row level security;

drop policy if exists "config_trib_auth_all" on public.config_tributaria;
create policy "config_trib_auth_all" on public.config_tributaria
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- ############################################################
-- ARCHIVO: migrations/020_tesoreria.sql
-- ############################################################
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


-- ############################################################
-- ARCHIVO: migrations/021_analisis_venta.sql
-- ############################################################
-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Analisis financiero por venta
-- Migracion 021
-- ============================================================
-- Esta vista replica EXACTAMENTE el analisis del Excel
-- "PLANTILLA Analisis de Venta" pero calculado automaticamente.
--
-- Referencia validada con COT-2026-012:
--   venta_subtotal        1.280.000
--   iva_cobrado             243.200
--   costo_real              656.639   (196.639 + 400.000 + 60.000 flete)
--   iva_pagado              113.361
--   iva_neto_dian           129.839
--   utilidad_bruta          623.361
--   impuesto_simple          64.000
--   retenciones              36.480
--   utilidad_neta           559.361
--   total_a_separar         157.359
-- ============================================================

-- ------------------------------------------------------------
-- Vista principal: analisis_venta
-- ------------------------------------------------------------
create or replace view public.analisis_venta as
with
-- Costos que vienen de facturas de compra asignadas a esta venta
costos_compra as (
  select
    ac.cotizacion_id,
    sum(ac.subtotal)  as costo_compras,
    sum(ac.iva_valor) as iva_compras,
    count(distinct ac.factura_compra_id) as num_facturas_compra
  from public.asignacion_costos ac
  where ac.destino = 'VENTA' and ac.cotizacion_id is not null
  group by ac.cotizacion_id
),
-- Costos que vienen de gastos imputados a esta venta (fletes, mano de obra)
costos_gasto as (
  select
    g.cotizacion_id,
    sum(g.monto - coalesce(g.iva_incluido, 0)) as costo_gastos,
    sum(coalesce(g.iva_incluido, 0))           as iva_gastos,
    sum(case when g.deducible then 0 else g.monto end) as costo_no_deducible,
    count(*)                                    as num_gastos,
    count(*) filter (where not g.tiene_soporte) as num_gastos_sin_soporte
  from public.gastos g
  where g.cotizacion_id is not null and g.es_costo_venta = true
  group by g.cotizacion_id
),
tarifas as (
  select
    public.param_tributario('SIMPLE_TARIFA') as simple_pct,
    public.param_tributario('IVA_GENERAL')   as iva_pct
)
select
  c.id                                        as cotizacion_id,
  c.numero,
  c.cliente_id,
  cl.razon_social                             as cliente_nombre,
  c.fecha,
  c.estado,
  c.forma_pago,
  c.dias_credito,

  -- ---------- VENTA ----------
  c.subtotal                                  as venta_subtotal,
  c.iva_total                                 as iva_cobrado,
  c.total                                     as venta_total,

  -- ---------- COSTOS ----------
  coalesce(cc.costo_compras, 0)               as costo_compras,
  coalesce(cg.costo_gastos, 0)                as costo_gastos,
  coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0) as costo_real,

  -- ---------- IVA ----------
  coalesce(cc.iva_compras, 0)                 as iva_compras,
  coalesce(cg.iva_gastos, 0)                  as iva_gastos,
  coalesce(cc.iva_compras, 0) + coalesce(cg.iva_gastos, 0)     as iva_pagado,
  c.iva_total - (coalesce(cc.iva_compras, 0) + coalesce(cg.iva_gastos, 0)) as iva_neto_dian,

  -- ---------- UTILIDAD BRUTA ----------
  c.subtotal - (coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0)) as utilidad_bruta,
  case when c.subtotal > 0
       then round(
              ((c.subtotal - (coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0)))
               / c.subtotal) * 100, 2)
       else 0 end                             as margen_bruto_pct,

  -- ---------- IMPUESTOS ----------
  round(c.subtotal * t.simple_pct / 100, 2)   as impuesto_simple,
  coalesce(c.retencion_total, 0)              as retenciones,
  coalesce(c.retencion_retefuente, 0)         as retencion_retefuente,
  coalesce(c.retencion_reteiva, 0)            as retencion_reteiva,
  coalesce(c.retencion_reteica, 0)            as retencion_reteica,
  greatest(round(c.subtotal * t.simple_pct / 100, 2) - coalesce(c.retencion_total, 0), 0)
                                              as impuesto_simple_pendiente,

  -- ---------- UTILIDAD NETA ----------
  c.subtotal
    - (coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0))
    - round(c.subtotal * t.simple_pct / 100, 2)                  as utilidad_neta,
  case when c.subtotal > 0
       then round(
              ((c.subtotal
                - (coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0))
                - round(c.subtotal * t.simple_pct / 100, 2))
               / c.subtotal) * 100, 2)
       else 0 end                             as margen_neto_pct,

  -- ---------- DINERO A SEPARAR ----------
  (c.iva_total - (coalesce(cc.iva_compras, 0) + coalesce(cg.iva_gastos, 0)))
    + greatest(round(c.subtotal * t.simple_pct / 100, 2) - coalesce(c.retencion_total, 0), 0)
                                              as total_a_separar,

  -- ---------- FLUJO DE CAJA ----------
  coalesce(c.monto_recibido, 0)               as monto_recibido,

  -- ---------- CALIDAD DEL DATO ----------
  coalesce(cc.num_facturas_compra, 0)         as num_facturas_compra,
  coalesce(cg.num_gastos, 0)                  as num_gastos,
  coalesce(cg.num_gastos_sin_soporte, 0)      as num_gastos_sin_soporte,
  coalesce(cg.costo_no_deducible, 0)          as costo_no_deducible,
  (coalesce(cc.costo_compras, 0) + coalesce(cg.costo_gastos, 0)) > 0 as tiene_costo_asignado

from public.cotizaciones c
cross join tarifas t
left join public.clientes cl on cl.id = c.cliente_id
left join costos_compra cc   on cc.cotizacion_id = c.id
left join costos_gasto  cg   on cg.cotizacion_id = c.id;

comment on view public.analisis_venta is
  'Analisis financiero completo por venta: costo real, IVA neto, utilidad bruta y neta, impuestos y dinero a separar. Equivale al Excel de analisis manual.';


-- ------------------------------------------------------------
-- Vista: analisis por item (compra vs venta unitario)
-- Replica la tabla "EL NEGOCIO EN UNA SOLA TABLA" del Excel
-- ------------------------------------------------------------
create or replace view public.analisis_venta_items as
with costo_item as (
  select
    ac.cotizacion_id,
    ac.producto_id,
    sum(ac.cantidad)  as cantidad_asignada,
    sum(ac.subtotal)  as costo_total,
    sum(ac.iva_valor) as iva_total,
    case when sum(ac.cantidad) > 0
         then round(sum(ac.subtotal) / sum(ac.cantidad), 2)
         else 0 end   as costo_unitario_real
  from public.asignacion_costos ac
  where ac.destino = 'VENTA' and ac.cotizacion_id is not null
  group by ac.cotizacion_id, ac.producto_id
)
select
  ci.cotizacion_id,
  c.numero                                    as cotizacion_numero,
  ci.id                                       as cotizacion_item_id,
  ci.producto_id,
  ci.descripcion,
  ci.cantidad,
  ci.precio_unitario                          as precio_venta_unitario,
  coalesce(k.costo_unitario_real, 0)          as costo_unitario_real,
  ci.subtotal                                 as venta_subtotal,
  coalesce(k.costo_total, 0)                  as costo_subtotal,
  ci.subtotal - coalesce(k.costo_total, 0)    as utilidad,
  case when ci.precio_unitario > 0 and coalesce(k.costo_unitario_real, 0) > 0
       then round(ci.precio_unitario / k.costo_unitario_real, 2)
       else null end                          as multiplicador,
  case when ci.subtotal > 0
       then round(((ci.subtotal - coalesce(k.costo_total, 0)) / ci.subtotal) * 100, 2)
       else 0 end                             as margen_pct,
  coalesce(k.cantidad_asignada, 0)            as cantidad_con_costo,
  coalesce(k.costo_unitario_real, 0) > 0      as tiene_costo_real
from public.cotizacion_items ci
join public.cotizaciones c on c.id = ci.cotizacion_id
left join costo_item k
       on k.cotizacion_id = ci.cotizacion_id
      and k.producto_id   = ci.producto_id;

comment on view public.analisis_venta_items is
  'Comparativo por item: precio de venta vs costo real pagado, utilidad y multiplicador de inversion.';


-- ------------------------------------------------------------
-- Vista: trazabilidad completa de una venta
-- Todos los documentos y movimientos que la componen
-- ------------------------------------------------------------
create or replace view public.trazabilidad_venta as
select
  c.id                as cotizacion_id,
  c.numero            as cotizacion_numero,
  'COTIZACION'        as documento_tipo,
  c.numero            as documento_numero,
  c.fecha             as documento_fecha,
  c.total             as valor,
  c.estado            as estado,
  null::uuid          as documento_id
from public.cotizaciones c

union all
select r.cotizacion_id, c.numero, 'REMISION', r.numero, r.fecha, null, null, r.id
from public.remisiones r join public.cotizaciones c on c.id = r.cotizacion_id

union all
select fv.cotizacion_id, c.numero, 'FACTURA_VENTA', fv.numero_factura_dian, fv.fecha, fv.total, fv.estado, fv.id
from public.facturas_venta fv join public.cotizaciones c on c.id = fv.cotizacion_id

union all
select distinct ac.cotizacion_id, c.numero, 'FACTURA_COMPRA', fc.numero_factura, fc.fecha_factura, fc.total, fc.estado, fc.id
from public.asignacion_costos ac
join public.facturas_compra fc on fc.id = ac.factura_compra_id
join public.cotizaciones c on c.id = ac.cotizacion_id
where ac.cotizacion_id is not null

union all
select g.cotizacion_id, c.numero, 'GASTO', coalesce(ds.numero, g.concepto), g.fecha, g.monto,
       case when g.deducible then 'DEDUCIBLE' else 'NO DEDUCIBLE' end, g.id
from public.gastos g
join public.cotizaciones c on c.id = g.cotizacion_id
left join public.documentos_soporte ds on ds.gasto_id = g.id
where g.cotizacion_id is not null

union all
select mt.cotizacion_id, c.numero,
       case when mt.tipo = 'INGRESO' then 'INGRESO_CAJA' else 'EGRESO_CAJA' end,
       mt.concepto, mt.fecha, mt.monto, mt.categoria, mt.id
from public.movimientos_tesoreria mt
join public.cotizaciones c on c.id = mt.cotizacion_id
where mt.cotizacion_id is not null;

comment on view public.trazabilidad_venta is
  'Todos los documentos y movimientos de dinero asociados a una venta, en orden cronologico.';


-- ############################################################
-- ARCHIVO: migrations/022_posicion_financiera.sql
-- ############################################################
-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Posicion financiera real
-- Migracion 022
-- ============================================================
-- Responde la pregunta del dueno:
--   "Cuanta plata tengo REALMENTE disponible hoy?"
--
-- Politica #012 (El banco miente):
--   Saldo bancario NO es plata disponible. Hay que restar lo que
--   ya esta comprometido: IVA de la DIAN, impuesto Simple,
--   deudas a proveedores.
-- ============================================================

-- ------------------------------------------------------------
-- Vista: posicion_financiera (una sola fila)
-- ------------------------------------------------------------
create or replace view public.posicion_financiera as
with
saldos as (
  select
    coalesce(sum(case when not es_reserva then saldo_actual else 0 end), 0) as saldo_operativo,
    coalesce(sum(case when es_reserva     then saldo_actual else 0 end), 0) as saldo_reservas,
    coalesce(sum(saldo_actual), 0)                                          as saldo_total
  from public.saldos_cuentas
  where activa
),
-- IVA e impuestos acumulados de todas las ventas facturadas o despachadas
obligaciones_venta as (
  select
    coalesce(sum(av.iva_neto_dian), 0)              as iva_por_pagar,
    coalesce(sum(av.impuesto_simple_pendiente), 0)  as simple_por_pagar,
    coalesce(sum(av.utilidad_bruta), 0)             as utilidad_bruta_acum,
    coalesce(sum(av.utilidad_neta), 0)              as utilidad_neta_acum,
    coalesce(sum(av.venta_subtotal), 0)             as ventas_subtotal_acum,
    coalesce(sum(av.costo_real), 0)                 as costo_real_acum,
    count(*)                                        as num_ventas
  from public.analisis_venta av
  where av.estado in ('FACTURADA','DESPACHADA','ENTREGADO','POR_COBRAR','COBRADA','ENTREGA_PARCIAL')
),
-- Lo que debemos a proveedores
por_pagar as (
  select coalesce(sum(total), 0) as cuentas_por_pagar
  from public.facturas_compra
  where estado in ('REGISTRADA','POR_PAGAR','VENCIDA')
),
-- Lo que nos deben los clientes
por_cobrar as (
  select coalesce(sum(total - coalesce(retencion_total,0)), 0) as cuentas_por_cobrar
  from public.facturas_venta
  where estado = 'EMITIDA'
),
-- Gastos operativos (no de venta)
gastos_op as (
  select coalesce(sum(monto), 0) as gastos_operativos
  from public.gastos
  where es_costo_venta = false
),
-- Capital y socios
socios as (
  select
    coalesce(sum(capital_aportado), 0)     as capital_social,
    coalesce(sum(prestamo_pendiente), 0)   as prestamos_socios,
    coalesce(sum(dividendos_recibidos), 0) as dividendos_pagados
  from public.resumen_socios
),
-- Cotizaciones activas (pipeline)
pipeline as (
  select
    coalesce(sum(total), 0) as pipeline_total,
    count(*)                as pipeline_num
  from public.cotizaciones
  where estado in ('PENDIENTE','APROBADA')
)
select
  -- Caja
  s.saldo_operativo,
  s.saldo_reservas,
  s.saldo_total,

  -- Obligaciones (plata que NO es nuestra)
  ov.iva_por_pagar,
  ov.simple_por_pagar,
  ov.iva_por_pagar + ov.simple_por_pagar                as impuestos_por_pagar,
  pp.cuentas_por_pagar,
  ov.iva_por_pagar + ov.simple_por_pagar + pp.cuentas_por_pagar as total_comprometido,

  -- EL NUMERO CLAVE
  s.saldo_operativo - (ov.iva_por_pagar + ov.simple_por_pagar + pp.cuentas_por_pagar)
                                                        as disponible_real,

  -- Cartera
  pc.cuentas_por_cobrar,
  s.saldo_operativo + pc.cuentas_por_cobrar
    - (ov.iva_por_pagar + ov.simple_por_pagar + pp.cuentas_por_pagar)
                                                        as disponible_proyectado,

  -- Resultados
  ov.ventas_subtotal_acum,
  ov.costo_real_acum,
  ov.utilidad_bruta_acum,
  ov.utilidad_neta_acum,
  case when ov.ventas_subtotal_acum > 0
       then round((ov.utilidad_bruta_acum / ov.ventas_subtotal_acum) * 100, 2)
       else 0 end                                       as margen_bruto_pct,
  go.gastos_operativos,
  ov.utilidad_neta_acum - go.gastos_operativos          as resultado_operativo,

  -- Capital
  so.capital_social,
  so.prestamos_socios,
  so.dividendos_pagados,

  -- Actividad
  ov.num_ventas,
  pl.pipeline_total,
  pl.pipeline_num,

  -- Alertas
  (s.saldo_reservas < (ov.iva_por_pagar + ov.simple_por_pagar))  as reserva_insuficiente,
  (s.saldo_operativo - (ov.iva_por_pagar + ov.simple_por_pagar + pp.cuentas_por_pagar)) < 0 as en_riesgo

from saldos s
cross join obligaciones_venta ov
cross join por_pagar pp
cross join por_cobrar pc
cross join gastos_op go
cross join socios so
cross join pipeline pl;

comment on view public.posicion_financiera is
  'Posicion financiera real. disponible_real = saldo operativo - IVA - impuesto Simple - deudas a proveedores. Es la plata que se puede usar sin comprometer obligaciones.';


-- ------------------------------------------------------------
-- Vista: obligaciones tributarias por periodo
-- El IVA en Colombia se declara por bimestre o cuatrimestre
-- ------------------------------------------------------------
create or replace view public.obligaciones_por_periodo as
select
  to_char(av.fecha, 'YYYY')                                as anio,
  case
    when extract(month from av.fecha) in (1,2)   then 1
    when extract(month from av.fecha) in (3,4)   then 2
    when extract(month from av.fecha) in (5,6)   then 3
    when extract(month from av.fecha) in (7,8)   then 4
    when extract(month from av.fecha) in (9,10)  then 5
    else 6
  end                                                      as bimestre,
  to_char(av.fecha, 'YYYY-MM')                             as mes,
  count(*)                                                 as num_ventas,
  sum(av.venta_subtotal)                                   as base_gravable,
  sum(av.iva_cobrado)                                      as iva_cobrado,
  sum(av.iva_pagado)                                       as iva_descontable,
  sum(av.iva_neto_dian)                                    as iva_a_pagar,
  sum(av.impuesto_simple)                                  as simple_causado,
  sum(av.retenciones)                                      as retenciones_a_favor,
  sum(av.impuesto_simple_pendiente)                        as simple_a_pagar,
  sum(av.utilidad_bruta)                                   as utilidad_bruta,
  sum(av.utilidad_neta)                                    as utilidad_neta
from public.analisis_venta av
where av.estado in ('FACTURADA','DESPACHADA','ENTREGADO','POR_COBRAR','COBRADA','ENTREGA_PARCIAL')
group by 1, 2, 3
order by 1 desc, 3 desc;

comment on view public.obligaciones_por_periodo is
  'IVA e impuesto Simple agrupados por mes y bimestre, para saber cuanto declarar en cada periodo.';


-- ============================================================
-- VERIFICACION FINAL
-- ============================================================
select 'Tablas nuevas creadas' as chequeo, count(*) as cantidad
from information_schema.tables
where table_schema = 'public'
  and table_name in ('remisiones','asignacion_costos','documentos_soporte',
                     'config_tributaria','cuentas','movimientos_tesoreria')
union all
select 'Vistas nuevas creadas', count(*)
from information_schema.views
where table_schema = 'public'
  and table_name in ('analisis_venta','analisis_venta_items','trazabilidad_venta',
                     'posicion_financiera','obligaciones_por_periodo',
                     'saldos_cuentas','compra_items_pendientes_asignar')
union all
select 'Parametros tributarios', count(*) from public.config_tributaria
union all
select 'Cuentas de tesoreria', count(*) from public.cuentas;

-- Debe devolver: 6 tablas, 7 vistas, 8 parametros, 3 cuentas
