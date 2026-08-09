import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCOP } from '@/lib/format'

/**
 * TODOS LOS DOCUMENTOS DE UNA VENTA, EN UN SOLO LUGAR.
 *
 * El usuario esta armando un paquete fisico por cada venta y necesita
 * poder bajar de un tiron: la cotizacion, la OC del cliente, las facturas
 * de compra que se usaron, los documentos soporte, la remision y la
 * factura de venta.
 *
 * Antes tocaba ir a buscar cada cosa a su modulo, y algunas simplemente no
 * tenian link (el documento soporte generado por el ERP no se podia
 * abrir desde la compra).
 *
 * Hay dos clases de documento y se comportan distinto:
 *  - PAGINA: la genera el ERP (cotizacion, remision, DS, informe). Se abre
 *    una pantalla lista para imprimir o guardar como PDF.
 *  - ARCHIVO: un PDF o imagen que se subio al storage. Se descarga.
 */

export type ClaseDocumento = 'PAGINA' | 'ARCHIVO'

export interface DocumentoVenta {
  grupo: 'LA VENTA' | 'DEL CLIENTE' | 'COMPRAS Y COSTOS' | 'ENTREGA' | 'USO INTERNO'
  tipo: string
  numero: string | null
  fecha: string | null
  valor: number | null
  detalle?: string | null
  url: string
  clase: ClaseDocumento
}

export interface DocumentosDeVenta {
  documentos: DocumentoVenta[]
  /** Cosas que deberian existir y no estan. Sirven de checklist. */
  faltantes: string[]
}

export async function obtenerDocumentosDeVenta(cotizacionId: string): Promise<DocumentosDeVenta> {
  const documentos: DocumentoVenta[] = []
  const faltantes: string[] = []

  try {
    const supabase = createServerSupabaseClient()

    // ---------- La cotizacion ----------
    const { data: cot } = await supabase
      .from('cotizaciones')
      .select('id, numero, fecha, total, estado, oc_cliente, oc_cliente_url, soporte_pago_url, fecha_pago, monto_recibido, dias_credito')
      .eq('id', cotizacionId)
      .maybeSingle()

    if (!cot) return { documentos, faltantes }

    documentos.push({
      grupo: 'LA VENTA',
      tipo: 'Cotizacion',
      numero: String(cot.numero ?? ''),
      fecha: cot.fecha ? String(cot.fecha) : null,
      valor: Number(cot.total ?? 0),
      detalle: 'Lo que se le cotizo al cliente',
      url: `/ventas/${cotizacionId}`,
      clase: 'PAGINA',
    })

    // ---------- Orden de compra del cliente ----------
    if (cot.oc_cliente_url) {
      documentos.push({
        grupo: 'DEL CLIENTE',
        tipo: 'Orden de compra',
        numero: cot.oc_cliente ? String(cot.oc_cliente) : null,
        fecha: null,
        valor: null,
        detalle: 'La OC que mando el cliente',
        url: String(cot.oc_cliente_url),
        clase: 'ARCHIVO',
      })
    } else if (Number(cot.dias_credito ?? 0) > 0) {
      // A credito la OC es obligatoria en este negocio
      faltantes.push('La orden de compra del cliente (obligatoria en ventas a credito)')
    }

    // ---------- Soporte del pago del cliente ----------
    if (cot.soporte_pago_url) {
      documentos.push({
        grupo: 'DEL CLIENTE',
        tipo: 'Soporte de pago',
        numero: null,
        fecha: cot.fecha_pago ? String(cot.fecha_pago) : null,
        valor: Number(cot.monto_recibido ?? 0),
        detalle: 'Comprobante de la transferencia del cliente',
        url: String(cot.soporte_pago_url),
        clase: 'ARCHIVO',
      })
    } else if (Number(cot.monto_recibido ?? 0) > 0) {
      faltantes.push('El soporte del pago que hizo el cliente')
    }

    // ---------- Facturas de compra asignadas a esta venta ----------
    const { data: asignaciones } = await supabase
      .from('asignacion_costos')
      .select('factura_compra_id')
      .eq('cotizacion_id', cotizacionId)
      .eq('destino', 'VENTA')
      .not('factura_compra_id', 'is', null)

    const facturaIds = Array.from(
      new Set((asignaciones ?? []).map((a) => a.factura_compra_id as string).filter(Boolean)),
    )

    if (facturaIds.length > 0) {
      const { data: facturas } = await supabase
        .from('facturas_compra')
        .select('id, numero_factura, fecha_factura, total, soporte_url, estado, proveedores(razon_social)')
        .in('id', facturaIds)
        .neq('estado', 'ANULADA')
        .order('fecha_factura', { ascending: true })

      for (const fc of facturas ?? []) {
        const prov = fc.proveedores as { razon_social?: string } | null
        if (fc.soporte_url) {
          documentos.push({
            grupo: 'COMPRAS Y COSTOS',
            tipo: 'Factura de compra',
            numero: fc.numero_factura ? String(fc.numero_factura) : null,
            fecha: fc.fecha_factura ? String(fc.fecha_factura) : null,
            valor: Number(fc.total ?? 0),
            detalle: prov?.razon_social ?? null,
            url: String(fc.soporte_url),
            clase: 'ARCHIVO',
          })
        } else {
          faltantes.push(
            `El PDF de la factura de compra ${fc.numero_factura ?? ''} de ${prov?.razon_social ?? 'proveedor'}`.trim(),
          )
        }
      }
    }

    // ---------- Documentos soporte ----------
    // Pueden venir de 3 caminos:
    //   a) vinculados a la cotizacion directamente (campo viejo)
    //   b) vinculados a una factura de compra asignada a esta venta
    //   c) vinculados a un gasto que se repartio a esta venta (via gasto_reparto)
    //
    // Antes faltaba el (c), asi que un documento soporte de un flete
    // repartido entre varias ventas NO aparecia en el centro de documentos
    // de las ventas a las que le asignaron parte del costo.

    // Primero: los gastos repartidos a esta venta, para sacar sus DS
    const { data: repartoGastos } = await supabase
      .from('gasto_reparto')
      .select('gastos(id)')
      .eq('cotizacion_id', cotizacionId)

    const gastoIds = Array.from(
      new Set((repartoGastos ?? [])
        .map((gr) => (gr.gastos as { id?: string } | null)?.id)
        .filter(Boolean) as string[]),
    )

    const filtroDs = [
      `cotizacion_id.eq.${cotizacionId}`,
      facturaIds.length > 0 ? `factura_compra_id.in.(${facturaIds.join(',')})` : null,
      gastoIds.length > 0 ? `gasto_id.in.(${gastoIds.join(',')})` : null,
    ].filter(Boolean).join(',')

    const { data: docsSoporteCrudo } = await supabase
      .from('documentos_soporte')
      .select('id, numero, fecha, subtotal, tercero_nombre, concepto, gasto_id')
      .or(filtroDs)
      .order('fecha', { ascending: true })

    /**
     * SI EL DOCUMENTO SOPORTE ES DE UN GASTO, MANDA EL REPARTO.
     *
     * EL ERROR QUE HABIA: el DS-2026-002 seguia apareciendo en la
     * COT-2026-013 aunque ese gasto ya se habia repartido a otras ventas.
     *
     * La causa es la rama `cotizacion_id.eq.<id>` de la consulta de arriba.
     * Ese campo se escribe cuando se CREA el documento y editarGasto nunca
     * lo volvia a tocar, asi que el DS quedaba clavado en la venta original
     * para siempre.
     *
     * La verdad de a que ventas pertenece un gasto esta en gasto_reparto.
     * Entonces: si el DS tiene gasto_id y esta venta NO esta en el reparto
     * de ese gasto, el documento no es de esta venta y no se muestra, sin
     * importar lo que diga el campo viejo.
     *
     * Los DS que no vienen de un gasto (los de una factura de compra, o los
     * atados directamente a la venta) se dejan pasar como estaban.
     */
    const docsSoporte = (docsSoporteCrudo ?? []).filter((ds) => {
      if (!ds.gasto_id) return true
      return gastoIds.includes(String(ds.gasto_id))
    })

    for (const ds of docsSoporte) {
      // Si el DS viene de un gasto, buscar cuanto le toca a ESTA venta
      // del reparto. Si no tiene reparto, se muestra el total.
      let montoParaEstaVenta = Number(ds.subtotal ?? 0)

      if (ds.gasto_id) {
        // Consulta directa: cuanto le asignaron a ESTA venta de ESTE gasto
        const { data: miParte } = await supabase
          .from('gasto_reparto')
          .select('monto')
          .eq('gasto_id', ds.gasto_id as string)
          .eq('cotizacion_id', cotizacionId)
          .maybeSingle()

        if (miParte) {
          montoParaEstaVenta = Number(miParte.monto ?? 0)
        }
      }

      documentos.push({
        grupo: 'COMPRAS Y COSTOS',
        tipo: 'Documento soporte',
        numero: String(ds.numero ?? ''),
        fecha: ds.fecha ? String(ds.fecha) : null,
        valor: montoParaEstaVenta,
        detalle: montoParaEstaVenta < Number(ds.subtotal ?? 0)
          ? `${String(ds.tercero_nombre ?? '')} · ${formatCOP(Number(ds.subtotal ?? 0))} total, esta venta: ${formatCOP(montoParaEstaVenta)}`
          : String(ds.tercero_nombre ?? ''),
        url: `/gastos/documento-soporte/${ds.id}`,
        clase: 'PAGINA',
      })
    }

    // ---------- Remision ----------
    const { data: remisiones } = await supabase
      .from('remisiones')
      .select('id, numero, fecha')
      .eq('cotizacion_id', cotizacionId)
      .order('fecha', { ascending: true })

    for (const r of remisiones ?? []) {
      documentos.push({
        grupo: 'ENTREGA',
        tipo: 'Remision',
        numero: String(r.numero ?? ''),
        fecha: r.fecha ? String(r.fecha) : null,
        valor: null,
        detalle: 'Con que se despacho la mercancia',
        url: `/ventas/${cotizacionId}/remision`,
        clase: 'PAGINA',
      })
    }

    // ---------- Factura de venta ----------
    const { data: facturasVenta } = await supabase
      .from('facturas_venta')
      .select('id, numero_factura_dian, fecha, total, estado')
      .eq('cotizacion_id', cotizacionId)
      .neq('estado', 'ANULADA')
      .order('fecha', { ascending: true })

    for (const fv of facturasVenta ?? []) {
      documentos.push({
        grupo: 'LA VENTA',
        tipo: 'Factura de venta',
        numero: fv.numero_factura_dian ? String(fv.numero_factura_dian) : null,
        fecha: fv.fecha ? String(fv.fecha) : null,
        valor: Number(fv.total ?? 0),
        detalle: 'La factura que se le emitio al cliente',
        url: `/ventas/factura/${fv.id}`,
        clase: 'PAGINA',
      })
    }

    if ((facturasVenta ?? []).length === 0 && ['DESPACHADA', 'ENTREGADO', 'POR_COBRAR', 'COBRADA'].includes(String(cot.estado))) {
      faltantes.push('La factura de venta (ya se despacho pero no se ha facturado)')
    }

    // ---------- Archivos sueltos adjuntos ----------
    // Cualquier otro PDF o imagen que se haya subido a la cotizacion, a las
    // facturas de compra o a las facturas de venta.
    const entidades: { tipo: string; ids: string[] }[] = [
      { tipo: 'COTIZACION', ids: [cotizacionId] },
      { tipo: 'FACTURA_COMPRA', ids: facturaIds },
      { tipo: 'FACTURA_VENTA', ids: (facturasVenta ?? []).map((f) => String(f.id)) },
    ]

    // Las URL que ya se listaron arriba, para no repetirlas
    const yaListadas = new Set(documentos.filter((d) => d.clase === 'ARCHIVO').map((d) => d.url))

    for (const ent of entidades) {
      if (ent.ids.length === 0) continue
      const { data: adjuntos } = await supabase
        .from('documentos')
        .select('id, tipo_documento, nombre_archivo, url_archivo, created_at')
        .eq('entidad_tipo', ent.tipo)
        .in('entidad_id', ent.ids)

      for (const d of adjuntos ?? []) {
        const url = String(d.url_archivo)
        if (yaListadas.has(url)) continue
        yaListadas.add(url)
        documentos.push({
          grupo: ent.tipo === 'FACTURA_COMPRA' ? 'COMPRAS Y COSTOS' : 'LA VENTA',
          tipo: String(d.tipo_documento ?? 'OTRO').replace(/_/g, ' ').toLowerCase(),
          numero: null,
          fecha: d.created_at ? String(d.created_at).slice(0, 10) : null,
          valor: null,
          detalle: String(d.nombre_archivo ?? ''),
          url,
          clase: 'ARCHIVO',
        })
      }
    }

    // ---------- Informe interno ----------
    documentos.push({
      grupo: 'USO INTERNO',
      tipo: 'Informe de la venta',
      numero: null,
      fecha: null,
      valor: null,
      detalle: 'Cuanto se gano. NO se lo entregues al cliente',
      url: `/ventas/${cotizacionId}/informe`,
      clase: 'PAGINA',
    })

    return { documentos, faltantes }
  } catch {
    return { documentos, faltantes }
  }
}
