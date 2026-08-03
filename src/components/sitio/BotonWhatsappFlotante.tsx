'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { IconoWhatsapp } from './IconosRedes'

/**
 * Boton flotante de WhatsApp. Aparece al bajar un poco la pagina para no
 * tapar el hero, y en escritorio muestra un texto al pasar el mouse.
 */
export default function BotonWhatsappFlotante({ url }: { url: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const alScrollear = () => setVisible(window.scrollY > 260)
    alScrollear()
    window.addEventListener('scroll', alScrollear, { passive: true })
    return () => window.removeEventListener('scroll', alScrollear)
  }, [])

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className={clsx(
        'group fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full bg-[#25D366] py-3.5 pl-4 pr-4 text-white shadow-[0_12px_30px_-8px_rgba(37,211,102,0.7)] transition-all duration-300 hover:bg-[#20bd5a] sm:bottom-7 sm:right-7',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      )}
    >
      <IconoWhatsapp className="h-6 w-6 shrink-0" />
      <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-sm font-bold transition-all duration-300 group-hover:max-w-[12rem] sm:block">
        <span className="pr-1">Cotiza por WhatsApp</span>
      </span>
    </a>
  )
}
