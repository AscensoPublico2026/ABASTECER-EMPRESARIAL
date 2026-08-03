import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Building2, FileCheck2, MapPin, Landmark, ArrowRight } from 'lucide-react'
import { obtenerContenidoSitio } from '@/lib/queries/sitio'
import { texto } from '@/lib/sitio/contenido'
import { EMPRESA } from '@/lib/empresa'
import {
  SeccionQuienesSomos,
  SeccionMisionVision,
  SeccionBeneficios,
  SeccionSectores,
  SeccionCTA,
  TituloSeccion,
} from '@/components/sitio/secciones'
import Reveal from '@/components/sitio/Reveal'

export async function generateMetadata(): Promise<Metadata> {
  const contenido = await obtenerContenidoSitio()
  return {
    title: 'Nosotros',
    description: texto(contenido, 'mision').slice(0, 160),
    alternates: { canonical: '/nosotros' },
  }
}

export default async function PaginaNosotros() {
  const contenido = await obtenerContenidoSitio()

  const datosLegales = [
    { icono: Building2, etiqueta: 'Razón social', valor: EMPRESA.razon_social },
    { icono: FileCheck2, etiqueta: 'NIT', valor: EMPRESA.nit },
    { icono: MapPin, etiqueta: 'Domicilio', valor: `${EMPRESA.ciudad}, ${EMPRESA.departamento}` },
    { icono: Landmark, etiqueta: 'Régimen tributario', valor: 'Régimen Simple de Tributación' },
  ]

  return (
    <>
      {/* Encabezado */}
      <section className="relative overflow-hidden bg-marca-900 patron-marca">
        <div className="absolute inset-0 patron-lineas opacity-50" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-6 py-14 lg:py-20">
          <nav aria-label="Ruta de navegación" className="mb-5 flex items-center gap-1.5 text-xs text-white/50">
            <Link href="/" className="transition hover:text-oro-400">
              Inicio
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white/80">Nosotros</span>
          </nav>

          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-oro-400">
            {texto(contenido, 'marca_tagline')}
          </p>
          <h1 className="max-w-3xl font-marca text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            {texto(contenido, 'nosotros_titulo')}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70">
            {texto(contenido, 'marca_descripcion_seo')}
          </p>
        </div>
      </section>

      <SeccionQuienesSomos contenido={contenido} />

      <SeccionMisionVision contenido={contenido} />

      <SeccionBeneficios contenido={contenido} />

      {/* Datos de la empresa */}
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <TituloSeccion
            kicker="Respaldo"
            titulo="Una empresa formal y verificable"
            subtitulo="Compras tranquilo: somos una S.A.S. legalmente constituida en Colombia, con facturación electrónica y todos los soportes que tu contabilidad necesita."
          />

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {datosLegales.map(({ icono: Icono, etiqueta, valor }, i) => (
              <Reveal key={etiqueta} retraso={i * 80} className="h-full">
                <div className="h-full rounded-2xl border border-marca-100 bg-marca-50/50 p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-verde-600 shadow-sm">
                    <Icono className="h-5 w-5" />
                  </span>
                  <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-acero-400">
                    {etiqueta}
                  </p>
                  <p className="mt-1.5 font-marca text-sm font-bold leading-snug text-marca-900">
                    {valor}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 rounded-xl bg-marca-900 px-7 py-4 text-sm font-bold text-white transition hover:bg-marca-800"
            >
              Explorar nuestro catálogo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <SeccionSectores contenido={contenido} />

      <SeccionCTA contenido={contenido} />
    </>
  )
}
