import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/layout/Header'
import FormEditarCotizacion from './FormEditarCotizacion'
import { obtenerClientesParaSelect } from '@/lib/queries/clientes'
import { obtenerProductoParaSelect } from '@/lib/queries/productos'

export const dynamic = 'force-dynamic'

export default async function EditarCotizacionPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: cot } = await supabase
    .from('cotizaciones')
    .select('*, cotizacion_items(*)')
    .eq('id', params.id)
    .single()

  if (!cot) notFound()

  // Solo se puede editar si NO esta facturada
  if (cot.estado === 'FACTURADA') {
    redirect(`/ventas/${params.id}`)
  }

  const clientes = await obtenerClientesParaSelect()
  const productos = await obtenerProductoParaSelect()

  const cotizacionData = {
    id: cot.id,
    numero: cot.numero,
    cliente_id: cot.cliente_id ?? '',
    fecha: cot.fecha,
    fecha_validez: cot.fecha_validez ?? '',
    forma_pago: cot.forma_pago ?? 'Contado',
    observaciones: cot.observaciones ?? '',
    estado: cot.estado,
    items: (cot.cotizacion_items ?? []).map((item: Record<string, unknown>) => ({
      id: String(item.id ?? ''),
      producto_id: String(item.producto_id ?? ''),
      descripcion: String(item.descripcion ?? ''),
      cantidad: String(item.cantidad ?? '1'),
      precio_unitario: String(item.precio_unitario ?? ''),
      costo_unitario: String(item.costo_unitario ?? ''),
      iva_porcentaje: String(item.iva_porcentaje ?? '19'),
    })),
  }

  return (
    <>
      <Header title={`Editar ${cot.numero}`} subtitle="Modifica los datos de la cotizacion" />
      <div className="p-8">
        <div className="mb-6">
          <Link href={`/ventas/${params.id}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver al detalle
          </Link>
        </div>
        <FormEditarCotizacion
          cotizacion={cotizacionData}
          clientes={clientes}
          productos={productos}
        />
      </div>
    </>
  )
}
