-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Evitar facturas de compra duplicadas
-- Migracion 030
-- ============================================================
-- >>> NO CORRAS ESTE ARCHIVO SUELTO <<<
-- Si todavia hay facturas duplicadas en la base, este indice unico
-- FALLA con "could not create unique index ... Key is duplicated".
-- La migracion 031 anula los duplicados y despues crea este mismo
-- indice, en el orden que si funciona.
-- Corre supabase/EJECUTAR_TODO.sql en vez de este archivo.
-- ============================================================
-- CONTEXTO: se registraron facturas duplicadas (mismo proveedor,
-- mismo numero de factura, mismo total) por doble clic / reintento
-- tras un error. Eso duplico stock, pagos, GMF y retenciones.
--
-- El codigo ya valida esto antes de insertar (ver registrarFacturaCompra
-- en compras/actions.ts), pero esa validacion no protege contra dos
-- requests simultaneos (race condition) ni contra quien inserte
-- directo por SQL. Este indice unico es la barrera de ultima linea.
--
-- Solo aplica a facturas activas (no ANULADA), para poder tener
-- historicos con el mismo numero si una version quedo anulada.
-- ============================================================

create unique index if not exists idx_facturas_compra_no_duplicar
  on public.facturas_compra (proveedor_id, numero_factura)
  where estado <> 'ANULADA' and numero_factura is not null and numero_factura <> '';

comment on index public.idx_facturas_compra_no_duplicar is
  'Evita registrar dos veces la misma factura (mismo proveedor + mismo numero) mientras no este anulada. Protege contra doble clic o reintentos.';
