/**
 * MODO DE DESPLIEGUE
 * =================================================================
 * Un mismo codigo, dos despliegues independientes en Vercel:
 *
 *   1) SITIO WEB  -> abastecerempresarial.com
 *      Variable:  NEXT_PUBLIC_MODO_APP = sitio
 *      Solo sirve las paginas publicas. El ERP queda apagado: si
 *      alguien escribe /ventas o /clientes se le manda al inicio.
 *      NUNCA pide login, NUNCA consulta la sesion de Supabase.
 *
 *   2) ERP -> el dominio interno de Vercel (o erp.abastecerempresarial.com)
 *      Variable:  NEXT_PUBLIC_MODO_APP = erp  (o sin definir)
 *      Funciona como hasta hoy: todo protegido con login.
 *
 * Asi el sitio web queda SEPARADO del ERP para publicarlo, pero sin
 * duplicar codigo: cualquier cambio que hagamos se refleja en los dos
 * despliegues automaticamente. Cuando quieras unirlos de nuevo, basta
 * con quitar la variable.
 * =================================================================
 */

/** true cuando este despliegue es UNICAMENTE el sitio web publico */
export const MODO_SITIO = process.env.NEXT_PUBLIC_MODO_APP === 'sitio'

/**
 * Direccion donde vive el ERP. Se usa en modo sitio para que el boton
 * "Ingresar" del sitio web lleve al login del ERP.
 */
export const URL_ERP = (
  process.env.NEXT_PUBLIC_URL_ERP ?? 'https://abastecer-empresarial-steel.vercel.app'
).replace(/\/$/, '')

/** Enlace del boton "Ingresar" segun el despliegue */
export const URL_LOGIN = MODO_SITIO ? `${URL_ERP}/login` : '/login'
