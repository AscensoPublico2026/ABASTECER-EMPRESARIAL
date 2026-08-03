'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X, Loader2 } from 'lucide-react'

/**
 * Buscador del catalogo.
 * Escribe y filtra solo (sin dar clic en nada). Si el visitante tiene el
 * JavaScript desactivado, el formulario funciona igual con el boton Buscar.
 */
export default function BuscadorCatalogo({ valorInicial = '' }: { valorInicial?: string }) {
  const router = useRouter()
  const parametros = useSearchParams()
  const [valor, setValor] = useState(valorInicial)
  const [pendiente, iniciarTransicion] = useTransition()
  const primeraVez = useRef(true)

  // Si el usuario navega (atras/adelante), sincronizamos la caja de texto
  useEffect(() => {
    setValor(parametros.get('q') ?? '')
  }, [parametros])

  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false
      return
    }

    const temporizador = window.setTimeout(() => {
      const actuales = new URLSearchParams(parametros.toString())
      const limpio = valor.trim()

      if (limpio) actuales.set('q', limpio)
      else actuales.delete('q')
      actuales.delete('pagina')

      const consulta = actuales.toString()
      iniciarTransicion(() => {
        router.replace(consulta ? `/catalogo?${consulta}` : '/catalogo', { scroll: false })
      })
    }, 350)

    return () => window.clearTimeout(temporizador)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  return (
    <form
      action="/catalogo"
      method="get"
      onSubmit={(e) => e.preventDefault()}
      className="relative"
      role="search"
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-acero-400" />
      <input
        type="text"
        name="q"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Busca un producto: casco, guantes, overol, papel..."
        autoComplete="off"
        className="h-14 w-full rounded-2xl border border-marca-100 bg-white pl-12 pr-24 text-base text-marca-900 shadow-tarjeta outline-none transition placeholder:text-acero-400 focus:border-verde-400 focus:ring-4 focus:ring-verde-100"
        aria-label="Buscar productos en el catálogo"
      />

      {parametros.get('linea') ? (
        <input type="hidden" name="linea" value={parametros.get('linea') ?? ''} />
      ) : null}

      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {pendiente ? <Loader2 className="h-4 w-4 animate-spin text-verde-600" /> : null}
        {valor ? (
          <button
            type="button"
            onClick={() => setValor('')}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-acero-400 transition hover:bg-marca-50 hover:text-marca-900"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="submit"
          className="hidden h-9 items-center rounded-xl bg-marca-900 px-4 text-sm font-bold text-white"
        >
          Buscar
        </button>
      </div>
    </form>
  )
}
