import type { Contenido } from '@/types/sitio'
import { texto, textoOpcional } from './contenido'

/**
 * URL publica del sitio. Se usa para SEO (canonical, sitemap, OpenGraph).
 * En Vercel se puede sobreescribir con la variable NEXT_PUBLIC_SITIO_URL.
 */
export const SITIO_URL = (
  process.env.NEXT_PUBLIC_SITIO_URL ?? 'https://abastecerempresarial.com'
).replace(/\/$/, '')

/** Menu principal del sitio publico */
export const MENU_SITIO = [
  { nombre: 'Inicio', href: '/' },
  { nombre: 'Soluciones', href: '/soluciones' },
  { nombre: 'Catálogo', href: '/catalogo' },
  { nombre: 'Sectores', href: '/sectores' },
  { nombre: 'Nosotros', href: '/nosotros' },
  { nombre: 'Contacto', href: '/contacto' },
] as const

/** Numero de WhatsApp en formato internacional, solo digitos */
export function numeroWhatsapp(contenido: Contenido): string {
  const crudo = texto(contenido, 'contacto_whatsapp')
  const digitos = crudo.replace(/\D/g, '')
  if (!digitos) return ''
  // Si escribieron el celular sin indicativo (10 digitos), le ponemos el 57 de Colombia
  return digitos.length === 10 ? `57${digitos}` : digitos
}

/** Enlace wa.me listo para usar, con mensaje precargado */
export function urlWhatsapp(contenido: Contenido, mensaje?: string): string {
  const numero = numeroWhatsapp(contenido)
  const texto_mensaje = mensaje?.trim() || texto(contenido, 'contacto_whatsapp_mensaje')
  if (!numero) return '/contacto'
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto_mensaje)}`
}

/** Enlace mailto listo para usar */
export function urlCorreo(contenido: Contenido, asunto?: string, cuerpo?: string): string {
  const correo = texto(contenido, 'contacto_email')
  const params: string[] = []
  if (asunto) params.push(`subject=${encodeURIComponent(asunto)}`)
  if (cuerpo) params.push(`body=${encodeURIComponent(cuerpo)}`)
  return `mailto:${correo}${params.length ? `?${params.join('&')}` : ''}`
}

/** Enlace tel: con el numero limpio */
export function urlTelefono(contenido: Contenido): string {
  const digitos = texto(contenido, 'contacto_telefono').replace(/\D/g, '')
  return `tel:+${digitos.length === 10 ? `57${digitos}` : digitos}`
}

/** Redes sociales configuradas (solo las que tengan URL) */
export function redesSociales(contenido: Contenido) {
  return [
    { clave: 'instagram', nombre: 'Instagram', url: textoOpcional(contenido, 'red_instagram') },
    { clave: 'facebook', nombre: 'Facebook', url: textoOpcional(contenido, 'red_facebook') },
    { clave: 'linkedin', nombre: 'LinkedIn', url: textoOpcional(contenido, 'red_linkedin') },
    { clave: 'tiktok', nombre: 'TikTok', url: textoOpcional(contenido, 'red_tiktok') },
  ].filter((r) => r.url !== '')
}
