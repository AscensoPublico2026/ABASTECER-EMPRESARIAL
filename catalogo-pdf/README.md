# Catálogo PDF de Abastecer Empresarial

Catálogo de productos en PDF para enviar por WhatsApp cuando un cliente pide
"compárteme el catálogo".

## Archivos

- **`CATALOGO-ABASTECER.pdf`** — versión final, alta calidad (para enviar).
- **`CATALOGO-ABASTECER-revision.pdf`** — versión liviana, para revisar rápido.
- `procesar_catalogo.py` — script que genera el catálogo a partir del PDF del
  proveedor (portada/contraportada propias, quita precios y marca del proveedor,
  pone el pie con WhatsApp de Abastecer).

## Qué hace el procesamiento

1. **Portada y contraportada** propias de Abastecer (logo, colores de marca
   navy/verde/oro, eslogan y WhatsApp 350 862 4021).
2. **Quita los precios** del proveedor (detección por OCR) conservando el texto
   útil (tallas, medidas, referencias, capacidades).
3. **Quita "CANT. MIN."** (cantidad mínima del mayorista).
4. **Tapa la marca del proveedor**: escudo del encabezado, pie de página
   (web/correo) y marca de agua.
5. **Pie propio** en cada página: "Cotiza por WhatsApp 350 862 4021".

## Cómo regenerarlo

Requiere el PDF del proveedor en `trabajo/protecto.pdf`.

```bash
pip install pymupdf pillow numpy easyocr
# 1) detección (OCR, lento): genera trabajo/ocr_cajas.json
python3 procesar_catalogo.py --deteccion
# 2) construcción del PDF final y de revisión
python3 procesar_catalogo.py --construir --revision
```

> Nota: la carpeta `trabajo/` (PDF del proveedor, OCR, imágenes temporales) no
> se versiona (ver `.gitignore`).
