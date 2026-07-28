'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

interface ItemInput {
  descripcion: string
  cantidad: number
  precio_unitario: number
  costo_unitario: number
  iva_porcentaje: number
}

export async function registrarVenta(formData: FormData): Promise<ResultadoAccion> {
  const cliente_id = String(formData.get('cliente_id') ?? '').trim()
  const numero_cotizacion = String(formData.get('numero_cotizacion') ?? '').trim()
  const fecha = String(formData.get('fecha') ?? '').trim()
  const forma_pago = String(formData.get('forma_pago') ?? 'Contado').trim()
  const estado = String(formData.get('estado') ?? 'COTIZACION').trim()
  const notas = String(formData.get('notas') ?? '').trim()
  const itemsJson = String(formData.get('items') ?? '[]')

  let items: ItemInput[]
  try {
    items = JSON.parse(itemsJson)
  } catch {
    return { ok: false, mensaje: 'Error en los items.' }
  }

  if (items.length === 0) return { ok: false, mensaje: 'Agrega al menos un item.' }

  let subtotal = 0
  let iva_total = 0
  let costo_total = 0

  const itemsCalculados = items.map((item) => {
    const sub = item.cantidad * item.precio_unitario
    const iva = sub * (item.iva_porcentaje / 100)
    const costo = item.cantidad * item.costo_unitario
    const utilidad = sub - costo
    subtotal += sub
    iva_total += iva
    costo_total += costo
    return {
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      costo_unitario: item.costo_unitario,
      iva_porcentaje: item.iva_porcentaje,
      iva_valor: Math.round(iva),
      subtotal: Math.round(sub),
      total: Math.round(sub + iva),
      utilidad: Math.round(utilidad),
    }
  })

  const total = Math.round(subtotal + iva_total)
  const utilidad_bruta = Math.round(subtotal - costo_total)
  const margen_pct = subtotal > 0 ? Math.round((utilidad_bruta / subtotal) * 10000) / 100 : 0

  let dias_credito = 0
  let fecha_vencimiento: string | null = null
  if (forma_pago.includes('15')) dias_credito = 15
  else if (forma_pago.includes('30')) dias_credito = 30
  else if (forma_pago.includes('45')) dias_credito = 45
  else if (forma_pago.includes('60')) dias_credito = 60

  if (dias_credito > 0 && fecha) {
    const fv = new Date(fecha)
    fv.setDate(fv.getDate() + dias_credito)
    fecha_vencimiento = fv.toISOString().slice(0, 10)
  }

  try {
    const supabase = createServerSupabaseClient()

    const { data: venta, error: errorVenta } = await supabase
      .from('ventas')
      .insert({
        cliente_id: cliente_id || null,
        numero_cotizacion: numero_cotizacion || null,
        fecha: fecha || new Date().toISOString().slice(0, 10),
        subtotal: Math.round(subtotal),
        iva_total: Math.round(iva_total),
        total,
        costo_total: Math.round(costo_total),
        utilidad_bruta,
        margen_pct,
        forma_pago,
        dias_credito,
        fecha_vencimiento,
        estado,
        notas: notas || null,
      })
      .select('id')
      .single()

    if (errorVenta) return { ok: false, mensaje: errorVenta.message }

    const itemsConVentaId = itemsCalculados.map((item) => ({
      ...item,
      venta_id: venta.id,
    }))

    const { error: errorItems } = await supabase.from('venta_items').insert(itemsConVentaId)
    if (errorItems) return { ok: false, mensaje: errorItems.message }

    revalidatePath('/ventas')
    revalidatePath('/')
    revalidatePath('/financiero')

    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
    return { ok: true, mensaje: `Venta registrada: ${fmt.format(total)} | Utilidad: ${fmt.format(utilidad_bruta)} (${margen_pct}%)` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al registrar.' }
  }
}
