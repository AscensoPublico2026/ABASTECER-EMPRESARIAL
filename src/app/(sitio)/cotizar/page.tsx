import { redirect } from 'next/navigation'
import { obtenerContenidoSitio } from '@/lib/queries/sitio'
import { urlWhatsapp } from '@/lib/sitio/config'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cotizar por WhatsApp',
  description: 'Solicita tu cotización directamente por WhatsApp. Respondemos en menos de 24 horas hábiles.',
}

/**
 * /cotizar -> redirige directo a WhatsApp.
 *
 * POR QUE NO HAY FORMULARIO:
 * "Nadie llena formularios. Te lo digo yo como comprador."
 * — El dueño de Abastecer, 2026.
 *
 * El comprador empresarial quiere hablar con una persona, no con un
 * formulario. WhatsApp es inmediato, bidireccional, y el asesor puede
 * pedir aclaraciones al instante en vez de adivinar.
 */
export default async function PaginaCotizar() {
  const contenido = await obtenerContenidoSitio()
  const url = urlWhatsapp(contenido, 'Hola, necesito una cotización para mi empresa.')
  redirect(url)
}
