'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function registrarGasto(formData: FormData) {
  const concepto = String(formData.get('concepto') ?? '').trim()
  const monto = Number(String(formData.get('monto') ?? '0').replace(/\./g, '').replace(',', '.'))

  if (!concepto) return { ok: false, mensaje: 'El concepto es obligatorio.' }
  if (!monto || monto <= 0) return { ok: false, mensaje: 'El monto debe ser mayor a cero.' }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('gastos').insert({
      concepto,
      monto,
      fecha: formData.get('fecha') || new Date().toISOString().slice(0, 10),
      categoria: formData.get('categoria') || 'OTROS',
      pagado_por: formData.get('pagado_por') || null,
      notas: formData.get('notas') || null,
    })

    if (error) return { ok: false, mensaje: error.message }
    revalidatePath('/gastos')
    revalidatePath('/financiero')
    return { ok: true, mensaje: 'Gasto registrado correctamente.' }
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : 'Error.' }
  }
}
