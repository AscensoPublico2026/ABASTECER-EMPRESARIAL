import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import FormEditarProveedor from './FormEditarProveedor'

export const dynamic = 'force-dynamic'

const ESTADOS_PROVEEDOR: Record<string, { etiqueta: string; color: string }> = {
  ACTIVO: { etiqueta: 'Activo', color: 'bg-green-50 text-green-700 border-green-200' },
  INACTIVO: { etiqueta: 'Inactivo', color: 'bg-gray-50 text-gray-600 border-gray-200' },
  EN_EVALUACION: { etiqueta: 'En evaluacion', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
}

export default async function ProveedorDetallePage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: proveedor } = await supabase.from('proveedores').select('*').eq('id', params.id).single()
  if (!proveedor) notFound()

  const estado = ESTADOS_PROVEEDOR[proveedor.estado as string] ?? ESTADOS_PROVEEDOR.ACTIVO

  return (
    <>
      <Header title={proveedor.razon_social} subtitle="Editar datos del proveedor" />
      <div className="p-8 space-y-6">
        <Link href="/proveedores" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm w-fit">
          <ArrowLeft className="w-4 h-4" /> Volver a proveedores
        </Link>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${estado.color}`}>{estado.etiqueta}</span>
          {proveedor.nit && <span className="text-sm text-gray-500">NIT: {proveedor.nit}</span>}
        </div>

        <FormEditarProveedor proveedor={proveedor} />
      </div>
    </>
  )
}
