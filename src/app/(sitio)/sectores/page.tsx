import type { Metadata } from 'next'
import { obtenerContenidoSitio } from '@/lib/queries/sitio'
import { urlWhatsapp } from '@/lib/sitio/config'
import { SeccionCTA } from '@/components/sitio/secciones'
import { IconoWhatsapp } from '@/components/sitio/IconosRedes'
import IconoSitio from '@/components/sitio/IconoSitio'
import Reveal from '@/components/sitio/Reveal'

export const metadata: Metadata = {
  title: 'Sectores que atendemos | Proveedor empresarial Cali',
  description: 'Atendemos empresas, industria, construcción, salud, educación, hotelería, comercio y más. Conoce las necesidades que resolvemos para tu sector.',
}

/**
 * Los sectores con sus necesidades específicas.
 *
 * Inspirado en SUMIK (que lo hace muy bien) pero con WhatsApp directo en
 * vez de formulario, y con las necesidades reales del portafolio de
 * Abastecer (que es mucho más amplio que solo aseo y empaques).
 */
const SECTORES = [
  {
    icono: 'fabrica',
    nombre: 'Industria y manufactura',
    necesidades: [
      'EPP certificados para todos los riesgos',
      'Dotación industrial y overoles',
      'Señalización y demarcación',
      'Productos de aseo para planta',
      'Extintores y equipos de emergencia',
    ],
    mensaje: 'Hola, soy de una empresa industrial y necesito cotizar EPP y dotación.',
  },
  {
    icono: 'casco',
    nombre: 'Construcción y obra civil',
    necesidades: [
      'Cascos, arneses y líneas de vida',
      'Calzado de seguridad dieléctrico',
      'Guantes para manejo de materiales',
      'Señalización vial y de seguridad',
      'Botiquines y camillas',
    ],
    mensaje: 'Hola, soy de una constructora y necesito cotizar EPP para obra.',
  },
  {
    icono: 'edificio',
    nombre: 'Empresas y oficinas',
    necesidades: [
      'Papelería y suministros de oficina',
      'Tecnología y periféricos',
      'Aseo y cafetería institucional',
      'Dotación corporativa con logo',
      'Mobiliario de oficina',
    ],
    mensaje: 'Hola, necesito cotizar suministros para mi oficina.',
  },
  {
    icono: 'hospital',
    nombre: 'Clínicas, IPS y salud',
    necesidades: [
      'Guantes de nitrilo y látex',
      'Tapabocas y respiradores',
      'Batas y overoles desechables',
      'Desinfectantes hospitalarios',
      'Señalización de bioseguridad',
    ],
    mensaje: 'Hola, soy del sector salud y necesito cotizar EPP y desinfección.',
  },
  {
    icono: 'usuarios',
    nombre: 'Instituciones educativas',
    necesidades: [
      'Aseo y desinfección de instalaciones',
      'Papelería administrativa',
      'Cafetería e insumos de comedor',
      'Señalización de evacuación',
      'Botiquines de primeros auxilios',
    ],
    mensaje: 'Hola, soy de una institución educativa y necesito cotizar suministros.',
  },
  {
    icono: 'tienda',
    nombre: 'Comercio y servicios',
    necesidades: [
      'Dotación para personal de atención',
      'Elementos de aseo del local',
      'Identificación y carnés',
      'Suministros de empaque',
      'Cafetería para clientes',
    ],
    mensaje: 'Hola, tengo un negocio comercial y necesito cotizar dotación y suministros.',
  },
  {
    icono: 'camion',
    nombre: 'Logística y transporte',
    necesidades: [
      'Chalecos reflectivos',
      'Guantes de carga y manipulación',
      'Calzado antideslizante',
      'Conos y cinta de señalización',
      'Botiquines vehiculares',
    ],
    mensaje: 'Hola, soy de una empresa de transporte y necesito cotizar EPP y señalización.',
  },
  {
    icono: 'tractor',
    nombre: 'Agroindustria',
    necesidades: [
      'Protección respiratoria para fumigación',
      'Trajes de protección química',
      'Guantes resistentes a químicos',
      'Botas de caucho',
      'Dotación para trabajo en campo',
    ],
    mensaje: 'Hola, necesito cotizar elementos de protección para trabajo agroindustrial.',
  },
]

export default async function PaginaSectores() {
  const contenido = await obtenerContenidoSitio()

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero pb-20 pt-16 lg:pb-28 lg:pt-20">
        <div className="absolute inset-0 patron-grid" aria-hidden="true" />
        <div className="absolute inset-0 patron-marca opacity-60" aria-hidden="true" />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-oro-400/25 bg-oro-400/[0.08] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-oro-400">
            <span className="h-1.5 w-1.5 rounded-full bg-oro-400" />
            Sectores
          </p>
          <h1 className="mt-6 font-marca text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl">
            Conocemos las necesidades de tu sector
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-white/60">
            Si tu empresa tiene personal, tiene necesidades de abastecimiento.
            Entendemos los retos de cada industria y tenemos el portafolio para resolverlos.
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg className="block h-[50px] w-full text-white sm:h-[60px]" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
            <path fill="currentColor" d="M0 60V30c240 18 480 28 720 25s480-15 720-25v30H0Z" />
          </svg>
        </div>
      </section>

      {/* Grid de sectores */}
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {SECTORES.map((sector, i) => (
              <Reveal key={sector.nombre} retraso={(i % 2) * 100}>
                <div className="group card-premium flex h-full flex-col rounded-2xl p-8">
                  <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-marca-900 text-oro-400 shadow-lg transition-all group-hover:bg-verde-600 group-hover:text-white group-hover:scale-105">
                      <IconoSitio nombre={sector.icono} className="h-7 w-7" />
                    </span>
                    <h3 className="font-marca text-lg font-bold text-marca-900 group-hover:text-verde-700 transition-colors">
                      {sector.nombre}
                    </h3>
                  </div>

                  <ul className="mt-6 space-y-2.5">
                    {sector.necesidades.map((n) => (
                      <li key={n} className="flex items-start gap-2.5 text-[14px] text-acero-600">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-verde-500" />
                        {n}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={urlWhatsapp(contenido, sector.mensaje)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex items-center gap-2 pt-6 text-[13px] font-bold text-verde-700 transition-all hover:gap-3 hover:text-verde-600"
                  >
                    <IconoWhatsapp className="h-4 w-4" />
                    Cotizar para {sector.nombre.split(' ')[0].toLowerCase()}
                  </a>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Sector no listado */}
          <Reveal retraso={200}>
            <div className="mt-12 rounded-3xl bg-marca-50 p-10 text-center ring-1 ring-marca-100">
              <h3 className="font-marca text-2xl font-extrabold text-marca-900">
                ¿Tu sector no está en la lista?
              </h3>
              <p className="mx-auto mt-3 max-w-lg text-[15px] text-acero-500">
                Atendemos cualquier empresa que necesite abastecimiento.
                Escríbenos y te armamos una propuesta a la medida.
              </p>
              <a
                href={urlWhatsapp(contenido, 'Hola, mi empresa es de un sector que no vi en la lista y necesito cotizar.')}
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
