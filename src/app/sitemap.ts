import type { MetadataRoute } from 'next'
import { obtenerLineasWeb, obtenerSlugsCatalogo } from '@/lib/queries/sitio'
import { SITIO_URL } from '@/lib/sitio/config'

export const revalidate = 3600

/** Mapa del sitio para Google. Se arma solo con lo que este publicado. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ahora = new Date()

  const fijas: MetadataRoute.Sitemap = [
    { url: `${SITIO_URL}/`, lastModified: ahora, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITIO_URL}/catalogo`, lastModified: ahora, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITIO_URL}/nosotros`, lastModified: ahora, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITIO_URL}/contacto`, lastModified: ahora, changeFrequency: 'monthly', priority: 0.8 },
  ]

  const [lineas, productos] = await Promise.all([obtenerLineasWeb(true), obtenerSlugsCatalogo()])

  const deLineas: MetadataRoute.Sitemap = lineas.map((linea) => ({
    url: `${SITIO_URL}/catalogo?linea=${linea.slug}`,
    lastModified: ahora,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const deProductos: MetadataRoute.Sitemap = productos
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${SITIO_URL}/catalogo/${p.slug}`,
      lastModified: ahora,
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

  return [...fijas, ...deLineas, ...deProductos]
}
