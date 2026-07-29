-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Documentos adjuntos
-- Migracion 010
-- ============================================================
-- Almacena referencias a archivos subidos (PDFs, imagenes)
-- Los archivos se guardan en Supabase Storage (bucket: documentos)
-- ============================================================

-- IMPORTANTE: Antes de usar esta tabla, crear el bucket en Supabase:
-- 1. Ve a Storage en el dashboard de Supabase
-- 2. Click "New bucket"
-- 3. Nombre: documentos
-- 4. Public: NO (privado)
-- 5. Allowed MIME types: application/pdf, image/png, image/jpeg
-- 6. Max file size: 10MB

create table if not exists public.documentos (
  id              uuid primary key default gen_random_uuid(),
  -- A que entidad pertenece este documento
  entidad_tipo    text not null check (entidad_tipo in (
    'CLIENTE', 'PROVEEDOR', 'COTIZACION', 'FACTURA_COMPRA', 'FACTURA_VENTA', 'PAGO'
  )),
  entidad_id      uuid not null,
  -- Tipo de documento
  tipo_documento  text not null check (tipo_documento in (
    'RUT', 'CAMARA_COMERCIO', 'CERTIFICADO_BANCARIO', 'ESTADOS_FINANCIEROS',
    'ORDEN_COMPRA', 'FACTURA', 'SOPORTE_PAGO', 'COTIZACION_PDF', 'OTRO'
  )),
  -- Archivo
  nombre_archivo  text not null,
  url_archivo     text not null,
  tamano_bytes    integer,
  mime_type       text,
  -- Meta
  notas           text,
  subido_por      text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_documentos_entidad on public.documentos(entidad_tipo, entidad_id);
create index if not exists idx_documentos_tipo on public.documentos(tipo_documento);

alter table public.documentos enable row level security;
create policy "documentos_auth_all" on public.documentos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
