import React from 'react'
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'

// Sin cortar palabras con guion ("DES-CUENTO"): las palabras pasan completas a la siguiente linea.
Font.registerHyphenationCallback((palabra) => [palabra])
import { EMPRESA } from '@/lib/empresa'

// ============================================================
// PDF de la cotizacion — diseno compacto y simetrico
// ------------------------------------------------------------
// Pensado para que una cotizacion normal (hasta ~25 items) quepa en
// UNA sola hoja A4 (igual que antes): encabezado en dos columnas iguales,
// cliente y condiciones lado a lado, tabla densa y, al final,
// observaciones a la izquierda y totales a la derecha.
// Si hay muchos items la tabla se compacta sola; si aun asi no cabe,
// pasa a una segunda hoja repitiendo el encabezado de la tabla.
// ============================================================

export interface ItemPdf {
  descripcion: string
  cantidad: number
  precio_unitario: number
  iva_porcentaje: number
  subtotal: number
}

export interface CotizacionPdf {
  numero: string
  fecha: string
  fecha_validez?: string | null
  forma_pago?: string | null
  observaciones?: string | null
  subtotal: number
  iva_total: number
  total: number
  cliente?: {
    razon_social?: string | null
    nit?: string | null
    contacto_nombre?: string | null
    contacto_email?: string | null
    contacto_telefono?: string | null
    direccion_entrega?: string | null
    ciudad?: string | null
  } | null
  items: ItemPdf[]
}

const AZUL = '#1d4ed8'
const GRIS = '#6b7280'
const LINEA = '#e5e7eb'

function pesos(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n || 0))
}

export function fechaLarga(f?: string | null): string {
  if (!f) return '-'
  const [y, m, d] = f.slice(0, 10).split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)))
}

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 44, paddingHorizontal: 36, fontSize: 8, fontFamily: 'Helvetica', color: '#111827' },

  // Encabezado: dos columnas del mismo ancho
  header: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: AZUL },
  colIzq: { width: '50%' },
  colDer: { width: '50%', alignItems: 'flex-end' },
  empresa: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  dato: { fontSize: 7.5, color: GRIS, marginTop: 1.5 },
  titulo: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: AZUL, letterSpacing: 1 },
  numero: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 2 },

  // Cliente y condiciones: dos tarjetas iguales
  bloques: { flexDirection: 'row', marginTop: 10, gap: 10 },
  tarjeta: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 0.75, borderColor: LINEA, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 9 },
  etiqueta: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: GRIS, letterSpacing: 0.6, marginBottom: 3 },
  clienteNombre: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  filaDato: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 1.5 },
  datoLabel: { fontSize: 7.5, color: GRIS },
  datoValor: { fontSize: 7.5, fontFamily: 'Helvetica-Bold' },

  // Tabla
  tabla: { marginTop: 10, borderWidth: 0.75, borderColor: LINEA, borderRadius: 4 },
  thead: { flexDirection: 'row', backgroundColor: AZUL, paddingVertical: 5, paddingHorizontal: 6, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  th: { color: 'white', fontSize: 7, fontFamily: 'Helvetica-Bold' },
  fila: { flexDirection: 'row', paddingHorizontal: 6, borderTopWidth: 0.5, borderTopColor: LINEA },
  filaPar: { backgroundColor: '#f8fafc' },

  // Cierre: observaciones (izq) y totales (der)
  cierre: { flexDirection: 'row', marginTop: 10, gap: 10, alignItems: 'flex-start' },
  obs: { flex: 1, borderWidth: 0.75, borderColor: LINEA, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 9 },
  obsTexto: { fontSize: 7, color: '#374151', lineHeight: 1.35 },
  totales: { width: 190, borderWidth: 0.75, borderColor: LINEA, borderRadius: 4, overflow: 'hidden' },
  totFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 9 },
  totLabel: { fontSize: 8, color: GRIS },
  totValor: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  totGrande: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 9, backgroundColor: AZUL },
  totGrandeTexto: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: 'white' },

  pago: { marginTop: 8, fontSize: 7, color: GRIS, textAlign: 'center' },
  pie: { position: 'absolute', bottom: 20, left: 36, right: 36, textAlign: 'center', fontSize: 6.5, color: '#9ca3af', borderTopWidth: 0.5, borderTopColor: LINEA, paddingTop: 5 },
  pagina: { position: 'absolute', bottom: 20, right: 36, fontSize: 6.5, color: '#9ca3af' },
})

const h = React.createElement

export function documentoCotizacion(cot: CotizacionPdf) {
  const n = cot.items.length
  // Densidad de la tabla segun la cantidad de items (para caber en una hoja).
  const padFila = n > 26 ? 2 : n > 20 ? 2.6 : n > 14 ? 3.4 : 4.5
  const letra = n > 26 ? 6.6 : n > 20 ? 7 : 7.5

  const col = {
    n: { width: 18 },
    desc: { flex: 1, paddingRight: 6 },
    cant: { width: 34, textAlign: 'center' as const },
    unit: { width: 62, textAlign: 'right' as const },
    iva: { width: 30, textAlign: 'center' as const },
    sub: { width: 70, textAlign: 'right' as const },
  }
  const td = { fontSize: letra }
  const cli = cot.cliente ?? null

  return h(Document, { title: `${cot.numero} ${cli?.razon_social ?? ''}`.trim(), author: EMPRESA.razon_social },
    h(Page, { size: 'A4', style: s.page },
      // Encabezado
      h(View, { style: s.header },
        h(View, { style: s.colIzq },
          h(Text, { style: s.empresa }, EMPRESA.razon_social),
          h(Text, { style: s.dato }, `NIT ${EMPRESA.nit}`),
          h(Text, { style: s.dato }, `${EMPRESA.direccion}, ${EMPRESA.ciudad}`),
          h(Text, { style: s.dato }, `Tel. ${EMPRESA.telefono} · ${EMPRESA.email}`),
        ),
        h(View, { style: s.colDer },
          h(Text, { style: s.titulo }, 'COTIZACIÓN'),
          h(Text, { style: s.numero }, cot.numero),
        ),
      ),

      // Cliente | Condiciones
      h(View, { style: s.bloques },
        h(View, { style: s.tarjeta },
          h(Text, { style: s.etiqueta }, 'CLIENTE'),
          h(Text, { style: s.clienteNombre }, cli?.razon_social ?? 'Sin cliente'),
          cli?.nit ? h(Text, { style: s.dato }, `NIT ${cli.nit}`) : null,
          cli?.contacto_nombre ? h(Text, { style: s.dato }, `Contacto: ${cli.contacto_nombre}${cli.contacto_telefono ? ' · ' + cli.contacto_telefono : ''}`) : null,
          cli?.contacto_email ? h(Text, { style: s.dato }, cli.contacto_email) : null,
          cli?.direccion_entrega ? h(Text, { style: s.dato }, `${cli.direccion_entrega}${cli.ciudad ? ', ' + cli.ciudad : ''}`) : null,
        ),
        h(View, { style: s.tarjeta },
          h(Text, { style: s.etiqueta }, 'CONDICIONES'),
          h(View, { style: s.filaDato }, h(Text, { style: s.datoLabel }, 'Fecha'), h(Text, { style: s.datoValor }, fechaLarga(cot.fecha))),
          h(View, { style: s.filaDato }, h(Text, { style: s.datoLabel }, 'Válida hasta'), h(Text, { style: s.datoValor }, fechaLarga(cot.fecha_validez))),
          h(View, { style: s.filaDato }, h(Text, { style: s.datoLabel }, 'Forma de pago'), h(Text, { style: s.datoValor }, cot.forma_pago || 'Contado')),
          h(View, { style: s.filaDato }, h(Text, { style: s.datoLabel }, 'Items'), h(Text, { style: s.datoValor }, String(n))),
        ),
      ),

      // Tabla
      h(View, { style: s.tabla },
        h(View, { style: s.thead, fixed: true },
          h(Text, { style: { ...s.th, ...col.n } }, '#'),
          h(Text, { style: { ...s.th, ...col.desc } }, 'Descripción'),
          h(Text, { style: { ...s.th, ...col.cant } }, 'Cant.'),
          h(Text, { style: { ...s.th, ...col.unit } }, 'Vr. unitario'),
          h(Text, { style: { ...s.th, ...col.iva } }, 'IVA'),
          h(Text, { style: { ...s.th, ...col.sub } }, 'Subtotal'),
        ),
        ...cot.items.map((it, i) =>
          h(View, { key: String(i), wrap: false, style: { ...s.fila, ...(i % 2 === 1 ? s.filaPar : {}), paddingVertical: padFila } },
            h(Text, { style: { ...td, ...col.n, color: GRIS } }, String(i + 1)),
            h(Text, { style: { ...td, ...col.desc } }, it.descripcion),
            h(Text, { style: { ...td, ...col.cant } }, String(it.cantidad)),
            h(Text, { style: { ...td, ...col.unit } }, pesos(it.precio_unitario)),
            h(Text, { style: { ...td, ...col.iva } }, `${it.iva_porcentaje}%`),
            h(Text, { style: { ...td, ...col.sub, fontFamily: 'Helvetica-Bold' } }, pesos(it.subtotal)),
          )
        ),
      ),

      // Observaciones | Totales
      h(View, { style: s.cierre, wrap: false },
        h(View, { style: s.obs },
          h(Text, { style: s.etiqueta }, 'OBSERVACIONES'),
          h(Text, { style: s.obsTexto }, (cot.observaciones ?? '').replace(/\n{2,}/g, '\n').trim() || 'Sin observaciones.'),
        ),
        h(View, { style: s.totales },
          h(View, { style: s.totFila }, h(Text, { style: s.totLabel }, 'Subtotal'), h(Text, { style: s.totValor }, pesos(cot.subtotal))),
          h(View, { style: { ...s.totFila, borderTopWidth: 0.5, borderTopColor: LINEA } }, h(Text, { style: s.totLabel }, 'IVA'), h(Text, { style: s.totValor }, pesos(cot.iva_total))),
          h(View, { style: s.totGrande }, h(Text, { style: s.totGrandeTexto }, 'TOTAL'), h(Text, { style: s.totGrandeTexto }, pesos(cot.total))),
        ),
      ),

      h(Text, { style: s.pago, wrap: false },
        `Datos para pago: ${EMPRESA.banco} · ${EMPRESA.tipo_cuenta} No. ${EMPRESA.numero_cuenta} · A nombre de ${EMPRESA.razon_social} · NIT ${EMPRESA.nit}`
      ),

      // Pie
      h(Text, { style: s.pie, fixed: true }, `${EMPRESA.slogan} · ${EMPRESA.direccion}, ${EMPRESA.ciudad} · Tel. ${EMPRESA.telefono} · ${EMPRESA.email}`),
      h(Text, { style: s.pagina, fixed: true, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => (totalPages > 1 ? `${pageNumber} / ${totalPages}` : '') }),
    ),
  )
}
