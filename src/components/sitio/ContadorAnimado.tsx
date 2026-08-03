'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Contador que anima de 0 al valor final cuando entra en pantalla.
 * Da un efecto premium tipo "empresa con trayectoria".
 */
export default function ContadorAnimado({
  valor,
  sufijo = '',
  duracion = 2000,
}: {
  valor: string
  sufijo?: string
  duracion?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [mostrar, setMostrar] = useState(valor)
  const [visible, setVisible] = useState(false)

  // Extraer el numero del valor (ej: "24 h" -> 24, "100%" -> 100)
  const numero = parseInt(valor.replace(/[^0-9]/g, ''), 10)
  const esNumero = !isNaN(numero) && numero > 0

  useEffect(() => {
    const nodo = ref.current
    if (!nodo || !esNumero) return

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) {
          setVisible(true)
          observador.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [esNumero])

  useEffect(() => {
    if (!visible || !esNumero) return

    const inicio = performance.now()
    let frame: number

    const animar = (ahora: number) => {
      const progreso = Math.min((ahora - inicio) / duracion, 1)
      const eased = 1 - Math.pow(1 - progreso, 3) // ease-out cubic
      const actual = Math.round(numero * eased)
      setMostrar(valor.replace(String(numero), String(actual)))

      if (progreso < 1) {
        frame = requestAnimationFrame(animar)
      } else {
        setMostrar(valor)
      }
    }

    frame = requestAnimationFrame(animar)
    return () => cancelAnimationFrame(frame)
  }, [visible, esNumero, numero, duracion, valor])

  return (
    <span ref={ref} className={visible ? 'animate-count' : ''}>
      {mostrar}
      {sufijo}
    </span>
  )
}
