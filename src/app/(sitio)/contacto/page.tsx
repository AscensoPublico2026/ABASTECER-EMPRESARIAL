import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, MapPin, Phone, Mail, Clock4, Truck, ExternalLink } from 'lucide-react'
import { obtenerContenidoSitio } from '@/lib/queries/sitio'
import { texto, textoOpcional } from '@/lib/sitio/contenido'
import { urlCorreo, urlTelefono, urlWhatsapp, redesSociales } from '@/lib/sitio/config'
import FormularioSolicitud from '@/components/sitio/FormularioSolicitud'
import { IconoWhatsapp, IconoRed } from '@/components/sitio/IconosRedes'

export async function generateMetadata(): Promise<Metadata> {
  const contenido = await obtenerContenidoSitio()
  return {
    title: 'Contacto',
    description: `Escríbenos y recibe tu cotización en menos de 24 horas hábiles. ${texto(
      contenido,
      'contacto_cobertura'
    )}`,
    alternates: { canonical: '/contacto' },
  }
}

export default async function PaginaContacto() {
  const contenido = await obtenerContenidoSitio()
  const maps = textoOpcional(contenido, 'contacto_maps_url')
  const redes = redesSociales(contenido)

  const canales = [
    {
      icono: IconoWhatsapp,
      titulo: 'WhatsApp',
      valor: texto(contenido, 'contacto_telefono'),
      detalle: 'La vía más rápida. Respondemos en horario laboral.',
      href: urlWhatsapp(contenido),
      externo: true,
      destacado: true,
    },
    {
      icono: Phone,
      titulo: 'Teléfono',
      valor: texto(contenido, 'contacto_telefono'),
      detalle: texto(contenido, 'contacto_horario'),
      href: urlTelefono(contenido),
      externo: false,
      destacado: false,
    },
    {
      icono: Mail,
      titulo: 'Correo electrónico',
      valor: texto(contenido, 'contacto_email'),
      detalle: 'Envíanos tu lista de requerimientos o tu orden de compra.',
      href: urlCorreo(contenido, 'Solicitud de cotización'),
      externo: false,
      destacado: false,
    },
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
            <span className="text-white/80">Contacto</span>
          </nav>

          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-oro-400">
            Estamos para atenderte
          </p>
          <h1 className="max-w-3xl font-marca text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Hablemos de lo que tu empresa necesita
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70">
            Cuéntanos qué requieres y te enviamos una cotización formal en menos de 24 horas
            hábiles. Sin compromiso y sin trámites.
          </p>
        </div>
      </section>

      {/* Canales */}
      <section className="bg-white py-14">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 sm:grid-cols-3">
          {canales.map((canal) => (
            <a
              key={canal.titulo}
              href={canal.href}
              target={canal.externo ? '_blank' : undefined}
              rel={canal.externo ? 'noopener noreferrer' : undefined}
              className={`group flex h-full flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${
                canal.destacado
                  ? 'border-verde-200 bg-verde-50 hover:shadow-marca'
                  : 'border-marca-100 bg-white shadow-tarjeta hover:border-verde-200'
              }`}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  canal.destacado ? 'bg-verde-600 text-white' : 'bg-marca-50 text-marca-900'
                }`}
              >
                <canal.icono className="h-5 w-5" />
              </span>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-acero-400">
                {canal.titulo}
              </p>
              <p className="mt-1 break-words font-marca text-lg font-bold leading-snug text-marca-900">
                {canal.valor}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-acero-500">{canal.detalle}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Formulario + datos */}
      <section className="bg-marca-50/50 py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <FormularioSolicitud
              tipo="COTIZACION"
              origen="pagina-contacto"
              urlWhatsapp={urlWhatsapp(contenido)}
              titulo="Solicita tu cotización"
              descripcion="Llena el formulario y nuestro equipo comercial te contacta. Entre más detalles nos des (cantidades, tallas, fechas), más precisa será la cotización."
            />
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-marca-100 bg-white p-6 shadow-tarjeta sm:p-8">
              <h2 className="font-marca text-xl font-bold text-marca-900">Datos de contacto</h2>

              <ul className="mt-6 space-y-5 text-sm">
                <li className="flex gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marca-50 text-verde-600">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-acero-400">
                      Dirección
                    </p>
                    <p className="mt-0.5 font-semibold text-marca-900">
                      {texto(contenido, 'contacto_direccion')}
                    </p>
                    <p className="text-acero-500">{texto(contenido, 'contacto_ciudad')}</p>
                    {maps ? (
                      <a
                        href={maps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-verde-700 hover:underline"
                      >
                        Ver en Google Maps
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </li>

                <li className="flex gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marca-50 text-verde-600">
                    <Clock4 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-acero-400">
                      Horario de atención
                    </p>
                    <p className="mt-0.5 leading-relaxed text-marca-900">
                      {texto(contenido, 'contacto_horario')}
                    </p>
                  </div>
                </li>

                <li className="flex gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marca-50 text-verde-600">
                    <Truck className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-acero-400">
                      Cobertura
                    </p>
                    <p className="mt-0.5 leading-relaxed text-marca-900">
                      {texto(contenido, 'contacto_cobertura')}
                    </p>
                  </div>
                </li>
              </ul>

              {redes.length > 0 ? (
                <div className="mt-8 border-t border-marca-100 pt-6">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-acero-400">
                    Síguenos
                  </p>
                  <div className="mt-3 flex items-center gap-2.5">
                    {redes.map((red) => (
                      <a
                        key={red.clave}
                        href={red.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={red.nombre}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-marca-100 text-acero-500 transition hover:border-verde-300 hover:text-verde-700"
                      >
                        <IconoRed clave={red.clave} className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl bg-marca-900 p-6 text-white">
              <p className="font-marca text-base font-bold">¿Es urgente?</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                Escríbenos directo por WhatsApp y te atendemos de una.
              </p>
              <a
                href={urlWhatsapp(contenido)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-verde-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-verde-500"
              >
                <IconoWhatsapp className="h-4 w-4" />
                Abrir WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
