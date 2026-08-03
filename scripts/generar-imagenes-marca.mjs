/**
 * Genera las imagenes optimizadas de marca a partir de public/logo.png
 *
 *   public/logo-icono.png   -> solo el icono de la "A" (para la barra superior)
 *   public/logo-web.webp    -> logo completo liviano (para el hero)
 *   public/og-abastecer.png -> imagen 1200x630 para WhatsApp / redes / Google
 *   src/app/icon.png        -> favicon del navegador
 *   src/app/apple-icon.png  -> icono para iPhone / iPad
 *
 * Uso:  npm install --no-save sharp && node scripts/generar-imagenes-marca.mjs
 *
 * Solo hay que volver a ejecutarlo si se cambia el archivo logo.png.
 */
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'

const ORIGEN = 'public/logo.png'
const NAVY = { r: 13, g: 27, b: 42 }
const BLANCO_MINIMO = 243 // por encima de este valor consideramos que el pixel es fondo

/** Encuentra las franjas horizontales que tienen contenido (no son fondo blanco) */
async function detectarFranjas() {
  const { data, info } = await sharp(ORIGEN)
    .flatten({ background: '#ffffff' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const filaConContenido = []

  for (let y = 0; y < height; y++) {
    let tiene = false
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      if (data[i] < BLANCO_MINIMO || data[i + 1] < BLANCO_MINIMO || data[i + 2] < BLANCO_MINIMO) {
        tiene = true
        break
      }
    }
    filaConContenido.push(tiene)
  }

  const franjas = []
  let inicio = null
  for (let y = 0; y < height; y++) {
    if (filaConContenido[y] && inicio === null) inicio = y
    if (!filaConContenido[y] && inicio !== null) {
      if (y - inicio > height * 0.02) franjas.push({ desde: inicio, hasta: y })
      inicio = null
    }
  }
  if (inicio !== null) franjas.push({ desde: inicio, hasta: height })

  return { franjas, data, info }
}

/** Columnas con contenido dentro de un rango de filas */
function limitesHorizontales(data, info, desde, hasta) {
  const { width, channels } = info
  let izquierda = width
  let derecha = 0

  for (let y = desde; y < hasta; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      if (data[i] < BLANCO_MINIMO || data[i + 1] < BLANCO_MINIMO || data[i + 2] < BLANCO_MINIMO) {
        if (x < izquierda) izquierda = x
        if (x > derecha) derecha = x
      }
    }
  }

  return { izquierda, derecha }
}

async function main() {
  const { franjas, data, info } = await detectarFranjas()
  if (franjas.length === 0) throw new Error('No se detecto contenido en el logo.')

  // La primera franja es el icono (la "A" con el casco y el arco)
  const iconoFranja = franjas[0]
  const { izquierda, derecha } = limitesHorizontales(data, info, iconoFranja.desde, iconoFranja.hasta)

  const margen = Math.round(info.width * 0.012)
  const recorte = {
    left: Math.max(0, izquierda - margen),
    top: Math.max(0, iconoFranja.desde - margen),
    width: Math.min(info.width, derecha - izquierda + margen * 2),
    height: Math.min(info.height, iconoFranja.hasta - iconoFranja.desde + margen * 2),
  }

  console.log(`Logo original: ${info.width}x${info.height}`)
  console.log(`Franjas detectadas: ${franjas.length}`)
  console.log(`Icono recortado en: ${JSON.stringify(recorte)}`)

  // 1. Icono suelto para la barra superior y el pie de pagina
  await sharp(ORIGEN)
    .flatten({ background: '#ffffff' })
    .extract(recorte)
    .resize({ width: 320, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true })
    .toFile('public/logo-icono.png')

  // 2. Logo completo liviano para el hero
  await sharp(ORIGEN)
    .flatten({ background: '#ffffff' })
    .trim({ threshold: 12 })
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 86 })
    .toFile('public/logo-web.webp')

  // 3. Imagen para compartir en WhatsApp, Facebook y Google (1200x630)
  const tarjeta = Buffer.from(
    `<svg width="1200" height="630"><rect x="290" y="105" width="620" height="420" rx="38" fill="#ffffff"/></svg>`
  )
  const logoOg = await sharp(ORIGEN)
    .flatten({ background: '#ffffff' })
    .trim({ threshold: 12 })
    .resize({ width: 520, height: 340, fit: 'contain', background: '#ffffff' })
    .png()
    .toBuffer()

  await sharp({
    create: { width: 1200, height: 630, channels: 3, background: NAVY },
  })
    .composite([
      { input: tarjeta, top: 0, left: 0 },
      { input: logoOg, top: 145, left: 340 },
    ])
    .png({ compressionLevel: 9 })
    .toFile('public/og-abastecer.png')

  // 4. Favicons a partir del icono
  const iconoCuadrado = await sharp(ORIGEN)
    .flatten({ background: '#ffffff' })
    .extract(recorte)
    .resize({ width: 512, height: 512, fit: 'contain', background: '#ffffff' })
    .png()
    .toBuffer()

  await sharp(iconoCuadrado).resize(192, 192).png().toFile('src/app/icon.png')
  await sharp(iconoCuadrado).resize(180, 180).png().toFile('src/app/apple-icon.png')

  // Reporte de tamanos
  const { statSync } = await import('node:fs')
  for (const ruta of [
    ORIGEN,
    'public/logo-icono.png',
    'public/logo-web.webp',
    'public/og-abastecer.png',
    'src/app/icon.png',
    'src/app/apple-icon.png',
  ]) {
    console.log(`${ruta.padEnd(28)} ${(statSync(ruta).size / 1024).toFixed(1)} KB`)
  }

  await writeFile(
    'public/logo-icono.json',
    JSON.stringify({ generadoDesde: ORIGEN, recorte, franjas }, null, 2)
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
