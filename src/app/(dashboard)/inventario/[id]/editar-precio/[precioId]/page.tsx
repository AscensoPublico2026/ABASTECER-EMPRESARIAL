import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { ArrowLeft } from 'lucide-react'
import FormEditarPrecio from './FormEditarPrecio'

export const dynamic = 'force-dynamic'

export default async function EditarPrecioPage({ params }: { params: { id: string; precioId: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: precio } = await supabase
    .from('precios_proveedor')
    .select('*, proveedores(razon_social), productos(nombre, codigo)')
    .eq('id', params.precioId)
    .single()

  if (!precio) notFound()

  const producto = precio.productos as { nombre?: string; codigo?: string } | null
  const proveedor = precio.proveedores as { razon_social?: string } | null

  return (
    <>
      <Header title="Editar precio" subtitle={`${producto?.codigo} - ${producto?.nombre}`} />
      <div className="p-8 space-y-6">
        <Link href={`/inventario/${params.id}`} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm w-fit">
          <ArrowLeft className="w-4 h-4" /> Volver al producto
        </Link>

        <FormEditarPrecio
          precioId={params.precioId}
          productoId={params.id}
          proveedorNombre={proveedor?.razon_social ?? ''}
          datos={{
            precio: String(precio.precio),
            iva_incluido: precio.iva_incluido ? 'true' : 'false',
            tiempo_entrega: precio.tiempo_entrega ?? '',
            referencia_proveedor: precio.referencia_proveedor ?? '',
            fecha_cotizacion: precio.fecha_cotizacion ?? '',
            notas: precio.notas ?? '',
          }}
        />
      </div>
    </>
  )
}
