import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { FacturaVentaConCliente } from '@/types/facturasVenta'

export async function obtenerFacturasVenta(): Promise<{
  data: FacturaVentaConCliente[]
  error: string | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('facturas_venta')
      .select('*, clientes(razon_social), cotizaciones(numero)')
      .order('fecha', { ascending: false })
      .limit(100)

    if (error) return { data: [], error: error.message }

    const facturas: FacturaVentaConCliente[] = (data ?? []).map((fv) => {
      const cli = fv.clientes as { razon_social?: string } | null
      const cot = fv.cotizaciones as { numero?: string } | null
      return {
        id: fv.id,
        cotizacion_id: fv.cotizacion_id,
        cliente_id: fv.cliente_id,
        numero_factura_dian: fv.numero_factura_dian,
        fecha: fv.fecha,
        fecha_vencimiento: fv.fecha_vencimiento,
        subtotal: Number(fv.subtotal ?? 0),
        iva_total: Number(fv.iva_total ?? 0),
        retencion_total: Number(fv.retencion_total ?? 0),
        total: Number(fv.total ?? 0),
        costo_total: Number(fv.costo_total ?? 0),
        utilidad: Number(fv.utilidad ?? 0),
        margen_pct: Number(fv.margen_pct ?? 0),
        forma_pago: fv.forma_pago ?? 'Contado',
        dias_credito: Number(fv.dias_credito ?? 0),
        estado: fv.estado,
        oc_cliente: fv.oc_cliente,
        oc_cliente_url: fv.oc_cliente_url,
        notas: fv.notas,
        created_at: fv.created_at,
        cliente_nombre: cli?.razon_social ?? null,
        numero_cotizacion: cot?.numero ?? null,
        creado_por_nombre: fv.creado_por_nombre ?? null,
      }
    })

    return { data: facturas, error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
