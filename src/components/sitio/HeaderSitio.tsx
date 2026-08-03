'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Menu, X, Phone, Mail, Clock4, ClipboardList, Search } from 'lucide-react'
import LogoAbastecer from './LogoAbastecer'
import { IconoWhatsapp } from './IconosRedes'
import { useCotizacion } from './CotizacionProvider'
import { MENU_SITIO } from '@/lib/sitio/config'

interface Props {
  telefono: string
  correo: string
  horario: string
  urlWhatsapp: string
  urlTelefono: string
  tagline: string
}

export default function HeaderSitio({
  telefono,
  correo,
  horario,
  urlWhatsapp,
  urlTelefono,
  tagline,
}: Props) {
  const pathname = usePathname()
  const [abierto, setAbierto] = useState(false)
  const [conSombra, setConSombra] = useState(false)
  const { totalReferencias, cargado } = useCotizacion()

  useEffect(() => {
    const alScrollear = () => setConSombra(window.scrollY > 8)
    alScrollear()
    window.addEventListener('scroll', alScrollear, { passive: true })
    return () => window.removeEventListener('scroll', alScrollear)
  }, [])

  // Cerrar el menu al cambiar de pagina
  useEffect(() => {
    setAbierto(false)
  }, [pathname])

  const activo = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-50">
      {/* Barra superior de contacto */}
      <div className="hidden bg-marca-900 text-white/85 lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-2 text-[13px]">
          <p className="flex items-center gap-2 font-medium text-white/70">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-oro-400" />
            {tagline}
          </p>
          <div className="flex items-center gap-6">
            <span className="hidden max-w-[24rem] items-center gap-1.5 truncate text-white/60 xl:flex">
              <Clock4 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{horario}</span>
            </span>
            <a href={urlTelefono} className="flex items-center gap-1.5 transition hover:text-oro-400">
              <Phone className="h-3.5 w-3.5" />
              {telefono}
            </a>
            <a href={`mailto:${correo}`} className="flex items-center gap-1.5 transition hover:text-oro-400">
              <Mail className="h-3.5 w-3.5" />
              {correo}
            </a>
          </div>
        </div>
      </div>

      {/* Barra principal */}
      <div
        className={clsx(
          'border-b bg-white/95 backdrop-blur transition-shadow',
          conSombra ? 'border-marca-100 shadow-[0_6px_24px_-12px_rgba(13,27,42,0.35)]' : 'border-transparent'
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="shrink-0" aria-label="Abastecer Empresarial - Inicio">
            <LogoAbastecer tamano="md" />
          </Link>

          {/* Menu escritorio */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Menú principal">
            {MENU_SITIO.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'rounded-lg px-3.5 py-2 text-sm font-semibold transition',
                  activo(item.href)
                    ? 'bg-marca-50 text-marca-900'
                    : 'text-acero-600 hover:bg-marca-50/70 hover:text-marca-900'
                )}
              >
                {item.nombre}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/catalogo"
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-marca-100 text-acero-500 transition hover:border-marca-200 hover:text-marca-900 sm:flex lg:hidden"
              aria-label="Buscar en el catálogo"
            >
              <Search className="h-4 w-4" />
            </Link>

            <Link
              href="/cotizacion"
              className="relative flex h-10 items-center gap-2 rounded-xl border border-marca-100 px-3 text-sm font-semibold text-marca-900 transition hover:border-verde-200 hover:bg-verde-50"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Mi lista</span>
              {cargado && totalReferencias > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-verde-600 px-1 text-[11px] font-bold text-white shadow">
                  {totalReferencias}
                </span>
              ) : null}
            </Link>

            <a
              href={urlWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-10 items-center gap-2 rounded-xl bg-verde-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-verde-700 sm:flex"
            >
              <IconoWhatsapp className="h-4 w-4" />
              Cotizar ahora
            </a>

            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-marca-100 text-marca-900 transition hover:bg-marca-50 lg:hidden"
              aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={abierto}
            >
              {abierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Menu movil */}
        {abierto ? (
          <div className="border-t border-marca-100 bg-white lg:hidden">
            <nav className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6" aria-label="Menú móvil">
              {MENU_SITIO.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'block rounded-xl px-4 py-3 text-base font-semibold transition',
                    activo(item.href)
                      ? 'bg-marca-50 text-marca-900'
                      : 'text-acero-600 hover:bg-marca-50/70 hover:text-marca-900'
                  )}
                >
                  {item.nombre}
                </Link>
              ))}
              <a
                href={urlWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-verde-600 px-4 py-3 text-base font-bold text-white"
              >
                <IconoWhatsapp className="h-5 w-5" />
                Escríbenos por WhatsApp
              </a>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={urlTelefono}
                  className="flex items-center justify-center gap-2 rounded-xl border border-marca-100 px-3 py-3 text-sm font-semibold text-marca-900"
                >
                  <Phone className="h-4 w-4" /> Llamar
                </a>
                <a
                  href={`mailto:${correo}`}
                  className="flex items-center justify-center gap-2 rounded-xl border border-marca-100 px-3 py-3 text-sm font-semibold text-marca-900"
                >
                  <Mail className="h-4 w-4" /> Correo
                </a>
              </div>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  )
}
