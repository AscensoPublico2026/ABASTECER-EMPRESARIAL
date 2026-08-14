import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { CotizacionConCliente } from '@/types/cotizaciones'

export async function obtenerCotizaciones(): Promise<{
  data: CotizacionConCliente[]
  error: string | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('cotizaciones')
      .select('*, clientes(razon_social)')
      .order('fecha', { ascending: false })
      .limit(100)

    if (error) return { data: [], error: error.message }

    const cotizaciones: CotizacionConCliente[] = (data ?? []).map((c) => {
      const cli = c.clientes as { razon_social?: string } | null
      return {
        id: c.id,
        numero: c.numero,
        cliente_id: c.cliente_id,
        fecha: c.fecha,
        fecha_validez: c.fecha_validez,
        subtotal: Number(c.subtotal ?? 0),
        iva_total: Number(c.iva_total ?? 0),
        total: Number(c.total ?? 0),
        costo_total: Number(c.costo_total ?? 0),
        utilidad_estimada: Number(c.utilidad_estimada ?? 0),
        margen_pct: Number(c.margen_pct ?? 0),
        estado: c.estado,
        oc_cliente: c.oc_cliente,
        oc_cliente_url: c.oc_cliente_url,
        forma_pago: c.forma_pago ?? 'Contado',
        dias_credito: Number(c.dias_credito ?? 0),
        descuento_pct: Number(c.descuento_pct ?? 0),
        observaciones: c.observaciones,
        created_at: c.created_at,
        fecha_pago: c.fecha_pago ?? null,
        monto_recibido: Number(c.monto_recibido ?? 0),
        retencion_total: Number(c.retencion_total ?? 0),
        cliente_nombre: cli?.razon_social ?? null,
        num_items: 0,
        creado_por_nombre: c.creado_por_nombre ?? null,
      }
    })

    return { data: cotizaciones, error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
