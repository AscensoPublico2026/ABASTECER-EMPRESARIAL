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
  iva_porcentaje: number
}

export async function registrarCompra(formData: FormData): Promise<ResultadoAccion> {
  const proveedor_id = String(formData.get('proveedor_id') ?? '').trim()
  const numero_factura = String(formData.get('numero_factura') ?? '').trim()
  const fecha = String(formData.get('fecha') ?? '').trim()
  const forma_pago = String(formData.get('forma_pago') ?? 'Contado').trim()
  const notas = String(formData.get('notas') ?? '').trim()
  const itemsJson = String(formData.get('items') ?? '[]')

  let items: ItemInput[]
  try {
    items = JSON.parse(itemsJson)
  } catch {
    return { ok: false, mensaje: 'Error en los items de la compra.' }
  }

  if (items.length === 0) return { ok: false, mensaje: 'Agrega al menos un item.' }

  // Calcular totales
  let subtotal = 0
  let iva_total = 0

  const itemsCalculados = items.map((item) => {
    const sub = item.cantidad * item.precio_unitario
    const iva = sub * (item.iva_porcentaje / 100)
    subtotal += sub
    iva_total += iva
    return {
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      iva_porcentaje: item.iva_porcentaje,
      iva_valor: Math.round(iva),
      subtotal: Math.round(sub),
      total: Math.round(sub + iva),
    }
  })

  const total = Math.round(subtotal + iva_total)

  // Calcular fecha vencimiento si es credito
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

  const estado = dias_credito > 0 ? 'POR_PAGAR' : 'PAGADA'

  try {
    const supabase = createServerSupabaseClient()

    // Insertar encabezado
    const { data: compra, error: errorCompra } = await supabase
      .from('compras')
      .insert({
        proveedor_id: proveedor_id || null,
        numero_factura: numero_factura || null,
        fecha: fecha || new Date().toISOString().slice(0, 10),
        subtotal: Math.round(subtotal),
        iva_total: Math.round(iva_total),
        retencion_total: 0,
        total,
        forma_pago,
        dias_credito,
        fecha_vencimiento,
        estado,
        notas: notas || null,
      })
      .select('id')
      .single()

    if (errorCompra) return { ok: false, mensaje: errorCompra.message }

    // Insertar items
    const itemsConCompraId = itemsCalculados.map((item) => ({
      ...item,
      compra_id: compra.id,
    }))

    const { error: errorItems } = await supabase
      .from('compra_items')
      .insert(itemsConCompraId)

    if (errorItems) return { ok: false, mensaje: errorItems.message }

    revalidatePath('/compras')
    revalidatePath('/')
    revalidatePath('/financiero')
    return { ok: true, mensaje: `Compra registrada: ${formatCOP(total)}` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al registrar.' }
  }
}

function formatCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
}
