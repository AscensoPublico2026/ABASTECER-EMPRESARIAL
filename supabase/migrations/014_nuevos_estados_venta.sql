-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Nuevos estados de cotizacion/venta
-- Migracion 014
-- ============================================================
-- Flujo completo: PENDIENTE → APROBADA → PAGADA → EN_ALISTAMIENTO →
-- FACTURADA → DESPACHADA → ENTREGADO → POR_COBRAR → COBRADA
-- ============================================================

-- Eliminar constraint anterior y crear uno nuevo con todos los estados
alter table public.cotizaciones drop constraint if exists cotizaciones_estado_check;
alter table public.cotizaciones add constraint cotizaciones_estado_check
  check (estado in (
    'PENDIENTE', 'APROBADA', 'PAGADA', 'EN_ALISTAMIENTO',
    'FACTURADA', 'DESPACHADA', 'ENTREGA_PARCIAL', 'ENTREGADO',
    'POR_COBRAR', 'COBRADA', 'RECHAZADA', 'VENCIDA'
  ));

-- Agregar campos para el flujo de pago anticipado (contado)
alter table public.cotizaciones
  add column if not exists fecha_pago date,
  add column if not exists monto_recibido numeric(15,2) default 0,
  add column if not exists retencion_retefuente numeric(15,2) default 0,
  add column if not exists retencion_reteiva numeric(15,2) default 0,
  add column if not exists retencion_reteica numeric(15,2) default 0,
  add column if not exists retencion_total numeric(15,2) default 0,
  add column if not exists soporte_pago_url text,
  add column if not exists remision_firmada_url text,
  add column if not exists provision_iva numeric(15,2) default 0,
  add column if not exists provision_simple numeric(15,2) default 0;

comment on column public.cotizaciones.provision_iva is 'IVA neto estimado a separar para la DIAN';
comment on column public.cotizaciones.provision_simple is '5% del subtotal para anticipo Regimen Simple';
