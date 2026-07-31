import { createServerSupabaseClient } from '@/lib/supabase/server'
import { EMPRESA } from '@/lib/empresa'
import { formatCOP, formatFecha } from '@/lib/format'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BotonImprimir from '../BotonImprimir'

export const dynamic = 'force-dynamic'

export default async function RemisionPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: cot } = await supabase
    .from('cotizaciones')
    .select('*, cotizacion_items(*), clientes(razon_social, nit, contacto_nombre, contacto_email, contacto_telefono, direccion_entrega, ciudad)')
    .eq('id', params.id)
    .single()

  if (!cot) notFound()

  // Solo mostrar remision si ya fue despachada o tiene numero de remision
  if (!cot.remision_numero && cot.estado !== 'DESPACHADA') notFound()

  const cliente = cot.clientes as Record<string, string> | null
  const items = (cot.cotizacion_items ?? []) as Record<string, unknown>[]
  const fechaRemision = cot.remision_fecha || new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra superior (no se imprime) */}
      <div className="print:hidden bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <Link href="/ventas" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver a cotizaciones
        </Link>
        <BotonImprimir />
      </div>

      {/* Documento de remision (imprimible) */}
      <div className="max-w-[210mm] mx-auto my-8 print:my-0 bg-white shadow-lg print:shadow-none p-10 print:p-8">

        {/* Encabezado */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-6 mb-6">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-gray-800">{EMPRESA.razon_social}</h1>
              <p className="text-xs text-gray-500">NIT: {EMPRESA.nit}</p>
              <p className="text-xs text-gray-500">{EMPRESA.direccion}, {EMPRESA.ciudad}</p>
              <p className="text-xs text-gray-500">Tel: {EMPRESA.telefono} | {EMPRESA.email}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-indigo-600">REMISION</h2>
            <p className="text-lg font-mono font-bold text-gray-800 mt-1">{cot.remision_numero || 'REM-PENDIENTE'}</p>
            <p className="text-xs text-gray-500 mt-2">Fecha: {formatFecha(fechaRemision)}</p>
            <p className="text-xs text-gray-500">Cotizacion: {cot.numero}</p>
            {cot.oc_cliente && <p className="text-xs text-gray-500">OC Cliente: {cot.oc_cliente}</p>}
          </div>
        </div>

        {/* Datos del cliente */}
        <div className="mb-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Cliente / Destinatario</h3>
          <p className="font-medium text-gray-800">{cliente?.razon_social ?? 'Sin cliente'}</p>
          {cliente?.nit && <p className="text-xs text-gray-500">NIT: {cliente.nit}</p>}
          {cliente?.contacto_nombre && <p className="text-xs text-gray-500">Contacto: {cliente.contacto_nombre}</p>}
          {cliente?.contacto_telefono && <p className="text-xs text-gray-500">Tel: {cliente.contacto_telefono}</p>}
          {cliente?.contacto_email && <p className="text-xs text-gray-500">Email: {cliente.contacto_email}</p>}
          {cliente?.direccion_entrega && <p className="text-xs text-gray-500">Direccion de entrega: {cliente.direccion_entrega}, {cliente?.ciudad}</p>}
        </div>

        {/* Aviso legal */}
        <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <p className="text-xs text-indigo-700 font-medium">Este documento NO es una factura de venta. Es un comprobante de entrega de mercancia. La factura electronica sera emitida posteriormente.</p>
        </div>

        {/* Tabla de items */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="bg-indigo-600 text-white">
              <th className="px-3 py-2 text-left text-xs">#</th>
              <th className="px-3 py-2 text-left text-xs">Descripcion</th>
              <th className="px-3 py-2 text-center text-xs">Cant.</th>
              <th className="px-3 py-2 text-right text-xs">P. Unitario</th>
              <th className="px-3 py-2 text-right text-xs">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={String(item.id)} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                <td className="px-3 py-2 text-gray-800">{String(item.descripcion)}</td>
                <td className="px-3 py-2 text-center text-gray-600">{String(item.cantidad)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-600">{formatCOP(Number(item.precio_unitario))}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-800">{formatCOP(Number(item.subtotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="flex justify-end mb-8">
          <div className="w-72 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span className="tabular-nums">{formatCOP(Number(cot.subtotal))}</span></div>
            <div className="flex justify-between text-gray-600"><span>IVA:</span><span className="tabular-nums">{formatCOP(Number(cot.iva_total))}</span></div>
            <div className="flex justify-between font-bold text-lg text-gray-800 pt-2 border-t border-gray-300"><span>TOTAL:</span><span className="tabular-nums">{formatCOP(Number(cot.total))}</span></div>
          </div>
        </div>

        {/* Observaciones */}
        {cot.remision_observaciones && (
          <div className="mb-8 bg-gray-50 rounded-lg p-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Observaciones de entrega</h3>
            <p className="text-sm text-gray-700">{cot.remision_observaciones}</p>
          </div>
        )}

        {/* Condiciones de remision */}
        <div className="border-t border-gray-200 pt-6 space-y-3 text-xs text-gray-600 mb-8">
          <div><strong>Forma de pago:</strong> {cot.forma_pago}</div>
          {cot.observaciones && <div><strong>Notas de la cotizacion:</strong> {cot.observaciones}</div>}
          <div><strong>Condiciones:</strong> La mercancia descrita en esta remision se entrega en buen estado. El destinatario acepta la recepcion conforme al firmar este documento.</div>
        </div>

        {/* Firmas */}
        <div className="grid grid-cols-2 gap-12 mt-12 pt-6 border-t border-gray-200">
          <div>
            <div className="border-b border-gray-400 mb-2 h-12"></div>
            <p className="text-xs text-gray-700 font-medium">Entregado por:</p>
            <p className="text-xs text-gray-500">{EMPRESA.razon_social}</p>
            <p className="text-xs text-gray-400 mt-1">Nombre: _________________________</p>
            <p className="text-xs text-gray-400 mt-1">C.C.: ___________________________</p>
          </div>
          <div>
            <div className="border-b border-gray-400 mb-2 h-12"></div>
            <p className="text-xs text-gray-700 font-medium">Recibido por:</p>
            <p className="text-xs text-gray-500">{cliente?.razon_social ?? 'Cliente'}</p>
            <p className="text-xs text-gray-400 mt-1">Nombre: _________________________</p>
            <p className="text-xs text-gray-400 mt-1">C.C.: ___________________________</p>
          </div>
        </div>

        {/* Pie */}
        <div className="mt-10 text-center text-xs text-gray-400">
          <p>{EMPRESA.slogan}</p>
          <p>{EMPRESA.direccion}, {EMPRESA.ciudad} | Tel: {EMPRESA.telefono} | {EMPRESA.email}</p>
        </div>
      </div>
    </div>
  )
}
