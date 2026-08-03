import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Clock4, ShieldCheck, ReceiptText } from 'lucide-react'
import { obtenerContenidoSitio } from '@/lib/queries/sitio'
import { texto } from '@/lib/sitio/contenido'
import { numeroWhatsapp, urlWhatsapp } from '@/lib/sitio/config'
import ListaCotizacion from '@/components/sitio/ListaCotizacion'
import FormularioSolicitud from '@/components/sitio/FormularioSolicitud'

export const metadata: Metadata = {
  title: 'Mi lista de cotización',
  description:
    'Arma tu lista de productos y solicita la cotización formal. Respondemos en menos de 24 horas hábiles.',
  alternates: { canonical: '/cotizacion' },
  robots: { index: false, follow: true },
}

export default async function PaginaCotizacion() {
  const contenido = await obtenerContenidoSitio()

  return (
    <>
      {/* Encabezado */}
      <section className="relative overflow-hidden bg-marca-900 patron-marca">
        <div className="absolute inset-0 patron-lineas opacity-50" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:py-16">
          <nav aria-label="Ruta de navegación" className="mb-5 flex items-center gap-1.5 text-xs text-white/50">
            <Link href="/" className="transition hover:text-oro-400">
              Inicio
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white/80">Mi lista de cotización</span>
          </nav>

          <h1 className="font-marca text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            Tu lista de cotización
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
            Revisa las cantidades, completa tus datos y envíanos la solicitud. Te devolvemos la
            cotización formal con precios, IVA y tiempos de entrega.
          </p>

          <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/60">
            {[
              { icono: Clock4, texto: 'Respuesta en menos de 24 horas hábiles' },
              { icono: ShieldCheck, texto: 'Sin compromiso de compra' },
              { icono: ReceiptText, texto: 'Cotización formal con IVA' },
            ].map(({ icono: Icono, texto: etiqueta }) => (
              <li key={etiqueta} className="flex items-center gap-2">
                <Icono className="h-4 w-4 text-verde-300" />
                {etiqueta}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-marca-50/50 py-12 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ListaCotizacion numeroWhatsapp={numeroWhatsapp(contenido)} />

            <p className="mt-4 px-2 text-xs leading-relaxed text-acero-500">
              {texto(contenido, 'catalogo_nota')}
            </p>
          </div>

          <div className="lg:col-span-5">
            <FormularioSolicitud
              tipo="COTIZACION"
              origen="lista-cotizacion"
              urlWhatsapp={urlWhatsapp(contenido)}
              incluirLista
              titulo="Tus datos"
              descripcion="Los necesitamos para poder enviarte la cotización. Solo toma un minuto."
            />
          </div>
        </div>
      </section>
    </>
  )
}
