import { createServerSupabaseClient } from '@/lib/supabase/server'
import { EMPRESA } from '@/lib/empresa'
import { formatCOP, formatFecha } from '@/lib/format'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BotonDescargarPDF from './BotonDescargarPDF'

export const dynamic = 'force-dynamic'

export default async function CotizacionDetallePage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: cot } = await supabase
    .from('cotizaciones')
    .select('*, cotizacion_items(*), clientes(razon_social, nit, contacto_nombre, contacto_email, contacto_telefono, direccion_entrega, ciudad)')
    .eq('id', params.id)
    .single()

  if (!cot) notFound()

  const cliente = cot.clientes as Record<string, string> | null
  const items = (cot.cotizacion_items ?? []) as Record<string, unknown>[]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra superior (no se imprime) */}
      <div className="print:hidden bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <Link href="/ventas" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver a cotizaciones
        </Link>
        <div className="flex items-center gap-3">
          {cot.estado !== 'FACTURADA' && (
            <Link href={`/ventas/${params.id}/editar`} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
              Editar cotizacion
            </Link>
          )}
          <BotonDescargarPDF cotizacionId={params.id} />
        </div>
      </div>

      {/* Documento de cotizacion (imprimible) */}
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
            <h2 className="text-2xl font-bold text-blue-600">COTIZACION</h2>
            <p className="text-lg font-mono font-bold text-gray-800 mt-1">{cot.numero}</p>
            <p className="text-xs text-gray-500 mt-2">Fecha: {formatFecha(cot.fecha)}</p>
            {cot.fecha_validez && <p className="text-xs text-gray-500">Validez: {formatFecha(cot.fecha_validez)}</p>}
          </div>
        </div>

        {/* Datos del cliente */}
        <div className="mb-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Cliente</h3>
          <p className="font-medium text-gray-800">{cliente?.razon_social ?? 'Sin cliente'}</p>
          {cliente?.nit && <p className="text-xs text-gray-500">NIT: {cliente.nit}</p>}
          {cliente?.contacto_nombre && <p className="text-xs text-gray-500">Contacto: {cliente.contacto_nombre}</p>}
          {cliente?.contacto_telefono && <p className="text-xs text-gray-500">Tel: {cliente.contacto_telefono}</p>}
          {cliente?.contacto_email && <p className="text-xs text-gray-500">Email: {cliente.contacto_email}</p>}
          {cliente?.direccion_entrega && <p className="text-xs text-gray-500">Direccion: {cliente.direccion_entrega}, {cliente?.ciudad}</p>}
        </div>

        {/* Tabla de items */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="px-3 py-2 text-left text-xs">#</th>
              <th className="px-3 py-2 text-left text-xs">Descripcion</th>
              <th className="px-3 py-2 text-center text-xs">Cant.</th>
              <th className="px-3 py-2 text-right text-xs">P. Unitario</th>
              <th className="px-3 py-2 text-center text-xs">IVA</th>
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
                <td className="px-3 py-2 text-center text-gray-500">{String(item.iva_porcentaje)}%</td>
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

        {/* Analisis de utilidad (solo si no es PENDIENTE) */}
        {cot.estado !== 'PENDIENTE' && (
          <div className="mb-8 print:hidden">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Analisis de utilidad</h3>
              <table className="w-full text-xs mb-4">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-2 font-medium text-gray-500">Item</th>
                    <th className="py-2 font-medium text-gray-500 text-center">Cant</th>
                    <th className="py-2 font-medium text-gray-500 text-right">P.Venta</th>
                    <th className="py-2 font-medium text-gray-500 text-right">Costo</th>
                    <th className="py-2 font-medium text-gray-500 text-right">Utilidad</th>
                    <th className="py-2 font-medium text-gray-500 text-right">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const pv = Number(item.precio_unitario)
                    const costo = Number(item.costo_unitario)
                    const cant = Number(item.cantidad)
                    const utilItem = (pv - costo) * cant
                    const margenItem = pv > 0 ? ((pv - costo) / pv) * 100 : 0
                    return (
                      <tr key={String(item.id)} className="border-b border-gray-100">
                        <td className="py-2 text-gray-700 truncate max-w-[150px]">{String(item.descripcion)}</td>
                        <td className="py-2 text-center text-gray-600">{cant}</td>
                        <td className="py-2 text-right tabular-nums">{formatCOP(pv)}</td>
                        <td className="py-2 text-right tabular-nums text-gray-500">{costo > 0 ? formatCOP(costo) : 'Sin costo'}</td>
                        <td className={`py-2 text-right tabular-nums font-medium ${utilItem >= 0 ? 'text-green-600' : 'text-red-600'}`}>{costo > 0 ? formatCOP(utilItem) : '—'}</td>
                        <td className={`py-2 text-right tabular-nums ${margenItem >= 30 ? 'text-green-600' : margenItem >= 20 ? 'text-amber-600' : 'text-red-600'}`}>{costo > 0 ? `${margenItem.toFixed(1)}%` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500">Utilidad bruta</p>
                  <p className={`text-sm font-bold ${Number(cot.utilidad_estimada) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCOP(Number(cot.utilidad_estimada))}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Provision IVA</p>
                  <p className="text-sm font-bold text-blue-600">{formatCOP(Number(cot.provision_iva ?? 0))}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Provision Simple (5%)</p>
                  <p className="text-sm font-bold text-purple-600">{formatCOP(Number(cot.provision_simple ?? 0))}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Retenciones</p>
                  <p className="text-sm font-bold text-amber-600">-{formatCOP(Number(cot.retencion_total ?? 0))}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                <p className="text-sm font-bold text-gray-700">Ganancia neta estimada:</p>
                <p className="text-lg font-bold text-green-700">{formatCOP(Number(cot.utilidad_estimada) - Number(cot.provision_iva ?? 0) - Number(cot.provision_simple ?? 0) + Number(cot.retencion_total ?? 0))}</p>
              </div>
            </div>
          </div>
        )}

        {/* Condiciones */}
        <div className="border-t border-gray-200 pt-6 space-y-3 text-xs text-gray-600">
          <div><strong>Forma de pago:</strong> {cot.forma_pago}</div>
          {cot.fecha_validez && <div><strong>Validez de la oferta:</strong> Hasta {formatFecha(cot.fecha_validez)}</div>}
          {cot.observaciones && <div><strong>Observaciones:</strong> {cot.observaciones}</div>}
          <div><strong>Datos para pago:</strong> {EMPRESA.banco} | {EMPRESA.tipo_cuenta} | No. {EMPRESA.numero_cuenta} | A nombre de {EMPRESA.razon_social} NIT {EMPRESA.nit}</div>
        </div>

        {/* Firma */}
        <div className="mt-12 pt-6 border-t border-gray-200">
          <div className="w-64">
            <div className="border-b border-gray-400 mb-2 h-8"></div>
            <p className="text-xs text-gray-700 font-medium">{EMPRESA.representante_legal}</p>
            <p className="text-xs text-gray-500">Representante Legal</p>
            <p className="text-xs text-gray-500">{EMPRESA.razon_social}</p>
          </div>
        </div>

        {/* Pie */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>{EMPRESA.slogan}</p>
          <p>{EMPRESA.direccion}, {EMPRESA.ciudad} | Tel: {EMPRESA.telefono} | {EMPRESA.email}</p>
        </div>
      </div>
    </div>
  )
}
