# Rediseno ERP v2 — Integracion Total

> **Objetivo:** Reconstruir el ERP para que sea un sistema 100% integrado donde
> cada dato se conecta con los demas. No modulos aislados sino un flujo unico.
> **Fecha:** Julio 2026
> **Estado:** En diseno — pendiente validacion de Julio

---

## Principios del rediseno

1. **Todo esta conectado:** Una compra se vincula a un proveedor, a una factura,
   a un producto, a un inventario, a una venta, a un cliente, a un cobro.
2. **Nada manual que pueda ser automatico:** El costo se calcula solo (promedio
   ponderado). El IVA se calcula solo. La numeracion es automatica.
3. **Exactitud en IVA:** Multi-proveedor, multi-precio, multi-factura. El cruce
   de IVA debe ser perfecto para la declaracion.
4. **Trazabilidad total:** Al abrir un proveedor veo TODO: compras, facturas,
   pagos, deudas, historial de precios. Al abrir un cliente: ventas, cobros,
   cotizaciones, frecuencia.
5. **Sencillo de usar:** Complejo por dentro, simple por fuera. Laura debe poder
   usarlo sin manual.

---

## Flujo maestro de operacion

```
VENTA:
Cliente pide → Cotizacion (COT-001) → Cliente aprueba →
  ¿Hay stock? 
    SI → Facturar (numero DIAN) → Entregar → Cobrar → Cerrar
    NO → Orden de compra al proveedor → Recibir → Facturar → Entregar → Cobrar → Cerrar

COMPRA:
Necesidad → Cotizacion A PROVEEDORES → Comparar → Seleccionar →
  Orden de compra (OC-001) → Proveedor entrega + factura →
  Registrar factura (OCR/manual) → Entrada inventario → Pagar → Cerrar
```

---

## Modulo: Catalogo de Productos (CENTRAL)

El catalogo es el CORAZON del sistema. Todo se vincula a productos.

### Campos por producto:
- Codigo interno (autogenerado: PRD-001)
- Nombre
- Categoria (EPP, Aseo, Cafeteria, etc.)
- Unidad de medida
- IVA del producto (19%, 5%, 0%, excluido)
- Margen minimo % (no se puede vender por debajo)
- **Costo promedio ponderado** (calculado automaticamente de las compras)
- Precio de venta sugerido (costo / (1 - margen%))
- Stock actual (entradas - salidas)
- Proveedores que lo venden (multi-proveedor)
- Historial de precios de compra
- Historial de precios de venta
- Ultimo proveedor
- Ultima fecha de compra

### Calculo del costo promedio ponderado:
```
Compra 1: 5 cascos a $38.000
Compra 2: 5 cascos a $36.000
Compra 3: 5 cascos a $40.000

Costo promedio = (5*38000 + 5*36000 + 5*40000) / 15 = $38.000

Si luego compro 10 mas a $35.000:
Nuevo promedio = (15*38000 + 10*35000) / 25 = $36.800
```

El costo se recalcula automaticamente cada vez que se registra una compra.

---

## Modulo: Cotizaciones (a CLIENTES)

### Numeracion automatica: COT-AAAA-NNN
Ejemplo: COT-2026-001, COT-2026-002...

### Flujo:
```
1. Se crea cotizacion → Estado: PENDIENTE
2. Se seleccionan productos del catalogo
   → El costo viene AUTOMATICO (promedio ponderado)
   → Se define precio de venta (puede ser diferente por cliente)
   → IVA se aplica segun el producto (19%, 5%, 0%)
3. Se calcula automaticamente: subtotal, IVA, total, costo, utilidad, margen
4. Se envia al cliente (PDF exportable a futuro)
5. Cliente responde:
   → APROBADA: pasa al siguiente paso
   → RECHAZADA: se cierra con motivo
   → VENCIDA: si pasan X dias sin respuesta
```

### Campos:
- Numero de cotizacion (auto)
- Cliente (del directorio)
- Fecha de emision
- Fecha de validez (ej: 15 dias)
- Items (del catalogo, con precio venta editable + costo automatico)
- Observaciones
- Estado: PENDIENTE | APROBADA | RECHAZADA | VENCIDA
- Descuento (%) — con alerta si baja del margen minimo

---

## Modulo: Ordenes de Compra (a PROVEEDORES)

### Numeracion automatica: OC-AAAA-NNN

### Flujo:
```
1. Se detecta necesidad (por cotizacion aprobada o por stock bajo)
2. Se solicitan precios a 1 o mas proveedores
   (opcionalmente se crea "Solicitud de Cotizacion a Proveedores")
3. Se selecciona proveedor
4. Se crea Orden de Compra → Estado: ENVIADA
5. Proveedor confirma → Estado: CONFIRMADA
6. Proveedor entrega → Estado: RECIBIDA (parcial o total)
7. Se registra la factura del proveedor → Entrada a inventario
8. Se paga → Estado: PAGADA / CERRADA
```

### Campos:
- Numero OC (auto)
- Proveedor (del directorio)
- Vinculada a cotizacion (opcional — para saber POR QUE se compro)
- Items (producto, cantidad, precio cotizado)
- Fecha emision
- Fecha entrega esperada
- Estado: BORRADOR | ENVIADA | CONFIRMADA | RECIBIDA_PARCIAL | RECIBIDA | PAGADA | CERRADA | ANULADA
- Notas

---

## Modulo: Facturas de Compra (del PROVEEDOR)

### Flujo:
```
1. Llega factura del proveedor (fisica o electronica)
2. Se carga al sistema:
   OPCION A (futuro): OCR con IA → reconoce automaticamente items, valores, IVA
   OPCION B (actual): Se registra manualmente pero vinculada a la OC
3. Se valida que coincida con la Orden de Compra
4. Se almacena el PDF
5. Se genera automaticamente:
   → Entrada a inventario (actualiza stock + costo promedio)
   → Registro de IVA pagado
   → Cuenta por pagar (si es a credito)
6. Se paga:
   → Se registra el pago (fecha, monto, medio)
   → Se vincula con movimiento bancario (Bold a futuro)
   → Se cierra la cuenta por pagar
```

### Datos que se extraen/registran:
- Proveedor
- Numero de factura del proveedor
- Fecha de factura
- Fecha de vencimiento (si credito)
- Items: producto, cantidad, precio unitario, IVA por item
- Subtotal, IVA total, retenciones, total
- Forma de pago
- PDF adjunto
- Vinculacion a Orden de Compra (OC-xxx)

---

## Modulo: Facturas de Venta (DIAN)

### Flujo:
```
1. Cotizacion aprobada → Se genera factura
2. Numero de factura: se ingresa manualmente (lo da el sistema DIAN)
   → A futuro: integracion directa con DIAN
3. La factura hereda los items de la cotizacion
4. Se registra automaticamente:
   → IVA cobrado
   → Cuenta por cobrar (si es a credito)
   → Salida de inventario
5. Cliente paga:
   → Se registra el cobro
   → Se vincula con movimiento bancario (Bold a futuro)
   → Se cierra la cuenta por cobrar
```

### Relacion cotizacion-factura:
- Una cotizacion puede generar 1 factura (caso normal)
- Una cotizacion puede generar N facturas (entregas parciales)
- Una factura SIEMPRE tiene una cotizacion padre

---

## Fichas integradas

### Ficha de PROVEEDOR (al abrirlo se ve TODO):
- Datos basicos (NIT, contacto, condiciones)
- Documentos adjuntos (RUT, Camara, certificaciones)
- Compras realizadas (listado de facturas con estado)
- Ordenes de compra (abiertas y cerradas)
- Pagos realizados (historial)
- Deuda actual (cuentas por pagar)
- Productos que nos vende (con historial de precios)
- Calificacion/evaluacion
- Estadisticas: total comprado, promedio mensual, cumplimiento

### Ficha de CLIENTE (al abrirlo se ve TODO):
- Datos basicos (NIT, contacto, direccion entrega)
- Cotizaciones (historial completo con estado)
- Facturas de venta (con estado de cobro)
- Cobros recibidos (historial de pagos)
- Deuda actual (cuentas por cobrar)
- Productos que nos compra (con frecuencia)
- Estadisticas: total vendido, margen promedio, frecuencia, ticket promedio
- Alertas: "No compra hace X dias", "Compra dotacion cada 6 meses"

---

## IVA — Manejo exacto

### Principio: El IVA de la VENTA es independiente del IVA de la COMPRA

```
COMPRA:
- Compro 5 cascos a Prov A: $38.000 + IVA 19% = $7.220 de IVA
- Compro 5 cascos a Prov B: $36.000 + IVA 19% = $6.840 de IVA
- Compro 5 cascos a Prov C: $40.000 + IVA 19% = $7.600 de IVA
- Total IVA pagado en estas compras: $21.660

VENTA:
- Vendo 15 cascos al cliente a $55.000 + IVA 19%
- IVA cobrado: 15 × $55.000 × 19% = $156.750

CRUCE:
- IVA cobrado: $156.750
- IVA pagado (de TODAS las compras del periodo): $21.660 + otros...
- IVA a pagar DIAN = cobrado - pagado (del periodo completo)
```

### Lo importante:
- El IVA pagado NO se vincula "1 a 1" con cada venta
- Se acumula por PERIODO (bimestral/cuatrimestral)
- Al final del periodo se cruza: todo lo cobrado - todo lo pagado = a pagar
- El ERP acumula esto automaticamente con cada compra y cada venta
- El Centro de Control Financiero muestra el acumulado en tiempo real

---

## Integracion con Bold (cuenta bancaria)

### Investigar:
- Bold tiene API publica? (consultar documentacion)
- Si tiene API: conectar para leer movimientos automaticamente
- Si NO tiene API: registro manual de pagos/cobros con referencia

### Lo minimo (sin API):
- Registrar pagos a proveedores (fecha, monto, referencia Bold)
- Registrar cobros de clientes (fecha, monto, referencia Bold)
- Conciliacion: vincular pago/cobro con factura correspondiente

### Lo ideal (con API):
- Lectura automatica de movimientos
- Match automatico: "Entro $1.785.000 de Evolti" → vincula con factura FV-003
- Alertas: "Hay un ingreso de $500.000 sin factura asociada"

---

## OCR de facturas con IA (fase futura)

### Concepto:
- Subes la foto/PDF de la factura del proveedor
- La IA extrae automaticamente: proveedor, NIT, items, cantidades, precios, IVA, total
- Tu solo confirmas o corriges
- Se registra todo automaticamente

### Opciones tecnicas:
- Google Cloud Vision + GPT para parseo
- Supabase Edge Functions + OpenAI API
- O un servicio especializado (Veryfi, Mindee, etc.)

### MVP de OCR:
1. Se sube el PDF
2. Se extrae texto con OCR basico
3. Se presenta al usuario para confirmar los datos
4. Se registra con un click

---

## Numeracion automatica

| Documento | Formato | Ejemplo |
|---|---|---|
| Cotizacion a cliente | COT-AAAA-NNN | COT-2026-001 |
| Orden de compra | OC-AAAA-NNN | OC-2026-001 |
| Factura de venta | Se ingresa el de DIAN | FE-ABASTECER-001 |
| Producto | PRD-NNN | PRD-001 |

---

## Resumen de lo que se reconstruye

| Modulo | Estado actual | Que cambia |
|---|---|---|
| Catalogo Productos | Basico (solo tabla) | Se vuelve CENTRAL: costo auto, stock, multi-proveedor |
| Cotizaciones | No existe separado | Nuevo modulo: COT con items del catalogo, costo auto |
| Ordenes de Compra | No existe | Nuevo: OC a proveedores con estados |
| Facturas Compra | Existe pero aislado | Se vincula a OC, actualiza inventario y costo promedio |
| Facturas Venta | Mezclado con cotizacion | Se separa: hereda de cotizacion, numero DIAN |
| Ficha Proveedor | Solo datos | Se agrega: historial compras, pagos, deuda, docs |
| Ficha Cliente | Solo datos | Se agrega: historial ventas, cobros, frecuencia |
| Pagos/Cobros | No existe | Nuevo: registro de pagos y cobros (Bold manual o API) |
| IVA | Calculo basico | Acumulado exacto por periodo, multi-compra |
| OCR | No existe | Fase futura: carga de factura con IA |

---

## Orden de reconstruccion

1. **Catalogo de Productos** (el corazon — todo depende de esto)
2. **Cotizaciones a clientes** (con items del catalogo)
3. **Ordenes de Compra a proveedores**
4. **Facturas de compra** (vinculadas a OC, actualizan costo promedio)
5. **Facturas de venta** (vinculadas a cotizacion, numero DIAN)
6. **Pagos y cobros** (registro de movimientos de dinero)
7. **Fichas integradas** (proveedor y cliente con todo el historial)
8. **Centro Financiero v2** (con datos reales de todo lo anterior)
9. **OCR de facturas** (fase futura)
10. **Integracion Bold** (cuando haya API o workaround)

---

> **Documento vivo. Se actualiza con feedback de Julio.**
> **Proxima sesion: empezar reconstruccion desde el Catalogo de Productos.**
