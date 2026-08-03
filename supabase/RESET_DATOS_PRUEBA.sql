-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Reset de datos de prueba
-- ============================================================
-- QUE HACE:
--   Borra todo el movimiento transaccional (facturas, compras,
--   pagos, gastos, remisiones) y devuelve las cotizaciones al
--   estado PENDIENTE para rehacer el flujo completo desde cero.
--
-- QUE CONSERVA:
--   - Clientes
--   - Proveedores
--   - Catalogo de productos (nombres, categorias, IVA)
--   - Socios y aportes de capital
--   - Cotizaciones (con sus items) pero en estado PENDIENTE
--   - Usuarios y perfiles
--
-- QUE RESETEA:
--   - productos: costo_promedio, ultimo_costo, stock_actual, precio_sugerido -> 0
--   - cotizaciones: estado PENDIENTE, sin pago, sin retenciones,
--     sin provisiones, sin remision, costo_total y utilidad en 0
--   - cotizacion_items: costo_unitario y utilidad -> 0
--
-- REQUISITO: ejecutar primero las migraciones 016 a 022.
--
-- COMO EJECUTAR:
--   Supabase Dashboard -> SQL Editor -> New query -> pegar -> Run
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Borrar movimiento transaccional
--    Orden importante por las llaves foraneas
-- ------------------------------------------------------------

-- Tesoreria (si ya existe la tabla)
delete from public.movimientos_tesoreria;

-- Documentos soporte
delete from public.documentos_soporte;

-- Asignacion de costos (depende de facturas de compra)
delete from public.asignacion_costos;

-- Pagos
delete from public.pagos;

-- Facturas de venta e items
delete from public.factura_venta_items;
delete from public.facturas_venta;

-- Facturas de compra e items
delete from public.factura_compra_items;
delete from public.facturas_compra;

-- Ordenes de compra (nunca se usaron pero por limpieza)
delete from public.orden_compra_items;
delete from public.ordenes_compra;

-- Solicitudes de compra
delete from public.solicitudes_compra;

-- Remisiones
delete from public.remisiones;

-- Gastos
delete from public.gastos;

-- Documentos adjuntos de transacciones (conserva los de clientes/proveedores)
delete from public.documentos
where entidad_tipo in ('FACTURA_VENTA','FACTURA_COMPRA','COTIZACION','GASTO','REMISION');


-- ------------------------------------------------------------
-- 2. Resetear catalogo de productos
--    El costo se reconstruye solo con la primera compra real
-- ------------------------------------------------------------
update public.productos
set costo_promedio  = 0,
    ultimo_costo    = 0,
    stock_actual    = 0,
    precio_sugerido = 0;


-- ------------------------------------------------------------
-- 3. Devolver todas las cotizaciones a PENDIENTE
-- ------------------------------------------------------------
update public.cotizaciones
set estado                 = 'PENDIENTE',
    -- Costos y utilidad se recalculan cuando se asignen compras
    costo_total            = 0,
    utilidad_estimada      = subtotal,
    margen_pct             = 100,
    -- Pago
    fecha_pago             = null,
    monto_recibido         = 0,
    soporte_pago_url       = null,
    -- Retenciones
    retencion_retefuente   = 0,
    retencion_reteiva      = 0,
    retencion_reteica      = 0,
    retencion_total        = 0,
    -- Provisiones (ahora se calculan en la vista analisis_venta)
    provision_iva          = 0,
    provision_simple       = 0,
    -- Remision
    remision_numero        = null,
    remision_fecha         = null,
    remision_observaciones = null,
    remision_firmada_url   = null,
    -- OC del cliente: se conserva si existe
    oc_cliente             = oc_cliente;

-- Items: limpiar costo (se llena al asignar la compra real)
update public.cotizacion_items
set costo_unitario = 0,
    utilidad       = subtotal;


-- ------------------------------------------------------------
-- 4. Resetear saldos de cuentas de tesoreria
-- ------------------------------------------------------------
update public.cuentas
set saldo_inicial = 0;


commit;


-- ============================================================
-- VERIFICACION
-- ============================================================
select 'PRODUCTOS'      as tabla, count(*) as registros from public.productos
union all select 'CLIENTES',           count(*) from public.clientes
union all select 'PROVEEDORES',        count(*) from public.proveedores
union all select 'COTIZACIONES',       count(*) from public.cotizaciones
union all select 'COTIZACION_ITEMS',   count(*) from public.cotizacion_items
union all select 'FACTURAS_VENTA',     count(*) from public.facturas_venta
union all select 'FACTURAS_COMPRA',    count(*) from public.facturas_compra
union all select 'ASIGNACION_COSTOS',  count(*) from public.asignacion_costos
union all select 'GASTOS',             count(*) from public.gastos
union all select 'REMISIONES',         count(*) from public.remisiones
union all select 'SOLICITUDES_COMPRA', count(*) from public.solicitudes_compra
union all select 'MOVIMIENTOS_TESORERIA', count(*) from public.movimientos_tesoreria
union all select 'CUENTAS',            count(*) from public.cuentas
order by tabla;

-- Estado de las cotizaciones
select numero, estado, subtotal, iva_total, total, costo_total, utilidad_estimada
from public.cotizaciones
order by numero;
