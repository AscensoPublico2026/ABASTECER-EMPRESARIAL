'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { uppercaseFormData } from '@/lib/uppercase'
import { obtenerNombreUsuarioActual } from '@/lib/queries/perfil'
import { recalcularCostoCotizacion } from '@/lib/queries/costeo'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

function monto(v: FormDataEntryValue | null): number {
  return Number(String(v ?? '0').replace(/\./g, '').replace(',', '.')) || 0
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
  const cotizacion_id = String(formData.get('cotizacion_id') ?? '').trim()
  const es_costo_venta = formData.get('es_costo_venta') === 'on' || formData.get('es_costo_venta') === 'true'
  const tipo_soporte = String(formData.get('tipo_soporte') ?? 'NINGUNO').trim()
  const soporte_url = String(formData.get('soporte_url') ?? '').trim()
  const cuenta_id = String(formData.get('cuenta_id') ?? '').trim()

  // Datos del tercero (para documento soporte)
  const tercero_nombre = String(formData.get('tercero_nombre') ?? '').trim()
  const tercero_documento = String(formData.get('tercero_documento') ?? '').trim()
  const tercero_tipo_documento = String(formData.get('tercero_tipo_documento') ?? 'CC').trim()
  const tercero_telefono = String(formData.get('tercero_telefono') ?? '').trim()
  const tercero_direccion = String(formData.get('tercero_direccion') ?? '').trim()

  if (!concepto) return { ok: false, mensaje: 'El concepto es obligatorio.' }
  if (valor <= 0) return { ok: false, mensaje: 'El monto debe ser mayor a cero.' }
  if (iva_incluido > valor) return { ok: false, mensaje: 'El IVA no puede ser mayor al monto total.' }
  if (es_costo_venta && !cotizacion_id) {
    return { ok: false, mensaje: 'Si es costo de una venta, selecciona la cotizacion.' }
  }
  if (tipo_soporte === 'DOCUMENTO_SOPORTE' && (!tercero_nombre || !tercero_documento)) {
    return { ok: false, mensaje: 'Para el documento soporte necesitas el nombre y el documento del tercero.' }
  }
  // Un gasto es plata que ya salio. Sin cuenta el saldo quedaria inflado.
  if (!cuenta_id) {
    return { ok: false, mensaje: 'Selecciona de que cuenta se pago el gasto para poder descontarlo del saldo.' }
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
        es_costo_venta,
        tiene_soporte,
        deducible,
        tercero_nombre: tercero_nombre || null,
        tercero_documento: tercero_documento || null,
        pagado_por: formData.get('pagado_por') || null,
        forma_pago: formData.get('forma_pago') || 'Efectivo',
        soporte_url: soporte_url || null,
        notas: formData.get('notas') || null,
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
          cotizacion_id: cotizacion_id || null,
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

    // Movimiento de tesoreria
    if (cuenta_id) {
      await supabase.from('movimientos_tesoreria').insert({
        cuenta_id,
        fecha,
        tipo: 'EGRESO',
        categoria: 'GASTO',
        monto: valor,
        concepto,
        gasto_id: gasto.id,
        cotizacion_id: cotizacion_id || null,
        medio_pago: String(formData.get('forma_pago') ?? 'Efectivo'),
        soporte_url: soporte_url || null,
        creado_por_id: usuario.id,
        creado_por_nombre: usuario.nombre,
      })
    }

    // Si es costo de venta, recalcular la utilidad de esa cotizacion
    if (es_costo_venta && cotizacion_id) {
      await recalcularCostoCotizacion(supabase, cotizacion_id)
      revalidatePath(`/ventas/${cotizacion_id}`)
    }

    revalidatePath('/gastos')
    revalidatePath('/financiero')
    revalidatePath('/ventas')
    revalidatePath('/panel')

    const partes = ['Gasto registrado.']
    if (numeroDS) partes.push(`Documento soporte ${numeroDS} generado.`)
    if (!deducible) partes.push('Sin soporte: NO es deducible de impuestos.')
    if (es_costo_venta) partes.push('Imputado al costo de la venta.')

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

    await supabase.from('movimientos_tesoreria').delete().eq('gasto_id', gasto_id)
    await supabase.from('documentos_soporte').delete().eq('gasto_id', gasto_id)
    await supabase.from('documentos').delete().eq('entidad_tipo', 'GASTO').eq('entidad_id', gasto_id)

    const { error } = await supabase.from('gastos').delete().eq('id', gasto_id)
    if (error) return { ok: false, mensaje: error.message }

    if (gasto.es_costo_venta && gasto.cotizacion_id) {
      await recalcularCostoCotizacion(supabase, gasto.cotizacion_id as string)
      revalidatePath(`/ventas/${gasto.cotizacion_id}`)
    }

    revalidatePath('/gastos')
    revalidatePath('/financiero')
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
    revalidatePath('/financiero')
    if (gasto.cotizacion_id) revalidatePath(`/ventas/${gasto.cotizacion_id}`)

    return { ok: true, mensaje: `Documento soporte ${ds.numero} generado. El gasto ya es deducible.` }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}
