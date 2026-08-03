'use client'

import { useState, useTransition } from 'react'
import clsx from 'clsx'
import { AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react'
import { enviarSolicitud, type ResultadoFormulario } from '@/app/(sitio)/actions'
import { armarMensajeLista, useCotizacion } from './CotizacionProvider'
import { IconoWhatsapp } from './IconosRedes'

interface Props {
  tipo: 'CONTACTO' | 'COTIZACION'
  origen: string
  urlWhatsapp: string
  /** Si es true, adjunta la lista de productos que armo el visitante */
  incluirLista?: boolean
  titulo?: string
  descripcion?: string
  className?: string
}

const claseCampo =
  'h-12 w-full rounded-xl border border-marca-100 bg-white px-4 text-[15px] text-marca-900 outline-none transition placeholder:text-acero-400 focus:border-verde-400 focus:ring-4 focus:ring-verde-100'

export default function FormularioSolicitud({
  tipo,
  origen,
  urlWhatsapp,
  incluirLista = false,
  titulo,
  descripcion,
  className,
}: Props) {
  const { items, limpiar } = useCotizacion()
  const [resultado, setResultado] = useState<ResultadoFormulario | null>(null)
  const [enviando, iniciarEnvio] = useTransition()

  function manejarEnvio(formData: FormData) {
    if (incluirLista && items.length > 0) {
      formData.set('items', JSON.stringify(items))
      const listaTexto = armarMensajeLista(items)
      const mensajeEscrito = String(formData.get('mensaje') ?? '').trim()
      formData.set('mensaje', mensajeEscrito ? `${mensajeEscrito}\n\n${listaTexto}` : listaTexto)
    }

    iniciarEnvio(async () => {
      const r = await enviarSolicitud(formData)
      setResultado(r)
      if (r.ok && incluirLista) limpiar()
    })
  }

  if (resultado?.ok) {
    return (
      <div
        className={clsx(
          'rounded-2xl border border-verde-200 bg-verde-50 p-8 text-center',
          className
        )}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-verde-600">
          <CheckCircle2 className="h-7 w-7 text-white" />
        </div>
        <h3 className="font-marca text-xl font-bold text-marca-900">Solicitud enviada</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-acero-600">
          {resultado.mensaje}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href={urlWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-verde-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-verde-700"
          >
            <IconoWhatsapp className="h-4 w-4" />
            ¿Es urgente? Escríbenos
          </a>
          <button
            type="button"
            onClick={() => setResultado(null)}
            className="rounded-xl border border-marca-200 px-5 py-3 text-sm font-semibold text-marca-900 transition hover:bg-white"
          >
            Enviar otra solicitud
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('rounded-2xl border border-marca-100 bg-white p-6 shadow-tarjeta sm:p-8', className)}>
      {titulo ? (
        <h3 className="font-marca text-xl font-bold text-marca-900">{titulo}</h3>
      ) : null}
      {descripcion ? (
        <p className="mt-2 text-sm leading-relaxed text-acero-500">{descripcion}</p>
      ) : null}

      <form action={manejarEnvio} className={clsx('space-y-4', (titulo || descripcion) && 'mt-6')}>
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="origen" value={origen} />

        {/* Trampa antirrobots: invisible para las personas */}
        <div className="absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
          <label htmlFor="confirmacion_humana">No llenar</label>
          <input id="confirmacion_humana" type="text" name="confirmacion_humana" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nombre" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-acero-500">
              Nombre y apellido *
            </label>
            <input id="nombre" name="nombre" type="text" required maxLength={120} className={claseCampo} placeholder="Juan Pérez" />
          </div>
          <div>
            <label htmlFor="empresa" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-acero-500">
              Empresa
            </label>
            <input id="empresa" name="empresa" type="text" maxLength={200} className={claseCampo} placeholder="Nombre de tu empresa" />
          </div>
          <div>
            <label htmlFor="telefono" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-acero-500">
              Teléfono / WhatsApp *
            </label>
            <input id="telefono" name="telefono" type="tel" required maxLength={40} className={claseCampo} placeholder="300 000 0000" />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-acero-500">
              Correo electrónico
            </label>
            <input id="email" name="email" type="email" maxLength={160} className={claseCampo} placeholder="compras@empresa.com" />
          </div>
          <div>
            <label htmlFor="ciudad" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-acero-500">
              Ciudad
            </label>
            <input id="ciudad" name="ciudad" type="text" maxLength={120} className={claseCampo} placeholder="Cali" />
          </div>
          <div>
            <label htmlFor="nit" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-acero-500">
              NIT (opcional)
            </label>
            <input id="nit" name="nit" type="text" maxLength={40} className={claseCampo} placeholder="900123456-7" />
          </div>
        </div>

        <div>
          <label htmlFor="mensaje" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-acero-500">
            {incluirLista ? 'Observaciones (opcional)' : '¿Qué necesitas? *'}
          </label>
          <textarea
            id="mensaje"
            name="mensaje"
            rows={incluirLista ? 3 : 5}
            maxLength={4000}
            required={!incluirLista}
            className="w-full rounded-xl border border-marca-100 bg-white px-4 py-3 text-[15px] leading-relaxed text-marca-900 outline-none transition placeholder:text-acero-400 focus:border-verde-400 focus:ring-4 focus:ring-verde-100"
            placeholder={
              incluirLista
                ? 'Fecha en que lo necesitas, tallas, colores, dirección de entrega...'
                : 'Ejemplo: necesito 40 cascos blancos, 40 pares de guantes de vaqueta y overoles talla M para una obra en Cali.'
            }
          />
        </div>

        {incluirLista && items.length > 0 ? (
          <p className="rounded-xl bg-marca-50 px-4 py-3 text-xs text-acero-600">
            Se adjuntarán <strong className="text-marca-900">{items.length}</strong>{' '}
            {items.length === 1 ? 'producto' : 'productos'} de tu lista.
          </p>
        ) : null}

        {resultado && !resultado.ok ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {resultado.mensaje}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center gap-2 rounded-xl bg-marca-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-marca-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {enviando ? 'Enviando...' : tipo === 'COTIZACION' ? 'Enviar solicitud de cotización' : 'Enviar mensaje'}
          </button>

          <a
            href={urlWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-verde-200 bg-verde-50 px-5 py-3.5 text-sm font-bold text-verde-700 transition hover:bg-verde-100"
          >
            <IconoWhatsapp className="h-4 w-4" />
            Prefiero WhatsApp
          </a>
        </div>

        <p className="text-[11px] leading-relaxed text-acero-400">
          Al enviar este formulario autorizas a Abastecer Empresarial S.A.S. a contactarte para
          atender tu solicitud. No compartimos tus datos con terceros.
        </p>
      </form>
    </div>
  )
}
