/**
 * ACCESO A LA PLATAFORMA (ERP)
 * =================================================================
 * Pedido del dueno (06/nov/2026): un solo usuario puede entrar.
 * No hay registro de cuentas nuevas. Cualquier otra cuenta que inicie
 * sesion se cierra de inmediato y vuelve al login con un aviso.
 * La contrasena NO va en el codigo: vive solo en Supabase Auth.
 * =================================================================
 */
export const CORREOS_AUTORIZADOS = ['abastecerempresarial@gmail.com'] as const

export function esCorreoAutorizado(correo?: string | null): boolean {
  const c = (correo ?? '').trim().toLowerCase()
  return (CORREOS_AUTORIZADOS as readonly string[]).includes(c)
}
