'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { TIPOS_MOVIMIENTO, type TipoMovimiento } from '@/types/socios'
import { supabaseConfigurado } from '@/lib/queries/socios'

export interface ResultadoAccion {
  ok: boolean
  mensaje: string
}

function esTipoValido(valor: string): valor is TipoMovimiento {
  return valor in TIPOS_MOVIMIENTO
}

/** Registra un movimiento entre la empresa y un socio */
export async function registrarMovimiento(
  formData: FormData
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    return {
      ok: false,
      mensaje: 'La base de datos no esta configurada todavia.',
    }
  }

  const socioId = String(formData.get('socio_id') ?? '').trim()
  const tipo = String(formData.get('tipo') ?? '').trim()
  const montoRaw = String(formData.get('monto') ?? '').trim()
  const fecha = String(formData.get('fecha') ?? '').trim()
  const descripcion = String(formData.get('descripcion') ?? '').trim()

  if (!socioId) return { ok: false, mensaje: 'Selecciona un socio.' }
  if (!esTipoValido(tipo))
    return { ok: false, mensaje: 'Selecciona un tipo de movimiento valido.' }

  const monto = Number(montoRaw.replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(monto) || monto <= 0)
    return { ok: false, mensaje: 'El monto debe ser mayor a cero.' }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('movimientos_socio').insert({
      socio_id: socioId,
      tipo,
      monto,
      fecha: fecha || new Date().toISOString().slice(0, 10),
      descripcion: descripcion || null,
    })

    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/socios')
    revalidatePath('/panel')
    return {
      ok: true,
      mensaje: `${TIPOS_MOVIMIENTO[tipo].etiqueta} registrado correctamente.`,
    }
  } catch (e) {
    return {
      ok: false,
      mensaje: e instanceof Error ? e.message : 'Error al registrar.',
    }
  }
}

/** Elimina un movimiento (por si se registro por error) */
export async function eliminarMovimiento(
  formData: FormData
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    return { ok: false, mensaje: 'La base de datos no esta configurada.' }
  }

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { ok: false, mensaje: 'Movimiento no valido.' }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from('movimientos_socio')
      .delete()
      .eq('id', id)

    if (error) return { ok: false, mensaje: error.message }

    revalidatePath('/socios')
    revalidatePath('/panel')
    return { ok: true, mensaje: 'Movimiento eliminado.' }
  } catch (e) {
    return {
      ok: false,
      mensaje: e instanceof Error ? e.message : 'Error al eliminar.',
    }
  }
}
