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
  iva_porcentaje: number
}

export async function registrarFacturaCompra(formData: FormData): Promise<ResultadoAccion> {
  const proveedor_id = String(formData.get('proveedor_id') ?? '').trim()
  const orden_compra_id = String(formData.get('orden_compra_id') ?? '').trim() || null
  const numero_factura = String(formData.get('numero_factura') ?? '').trim()
  const fecha_factura = String(formData.get('fecha_factura') ?? '').trim()
  const forma_pago = String(formData.get('forma_pago') ?? 'Contado').trim()
  const notas = String(formData.get('notas') ?? '').trim()
  const itemsJson = String(formData.get('items') ?? '[]')

  if (!proveedor_id) return { ok: false, mensaje: 'Selecciona un proveedor.' }
  if (!numero_factura) return { ok: false, mensaje: 'Ingresa el numero de factura.' }

  let items: ItemInput[]
  try {
    items = JSON.parse(itemsJson)
  } catch {
    return { ok: false, mensaje: 'Error en los items.' }
  }

  if (items.length === 0) return { ok: false, mensaje: 'Agrega al menos un item.' }

  let subtotal = 0
  let iva_total = 0

  const itemsCalculados = items.map((item) => {
    const sub = item.cantidad * item.precio_unitario
    const iva_valor = sub * (item.iva_porcentaje / 100)
    const total = sub + iva_valor
    subtotal += sub
    iva_total += iva_valor
    return {
      producto_id: item.producto_id || null,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      iva_porcentaje: item.iva_porcentaje,
      iva_valor: Math.round(iva_valor),
      subtotal: Math.round(sub),
      total: Math.round(total),
    }
  })

  const total = Math.round(subtotal + iva_total)

  let dias_credito = 0
  if (forma_pago.includes('15')) dias_credito = 15
  else if (forma_pago.includes('30')) dias_credito = 30
  else if (forma_pago.includes('45')) dias_credito = 45
  else if (forma_pago.includes('60')) dias_credito = 60

  let fecha_vencimiento: string | null = null
  if (dias_credito > 0 && fecha_factura) {
    const d = new Date(fecha_factura)
    d.setDate(d.getDate() + dias_credito)
    fecha_vencimiento = d.toISOString().slice(0, 10)
  }

  const estado = dias_credito > 0 ? 'REGISTRADA' : 'PAGADA'

  try {
    const supabase = createServerSupabaseClient()

    const { data: factura, error: errorFactura } = await supabase
      .from('facturas_compra')
      .insert({
        orden_compra_id: orden_compra_id || null,
        proveedor_id,
        numero_factura,
        fecha_factura: fecha_factura || new Date().toISOString().slice(0, 10),
        fecha_vencimiento,
        subtotal: Math.round(subtotal),
        iva_total: Math.round(iva_total),
        total,
        forma_pago,
        dias_credito,
        estado,
        notas: notas || null,
      })
      .select('id')
      .single()

    if (errorFactura) return { ok: false, mensaje: errorFactura.message }

    const itemsConId = itemsCalculados.map((item) => ({
      ...item,
      factura_compra_id: factura.id,
    }))

    const { error: errorItems } = await supabase.from('factura_compra_items').insert(itemsConId)
    if (errorItems) return { ok: false, mensaje: errorItems.message }

    // Note: costo_promedio update happens via database trigger automatically

    revalidatePath('/compras')
    revalidatePath('/inventario')
    revalidatePath('/financiero')

    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
    return {
      ok: true,
      mensaje: `Factura ${numero_factura} registrada: ${fmt.format(total)} | Estado: ${estado === 'PAGADA' ? 'Pagada (contado)' : `Por pagar a ${dias_credito} dias`}`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al registrar.' }
  }
}
