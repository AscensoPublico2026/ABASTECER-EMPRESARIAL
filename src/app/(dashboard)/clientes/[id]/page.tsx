import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import { ESTADOS_CLIENTE } from '@/types/clientes'
import type { EstadoCliente } from '@/types/clientes'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import FormEditarCliente from './FormEditarCliente'

export const dynamic = 'force-dynamic'

export default async function ClienteDetallePage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: cliente } = await supabase.from('clientes').select('*').eq('id', params.id).single()
  if (!cliente) notFound()

  const estado = ESTADOS_CLIENTE[cliente.estado as EstadoCliente]

  return (
    <>
      <Header title={cliente.razon_social} subtitle="Editar datos del cliente" />
      <div className="p-8 space-y-6">
        <Link href="/clientes" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm w-fit">
          <ArrowLeft className="w-4 h-4" /> Volver a clientes
        </Link>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${estado.color}`}>{estado.etiqueta}</span>
          {cliente.nit && <span className="text-sm text-gray-500">NIT: {cliente.nit}</span>}
        </div>

        <FormEditarCliente cliente={cliente} />
      </div>
    </>
  )
}
