import { createServerSupabaseClient } from '@/lib/supabase/server'
import { EMPRESA } from '@/lib/empresa'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BotonImprimir from '../BotonImprimir'

export const dynamic = 'force-dynamic'

/**
 * ROTULO PARA CAJAS
 *
 * Se imprime en media carta o carta completa y se pega en la caja.
 * Contiene: remitente (Abastecer), destinatario (cliente), numero de
 * remision, OC del cliente si existe, y cantidad de bultos.
 */
export default async function RotuloPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: cot } = await supabase
    .from('cotizaciones')
    .select('*, clientes(razon_social, nit, contacto_nombre, contacto_telefono, direccion_entrega, ciudad)')
    .eq('id', params.id)
    .single()

  if (!cot) notFound()

  const cliente = cot.clientes as Record<string, string> | null

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra superior */}
      <div className="print:hidden bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <Link href={`/ventas/${params.id}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver a la venta
        </Link>
        <BotonImprimir />
      </div>

      {/* Rotulo imprimible */}
      <div className="max-w-[180mm] mx-auto my-8 print:my-0 bg-white shadow-lg print:shadow-none p-8 print:p-6">

        {/* === ROTULO === */}
        <div className="border-4 border-gray-900 rounded-xl p-8 space-y-6">

          {/* REMITENTE */}
          <div className="border-b-2 border-gray-300 pb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Remitente</p>
            <p className="text-lg font-bold text-gray-900">{EMPRESA.razon_social}</p>
            <p className="text-sm text-gray-600">NIT: {EMPRESA.nit}</p>
            <p className="text-sm text-gray-600">{EMPRESA.direccion}</p>
            <p className="text-sm text-gray-600">{EMPRESA.ciudad}</p>
            <p className="text-sm text-gray-600">Tel: {EMPRESA.telefono}</p>
          </div>

          {/* DESTINATARIO */}
          <div className="border-b-2 border-gray-300 pb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Destinatario</p>
            <p className="text-2xl font-black text-gray-900">{cliente?.razon_social ?? 'SIN CLIENTE'}</p>
            {cliente?.nit && <p className="text-base font-semibold text-gray-700">NIT: {cliente.nit}</p>}
            {cliente?.contacto_nombre && <p className="text-sm text-gray-600">Att: {cliente.contacto_nombre}</p>}
            {cliente?.direccion_entrega && (
              <p className="text-lg font-bold text-gray-800 mt-1">
                {cliente.direccion_entrega}{cliente?.ciudad ? `, ${cliente.ciudad}` : ''}
              </p>
            )}
            {cliente?.contacto_telefono && <p className="text-sm text-gray-600">Tel: {cliente.contacto_telefono}</p>}
          </div>

          {/* DATOS DEL ENVIO */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Remision</p>
              <p className="text-xl font-black text-gray-900">{cot.remision_numero || cot.numero}</p>
            </div>
            {cot.oc_cliente && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">OC del cliente</p>
                <p className="text-xl font-black text-gray-900">{cot.oc_cliente}</p>
              </div>
            )}
          </div>

          {/* BULTOS - para llenar a mano */}
          <div className="border-2 border-dashed border-gray-400 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Caja</p>
              <p className="text-3xl font-black text-gray-400">_____ de _____</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-500 uppercase">Peso aprox.</p>
              <p className="text-xl font-bold text-gray-400">_______ kg</p>
            </div>
          </div>

          {/* Observaciones */}
          {cot.remision_observaciones && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Observaciones</p>
              <p className="text-sm text-gray-700">{cot.remision_observaciones}</p>
            </div>
          )}
        </div>

        {/* Instruccion para el que imprime */}
        <p className="print:hidden text-center text-xs text-gray-400 mt-4">
          Imprime este rotulo y pegalo en cada caja. Si son varias cajas, escribe el numero (1 de 3, 2 de 3, etc.)
        </p>
      </div>
    </div>
  )
}
