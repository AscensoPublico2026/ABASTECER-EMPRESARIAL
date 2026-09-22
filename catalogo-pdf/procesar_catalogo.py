#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Procesa el catálogo del proveedor y lo convierte en el catálogo de
ABASTECER EMPRESARIAL S.A.S.

Qué hace, página por página:
  - Portada y contraportada: se reemplazan por diseño propio de Abastecer.
  - Índice: se tapa el logo del proveedor y se pone el de Abastecer.
  - Páginas de producto: se detectan (OCR) y se tapan los PRECIOS y las
    "CANT. MIN." del proveedor, se tapa el pie de página (web/correo del
    proveedor) y la marca de agua, y se pone un pie propio con el WhatsApp.

Uso:
    python3 procesar_catalogo.py --deteccion   # 1a pasada: corre OCR y guarda cajas a JSON
    python3 procesar_catalogo.py --construir    # 2a pasada: arma el PDF final usando el JSON
    python3 procesar_catalogo.py --revision     # arma solo el PDF de revisión (baja calidad)

Separar la detección (lenta, OCR) de la construcción permite iterar el
diseño sin re-correr el OCR cada vez.
"""
import argparse, json, os, re, math
import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

BASE = os.path.dirname(os.path.abspath(__file__))
TRAB = os.path.join(BASE, "trabajo")
SRC = os.path.join(TRAB, "protecto.pdf")
OCR_JSON = os.path.join(TRAB, "ocr_cajas.json")

# ---- Identidad de marca Abastecer ----
NAVY = (13, 27, 42)      # #0D1B2A
VERDE = (22, 178, 60)    # #16B23C
ORO = (242, 183, 5)      # #F2B705
BLANCO = (255, 255, 255)
GRIS_BG = (243, 243, 243)  # fondo de las páginas de producto
WHATSAPP = "350 862 4021"
WEB = "www.abastecerempresarial.com"
ESLOGAN = "Todo lo que tu empresa necesita. Un solo aliado."

LOGO_FULL = os.path.join(TRAB, "logo_trans.png")

DPI = 200  # resolución de trabajo (equilibrio calidad/peso)

# Índice de categorías -> páginas (0-indexado) según el índice del proveedor.
PORTADA = 0
INDICE = 1
CONTRAPORTADA = 65
# Páginas densas (tablas de señalización con muchos ítems, sin precios):
# se tratan en "modo seguro" (solo perímetro: encabezado + pie), sin tocar
# el interior para no dejar parches sobre las señales.
PAGINAS_DENSAS = {61, 62, 63, 64}

# --------------------------------------------------------------------------
# Utilidades de fuentes
# --------------------------------------------------------------------------
_FONT_CACHE = {}
def _find_font():
    # Buscar una fuente sans bold en el sistema; si no, la default de PIL.
    candidatos = [
        "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for c in candidatos:
        if os.path.exists(c):
            return c
    # buscar recursivo
    for root, _, files in os.walk("/usr/share/fonts"):
        for f in files:
            if "Bold" in f and f.lower().endswith((".ttf", ".otf")):
                return os.path.join(root, f)
    return None

def font(size, bold=True):
    key = (size, bold)
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]
    path = _find_font()
    try:
        f = ImageFont.truetype(path, size) if path else ImageFont.load_default()
    except Exception:
        f = ImageFont.load_default()
    _FONT_CACHE[key] = f
    return f

# --------------------------------------------------------------------------
# Detección de qué tapar
# --------------------------------------------------------------------------
PRECIO_RE = re.compile(r"\$|^\s*[xX]{2,}\s*$|\d[.,]?\d{2,}")
CANT_RE = re.compile(r"CANT|MIN\.|\bUND\b|\bPAR\b|\bUNID", re.IGNORECASE)
PROV_RE = re.compile(r"protecto|protesto|prottesto|calidad que protege|\.com\.co|info@", re.IGNORECASE)

def es_precio(txt):
    t = txt.strip()
    if "$" in t:
        return True
    # "$ xxxx", "xxxxx" (precio oculto por el proveedor)
    if re.fullmatch(r"[\$\sxX]{3,}", t):
        return True
    # números tipo 2.600 / 47.000 aislados y cortos
    if re.fullmatch(r"\$?\s*\d{1,3}([.,]\d{3})+", t):
        return True
    return False

def run_ocr():
    import easyocr
    reader = easyocr.Reader(['es'], gpu=False, verbose=False)
    doc = fitz.open(SRC)
    salida = {}
    for i in range(doc.page_count):
        if i in (PORTADA, CONTRAPORTADA):
            salida[str(i)] = {"skip": True}
            continue
        pix = doc[i].get_pixmap(dpi=DPI)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        tmp = os.path.join(TRAB, f"_ocr_pg_{i:02d}.png")
        img.save(tmp)
        res = reader.readtext(np.array(img))
        cajas = []
        for box, txt, conf in res:
            xs = [p[0] for p in box]; ys = [p[1] for p in box]
            cajas.append({
                "x0": float(min(xs)), "y0": float(min(ys)),
                "x1": float(max(xs)), "y1": float(max(ys)),
                "txt": txt, "conf": float(conf),
            })
        salida[str(i)] = {"w": pix.width, "h": pix.height, "cajas": cajas}
        os.remove(tmp)
        print(f"OCR pág {i}: {len(cajas)} cajas")
    with open(OCR_JSON, "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, indent=1)
    print("Guardado", OCR_JSON)

# --------------------------------------------------------------------------
# Construcción del PDF final
# --------------------------------------------------------------------------
def _es_gris_neutro(col):
    """True si el color es un gris/blanco neutro (fondo del catálogo), no un
    color cálido/saturado (sombra de foto, borde de producto)."""
    r, g, b = col
    spread = max(r, g, b) - min(r, g, b)
    return (min(r, g, b) > 150) and (spread < 20)

def color_fondo_local(arr, x0, y0, x1, y1):
    """Estima el color de fondo alrededor de una caja (muestrea un anillo).
    Sólo acepta grises neutros; si lo muestreado está saturado/oscuro (foto,
    sombra), usa el gris de fondo estándar para NO dejar parches de color."""
    h, w = arr.shape[:2]
    pad = 6
    xa, ya = max(0, int(x0) - pad), max(0, int(y0) - pad)
    xb, yb = min(w, int(x1) + pad), min(h, int(y1) + pad)
    muestras = []
    if ya - 3 >= 0:
        muestras.append(arr[ya-3:ya, xa:xb].reshape(-1, 3))
    if yb + 3 <= h:
        muestras.append(arr[yb:yb+3, xa:xb].reshape(-1, 3))
    if not muestras:
        return GRIS_BG
    m = np.concatenate(muestras, axis=0).astype(np.int16)
    # sólo píxeles de fondo: claros y acromáticos
    spread = m.max(axis=1) - m.min(axis=1)
    fondo = m[(m.max(axis=1) > 170) & (spread < 20)]
    if len(fondo) < 8:
        return GRIS_BG
    col = tuple(int(v) for v in np.median(fondo, axis=0))
    return col if _es_gris_neutro(col) else GRIS_BG

def tapar(draw, arr, x0, y0, x1, y1, expand=3):
    col = color_fondo_local(arr, x0, y0, x1, y1)
    draw.rectangle([x0 - expand, y0 - expand, x1 + expand, y1 + expand], fill=col)

def tapar_precio(draw, arr, c):
    """Tapa la porción de precio ($ ...) de una caja OCR, conservando el texto
    útil que pueda venir antes (Talla, REF, medida, capacidad, calibre...).
    Estima la posición horizontal del '$' por la fracción de caracteres que le
    preceden y tapa desde ahí hacia la derecha."""
    t = c["txt"]
    x0, y0, x1, y1 = c["x0"], c["y0"], c["x1"], c["y1"]
    idx = t.find("$")
    if idx <= 0:
        # todo el contenido es precio -> tapar caja completa
        tapar(draw, arr, x0, y0, x1, y1)
        return
    # hay texto antes del "$": tapar desde un poco ANTES del "$" (para tragarse
    # el símbolo completo) hacia la derecha, conservando el texto útil previo.
    ancho = x1 - x0
    char_w = ancho / max(1, len(t))
    # texto útil antes del "$": quitarle los espacios finales para no contar de
    # más y dejar el "$" colgando
    prefijo = t[:idx].rstrip()
    idx_util = len(prefijo)
    # empezar el corte justo después del texto útil (medio carácter de colchón)
    corte = x0 + char_w * idx_util + char_w * 0.35
    corte = max(x0, min(corte, x1 - 2))
    tapar(draw, arr, corte, y0, x1, y1, expand=4)

def pie_abastecer(img, escala):
    """Dibuja el pie de página propio (barra inferior con WhatsApp)."""
    w, h = img.size
    d = ImageDraw.Draw(img)
    bar_h = int(70 * escala)
    y0 = h - bar_h
    # banda blanca amplia que cubre TODO el pie del proveedor (web/correo/nº pág.),
    # que se ubica aprox. en el 10% inferior de la página. No dependemos del OCR.
    d.rectangle([0, int(h * 0.905), w, h], fill=BLANCO)
    # barra navy
    d.rectangle([0, y0, w, h], fill=NAVY)
    # detalle oro
    d.rectangle([0, y0, w, y0 + int(5*escala)], fill=ORO)
    fs = int(26 * escala)
    f = font(fs)
    txt = f"Cotiza por WhatsApp  {WHATSAPP}   ·   {WEB}"
    tb = d.textbbox((0, 0), txt, font=f)
    tw = tb[2] - tb[0]; th = tb[3] - tb[1]
    d.text(((w - tw) / 2, y0 + (bar_h - th) / 2 - tb[1]), txt, font=f, fill=BLANCO)

# Rastro de la marca de agua del escudo del proveedor: texto tenue detectado
# por el OCR con muy baja confianza y/o fragmentos parecidos a "protecto".
WM_TXT_RE = re.compile(r'protec|protes|prottes|calidad|proteg|ooie|aoie|paoie|'
                       r'gocic|qogt|fqoi|etom|oon\b|oc@|ogt@', re.IGNORECASE)

def cajas_marca_agua(info):
    """Devuelve las cajas OCR que corresponden a la marca de agua del escudo.
    Restringido a la ZONA-FIRMA donde el proveedor pone el escudo tenue:
    banda central-baja (y 0.60-0.84). Fuera de esa banda NO tapamos por baja
    confianza, para no dañar productos ni señales repartidas por la página."""
    h = info.get('h', 2201)
    w = info.get('w', 1701)
    out = []
    for c in info.get('cajas', []):
        yf = c['y0'] / h
        xf = c['x0'] / w
        t = c['txt'].strip()
        parece_marca = bool(WM_TXT_RE.search(t))
        # zona-firma típica del watermark (centro/derecha, parte baja)
        en_firma = (0.60 < yf < 0.84) and (0.10 < xf < 0.90)
        baja_conf = c['conf'] < 0.15 and len(t) >= 3 and en_firma
        if parece_marca or baja_conf:
            out.append(c)
    return out

def _sobre_fondo_claro(arr, x0, y0, x1, y1):
    """True si la caja está sobre fondo claro/vacío (gris del catálogo),
    False si hay una foto de producto debajo (colores o zonas oscuras).
    Evita tapar el 'PROTECTO' impreso sobre el propio producto."""
    h, w = arr.shape[:2]
    xa, ya = max(0, int(x0)), max(0, int(y0))
    xb, yb = min(w, int(x1)), min(h, int(y1))
    if xb <= xa or yb <= ya:
        return False
    reg = arr[ya:yb, xa:xb].reshape(-1, 3).astype(np.int16)
    gray = reg.mean(axis=1)
    spread = reg.max(axis=1) - reg.min(axis=1)
    # fondo del catálogo: gris claro (>170) y acromático (spread bajo)
    frac_fondo = np.mean((gray > 150) & (spread < 30))
    return frac_fondo > 0.55

def tapar_marca_agua(img, arr, info):
    """Tapa la marca de agua fantasma del escudo del proveedor SOLO cuando cae
    sobre fondo vacío (no sobre un producto)."""
    cajas = cajas_marca_agua(info)
    if not cajas:
        return
    d = ImageDraw.Draw(img)
    h = arr.shape[0]
    for c in cajas:
        ancho = c['x1'] - c['x0']
        # El escudo del watermark está ARRIBA del texto detectado (~el doble de
        # alto del texto). Ampliamos generosamente hacia arriba y a los lados.
        mx = ancho * 0.20 + 8
        arriba = (c['y1'] - c['y0']) * 3.0 + 30  # cubre el escudo por encima
        abajo = (c['y1'] - c['y0']) * 0.4 + 8
        x0, y0, x1, y1 = c['x0']-mx, c['y0']-arriba, c['x1']+mx, c['y1']+abajo
        # sólo si toda la zona a tapar está sobre fondo vacío (no producto)
        if _sobre_fondo_claro(arr, x0, y0, x1, y1):
            tapar(d, arr, x0, y0, x1, y1, expand=0)

def tapar_escudo_encabezado(img, arr):
    """Las páginas con encabezado de banda navy llevan el escudo del proveedor
    en la esquina superior derecha. Se detecta si la franja superior es navy
    y, de serlo, se tapa esa esquina con el mismo navy (queda invisible)."""
    h, w = arr.shape[:2]
    # franja del encabezado ~ primeras filas; muestrear zona derecha-media alta
    banda = arr[int(h*0.01):int(h*0.06), int(w*0.55):int(w*0.92)].reshape(-1, 3).astype(np.int16)
    if banda.size == 0:
        return
    med = banda.mean(axis=0)
    # navy ~ (13,27,42): azul dominante y oscuro
    es_navy = (med[2] > med[0]) and (med.mean() < 90) and (med[2] < 130)
    if not es_navy:
        return
    # color exacto de la banda para tapar
    col = tuple(int(v) for v in np.median(banda, axis=0))
    d = ImageDraw.Draw(img)
    # tapar esquina superior derecha (donde va el escudo)
    d.rectangle([int(w*0.86), 0, w, int(h*0.075)], fill=col)

def construir(revision=False):
    with open(OCR_JSON, encoding="utf-8") as f:
        ocr = json.load(f)
    doc = fitz.open(SRC)
    paginas = []
    logo = Image.open(LOGO_FULL).convert("RGBA")

    for i in range(doc.page_count):
        pix = doc[i].get_pixmap(dpi=DPI)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples).convert("RGB")
        w, h = img.size
        escala = h / 1100.0  # base para tamaños de fuente

        if i == PORTADA:
            img = portada(w, h, logo)
        elif i == CONTRAPORTADA:
            img = contraportada(w, h, logo)
        else:
            arr = np.array(img)
            d = ImageDraw.Draw(img)
            info = ocr.get(str(i), {})
            denso = i in PAGINAS_DENSAS

            # 1) tapar precios / cant.min / datos del proveedor (siempre, por OCR)
            for c in info.get("cajas", []):
                t = c["txt"]
                if CANT_RE.search(t) or PROV_RE.search(t):
                    tapar(d, arr, c["x0"], c["y0"], c["x1"], c["y1"])
                elif es_precio(t):
                    # Si el precio viene pegado a texto útil (Talla, REF, medida,
                    # capacidad...), tapar SOLO la porción del "$..." y conservar
                    # lo demás. Estimamos la posición del "$" dentro de la caja.
                    tapar_precio(d, arr, c)

            # 2) escudo del proveedor en encabezado de banda navy (siempre, seguro)
            try:
                tapar_escudo_encabezado(img, arr)
            except Exception as e:
                print("  hdr skip pág", i, e)

            # 3) marca de agua: en páginas densas NO (riesgo de parches sobre
            #    señales). En páginas normales sí, restringida a la zona-firma.
            if not denso:
                try:
                    tapar_marca_agua(img, arr, info)
                except Exception as e:
                    print("  wm skip pág", i, e)

            if i == INDICE:
                d2 = ImageDraw.Draw(img)
                d2.rectangle([0, int(h*0.80), w, h], fill=BLANCO)
                poner_logo(img, logo, int(w*0.5), int(h*0.90), int(w*0.42))

            # 4) pie propio Abastecer (tapa el pie del proveedor, en todas)
            pie_abastecer(img, escala)

        paginas.append(img)
        print(f"construida pág {i}")

    # exportar
    salida = os.path.join(BASE, "CATALOGO-ABASTECER-revision.pdf" if revision else "CATALOGO-ABASTECER.pdf")
    if revision:
        paginas = [p.copy() for p in paginas]
        for p in paginas:
            p.thumbnail((900, 1200))
    rgb = [p.convert("RGB") for p in paginas]
    rgb[0].save(salida, save_all=True, append_images=rgb[1:], resolution=150.0)
    mb = os.path.getsize(salida) / 1e6
    print(f"\\nPDF generado: {salida}  ({mb:.1f} MB)")

def poner_logo(img, logo, cx, cy, ancho):
    ratio = logo.height / logo.width
    lg = logo.resize((ancho, int(ancho * ratio)))
    img.paste(lg, (int(cx - ancho/2), int(cy - lg.height/2)), lg)

# --------------------------------------------------------------------------
# Portada y contraportada propias
# --------------------------------------------------------------------------
def _degradado(w, h, c1, c2):
    # degradado vertical vectorizado con numpy (rápido)
    t = np.linspace(0.0, 1.0, h).reshape(h, 1, 1)
    c1a = np.array(c1, dtype=float).reshape(1, 1, 3)
    c2a = np.array(c2, dtype=float).reshape(1, 1, 3)
    grad = (c1a * (1 - t) + c2a * t)
    arr = np.repeat(grad, w, axis=1).astype("uint8")
    return Image.fromarray(arr, "RGB")

def _texto_centrado(d, cx, y, txt, f, fill):
    tb = d.textbbox((0, 0), txt, font=f)
    d.text((cx - (tb[2] - tb[0]) / 2 - tb[0], y - tb[1]), txt, font=f, fill=fill)
    return (tb[3] - tb[1])  # alto real del texto

def portada(w, h, logo):
    img = _degradado(w, h, NAVY, (7, 15, 26))
    d = ImageDraw.Draw(img)
    escala = h / 1100.0
    cx = w / 2
    # franja oro/verde superior
    d.rectangle([0, 0, w, int(14*escala)], fill=ORO)
    d.rectangle([0, int(14*escala), w, int(20*escala)], fill=VERDE)
    # placa blanca con logo (parte superior)
    placa_w = int(w*0.60)
    logo_h = int(placa_w * (logo.height/logo.width))
    placa_h = logo_h + int(40*escala)
    px = int((w-placa_w)/2); py = int(h*0.10)
    d.rounded_rectangle([px, py, px+placa_w, py+placa_h], radius=int(30*escala), fill=BLANCO)
    poner_logo(img, logo, w//2, py + placa_h//2, int(placa_w*0.90))
    # a partir de aquí, cursor vertical debajo de la placa
    y = py + placa_h + int(70*escala)
    _texto_centrado(d, cx, y, "CATÁLOGO DE PRODUCTOS", font(int(56*escala)), BLANCO)
    y += int(78*escala)
    _texto_centrado(d, cx, y, ESLOGAN, font(int(28*escala), bold=False), ORO)
    y += int(56*escala)
    d.rectangle([w*0.32, y, w*0.68, y + int(4*escala)], fill=VERDE)
    y += int(50*escala)
    cats = "EPP · DOTACIÓN · SEÑALIZACIÓN · ERGONOMÍA · TECNOLOGÍA · ASEO"
    _texto_centrado(d, cx, y, cats, font(int(22*escala)), BLANCO)
    # WhatsApp: pastilla anclada cerca del pie
    fw = font(int(30*escala)); tw = f"WhatsApp  {WHATSAPP}"
    tbw = d.textbbox((0,0), tw, font=fw); wtw = tbw[2]-tbw[0]
    yb = int(h*0.90)
    d.rounded_rectangle([cx - wtw/2 - int(34*escala), yb,
                         cx + wtw/2 + int(34*escala), yb + int(64*escala)],
                        radius=int(32*escala), fill=VERDE)
    _texto_centrado(d, cx, yb + int(20*escala), tw, fw, BLANCO)
    return img

def contraportada(w, h, logo):
    img = _degradado(w, h, NAVY, (7, 15, 26))
    d = ImageDraw.Draw(img)
    escala = h / 1100.0
    cx = w / 2
    d.rectangle([0, 0, w, int(14*escala)], fill=ORO)
    d.rectangle([0, int(14*escala), w, int(20*escala)], fill=VERDE)
    # placa con logo (arriba)
    placa_w = int(w*0.48)
    logo_h = int(placa_w * (logo.height/logo.width))
    placa_h = logo_h + int(30*escala)
    px = int((w-placa_w)/2); py = int(h*0.07)
    d.rounded_rectangle([px, py, px+placa_w, py+placa_h], radius=int(26*escala), fill=BLANCO)
    poner_logo(img, logo, w//2, py+placa_h//2, int(placa_w*0.9))
    # cursor debajo de la placa (separación clara)
    y = py + placa_h + int(60*escala)
    _texto_centrado(d, cx, y, "¿No encuentras lo que buscas?", font(int(38*escala)), ORO)
    y += int(64*escala)
    fbody = font(int(27*escala), bold=False)
    for ln in ["Lo que tu empresa necesite, pregúntanos:", "nosotros te lo conseguimos."]:
        _texto_centrado(d, cx, y, ln, fbody, BLANCO); y += int(40*escala)
    y += int(28*escala)
    fcat = font(int(24*escala), bold=False)
    for ln in ["Dotación · EPP · Señalización · Extintores",
               "Ergonomía y oficina · Estantería · Tecnología",
               "Papelería · Cafetería · Aseo · Carnets corporativos"]:
        _texto_centrado(d, cx, y, ln, fcat, BLANCO); y += int(38*escala)
    # bloque contacto anclado abajo
    fw = font(int(32*escala)); tw = f"WhatsApp  {WHATSAPP}"
    tbw = d.textbbox((0,0), tw, font=fw); wtw = tbw[2]-tbw[0]
    yb = int(h*0.82)
    d.rounded_rectangle([cx - wtw/2 - int(36*escala), yb,
                         cx + wtw/2 + int(36*escala), yb + int(64*escala)],
                        radius=int(32*escala), fill=VERDE)
    _texto_centrado(d, cx, yb + int(20*escala), tw, fw, BLANCO)
    _texto_centrado(d, cx, int(h*0.90), WEB, font(int(25*escala), bold=False), ORO)
    _texto_centrado(d, cx, int(h*0.94), ESLOGAN, font(int(21*escala), bold=False), BLANCO)
    return img

# --------------------------------------------------------------------------
if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--deteccion", action="store_true")
    ap.add_argument("--construir", action="store_true")
    ap.add_argument("--revision", action="store_true")
    a = ap.parse_args()
    if a.deteccion:
        run_ocr()
    if a.construir:
        construir(revision=False)
    if a.revision:
        construir(revision=True)
    if not (a.deteccion or a.construir or a.revision):
        ap.print_help()
