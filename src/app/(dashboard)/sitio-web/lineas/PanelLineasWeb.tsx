'use client'

import { useState, useTransition } from 'react'
import clsx from 'clsx'
import {
  Pencil, X, Save, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, ExternalLink,
} from 'lucide-react'
import { guardarLineaWeb, type ResultadoAccion } from '../actions'
import SubirImagen from '../SubirImagen'
import IconoSitio from '@/components/sitio/IconoSitio'
import { ICONOS_SITIO } from '@/types/sitio'
import type { LineaAdminWeb } from '@/lib/queries/sitioAdmin'

export default function PanelLineasWeb({ lineas }: { lineas: LineaAdminWeb[] }) {
  const [editando, setEditando] = useState<LineaAdminWeb | null>(null)
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null)

  return (
    <div className="space-y-4">
      {resultado ? (
        <div
          className={clsx(
            'flex items-center gap-2.5 rounded-2xl border p-4 text-sm',
            resultado.ok
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          )}
        >
          {resultado.ok ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {resultado.mensaje}
        </div>
      ) : null}

      {lineas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No hay líneas creadas. Se administran en{' '}
          <span className="font-semibold text-gray-700">Configuración &gt; Categorías</span>.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {lineas.map((linea) => (
            <div
              key={linea.id}
              className={clsx(
                'rounded-2xl border bg-white p-5 shadow-sm transition',
                linea.visible_web ? 'border-gray-100' : 'border-dashed border-gray-200 opacity-70'
              )}
            >
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-amber-400">
                  <IconoSitio nombre={linea.icono} className="h-6 w-6" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-800">
                      {linea.nombre_web || linea.nombre}
                    </h3>
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        linea.visible_web
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {linea.visible_web ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                      {linea.visible_web ? 'En la web' : 'Oculta'}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-gray-400">
                    Interno: {linea.nombre} · {linea.total_publicados} de {linea.total_productos}{' '}
                    producto(s) publicados
                  </p>

                  <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-gray-500">
                    {linea.descripcion_web || 'Sin descripción para la web.'}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditando(linea)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    {linea.visible_web && linea.slug ? (
                      <a
                        href={`/catalogo?linea=${linea.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-400 transition hover:bg-gray-50 hover:text-gray-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver en la web
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editando ? (
        <ModalLinea
          linea={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={(r) => {
            setResultado(r)
            if (r.ok) setEditando(null)
            window.setTimeout(() => setResultado(null), 4000)
          }}
        />
      ) : null}
    </div>
  )
}

function ModalLinea({
  linea,
  onCerrar,
  onGuardado,
}: {
  linea: LineaAdminWeb
  onCerrar: () => void
  onGuardado: (r: ResultadoAccion) => void
}) {
  const [icono, setIcono] = useState(linea.icono)
  const [imagen, setImagen] = useState(linea.imagen_url)
  const [guardando, iniciar] = useTransition()

  const claseCampo =
    'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

  function manejarEnvio(formData: FormData) {
    formData.set('icono', icono)
    formData.set('imagen_url', imagen)
    iniciar(async () => {
      onGuardado(await guardarLineaWeb(formData))
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-sm sm:p-8">
      <div className="texto-normal w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Editar línea en la web</h3>
            <p className="mt-0.5 text-sm text-gray-500">Categoría interna: {linea.nombre}</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={manejarEnvio} className="space-y-5 px-6 py-6">
          <input type="hidden" name="id" value={linea.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Nombre en la web
              </label>
              <input
                name="nombre_web"
                type="text"
                defaultValue={linea.nombre_web}
                placeholder={linea.nombre}
                maxLength={120}
                className={claseCampo}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Orden</label>
              <input
                name="orden"
                type="number"
                defaultValue={linea.orden}
                className={claseCampo}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Descripción para la web
            </label>
            <textarea
              name="descripcion_web"
              rows={4}
              defaultValue={linea.descripcion_web}
              maxLength={1200}
              placeholder="Qué productos incluye esta línea y para qué le sirve al cliente."
              className={clsx(claseCampo, 'leading-relaxed')}
            />
          </div>

          {/* Icono */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Icono</p>
            <div className="grid grid-cols-8 gap-2 rounded-xl border border-gray-200 p-3 sm:grid-cols-12">
              {ICONOS_SITIO.map((nombre) => (
                <button
                  key={nombre}
                  type="button"
                  onClick={() => setIcono(nombre)}
                  title={nombre}
                  className={clsx(
                    'flex h-9 w-9 items-center justify-center rounded-lg transition',
                    icono === nombre
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  )}
                >
                  <IconoSitio nombre={nombre} className="h-4 w-4" />
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Seleccionado: <span className="font-mono">{icono}</span>
            </p>
          </div>

          <SubirImagen
            carpeta={`lineas/${linea.id}`}
            valor={imagen}
            onCambio={setImagen}
            etiqueta="Imagen de la línea (opcional)"
          />

          <label className="flex items-center gap-2.5 text-sm text-gray-700">
            <input
              type="checkbox"
              name="visible_web"
              defaultChecked={linea.visible_web}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            Mostrar esta línea en la página web
          </label>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {guardando ? 'Guardando...' : 'Guardar y publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
