'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

interface ItemInput {
  producto_id: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
  costo_unitario: number
  iva_porcentaje: number
}

export async function crearCotizacion(formData: FormData): Promise<ResultadoAccion> {
  const cliente_id = String(formData.get('cliente_id') ?? '').trim()
  const fecha = String(formData.get('fecha') ?? '').trim()
  const fecha_validez = String(formData.get('fecha_validez') ?? '').trim()
  const forma_pago = String(formData.get('forma_pago') ?? 'Contado').trim()
  const observaciones = String(formData.get('observaciones') ?? '').trim()
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
      producto_id: item.producto_id || null,
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
  const utilidad_estimada = Math.round(subtotal - costo_total)
  const margen_pct = subtotal > 0 ? Math.round((utilidad_estimada / subtotal) * 10000) / 100 : 0

  let dias_credito = 0
  if (forma_pago.includes('15')) dias_credito = 15
  else if (forma_pago.includes('30')) dias_credito = 30
  else if (forma_pago.includes('45')) dias_credito = 45
  else if (forma_pago.includes('60')) dias_credito = 60

  try {
    const supabase = createServerSupabaseClient()

    const { data: cot, error: errorCot } = await supabase
      .from('cotizaciones')
      .insert({
        numero: '', // trigger genera COT-2026-001
        cliente_id: cliente_id || null,
        fecha: fecha || new Date().toISOString().slice(0, 10),
        fecha_validez: fecha_validez || null,
        subtotal: Math.round(subtotal),
        iva_total: Math.round(iva_total),
        total,
        costo_total: Math.round(costo_total),
        utilidad_estimada,
        margen_pct,
        estado: 'PENDIENTE',
        forma_pago,
        dias_credito,
        observaciones: observaciones || null,
      })
      .select('id, numero')
      .single()

    if (errorCot) return { ok: false, mensaje: errorCot.message }

    const itemsConId = itemsCalculados.map((item) => ({
      ...item,
      cotizacion_id: cot.id,
    }))

    const { error: errorItems } = await supabase.from('cotizacion_items').insert(itemsConId)
    if (errorItems) return { ok: false, mensaje: errorItems.message }

    revalidatePath('/ventas')
    revalidatePath('/')

    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
    return {
      ok: true,
      mensaje: `Cotizacion ${cot.numero} creada: ${fmt.format(total)} | Utilidad estimada: ${fmt.format(utilidad_estimada)} (${margen_pct}%)`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al crear.' }
  }
}
