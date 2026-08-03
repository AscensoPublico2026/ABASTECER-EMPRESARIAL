'use server'

import { createPublicSupabaseClient } from '@/lib/supabase/public'
import type { ItemCotizacion } from '@/types/sitio'

export interface ResultadoFormulario {
  ok: boolean
  mensaje: string
}

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function limpiar(valor: FormDataEntryValue | null, maximo: number): string {
  return String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximo)
}

function limpiarLargo(valor: FormDataEntryValue | null, maximo: number): string {
  return String(valor ?? '').trim().slice(0, maximo)
}

/**
 * Recibe los formularios del sitio web publico (contacto y solicitud de
 * cotizacion) y los guarda en sitio_solicitudes para que el equipo los
 * atienda desde el ERP en Sitio Web > Solicitudes.
 */
export async function enviarSolicitud(formData: FormData): Promise<ResultadoFormulario> {
  // Trampa para robots: es un campo invisible, una persona nunca lo llena
  if (limpiar(formData.get('confirmacion_humana'), 50) !== '') {
    return { ok: true, mensaje: 'Mensaje recibido.' }
  }

  const nombre = limpiar(formData.get('nombre'), 120)
  const empresa = limpiar(formData.get('empresa'), 200)
  const nit = limpiar(formData.get('nit'), 40)
  const email = limpiar(formData.get('email'), 160).toLowerCase()
  const telefono = limpiar(formData.get('telefono'), 40)
  const ciudad = limpiar(formData.get('ciudad'), 120)
  const mensaje = limpiarLargo(formData.get('mensaje'), 4000)
  const tipo = formData.get('tipo') === 'COTIZACION' ? 'COTIZACION' : 'CONTACTO'
  const origen = limpiar(formData.get('origen'), 120) || 'sitio-web'

  if (nombre.length < 2) {
    return { ok: false, mensaje: 'Escribe tu nombre para poder responderte.' }
  }
  if (!telefono && !email) {
    return { ok: false, mensaje: 'Déjanos un teléfono o un correo para contactarte.' }
  }
  if (email && !CORREO_VALIDO.test(email)) {
    return { ok: false, mensaje: 'El correo no parece válido. Revísalo, por favor.' }
  }
  if (telefono && telefono.replace(/\D/g, '').length < 7) {
    return { ok: false, mensaje: 'El teléfono parece incompleto. Revísalo, por favor.' }
  }

  // Productos que el cliente agrego a su lista
  let items: Pick<ItemCotizacion, 'nombre' | 'codigo' | 'cantidad' | 'unidad_medida'>[] = []
  const itemsCrudos = formData.get('items')
  if (itemsCrudos) {
    try {
      const parseados = JSON.parse(String(itemsCrudos))
      if (Array.isArray(parseados)) {
        items = parseados
          .filter((i) => i && typeof i.nombre === 'string')
          .slice(0, 100)
          .map((i) => ({
            nombre: String(i.nombre).slice(0, 200),
            codigo: String(i.codigo ?? '').slice(0, 40),
            cantidad: Math.max(1, Math.min(9999, Number(i.cantidad) || 1)),
            unidad_medida: String(i.unidad_medida ?? 'Unidad').slice(0, 40),
          }))
      }
    } catch {
      items = []
    }
  }

  if (tipo === 'CONTACTO' && mensaje.length < 5 && items.length === 0) {
    return { ok: false, mensaje: 'Cuéntanos brevemente qué necesitas.' }
  }

  try {
    const supabase = createPublicSupabaseClient()
    const { error } = await supabase.from('sitio_solicitudes').insert({
      tipo,
      nombre,
      empresa: empresa || null,
      nit: nit || null,
      email: email || null,
      telefono: telefono || null,
      ciudad: ciudad || null,
      mensaje: mensaje || null,
      items,
      origen,
    })

    if (error) {
      return {
        ok: false,
        mensaje:
          'No pudimos registrar tu solicitud en este momento. Escríbenos por WhatsApp y te atendemos de una.',
      }
    }

    return {
      ok: true,
      mensaje:
        tipo === 'COTIZACION'
          ? '¡Listo! Recibimos tu solicitud. Te enviamos la cotización en menos de 24 horas hábiles.'
          : '¡Gracias por escribirnos! Te respondemos muy pronto.',
    }
  } catch {
    return {
      ok: false,
      mensaje:
        'Tuvimos un problema al enviar el formulario. Escríbenos por WhatsApp y te atendemos de inmediato.',
    }
  }
}
