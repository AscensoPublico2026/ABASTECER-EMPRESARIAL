import { createServerSupabaseClient } from '@/lib/supabase/server'
import { EMPRESA } from '@/lib/empresa'
import { NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 15 },
  empresaNombre: { fontSize: 13, fontWeight: 'bold', fontFamily: 'Helvetica-Bold' },
  empresaDetalle: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  cotTitulo: { fontSize: 18, fontWeight: 'bold', color: '#2563eb', fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  cotNumero: { fontSize: 14, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', textAlign: 'right', marginTop: 4 },
  cotFecha: { fontSize: 8, color: '#6b7280', textAlign: 'right', marginTop: 6 },
  seccion: { marginBottom: 15 },
  seccionTitulo: { fontSize: 8, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', marginBottom: 5 },
  clienteBox: { backgroundColor: '#f9fafb', padding: 10, borderRadius: 4 },
  clienteNombre: { fontSize: 10, fontWeight: 'bold', fontFamily: 'Helvetica-Bold' },
  clienteDetalle: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  tabla: { marginTop: 10 },
  tablaHeader: { flexDirection: 'row', backgroundColor: '#2563eb', padding: 6, borderRadius: 2 },
  tablaHeaderTexto: { color: 'white', fontSize: 8, fontWeight: 'bold', fontFamily: 'Helvetica-Bold' },
  tablaFila: { flexDirection: 'row', padding: 6, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  tablaFilaPar: { backgroundColor: '#f9fafb' },
  tablaTexto: { fontSize: 8 },
  totalesBox: { alignItems: 'flex-end', marginTop: 15 },
  totalFila: { flexDirection: 'row', width: 200, justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: 9, color: '#6b7280' },
  totalValor: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  totalGrande: { fontSize: 12, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', borderTopWidth: 1, borderTopColor: '#d1d5db', paddingTop: 5, marginTop: 3 },
  condiciones: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 },
  condTexto: { fontSize: 8, color: '#6b7280', marginBottom: 3 },
  firma: { marginTop: 40 },
  firmaLinea: { width: 180, borderBottomWidth: 1, borderBottomColor: '#9ca3af', marginBottom: 5 },
  firmaNombre: { fontSize: 8, fontWeight: 'bold', fontFamily: 'Helvetica-Bold' },
  firmaCargo: { fontSize: 7, color: '#6b7280' },
  pie: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 7, color: '#9ca3af' },
})

function formatCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
}

function formatFecha(f: string): string {
  if (!f) return '-'
  const [y, m, d] = f.slice(0, 10).split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: cot } = await supabase
      .from('cotizaciones')
      .select('*, cotizacion_items(*), clientes(razon_social, nit, contacto_nombre, contacto_email, contacto_telefono, direccion_entrega, ciudad)')
      .eq('id', params.id)
      .single()

    if (!cot) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

    const cliente = cot.clientes as Record<string, string> | null
    const items = (cot.cotizacion_items ?? []) as Record<string, unknown>[]

    const doc = React.createElement(Document, {},
      React.createElement(Page, { size: 'A4', style: s.page },
        // Header
        React.createElement(View, { style: s.header },
          React.createElement(View, {},
            React.createElement(Text, { style: s.empresaNombre }, EMPRESA.razon_social),
            React.createElement(Text, { style: s.empresaDetalle }, `NIT: ${EMPRESA.nit}`),
            React.createElement(Text, { style: s.empresaDetalle }, `${EMPRESA.direccion}, ${EMPRESA.ciudad}`),
            React.createElement(Text, { style: s.empresaDetalle }, `Tel: ${EMPRESA.telefono} | ${EMPRESA.email}`),
          ),
          React.createElement(View, {},
            React.createElement(Text, { style: s.cotTitulo }, 'COTIZACION'),
            React.createElement(Text, { style: s.cotNumero }, cot.numero),
            React.createElement(Text, { style: s.cotFecha }, `Fecha: ${formatFecha(cot.fecha)}`),
            cot.fecha_validez && React.createElement(Text, { style: s.cotFecha }, `Validez: ${formatFecha(cot.fecha_validez)}`),
          ),
        ),
        // Cliente
        React.createElement(View, { style: s.seccion },
          React.createElement(Text, { style: s.seccionTitulo }, 'Cliente'),
          React.createElement(View, { style: s.clienteBox },
            React.createElement(Text, { style: s.clienteNombre }, cliente?.razon_social ?? 'Sin cliente'),
            cliente?.nit && React.createElement(Text, { style: s.clienteDetalle }, `NIT: ${cliente.nit}`),
            cliente?.contacto_email && React.createElement(Text, { style: s.clienteDetalle }, `Email: ${cliente.contacto_email}`),
            cliente?.direccion_entrega && React.createElement(Text, { style: s.clienteDetalle }, `Dir: ${cliente.direccion_entrega}, ${cliente.ciudad ?? ''}`),
          ),
        ),
        // Tabla items
        React.createElement(View, { style: s.tabla },
          React.createElement(View, { style: s.tablaHeader },
            React.createElement(Text, { style: { ...s.tablaHeaderTexto, width: 20 } }, '#'),
            React.createElement(Text, { style: { ...s.tablaHeaderTexto, flex: 1 } }, 'Descripcion'),
            React.createElement(Text, { style: { ...s.tablaHeaderTexto, width: 40, textAlign: 'center' } }, 'Cant'),
            React.createElement(Text, { style: { ...s.tablaHeaderTexto, width: 80, textAlign: 'right' } }, 'P. Unit'),
            React.createElement(Text, { style: { ...s.tablaHeaderTexto, width: 40, textAlign: 'center' } }, 'IVA'),
            React.createElement(Text, { style: { ...s.tablaHeaderTexto, width: 80, textAlign: 'right' } }, 'Subtotal'),
          ),
          ...items.map((item, idx) =>
            React.createElement(View, { key: String(item.id), style: { ...s.tablaFila, ...(idx % 2 === 1 ? s.tablaFilaPar : {}) } },
              React.createElement(Text, { style: { ...s.tablaTexto, width: 20 } }, String(idx + 1)),
              React.createElement(Text, { style: { ...s.tablaTexto, flex: 1 } }, String(item.descripcion)),
              React.createElement(Text, { style: { ...s.tablaTexto, width: 40, textAlign: 'center' } }, String(item.cantidad)),
              React.createElement(Text, { style: { ...s.tablaTexto, width: 80, textAlign: 'right' } }, formatCOP(Number(item.precio_unitario))),
              React.createElement(Text, { style: { ...s.tablaTexto, width: 40, textAlign: 'center' } }, `${item.iva_porcentaje}%`),
              React.createElement(Text, { style: { ...s.tablaTexto, width: 80, textAlign: 'right' } }, formatCOP(Number(item.subtotal))),
            )
          ),
        ),
        // Totales
        React.createElement(View, { style: s.totalesBox },
          React.createElement(View, { style: s.totalFila },
            React.createElement(Text, { style: s.totalLabel }, 'Subtotal:'),
            React.createElement(Text, { style: s.totalValor }, formatCOP(Number(cot.subtotal))),
          ),
          React.createElement(View, { style: s.totalFila },
            React.createElement(Text, { style: s.totalLabel }, 'IVA:'),
            React.createElement(Text, { style: s.totalValor }, formatCOP(Number(cot.iva_total))),
          ),
          React.createElement(View, { style: { ...s.totalFila, ...s.totalGrande } },
            React.createElement(Text, { style: { fontSize: 12, fontFamily: 'Helvetica-Bold' } }, 'TOTAL:'),
            React.createElement(Text, { style: { fontSize: 12, fontFamily: 'Helvetica-Bold' } }, formatCOP(Number(cot.total))),
          ),
        ),
        // Condiciones
        React.createElement(View, { style: s.condiciones },
          React.createElement(Text, { style: s.condTexto }, `Forma de pago: ${cot.forma_pago}`),
          cot.fecha_validez && React.createElement(Text, { style: s.condTexto }, `Validez: Hasta ${formatFecha(cot.fecha_validez)}`),
          cot.observaciones && React.createElement(Text, { style: s.condTexto }, `Observaciones: ${cot.observaciones}`),
          React.createElement(Text, { style: s.condTexto }, `Datos para pago: ${EMPRESA.banco} | ${EMPRESA.tipo_cuenta} | No. ${EMPRESA.numero_cuenta} | A nombre de ${EMPRESA.razon_social} NIT ${EMPRESA.nit}`),
        ),
        // Pie
        React.createElement(Text, { style: s.pie },
          `${EMPRESA.slogan} | ${EMPRESA.direccion}, ${EMPRESA.ciudad} | Tel: ${EMPRESA.telefono} | ${EMPRESA.email}`
        ),
      )
    )

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
