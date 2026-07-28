import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Producto, Categoria } from '@/types/productos'

export async function obtenerProductos(): Promise<{
  data: Producto[]
  error: string | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('productos')
      .select('*, categorias_producto(nombre)')
      .order('codigo', { ascending: true })

    if (error) return { data: [], error: error.message }

    const productos: Producto[] = (data ?? []).map((p) => {
      const cat = p.categorias_producto as { nombre?: string } | null
      return {
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        descripcion: p.descripcion,
        categoria_id: p.categoria_id,
        categoria_nombre: cat?.nombre ?? null,
        unidad_medida: p.unidad_medida ?? 'Unidad',
        iva_porcentaje: Number(p.iva_porcentaje ?? 19),
        costo_promedio: Number(p.costo_promedio ?? 0),
        ultimo_costo: Number(p.ultimo_costo ?? 0),
        margen_minimo_pct: Number(p.margen_minimo_pct ?? 20),
        precio_sugerido: Number(p.precio_sugerido ?? 0),
        precio_lista: Number(p.precio_lista ?? 0),
        stock_actual: Number(p.stock_actual ?? 0),
        stock_minimo: Number(p.stock_minimo ?? 0),
        activo: Boolean(p.activo),
        notas: p.notas,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }
    })

    return { data: productos, error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

export async function obtenerCategorias(): Promise<Categoria[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('categorias_producto')
      .select('*')
      .order('orden', { ascending: true })
    return (data ?? []).map((c) => ({
      id: String(c.id),
      nombre: String(c.nombre),
      orden: Number(c.orden ?? 0),
    }))
  } catch {
    return []
  }
}

export async function obtenerProductoParaSelect(): Promise<
  { id: string; codigo: string; nombre: string; costo_promedio: number; iva_porcentaje: number; stock_actual: number; precio_sugerido: number; margen_minimo_pct: number }[]
> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('productos')
      .select('id, codigo, nombre, costo_promedio, iva_porcentaje, stock_actual, precio_sugerido, margen_minimo_pct')
      .eq('activo', true)
      .order('nombre')
    return (data ?? []).map((p) => ({
      id: String(p.id),
      codigo: String(p.codigo),
      nombre: String(p.nombre),
      costo_promedio: Number(p.costo_promedio ?? 0),
      iva_porcentaje: Number(p.iva_porcentaje ?? 19),
      stock_actual: Number(p.stock_actual ?? 0),
      precio_sugerido: Number(p.precio_sugerido ?? 0),
      margen_minimo_pct: Number(p.margen_minimo_pct ?? 20),
    }))
  } catch {
    return []
  }
}
