-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Vincular DS con factura de compra
-- Migracion 025
-- ============================================================
-- Permite generar un Documento Soporte desde el modulo de Compras
-- cuando el proveedor no da factura (informal, persona natural).
-- Asi el costo se cruza por producto via asignacion_costos.
-- ============================================================

alter table public.documentos_soporte
  add column if not exists factura_compra_id uuid
    references public.facturas_compra(id) on delete set null;

create index if not exists idx_ds_factura_compra
  on public.documentos_soporte(factura_compra_id);

comment on column public.documentos_soporte.factura_compra_id is
  'Si el DS se genero desde una compra, apunta a la factura de compra. Permite trazar el DS con la compra y sus asignaciones de costo.';
