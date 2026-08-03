import type { MetadataRoute } from 'next'
import { SITIO_URL } from '@/lib/sitio/config'

/**
 * Le dice a Google que puede indexar el sitio web publico,
 * pero que NO debe entrar al ERP interno.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/login',
          '/panel',
          '/sitio-web',
          '/financiero',
          '/socios',
          '/inventario',
          '/ventas',
          '/compras',
          '/gastos',
          '/proveedores',
          '/clientes',
          '/facturacion',
          '/indicadores',
          '/perfiles',
          '/configuracion',
          '/cotizacion',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITIO_URL}/sitemap.xml`,
    host: SITIO_URL,
  }
}
