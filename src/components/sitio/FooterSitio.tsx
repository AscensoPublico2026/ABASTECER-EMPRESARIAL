import Link from 'next/link'
import { MapPin, Phone, Mail, Clock4, Truck, ArrowUpRight } from 'lucide-react'
import LogoAbastecer from './LogoAbastecer'
import { IconoWhatsapp, IconoRed } from './IconosRedes'
import { MENU_SITIO, redesSociales, urlCorreo, urlTelefono, urlWhatsapp } from '@/lib/sitio/config'
import { texto, textoOpcional } from '@/lib/sitio/contenido'
import type { Contenido, LineaWeb } from '@/types/sitio'

export default function FooterSitio({
  contenido,
  lineas,
}: {
  contenido: Contenido
  lineas: LineaWeb[]
}) {
  const redes = redesSociales(contenido)
  const maps = textoOpcional(contenido, 'contacto_maps_url')
  const anio = new Date().getFullYear()

  return (
    <footer className="mt-auto bg-marca-900 patron-marca text-white/70">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Marca */}
          <div className="lg:col-span-4">
            <LogoAbastecer tamano="md" invertido />
            <p className="mt-5 max-w-sm text-sm leading-relaxed">
              {texto(contenido, 'footer_texto')}
            </p>

            <a
              href={urlWhatsapp(contenido)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-verde-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-verde-500"
            >
              <IconoWhatsapp className="h-4 w-4" />
              Escríbenos por WhatsApp
            </a>

            {redes.length > 0 ? (
              <div className="mt-6 flex items-center gap-3">
                {redes.map((red) => (
                  <a
                    key={red.clave}
                    href={red.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={red.nombre}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-oro-400/40 hover:text-oro-400"
                  >
                    <IconoRed clave={red.clave} className="h-4 w-4" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {/* Lineas */}
          <div className="lg:col-span-3">
            <h3 className="font-marca text-sm font-bold uppercase tracking-[0.14em] text-white">
              Líneas de producto
            </h3>
            <ul className="mt-5 space-y-2.5 text-sm">
              {(lineas.length > 0 ? lineas.slice(0, 8) : []).map((linea) => (
                <li key={linea.id}>
                  <Link
                    href={`/catalogo?linea=${linea.slug}`}
                    className="transition hover:text-oro-400"
                  >
                    {linea.nombre}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/catalogo"
                  className="inline-flex items-center gap-1 font-semibold text-oro-400 transition hover:text-oro-300"
                >
                  Ver todo el catálogo
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Enlaces */}
          <div className="lg:col-span-2">
            <h3 className="font-marca text-sm font-bold uppercase tracking-[0.14em] text-white">
              La empresa
            </h3>
            <ul className="mt-5 space-y-2.5 text-sm">
              {MENU_SITIO.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition hover:text-oro-400">
                    {item.nombre}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/cotizacion" className="transition hover:text-oro-400">
                  Mi lista de cotización
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div className="lg:col-span-3">
            <h3 className="font-marca text-sm font-bold uppercase tracking-[0.14em] text-white">
              Contacto
            </h3>
            <ul className="mt-5 space-y-3.5 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-oro-400" />
                <span>
                  {maps ? (
                    <a href={maps} target="_blank" rel="noopener noreferrer" className="hover:text-oro-400">
                      {texto(contenido, 'contacto_direccion')}
                      <br />
                      {texto(contenido, 'contacto_ciudad')}
                    </a>
                  ) : (
                    <>
                      {texto(contenido, 'contacto_direccion')}
                      <br />
                      {texto(contenido, 'contacto_ciudad')}
                    </>
                  )}
                </span>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-oro-400" />
                <a href={urlTelefono(contenido)} className="hover:text-oro-400">
                  {texto(contenido, 'contacto_telefono')}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-oro-400" />
                <a href={urlCorreo(contenido)} className="break-all hover:text-oro-400">
                  {texto(contenido, 'contacto_email')}
                </a>
              </li>
              <li className="flex gap-3">
                <Clock4 className="mt-0.5 h-4 w-4 shrink-0 text-oro-400" />
                <span>{texto(contenido, 'contacto_horario')}</span>
              </li>
              <li className="flex gap-3">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-oro-400" />
                <span>{texto(contenido, 'contacto_cobertura')}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Barra legal */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-5 text-xs text-white/45 sm:flex-row">
          <p>
            © {anio} {texto(contenido, 'footer_legal')}
          </p>
          <div className="flex items-center gap-5">
            <span>Todos los derechos reservados</span>
            <Link href="/login" className="transition hover:text-white/70">
              Acceso equipo
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
