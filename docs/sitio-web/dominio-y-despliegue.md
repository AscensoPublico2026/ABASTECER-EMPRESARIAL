# Sitio web público: cómo ponerlo en línea

Guía para dejar `abastecerempresarial.com` funcionando. Son 3 pasos y se hacen una sola vez.

---

## Paso 1 — Ejecutar la migración en Supabase (obligatorio)

Sin esto la web funciona, pero se muestra con los textos de fábrica y el catálogo aparece vacío.

1. Entra a [supabase.com](https://supabase.com) → proyecto de Abastecer → **SQL Editor**.
2. Abre el archivo `supabase/migrations/023_sitio_web_publico.sql` de este repositorio.
3. Copia **todo** el contenido, pégalo en el editor y presiona **Run**.
4. Verifica que terminó bien ejecutando:
   ```sql
   select count(*) from public.catalogo_web;
   select clave, valor from public.sitio_contenido limit 5;
   ```

### Si falla el último bloque (el del bucket de Storage)

Es por permisos y no rompe nada. Crea el bucket a mano:

Supabase → **Storage** → **New bucket** → nombre `sitio` → activa **Public bucket** → Save.

Ese bucket guarda las fotos de los productos que subes desde el ERP.

---

## Paso 2 — Comprar el dominio

El "dominio" es la dirección de internet: `abastecerempresarial.com`. El "hosting" (donde vive la página) ya lo tenemos con **Vercel**, y en el plan gratuito alcanza de sobra.

### Dónde comprarlo

| Proveedor | Precio aproximado .com/año | Notas |
|---|---|---|
| **Vercel Domains** | USD 20 - 25 | Lo más simple: se compra y se conecta solo, sin tocar DNS |
| Namecheap | USD 10 - 15 | Más barato, hay que configurar DNS a mano |
| GoDaddy Colombia | COP 60.000 - 120.000 | Soporte en español, renovación más cara |
| Cloudflare Registrar | USD 10 - 11 | El más barato a largo plazo, sin sobreprecio en renovación |

**Recomendación:** si quieres cero complicaciones, cómpralo desde Vercel. Si te importa el costo a 5 años, Cloudflare.

### Qué comprar

- `abastecerempresarial.com` ← el principal
- Opcional pero recomendado: `abastecerempresarial.co` (para que nadie más lo use)

Activa la **renovación automática**. Si el dominio se vence, la web se cae y alguien más puede comprarlo.

---

## Paso 3 — Conectar el dominio a Vercel

1. Entra a [vercel.com](https://vercel.com) → proyecto **abastecer-empresarial** → **Settings** → **Domains**.
2. Escribe `abastecerempresarial.com` y presiona **Add**.
3. Vercel te muestra qué registros DNS crear. Son estos:

   | Tipo | Nombre | Valor |
   |---|---|---|
   | `A` | `@` | `76.76.21.21` |
   | `CNAME` | `www` | `cname.vercel-dns.com` |

   > Vercel puede darte valores distintos. **Usa siempre los que muestre Vercel**, no los de esta tabla.

4. Entra al panel del proveedor donde compraste el dominio → zona DNS → crea esos dos registros.
5. Espera. Normalmente tarda entre 10 minutos y 2 horas (puede llegar a 24 h).
6. Cuando Vercel muestre **Valid Configuration**, el certificado HTTPS (el candado) se genera automáticamente y gratis.

### Variable de entorno (recomendado)

En Vercel → Settings → **Environment Variables**, agrega:

```
NEXT_PUBLIC_SITIO_URL = https://abastecerempresarial.com
```

Sirve para que los enlaces del mapa del sitio y las vistas previas de WhatsApp apunten al dominio real. Después de agregarla hay que hacer **Redeploy**.

---

## Paso 4 — Que Google nos encuentre

1. Entra a [Google Search Console](https://search.google.com/search-console).
2. Agrega la propiedad `https://abastecerempresarial.com`.
3. Verifica la propiedad (la forma más fácil es con un registro DNS `TXT` que Google te da).
4. En **Sitemaps**, envía: `https://abastecerempresarial.com/sitemap.xml`
5. Crea también el perfil de **Google Business Profile** (Google Maps) con la dirección de Cali, el teléfono y el enlace a la web. Para una empresa local esto trae más clientes que el SEO mismo.

Aparecer en los primeros resultados toma entre 2 y 8 semanas. El sitio ya sale con:

- Títulos y descripciones por página
- `sitemap.xml` que se arma solo con los productos publicados
- `robots.txt` que le prohíbe a Google entrar al ERP
- Datos estructurados de Organización y Producto (los que Google usa para las fichas enriquecidas)
- Imagen de vista previa para WhatsApp, Facebook y LinkedIn (`/og-abastecer.png`)

---

## Direcciones del sitio

| Dirección | Qué es | ¿Pública? |
|---|---|---|
| `/` | Página de inicio | Sí |
| `/catalogo` | Catálogo con buscador y filtro por línea | Sí |
| `/catalogo/<producto>` | Ficha del producto (sin precio) | Sí |
| `/nosotros` | Quiénes somos, misión, visión, valores | Sí |
| `/contacto` | Formulario y datos de contacto | Sí |
| `/cotizacion` | La lista de cotización del visitante | Sí (no indexada) |
| `/login` | Entrada del equipo | Sí |
| `/panel` | Dashboard del ERP | **No, requiere sesión** |
| `/sitio-web` | Administrador de la web | **No, requiere sesión** |

---

## Costos reales de tener la web

| Concepto | Costo |
|---|---|
| Dominio `.com` | USD 10 - 25 al año |
| Hosting (Vercel Hobby) | **Gratis** |
| Base de datos (Supabase Free) | **Gratis** hasta 500 MB |
| Certificado HTTPS | **Gratis** |
| **Total** | **≈ USD 15 al año** |

Si algún día el tráfico crece mucho, Vercel Pro cuesta USD 20/mes. Con el volumen de una empresa B2B local, el plan gratis alcanza de sobra por años.

---

## Regenerar las imágenes de marca

Si algún día se cambia el logo (`public/logo.png`), hay que regenerar las versiones optimizadas:

```bash
npm install --no-save sharp
node scripts/generar-imagenes-marca.mjs
```

Eso vuelve a crear:

- `public/logo-icono.png` — solo el ícono de la "A" (barra superior y pie de página)
- `public/logo-web.webp` — logo completo liviano, 27 KB en vez de 467 KB
- `public/og-abastecer.png` — imagen 1200×630 para WhatsApp y redes
- `src/app/icon.png` y `src/app/apple-icon.png` — favicons
