# LISTA MAESTRA DE PENDIENTES — ABASTECER ERP

> **Ultima actualizacion:** 28/Jul/2026
> **Para:** Cualquier sesion futura de Kiro — leer este documento al inicio.
> **Contexto:** El ERP ya esta operativo con los modulos base. Esta lista contiene
> TODAS las mejoras y funcionalidades pendientes por implementar.

---

## ESTADO ACTUAL DEL ERP (lo que YA funciona)

| Modulo | Estado | URL |
|--------|--------|-----|
| Login/Auth | ✅ Operativo | /login |
| Dashboard | ✅ Operativo | / |
| Centro Financiero | ✅ Operativo | /financiero |
| Socios & Capital | ✅ Operativo | /socios |
| Catalogo de Productos | ✅ Operativo | /inventario |
| Cotizaciones | ✅ Operativo | /ventas |
| Compras (facturas) | ✅ Operativo | /compras |
| Gastos | ✅ Operativo | /gastos |
| Proveedores | ✅ Operativo | /proveedores |
| Clientes | ✅ Operativo | /clientes |
| Edicion clientes | ✅ Operativo | /clientes/[id] |
| Edicion proveedores | ✅ Operativo | /proveedores/[id] |
| PDF cotizacion | ✅ Operativo | /ventas/[id] (Ctrl+P) |
| Subida documentos | ✅ Operativo | En fichas de cliente/proveedor |
| Indicadores | 🟡 Placeholder | /indicadores |

### Automatismos que ya funcionan:
- Codigo de producto automatico (PRD-0001)
- Numero de cotizacion automatico (COT-2026-001)
- Costo promedio ponderado (se recalcula con cada compra)
- Precio sugerido automatico (costo / (1-margen%))
- Stock se actualiza con compras (suma) y ventas (resta)
- OC obligatoria para clientes a credito
- Numero factura DIAN requerido para cerrar venta

## BUGS CONOCIDOS (arreglar primero)

| Bug | Descripcion | Solucion |
|-----|-------------|----------|
| 🔴 Centro Financiero: "Could not find table public.ventas" | La consulta en src/lib/queries/financiero.ts busca tabla 'ventas' que fue eliminada en el rediseno. Ahora son 'cotizaciones' + 'facturas_venta'. | Cambiar la query para consultar cotizaciones y facturas_venta en vez de ventas |
| 🟡 Cotizacion creada no aparece | Julio creo una cotizacion pero no se ve en la tabla. Verificar que la tabla cotizaciones tenga datos y que la query funcione. | Revisar RLS y que el usuario este autenticado correctamente |
| 🟡 Sidebar no muestra "Gastos" | El commit del sidebar con Gastos puede no haberse pusheado correctamente | Verificar que Sidebar.tsx importe Wallet y tenga la ruta /gastos |

---

## OBSERVACIONES DE JULIO (28/Jul/2026) — IMPLEMENTAR

### Sobre la composicion accionaria:
- Cuando un socio aporta MAS capital que el otro, el % NO debe cambiar automaticamente
- Solo cambia si ambos socios lo ACUERDAN formalmente (requiere acta de asamblea + Camara de Comercio)
- Para aportes temporales: usar PRESTAMO (no cambia %)
- El ERP actual NO cambia % automaticamente (correcto)

### Sobre la cotizacion/venta:
- Al seleccionar una cotizacion en la tabla, debe abrir un DETALLE completo con:
  - Datos de la cotizacion
  - Factura DIAN vinculada (si ya se cerro)
  - PDF de la factura cargado
  - OC del cliente (numero + PDF)
  - Soporte de pago (si ya pago)
  - Fecha y hora de cada accion
  - Que usuario hizo cada cosa
- Columna adicional en tabla de cotizaciones: "Credito/Contado"
- Columna adicional: "Estado factura" (pagada o pendiente)
- Al cerrar venta: obligatorio cargar PDF de factura (no solo el numero)
- Al registrar OC: obligatorio cargar PDF de la OC del cliente

### Sobre los productos:
- Poder EDITAR cada producto (nombre, referencia, categoria, imagen)
- Poder ELIMINAR productos
- Poder cargar IMAGEN del producto

### Sobre los cobros (cuando el cliente paga):
- El cobro se registra MANUALMENTE (el usuario marca como pagado)
- Contado: cliente envia soporte → verificar en Bold → marcar COBRADA
- Credito: llega la fecha, cliente paga → envia soporte → marcar COBRADA
- Poder subir soporte de pago del cliente (PDF/imagen)

### Sobre retenciones:
- Los clientes grandes (agentes de retencion) pagan MENOS de lo facturado
- Diferencia = retenciones (Retefuente ~2.5%, ReteIVA 15% del IVA, ReteICA variable)
- En el cobro: monto recibido < monto factura. La diferencia son retenciones.
- Implementar campo "Retenciones aplicadas" en el registro de cobro
- Las retenciones se cruzan con impuestos al final del año

### Sobre transporte:
- Crear producto "Servicio de transporte" en el catalogo con IVA 19%
- Cobrarlo como ITEM APARTE en la cotizacion/factura (no sumarlo a cada producto)
- Costo = lo que cobra el domiciliario. Margen = lo que cobras al cliente menos el costo.
- Aunque el domiciliario no facture, a Evolti SI se le cobra con IVA (porque somos responsables)

---

### BLOQUE 1 — Exportar Excel + Mejoras de tablas

| # | Tarea | Detalle |
|---|-------|---------|
| 8 | **Exportar a Excel** en TODAS las tablas | Boton "Descargar Excel" en: cotizaciones, compras, gastos, clientes, proveedores, productos, socios |
| 8b | Factura vinculada en historial de cotizaciones | En la tabla de cotizaciones, mostrar columna "Factura DIAN" con el numero si ya se cerro |

### BLOQUE 2 — Perfiles y roles

| # | Tarea | Detalle |
|---|-------|---------|
| 13 | **Perfiles maestros** (Julio y Laura) | Estos 2 ven TODO y administran |
| 13b | **Crear perfiles de empleados** | Desde el perfil maestro, crear un usuario nuevo |
| 13c | **Asignar modulos** a cada empleado | Seleccionar que modulos puede ver cada empleado |
| 14 | **Auditoria** | Registrar quien hizo cada movimiento (usuario + timestamp) |

### BLOQUE 3 — CRM e inteligencia

| # | Tarea | Detalle |
|---|-------|---------|
| 9 | **Historial de compras por PRODUCTO** | Al abrir producto: quienes lo vendieron, precios, fechas |
| 11 | **Analisis inteligente de proveedores** | Producto mas comprado, frecuencia, mejor precio, tendencias |
| 12 | **Analisis inteligente de clientes** | Producto mas vendido, frecuencia, ticket promedio |
| 22 | **Alertas predictivas** | "Evolti suele comprar cascos cada 3 meses — hace 80 dias que no compra" |
| 25 | **Analisis por producto** | Abrir producto → ver todos los proveedores y precios historicos |
| 26 | **CRM de clientes** | Dashboard del cliente con estadisticas |

### BLOQUE 4 — Proveedores y compras avanzadas

| # | Tarea | Detalle |
|---|-------|---------|
| 10 | **Proveedor de mostrador** | Crear proveedor rapido sin inscripcion formal, solo para vincular la compra |
| 16 | **Nombres de producto por proveedor** | "Gafa B105" del proveedor = "Gafa seguridad transparente" nuestra |
| 17 | **Precios especiales por cliente** | Tabla de precios donde cada cliente tiene su precio por producto |
| 18 | **Cotizaciones A proveedores** | Pedir precios a varios proveedores y comparar en tabla |
| 19 | **Ordenes de compra (interfaz)** | UI para crear/gestionar OC-2026-XXX a proveedores |
| 24 | **Filtrar proveedores por categoria** | "Mostrame solo proveedores de EPP" |
| 27 | **PDF de OC para enviar al proveedor** | Como la cotizacion pero hacia el proveedor |

### BLOQUE 5 — Cobros, pagos y flujo de caja

| # | Tarea | Detalle |
|---|-------|---------|
| 15 | **Registrar cobros/pagos** con soporte | Cargar comprobante de pago del cliente o al proveedor |
| 21 | **Integracion Bold** | Leer movimientos automaticamente (si hay API) |
| 23 | **Flujo de caja proyectado** | Cuando entran y salen pagos programados (30/60/90 dias) |
| 29 | **Cerrar venta cuando paga** (contado) | Para contado: cerrar solo al recibir pago |

### BLOQUE 6 — Ideas avanzadas (fase futura)

| # | Tarea | Detalle |
|---|-------|---------|
| 20 | **OCR de facturas con IA** | Subir foto/PDF → extraer datos automaticamente |
| 28 | **Dashboard de indicadores** | KPIs globales con graficos reales |
| 30 | **Exportar reportes** | Reportes mensuales, trimestrales, anuales |
| 31 | **Rentabilidad por linea** | Que categoria (EPP, Aseo, etc.) es mas rentable |
| 32 | **Metas de ventas** | "Este mes queremos vender $X" con barra de progreso |
| 33 | **Score de clientes** | Clasificar clientes A, B, C por rentabilidad |
| 34 | **Recompra automatica** | Si stock < minimo → alerta + OC sugerida |
| 35 | **Descuentos por volumen** | Mas de 100 unidades = 5% off automatico |
| 36 | **Notas/comentarios en operaciones** | Timeline de comunicacion por operacion |
| 37 | **Notificaciones email/WhatsApp** | "Te quedan 3 dias para pagar factura X" |
| 38 | **Portal del cliente** | El cliente entra y ve sus cotizaciones/facturas |

---

## DECISIONES TECNICAS PENDIENTES

| Tema | Pregunta | Recomendacion |
|------|----------|---------------|
| Transporte | Como facturarlo | Crear producto "Servicio de transporte" con IVA 19%. Cobrarlo como item aparte. |
| Contado | Factura primero o pago primero | Factura primero (se puede anular con nota credito si no pagan) |
| Roles | Como implementar | Supabase Auth + tabla de roles/permisos vinculada al usuario |
| Excel | Libreria | xlsx (sheetjs) o generacion CSV en el servidor |
| Bold API | Existe? | Investigar si Bold tiene API publica para leer movimientos |

---

## DATOS DE LA EMPRESA (para cualquier desarrollo)

| Campo | Valor |
|-------|-------|
| Razon social | ABASTECER EMPRESARIAL S.A.S. |
| NIT | 902088758-4 |
| Direccion | CR 25 H 72 D 17, Cali - Valle |
| Telefono | 3151972091 |
| Email | abastecerempresarial@gmail.com |
| Rep. Legal | TERESA DEL SOCORRO MARTINEZ - C.C. 66864933 |
| Banco | Bold. Compania de Financiamiento S.A. |
| Cuenta | Deposito ordinario 1700-1337-9217 |
| Regimen | Simple de Tributacion (RST) + IVA |
| CIIU | 4690 (principal), 4663, 4649 |
| Supabase URL | https://xfbhlofjdneexlrludlu.supabase.co |
| Supabase Key | sb_publishable_0atQ-dr1zPvopkmOI8WI9w_W_-fD60d |
| Vercel URL | https://abastecer-empresarial-git-main-ascenso-publico-s-projects.vercel.app |
| GitHub | AscensoPublico2026/ABASTECER-EMPRESARIAL |
| Logo | /public/logo.png |

---

## MIGRACIONES SQL EJECUTADAS EN SUPABASE

| Archivo | Contenido | Ejecutada |
|---------|-----------|-----------|
| EJECUTAR_TODO.sql | Todas las tablas base (socios, proveedores, clientes, productos, cotizaciones, OC, facturas compra/venta, pagos) | ✅ Si |
| 010_documentos.sql | Tabla documentos + policies Storage | ✅ Si |
| 011_gastos.sql | Tabla gastos operativos | ❌ PENDIENTE — correr en Supabase |

---

## INSTRUCCIONES PARA LA PROXIMA SESION DE KIRO

1. Leer este documento al inicio
2. Verificar que el sidebar tenga: Dashboard, Centro Financiero, Socios, Catalogo, Cotizaciones, Compras, Gastos, Proveedores, Clientes, Indicadores
3. Continuar con BLOQUE 1 (Exportar Excel) que es lo mas rapido y util
4. Luego BLOQUE 2 (Perfiles/roles)
5. Luego BLOQUE 3 (CRM/inteligencia)
6. El stack es: Next.js 14 + Supabase + Tailwind + TypeScript
7. Push siempre a: AscensoPublico2026/ABASTECER-EMPRESARIAL rama main
8. El deploy es automatico en Vercel al pushear

---

> **Este documento es la guia maestra. Actualizarlo cada vez que se complete algo.**



---

## MIGRACIONES PENDIENTES POR CORRER EN SUPABASE

Julio debe correr este SQL en Supabase SQL Editor para activar Gastos:

```sql
create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  concepto text not null,
  categoria text not null default 'OTROS',
  monto numeric(15,2) not null check (monto > 0),
  iva_incluido numeric(15,2) default 0,
  pagado_por text,
  forma_pago text default 'Efectivo',
  soporte_url text,
  notas text,
  created_at timestamptz not null default now()
);
create index if not exists idx_gastos_fecha on public.gastos(fecha desc);
alter table public.gastos enable row level security;
create policy "gastos_auth_all" on public.gastos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

---

## RESUMEN PARA LA PROXIMA SESION

**PRIORIDAD 1 (hacer primero):**
1. Arreglar bug Centro Financiero (tabla ventas → cotizaciones/facturas_venta)
2. Verificar que Gastos aparezca en el sidebar
3. Verificar que cotizaciones se muestren en la tabla

**PRIORIDAD 2 (funcionalidades):**
4. Exportar a Excel (boton en todas las tablas)
5. Editar productos (nombre, categoria, imagen, eliminar)
6. Detalle completo de cotizacion (factura, OC, soporte, timeline)
7. Cerrar venta con PDF obligatorio de factura + OC

**PRIORIDAD 3 (perfiles):**
8. Perfiles maestros (Julio + Laura)
9. Crear empleados con modulos asignados
10. Auditoria (quien hizo que)

**PRIORIDAD 4 (inteligencia):**
11. Historial por producto (proveedores, precios)
12. CRM clientes y proveedores
13. Alertas predictivas
14. Dashboard de indicadores real
