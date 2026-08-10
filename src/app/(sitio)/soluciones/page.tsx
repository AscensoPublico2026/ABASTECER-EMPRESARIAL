import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { obtenerContenidoSitio, obtenerLineasWeb } from '@/lib/queries/sitio'
import { urlWhatsapp } from '@/lib/sitio/config'

import { TituloSeccion, SeccionCTA } from '@/components/sitio/secciones'
import { IconoWhatsapp } from '@/components/sitio/IconosRedes'
import IconoSitio from '@/components/sitio/IconoSitio'
import Reveal from '@/components/sitio/Reveal'

export const metadata: Metadata = {
  title: 'Soluciones de abastecimiento empresarial',
  description: 'Líneas de negocio de Abastecer Empresarial: EPP, dotación, tecnología, aseo, cafetería, papelería, señalización y más. Un solo proveedor para todo.',
}

export default async function PaginaSoluciones() {
  const [contenido, lineas] = await Promise.all([
    obtenerContenidoSitio(),
    obtenerLineasWeb(),
  ])

  const enlaceWa = urlWhatsapp(contenido)

  return (
    <>
      {/* Hero de la pagina */}
      <section className="relative overflow-hidden gradient-hero pb-20 pt-16 lg:pb-28 lg:pt-20">
        <div className="absolute inset-0 patron-grid" aria-hidden="true" />
        <div className="absolute inset-0 patron-marca opacity-60" aria-hidden="true" />
        <div className="absolute -left-40 top-1/2 h-[400px] w-[400px] rounded-full bg-verde-600/10 blur-[100px]" aria-hidden="true" />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-oro-400/25 bg-oro-400/[0.08] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-oro-400">
            <span className="h-1.5 w-1.5 rounded-full bg-oro-400" />
            Líneas de negocio
          </p>
          <h1 className="mt-6 font-marca text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl">
            Soluciones integrales para tu empresa
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-white/60">
            No somos una tienda de un solo producto. Somos el proveedor que centraliza
            todo lo que tu empresa necesita para operar: desde la protección de tu personal
            hasta el café de tu oficina.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href={enlaceWa}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 rounded-2xl bg-verde-600 px-7 py-4 text-[15px] font-bold text-white shadow-[0_16px_32px_-10px_rgba(22,178,60,0.5)] transition-all hover:bg-verde-500 hover:-translate-y-0.5"
            >
              <IconoWhatsapp className="h-5 w-5" />
              Cotizar por WhatsApp
            </a>
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-7 py-4 text-[15px] font-bold text-white backdrop-blur-md transition-all hover:border-white/25 hover:bg-white/[0.07]"
            >
              Ver catálogo completo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg className="block h-[50px] w-full text-white sm:h-[60px]" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
            <path fill="currentColor" d="M0 60V30c240 18 480 28 720 25s480-15 720-25v30H0Z" />
          </svg>
        </div>
      </section>

      {/* Grid de lineas */}
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <TituloSeccion
            kicker="Todo en un solo lugar"
            titulo="Nuestras líneas de abastecimiento"
            subtitulo="Cada línea cubre una necesidad operativa distinta. Puedes pedir de una o de todas: una sola cotización, una sola entrega, una sola factura."
          />

          <div className="mt-16 space-y-6">
            {lineas.map((linea, i) => (
              <Reveal key={linea.id} retraso={(i % 3) * 80}>
                <div className="group card-premium flex flex-col gap-6 rounded-2xl p-8 sm:flex-row sm:items-center">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-marca-900 text-oro-400 shadow-lg transition-all group-hover:bg-verde-600 group-hover:text-white group-hover:scale-110">
                    <IconoSitio nombre={linea.icono} className="h-8 w-8" />
                  </span>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-marca text-xl font-bold text-marca-900 group-hover:text-verde-700 transition-colors">
                      {linea.nombre}
                    </h3>
                    {linea.descripcion_web && (
                      <p className="mt-2 text-[14px] leading-relaxed text-acero-500">
                        {linea.descripcion_web}
                      </p>
                    )}
                    {linea.total_productos > 0 && (
                      <p className="mt-2 text-[12px] font-semibold text-acero-400">
                        {linea.total_productos} producto{linea.total_productos !== 1 ? 's' : ''} en catálogo
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <Link
                      href={`/catalogo?linea=${linea.slug}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-marca-200 px-5 py-3 text-sm font-bold text-marca-900 transition-all hover:border-verde-300 hover:bg-verde-50"
                    >
                      Ver productos
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <a
                      href={`${enlaceWa} de la línea ${linea.nombre}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[13px] font-semibold text-verde-700 transition hover:text-verde-600"
                    >
                      <IconoWhatsapp className="h-4 w-4" />
                      Cotizar esta línea
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* CTA intermedio */}
          <Reveal retraso={200}>
            <div className="mt-16 rounded-3xl bg-marca-50 p-10 text-center ring-1 ring-marca-100">
              <h3 className="font-marca text-2xl font-extrabold text-marca-900">
                ¿Necesitas algo que no está en esta lista?
              </h3>
              <p className="mx-auto mt-3 max-w-lg text-[15px] text-acero-500">
                Trabajamos bajo pedido. Cuéntanos qué necesita tu empresa y lo
                conseguimos con los mejores proveedores del mercado.
              </p>
              <a
                href={enlaceWa}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2.5 rounded-2xl bg-verde-600 px-8 py-4 text-[15px] font-bold text-white shadow-lg transition-all hover:bg-verde-500 hover:-translate-y-0.5"
              >
                <IconoWhatsapp className="h-5 w-5" />
                Hablar con un asesor
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <SeccionCTA contenido={contenido} />
    </>
  )
}
