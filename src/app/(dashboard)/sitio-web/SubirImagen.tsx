'use client'

import { useRef, useState } from 'react'
import clsx from 'clsx'
import { Upload, Loader2, Trash2, ImageIcon, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Sube imagenes al bucket publico "sitio" de Supabase Storage.
 *
 * Antes de subir, la imagen se reduce y se convierte a WebP en el navegador
 * (maximo 1400 px) para que la web cargue rapido. Una foto de 5 MB del celular
 * termina pesando unos 150 KB.
 */

const LADO_MAXIMO = 1400
const CALIDAD = 0.82

async function optimizar(archivo: File): Promise<Blob> {
  // Si el navegador no soporta las APIs, subimos el archivo original
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return archivo

  try {
    const bitmap = await createImageBitmap(archivo)
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
    const ancho = Math.round(bitmap.width * escala)
    const alto = Math.round(bitmap.height * escala)

    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    const ctx = lienzo.getContext('2d')
    if (!ctx) return archivo

    // Fondo blanco para los PNG con transparencia
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, ancho, alto)
    ctx.drawImage(bitmap, 0, 0, ancho, alto)
    bitmap.close?.()

    const blob = await new Promise<Blob | null>((resolver) =>
      lienzo.toBlob(resolver, 'image/webp', CALIDAD)
    )
    return blob && blob.size > 0 ? blob : archivo
  } catch {
    return archivo
  }
}

interface Props {
  carpeta: string
  valor: string
  onCambio: (url: string) => void
  etiqueta?: string
  compacto?: boolean
}

export default function SubirImagen({ carpeta, valor, onCambio, etiqueta, compacto }: Props) {
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const refArchivo = useRef<HTMLInputElement>(null)

  async function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    setSubiendo(true)
    setError('')

    try {
      const optimizada = await optimizar(archivo)
      const extension = optimizada.type === 'image/webp' ? 'webp' : (archivo.name.split('.').pop() ?? 'jpg')
      const ruta = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`

      const supabase = createClient()
      const { error: errorSubida } = await supabase.storage
        .from('sitio')
        .upload(ruta, optimizada, { contentType: optimizada.type || archivo.type, upsert: false })

      if (errorSubida) {
        setError(
          errorSubida.message.toLowerCase().includes('bucket')
            ? 'No existe el bucket "sitio" en Supabase Storage. Créalo como público y vuelve a intentar.'
            : errorSubida.message
        )
        setSubiendo(false)
        return
      }

      const { data } = supabase.storage.from('sitio').getPublicUrl(ruta)
      onCambio(data.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen.')
    }

    setSubiendo(false)
    if (refArchivo.current) refArchivo.current.value = ''
  }

  return (
    <div>
      {etiqueta ? (
        <p className="mb-1.5 text-sm font-medium text-gray-700">{etiqueta}</p>
      ) : null}

      <div className="flex items-start gap-3">
        <div
          className={clsx(
            'flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50',
            compacto ? 'h-16 w-16' : 'h-24 w-24'
          )}
        >
          {valor ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={valor} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-gray-300" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <label
              className={clsx(
                'inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition',
                subiendo
                  ? 'border-gray-200 bg-gray-100 text-gray-400'
                  : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
              )}
            >
              {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {subiendo ? 'Subiendo...' : valor ? 'Cambiar imagen' : 'Subir imagen'}
              <input
                ref={refArchivo}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={manejarArchivo}
                disabled={subiendo}
                className="hidden"
              />
            </label>

            {valor ? (
              <button
                type="button"
                onClick={() => onCambio('')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Quitar
              </button>
            ) : null}
          </div>

          <input
            type="url"
            value={valor}
            onChange={(e) => onCambio(e.target.value)}
            placeholder="o pega aquí la URL de una imagen"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-600 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />

          {error ? (
            <p className="flex items-start gap-1.5 text-xs text-red-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
