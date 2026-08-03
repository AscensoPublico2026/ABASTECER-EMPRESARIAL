# Manual: administrar la página web

Todo lo que se ve en `abastecerempresarial.com` se cambia desde el ERP, en el menú **Sitio Web**. No hay que llamar a nadie ni saber programar.

---

## Las cuatro pestañas

| Pestaña | Para qué sirve |
|---|---|
| **Resumen** | Cuántos productos están publicados, cuántos les falta foto y cuántas solicitudes nuevas hay |
| **Contenido** | Todos los textos de la web: título principal, misión, visión, valores, teléfonos, WhatsApp, redes |
| **Productos** | Qué productos ve el cliente, con qué foto, nombre y descripción |
| **Líneas** | El nombre, la descripción y el ícono de cada línea de producto |
| **Solicitudes** | Los mensajes y las listas de cotización que llegan de la web |

Cada cambio que guardas se ve en la web **en segundos**.

---

## Editar textos (pestaña Contenido)

Las secciones están a la izquierda. Elige una, cambia lo que quieras y presiona **Guardar y publicar**.

### Campos normales
Se escriben tal cual. Con tildes y mayúsculas normales: **este texto lo lee el cliente**, no es un campo del ERP.

### Campos de tipo lista
Algunos campos piden **una cosa por línea**, y dentro de la línea las partes se separan con una barra `|`.

**Ejemplo — Cifras destacadas** (formato `VALOR|ETIQUETA`):
```
24 h|Respuesta a tu cotización
11|Líneas de abastecimiento
1|Solo proveedor para todo
100%|Factura electrónica
```

**Ejemplo — Beneficios y Valores** (formato `ICONO|TÍTULO|DESCRIPCIÓN`):
```
reloj|Cotización en 24 horas|Respondemos rápido y con precios claros.
camion|Entregas cumplidas|Llegamos cuando dijimos que íbamos a llegar.
```

**Ejemplo — Sectores** (formato `ICONO|NOMBRE`):
```
casco|Construcción y obra civil
hospital|Salud e instituciones
```

Para agregar un ítem: agrega una línea. Para quitarlo: borra la línea.

### Íconos disponibles

Se escriben en minúscula, tal cual:

`casco` · `gafas` · `guantes` · `botas` · `camiseta` · `escoba` · `cafe` · `papel` · `tarjeta` · `extintor` · `senal` · `llave` · `portatil` · `rayo` · `caja` · `escudo` · `medalla` · `manos` · `camion` · `reloj` · `factura` · `estrella` · `usuarios` · `ojo` · `mapa` · `fabrica` · `hospital` · `tienda` · `edificio` · `tractor` · `telefono` · `correo` · `check` · `brillo`

Si escribes un nombre que no existe, se muestra una caja. No se rompe nada.

### El WhatsApp

El campo **WhatsApp** debe tener solo números **con el indicativo del país**:

- Correcto: `573508624021`
- También sirve: `3508624021` (le agregamos el 57 automáticamente)
- No sirve: `+57 350 862 4021` (aunque se limpia solo, mejor escribirlo derecho)

El **mensaje automático** es el texto con el que se abre el chat cuando el cliente da clic en cualquier botón de WhatsApp.

### Redes sociales

Si dejas la casilla vacía, ese ícono **no aparece** en la web. Cuando tengan Instagram, pegan la URL completa y el ícono aparece solo.

---

## Publicar productos (pestaña Productos)

### Regla base
Los productos se crean en **Catálogo** (el módulo de inventario de siempre). Desde que se crean, **ya quedan visibles en la web**. Aquí solo se decide *cómo* se ven.

### Lo que puedes hacer en cada producto

| Botón | Qué hace |
|---|---|
| **En la web / Oculto** | Publica u oculta el producto del catálogo público |
| **Estrella** | Lo destaca en la página de inicio |
| **Editar web** | Abre la ficha completa: foto, nombre comercial, descripción, especificaciones |

### Subir fotos

Dentro de **Editar web** → **Subir imagen**. Puedes usar fotos del celular sin preocuparte por el peso: la imagen se reduce y se convierte automáticamente antes de subirse (una foto de 5 MB queda en unos 150 KB).

Recomendaciones:
- Fondo blanco o claro, producto centrado.
- Cuadrada si se puede (se ve mejor en la ficha).
- Si un producto no tiene foto, la web muestra un ícono elegante de su línea. **No se ve roto**, pero con foto vende mucho más.

### Nombre para la web

El catálogo interno guarda los nombres en MAYÚSCULA SIN TILDES (así funciona el ERP). En el campo **Nombre para la web** puedes escribirlo bonito:

- Interno: `CASCO DE SEGURIDAD DIELECTRICO BLANCO`
- Para la web: `Casco de seguridad dieléctrico blanco`

Si lo dejas vacío, se usa el nombre interno.

### Especificaciones técnicas

Una por línea, con formato `Atributo|Valor`:
```
Material|Polietileno de alta densidad
Norma|ANSI Z89.1
Tallas|Única ajustable
Colores|Blanco, amarillo, azul
```
Se muestran como una tabla ordenada en la ficha del producto.

### Filtros útiles

- **Sin foto** → los publicados a los que les falta imagen. Es la lista de trabajo para mejorar la web.
- **Ocultos** → los que el cliente no está viendo.
- **Publicar los N ocultos** → botón para publicar todos de una vez.

---

## Atender solicitudes (pestaña Solicitudes)

Cuando alguien llena el formulario de la web o envía su lista de cotización, aparece aquí con todos sus datos.

Cada solicitud tiene:

- **Responder** → abre WhatsApp con el número del cliente y un saludo ya escrito
- **Ícono de correo** → abre el correo con el asunto listo
- **Estado** → Nueva → En proceso → Atendida (o Descartada si es spam)
- **Notas internas** → qué se cotizó, con qué proveedor, en qué quedó. **El cliente nunca las ve.**

> Cuando la solicitud se convierte en venta real: registra el cliente en **Clientes** y genera la cotización formal en **Cotizaciones**. Esta bandeja es solo del primer contacto.

---

## Lo que la web NUNCA muestra

Por diseño, internet no puede ver:

- Costo promedio ni último costo
- Margen mínimo ni precio sugerido
- Precio de lista ni precios por cliente
- Stock
- Proveedores
- Nada del ERP

La web lee un catálogo depurado (`catalogo_web`) que técnicamente **no incluye** esas columnas. Aunque alguien inspeccione el código de la página, no hay forma de sacar esa información.

---

## Preguntas frecuentes

**¿Puedo poner precios?**
La decisión #020 dice que no: cotizamos según cantidad y condiciones. Si algún día se quiere cambiar, es un desarrollo, no una configuración.

**Cambié un texto y no lo veo.**
Refresca con `Ctrl + F5`. La web guarda una copia por unos segundos.

**¿Se puede cambiar el logo?**
Sí, reemplazando `public/logo.png` y corriendo `node scripts/generar-imagenes-marca.mjs`. Eso sí requiere a Julio.

**¿Cuánto cuesta mantener la web?**
Solo el dominio: unos USD 15 al año. El hosting es gratis.

**¿Qué pasa si borro un producto del ERP?**
Desaparece de la web automáticamente (el ERP lo marca como inactivo).
