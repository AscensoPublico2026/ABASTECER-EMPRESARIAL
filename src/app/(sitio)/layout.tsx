import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import HeaderSitio from '@/components/sitio/HeaderSitio'
import FooterSitio from '@/components/sitio/FooterSitio'
import BotonWhatsappFlotante from '@/components/sitio/BotonWhatsappFlotante'
import { CotizacionProvider } from '@/components/sitio/CotizacionProvider'
import { obtenerContenidoSitio, obtenerLineasWeb } from '@/lib/queries/sitio'
import { texto } from '@/lib/sitio/contenido'
import { SITIO_URL, urlTelefono, urlWhatsapp } from '@/lib/sitio/config'
import { URL_LOGIN } from '@/lib/modo-app'

/** Tipografia oficial de la marca */
const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

// El contenido se refresca solo cada 5 minutos (y al instante cuando
// alguien lo edita desde el ERP, porque el modulo admin revalida las rutas).
export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const contenido = await obtenerContenidoSitio()
  const nombre = texto(contenido, 'marca_nombre')
  const descripcion = texto(contenido, 'marca_descripcion_seo')

  return {
    metadataBase: new URL(SITIO_URL),
    title: {
      default: `${nombre} | ${texto(contenido, 'marca_tagline')}`,
      template: `%s | Abastecer Empresarial`,
    },
    description: descripcion,
    applicationName: nombre,
    keywords: [
      'dotación empresarial Cali',
      'EPP Cali',
      'elementos de protección personal',
      'suministros empresariales',
      'uniformes empresariales',
      'aseo y cafetería institucional',
      'papelería empresarial',
      'proveedor de dotación Colombia',
      'Abastecer Empresarial',
    ],
    authors: [{ name: nombre }],
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'es_CO',
      url: SITIO_URL,
      siteName: nombre,
      title: `${nombre} | ${texto(contenido, 'marca_tagline')}`,
      description: descripcion,
      images: [{ url: '/og-abastecer.png', width: 1200, height: 630, alt: nombre }],
    },
    twitter: {
      card: 'summary_large_image',
      title: nombre,
      description: descripcion,
      images: ['/og-abastecer.png'],
    },
    robots: { index: true, follow: true },
  }
}

export default async function LayoutSitio({ children }: { children: React.ReactNode }) {
  const [contenido, lineas] = await Promise.all([
    obtenerContenidoSitio(),
    obtenerLineasWeb(),
  ])

  const enlaceWhatsapp = urlWhatsapp(contenido)

  return (
    <div
      className={`${montserrat.variable} sitio-web font-marca flex min-h-screen flex-col bg-white text-marca-900 antialiased`}
    >
      <CotizacionProvider>
        <HeaderSitio
          telefono={texto(contenido, 'contacto_telefono')}
          correo={texto(contenido, 'contacto_email')}
          horario={texto(contenido, 'contacto_horario')}
          urlWhatsapp={enlaceWhatsapp}
          urlTelefono={urlTelefono(contenido)}
          tagline={texto(contenido, 'marca_tagline')}
          urlPortal={URL_LOGIN}
        />

        <main className="flex-1">{children}</main>

        <FooterSitio contenido={contenido} lineas={lineas} />
        <BotonWhatsappFlotante url={enlaceWhatsapp} />
      </CotizacionProvider>
    </div>
  )
}
