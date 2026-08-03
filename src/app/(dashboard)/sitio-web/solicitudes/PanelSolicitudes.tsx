'use client'

import { useMemo, useState, useTransition } from 'react'
import clsx from 'clsx'
import {
  Inbox, Mail, Phone, Building2, MapPin, Trash2, Loader2, CheckCircle2, AlertCircle,
  ClipboardList, Save,
} from 'lucide-react'
import { actualizarSolicitud, eliminarSolicitud, type ResultadoAccion } from '../actions'
import { IconoWhatsapp } from '@/components/sitio/IconosRedes'
import { ESTADOS_SOLICITUD, type SolicitudSitio } from '@/types/sitio'

function fechaLegible(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function whatsappDe(telefono: string | null, nombre: string): string {
  const digitos = (telefono ?? '').replace(/\D/g, '')
  if (digitos.length < 7) return ''
  const numero = digitos.length === 10 ? `57${digitos}` : digitos
  const saludo = `Hola ${nombre.split(' ')[0]}, le escribimos de Abastecer Empresarial por su solicitud en nuestra página web.`
  return `https://wa.me/${numero}?text=${encodeURIComponent(saludo)}`
}

export default function PanelSolicitudes({ solicitudes }: { solicitudes: SolicitudSitio[] }) {
  const [filtro, setFiltro] = useState<string>('TODAS')
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null)
  const [ocupado, iniciar] = useTransition()

  const visibles = useMemo(
    () => (filtro === 'TODAS' ? solicitudes : solicitudes.filter((s) => s.estado === filtro)),
    [solicitudes, filtro]
  )

  const conteos = useMemo(() => {
    const mapa: Record<string, number> = { TODAS: solicitudes.length }
    for (const estado of ESTADOS_SOLICITUD) {
      mapa[estado.valor] = solicitudes.filter((s) => s.estado === estado.valor).length
    }
    return mapa
  }, [solicitudes])

  function ejecutar(accion: () => Promise<ResultadoAccion>) {
    iniciar(async () => {
      const r = await accion()
      setResultado(r)
      window.setTimeout(() => setResultado(null), 4000)
    })
  }

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

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        {[{ valor: 'TODAS', etiqueta: 'Todas' }, ...ESTADOS_SOLICITUD].map((estado) => (
          <button
            key={estado.valor}
            type="button"
            onClick={() => setFiltro(estado.valor)}
            className={clsx(
              'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
              filtro === estado.valor
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            )}
          >
            {estado.etiqueta}
            <span className={clsx('ml-1.5', filtro === estado.valor ? 'text-white/60' : 'text-gray-400')}>
              {conteos[estado.valor] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
            <Inbox className="h-7 w-7 text-gray-300" />
          </div>
          <h3 className="font-semibold text-gray-800">Sin solicitudes por aquí</h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-gray-500">
            Cuando un cliente llene el formulario de la página web o envíe su lista de cotización,
            aparecerá en esta bandeja.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibles.map((solicitud) => {
            const estado = ESTADOS_SOLICITUD.find((e) => e.valor === solicitud.estado)
            const enlaceWhatsapp = whatsappDe(solicitud.telefono, solicitud.nombre)

            return (
              <article
                key={solicitud.id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-50 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-800">{solicitud.nombre}</h3>
                      <span
                        className={clsx(
                          'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                          estado?.color
                        )}
                      >
                        {estado?.etiqueta}
                      </span>
                      <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                        {solicitud.tipo === 'COTIZACION' ? 'Cotización' : 'Contacto'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {fechaLegible(solicitud.created_at)}
                      {solicitud.origen ? ` · desde ${solicitud.origen}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {enlaceWhatsapp ? (
                      <a
                        href={enlaceWhatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100"
                      >
                        <IconoWhatsapp className="h-3.5 w-3.5" />
                        Responder
                      </a>
                    ) : null}
                    {solicitud.email ? (
                      <a
                        href={`mailto:${solicitud.email}?subject=${encodeURIComponent(
                          'Cotización Abastecer Empresarial'
                        )}`}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                        title="Responder por correo"
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        const fd = new FormData()
                        fd.set('id', solicitud.id)
                        ejecutar(() => eliminarSolicitud(fd))
                      }}
                      disabled={ocupado}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-300 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title="Eliminar solicitud"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-5 px-5 py-5 lg:grid-cols-2">
                  {/* Datos y mensaje */}
                  <div className="space-y-4">
                    <ul className="space-y-1.5 text-sm text-gray-600">
                      {solicitud.empresa ? (
                        <li className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-gray-400" />
                          {solicitud.empresa}
                          {solicitud.nit ? (
                            <span className="text-xs text-gray-400">· NIT {solicitud.nit}</span>
                          ) : null}
                        </li>
                      ) : null}
                      {solicitud.telefono ? (
                        <li className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          {solicitud.telefono}
                        </li>
                      ) : null}
                      {solicitud.email ? (
                        <li className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          <span className="break-all">{solicitud.email}</span>
                        </li>
                      ) : null}
                      {solicitud.ciudad ? (
                        <li className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {solicitud.ciudad}
                        </li>
                      ) : null}
                    </ul>

                    {solicitud.mensaje ? (
                      <div className="rounded-xl bg-gray-50 px-4 py-3">
                        <p className="whitespace-pre-line text-[13px] leading-relaxed text-gray-700">
                          {solicitud.mensaje}
                        </p>
                      </div>
                    ) : null}

                    {solicitud.items.length > 0 ? (
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          <ClipboardList className="h-3.5 w-3.5" />
                          Lista de productos ({solicitud.items.length})
                        </p>
                        <ul className="divide-y divide-gray-50 overflow-hidden rounded-xl border border-gray-100">
                          {solicitud.items.map((item, i) => (
                            <li
                              key={`${item.codigo ?? item.nombre}-${i}`}
                              className="flex items-center justify-between gap-3 px-3.5 py-2 text-[13px]"
                            >
                              <span className="min-w-0 flex-1 truncate text-gray-700">
                                {item.nombre}
                                {item.codigo ? (
                                  <span className="ml-1.5 font-mono text-[11px] text-gray-400">
                                    {item.codigo}
                                  </span>
                                ) : null}
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums text-gray-800">
                                {item.cantidad ?? 1} {item.unidad_medida ?? ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>

                  {/* Gestion */}
                  <form
                    action={(formData) => ejecutar(() => actualizarSolicitud(formData))}
                    className="texto-normal space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4"
                  >
                    <input type="hidden" name="id" value={solicitud.id} />

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Estado
                      </label>
                      <select
                        name="estado"
                        defaultValue={solicitud.estado}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        {ESTADOS_SOLICITUD.map((e) => (
                          <option key={e.valor} value={e.valor}>
                            {e.etiqueta}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Notas internas
                      </label>
                      <textarea
                        name="notas_internas"
                        rows={4}
                        defaultValue={solicitud.notas_internas ?? ''}
                        maxLength={2000}
                        placeholder="Qué se cotizó, con qué proveedor, en qué quedó..."
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                      <p className="mt-1 text-[11px] text-gray-400">
                        Solo las ve el equipo. El cliente nunca las lee.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={ocupado}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {ocupado ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Guardar seguimiento
                    </button>
                  </form>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
