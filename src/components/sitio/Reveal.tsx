'use client'

import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

/**
 * Hace aparecer suavemente un bloque cuando entra en pantalla.
 * Si el visitante pidio "menos animaciones" en su sistema, no anima nada
 * (las reglas viven en globals.css).
 */
export default function Reveal({
  children,
  retraso = 0,
  className,
}: {
  children: React.ReactNode
  /** milisegundos de retraso, para escalonar tarjetas */
  retraso?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const nodo = ref.current
    if (!nodo) return

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            setVisible(true)
            observador.disconnect()
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    )

    observador.observe(nodo)
    return () => observador.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={clsx('reveal', visible && 'visible', className)}
      style={retraso ? { transitionDelay: `${retraso}ms` } : undefined}
    >
      {children}
    </div>
  )
}
