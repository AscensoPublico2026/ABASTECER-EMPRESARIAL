import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import { EMPRESA } from '@/lib/empresa'
import { LOGO_PDF } from '@/lib/pdf/logoPdf'

// Sin cortar palabras con guion ("DES-CUENTO"): las palabras pasan completas a la siguiente linea.
Font.registerHyphenationCallback((palabra) => [palabra])

// ============================================================
// PDF de la cotizacion — diseno con la identidad de la marca
// ------------------------------------------------------------
// Objetivo: que el cliente la lea de un vistazo.
//   1. Encabezado: logo + datos de la empresa | numero de cotizacion.
//   2. Cliente y condiciones en dos tarjetas iguales.
//   3. Tabla clara: codigo aparte, descripcion legible, valores alineados.
//   4. Observaciones en vinetas | totales con el TOTAL destacado y en letras.
//   5. Datos para pago y firma de quien atiende.
// Una cotizacion normal (hasta ~25 items) cabe en UNA hoja A4: la tabla se
// compacta sola cuando hay muchos items; si aun asi no cabe, continua en otra
// hoja repitiendo el encabezado de la tabla.
// Colores del manual de identidad: azul noche, verde y amarillo.
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
  /** Nombre de quien elaboro la cotizacion (va en la firma). */
  elaborado_por?: string | null
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

const NOCHE = '#0D1B2A'
const VERDE = '#16B23C'
const AMARILLO = '#F2B705'
const GRIS = '#636B73'
const GRIS_CLARO = '#F2F4F7'
const LINEA = '#E2E7EE'
const TEXTO = '#1F2937'

function pesos(n: number): string {
  return '$ ' + new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n || 0))
}

function cantidadTexto(n: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(n || 0)
}

export function fechaLarga(f?: string | null): string {
  if (!f) return '-'
  const [y, m, d] = f.slice(0, 10).split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)))
}

// ------------------------------------------------------------
// Numero en letras (pesos colombianos), p. ej. 3.614.030 ->
// "TRES MILLONES SEISCIENTOS CATORCE MIL TREINTA PESOS M/CTE"
// ------------------------------------------------------------
const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE']
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

function menorDeMil(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'CIEN'
  const c = Math.floor(n / 100)
  const r = n % 100
  let txt = CENTENAS[c]
  if (r > 0) {
    let d: string
    if (r < 30) d = UNIDADES[r]
    else {
      const u = r % 10
      d = DECENAS[Math.floor(r / 10)] + (u ? ' Y ' + UNIDADES[u] : '')
    }
    txt = (txt ? txt + ' ' : '') + d
  }
  return txt
}

/** "UNO" se apocopa delante de MIL / MILLONES: "veintiún mil", "treinta y un mil". */
function apocope(t: string): string {
  return t.replace(/VEINTIUNO$/, 'VEINTIÚN').replace(/UNO$/, 'UN')
}

function hastaMillon(n: number): string {
  const miles = Math.floor(n / 1000)
  const resto = n % 1000
  const p: string[] = []
  if (miles > 0) p.push(miles === 1 ? 'MIL' : `${apocope(menorDeMil(miles))} MIL`)
  if (resto > 0) p.push(menorDeMil(resto))
  return p.join(' ')
}

export function numeroEnLetras(valor: number): string {
  const n = Math.round(Math.abs(valor || 0))
  if (n === 0) return 'CERO PESOS M/CTE'
  if (n === 1) return 'UN PESO M/CTE'
  const millones = Math.floor(n / 1_000_000)
  const resto = n % 1_000_000
  const partes: string[] = []
  if (millones > 0) partes.push(millones === 1 ? 'UN MILLÓN' : `${apocope(hastaMillon(millones))} MILLONES`)
  if (resto > 0) partes.push(hastaMillon(resto))
  const exacto = millones > 0 && resto === 0
  // "ciento uno" -> "ciento un pesos"
  return `${apocope(partes.join(' '))}${exacto ? ' DE' : ''} PESOS M/CTE`
}

/** Separa "PRD-0179 - CINTA ..." en codigo y descripcion. */
export function separarCodigo(desc: string): { codigo: string; texto: string } {
  const m = desc.match(/^\s*([A-Z]{2,5}-\d{2,6})\s*-\s*([\s\S]*)$/)
  if (!m) return { codigo: '', texto: desc.trim() }
  return { codigo: m[1], texto: m[2].replace(/^-\s*/, '').trim() }
}

const s = StyleSheet.create({
  page: { paddingTop: 22, paddingBottom: 46, paddingHorizontal: 0, fontSize: 9, fontFamily: 'Helvetica', color: TEXTO },
  cuerpo: { paddingHorizontal: 34 },

  // Franja superior con los colores de la marca
  franja: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', height: 5 },

  // Encabezado
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 0, paddingBottom: 12, paddingHorizontal: 34 },
  marca: { flexDirection: 'row', alignItems: 'center', width: '60%' },
  logo: { width: 46, height: 39, marginRight: 10 },
  empresa: { fontSize: 13.5, fontFamily: 'Helvetica-Bold', color: NOCHE, letterSpacing: 0.2 },
  dato: { fontSize: 7.5, color: GRIS, marginTop: 1.5 },
  numeroCaja: { width: '40%', alignItems: 'flex-end' },
  tituloDoc: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: VERDE, letterSpacing: 2.5 },
  numero: { fontSize: 19, fontFamily: 'Helvetica-Bold', color: NOCHE, marginTop: 2 },
  separador: { height: 1, backgroundColor: LINEA, marginHorizontal: 34 },

  // Cliente | Condiciones
  bloques: { flexDirection: 'row', marginTop: 12 },
  tarjeta: { flex: 1, backgroundColor: GRIS_CLARO, borderRadius: 5, paddingVertical: 8, paddingHorizontal: 11, borderLeftWidth: 3 },
  etiqueta: { fontSize: 6.8, fontFamily: 'Helvetica-Bold', color: GRIS, letterSpacing: 1.2, marginBottom: 4 },
  clienteNombre: { fontSize: 11.5, fontFamily: 'Helvetica-Bold', color: NOCHE, marginBottom: 1 },
  clienteDato: { fontSize: 8, color: '#374151', marginTop: 1.5 },
  filaDato: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2.2 },
  datoLabel: { fontSize: 8, color: GRIS },
  datoValor: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: NOCHE },

  // Tabla
  tabla: { marginTop: 12 },
  thead: { flexDirection: 'row', backgroundColor: NOCHE, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4 },
  th: { color: 'white', fontSize: 7.3, fontFamily: 'Helvetica-Bold', letterSpacing: 0.4 },
  fila: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: 0.6, borderBottomColor: LINEA },
  filaPar: { backgroundColor: '#F8FAFC' },

  // Cierre: observaciones | totales
  cierre: { flexDirection: 'row', marginTop: 12 },
  obs: { flex: 1, marginRight: 12, backgroundColor: GRIS_CLARO, borderRadius: 5, paddingVertical: 8, paddingHorizontal: 11 },
  vineta: { flexDirection: 'row', marginTop: 2.5 },
  vinetaPunto: { width: 9, fontSize: 8, color: VERDE, fontFamily: 'Helvetica-Bold' },
  vinetaTexto: { flex: 1, fontSize: 7.8, color: '#374151', lineHeight: 1.35 },
  totales: { width: 205 },
  totFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4.5, paddingHorizontal: 10, borderBottomWidth: 0.6, borderBottomColor: LINEA },
  totLabel: { fontSize: 8.5, color: GRIS },
  totValor: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NOCHE },
  totGrande: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: NOCHE, borderRadius: 5, borderLeftWidth: 4, borderLeftColor: VERDE },
  totGrandeLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: 'white', letterSpacing: 1 },
  totGrandeValor: { fontSize: 13.5, fontFamily: 'Helvetica-Bold', color: 'white' },
  letras: { fontSize: 6.8, color: GRIS, marginTop: 5, textAlign: 'right', lineHeight: 1.3 },

  // Pago | firma
  final: { flexDirection: 'row', marginTop: 14, alignItems: 'flex-end' },
  pago: { flex: 1, marginRight: 12, borderWidth: 0.8, borderColor: LINEA, borderRadius: 5, paddingVertical: 8, paddingHorizontal: 11 },
  pagoFila: { flexDirection: 'row', marginTop: 2 },
  pagoLabel: { width: 82, fontSize: 7.8, color: GRIS },
  pagoValor: { flex: 1, fontSize: 7.8, fontFamily: 'Helvetica-Bold', color: NOCHE },
  firma: { width: 205, alignItems: 'center' },
  firmaLinea: { width: '100%', borderTopWidth: 0.8, borderTopColor: NOCHE, marginBottom: 4 },
  firmaNombre: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NOCHE },
  firmaCargo: { fontSize: 7.3, color: GRIS, marginTop: 1 },

  gracias: { marginTop: 14, fontSize: 8.5, color: NOCHE, textAlign: 'center', fontFamily: 'Helvetica-Bold' },

  pie: { position: 'absolute', bottom: 18, left: 34, right: 34, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.6, borderTopColor: LINEA, paddingTop: 6 },
  pieTexto: { fontSize: 6.8, color: '#9CA3AF' },
})

const h = React.createElement

/** Tamano de letra y alto de fila segun la cantidad de productos. */
function densidad(n: number) {
  if (n <= 12) return { letra: 9, pad: 5.5 }
  if (n <= 18) return { letra: 8.5, pad: 4.2 }
  if (n <= 24) return { letra: 8, pad: 3.2 }
  return { letra: 7.5, pad: 2.3 }
}

export function documentoCotizacion(cot: CotizacionPdf) {
  const n = cot.items.length
  const { letra, pad } = densidad(n)
  const conCodigo = cot.items.some((it) => separarCodigo(it.descripcion).codigo)

  const col = {
    n: { width: 16 },
    cod: { width: 52 },
    desc: { flex: 1, paddingRight: 8 },
    cant: { width: 36, textAlign: 'center' as const },
    unit: { width: 66, textAlign: 'right' as const },
    iva: { width: 32, textAlign: 'center' as const },
    sub: { width: 72, textAlign: 'right' as const },
  }
  const td = { fontSize: letra, lineHeight: 1.25 }
  const cli = cot.cliente ?? null
  const observaciones = (cot.observaciones ?? '')
    .split(/\n+/)
    .map((l) => l.replace(/^[\s•\-*·]+/, '').trim())
    .filter(Boolean)

  const filaDato = (label: string, valor: string) =>
    h(View, { style: s.filaDato }, h(Text, { style: s.datoLabel }, label), h(Text, { style: s.datoValor }, valor))

  return h(Document, { title: `${cot.numero} ${cli?.razon_social ?? ''}`.trim(), author: EMPRESA.razon_social },
    h(Page, { size: 'A4', style: s.page },
      // Franja de colores de la marca (se repite en cada hoja)
      h(View, { style: s.franja, fixed: true },
        h(View, { style: { flex: 6, backgroundColor: NOCHE } }),
        h(View, { style: { flex: 2, backgroundColor: VERDE } }),
        h(View, { style: { flex: 1, backgroundColor: AMARILLO } }),
      ),

      // Encabezado
      h(View, { style: s.header },
        h(View, { style: s.marca },
          // eslint-disable-next-line jsx-a11y/alt-text
          h(Image, { src: LOGO_PDF, style: s.logo }),
          h(View, {},
            h(Text, { style: s.empresa }, EMPRESA.razon_social),
            h(Text, { style: s.dato }, `NIT ${EMPRESA.nit} · ${EMPRESA.direccion}, ${EMPRESA.ciudad}`),
            h(Text, { style: s.dato }, `Tel. ${EMPRESA.telefono} · ${EMPRESA.email}`),
          ),
        ),
        h(View, { style: s.numeroCaja },
          h(Text, { style: s.tituloDoc }, 'COTIZACIÓN'),
          h(Text, { style: s.numero }, cot.numero),
        ),
      ),
      h(View, { style: s.separador }),

      h(View, { style: s.cuerpo },
        // Cliente | Condiciones
        h(View, { style: s.bloques },
          h(View, { style: { ...s.tarjeta, borderLeftColor: NOCHE, marginRight: 10 } },
            h(Text, { style: s.etiqueta }, 'CLIENTE'),
            h(Text, { style: s.clienteNombre }, cli?.razon_social ?? 'Sin cliente'),
            cli?.nit ? h(Text, { style: s.clienteDato }, `NIT ${cli.nit}`) : null,
            cli?.contacto_nombre ? h(Text, { style: s.clienteDato }, `Atención: ${cli.contacto_nombre}${cli.contacto_telefono ? ' · ' + cli.contacto_telefono : ''}`) : null,
            !cli?.contacto_nombre && cli?.contacto_telefono ? h(Text, { style: s.clienteDato }, `Tel. ${cli.contacto_telefono}`) : null,
            cli?.contacto_email ? h(Text, { style: s.clienteDato }, cli.contacto_email) : null,
            cli?.direccion_entrega || cli?.ciudad
              ? h(Text, { style: s.clienteDato }, [cli?.direccion_entrega, cli?.ciudad].filter(Boolean).join(', '))
              : null,
          ),
          h(View, { style: { ...s.tarjeta, borderLeftColor: VERDE } },
            h(Text, { style: s.etiqueta }, 'CONDICIONES'),
            filaDato('Fecha', fechaLarga(cot.fecha)),
            filaDato('Válida hasta', fechaLarga(cot.fecha_validez)),
            filaDato('Forma de pago', cot.forma_pago || 'Contado'),
            filaDato('Productos', String(n)),
          ),
        ),

        // Tabla
        h(View, { style: s.tabla },
          h(View, { style: s.thead, fixed: true },
            h(Text, { style: { ...s.th, ...col.n } }, '#'),
            conCodigo ? h(Text, { style: { ...s.th, ...col.cod } }, 'CÓDIGO') : null,
            h(Text, { style: { ...s.th, ...col.desc } }, 'DESCRIPCIÓN'),
            h(Text, { style: { ...s.th, ...col.cant } }, 'CANT.'),
            h(Text, { style: { ...s.th, ...col.unit } }, 'VR. UNITARIO'),
            h(Text, { style: { ...s.th, ...col.iva } }, 'IVA'),
            h(Text, { style: { ...s.th, ...col.sub } }, 'SUBTOTAL'),
          ),
          ...cot.items.map((it, i) => {
            const { codigo, texto } = separarCodigo(it.descripcion)
            return h(View, { key: String(i), wrap: false, style: { ...s.fila, ...(i % 2 === 1 ? s.filaPar : {}), paddingVertical: pad } },
              h(Text, { style: { ...td, ...col.n, color: GRIS } }, String(i + 1)),
              conCodigo ? h(Text, { style: { ...td, ...col.cod, color: GRIS, fontSize: letra - 0.8 } }, codigo || '—') : null,
              h(Text, { style: { ...td, ...col.desc } }, conCodigo ? texto : it.descripcion),
              h(Text, { style: { ...td, ...col.cant } }, cantidadTexto(it.cantidad)),
              h(Text, { style: { ...td, ...col.unit } }, pesos(it.precio_unitario)),
              h(Text, { style: { ...td, ...col.iva, color: GRIS } }, `${it.iva_porcentaje}%`),
              h(Text, { style: { ...td, ...col.sub, fontFamily: 'Helvetica-Bold', color: NOCHE } }, pesos(it.subtotal)),
            )
          }),
        ),

        // Observaciones | Totales
        h(View, { style: s.cierre, wrap: false },
          h(View, { style: s.obs },
            h(Text, { style: s.etiqueta }, 'OBSERVACIONES'),
            ...(observaciones.length ? observaciones : ['Sin observaciones.']).map((o, i) =>
              h(View, { key: String(i), style: s.vineta },
                h(Text, { style: s.vinetaPunto }, '•'),
                h(Text, { style: s.vinetaTexto }, o),
              )
            ),
          ),
          h(View, { style: s.totales },
            h(View, { style: s.totFila }, h(Text, { style: s.totLabel }, 'Subtotal'), h(Text, { style: s.totValor }, pesos(cot.subtotal))),
            h(View, { style: s.totFila }, h(Text, { style: s.totLabel }, 'IVA'), h(Text, { style: s.totValor }, pesos(cot.iva_total))),
            h(View, { style: s.totGrande }, h(Text, { style: s.totGrandeLabel }, 'TOTAL'), h(Text, { style: s.totGrandeValor }, pesos(cot.total))),
            h(Text, { style: s.letras }, `Son: ${numeroEnLetras(cot.total)}`),
          ),
        ),

        // Datos para pago | Firma
        h(View, { style: s.final, wrap: false },
          h(View, { style: s.pago },
            h(Text, { style: s.etiqueta }, 'DATOS PARA PAGO'),
            h(View, { style: s.pagoFila }, h(Text, { style: s.pagoLabel }, 'Entidad'), h(Text, { style: s.pagoValor }, EMPRESA.banco)),
            h(View, { style: s.pagoFila }, h(Text, { style: s.pagoLabel }, EMPRESA.tipo_cuenta), h(Text, { style: s.pagoValor }, `No. ${EMPRESA.numero_cuenta}`)),
            h(View, { style: s.pagoFila }, h(Text, { style: s.pagoLabel }, 'Titular'), h(Text, { style: s.pagoValor }, `${EMPRESA.razon_social} · NIT ${EMPRESA.nit}`)),
          ),
          h(View, { style: s.firma },
            h(View, { style: s.firmaLinea }),
            h(Text, { style: s.firmaNombre }, cot.elaborado_por || EMPRESA.razon_social),
            h(Text, { style: s.firmaCargo }, cot.elaborado_por ? EMPRESA.razon_social : `Tel. ${EMPRESA.telefono}`),
          ),
        ),

        h(Text, { style: s.gracias, wrap: false }, '¡Gracias por tenernos en cuenta!'),
      ),

      // Pie
      h(View, { style: s.pie, fixed: true },
        h(Text, { style: s.pieTexto }, `${EMPRESA.razon_social} · ${EMPRESA.slogan}`),
        h(Text, { style: s.pieTexto, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${cot.numero}${totalPages > 1 ? ` · Página ${pageNumber} de ${totalPages}` : ''}` }),
      ),
    ),
  )
}
