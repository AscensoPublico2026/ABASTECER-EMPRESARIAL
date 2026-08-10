'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { uppercaseFormData } from '@/lib/uppercase'
import { obtenerNombreUsuarioActual } from '@/lib/queries/perfil'
import {
  recalcularCotizacionesDeFactura,
  recalcularCostoCotizacion,
  cerrarSolicitudesCubiertas,
  cerrarSolicitudesCubiertasPorStock,
} from '@/lib/queries/costeo'
import { obtenerFacturaCompraDetalle } from '@/lib/queries/compras'
import { montoDesdeTexto } from '@/lib/numeros'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

/** Una asignacion: a que venta va cierta cantidad de este item */
interface AsignacionInput {
  cotizacion_id: string | null // null = va a STOCK
  cantidad: number
}

interface ItemInput {
  producto_id: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
  iva_porcentaje: number
  asignaciones?: AsignacionInput[]
}

const fmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
})

function montoDesdeCampo(v: FormDataEntryValue | null): number {
  if (v === null || typeof v !== 'string') return 0
  const n = montoDesdeTexto(v)
  return n > 0 ? Math.round(n) : 0
}

/**
 * Dias de credito segun la forma de pago.
 *
 * OJO: antes usaba forma.includes('15') etc, y eso rompia en dos formas:
 *   "CREDITO 90 DIAS"  -> no encontraba nada -> 0 dias -> la factura
 *                         quedaba PAGADA y creaba un egreso de caja
 *                         que nunca ocurrio
 *   "CREDITO 20 DIAS"  -> encontraba el '2' de 20 en ningun patron,
 *                         o peor, un '15' dentro de "150" daba 15
 * Ahora extrae el numero real de dias del texto.
 */
function diasDeFormaPago(forma: string): number {
  const texto = String(forma ?? '').toUpperCase()

  // Contado explicito
  if (texto.includes('CONTADO') || texto.includes('EFECTIVO')) return 0

  // Extraer el primer numero del texto ("CREDITO 90 DIAS" -> 90)
  const match = texto.match(/(\d+)/)
  if (match) {
    const dias = Number(match[1])
    if (Number.isFinite(dias) && dias >= 0 && dias <= 365) return dias
  }

  // Sin numero y sin decir contado: asumir contado (comportamiento previo)
  return 0
}

/** Fila lista para insertar en factura_compra_items */
interface FilaItemDB {
  producto_id: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
  iva_porcentaje: number
  iva_valor: number
  subtotal: number
  total: number
}

interface ItemCalculado {
  fila: FilaItemDB
  asignaciones: AsignacionInput[]
  iva_unitario: number
}

function calcularItems(items: ItemInput[]) {
  let subtotal = 0
  let iva_total = 0

  const calculados: ItemCalculado[] = items.map((item) => {
    const sub = item.cantidad * item.precio_unitario
    const iva_valor = sub * (item.iva_porcentaje / 100)
    subtotal += sub
    iva_total += iva_valor
    return {
      fila: {
        producto_id: item.producto_id || null,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        iva_porcentaje: item.iva_porcentaje,
        iva_valor: Math.round(iva_valor),
        subtotal: Math.round(sub),
        total: Math.round(sub + iva_valor),
      },
      asignaciones: item.asignaciones ?? [],
      iva_unitario: item.precio_unitario * (item.iva_porcentaje / 100),
    }
  })

  return { calculados, subtotal, iva_total, total: Math.round(subtotal + iva_total) }
}

/** Empareja los items guardados en BD con sus asignaciones originales */
/**
 * Empareja los items que quedaron guardados en BD con sus asignaciones.
 *
 * OJO: la version anterior usaba find() por (descripcion, cantidad) sin
 * consumir el candidato. Con dos lineas de la misma descripcion y misma
 * cantidad pero precios distintos, AMBAS recibian las asignaciones de la
 * primera:
 *   Linea 1: 5u @ 10.000 -> VENTA A
 *   Linea 2: 5u @ 18.000 -> VENTA B
 * Resultado: las 10 unidades iban a VENTA A y VENTA B quedaba con costo 0
 * y margen 100%. La utilidad consolidada se inflaba en 70.000.
 *
 * Ahora empareja incluyendo el precio y CONSUME el candidato, para que
 * cada linea reciba lo suyo. Si algo no se puede emparejar, se reporta
 * en vez de degradarse en silencio a "todo a stock, IVA 0".
 */
function emparejarAsignaciones(
  itemsGuardados: { id: string; producto_id: string | null; cantidad: number; precio_unitario: number; descripcion: string }[],
  calculados: ItemCalculado[]
): { emparejados: ReturnType<typeof mapearItem>[]; sinEmparejar: number } {
  const disponibles = [...calculados]
  let sinEmparejar = 0

  const emparejados = itemsGuardados.map((g) => {
    // 1er intento: descripcion + cantidad + precio (el mas preciso)
    let idx = disponibles.findIndex(
      (c) =>
        c.fila.descripcion === g.descripcion &&
        Number(c.fila.cantidad) === Number(g.cantidad) &&
        Number(c.fila.precio_unitario) === Number(g.precio_unitario)
    )

    // 2do intento: descripcion + precio (por si la cantidad se redondeo
    // al guardar, ej. 0.333 -> 0.33 en numeric(10,2))
    if (idx === -1) {
      idx = disponibles.findIndex(
        (c) =>
          c.fila.descripcion === g.descripcion &&
          Number(c.fila.precio_unitario) === Number(g.precio_unitario)
      )
    }

    // 3er intento: solo descripcion
    if (idx === -1) {
      idx = disponibles.findIndex((c) => c.fila.descripcion === g.descripcion)
    }

    if (idx === -1) {
      sinEmparejar++
      return mapearItem(g, null)
    }

    const original = disponibles[idx]
    disponibles.splice(idx, 1) // consumir para que no se reutilice
    return mapearItem(g, original)
  })

  return { emparejados, sinEmparejar }
}

function mapearItem(
  g: { id: string; producto_id: string | null; cantidad: number; precio_unitario: number; descripcion: string },
  original: ItemCalculado | null
) {
  return {
    id: g.id,
    producto_id: g.producto_id,
    cantidad: Number(g.cantidad),
    precio_unitario: Number(g.precio_unitario),
    iva_unitario: original?.iva_unitario ?? 0,
    asignaciones: original?.asignaciones ?? [],
  }
}

/**
 * Crea los registros de asignacion_costos de una factura.
 * Si un item no trae asignaciones explicitas, todo va a STOCK.
 */
async function crearAsignaciones(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  facturaCompraId: string,
  itemsGuardados: { id: string; producto_id: string | null; cantidad: number; precio_unitario: number; iva_unitario: number; asignaciones: AsignacionInput[] }[]
): Promise<string | null> {
  const filas: Record<string, unknown>[] = []

  for (const item of itemsGuardados) {
    const asigs = item.asignaciones.filter((a) => Number(a.cantidad) > 0)
    const totalAsignado = asigs.reduce((s, a) => s + Number(a.cantidad), 0)

    if (totalAsignado > item.cantidad) {
      return `Se compraron ${item.cantidad} unidades pero se intenta asignar ${totalAsignado}.`
    }

    for (const a of asigs) {
      filas.push({
        factura_compra_id: facturaCompraId,
        factura_compra_item_id: item.id,
        producto_id: item.producto_id,
        destino: a.cotizacion_id ? 'VENTA' : 'STOCK',
        cotizacion_id: a.cotizacion_id || null,
        cantidad: Number(a.cantidad),
        costo_unitario: item.precio_unitario,
        iva_unitario: item.iva_unitario,
      })
    }

    // El resto que no se asigno a ninguna venta queda en stock
    const resto = item.cantidad - totalAsignado
    if (resto > 0) {
      filas.push({
        factura_compra_id: facturaCompraId,
        factura_compra_item_id: item.id,
        producto_id: item.producto_id,
        destino: 'STOCK',
        cotizacion_id: null,
        cantidad: resto,
        costo_unitario: item.precio_unitario,
        iva_unitario: item.iva_unitario,
      })
    }
  }

  if (filas.length > 0) {
    const { error } = await supabase.from('asignacion_costos').insert(filas)
    if (error) return error.message
  }
  return null
}

// ============================================================
// REGISTRAR FACTURA DE COMPRA
// ============================================================
export async function registrarFacturaCompra(formData: FormData): Promise<ResultadoAccion> {
  uppercaseFormData(formData)
  const proveedor_id = String(formData.get('proveedor_id') ?? '').trim()
  const numero_factura = String(formData.get('numero_factura') ?? '').trim()
  const fecha_factura = String(formData.get('fecha_factura') ?? '').trim()
  const forma_pago = String(formData.get('forma_pago') ?? 'Contado').trim()
  const notas = String(formData.get('notas') ?? '').trim()
  const itemsJson = String(formData.get('items') ?? '[]')
  const soporte_url = String(formData.get('soporte_url') ?? '').trim()
  const soporte_nombre = String(formData.get('soporte_nombre') ?? '').trim()
  const cuenta_id = String(formData.get('cuenta_id') ?? '').trim()
  const tipo_comprobante = String(formData.get('tipo_comprobante') ?? 'FACTURA').trim()

  // Retenciones que el proveedor descuenta al pagarle (pasivo con la DIAN)
  const retencion_retefuente = montoDesdeCampo(formData.get('retencion_retefuente'))
  const retencion_reteiva = montoDesdeCampo(formData.get('retencion_reteiva'))
  const retencion_reteica = montoDesdeCampo(formData.get('retencion_reteica'))

  // Datos del tercero (solo para Documento Soporte)
  const tercero_nombre = String(formData.get('tercero_nombre') ?? '').trim()
  const tercero_documento = String(formData.get('tercero_documento') ?? '').trim()
  const tercero_tipo_documento = String(formData.get('tercero_tipo_documento') ?? 'CC').trim()
  const tercero_telefono = String(formData.get('tercero_telefono') ?? '').trim()
  const tercero_direccion = String(formData.get('tercero_direccion') ?? '').trim()

  const esDocSoporte = tipo_comprobante === 'DOCUMENTO_SOPORTE'

  if (!proveedor_id) return { ok: false, mensaje: 'Selecciona un proveedor.' }
  if (!esDocSoporte && !numero_factura) return { ok: false, mensaje: 'Ingresa el numero de factura.' }
  if (esDocSoporte && !tercero_nombre) return { ok: false, mensaje: 'Para el documento soporte necesitas el nombre del tercero.' }
  if (esDocSoporte && !tercero_documento) return { ok: false, mensaje: 'Para el documento soporte necesitas el numero de documento del tercero.' }

  let items: ItemInput[]
  try {
    items = JSON.parse(itemsJson)
  } catch {
    return { ok: false, mensaje: 'Error en los items.' }
  }
  if (items.length === 0) return { ok: false, mensaje: 'Agrega al menos un item.' }

  const { calculados, subtotal, iva_total, total } = calcularItems(items)
  const dias_credito = diasDeFormaPago(forma_pago)
  const totalRetenido = retencion_retefuente + retencion_reteiva + retencion_reteica
  const totalNeto = total - totalRetenido

  if (totalRetenido > total) {
    return { ok: false, mensaje: 'Las retenciones no pueden ser mayores al total de la factura.' }
  }

  // Si la compra es de contado, la factura queda PAGADA: el dinero YA salio.
  // Sin cuenta no podriamos descontarlo y el saldo quedaria inflado.
  if (dias_credito === 0 && !cuenta_id) {
    return {
      ok: false,
      mensaje: 'La compra es de contado, o sea que el dinero ya salio. Selecciona de que cuenta se pago para poder descontarlo del saldo.',
    }
  }

  let fecha_vencimiento: string | null = null
  if (dias_credito > 0 && fecha_factura) {
    const d = new Date(fecha_factura)
    d.setDate(d.getDate() + dias_credito)
    fecha_vencimiento = d.toISOString().slice(0, 10)
  }

  const estado = dias_credito > 0 ? 'REGISTRADA' : 'PAGADA'

  try {
    const supabase = createServerSupabaseClient()

    // 0. Evitar duplicados: mismo proveedor + mismo numero de factura
    // (por doble clic, reintento tras error, etc). No aplica a Documento
    // Soporte porque ahi el numero se genera solo (DS-2026-00X).
    if (!esDocSoporte && numero_factura) {
      const { data: yaExiste } = await supabase
        .from('facturas_compra')
        .select('id, total, estado')
        .eq('proveedor_id', proveedor_id)
        .eq('numero_factura', numero_factura)
        .neq('estado', 'ANULADA')
        .limit(1)
        .maybeSingle()

      if (yaExiste) {
        return {
          ok: false,
          mensaje: `Ya existe una factura ${numero_factura} de este proveedor por ${fmt.format(Number(yaExiste.total))} (estado ${yaExiste.estado}). Si es otra factura distinta con el mismo numero, revisala en la lista. Si fue un doble clic, no la registres de nuevo.`,
        }
      }
    }

    // 1. Cabecera
    // Si es documento soporte sin numero de factura, usar placeholder temporal
    const numFacturaInicial = numero_factura || (esDocSoporte ? 'DS-PENDIENTE' : '')
    const { data: factura, error: errFactura } = await supabase
      .from('facturas_compra')
      .insert({
        proveedor_id,
        numero_factura: numFacturaInicial,
        fecha_factura: fecha_factura || new Date().toISOString().slice(0, 10),
        fecha_vencimiento,
        subtotal: Math.round(subtotal),
        iva_total: Math.round(iva_total),
        total,
        retencion_retefuente,
        retencion_reteiva,
        retencion_reteica,
        forma_pago,
        dias_credito,
        estado,
        soporte_url: soporte_url || null,
        notas: notas || null,
      })
      .select('id')
      .single()

    if (errFactura) {
      if (errFactura.code === '23505') {
        return {
          ok: false,
          mensaje: `Ya existe una factura ${numFacturaInicial} de este proveedor. No se volvio a registrar.`,
        }
      }
      return { ok: false, mensaje: errFactura.message }
    }

    // 2. Items (el trigger actualiza costo_promedio y stock)
    const { data: itemsGuardados, error: errItems } = await supabase
      .from('factura_compra_items')
      .insert(calculados.map((c) => ({ ...c.fila, factura_compra_id: factura.id })))
      .select('id, producto_id, cantidad, precio_unitario, descripcion')

    if (errItems) return { ok: false, mensaje: errItems.message }

    // 3. Asignacion de costos (nucleo del modelo)
    const { emparejados: paraAsignar, sinEmparejar } = emparejarAsignaciones(itemsGuardados ?? [], calculados)
    if (sinEmparejar > 0) {
      return {
        ok: false,
        mensaje: `No se pudo emparejar ${sinEmparejar} item(s) con su asignacion de costo. Revisa que no haya lineas identicas y vuelve a intentar.`,
      }
    }

    const errAsig = await crearAsignaciones(supabase, factura.id, paraAsignar)
    if (errAsig) return { ok: false, mensaje: `Factura guardada pero fallo la asignacion: ${errAsig}` }

    // 4. Cerrar solicitudes de compra cubiertas (solo las de la venta asignada)
    await cerrarSolicitudesCubiertas(supabase, factura.id)
    // Y las que ya quedaron cubiertas por inventario, aunque esta compra
    // haya entrado como STOCK sin asignarse a la venta. Sin esto la
    // solicitud se quedaba PENDIENTE para siempre.
    await cerrarSolicitudesCubiertasPorStock(supabase)

    // 5. Recalcular costo real de las cotizaciones afectadas
    const cotizacionesAfectadas = await recalcularCotizacionesDeFactura(supabase, factura.id)

    // 6. Documento soporte de la factura (PDF adjunto)
    if (soporte_url) {
      await supabase.from('documentos').insert({
        entidad_tipo: 'FACTURA_COMPRA',
        entidad_id: factura.id,
        tipo_documento: esDocSoporte ? 'DOCUMENTO_SOPORTE' : 'FACTURA',
        nombre_archivo: soporte_nombre || 'factura_compra.pdf',
        url_archivo: soporte_url,
      })
    }

    // 6b. Si es Documento Soporte, generarlo en la tabla documentos_soporte
    let numeroDS: string | null = null
    let numFacturaFinal = numero_factura || numFacturaInicial
    if (esDocSoporte) {
      const usuario = await obtenerNombreUsuarioActual()
      const { data: ds, error: errDs } = await supabase
        .from('documentos_soporte')
        .insert({
          fecha: fecha_factura || new Date().toISOString().slice(0, 10),
          tercero_nombre,
          tercero_tipo_documento,
          tercero_documento,
          tercero_telefono: tercero_telefono || null,
          tercero_direccion: tercero_direccion || null,
          concepto: calculados.map((c) => c.fila.descripcion).join(', '),
          /**
           * cantidad = 1 y valor_unitario = el total de la compra.
           *
           * ERROR QUE ESTO ARREGLA: antes se mandaba
           * cantidad = numero de lineas de la factura y valor_unitario = total.
           * El trigger de documentos_soporte calcula
           * subtotal = cantidad * valor_unitario, asi que una compra de 3
           * lineas por 500.000 generaba un documento soporte por 1.500.000.
           *
           * Un documento soporte es un documento ante la DIAN: estaba
           * declarando el triple de lo que se pago. Las descripciones de las
           * lineas ya van en el concepto.
           */
          cantidad: 1,
          valor_unitario: total,
          factura_compra_id: factura.id,
          creado_por_id: usuario.id,
          creado_por_nombre: usuario.nombre,
        })
        .select('id, numero')
        .single()

      if (!errDs && ds) {
        numeroDS = ds.numero as string
        // Si no habia numero de factura, usar el numero del DS
        if (!numero_factura) {
          numFacturaFinal = ds.numero as string
          await supabase.from('facturas_compra')
            .update({ numero_factura: numFacturaFinal })
            .eq('id', factura.id)
        }
      }
    }

    // 7. If paid at purchase (contado), record it
    let avisoCaja = ''
    if (estado === 'PAGADA' && cuenta_id) {
      avisoCaja = totalRetenido > 0
        ? ` Se descontaron ${fmt.format(totalNeto)} de la cuenta (neto tras retener ${fmt.format(totalRetenido)}). Esa retencion es un pasivo con la DIAN, no un ahorro: declarala y pagala en su momento.`
        : ` Se descontaron ${fmt.format(totalNeto)} de la cuenta.`
    } else if (estado === 'REGISTRADA') {
      avisoCaja = ' Es a credito: no salio dinero todavia, registra el pago cuando le pagues al proveedor.'
    }

    revalidatePath('/compras')
    revalidatePath('/inventario')
    revalidatePath('/financiero')
    revalidatePath('/ventas')
    revalidatePath('/panel')

    const detalleVentas = cotizacionesAfectadas.length > 0
      ? ` Costo asignado a ${cotizacionesAfectadas.length} venta(s).`
      : ' Todo el inventario quedo en stock.'

    const tipoLabel = esDocSoporte
      ? `Compra con Documento Soporte ${numeroDS ?? ''}`
      : `Factura ${numFacturaFinal}`

    return {
      ok: true,
      mensaje: `${tipoLabel} registrada: ${fmt.format(total)}.${detalleVentas}${avisoCaja}`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al registrar.' }
  }
}

// ============================================================
// EDITAR FACTURA DE COMPRA
// ============================================================
export async function editarFacturaCompra(formData: FormData): Promise<ResultadoAccion> {
  uppercaseFormData(formData)
  const factura_id = String(formData.get('factura_id') ?? '').trim()
  const proveedor_id = String(formData.get('proveedor_id') ?? '').trim()
  const numero_factura = String(formData.get('numero_factura') ?? '').trim()
  const fecha_factura = String(formData.get('fecha_factura') ?? '').trim()
  const forma_pago = String(formData.get('forma_pago') ?? 'Contado').trim()
  const notas = String(formData.get('notas') ?? '').trim()
  const itemsJson = String(formData.get('items') ?? '[]')
  const soporte_url = String(formData.get('soporte_url') ?? '').trim()
  const soporte_nombre = String(formData.get('soporte_nombre') ?? '').trim()
  const cuenta_id = String(formData.get('cuenta_id') ?? '').trim()

  const retencion_retefuente = montoDesdeCampo(formData.get('retencion_retefuente'))
  const retencion_reteiva = montoDesdeCampo(formData.get('retencion_reteiva'))
  const retencion_reteica = montoDesdeCampo(formData.get('retencion_reteica'))

  if (!factura_id) return { ok: false, mensaje: 'Factura no valida.' }
  if (!proveedor_id) return { ok: false, mensaje: 'Selecciona un proveedor.' }
  if (!numero_factura) return { ok: false, mensaje: 'Ingresa el numero de factura.' }

  let items: ItemInput[]
  try {
    items = JSON.parse(itemsJson)
  } catch {
    return { ok: false, mensaje: 'Error en los items.' }
  }
  if (items.length === 0) return { ok: false, mensaje: 'Agrega al menos un item.' }

  const { calculados, subtotal, iva_total, total } = calcularItems(items)
  const dias_credito = diasDeFormaPago(forma_pago)
  const totalRetenido = retencion_retefuente + retencion_reteiva + retencion_reteica

  if (totalRetenido > total) {
    return { ok: false, mensaje: 'Las retenciones no pueden ser mayores al total de la factura.' }
  }

  let fecha_vencimiento: string | null = null
  if (dias_credito > 0 && fecha_factura) {
    const d = new Date(fecha_factura)
    d.setDate(d.getDate() + dias_credito)
    fecha_vencimiento = d.toISOString().slice(0, 10)
  }

  try {
    const supabase = createServerSupabaseClient()

    const { data: actual } = await supabase
      .from('facturas_compra')
      .select('estado')
      .eq('id', factura_id)
      .single()

    // Si queda de contado necesitamos saber de que cuenta salio el dinero
    if (dias_credito === 0 && !cuenta_id) {
      return {
        ok: false,
        mensaje: 'La compra es de contado. Selecciona de que cuenta se pago para poder descontarlo del saldo.',
      }
    }

    if (!actual) return { ok: false, mensaje: 'Factura no encontrada.' }
    if (actual.estado === 'ANULADA') return { ok: false, mensaje: 'No se puede editar una factura anulada.' }

    // Cotizaciones afectadas ANTES del cambio (para recalcular al final)
    const { data: asigsPrevias } = await supabase
      .from('asignacion_costos')
      .select('cotizacion_id')
      .eq('factura_compra_id', factura_id)
      .not('cotizacion_id', 'is', null)
    const cotizacionesPrevias = Array.from(
      new Set((asigsPrevias ?? []).map((a) => a.cotizacion_id as string))
    )

    // Revertir stock de los items viejos antes de borrarlos
    const { data: itemsViejos } = await supabase
      .from('factura_compra_items')
      .select('producto_id, cantidad')
      .eq('factura_compra_id', factura_id)

    for (const iv of itemsViejos ?? []) {
      if (!iv.producto_id) continue
      const { data: prod } = await supabase
        .from('productos')
        .select('stock_actual')
        .eq('id', iv.producto_id)
        .single()
      await supabase
        .from('productos')
        .update({ stock_actual: Number(prod?.stock_actual ?? 0) - Number(iv.cantidad ?? 0) })
        .eq('id', iv.producto_id)
    }

    // Borrar items (cascade borra asignacion_costos)
    await supabase.from('factura_compra_items').delete().eq('factura_compra_id', factura_id)

    // Actualizar cabecera
    const nuevoEstado = actual.estado === 'PAGADA' && dias_credito > 0 ? 'REGISTRADA' : actual.estado
    const { error: errUpd } = await supabase
      .from('facturas_compra')
      .update({
        proveedor_id,
        numero_factura,
        fecha_factura: fecha_factura || new Date().toISOString().slice(0, 10),
        fecha_vencimiento,
        subtotal: Math.round(subtotal),
        iva_total: Math.round(iva_total),
        total,
        retencion_retefuente,
        retencion_reteiva,
        retencion_reteica,
        forma_pago,
        dias_credito,
        estado: nuevoEstado,
        soporte_url: soporte_url || undefined,
        notas: notas || null,
      })
      .eq('id', factura_id)

    if (errUpd) return { ok: false, mensaje: errUpd.message }

    // Insertar items nuevos
    const { data: itemsGuardados, error: errItems } = await supabase
      .from('factura_compra_items')
      .insert(calculados.map((c) => ({ ...c.fila, factura_compra_id: factura_id })))
      .select('id, producto_id, cantidad, precio_unitario, descripcion')

    if (errItems) return { ok: false, mensaje: errItems.message }

    // Reasignar costos
    const { emparejados: paraAsignar, sinEmparejar } = emparejarAsignaciones(itemsGuardados ?? [], calculados)
    if (sinEmparejar > 0) {
      return {
        ok: false,
        mensaje: `No se pudo emparejar ${sinEmparejar} item(s) con su asignacion de costo. Revisa que no haya lineas identicas.`,
      }
    }

    const errAsig = await crearAsignaciones(supabase, factura_id, paraAsignar)
    if (errAsig) return { ok: false, mensaje: `Factura actualizada pero fallo la asignacion: ${errAsig}` }

    await cerrarSolicitudesCubiertas(supabase, factura_id)
    await cerrarSolicitudesCubiertasPorStock(supabase)

    // Recalcular: las de antes y las de ahora
    const cotizacionesNuevas = await recalcularCotizacionesDeFactura(supabase, factura_id)
    for (const cid of cotizacionesPrevias) {
      if (!cotizacionesNuevas.includes(cid)) {
        await recalcularCostoCotizacion(supabase, cid)
      }
    }

    if (soporte_url) {
      await supabase.from('documentos').insert({
        entidad_tipo: 'FACTURA_COMPRA',
        entidad_id: factura_id,
        tipo_documento: 'FACTURA',
        nombre_archivo: soporte_nombre || 'factura_compra.pdf',
        url_archivo: soporte_url,
      })
    }

    revalidatePath('/compras')
    revalidatePath('/inventario')
    revalidatePath('/financiero')
    revalidatePath('/ventas')
    revalidatePath('/panel')
    revalidatePath('/')

    return { ok: true, mensaje: `Factura ${numero_factura} actualizada: ${fmt.format(total)}.` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al editar.' }
  }
}

// ============================================================
// ANULAR FACTURA DE COMPRA
// ============================================================
export async function anularFacturaCompra(formData: FormData): Promise<ResultadoAccion> {
  const factura_id = String(formData.get('factura_id') ?? '').trim()
  const motivo = String(formData.get('motivo') ?? '').trim()
  if (!factura_id) return { ok: false, mensaje: 'Factura no valida.' }

  try {
    const supabase = createServerSupabaseClient()

    const { data: factura } = await supabase
      .from('facturas_compra')
      .select('numero_factura, estado')
      .eq('id', factura_id)
      .single()

    if (!factura) return { ok: false, mensaje: 'Factura no encontrada.' }
    if (factura.estado === 'ANULADA') return { ok: false, mensaje: 'La factura ya esta anulada.' }

    // Cotizaciones afectadas antes de borrar asignaciones
    const { data: asigs } = await supabase
      .from('asignacion_costos')
      .select('cotizacion_id')
      .eq('factura_compra_id', factura_id)
      .not('cotizacion_id', 'is', null)
    const cotizaciones = Array.from(new Set((asigs ?? []).map((a) => a.cotizacion_id as string)))

    // Revertir stock
    const { data: itemsFactura } = await supabase
      .from('factura_compra_items')
      .select('producto_id, cantidad')
      .eq('factura_compra_id', factura_id)

    for (const it of itemsFactura ?? []) {
      if (!it.producto_id) continue
      const { data: prod } = await supabase
        .from('productos')
        .select('stock_actual')
        .eq('id', it.producto_id)
        .single()
      await supabase
        .from('productos')
        .update({ stock_actual: Number(prod?.stock_actual ?? 0) - Number(it.cantidad ?? 0) })
        .eq('id', it.producto_id)
    }

    // Borrar asignaciones para que no sumen al costo de ninguna venta
    await supabase.from('asignacion_costos').delete().eq('factura_compra_id', factura_id)

    // Reabrir solicitudes de compra que dependian de esta factura
    for (const cid of cotizaciones) {
      await supabase
        .from('solicitudes_compra')
        .update({ estado: 'PENDIENTE', notas: null })
        .eq('cotizacion_id', cid)
        .in('estado', ['COMPRADO', 'EN_COTIZACION'])
    }

    // Anular
    await supabase
      .from('facturas_compra')
      .update({
        estado: 'ANULADA',
        notas: motivo ? `ANULADA: ${motivo}` : 'ANULADA',
      })
      .eq('id', factura_id)

    // Recalcular costos de las ventas afectadas
    for (const cid of cotizaciones) {
      await recalcularCostoCotizacion(supabase, cid)
    }

    revalidatePath('/compras')
    revalidatePath('/inventario')
    revalidatePath('/financiero')
    revalidatePath('/ventas')
    revalidatePath('/panel')

    return {
      ok: true,
      mensaje: `Factura ${factura.numero_factura} anulada. Stock y costos revertidos.`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al anular.' }
  }
}

// ============================================================
// ASIGNAR COSTOS DE UNA COMPRA YA REGISTRADA
// Para completar trazabilidad de compras viejas
// ============================================================
export async function asignarCostosCompra(formData: FormData): Promise<ResultadoAccion> {
  const factura_compra_item_id = String(formData.get('factura_compra_item_id') ?? '').trim()
  const cotizacion_id = String(formData.get('cotizacion_id') ?? '').trim()
  const cantidad = Number(formData.get('cantidad') ?? 0)

  if (!factura_compra_item_id) return { ok: false, mensaje: 'Item no valido.' }
  if (cantidad <= 0) return { ok: false, mensaje: 'La cantidad debe ser mayor a cero.' }

  try {
    const supabase = createServerSupabaseClient()

    const { data: item } = await supabase
      .from('factura_compra_items')
      .select('id, factura_compra_id, producto_id, cantidad, precio_unitario, iva_valor')
      .eq('id', factura_compra_item_id)
      .single()

    if (!item) return { ok: false, mensaje: 'Item de factura no encontrado.' }

    const ivaUnitario = Number(item.cantidad) > 0
      ? Number(item.iva_valor ?? 0) / Number(item.cantidad)
      : 0

    // Si ya existe una asignacion a STOCK, reducirla para liberar cantidad
    const { data: asigStock } = await supabase
      .from('asignacion_costos')
      .select('id, cantidad')
      .eq('factura_compra_item_id', factura_compra_item_id)
      .eq('destino', 'STOCK')
      .maybeSingle()

    if (asigStock) {
      const restante = Number(asigStock.cantidad) - cantidad
      if (restante < 0) {
        return { ok: false, mensaje: `Solo hay ${asigStock.cantidad} unidades sin asignar.` }
      }
      if (restante === 0) {
        await supabase.from('asignacion_costos').delete().eq('id', asigStock.id)
      } else {
        await supabase.from('asignacion_costos').update({ cantidad: restante }).eq('id', asigStock.id)
      }
    }

    const { error } = await supabase.from('asignacion_costos').insert({
      factura_compra_id: item.factura_compra_id,
      factura_compra_item_id: item.id,
      producto_id: item.producto_id,
      destino: cotizacion_id ? 'VENTA' : 'STOCK',
      cotizacion_id: cotizacion_id || null,
      cantidad,
      costo_unitario: Number(item.precio_unitario),
      iva_unitario: Math.round(ivaUnitario * 100) / 100,
    })

    if (error) return { ok: false, mensaje: error.message }

    if (cotizacion_id) {
      await recalcularCostoCotizacion(supabase, cotizacion_id)
      await cerrarSolicitudesCubiertas(supabase, item.factura_compra_id as string)
    }
    await cerrarSolicitudesCubiertasPorStock(supabase)

    revalidatePath('/compras')
    revalidatePath('/ventas')
    revalidatePath('/financiero')

    return { ok: true, mensaje: `${cantidad} unidades asignadas correctamente.` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al asignar.' }
  }
}

// ============================================================
// MARCAR FACTURA DE COMPRA COMO PAGADA
// ============================================================
export async function pagarFacturaCompra(formData: FormData): Promise<ResultadoAccion> {
  const factura_id = String(formData.get('factura_id') ?? '').trim()
  const fecha_pago = String(formData.get('fecha_pago') ?? '').trim()

  // Si al pagar (a credito) el proveedor tambien retiene, se puede
  // ajustar aqui. Por defecto usa lo que ya tenga la factura.
  const retencionManual = formData.has('retencion_total_pago')
    ? montoDesdeCampo(formData.get('retencion_total_pago'))
    : null

  if (!factura_id) return { ok: false, mensaje: 'Factura no valida.' }
  if (!fecha_pago) return { ok: false, mensaje: 'Ingresa la fecha de pago.' }

  try {
    const supabase = createServerSupabaseClient()

    const { data: factura } = await supabase
      .from('facturas_compra')
      .select('numero_factura, total, retencion_total, estado')
      .eq('id', factura_id)
      .single()

    if (!factura) return { ok: false, mensaje: 'Factura no encontrada.' }
    if (factura.estado === 'PAGADA') return { ok: false, mensaje: 'La factura ya esta pagada.' }
    if (factura.estado === 'ANULADA') return { ok: false, mensaje: 'La factura esta anulada.' }

    const total = Number(factura.total)
    const retencion = retencionManual ?? Number(factura.retencion_total ?? 0)
    const neto = Math.max(total - retencion, 0)

    if (retencion > 0 && retencionManual !== null) {
      // Si se ajusto manualmente, guardar el nuevo total_neto en la factura
      await supabase.from('facturas_compra').update({ estado: 'PAGADA', retencion_total: retencion }).eq('id', factura_id)
    } else {
      await supabase.from('facturas_compra').update({ estado: 'PAGADA' }).eq('id', factura_id)
    }

    revalidatePath('/compras')
    revalidatePath('/financiero')
    revalidatePath('/panel')

    const avisoRetencion = retencion > 0
      ? ` (Neto tras retener ${fmt.format(retencion)}, pasivo pendiente con la DIAN.)`
      : ''

    return {
      ok: true,
      mensaje: `Pago registrado: ${fmt.format(neto)} a ${factura.numero_factura}.${avisoRetencion}`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al pagar.' }
  }
}


// ============================================================
// EDITAR SOLO DATOS DE CABECERA (proveedor, numero, fecha, PDF)
// No toca items ni asignaciones: es el caso comun de corregir
// un numero de factura o adjuntar el PDF despues.
// ============================================================
export async function editarDatosFacturaCompra(formData: FormData): Promise<ResultadoAccion> {
  uppercaseFormData(formData)
  const factura_id = String(formData.get('factura_id') ?? '').trim()
  const proveedor_id = String(formData.get('proveedor_id') ?? '').trim()
  const numero_factura = String(formData.get('numero_factura') ?? '').trim()
  const fecha_factura = String(formData.get('fecha_factura') ?? '').trim()
  const forma_pago = String(formData.get('forma_pago') ?? '').trim()
  const notas = String(formData.get('notas') ?? '').trim()
  const soporte_url = String(formData.get('soporte_url') ?? '').trim()
  const soporte_nombre = String(formData.get('soporte_nombre') ?? '').trim()

  if (!factura_id) return { ok: false, mensaje: 'Factura no valida.' }

  try {
    const supabase = createServerSupabaseClient()

    const { data: actual } = await supabase
      .from('facturas_compra')
      .select('estado, numero_factura')
      .eq('id', factura_id)
      .single()

    if (!actual) return { ok: false, mensaje: 'Factura no encontrada.' }
    if (actual.estado === 'ANULADA') return { ok: false, mensaje: 'No se puede editar una factura anulada.' }

    const cambios: Record<string, unknown> = {}
    if (proveedor_id) cambios.proveedor_id = proveedor_id
    if (numero_factura) cambios.numero_factura = numero_factura
    if (notas) cambios.notas = notas
    if (soporte_url) cambios.soporte_url = soporte_url

    if (fecha_factura) {
      cambios.fecha_factura = fecha_factura
      if (forma_pago) {
        const dias = diasDeFormaPago(forma_pago)
        cambios.forma_pago = forma_pago
        cambios.dias_credito = dias
        if (dias > 0) {
          const d = new Date(fecha_factura)
          d.setDate(d.getDate() + dias)
          cambios.fecha_vencimiento = d.toISOString().slice(0, 10)
        } else {
          cambios.fecha_vencimiento = null
        }
      }
    }

    if (Object.keys(cambios).length === 0) {
      return { ok: false, mensaje: 'No hay cambios para guardar.' }
    }

    const { error } = await supabase.from('facturas_compra').update(cambios).eq('id', factura_id)
    if (error) return { ok: false, mensaje: error.message }

    if (soporte_url) {
      await supabase.from('documentos').insert({
        entidad_tipo: 'FACTURA_COMPRA',
        entidad_id: factura_id,
        tipo_documento: 'FACTURA',
        nombre_archivo: soporte_nombre || 'factura_compra.pdf',
        url_archivo: soporte_url,
      })
    }

    revalidatePath('/compras')
    return { ok: true, mensaje: 'Factura actualizada correctamente.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al editar.' }
  }
}



// ============================================================
// CARGAR EL DETALLE DE UNA FACTURA PARA EDITARLA
// Se llama desde el cliente al abrir el modal de edicion.
// ============================================================
export async function cargarFacturaParaEditar(factura_id: string) {
  if (!factura_id) return null
  return obtenerFacturaCompraDetalle(factura_id)
}



// ============================================================
// SOLICITUDES DE COMPRA: CERRAR A MANO
// ============================================================
// El cierre automatico depende de que la compra se asigne a la venta
// (o de que haya stock suficiente). Pero hay casos legitimos donde eso
// nunca va a pasar:
//   - se compro el producto en efectivo y no se registro la factura
//   - el cliente cambio de producto
//   - la solicitud se genero por error (producto duplicado en catalogo)
//   - se decidio no comprar
//
// Sin una salida manual, esas solicitudes se quedaban en pantalla PARA
// SIEMPRE, sin ninguna forma de sacarlas. Estas dos acciones son esa
// salida.
// ============================================================

/** Marca la solicitud como ya comprada, sin pasar por la factura. */
export async function marcarSolicitudComprada(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'Solicitud no valida.' }

  try {
    const supabase = createServerSupabaseClient()
    const usuario = await obtenerNombreUsuarioActual()

    const { data: sol } = await supabase
      .from('solicitudes_compra')
      .select('id, estado, cantidad_a_comprar, productos(nombre)')
      .eq('id', id)
      .maybeSingle()

    if (!sol) return { ok: false, mensaje: 'La solicitud ya no existe.' }
    if (sol.estado === 'COMPRADO') {
      return { ok: true, mensaje: 'Esa solicitud ya estaba cerrada.' }
    }

    const prod = sol.productos as { nombre?: string } | null

    const { error } = await supabase
      .from('solicitudes_compra')
      .update({
        estado: 'COMPRADO',
        notas: `Cerrada manualmente por ${usuario.nombre}. No se cruzo con una factura de compra, asi que el costo de esta venta puede quedar incompleto.`,
      })
      .eq('id', id)

    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/compras')
    revalidatePath('/ventas')
    return {
      ok: true,
      mensaje: `${prod?.nombre ?? 'Solicitud'} marcada como comprada. Recuerda: si no registras la factura de compra, la utilidad de esa venta va a salir mas alta de lo real.`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al cerrar la solicitud.' }
  }
}

/** Cancela la solicitud: ya no se va a comprar. */
export async function cancelarSolicitudCompra(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get('id') ?? '').trim()
  const motivo = String(formData.get('motivo') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'Solicitud no valida.' }

  try {
    const supabase = createServerSupabaseClient()
    const usuario = await obtenerNombreUsuarioActual()

    const { data: sol } = await supabase
      .from('solicitudes_compra')
      .select('id, estado, productos(nombre)')
      .eq('id', id)
      .maybeSingle()

    if (!sol) return { ok: false, mensaje: 'La solicitud ya no existe.' }
    if (sol.estado === 'CANCELADO') {
      return { ok: true, mensaje: 'Esa solicitud ya estaba cancelada.' }
    }

    const prod = sol.productos as { nombre?: string } | null

    const { error } = await supabase
      .from('solicitudes_compra')
      .update({
        estado: 'CANCELADO',
        notas: `Cancelada por ${usuario.nombre}${motivo ? `: ${motivo}` : '.'}`,
      })
      .eq('id', id)

    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/compras')
    revalidatePath('/ventas')
    return { ok: true, mensaje: `Solicitud de ${prod?.nombre ?? 'producto'} cancelada.` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al cancelar la solicitud.' }
  }
}

/**
 * Barre TODAS las solicitudes abiertas y cierra las que ya tienen stock.
 * Se puede llamar desde el boton "Revisar solicitudes" de la pantalla de
 * Compras, para limpiar de una vez las que quedaron colgadas de compras
 * viejas que entraron como STOCK.
 */
export async function revisarSolicitudesPendientes(): Promise<ResultadoAccion> {
  try {
    const supabase = createServerSupabaseClient()
    const cerradas = await cerrarSolicitudesCubiertasPorStock(supabase)

    revalidatePath('/compras')
    revalidatePath('/ventas')

    return {
      ok: true,
      mensaje: cerradas > 0
        ? `${cerradas} solicitud${cerradas !== 1 ? 'es' : ''} cerrada${cerradas !== 1 ? 's' : ''}: el producto ya estaba en inventario.`
        : 'Ninguna solicitud se pudo cerrar: los productos que faltan todavia no estan en inventario. Si ya los compraste, registra la factura de compra o cierrala a mano.',
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al revisar.' }
  }
}
