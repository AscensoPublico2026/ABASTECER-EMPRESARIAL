# Visión del ERP — Abastecer Empresarial SAS

> El ERP de Abastecer Empresarial no es solo software. Es el **Sistema Operativo del Negocio** — codifica las políticas, automatiza las decisiones, y es la única fuente de verdad operativa.

---

## ¿Qué es el ERP?

### Business Operating System (BOS)
El ERP es el **Sistema Operativo del Negocio**. Así como un computador necesita un sistema operativo para funcionar, Abastecer Empresarial necesita su ERP para operar.

No es un sistema genérico adaptado. Es un sistema **construido específicamente** para codificar nuestras políticas, flujos y reglas de negocio.

### ¿Por qué propio y no comprar uno?

| ERP genérico | Nuestro ERP |
|--------------|-------------|
| Políticas como notas mentales | Políticas como código ejecutable |
| Semáforo financiero manual | Semáforo automático en tiempo real |
| "Dinero con nombre" en Excel | Categorización automática por transacción |
| Análisis de rentabilidad manual | Rentabilidad por venta automática |
| Multi-proveedor manual | Cotización y comparación integrada |
| Regla del Día Después = recordatorio | Regla del Día Después = bloqueo automático |

### Lo que el ERP DEBE hacer
1. **Impedir decisiones que violen las políticas** (no solo advertir, bloquear)
2. **Mostrar la realidad financiera** (no el saldo del banco, sino la caja libre)
3. **Automatizar lo repetitivo** (cotizaciones, órdenes, facturación)
4. **Dar inteligencia** (qué producto renta más, qué cliente compra más, qué proveedor es mejor)
5. **Documentar todo** (cada transacción con trazabilidad completa)

---


## Filosofía de desarrollo

### Principios

| Principio | Significado |
|-----------|-------------|
| **Modelo de negocio primero** | Primero se define cómo opera la empresa, después se codifica |
| **Iterativo** | Se construye por fases, cada fase operativa antes de la siguiente |
| **Integral** | Todos los módulos se conectan, no son islas independientes |
| **Políticas como código** | Las 6 políticas financieras son reglas ejecutables, no documentos |
| **Datos como activo** | Cada dato capturado tiene propósito analítico futuro |
| **Simplicidad de uso** | Si Laura no puede usarlo sin manual, está mal diseñado |

### Reglas de desarrollo
1. Cada módulo debe tener una razón de negocio clara
2. No se construye funcionalidad "por si acaso"
3. MVP primero, perfección después
4. El usuario principal es el equipo operativo (no desarrolladores)
5. Mobile-first para operaciones de campo (entregas, visitas)

---

## Los 10 módulos

### Módulo 1: Capital y Socios

**Propósito:** Gestionar la estructura societaria, aportes, préstamos, y participaciones.

| Funcionalidad | Descripción |
|---------------|-------------|
| Registro de socios | Datos de cada socio, participación porcentual |
| Aportes de capital | Registro de aportes iniciales y adicionales |
| Préstamos de socios | Control de préstamos que los socios hacen a la empresa |
| Distribución de dividendos | Cálculo y registro según participación |
| Historial de movimientos | Trazabilidad completa de cada transacción socio-empresa |
| Saldo socio | ¿Cuánto debe la empresa a cada socio? ¿Cuánto ha recibido? |

**Política codificada:** Decisión #018 (Préstamo vs. Aporte), Decisión #011 (Retiros clasificados)

---

### Módulo 2: Centro de Control Financiero

**Propósito:** El corazón del sistema. Muestra la verdad financiera en tiempo real.

| Funcionalidad | Descripción |
|---------------|-------------|
| Saldo real (caja libre) | Saldo bancario menos todos los compromisos |
| Dinero con nombre | Categorización automática de cada peso |
| Semáforo financiero | Las 7 condiciones verificadas en tiempo real |
| Regla del Día Después | Cálculo automático: ¿sobrevivimos 60 días? |
| Flujo de caja proyectado | Próximos 30/60/90 días |
| Alertas | Cuando una categoría está por debajo del mínimo |
| Dashboard ejecutivo | Resumen visual del estado financiero |

**Políticas codificadas:** #010 (Day After Rule), #012 (Dinero con nombre), #007 (Semáforo), #014 (IVA intocable)

---

### Módulo 3: Compras

**Propósito:** Gestionar todo el proceso de adquisición de productos.

| Funcionalidad | Descripción |
|---------------|-------------|
| Órdenes de compra | Crear, aprobar, enviar a proveedor |
| Multi-cotización | Solicitar precio a múltiples proveedores por producto |
| Comparador de precios | Ver historial de precios por proveedor |
| Recepción de mercancía | Verificar que lo recibido coincide con lo pedido |
| Vinculación con venta | Cada compra sabe a qué venta pertenece |
| Costos adicionales | Transporte, seguros, otros costos asociados |

**Política codificada:** #004 (Bajo demanda), #017 (Promedio ponderado)

---

### Módulo 4: Inventario Inteligente

**Propósito:** Control de stock con costeo automático y trazabilidad.

| Funcionalidad | Descripción |
|---------------|-------------|
| Stock en tiempo real | Cantidades actuales por producto/ubicación |
| Costeo promedio ponderado | Cálculo automático con cada entrada |
| Movimientos | Entradas, salidas, ajustes, transferencias |
| Productos sin rotación | Alertas de productos que no se mueven |
| Valorización | Valor total del inventario en cualquier momento |
| Lotes/vencimientos | Para productos perecederos (aseo, cafetería) |

**Política codificada:** #017 (Promedio ponderado), #004 (Bajo demanda = inventario mínimo)

---

### Módulo 5: Ventas

**Propósito:** Gestionar el ciclo completo de venta desde cotización hasta cobro.

| Funcionalidad | Descripción |
|---------------|-------------|
| Cotizaciones | Crear y enviar cotizaciones a clientes |
| Órdenes de venta | Convertir cotización en orden |
| Facturación | Generar factura electrónica |
| Análisis por venta | Rentabilidad de CADA venta individual |
| Descuentos controlados | Con aprobación y límites definidos |
| Estados de orden | Abierta, en proceso, entregada, facturada, cobrada |
| Cuentas por cobrar | Seguimiento de cartera por cliente |

**Política codificada:** #019 (Registro formal de clientes)

---

### Módulo 6: Proveedores

**Propósito:** Base de datos completa de proveedores con evaluación de desempeño.

| Funcionalidad | Descripción |
|---------------|-------------|
| Registro formal | Datos legales, bancarios, comerciales |
| Categorías que suministra | Qué vende cada proveedor |
| Condiciones comerciales | Plazos de pago, descuentos por volumen, mínimos |
| Evaluación de desempeño | Cumplimiento, calidad, tiempos |
| Historial de precios | Evolución de precios por producto |
| Contactos | Vendedor, gerente, cartera, despachos |
| Documentos | RUT, Cámara de Comercio, certificaciones |

**Política codificada:** #019 (Proceso formal de registro)

---

### Módulo 7: Clientes / CRM

**Propósito:** Gestión integral de la relación con clientes.

| Funcionalidad | Descripción |
|---------------|-------------|
| Registro formal | Datos legales, contactos, sedes |
| Análisis de crédito | Límite de crédito basado en historial |
| Historial de compras | Qué compra, cuánto, con qué frecuencia |
| Seguimiento comercial | Oportunidades, visitas, llamadas |
| Satisfacción | Registro de quejas, felicitaciones, mediciones |
| Segmentación | Por tamaño, sector, categorías que compra |
| Recordatorios | Recompra esperada, renovaciones, seguimientos |

**Política codificada:** #019 (Registro formal), #003 (100% B2B)

---

### Módulo 8: Producto / Catálogo

**Propósito:** Base de datos maestra de productos con pricing inteligente.

| Funcionalidad | Descripción |
|---------------|-------------|
| Catálogo completo | Todos los productos con fotos, descripciones, specs |
| Categorización | Por las 10 categorías principales + subcategorías |
| Pricing inteligente | Margen mínimo, precio sugerido, precio por volumen |
| Multi-proveedor | Un producto puede tener múltiples proveedores |
| Historial de costos | Cómo ha cambiado el costo en el tiempo |
| Sustitutos | Productos equivalentes de diferentes marcas |
| Fichas técnicas | Documentación técnica adjunta |

**Ideas clave de pricing:**
- Margen mínimo por categoría (nunca vender por debajo)
- Precio dinámico según volumen del pedido
- Descuentos solo con aprobación explícita
- Referencia a precios de base de datos de Evolti (si aplica)

---

### Módulo 9: Contabilidad e Impuestos

**Propósito:** Gestión tributaria y contable automatizada.

| Funcionalidad | Descripción |
|---------------|-------------|
| IVA automático | Cálculo y apartado automático por transacción |
| Retenciones | Registro de retenciones que nos hacen y que hacemos |
| Libro diario | Movimientos contables automáticos |
| Estados financieros | Balance, P&G, flujo de efectivo |
| Declaraciones | Preparación de datos para declaraciones tributarias |
| Integración con DIAN | Facturación electrónica |
| Informes para contador | Exportar datos listos para el contador |

**Política codificada:** #006 (IVA desde inicio), #014 (IVA intocable primer año)

---

### Módulo 10: Indicadores e Inteligencia

**Propósito:** Convertir datos en decisiones con análisis automático.

| Funcionalidad | Descripción |
|---------------|-------------|
| KPIs en tiempo real | Ventas, margen, rotación, cartera |
| Análisis de rentabilidad | Por producto, cliente, categoría, venta individual |
| Tendencias | Crecimiento mensual, estacionalidad |
| Alertas inteligentes | "Cliente X no ha comprado en 45 días" |
| Comparativos | Este mes vs. anterior, este trimestre vs. anterior |
| Índice de Madurez | ¿Estamos listos para crecer? (vinculado a Sección 14) |
| Recomendaciones | Sugerencias basadas en datos |

---


## Flujos operativos

### Flujo 1: Venta a crédito

```
1. Cliente contacta con necesidad
2. Se verifica que el cliente está registrado
   └─ Si no → Flujo de registro de cliente
3. Se consulta límite de crédito disponible
   └─ Si no alcanza → Se negocia pago anticipado o parcial
4. Se crea cotización
   └─ Se consultan precios con margen mínimo
   └─ Se verifican productos con múltiples proveedores
5. Cliente aprueba cotización
6. Se convierte en Orden de Venta (estado: ABIERTA)
7. Se generan Órdenes de Compra a proveedor(es)
8. Se recibe mercancía del proveedor
9. Se actualiza inventario (entrada)
10. Se despacha al cliente
11. Se actualiza inventario (salida)
12. Se genera factura electrónica
13. Se registra cuenta por cobrar
14. Se aparta IVA automáticamente
15. Orden pasa a estado: FACTURADA
16. Cliente paga en fecha acordada
17. Se registra el pago, se cruza con factura
18. Orden pasa a estado: COBRADA (cerrada)
19. Se calcula rentabilidad de esta venta
```

---

### Flujo 2: Venta de contado

```
1-6. Igual que venta a crédito hasta Orden de Venta
7. Cliente paga anticipadamente (transferencia, Bold, efectivo)
8. Se confirma pago
9. Se generan Órdenes de Compra a proveedor(es)
10. Se recibe mercancía
11. Se actualiza inventario (entrada)
12. Se despacha al cliente
13. Se actualiza inventario (salida)
14. Se genera factura electrónica
15. Se aparta IVA automáticamente
16. Orden pasa a estado: CERRADA
17. Se calcula rentabilidad
```

---

### Flujo 3: Compra con inventario (stock)

```
1. Se identifica necesidad de stock (producto de alta rotación)
2. Se verifica presupuesto disponible en "Capital de trabajo"
3. Se consultan proveedores para ese producto
4. Se solicitan cotizaciones (multi-proveedor)
5. Se compara: precio, tiempo de entrega, condiciones
6. Se selecciona proveedor
7. Se genera Orden de Compra
8. Se paga al proveedor
9. Se recibe mercancía
10. Se actualiza inventario:
    └─ Entrada al stock
    └─ Se recalcula costo promedio ponderado
11. Orden de compra: CERRADA
```

---

### Flujo 4: Compra a crédito con proveedor

```
1-7. Igual que Flujo 3 hasta Orden de Compra
8. Proveedor despacha con factura a crédito (15/30/45/60 días)
9. Se registra cuenta por pagar
10. Se recibe mercancía
11. Se actualiza inventario
12. Se programa pago en fecha de vencimiento
13. Llega fecha de pago:
    └─ Se verifica que hay fondos en "Cuentas por pagar"
    └─ Se realiza el pago
    └─ Se registra en contabilidad
14. Orden de compra: CERRADA
```

---

### Flujo 5: Cotización multi-proveedor

```
1. Se necesita un producto para una venta
2. El sistema muestra proveedores que manejan ese producto
3. Se envía solicitud de cotización a múltiples proveedores
4. Se registran las respuestas:
   - Proveedor A: $X, entrega 3 días, pago contado
   - Proveedor B: $Y, entrega 1 día, pago 30 días
   - Proveedor C: $Z, entrega 5 días, pago 15 días
5. Comparador muestra:
   - Mejor precio
   - Mejor tiempo
   - Mejor condición de pago
   - Recomendación según prioridad (para esta venta específica)
6. Se selecciona proveedor
7. Se genera Orden de Compra
```

---

### Flujo 6: Registro de proveedor

```
1. Se identifica un nuevo proveedor potencial
2. Se solicitan datos:
   - Razón social, NIT, dirección
   - Contacto comercial (nombre, teléfono, email)
   - Categorías que maneja
   - Condiciones comerciales (plazos, descuentos, mínimos)
   - Datos bancarios
   - Documentos (RUT, Cámara de Comercio)
3. Se registra en el sistema como "PENDIENTE DE VALIDACIÓN"
4. Se validan datos y documentos
5. Estado pasa a "ACTIVO"
6. Se asocian productos/categorías
7. Proveedor disponible para cotizaciones y órdenes
```

---

### Flujo 7: Registro de cliente

```
1. Se identifica un prospecto o cliente nuevo
2. Se solicitan datos:
   - Razón social, NIT, dirección
   - Contactos (compras, pagos, recepción)
   - Sector económico, tamaño
   - Necesidades de abastecimiento (categorías)
   - Frecuencia esperada de compra
3. Se realiza análisis básico de crédito:
   - ¿Es empresa constituida?
   - ¿Tiene historial verificable?
   - Crédito inicial conservador (primer pedido de contado o crédito mínimo)
4. Se registra en el sistema
5. Se define:
   - Límite de crédito inicial
   - Días de crédito
   - Condiciones especiales (si aplican)
6. Estado: ACTIVO
7. Se puede crear primera cotización
```

---

### Flujo 8: Inyección de capital / Préstamo de socio

```
1. Socio identifica que la empresa necesita dinero
2. Se evalúa: ¿es necesidad temporal o permanente?
   ├─ TEMPORAL → Se registra como PRÉSTAMO
   │   - Se define monto
   │   - Se define si tiene interés o no
   │   - Se define plazo estimado de devolución
   │   - Se registra en módulo Capital/Socios
   │   - NO cambia participación accionaria
   │   - Se devuelve cuando hay flujo disponible
   │
   └─ PERMANENTE → Se registra como APORTE DE CAPITAL
       - Se define monto
       - Se recalcula participación accionaria (si aplica)
       - Se actualiza escritura/acta (trámite legal)
       - Se registra en módulo Capital/Socios
       - NO se devuelve (forma parte del patrimonio)

3. En ambos casos:
   - El dinero entra con "nombre" (categoría asignada)
   - Se actualiza el saldo del socio
   - Se refleja en Centro de Control Financiero
```

---


## Ideas clave del ERP

### Pricing inteligente
- Cada producto tiene un **margen mínimo** configurado por categoría
- El sistema **alerta** si una cotización está por debajo del margen mínimo
- El sistema **bloquea** si una cotización está por debajo del costo
- Precios especiales por volumen (escalas configurables)
- Historial de precios al mismo cliente (consistencia)

### Análisis por venta (rentabilidad unitaria)
Cada venta sabe exactamente:
- ¿Cuánto costó el producto?
- ¿Cuánto se vendió?
- ¿Cuánto costó el envío?
- ¿Cuánto fue el IVA neto?
- ¿Hubo descuento? ¿Cuánto?
- **Utilidad neta de ESTA venta específica**

Esto permite responder: "¿Me conviene este cliente?" "¿Me conviene este producto?"

### Multi-proveedor por venta
Una sola venta puede involucrar compras a múltiples proveedores:
- EPP → Proveedor A
- Aseo → Proveedor B
- Cafetería → Proveedor C

El ERP coordina todas las compras para una sola entrega al cliente.

### Órdenes abiertas vs. cerradas
```
ABIERTA:    Se creó la orden pero falta algo (pago, despacho, recepción)
EN PROCESO: Se está ejecutando (comprando, preparando, en tránsito)
ENTREGADA:  El cliente recibió la mercancía
FACTURADA:  Se generó factura electrónica
COBRADA:    El dinero está en nuestra cuenta
CERRADA:    Todo completo, calculada la rentabilidad
CANCELADA:  Se anuló (con razón documentada)
```

### Base de datos Evolti como referencia
- Julio tiene acceso a la base de datos de productos de Evolti
- Se puede usar como **referencia de precios de mercado**
- NO es copia — es benchmark para validar nuestros márgenes
- Ayuda a identificar productos con potencial

### Descuentos controlados
- Todo descuento requiere **aprobación explícita**
- Se define un % máximo de descuento por rol
- Si supera el máximo → requiere aprobación de ambos socios
- Cada descuento queda registrado con justificación
- Análisis: ¿Los descuentos están generando más ventas o erosionando margen?

---

## MVP — Producto Mínimo Viable

### Definición
El MVP es la versión mínima del ERP que permite realizar la primera venta de forma controlada y documentada.

### 7 funcionalidades del MVP

| # | Funcionalidad | Módulo | Justificación |
|---|---------------|--------|---------------|
| 1 | Registrar proveedores | Proveedores | Necesitamos saber a quién comprar |
| 2 | Registrar clientes | Clientes/CRM | Necesitamos saber a quién vender |
| 3 | Crear cotización | Ventas | El primer paso de toda venta |
| 4 | Registrar compra | Compras | Para saber cuánto gastamos |
| 5 | Registrar venta y factura | Ventas | Para cobrar formalmente |
| 6 | Ver caja libre (saldo real) | Centro Control | Para no gastar lo que no es nuestro |
| 7 | Calcular rentabilidad por venta | Indicadores | Para saber si la venta fue negocio |

### Lo que NO está en el MVP
- Inventario completo (porque trabajamos bajo demanda)
- CRM avanzado (con 1-5 clientes se gestiona manual)
- Facturación electrónica integrada (se puede hacer por plataforma DIAN inicialmente)
- Indicadores avanzados (con pocas ventas no hay suficientes datos)
- Multi-usuario con roles (somos 2 personas)

### Criterio de "listo para primera venta"
El ERP está listo cuando podemos:
1. ✅ Registrar el pedido del cliente
2. ✅ Cotizar con el proveedor
3. ✅ Registrar la compra (cuánto pagamos)
4. ✅ Registrar la venta (cuánto cobramos)
5. ✅ Ver cuánto ganamos en esa venta
6. ✅ Saber cuánto de lo que hay en el banco es realmente libre
7. ✅ Tener trazabilidad completa de la operación

---

## Próximos pasos para el diseño

### Fase 1: Modelo de datos
1. Definir entidades principales (tablas)
2. Definir relaciones entre entidades
3. Definir campos de cada entidad
4. Validar con flujos operativos (¿el modelo soporta todos los flujos?)
5. Diseñar en Supabase (PostgreSQL)

### Fase 2: Interfaz de usuario
1. Wireframes de las pantallas principales
2. Definir navegación (sidebar actual)
3. Diseñar formularios de captura
4. Diseñar dashboards de visualización
5. Mobile-first para operaciones de campo

### Fase 3: Lógica de negocio
1. Implementar cálculos de IVA
2. Implementar costeo promedio ponderado
3. Implementar semáforo financiero
4. Implementar "dinero con nombre"
5. Implementar análisis de rentabilidad por venta

### Fase 4: Integraciones
1. Facturación electrónica (DIAN)
2. Pasarela de pagos (Bold)
3. Notificaciones (email/WhatsApp)
4. Backup automático

---

## Stack tecnológico

| Componente | Tecnología | Razón |
|------------|------------|-------|
| Frontend | Next.js 14 (App Router) | SSR, rendimiento, ecosistema React |
| Estilos | Tailwind CSS | Rapidez de desarrollo, consistencia |
| Backend/DB | Supabase (PostgreSQL) | Auth, DB, Storage, Realtime, gratuito inicial |
| Hosting | Vercel | Deploy automático, integración con Next.js |
| Auth | Supabase Auth | Integrado, seguro, simple |
| Estado | React Context / Zustand | Ligero, suficiente para MVP |

---

*Documento vivo — se actualiza con cada decisión de diseño.*
*Última actualización: Julio 2026*
