# Plantilla de Conciliación Bancaria - Abastecer Empresarial SAS

## Instrucciones

1. Crea un archivo de Excel con estas columnas
2. Cada vez que hagas un movimiento (pago, cobro, transferencia), agrégalo
3. Al final de la semana, compara el DISPONIBLE con el extracto de Bold: deben dar IGUAL

## Estructura

| Columna | Qué es | Ejemplo |
|---------|--------|---------|
| FECHA | Día del movimiento | 02/08/2026 |
| CONCEPTO | Qué fue | ALKOSTO CALI NORTE - IMPRESORA |
| INGRESO | Si entró plata, cuánto | 1.486.720 |
| EGRESO | Si salió plata, cuánto | 779.070 |
| 4x1000 | Lo que cobra el banco por la salida (egreso × 0,004). Solo en egresos que NO sean entre cuentas propias | 3.116,28 |
| OBSERVACIONES | Para qué fue | ACTIVO FIJO |

## Fórmulas clave (Excel)

```
INGRESOS TOTALES    = SUMA(columna INGRESO)
EGRESOS TOTALES     = SUMA(columna EGRESO) + SUMA(columna 4x1000)
DISPONIBLE EN BANCO = INGRESOS TOTALES - EGRESOS TOTALES
```

Si tienes CAJA MENOR:
```
DINERO DISPONIBLE TOTAL = DISPONIBLE EN BANCO + saldo caja menor
```

## La regla del 4x1000

- Sale plata a un proveedor, un gasto, un retiro a efectivo → **SÍ lleva 4x1000**
- Traslado entre tus propias cuentas bancarias (ej: de Bold a la cuenta de impuestos del mismo banco) → **NO lleva 4x1000**
- Retiro a caja menor (efectivo) → **SÍ lleva 4x1000** (es plata que sale del patrimonio bancario)

Fórmula: `= egreso × 0,004` (con los 4 decimales, el banco cobra centavos)

## Qué NO va en este Excel

- Los impuestos que debes guardar para la DIAN (eso lo calcula el ERP en Obligaciones DIAN)
- La utilidad de cada venta (eso lo calcula el ERP automáticamente)
- El costo de los productos (eso viene de las facturas de compra registradas)

## Frecuencia recomendada

**Semanal** mientras estés en los primeros meses. Quincenal cuando ya esté estable.

## Cómo verificar que cuadra

1. Entra al extracto de Bold
2. Mira el saldo disponible
3. Compara con tu celda DISPONIBLE EN BANCO

Si cuadra: todo bien, sigue.
Si no cuadra: busca la fecha donde se desvía y revisa qué movimiento falta o sobra.

## El ERP ya no lleva este control

El módulo de Tesorería se eliminó porque:
- El banco tiene información que el ERP no puede saber (si cobró o no el 4x1000, si un pago rebotó)
- Un solo dato mal digitado descuadraba todo sin que nada lo avisara
- Era doble trabajo: registrar en el ERP y luego verificar contra el extracto

El Excel hecho a mano es más confiable porque tú copias directo del extracto. Y el ERP sigue calculando lo que SÍ puede calcular bien: el IVA, el Simple, los costos y la utilidad de cada venta.
