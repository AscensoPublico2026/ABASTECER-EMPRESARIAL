'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ItemCotizacion } from '@/types/sitio'

const LLAVE = 'abastecer_cotizacion_v1'

interface ContextoCotizacion {
  items: ItemCotizacion[]
  cargado: boolean
  agregar: (item: Omit<ItemCotizacion, 'cantidad'>, cantidad?: number) => void
  quitar: (id: string) => void
  cambiarCantidad: (id: string, cantidad: number) => void
  limpiar: () => void
  contiene: (id: string) => boolean
  totalReferencias: number
}

const Contexto = createContext<ContextoCotizacion | null>(null)

/**
 * Lista de cotizacion del visitante.
 *
 * El cliente arma su lista de productos (sin precios) y luego la envia por
 * WhatsApp o por el formulario. Se guarda en el navegador (localStorage),
 * asi no se pierde si cambia de pagina o vuelve mas tarde.
 */
export function CotizacionProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ItemCotizacion[]>([])
  const [cargado, setCargado] = useState(false)

  // Leer lo guardado al abrir la pagina
  useEffect(() => {
    try {
      const crudo = window.localStorage.getItem(LLAVE)
      if (crudo) {
        const guardado = JSON.parse(crudo)
        if (Array.isArray(guardado)) {
          setItems(
            guardado
              .filter((i) => i && typeof i.id === 'string' && typeof i.nombre === 'string')
              .map((i) => ({
                id: String(i.id),
                slug: String(i.slug ?? ''),
                codigo: String(i.codigo ?? ''),
                nombre: String(i.nombre),
                unidad_medida: String(i.unidad_medida ?? 'Unidad'),
                cantidad: Math.max(1, Number(i.cantidad) || 1),
              }))
              .slice(0, 100)
          )
        }
      }
    } catch {
      // Si el navegador bloquea localStorage, la lista simplemente arranca vacia
    }
    setCargado(true)
  }, [])

  // Guardar cada cambio
  useEffect(() => {
    if (!cargado) return
    try {
      window.localStorage.setItem(LLAVE, JSON.stringify(items))
    } catch {
      // sin almacenamiento: la lista vive solo en memoria
    }
  }, [items, cargado])

  const agregar = useCallback((item: Omit<ItemCotizacion, 'cantidad'>, cantidad = 1) => {
    setItems((actuales) => {
      const existente = actuales.find((i) => i.id === item.id)
      if (existente) {
        return actuales.map((i) =>
          i.id === item.id ? { ...i, cantidad: Math.min(9999, i.cantidad + cantidad) } : i
        )
      }
      if (actuales.length >= 100) return actuales
      return [...actuales, { ...item, cantidad: Math.max(1, cantidad) }]
    })
  }, [])

  const quitar = useCallback((id: string) => {
    setItems((actuales) => actuales.filter((i) => i.id !== id))
  }, [])

  const cambiarCantidad = useCallback((id: string, cantidad: number) => {
    setItems((actuales) =>
      actuales.map((i) =>
        i.id === id ? { ...i, cantidad: Math.max(1, Math.min(9999, Math.round(cantidad) || 1)) } : i
      )
    )
  }, [])

  const limpiar = useCallback(() => setItems([]), [])

  const valor = useMemo<ContextoCotizacion>(
    () => ({
      items,
      cargado,
      agregar,
      quitar,
      cambiarCantidad,
      limpiar,
      contiene: (id: string) => items.some((i) => i.id === id),
      totalReferencias: items.length,
    }),
    [items, cargado, agregar, quitar, cambiarCantidad, limpiar]
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useCotizacion(): ContextoCotizacion {
  const ctx = useContext(Contexto)
  if (!ctx) {
    throw new Error('useCotizacion debe usarse dentro de <CotizacionProvider>')
  }
  return ctx
}

/** Texto de la lista listo para enviar por WhatsApp o correo */
export function armarMensajeLista(items: ItemCotizacion[]): string {
  if (items.length === 0) return ''
  const lineas = items.map(
    (i, n) => `${n + 1}. ${i.nombre}${i.codigo ? ` (${i.codigo})` : ''} — ${i.cantidad} ${i.unidad_medida}`
  )
  return `Solicito cotización de los siguientes productos:\n\n${lineas.join('\n')}`
}
