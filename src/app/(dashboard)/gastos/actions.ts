'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { uppercaseFormData, leerBandera } from '@/lib/uppercase'
import { obtenerNombreUsuarioActual } from '@/lib/queries/perfil'
import { recalcularCostoCotizacion } from '@/lib/queries/costeo'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

function monto(v: FormDataEntryValue | null): number {
  return Number(String(v ?? '0').replace(/\./g, '').replace(',', '.')) || 0
}

const _fmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
})

function fmtCop(v: number): string {
  return _fmt.format(v)
}

// ============================================================
// REGISTRAR GASTO
// Puede ser:
//   - Gasto operativo general (arriendo, dominio, etc.)
//   - Costo de una venta especifica (flete, mano de obra)
// Si no hay factura, genera Documento Soporte para que sea deducible.
// ============================================================
export async function registrarGasto(formData: FormData): Promise<ResultadoAccion> {
  uppercaseFormData(formData)

  const concepto = String(formData.get('concepto') ?? '').trim()
  const valor = monto(formData.get('monto'))
  const iva_incluido = monto(formData.get('iva_incluido'))
  const fecha = String(formData.get('fecha') ?? '').trim() || new Date().toISOString().slice(0, 10)
  const categoria = String(formData.get('categoria') ?? 'OTROS').trim()
  const proveedor_id = String(formData.get('proveedor_id') ?? '').trim()

  /**
   * ACTIVO FIJO.
   *
   * La impresora sale del banco igual que cualquier gasto, y por eso hay
   * que registrarla o el saldo del ERP no cuadra con el extracto. Pero NO
   * es un gasto del periodo: la empresa cambio plata por una cosa que
   * sigue valiendo. La vista posicion_financiera ya la excluye de
   * gastos_operativos y la reporta aparte como inversion.
   *
   * MANTENIMIENTO_ACTIVO si es gasto del periodo, pero queda amarrado al
   * activo para saber cuanto ha costado mantener ese equipo.
   */
  const esActivoFijo = categoria === 'ACTIVO_FIJO'
  const esMantenimiento = categoria === 'MANTENIMIENTO_ACTIVO'
  const activo_nombre = String(formData.get('activo_nombre') ?? '').trim()
  const activo_serie = String(formData.get('activo_serie') ?? '').trim()
  const activo_garantia_meses = Number(String(formData.get('activo_garantia_meses') ?? '')) || null
  const activo_vida_util_meses = Number(String(formData.get('activo_vida_util_meses') ?? '')) || null
  const activo_padre_id = String(formData.get('activo_padre_id') ?? '').trim()

  /**
   * REPARTO DEL GASTO ENTRE VARIAS VENTAS.
   *
   * Caso real: un flete de 45.000 entrego 3 pedidos. El documento soporte
   * se emite UNA sola vez por los 45.000 (que es lo correcto ante la DIAN)
   * y el costo se divide entre las 3 ventas.
   *
   * Antes gastos.cotizacion_id era UNA sola venta, asi que para repartir
   * tocaba crear tres gastos de 15.000: tres documentos donde hubo uno.
   *
   * cotizacion_id se sigue guardando con la PRIMERA venta del reparto, por
   * compatibilidad con lo que ya lee ese campo.
   */
  let reparto: { cotizacion_id: string; monto: number }[] = []
  try {
    const parsed = JSON.parse(String(formData.get('reparto') ?? '[]'))
    if (Array.isArray(parsed)) {
      reparto = parsed
        .filter((r) => r && typeof r.cotizacion_id === 'string' && Number(r.monto) > 0)
        .map((r) => ({ cotizacion_id: String(r.cotizacion_id), monto: Number(r.monto) }))
    }
  } catch {
    reparto = []
  }
  const totalRepartido = reparto.reduce((s, r) => s + r.monto, 0)
  const cotizacion_id = reparto[0]?.cotizacion_id ?? ''
  // Si hay ventas asignadas, ES un costo de venta, diga lo que diga la
  // bandera. Asi el vinculo no se puede perder por un valor mal leido.
  const es_costo_venta = leerBandera(formData.get('es_costo_venta')) || reparto.length > 0
  const tipo_soporte = String(formData.get('tipo_soporte') ?? 'NINGUNO').trim()
  const soporte_url = String(formData.get('soporte_url') ?? '').trim()

  // Datos del tercero (para documento soporte)
  const tercero_nombre = String(formData.get('tercero_nombre') ?? '').trim()
  const tercero_documento = String(formData.get('tercero_documento') ?? '').trim()
  const tercero_tipo_documento = String(formData.get('tercero_tipo_documento') ?? 'CC').trim()
  const tercero_telefono = String(formData.get('tercero_telefono') ?? '').trim()
  const tercero_direccion = String(formData.get('tercero_direccion') ?? '').trim()

  if (!concepto) return { ok: false, mensaje: 'El concepto es obligatorio.' }
  if (valor <= 0) return { ok: false, mensaje: 'El monto debe ser mayor a cero.' }
  if (iva_incluido > valor) return { ok: false, mensaje: 'El IVA no puede ser mayor al monto total.' }
  if (es_costo_venta && reparto.length === 0) {
    return { ok: false, mensaje: 'Si es costo de una venta, elige al menos una venta y ponle el monto que le corresponde.' }
  }
  if (esActivoFijo && es_costo_venta) {
    return { ok: false, mensaje: 'Un activo fijo no puede ser costo de una venta: no se consumio para cumplir un pedido, se quedo en la empresa.' }
  }
  if (esMantenimiento && !activo_padre_id) {
    return { ok: false, mensaje: 'Elige a que activo le hiciste el mantenimiento, para que quede el historial de ese equipo.' }
  }
  // No se puede repartir mas de lo que costo el gasto
  if (es_costo_venta && totalRepartido - valor > 1) {
    return {
      ok: false,
      mensaje: `Estas repartiendo ${fmtCop(totalRepartido)} entre las ventas pero el gasto es de ${fmtCop(valor)}. No puedes repartir mas de lo que costo.`,
    }
  }
  if (tipo_soporte === 'DOCUMENTO_SOPORTE' && (!tercero_nombre || !tercero_documento)) {
    return { ok: false, mensaje: 'Para el documento soporte necesitas el nombre y el documento del tercero.' }
  }

  // Es deducible si hay factura del proveedor o documento soporte
  const tieneFactura = tipo_soporte === 'FACTURA'
  const haraDocSoporte = tipo_soporte === 'DOCUMENTO_SOPORTE'
  const deducible = tieneFactura || haraDocSoporte
  const tiene_soporte = deducible

  try {
    const supabase = createServerSupabaseClient()
    const usuario = await obtenerNombreUsuarioActual()

    const { data: gasto, error } = await supabase
      .from('gastos')
      .insert({
        concepto,
        monto: valor,
        iva_incluido,
        fecha,
        categoria,
        cotizacion_id: cotizacion_id || null,
        proveedor_id: proveedor_id || null,
        es_costo_venta,
        tiene_soporte,
        deducible,
        tercero_nombre: tercero_nombre || null,
        tercero_documento: tercero_documento || null,
        pagado_por: formData.get('pagado_por') || null,
        forma_pago: formData.get('forma_pago') || 'Efectivo',
        soporte_url: soporte_url || null,
        notas: formData.get('notas') || null,
        // Datos del activo. Si no es activo ni mantenimiento van en null.
        activo_nombre: esActivoFijo ? (activo_nombre || concepto) : null,
        activo_serie: esActivoFijo ? (activo_serie || null) : null,
        activo_garantia_meses: esActivoFijo ? activo_garantia_meses : null,
        activo_vida_util_meses: esActivoFijo ? activo_vida_util_meses : null,
        activo_estado: esActivoFijo ? 'EN_USO' : null,
        activo_padre_id: esMantenimiento ? (activo_padre_id || null) : null,
      })
      .select('id')
      .single()

    if (error) return { ok: false, mensaje: error.message }

    // Generar documento soporte si corresponde
    let numeroDS: string | null = null
    if (haraDocSoporte) {
      const { data: ds, error: errDs } = await supabase
        .from('documentos_soporte')
        .insert({
          fecha,
          tercero_nombre,
          tercero_tipo_documento,
          tercero_documento,
          tercero_telefono: tercero_telefono || null,
          tercero_direccion: tercero_direccion || null,
          concepto,
          cantidad: 1,
          valor_unitario: valor,
          // Solo se amarra a una venta si el gasto va a UNA sola. Si se
          // reparte entre varias, la pertenencia se lee de gasto_reparto:
          // dejarlo apuntando a una sola hacia que el documento apareciera
          // en una venta y desapareciera de las otras.
          cotizacion_id: reparto.length === 1 ? reparto[0].cotizacion_id : null,
          gasto_id: gasto.id,
          creado_por_id: usuario.id,
          creado_por_nombre: usuario.nombre,
        })
        .select('id, numero')
        .single()

      if (errDs) {
        return { ok: false, mensaje: `Gasto guardado pero fallo el documento soporte: ${errDs.message}` }
      }

      numeroDS = ds.numero as string
      await supabase.from('gastos').update({ documento_soporte_id: ds.id }).eq('id', gasto.id)
    }

    // Adjuntar soporte al repositorio de documentos
    if (soporte_url) {
      await supabase.from('documentos').insert({
        entidad_tipo: 'GASTO',
        entidad_id: gasto.id,
        tipo_documento: tieneFactura ? 'FACTURA' : 'SOPORTE_PAGO',
        nombre_archivo: String(formData.get('soporte_nombre') ?? 'soporte_gasto.pdf'),
        url_archivo: soporte_url,
      })
    }

    // Guardar el reparto: una fila por venta.
    // Si esto falla, el gasto ya quedo creado pero sin llegar a ninguna
    // venta, asi que hay que avisarlo y no dejarlo pasar en silencio.
    let avisoReparto = ''
    if (es_costo_venta && reparto.length > 0) {
      const { error: errReparto } = await supabase.from('gasto_reparto').insert(
        reparto.map((r) => ({
          gasto_id: gasto.id,
          cotizacion_id: r.cotizacion_id,
          monto: r.monto,
        })),
      )
      if (errReparto) {
        avisoReparto = ` OJO: el gasto quedo registrado pero NO se pudo repartir entre las ventas (${errReparto.message}). Ese costo no esta entrando a ninguna venta.`
      } else {
        // Recalcular la utilidad de TODAS las ventas afectadas
        for (const r of reparto) {
          await recalcularCostoCotizacion(supabase, r.cotizacion_id)
          revalidatePath(`/ventas/${r.cotizacion_id}`)
        }
      }
    }

    revalidatePath('/gastos')
    revalidatePath('/ventas')
    revalidatePath('/panel')

    const partes = [esActivoFijo ? 'Activo fijo registrado.' : 'Gasto registrado.']
    if (esActivoFijo) {
      partes.push(`Salieron ${fmtCop(valor)} de la cuenta y quedo en el listado de activos fijos. NO se cuenta como gasto del mes: es una inversion.`)
    }
    if (esMantenimiento) {
      partes.push('Cargado al historial de mantenimiento de ese activo.')
    }
    if (numeroDS) partes.push(`Documento soporte ${numeroDS} generado.`)
    if (!deducible) partes.push('Sin soporte: NO es deducible de impuestos.')
    if (es_costo_venta && reparto.length === 1) {
      partes.push('Imputado al costo de la venta.')
    } else if (es_costo_venta && reparto.length > 1) {
      partes.push(`Costo repartido entre ${reparto.length} ventas.`)
      const sinRepartir = valor - totalRepartido
      if (sinRepartir > 1) {
        partes.push(`Quedaron ${fmtCop(sinRepartir)} sin repartir: ese costo no entra a ninguna venta.`)
      }
    }
    if (avisoReparto) partes.push(avisoReparto)

    return { ok: true, mensaje: partes.join(' ') }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}

// ============================================================
// ELIMINAR GASTO
// ============================================================
export async function eliminarGasto(formData: FormData): Promise<ResultadoAccion> {
  const gasto_id = String(formData.get('gasto_id') ?? '').trim()
  if (!gasto_id) return { ok: false, mensaje: 'Gasto no valido.' }

  try {
    const supabase = createServerSupabaseClient()

    const { data: gasto } = await supabase
      .from('gastos')
      .select('cotizacion_id, es_costo_venta, concepto')
      .eq('id', gasto_id)
      .single()

    if (!gasto) return { ok: false, mensaje: 'Gasto no encontrado.' }

    // Antes de borrar el gasto, capturar las ventas que se afectan.
    // gasto_reparto cae por el ON DELETE CASCADE del gasto, pero
    // necesitamos los IDs para recalcular TODAS las ventas impactadas,
    // no solo la del campo viejo cotizacion_id.
    const { data: repartoAntes } = await supabase
      .from('gasto_reparto')
      .select('cotizacion_id')
      .eq('gasto_id', gasto_id)

    const ventasAfectadas = Array.from(
      new Set([
        ...(repartoAntes ?? []).map((r) => r.cotizacion_id as string),
        gasto.cotizacion_id ? String(gasto.cotizacion_id) : '',
      ].filter(Boolean)),
    )

    await supabase.from('documentos_soporte').delete().eq('gasto_id', gasto_id)
    await supabase.from('documentos').delete().eq('entidad_tipo', 'GASTO').eq('entidad_id', gasto_id)

    const { error } = await supabase.from('gastos').delete().eq('id', gasto_id)
    if (error) return { ok: false, mensaje: error.message }

    // Recalcular TODAS las ventas que tenian parte de este costo
    for (const cid of ventasAfectadas) {
      await recalcularCostoCotizacion(supabase, cid)
      revalidatePath(`/ventas/${cid}`)
    }

    revalidatePath('/gastos')
    revalidatePath('/panel')

    return { ok: true, mensaje: `Gasto "${gasto.concepto}" eliminado.` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}

// ============================================================
// COMPLETAR DOCUMENTO SOPORTE DE UN GASTO EXISTENTE
// Para cuando se consiguen los datos del tercero despues
// ============================================================
export async function completarDocumentoSoporte(formData: FormData): Promise<ResultadoAccion> {
  uppercaseFormData(formData)
  const gasto_id = String(formData.get('gasto_id') ?? '').trim()
  const tercero_nombre = String(formData.get('tercero_nombre') ?? '').trim()
  const tercero_documento = String(formData.get('tercero_documento') ?? '').trim()
  const tercero_tipo_documento = String(formData.get('tercero_tipo_documento') ?? 'CC').trim()
  const tercero_telefono = String(formData.get('tercero_telefono') ?? '').trim()
  const tercero_direccion = String(formData.get('tercero_direccion') ?? '').trim()

  if (!gasto_id) return { ok: false, mensaje: 'Gasto no valido.' }
  if (!tercero_nombre || !tercero_documento) {
    return { ok: false, mensaje: 'Nombre y documento del tercero son obligatorios.' }
  }

  try {
    const supabase = createServerSupabaseClient()
    const usuario = await obtenerNombreUsuarioActual()

    const { data: gasto } = await supabase
      .from('gastos')
      .select('id, concepto, monto, fecha, cotizacion_id, documento_soporte_id')
      .eq('id', gasto_id)
      .single()

    if (!gasto) return { ok: false, mensaje: 'Gasto no encontrado.' }
    if (gasto.documento_soporte_id) {
      return { ok: false, mensaje: 'Este gasto ya tiene documento soporte.' }
    }

    const { data: ds, error } = await supabase
      .from('documentos_soporte')
      .insert({
        fecha: gasto.fecha,
        tercero_nombre,
        tercero_tipo_documento,
        tercero_documento,
        tercero_telefono: tercero_telefono || null,
        tercero_direccion: tercero_direccion || null,
        concepto: gasto.concepto,
        cantidad: 1,
        valor_unitario: gasto.monto,
        cotizacion_id: gasto.cotizacion_id,
        gasto_id: gasto.id,
        creado_por_id: usuario.id,
        creado_por_nombre: usuario.nombre,
      })
      .select('id, numero')
      .single()

    if (error) return { ok: false, mensaje: error.message }

    await supabase
      .from('gastos')
      .update({
        documento_soporte_id: ds.id,
        tiene_soporte: true,
        deducible: true,
        tercero_nombre,
        tercero_documento,
      })
      .eq('id', gasto_id)

    revalidatePath('/gastos')
    if (gasto.cotizacion_id) revalidatePath(`/ventas/${gasto.cotizacion_id}`)

    return { ok: true, mensaje: `Documento soporte ${ds.numero} generado. El gasto ya es deducible.` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}



// ============================================================
// CARGAR UN GASTO PARA EDITARLO
// ============================================================
export interface GastoDetalle {
  id: string
  concepto: string
  monto: number
  iva_incluido: number
  fecha: string
  categoria: string
  cotizacion_id: string | null
  es_costo_venta: boolean
  deducible: boolean
  tiene_soporte: boolean
  tercero_nombre: string | null
  tercero_documento: string | null
  pagado_por: string | null
  forma_pago: string | null
  notas: string | null
  soporte_url: string | null
  cuenta_id: string | null
  tiene_documento_soporte: boolean
  /** Las ventas a las que esta repartido, con su monto */
  reparto: { cotizacion_id: string; monto: number }[]
}

export async function cargarGastoParaEditar(gasto_id: string): Promise<GastoDetalle | null> {
  if (!gasto_id) return null
  try {
    const supabase = createServerSupabaseClient()

    const { data: g } = await supabase
      .from('gastos')
      .select('*')
      .eq('id', gasto_id)
      .maybeSingle()

    if (!g) return null

    // Tiene documento soporte generado?
    const { data: ds } = await supabase
      .from('documentos_soporte')
      .select('id')
      .eq('gasto_id', gasto_id)
      .limit(1)
      .maybeSingle()

    // El reparto entre ventas (puede tener 0, 1 o N filas)
    const { data: repartoData } = await supabase
      .from('gasto_reparto')
      .select('cotizacion_id, monto')
      .eq('gasto_id', gasto_id)
      .order('created_at', { ascending: true })

    const reparto = (repartoData ?? []).map((r) => ({
      cotizacion_id: String(r.cotizacion_id),
      monto: Number(r.monto ?? 0),
    }))

    return {
      id: String(g.id),
      concepto: String(g.concepto ?? ''),
      monto: Number(g.monto ?? 0),
      iva_incluido: Number(g.iva_incluido ?? 0),
      fecha: String(g.fecha ?? '').slice(0, 10),
      categoria: String(g.categoria ?? 'OTROS'),
      cotizacion_id: (g.cotizacion_id as string | null) ?? null,
      es_costo_venta: Boolean(g.es_costo_venta),
      deducible: Boolean(g.deducible),
      tiene_soporte: Boolean(g.tiene_soporte),
      tercero_nombre: (g.tercero_nombre as string | null) ?? null,
      tercero_documento: (g.tercero_documento as string | null) ?? null,
      pagado_por: (g.pagado_por as string | null) ?? null,
      forma_pago: (g.forma_pago as string | null) ?? null,
      notas: (g.notas as string | null) ?? null,
      soporte_url: (g.soporte_url as string | null) ?? null,
      cuenta_id: null,
      tiene_documento_soporte: Boolean(ds),
      reparto,
    }
  } catch {
    return null
  }
}


// ============================================================
// EDITAR GASTO
// Corrige monto, concepto, fecha, categoria y a que venta se imputa.
// Sincroniza el movimiento de caja: si cambia el monto o la cuenta, la
// salida de dinero se ajusta para que el saldo del banco cuadre.
// ============================================================
export async function editarGasto(formData: FormData): Promise<ResultadoAccion> {
  uppercaseFormData(formData)

  const gasto_id = String(formData.get('gasto_id') ?? '').trim()
  const concepto = String(formData.get('concepto') ?? '').trim()
  const valor = monto(formData.get('monto'))
  const iva_incluido = monto(formData.get('iva_incluido'))
  const fecha = String(formData.get('fecha') ?? '').trim()
  const categoria = String(formData.get('categoria') ?? 'OTROS').trim()
  const cotizacion_id = String(formData.get('cotizacion_id') ?? '').trim()
  const banderaCostoVenta = leerBandera(formData.get('es_costo_venta'))

  // Reparto multiple (nuevo)
  let reparto: { cotizacion_id: string; monto: number }[] = []
  try {
    const parsed = JSON.parse(String(formData.get('reparto') ?? '[]'))
    if (Array.isArray(parsed)) {
      reparto = parsed
        .filter((r: unknown) => r && typeof (r as { cotizacion_id?: string }).cotizacion_id === 'string' && Number((r as { monto?: number }).monto) > 0)
        .map((r: unknown) => ({ cotizacion_id: String((r as { cotizacion_id: string }).cotizacion_id), monto: Number((r as { monto: number }).monto) }))
    }
  } catch { /* ignora JSON invalido */ }
  if (reparto.length === 0 && banderaCostoVenta && cotizacion_id) {
    reparto = [{ cotizacion_id, monto: valor }]
  }

  // Si hay ventas asignadas, ES un costo de venta, diga lo que diga la
  // bandera. Antes esta linea daba false y mas abajo se BORRABA el
  // reparto sin volverlo a crear: cada edicion destruia el vinculo con
  // la venta, por eso "volver a asignarla" no arreglaba nada.
  const es_costo_venta = banderaCostoVenta || reparto.length > 0

  const notas = String(formData.get('notas') ?? '').trim()

  if (!gasto_id) return { ok: false, mensaje: 'Gasto no valido.' }
  if (!concepto) return { ok: false, mensaje: 'El concepto es obligatorio.' }
  if (valor <= 0) return { ok: false, mensaje: 'El monto debe ser mayor a cero.' }
  if (iva_incluido > valor) return { ok: false, mensaje: 'El IVA no puede ser mayor al monto total.' }
  if (es_costo_venta && reparto.length === 0) {
    return { ok: false, mensaje: 'Si es costo de una venta, elige al menos una venta.' }
  }

  try {
    const supabase = createServerSupabaseClient()

    // Estado anterior, para saber que recalcular
    const { data: antes } = await supabase
      .from('gastos')
      .select('monto, cotizacion_id, es_costo_venta')
      .eq('id', gasto_id)
      .maybeSingle()

    if (!antes) return { ok: false, mensaje: 'Gasto no encontrado.' }

    const cotizacionAnterior = (antes.cotizacion_id as string | null) ?? null

    // 1. Actualizar el gasto
    const { error: errUpd } = await supabase
      .from('gastos')
      .update({
        concepto,
        monto: valor,
        iva_incluido,
        fecha,
        categoria,
        cotizacion_id: es_costo_venta ? cotizacion_id : null,
        es_costo_venta,
        notas: notas || null,
      })
      .eq('id', gasto_id)

    if (errUpd) return { ok: false, mensaje: errUpd.message }

    /**
     * 2.b SINCRONIZAR EL DOCUMENTO SOPORTE.
     *
     * ERROR QUE ESTO ARREGLA: editarGasto cambiaba el monto, la fecha y el
     * concepto del gasto pero no tocaba su documento soporte. Quedaba un
     * documento ante la DIAN declarando una cifra y el gasto diciendo otra.
     *
     * Y el cotizacion_id del DS se quedaba clavado en la venta original,
     * asi que el documento seguia apareciendo en una venta a la que ya no
     * pertenecia (fue el caso del DS-2026-002 en la COT-2026-013).
     *
     * La regla: ese campo solo tiene sentido si el gasto va a UNA venta.
     * Si se reparte entre varias, queda en null y la pertenencia se lee de
     * gasto_reparto, que es la verdad.
     */
    const cotizacionDelDs = es_costo_venta && reparto.length === 1
      ? reparto[0].cotizacion_id
      : null

    await supabase
      .from('documentos_soporte')
      .update({
        cantidad: 1,
        valor_unitario: valor,   // el trigger recalcula el subtotal
        fecha,
        concepto,
        cotizacion_id: cotizacionDelDs,
      })
      .eq('gasto_id', gasto_id)

    // 3. Borrar el reparto anterior y crear el nuevo.
    // Las ventas anteriores Y las nuevas se recalculan.
    const { data: repartoAnterior } = await supabase
      .from('gasto_reparto')
      .select('cotizacion_id')
      .eq('gasto_id', gasto_id)

    await supabase.from('gasto_reparto').delete().eq('gasto_id', gasto_id)

    if (es_costo_venta && reparto.length > 0) {
      await supabase.from('gasto_reparto').insert(
        reparto.map((r) => ({ gasto_id, cotizacion_id: r.cotizacion_id, monto: r.monto })),
      )
    }

    const porRecalcular = new Set<string>()
    if (cotizacionAnterior) porRecalcular.add(cotizacionAnterior)
    for (const r of repartoAnterior ?? []) {
      if (r.cotizacion_id) porRecalcular.add(String(r.cotizacion_id))
    }
    for (const r of reparto) porRecalcular.add(r.cotizacion_id)

    for (const cid of Array.from(porRecalcular)) {
      await recalcularCostoCotizacion(supabase, cid)
      revalidatePath(`/ventas/${cid}`)
    }

    revalidatePath('/gastos')
    revalidatePath('/ventas')
    revalidatePath('/panel')
    revalidatePath('/')

    return {
      ok: true,
      mensaje: `Gasto actualizado: ${fmtCop(valor)}.`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al editar.' }
  }
}



// ============================================================
// CREAR EL TERCERO SIN SALIR DEL FORMULARIO DE GASTO
// ============================================================
// Para el documento soporte hacen falta nombre, tipo y numero de
// documento del tercero. Si ese tercero no existe todavia, antes tocaba
// abandonar el gasto, irse a Proveedores, crearlo, y volver a empezar.
//
// Esta accion lo crea desde el mismo formulario y devuelve el registro
// completo, para que el formulario lo agregue a su lista, lo seleccione y
// llene los campos del documento soporte de una sola vez.
//
// Se guarda como proveedor porque es lo que es: alguien a quien le
// compramos. Que sea persona natural no obligada a facturar no lo hace
// una entidad distinta, solo cambia el soporte que se emite.
export interface TerceroCreado {
  id: string
  razon_social: string
  nit: string | null
  tipo_documento: string | null
  contacto_telefono: string | null
  direccion: string | null
  ciudad: string | null
}

const TIPOS_DOC_VALIDOS = ['CC', 'CE', 'NIT', 'PASAPORTE', 'PEP'] as const

export async function crearTerceroParaSoporte(formData: FormData): Promise<{
  ok: boolean
  mensaje: string
  tercero?: TerceroCreado
}> {
  const razon_social = String(formData.get('razon_social') ?? '').trim()
  const documento = String(formData.get('documento') ?? '').trim()
  const tipoRaw = String(formData.get('tipo_documento') ?? 'CC').trim().toUpperCase()
  const telefono = String(formData.get('telefono') ?? '').trim()
  const direccion = String(formData.get('direccion') ?? '').trim()
  const ciudad = String(formData.get('ciudad') ?? '').trim()

  if (!razon_social) return { ok: false, mensaje: 'El nombre del tercero es obligatorio.' }
  if (!documento) return { ok: false, mensaje: 'El numero de documento es obligatorio para el documento soporte.' }

  const tipo_documento = (TIPOS_DOC_VALIDOS as readonly string[]).includes(tipoRaw) ? tipoRaw : 'CC'

  try {
    const supabase = createServerSupabaseClient()

    // No crear dos veces el mismo tercero. Se busca por documento, que es
    // lo unico que de verdad lo identifica: el nombre se escribe distinto
    // cada vez (con tildes, abreviado, en mayusculas).
    const { data: existente } = await supabase
      .from('proveedores')
      .select('id, razon_social, nit, tipo_documento, contacto_telefono, direccion, ciudad')
      .eq('nit', documento)
      .limit(1)
      .maybeSingle()

    if (existente) {
      return {
        ok: true,
        mensaje: `${existente.razon_social} ya estaba registrado con ese documento. Se selecciono.`,
        tercero: {
          id: String(existente.id),
          razon_social: String(existente.razon_social ?? ''),
          nit: (existente.nit as string | null) ?? null,
          tipo_documento: (existente.tipo_documento as string | null) ?? null,
          contacto_telefono: (existente.contacto_telefono as string | null) ?? null,
          direccion: (existente.direccion as string | null) ?? null,
          ciudad: (existente.ciudad as string | null) ?? null,
        },
      }
    }

    const { data, error } = await supabase
      .from('proveedores')
      .insert({
        razon_social,
        nit: documento,
        tipo_documento,
        contacto_telefono: telefono || null,
        direccion: direccion || null,
        ciudad: ciudad || null,
        estado: 'ACTIVO',
        notas: tipo_documento === 'CC' || tipo_documento === 'CE'
          ? 'Persona natural. Creado desde un gasto con documento soporte.'
          : 'Creado desde un gasto con documento soporte.',
      })
      .select('id, razon_social, nit, tipo_documento, contacto_telefono, direccion, ciudad')
      .single()

    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/gastos')
    revalidatePath('/proveedores')

    return {
      ok: true,
      mensaje: `${razon_social} creado y seleccionado.`,
      tercero: {
        id: String(data.id),
        razon_social: String(data.razon_social ?? ''),
        nit: (data.nit as string | null) ?? null,
        tipo_documento: (data.tipo_documento as string | null) ?? null,
        contacto_telefono: (data.contacto_telefono as string | null) ?? null,
        direccion: (data.direccion as string | null) ?? null,
        ciudad: (data.ciudad as string | null) ?? null,
      },
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al crear el tercero.' }
  }
}


// ============================================================
// REPARAR LOS GASTOS QUE NUNCA LLEGARON A SU VENTA
// ============================================================
//
// POR QUE EXISTE ESTO
// Durante un tiempo, al asignarle una venta a un gasto, la bandera
// es_costo_venta se corrompia al guardar ('true' se volvia 'TRUE') y la
// comparacion fallaba. Resultado: el gasto quedaba como operativo, el
// vinculo con la venta (gasto_reparto) NUNCA se creaba, y el informe de
// la cotizacion no mostraba ese costo. La utilidad y el margen de esas
// ventas quedaron INFLADOS.
//
// La causa ya esta corregida. Esto repara lo que quedo mal ANTES, sin
// tener que correr nada a mano en la base de datos.
//
// Se apoya en gastos.cotizacion_id, que si se alcanzaba a guardar.
// Reutiliza recalcularCostoCotizacion (la misma funcion que usa todo el
// resto del sistema) para que la utilidad quede identica a la del
// informe y no haya dos verdades.

export interface GastoPorReparar {
  id: string
  concepto: string
  monto: number
  cotizacion_numero: string | null
}

export interface DiagnosticoGastos {
  /** Gastos que SI se pueden reparar solos */
  reparables: GastoPorReparar[]
  /** Gastos que perdieron la venta y hay que reasignar a mano */
  sinVenta: GastoPorReparar[]
}

/**
 * Revisa si hay gastos que deberian estar imputados a una venta pero no
 * lo estan. No modifica nada.
 */
export async function diagnosticarGastosSinVenta(): Promise<DiagnosticoGastos> {
  const vacio: DiagnosticoGastos = { reparables: [], sinVenta: [] }
  try {
    const supabase = createServerSupabaseClient()

    const { data: gastos } = await supabase
      .from('gastos')
      .select('id, concepto, monto, cotizacion_id, es_costo_venta, categoria, cotizaciones(numero)')
      .neq('categoria', 'ACTIVO_FIJO')
      .limit(500)

    if (!gastos || gastos.length === 0) return vacio

    // Que gastos YA tienen reparto
    const { data: repartos } = await supabase.from('gasto_reparto').select('gasto_id')
    const conReparto = new Set((repartos ?? []).map((r) => String(r.gasto_id)))

    const reparables: GastoPorReparar[] = []
    const sinVenta: GastoPorReparar[] = []

    for (const g of gastos) {
      const id = String(g.id)
      if (conReparto.has(id)) continue

      const cot = g.cotizaciones as { numero?: string } | null
      const fila: GastoPorReparar = {
        id,
        concepto: String(g.concepto ?? ''),
        monto: Number(g.monto ?? 0),
        cotizacion_numero: cot?.numero ?? null,
      }

      if (g.cotizacion_id) {
        // Se puede reconstruir: la venta quedo guardada en la columna vieja
        reparables.push(fila)
      } else if (g.es_costo_venta) {
        // Estaba marcado como costo de venta pero se perdio la venta
        sinVenta.push(fila)
      } else if (/\bCOT\b|COTIZACION/i.test(fila.concepto)) {
        // El concepto nombra una cotizacion (ej: "DOMICILIO VENTAS COT 11 - 15")
        // pero el gasto quedo como operativo. Es el caso tipico del gasto
        // que perdio el vinculo: el dato de la venta se borro y solo
        // sobrevive en el texto. Hay que reasignarlo a mano.
        sinVenta.push(fila)
      }
    }

    return { reparables, sinVenta }
  } catch {
    return vacio
  }
}

/**
 * Repara de una sola vez todos los gastos reparables: crea el vinculo con
 * la venta, marca la bandera y recalcula costo, utilidad y margen de cada
 * venta afectada.
 */
export async function repararGastosSinVenta(idsElegidos?: string[]): Promise<ResultadoAccion> {
  try {
    const supabase = createServerSupabaseClient()
    const diag = await diagnosticarGastosSinVenta()
    const sinVenta = diag.sinVenta

    // SOLO los que el dueno marco. Antes se reparaban TODOS de una, y eso
    // imputo a una venta gastos que ya no le correspondian: el costo se
    // infla y la utilidad puede quedar en negativo. Solo el dueno sabe
    // cual gasto es realmente costo de cual venta.
    const elegidos = new Set(idsElegidos ?? [])
    const reparables = idsElegidos && idsElegidos.length > 0
      ? diag.reparables.filter((g) => elegidos.has(g.id))
      : []

    if (reparables.length === 0) {
      return { ok: false, mensaje: 'Marca primero cuales gastos SI son costo de esa venta.' }
    }

    // Traer la venta y el monto de cada gasto reparable
    const ids = reparables.map((g) => g.id)
    const { data: detalle, error: errDetalle } = await supabase
      .from('gastos')
      .select('id, monto, cotizacion_id')
      .in('id', ids)

    if (errDetalle) return { ok: false, mensaje: `No se pudo leer los gastos: ${errDetalle.message}` }

    const filas = (detalle ?? [])
      .filter((g) => g.cotizacion_id)
      .map((g) => ({
        gasto_id: String(g.id),
        cotizacion_id: String(g.cotizacion_id),
        monto: Number(g.monto ?? 0),
      }))
      .filter((f) => f.monto > 0)

    if (filas.length === 0) return { ok: false, mensaje: 'No se encontro informacion suficiente para reparar.' }

    // 1. Crear el vinculo con la venta
    const { error: errReparto } = await supabase.from('gasto_reparto').insert(filas)
    if (errReparto) {
      return { ok: false, mensaje: `No se pudo crear el vinculo con la venta: ${errReparto.message}. No se cambio nada mas.` }
    }

    // 2. Marcarlos como costo de venta (si no, el informe los sigue ignorando)
    const { error: errFlag } = await supabase
      .from('gastos')
      .update({ es_costo_venta: true })
      .in('id', filas.map((f) => f.gasto_id))

    if (errFlag) {
      // Deshacer el paso 1 para no dejar el dato a medias
      await supabase.from('gasto_reparto').delete().in('gasto_id', filas.map((f) => f.gasto_id))
      return { ok: false, mensaje: `No se pudo marcar los gastos como costo de venta: ${errFlag.message}. Se deshizo el cambio.` }
    }

    // 3. Recalcular utilidad y margen de cada venta afectada
    const ventas = Array.from(new Set(filas.map((f) => f.cotizacion_id)))
    for (const cid of ventas) {
      await recalcularCostoCotizacion(supabase, cid)
      revalidatePath(`/ventas/${cid}`)
      revalidatePath(`/ventas/${cid}/informe`)
    }

    revalidatePath('/gastos')
    revalidatePath('/ventas')
    revalidatePath('/obligaciones')

    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
    const totalReparado = filas.reduce((s, f) => s + f.monto, 0)

    const aviso = sinVenta.length > 0
      ? ` Quedan ${sinVenta.length} gasto(s) que perdieron la venta: hay que asignarsela a mano con Editar.`
      : ''

    return {
      ok: true,
      mensaje: `Listo: ${filas.length} gasto(s) por ${fmt.format(totalReparado)} ya quedaron imputados a ${ventas.length} venta(s). La utilidad y el margen se recalcularon.${aviso}`,
    }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error al reparar.' }
  }
}


/**
 * Quita un gasto de una venta.
 *
 * Existe porque la reparacion automatica imputaba el 100% de cualquier
 * gasto que tuviera una venta guardada en la columna vieja, y algunos de
 * esos gastos ya NO correspondian a esa venta. Eso infla el costo y puede
 * dejar la utilidad en negativo. Con esto se corrige en un clic.
 *
 * Al quitarlo se recalcula la utilidad y el margen de la venta, y si el
 * gasto no queda imputado a ninguna otra venta se marca como operativo y
 * se limpia la columna vieja, para que la reparacion no lo vuelva a
 * proponer.
 */
export async function quitarGastoDeVenta(gastoId: string, cotizacionId: string): Promise<ResultadoAccion> {
  if (!gastoId || !cotizacionId) return { ok: false, mensaje: 'Datos incompletos.' }
  try {
    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from('gasto_reparto')
      .delete()
      .eq('gasto_id', gastoId)
      .eq('cotizacion_id', cotizacionId)

    if (error) return { ok: false, mensaje: `No se pudo quitar: ${error.message}` }

    // Si ya no esta en ninguna venta, vuelve a ser gasto operativo
    const { data: quedan } = await supabase
      .from('gasto_reparto')
      .select('id')
      .eq('gasto_id', gastoId)
      .limit(1)

    if (!quedan || quedan.length === 0) {
      await supabase
        .from('gastos')
        .update({ es_costo_venta: false, cotizacion_id: null })
        .eq('id', gastoId)
    }

    await recalcularCostoCotizacion(supabase, cotizacionId)

    revalidatePath('/gastos')
    revalidatePath('/ventas')
    revalidatePath(`/ventas/${cotizacionId}`)
    revalidatePath(`/ventas/${cotizacionId}/informe`)
    revalidatePath('/obligaciones')

    return { ok: true, mensaje: 'Gasto quitado de la venta. La utilidad se recalculo.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}

export interface GastoImputado {
  gasto_id: string
  cotizacion_id: string
  cotizacion_numero: string
  concepto: string
  monto: number
}

/**
 * Que gastos esta cargando cada venta. Se usa para poder ver el detalle y
 * quitar lo que no corresponda: antes el informe solo mostraba un TOTAL
 * de gastos, sin decir cuales, asi que un costo mal imputado era
 * imposible de encontrar.
 */
export async function obtenerGastosImputados(): Promise<GastoImputado[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('gasto_reparto')
      .select('gasto_id, cotizacion_id, monto, gastos(concepto), cotizaciones(numero)')
      .limit(500)

    return (data ?? []).map((r) => {
      const g = r.gastos as { concepto?: string } | null
      const c = r.cotizaciones as { numero?: string } | null
      return {
        gasto_id: String(r.gasto_id),
        cotizacion_id: String(r.cotizacion_id),
        cotizacion_numero: c?.numero ?? '',
        concepto: g?.concepto ?? '',
        monto: Number(r.monto ?? 0),
      }
    })
  } catch {
    return []
  }
}


// ============================================================
// DE DONDE SALE EL COSTO DE CADA VENTA
// ============================================================
//
// POR QUE EXISTE
// Una venta aparecio con utilidad de -2.265.004 y margen de -259%, y NO
// habia forma de ver de donde venia ese costo: el informe solo mostraba
// totales. El costo de una venta tiene DOS fuentes y hay que poder ver
// las dos, linea por linea:
//   1. COMPRAS asignadas a la venta (tabla asignacion_costos)
//   2. GASTOS imputados a la venta  (tabla gasto_reparto)
// Si algo esta mal asignado, se quita desde aca y la utilidad se
// recalcula sola.

export interface LineaCosto {
  /** id de la fila de asignacion_costos o de gasto_reparto */
  id: string
  descripcion: string
  monto: number
  origen: 'COMPRA' | 'GASTO'
  /** solo para gastos: se necesita el id del gasto para quitarlo */
  gasto_id?: string
}

export interface CostoDeVenta {
  cotizacion_id: string
  numero: string
  subtotal: number
  costo_total: number
  utilidad: number
  margen_pct: number
  lineas: LineaCosto[]
  /** suma de las lineas: si no coincide con costo_total, algo esta raro */
  suma_lineas: number
}

export async function obtenerCostosPorVenta(): Promise<CostoDeVenta[]> {
  try {
    const supabase = createServerSupabaseClient()

    const [cotRes, compraRes, gastoRes] = await Promise.all([
      supabase
        .from('cotizaciones')
        .select('id, numero, subtotal, costo_total, utilidad_estimada, margen_pct')
        .order('numero', { ascending: false })
        .limit(100),
      supabase
        .from('asignacion_costos')
        .select('id, cotizacion_id, cantidad, subtotal, productos(nombre), facturas_compra(numero_factura)')
        .eq('destino', 'VENTA')
        .not('cotizacion_id', 'is', null)
        .limit(500),
      supabase
        .from('gasto_reparto')
        .select('id, gasto_id, cotizacion_id, monto, gastos(concepto)')
        .limit(500),
    ])

    const porVenta = new Map<string, LineaCosto[]>()
    const agregar = (cid: string, linea: LineaCosto) => {
      const arr = porVenta.get(cid) ?? []
      arr.push(linea)
      porVenta.set(cid, arr)
    }

    for (const a of compraRes.data ?? []) {
      const prod = a.productos as { nombre?: string } | null
      const fac = a.facturas_compra as { numero_factura?: string } | null
      const cant = Number(a.cantidad ?? 0)
      agregar(String(a.cotizacion_id), {
        id: String(a.id),
        descripcion: `${prod?.nombre ?? 'Producto'}${cant ? ` x${cant}` : ''}${fac?.numero_factura ? ` · factura ${fac.numero_factura}` : ''}`,
        monto: Number(a.subtotal ?? 0),
        origen: 'COMPRA',
      })
    }

    for (const r of gastoRes.data ?? []) {
      const g = r.gastos as { concepto?: string } | null
      agregar(String(r.cotizacion_id), {
        id: String(r.id),
        descripcion: g?.concepto ?? 'Gasto',
        monto: Number(r.monto ?? 0),
        origen: 'GASTO',
        gasto_id: String(r.gasto_id),
      })
    }

    const salida: CostoDeVenta[] = []
    for (const c of cotRes.data ?? []) {
      const lineas = porVenta.get(String(c.id)) ?? []
      if (lineas.length === 0 && Number(c.costo_total ?? 0) === 0) continue
      salida.push({
        cotizacion_id: String(c.id),
        numero: String(c.numero ?? ''),
        subtotal: Number(c.subtotal ?? 0),
        costo_total: Number(c.costo_total ?? 0),
        utilidad: Number(c.utilidad_estimada ?? 0),
        margen_pct: Number(c.margen_pct ?? 0),
        lineas,
        suma_lineas: lineas.reduce((s, l) => s + l.monto, 0),
      })
    }
    return salida
  } catch {
    return []
  }
}

/**
 * Quita una compra asignada a una venta. Se usa cuando una factura de
 * compra quedo cargada a la venta equivocada e inflo su costo.
 */
export async function quitarCompraDeVenta(asignacionId: string, cotizacionId: string): Promise<ResultadoAccion> {
  if (!asignacionId || !cotizacionId) return { ok: false, mensaje: 'Datos incompletos.' }
  try {
    const supabase = createServerSupabaseClient()

    const { error } = await supabase.from('asignacion_costos').delete().eq('id', asignacionId)
    if (error) return { ok: false, mensaje: `No se pudo quitar: ${error.message}` }

    await recalcularCostoCotizacion(supabase, cotizacionId)

    revalidatePath('/gastos')
    revalidatePath('/ventas')
    revalidatePath('/compras')
    revalidatePath(`/ventas/${cotizacionId}`)
    revalidatePath(`/ventas/${cotizacionId}/informe`)
    revalidatePath('/obligaciones')

    return { ok: true, mensaje: 'Compra quitada de la venta. La utilidad se recalculo.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}

/**
 * Fuerza el recalculo de la utilidad de una venta.
 * Sirve cuando el costo guardado quedo desactualizado (por ejemplo si se
 * editaron los items de la cotizacion despues de asignarle costos).
 */
export async function recalcularVenta(cotizacionId: string): Promise<ResultadoAccion> {
  if (!cotizacionId) return { ok: false, mensaje: 'Venta no valida.' }
  try {
    const supabase = createServerSupabaseClient()
    await recalcularCostoCotizacion(supabase, cotizacionId)
    revalidatePath('/gastos')
    revalidatePath('/ventas')
    revalidatePath(`/ventas/${cotizacionId}`)
    revalidatePath(`/ventas/${cotizacionId}/informe`)
    return { ok: true, mensaje: 'Utilidad y margen recalculados.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}
