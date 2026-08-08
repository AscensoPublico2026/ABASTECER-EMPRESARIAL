-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Centro de documentos de la venta
-- Migracion 033
-- ============================================================
-- Corrige DOS BUGS que estaban haciendo que se perdieran archivos
-- adjuntos SIN AVISAR, y agrega el vinculo que faltaba para poder
-- descargar el documento soporte desde la compra.
--
-- Cierra la pestana del ERP antes de correrla.
-- ============================================================


-- ------------------------------------------------------------
-- BUG 1: los PDF de documento soporte se perdian en silencio
-- ------------------------------------------------------------
-- El codigo inserta en documentos con tipo_documento = 'DOCUMENTO_SOPORTE'
-- (compras/actions.ts) pero el check de la tabla NO lo permitia:
--   check (tipo_documento in ('RUT','CAMARA_COMERCIO','CERTIFICADO_BANCARIO',
--          'ESTADOS_FINANCIEROS','ORDEN_COMPRA','FACTURA','SOPORTE_PAGO',
--          'COTIZACION_PDF','OTRO'))
--
-- Como el error de ese insert nunca se revisa, la operacion fallaba
-- calladamente: la compra quedaba registrada pero el PDF que se subio
-- NO quedaba vinculado en ninguna parte. Se perdia.
--
-- Se agregan tambien REMISION e INFORME para los documentos que el ERP
-- genera y que el usuario quiere poder adjuntar al paquete de la venta.
-- ------------------------------------------------------------
alter table public.documentos
  drop constraint if exists documentos_tipo_documento_check;

alter table public.documentos
  add constraint documentos_tipo_documento_check
    check (tipo_documento in (
      'RUT', 'CAMARA_COMERCIO', 'CERTIFICADO_BANCARIO', 'ESTADOS_FINANCIEROS',
      'ORDEN_COMPRA', 'FACTURA', 'SOPORTE_PAGO', 'COTIZACION_PDF',
      'DOCUMENTO_SOPORTE', 'REMISION', 'INFORME', 'OTRO'
    ));


-- ------------------------------------------------------------
-- BUG 2: los adjuntos de GASTOS se perdian igual
-- ------------------------------------------------------------
-- Mismo problema: el codigo inserta entidad_tipo = 'GASTO' pero el check
-- solo permitia CLIENTE, PROVEEDOR, COTIZACION, FACTURA_COMPRA,
-- FACTURA_VENTA y PAGO. Cada soporte de gasto que se subia se perdia.
-- ------------------------------------------------------------
alter table public.documentos
  drop constraint if exists documentos_entidad_tipo_check;

alter table public.documentos
  add constraint documentos_entidad_tipo_check
    check (entidad_tipo in (
      'CLIENTE', 'PROVEEDOR', 'COTIZACION', 'FACTURA_COMPRA',
      'FACTURA_VENTA', 'PAGO', 'GASTO', 'REMISION'
    ));

comment on table public.documentos is
  'Archivos adjuntos de cualquier entidad. entidad_tipo + entidad_id son polimorficos (no hay llave ajena), asi que al borrar la entidad hay que limpiar aqui a mano.';


-- ------------------------------------------------------------
-- Indices para el centro de documentos de la venta
-- ------------------------------------------------------------
-- La pantalla de la venta consulta documentos_soporte por cotizacion y
-- por factura de compra. El indice por cotizacion ya existia (018), el de
-- factura de compra tambien (025). Falta el de gasto.
create index if not exists idx_ds_gasto
  on public.documentos_soporte(gasto_id)
  where gasto_id is not null;


-- ============================================================
-- COMPROBACION
-- ============================================================
-- Los dos valores que antes reventaban ahora deben ser validos.
-- Si esto corre sin error, los checks quedaron bien.
do $$
begin
  -- Prueba en una transaccion que se revierte: no deja basura.
  insert into public.documentos (entidad_tipo, entidad_id, tipo_documento, nombre_archivo, url_archivo)
  values ('GASTO', gen_random_uuid(), 'DOCUMENTO_SOPORTE', 'prueba.pdf', 'https://ejemplo/prueba.pdf');

  delete from public.documentos where nombre_archivo = 'prueba.pdf' and url_archivo = 'https://ejemplo/prueba.pdf';

  raise notice 'OK: los checks aceptan GASTO y DOCUMENTO_SOPORTE';
end $$;

-- Cuantos documentos hay por tipo (para ver que quedo guardado)
select entidad_tipo, tipo_documento, count(*) as cuantos
from public.documentos
group by entidad_tipo, tipo_documento
order by entidad_tipo, tipo_documento;
