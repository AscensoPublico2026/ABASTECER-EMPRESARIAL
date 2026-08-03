'use client'

import { useMemo, useState, useTransition } from 'react'
import clsx from 'clsx'
import {
  Save, Loader2, CheckCircle2, AlertCircle, Info, ExternalLink,
} from 'lucide-react'
import { guardarContenidoSitio, type ResultadoAccion } from '../actions'
import type { CampoContenido } from '@/types/sitio'

const GRUPOS: { clave: string; nombre: string; descripcion: string }[] = [
  { clave: 'marca', nombre: 'Marca y Google', descripcion: 'Nombre, eslogan y el texto que ve Google en los resultados de búsqueda.' },
  { clave: 'hero', nombre: 'Portada', descripcion: 'La primera pantalla que ve el cliente al entrar. Lo más importante de la web.' },
  { clave: 'cifras', nombre: 'Cifras', descripcion: 'La franja de números que va debajo de la portada.' },
  { clave: 'beneficios', nombre: 'Por qué elegirnos', descripcion: 'Los argumentos de venta: qué gana el cliente comprando con Abastecer.' },
  { clave: 'nosotros', nombre: 'Nosotros, misión y visión', descripcion: 'Quiénes somos, misión, visión y valores de la empresa.' },
  { clave: 'proceso', nombre: 'Cómo trabajamos', descripcion: 'Los pasos que sigue el cliente para comprar.' },
  { clave: 'sectores', nombre: 'Sectores', descripcion: 'Los tipos de empresa que atendemos.' },
  { clave: 'catalogo', nombre: 'Catálogo', descripcion: 'Títulos del catálogo y la nota que explica por qué no publicamos precios.' },
  { clave: 'cta', nombre: 'Llamado final', descripcion: 'La invitación a cotizar que cierra la página.' },
  { clave: 'contacto', nombre: 'Contacto', descripcion: 'WhatsApp, teléfono, correo, dirección y horario.' },
  { clave: 'redes', nombre: 'Redes sociales', descripcion: 'Si dejas una vacía, ese icono no se muestra en la web.' },
  { clave: 'footer', nombre: 'Pie de página', descripcion: 'El texto y la línea legal del final de la web.' },
]

export default function FormContenido({ campos }: { campos: CampoContenido[] }) {
  const [grupoActivo, setGrupoActivo] = useState('hero')
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null)
  const [modificado, setModificado] = useState(false)
  const [guardando, iniciarGuardado] = useTransition()

  const porGrupo = useMemo(() => {
    const mapa = new Map<string, CampoContenido[]>()
    for (const campo of campos) {
      const lista = mapa.get(campo.grupo) ?? []
      lista.push(campo)
      mapa.set(campo.grupo, lista)
    }
    return mapa
  }, [campos])

  // Solo mostramos los grupos que realmente existen en la base de datos
  const gruposVisibles = GRUPOS.filter((g) => (porGrupo.get(g.clave) ?? []).length > 0)
  const otros = Array.from(porGrupo.keys()).filter(
    (clave) => !GRUPOS.some((g) => g.clave === clave)
  )
  const listaGrupos = [
    ...gruposVisibles,
    ...otros.map((clave) => ({ clave, nombre: clave, descripcion: '' })),
  ]

  const grupoElegido =
    listaGrupos.find((g) => g.clave === grupoActivo) ?? listaGrupos[0] ?? null

  function manejarEnvio(formData: FormData) {
    iniciarGuardado(async () => {
      const r = await guardarContenidoSitio(formData)
      setResultado(r)
      if (r.ok) setModificado(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  if (campos.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">
        No hay contenido cargado todavía. Ejecuta la migración 023 en Supabase y recarga esta página.
      </div>
    )
  }

  return (
    <form action={manejarEnvio} onChange={() => setModificado(true)} className="space-y-5">
      {resultado ? (
        <div
          className={clsx(
            'flex items-start gap-2.5 rounded-2xl border p-4 text-sm',
            resultado.ok
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          )}
        >
          {resultado.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div>
            <p className="font-medium">{resultado.mensaje}</p>
            {resultado.ok ? (
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold underline"
              >
                Ver la web <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Secciones */}
        <aside className="lg:col-span-3">
          <div className="sticky top-6 space-y-1 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
            {listaGrupos.map((grupo) => {
              const activa = grupo.clave === grupoElegido?.clave
              return (
                <button
                  key={grupo.clave}
                  type="button"
                  onClick={() => setGrupoActivo(grupo.clave)}
                  className={clsx(
                    'flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition',
                    activa
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  {grupo.nombre}
                  <span
                    className={clsx(
                      'text-[11px] tabular-nums',
                      activa ? 'text-white/70' : 'text-gray-400'
                    )}
                  >
                    {(porGrupo.get(grupo.clave) ?? []).length}
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Campos */}
        <div className="lg:col-span-9">
          {listaGrupos.map((grupo) => {
            const camposGrupo = porGrupo.get(grupo.clave) ?? []
            const activa = grupo.clave === grupoElegido?.clave

            return (
              <div key={grupo.clave} className={activa ? 'block' : 'hidden'}>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800">{grupo.nombre}</h3>
                  {grupo.descripcion ? (
                    <p className="mt-1 text-sm text-gray-500">{grupo.descripcion}</p>
                  ) : null}

                  <div className="mt-6 space-y-6">
                    {camposGrupo.map((campo) => (
                      <CampoEditable key={campo.clave} campo={campo} />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Barra de guardado */}
      <div className="sticky bottom-0 -mx-8 border-t border-gray-100 bg-white/95 px-8 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {modificado
              ? 'Tienes cambios sin guardar.'
              : 'Los cambios se publican en la web al instante.'}
          </p>
          <button
            type="submit"
            disabled={guardando}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {guardando ? 'Guardando...' : 'Guardar y publicar'}
          </button>
        </div>
      </div>
    </form>
  )
}

function CampoEditable({ campo }: { campo: CampoContenido }) {
  const nombre = `campo__${campo.clave}`
  const claseBase =
    'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

  const filasLista = Math.min(14, Math.max(4, campo.valor.split('\n').length + 1))

  return (
    <div>
      <label htmlFor={nombre} className="mb-1.5 block text-sm font-medium text-gray-700">
        {campo.etiqueta}
      </label>

      {campo.ayuda ? (
        <p className="mb-2 flex items-start gap-1.5 text-xs leading-relaxed text-gray-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
          {campo.ayuda}
        </p>
      ) : null}

      {campo.tipo === 'texto_largo' ? (
        <textarea
          id={nombre}
          name={nombre}
          defaultValue={campo.valor}
          rows={Math.min(10, Math.max(3, Math.ceil(campo.valor.length / 90) + 1))}
          maxLength={8000}
          className={clsx(claseBase, 'leading-relaxed')}
        />
      ) : campo.tipo === 'lista' ? (
        <textarea
          id={nombre}
          name={nombre}
          defaultValue={campo.valor}
          rows={filasLista}
          maxLength={8000}
          spellCheck
          className={clsx(claseBase, 'font-mono text-[13px] leading-relaxed')}
        />
      ) : (
        <input
          id={nombre}
          name={nombre}
          type={campo.tipo === 'email' ? 'email' : campo.tipo === 'url' ? 'url' : 'text'}
          defaultValue={campo.valor}
          maxLength={800}
          className={claseBase}
          placeholder={campo.tipo === 'url' ? 'https://...' : undefined}
        />
      )}

      <p className="mt-1 font-mono text-[10px] text-gray-300">{campo.clave}</p>
    </div>
  )
}
