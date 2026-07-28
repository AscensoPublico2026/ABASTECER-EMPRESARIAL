import { createServerSupabaseClient } from '@/lib/supabase/server'
import type {
  DatosSocios,
  MovimientoConSocio,
  ResumenSocio,
  TotalesCapital,
} from '@/types/socios'

const TOTALES_VACIOS: TotalesCapital = {
  capitalSocial: 0,
  prestamosPendientes: 0,
  dividendosPagados: 0,
  remuneracionesPagadas: 0,
  reembolsosPagados: 0,
  totalAportadoPorSocios: 0,
  numeroSocios: 0,
}

/** Verifica si las variables de entorno de Supabase estan configuradas de verdad */
export function supabaseConfigurado(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(url && key && url.startsWith('https://') && key.length > 20)
}

/**
 * Carga los datos del modulo Socios y Capital.
 * Nunca lanza: si algo falla devuelve el detalle en `error` para que la UI
 * pueda mostrar instrucciones en lugar de romperse.
 */
export async function obtenerDatosSocios(): Promise<DatosSocios> {
  if (!supabaseConfigurado()) {
    return {
      configurado: false,
      error: null,
      socios: [],
      movimientos: [],
      totales: TOTALES_VACIOS,
    }
  }

  try {
    const supabase = createServerSupabaseClient()

    const [resumenRes, movimientosRes] = await Promise.all([
      supabase
        .from('resumen_socios')
        .select('*')
        .order('nombre', { ascending: true }),
      supabase
        .from('movimientos_socio')
        .select('*, socios(nombre)')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    if (resumenRes.error) {
      return {
        configurado: true,
        error: resumenRes.error.message,
        socios: [],
        movimientos: [],
        totales: TOTALES_VACIOS,
      }
    }

    const socios = (resumenRes.data ?? []).map(normalizarResumen)

    const movimientos: MovimientoConSocio[] = movimientosRes.error
      ? []
      : (movimientosRes.data ?? []).map((m) => {
          const relacion = m.socios as { nombre?: string } | null
          return {
            id: m.id,
            socio_id: m.socio_id,
            tipo: m.tipo,
            monto: Number(m.monto ?? 0),
            fecha: m.fecha,
            descripcion: m.descripcion,
            soporte_url: m.soporte_url,
            created_at: m.created_at,
            socio_nombre: relacion?.nombre ?? 'Socio',
          }
        })

    return {
      configurado: true,
      error: null,
      socios,
      movimientos,
      totales: calcularTotales(socios),
    }
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : 'Error desconocido'
    return {
      configurado: true,
      error: mensaje,
      socios: [],
      movimientos: [],
      totales: TOTALES_VACIOS,
    }
  }
}

/** Convierte los numeric de Postgres (que llegan como string) a number */
function normalizarResumen(row: Record<string, unknown>): ResumenSocio {
  return {
    id: String(row.id),
    nombre: String(row.nombre ?? ''),
    cargo: (row.cargo as string | null) ?? null,
    participacion_pct: Number(row.participacion_pct ?? 0),
    activo: Boolean(row.activo),
    capital_aportado: Number(row.capital_aportado ?? 0),
    prestamos_otorgados: Number(row.prestamos_otorgados ?? 0),
    prestamos_devueltos: Number(row.prestamos_devueltos ?? 0),
    prestamo_pendiente: Number(row.prestamo_pendiente ?? 0),
    dividendos_recibidos: Number(row.dividendos_recibidos ?? 0),
    remuneracion_total: Number(row.remuneracion_total ?? 0),
    reembolsos_total: Number(row.reembolsos_total ?? 0),
  }
}

/**
 * Consolida los totales de la empresa a partir del resumen por socio.
 *
 * Importante (Seccion 4 de la guia financiera):
 * el capital social NO es el patrimonio. Aqui solo sumamos capital aportado
 * y saldos con socios; el patrimonio real requiere activos y pasivos completos
 * (se calculara en el Centro de Control Financiero).
 */
export function calcularTotales(socios: ResumenSocio[]): TotalesCapital {
  return socios.reduce<TotalesCapital>(
    (acc, s) => ({
      capitalSocial: acc.capitalSocial + s.capital_aportado,
      prestamosPendientes: acc.prestamosPendientes + s.prestamo_pendiente,
      dividendosPagados: acc.dividendosPagados + s.dividendos_recibidos,
      remuneracionesPagadas: acc.remuneracionesPagadas + s.remuneracion_total,
      reembolsosPagados: acc.reembolsosPagados + s.reembolsos_total,
      totalAportadoPorSocios:
        acc.totalAportadoPorSocios + s.capital_aportado + s.prestamo_pendiente,
      numeroSocios: acc.numeroSocios + (s.activo ? 1 : 0),
    }),
    { ...TOTALES_VACIOS }
  )
}

/** Lista simple de socios activos para poblar selects */
export async function obtenerSociosActivos(): Promise<
  { id: string; nombre: string }[]
> {
  if (!supabaseConfigurado()) return []
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('socios')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true })
    if (error) return []
    return (data ?? []).map((s) => ({ id: String(s.id), nombre: String(s.nombre) }))
  } catch {
    return []
  }
}
