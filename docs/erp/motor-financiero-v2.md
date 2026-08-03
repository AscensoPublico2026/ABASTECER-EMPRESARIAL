# Motor financiero v2 — Guía de ejecución

Todo el análisis que antes hacías en Excel ahora lo calcula el ERP.
Este documento te dice qué ejecutar, en qué orden, y cómo probar el flujo completo.

---

## Parte 1 · Qué cambió y por qué

### El problema que se resolvió

| Antes | Ahora |
|---|---|
| El costo de una venta salía del **costo promedio ponderado**, así que la utilidad de una venta cambiaba cada vez que comprabas el mismo producto a otro precio. | Cada compra se **asigna** a la venta que corresponde con el **costo real pagado**. La utilidad queda congelada y auditable. |
| Al registrar una compra se cerraban las solicitudes de **todas** las ventas que tuvieran ese producto. | Solo se cierra la solicitud de la venta a la que efectivamente se le asignaron unidades. |
| El IVA de una factura de compra se restaba **completo** a **cada** cotización que tocara ese producto (doble conteo), y se sobrescribía en cada compra nueva. | El IVA descontable se acumula por venta según lo realmente asignado. |
| El flete pagado a un particular no se podía atar a la venta. | Un gasto se puede marcar como **costo de venta** y se resta de la utilidad de esa cotización. |
| No existía tesorería. El "disponible" era una estimación con valores inventados (`|| 500000`, `meses = facturas/4`). | Tabla de cuentas y movimientos. `disponible_real` sale de saldos reales menos obligaciones. |
| El IVA por pagar era global de toda la vida. | Se agrupa por mes y bimestre, como lo pide la DIAN. |
| Las tasas (19%, 5%) estaban escritas dentro del código. | Están en `config_tributaria`. Cambias un registro, no despliegas código. |

### Cómo funciona el costo ahora (opción C, híbrido)

Cuando registras una factura de compra, cada línea se reparte:

```
Compra: 100 canastillas a $3.277 c/u
   ├─ 60 unidades  →  COT-2026-012   (destino VENTA)
   └─ 40 unidades  →  inventario      (destino STOCK)
```

- Lo asignado a una venta entra a su costo real con el precio exacto de esa factura.
- Lo que queda en stock se usa para ventas futuras y valora el inventario con costo promedio.
- El sistema no te deja asignar más unidades de las que compraste (hay un trigger que lo valida).

---

## Parte 2 · Ejecución en Supabase

### Paso 1 · Instalar las migraciones

1. Abre **Supabase Dashboard → SQL Editor → New query**
2. Copia y pega el contenido completo de:

   ```
   supabase/EJECUTAR_MIGRACIONES_016_022.sql
   ```

3. Presiona **Run**

Al final el script imprime una verificación. Debe mostrar:

| Chequeo | Cantidad esperada |
|---|---|
| Tablas nuevas creadas | 6 |
| Vistas nuevas creadas | 7 |
| Parámetros tributarios | 8 |
| Cuentas de tesorería | 3 |

Si algo no cuadra, no sigas: revisa el mensaje de error antes de continuar.

### Paso 2 · Limpiar los datos de prueba

Esto borra el movimiento transaccional y devuelve todas las cotizaciones a `PENDIENTE`
para rehacer el flujo desde cero.

1. **SQL Editor → New query**
2. Pega el contenido de:

   ```
   supabase/RESET_DATOS_PRUEBA.sql
   ```

3. **Run**

**Qué conserva:** clientes, proveedores, catálogo de productos, socios, cotizaciones (con sus ítems), usuarios.

**Qué borra:** facturas de venta y compra, pagos, gastos, remisiones, solicitudes de compra, asignaciones de costo, movimientos de tesorería.

**Qué resetea:** `costo_promedio`, `ultimo_costo`, `stock_actual` y `precio_sugerido` de todos los productos van a 0. Todas las cotizaciones vuelven a `PENDIENTE` sin pago, sin retenciones, sin remisión.

### Paso 3 · Poner el saldo inicial de la cuenta Bold

El disponible real necesita saber cuánta plata hay hoy. En **SQL Editor**:

```sql
update public.cuentas
set saldo_inicial = 0          -- <-- pon aquí el saldo real de Bold hoy
where nombre like 'Bold%';
```

Si prefieres arrancar en cero y registrar cada movimiento a mano, déjalo en 0.

---

## Parte 3 · Flujo completo de prueba con COT-2026-012

Esta cotización ya pasó por todo en la vida real: hay OC, pago, dos compras y entrega.
Solo falta la factura. Vamos a reconstruirla en el sistema en el mismo orden.

### 3.1 · Aprobar la cotización

**Ventas → COT-2026-012 → Aprobar**

- Marca **Sí, tengo la OC**
- Número de OC: el que envió Evolti
- Adjunta el PDF de la OC

### 3.2 · Registrar el pago del cliente

**Ventas → COT-2026-012 → Registrar pago**

| Campo | Valor |
|---|---|
| Fecha de pago | la real |
| Monto recibido | `1486720` |
| Retefuente | `36480` |
| Soporte | captura de Bold |

El sistema detecta que el total es $1.523.200 y que recibiste $1.486.720, así que te pide
explicar la diferencia de $36.480 con las retenciones. Debe decir **✓ Cuadra**.

Al guardar pasa a **En alistamiento** y se generan las solicitudes de compra
(el flete no genera solicitud porque es un servicio).

### 3.3 · Registrar la compra 1 y asignarla a la venta

**Compras → Registrar Compra**

| Campo | Valor |
|---|---|
| Proveedor | EL PALACIO DEL HOGAR |
| No. Factura | `FCJC1119` |
| Fecha | la real |
| Forma de pago | Contado |
| De qué cuenta se pagó | Bold |
| PDF | adjunta la factura |

**Ítem:**

| Campo | Valor |
|---|---|
| Producto | CANASTILLA PEQUEÑA |
| Cantidad | `60` |
| Costo unitario | `3277` |
| IVA | 19% |

**En "Para qué venta es":**
1. Click en **Asignar a una venta**
2. Selecciona **COT-2026-012**
3. Cantidad: `60`

Abajo debe decir: `60 a ventas · 0 a inventario`.

### 3.4 · Registrar la compra 2

Igual que la anterior:

| Campo | Valor |
|---|---|
| Proveedor | LA BODEGA DEL TARRO |
| No. Factura | `FEHA202` |
| Producto | CANASTILLA LISA |
| Cantidad | `20` |
| Costo unitario | `20000` |
| IVA | 19% |
| Asignar a | COT-2026-012 · 20 unidades |

### 3.5 · Registrar el flete como costo de la venta

**Gastos → Registrar gasto**

| Campo | Valor |
|---|---|
| Concepto | `FLETE ENTREGA CANASTILLAS EVOLTI` |
| Monto total | `60000` |
| IVA incluido | `0` |
| Categoría | Transporte |
| ☑ Este gasto es costo de una venta | marcado |
| Venta a la que pertenece | COT-2026-012 |
| Soporte | ver abajo |
| Cuenta de salida | Bold o Efectivo |

**Sobre el soporte:** como no le pediste la cédula al señor del camión, marca
**Sin ningún soporte**. El gasto queda registrado pero el sistema lo marca como
**no deducible** y te lo muestra en la alerta de gastos.

Si algún día consigues sus datos, en la fila del gasto hay un botón para generar
el documento soporte y el gasto pasa a ser deducible automáticamente.

### 3.6 · Generar la remisión

**Ventas → COT-2026-012 → Remisión**

Escribe las observaciones de entrega y guarda. Genera **REM-2026-051**.
Se puede imprimir con campos de firma para quien entrega y quien recibe.

### 3.7 · Facturar (cuando tengas el número DIAN)

**Ventas → COT-2026-012 → Facturar**

Número de factura DIAN + PDF. Ahí se cierra el ciclo.

---

## Parte 4 · Verificar que los números coinciden con tu Excel

Entra a **Ventas → COT-2026-012** y baja hasta *Análisis financiero interno*.

Debe mostrar exactamente:

| Concepto | Valor esperado |
|---|---|
| Vendido (base sin IVA) | $1.280.000 |
| Costo real | $656.639 |
| IVA cobrado | $243.200 |
| IVA pagado | $113.361 |
| **IVA a pagar a la DIAN** | **$129.839** |
| Utilidad bruta | $623.361 |
| Margen bruto | 48,7% |
| Impuesto Simple (5%) | $64.000 |
| Retenciones | $36.480 |
| Simple pendiente | $27.520 |
| **Utilidad neta** | **$559.361** |
| **Total a separar** | **$157.359** |

Y en la tabla de rentabilidad por producto:

| Producto | Compra c/u | Venta c/u | Multiplicador | Utilidad |
|---|---|---|---|---|
| Canastilla pequeña | $3.277 | $8.000 | 2,44x | $283.361 |
| Canastilla lisa | $20.000 | $38.000 | 1,90x | $360.000 |
| Flete | $60.000 | $40.000 | 0,67x | −$20.000 |

Si algún número no coincide, revisa que las asignaciones de costo estén completas.
En **Compras** hay una sección *Compras sin asignar a una venta* que te muestra
qué quedó suelto.

---

## Parte 5 · Dónde está cada cosa ahora

### Vistas SQL (la fuente de verdad)

| Vista | Qué responde |
|---|---|
| `analisis_venta` | Por cada cotización: costo real, IVA neto, utilidad bruta y neta, impuestos, dinero a separar. Es el Excel automatizado. |
| `analisis_venta_items` | Comparativo por ítem: precio de compra real vs venta, utilidad y multiplicador. |
| `trazabilidad_venta` | Todos los documentos y movimientos de dinero de una venta, en orden. |
| `posicion_financiera` | Una sola fila con el `disponible_real` y todo el desglose. |
| `obligaciones_por_periodo` | IVA y Simple agrupados por mes y bimestre DIAN. |
| `saldos_cuentas` | Saldo actual de cada cuenta. |
| `compra_items_pendientes_asignar` | Líneas de compra con unidades sin asignar. |

### Pantallas

| Pantalla | Qué muestra |
|---|---|
| **Dashboard** | Disponible real, vendido, costo real, alertas clickeables, últimas ventas. |
| **Centro Financiero** | Disponible real con su desglose, saldos por cuenta, impuestos acumulados, resultado operativo, obligaciones por bimestre, análisis de cada venta. |
| **Venta → detalle** | El documento imprimible para el cliente, y debajo el análisis financiero interno (no se imprime). |
| **Compras** | Solicitudes pendientes, compras sin asignar, facturas con acciones de editar/pagar/anular. |
| **Gastos** | KPIs separando costo de venta vs operativo, alerta de no deducibles, generación de documento soporte. |

### Fórmula del disponible real

```
Saldo en cuentas operativas          (excluye la cuenta de reserva)
(−) IVA neto de todas las ventas
(−) Impuesto Simple pendiente
(−) Deuda a proveedores
= DISPONIBLE REAL
```

Si además cobras la cartera pendiente, el sistema te muestra el
**disponible proyectado**.

---

## Parte 6 · Reglas de operación

### Al registrar una compra
Asigna siempre las unidades a la venta que corresponde. Si compras para stock,
déjalo sin asignar y quedará en inventario. Lo que no asignes aparece en la
sección *Compras sin asignar*.

### Al pagarle a un particular
Pídele **nombre y cédula antes de pagar**. Son 30 segundos y hacen que el gasto
sea deducible. Sin eso pierdes el beneficio tributario sobre ese valor.

### Con el flete
Cóbralo siempre por encima de lo que te cuesta. En COT-2026-012 se perdieron
$20.000 porque se cobró $40.000 y costó $60.000. El sistema te marca en naranja
cualquier ítem con margen negativo.

### Con los impuestos
Existe una cuenta llamada **Reserva impuestos** marcada como reserva: su saldo
no cuenta como disponible. Traslada allí el *total a separar* de cada venta.
El sistema te avisa si la reserva no alcanza para cubrir lo que debes.

### Para corregir una compra
- **Número, fecha, proveedor o PDF** → botón editar (lápiz).
- **Productos, cantidades o precios** → anular y registrar de nuevo. Es la práctica
  contable correcta y el sistema revierte stock, costos, caja y solicitudes.

---

## Parte 7 · Qué falta

Cosas que quedan pendientes y hay que decirlo con claridad:

- **Retenciones**: se digitan a mano. No hay cálculo automático por bases ni UVT.
  Las tarifas ya están en `config_tributaria` para cuando se automatice.
- **Cobro de cartera**: al marcar una factura como cobrada todavía no se registra
  el ingreso en tesorería automáticamente. Hay que registrarlo aparte.
- **Traslados entre cuentas**: la tabla los soporta (`TRASLADO_ENTRADA`/`TRASLADO_SALIDA`)
  pero no hay pantalla para hacerlos.
- **Facturación electrónica DIAN**: el número se digita manualmente. La integración
  con el facturador gratuito es un proyecto aparte.
- **Módulo de indicadores**: sigue siendo un placeholder.
