import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { documentoCotizacion } from '@/lib/pdf/cotizacionPdf'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: cot } = await supabase
      .from('cotizaciones')
      .select('*, cotizacion_items(*), clientes(razon_social, nit, contacto_nombre, contacto_email, contacto_telefono, direccion_entrega, ciudad)')
      .eq('id', params.id)
      .single()

    if (!cot) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

    const cliente = cot.clientes as Record<string, string | null> | null
    const items = (cot.cotizacion_items ?? []) as Record<string, unknown>[]

    const doc = documentoCotizacion({
      numero: String(cot.numero),
      fecha: String(cot.fecha),
      fecha_validez: cot.fecha_validez,
      forma_pago: cot.forma_pago,
      observaciones: cot.observaciones,
      subtotal: Number(cot.subtotal),
      iva_total: Number(cot.iva_total),
      total: Number(cot.total),
      cliente,
      items: items.map((item) => ({
        descripcion: String(item.descripcion ?? ''),
        cantidad: Number(item.cantidad),
        precio_unitario: Number(item.precio_unitario),
        iva_porcentaje: Number(item.iva_porcentaje),
        subtotal: Number(item.subtotal),
      })),
    })

    const buffer = await renderToBuffer(doc)

    const clienteNombre = (cliente?.razon_social ?? 'SinCliente').replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `${cot.numero}_${clienteNombre}.pdf`

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
