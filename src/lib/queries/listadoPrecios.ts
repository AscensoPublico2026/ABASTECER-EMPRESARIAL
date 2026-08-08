import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * LISTADO DE PRECIOS CON INTELIGENCIA DE MERCADO.
 *
 * Responde las cuatro preguntas del dueno:
 *   1. A cuanto lo vendo
 *   2. Por debajo de cuanto tengo que conseguirlo (costo_objetivo)
 *   3. Quien me lo deja mas barato, y cual es el plan B y C
 *   4. A cuanto lo vende el mercado
 */

import type { FilaListadoPrecios, Semaforo } from '@/lib/precios/tipos'

// Los tipos y las etiquetas del semaforo viven en @/lib/precios/tipos
// porque la tabla es un componente de cliente y no puede importar de
// este archivo, que usa el cliente de Supabase del servidor.
export type { FilaListadoPrecios, Semaforo }

const n = (v: unknown) => Number(v ?? 0)
const nn = (v: unknown) => (v === null || v === undefined ? null : Number(v))

export async function obtenerListadoPrecios(): Promise<{
  filas: FilaListadoPrecios[]
  error: string | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('listado_precios')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (error) return { filas: [], error: error.message }

    const filas: FilaListadoPrecios[] = (data ?? []).map((r) => ({
      producto_id: String(r.producto_id),
      codigo: String(r.codigo ?? ''),
      nombre: String(r.nombre ?? ''),
      categoria: (r.categoria as string | null) ?? null,
      unidad_medida: (r.unidad_medida as string | null) ?? null,
      activo: Boolean(r.activo),
      iva_porcentaje: n(r.iva_porcentaje),
      margen_minimo_pct: n(r.margen_minimo_pct),
      stock_actual: n(r.stock_actual),

      mi_precio_venta: n(r.mi_precio_venta),
      precio_lista: n(r.precio_lista),
      precio_sugerido: n(r.precio_sugerido),

      costo_promedio: n(r.costo_promedio),
      costo_objetivo: n(r.costo_objetivo),

      op1_proveedor: (r.op1_proveedor as string | null) ?? null,
      op1_precio: nn(r.op1_precio),
      op1_disponible: r.op1_disponible !== false,
      op1_entrega: (r.op1_entrega as string | null) ?? null,
      op1_fecha: (r.op1_fecha as string | null) ?? null,
      op2_proveedor: (r.op2_proveedor as string | null) ?? null,
      op2_precio: nn(r.op2_precio),
      op2_disponible: r.op2_disponible !== false,
      op2_entrega: (r.op2_entrega as string | null) ?? null,
      op3_proveedor: (r.op3_proveedor as string | null) ?? null,
      op3_precio: nn(r.op3_precio),
      op3_disponible: r.op3_disponible !== false,
      op3_entrega: (r.op3_entrega as string | null) ?? null,
      num_proveedores: n(r.num_proveedores),

      mercado_min: nn(r.mercado_min),
      mercado_promedio: nn(r.mercado_promedio),
      mercado_max: nn(r.mercado_max),
      num_precios_mercado: n(r.num_precios_mercado),

      margen_mejor_opcion: nn(r.margen_mejor_opcion),
      utilidad_por_unidad: nn(r.utilidad_por_unidad),
      margen_de_maniobra: nn(r.margen_de_maniobra),
      vs_mercado_pct: nn(r.vs_mercado_pct),
      precio_minimo_con_margen: nn(r.precio_minimo_con_margen),
      semaforo: (String(r.semaforo ?? 'SIN_COTIZAR') as Semaforo),
      sobre_el_mercado: Boolean(r.sobre_el_mercado),
      dias_del_precio: nn(r.dias_del_precio),
      precio_vencido: Boolean(r.precio_vencido),
    }))

    return { filas, error: null }
  } catch (e) {
    return { filas: [], error: e instanceof Error ? e.message : 'Error' }
  }
}
