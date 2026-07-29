import { createServerSupabaseClient } from '@/lib/supabase/server'
import { EMPRESA } from '@/lib/empresa'
import { formatCOP, formatFecha } from '@/lib/format'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Receipt, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import BotonImprimir from '../../[id]/BotonImprimir'

export const dynamic = 'force-dynamic'

export default async function FacturaVentaDetallePage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  // Obtener factura de venta con cliente y items
  const { data: fv } = await supabase
    .from('facturas_venta')
    .select('*, factura_venta_items(*), clientes(razon_social, nit, contacto_nombre, contacto_email, contacto_telefono, direccion_entrega, ciudad), cotizaciones(numero)')
    .eq('id', params.id)
    .single()

  if (!fv) notFound()

  // Obtener documentos vinculados
  const { data: documentos } = await supabase
    .from('documentos')
    .select('*')
    .eq('entidad_tipo', 'FACTURA_VENTA')
    .eq('entidad_id', params.id)
    .order('created_at', { ascending: false })

  const cliente = fv.clientes as Record<string, string> | null
  const cotizacion = fv.cotizaciones as { numero?: string } | null
  const items = (fv.factura_venta_items ?? []) as Record<string, unknown>[]
  const docs = documentos ?? []

  // Calcular dias restantes
  let diasRestantes: number | null = null
  if (fv.fecha_vencimiento && fv.estado === 'EMITIDA') {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const [y, m, d] = (fv.fecha_vencimiento as string).split('-').map(Number)
    const venc = new Date(y, m - 1, d)
    diasRestantes = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  }

  const estadoConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    EMITIDA: { label: 'Por cobrar', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
    COBRADA: { label: 'Cobrada', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
    PARCIAL: { label: 'Pago parcial', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    ANULADA: { label: 'Anulada', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
  }

  const estadoInfo = estadoConfig[fv.estado] ?? estadoConfig.EMITIDA
  const EstadoIcon = estadoInfo.icon

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra superior */}
      <div className="print:hidden bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <Link href="/ventas" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver a ventas
        </Link>
        <BotonImprimir />
      </div>

      <div className="max-w-4xl mx-auto my-8 print:my-0 space-y-6">

        {/* Header de la factura */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center print:hidden">
                <FileText className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Factura de Venta DIAN</p>
                <h1 className="text-2xl font-bold text-gray-800">{fv.numero_factura_dian ?? 'Sin numero'}</h1>
                {cotizacion?.numero && (
                  <p className="text-sm text-gray-500 mt-1">
                    Origen: <Link href={`/ventas/${fv.cotizacion_id}`} className="text-blue-600 hover:underline">{cotizacion.numero}</Link>
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${estadoInfo.color}`}>
                <EstadoIcon className="w-4 h-4" />
                {estadoInfo.label}
              </div>
              {diasRestantes !== null && (
                <p className={`text-sm mt-2 font-medium ${diasRestantes < 0 ? 'text-red-600' : diasRestantes <= 5 ? 'text-amber-600' : 'text-gray-500'}`}>
                  {diasRestantes < 0 ? `Vencida hace ${Math.abs(diasRestantes)} dias` : diasRestantes === 0 ? 'Vence hoy' : `Vence en ${diasRestantes} dias`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Info principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Datos factura */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Datos de la factura</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Fecha emision:</span><span className="text-gray-800">{formatFecha(fv.fecha)}</span></div>
              {fv.fecha_vencimiento && <div className="flex justify-between"><span className="text-gray-500">Fecha vencimiento:</span><span className="text-gray-800">{formatFecha(fv.fecha_vencimiento)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Forma de pago:</span><span className="text-gray-800">{fv.forma_pago}</span></div>
              {fv.dias_credito > 0 && <div className="flex justify-between"><span className="text-gray-500">Dias credito:</span><span className="text-gray-800">{fv.dias_credito} dias</span></div>}
              {fv.oc_cliente && <div className="flex justify-between"><span className="text-gray-500">OC Cliente:</span><span className="text-gray-800">{fv.oc_cliente}</span></div>}
            </div>
          </div>

          {/* Datos cliente */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Cliente</h3>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-800">{cliente?.razon_social ?? 'Sin cliente'}</p>
              {cliente?.nit && <p className="text-gray-500">NIT: {cliente.nit}</p>}
              {cliente?.contacto_nombre && <p className="text-gray-500">Contacto: {cliente.contacto_nombre}</p>}
              {cliente?.contacto_telefono && <p className="text-gray-500">Tel: {cliente.contacto_telefono}</p>}
              {cliente?.contacto_email && <p className="text-gray-500">Email: {cliente.contacto_email}</p>}
              {cliente?.direccion_entrega && <p className="text-gray-500">Dir: {cliente.direccion_entrega}, {cliente?.ciudad}</p>}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Items facturados</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Descripcion</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Cant.</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">P. Unitario</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Costo</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">IVA</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Subtotal</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Utilidad</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={String(item.id)} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3 text-gray-800">{String(item.descripcion)}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{String(item.cantidad)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{formatCOP(Number(item.precio_unitario))}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500">{formatCOP(Number(item.costo_unitario))}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{String(item.iva_porcentaje)}%</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-800">{formatCOP(Number(item.subtotal))}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${Number(item.utilidad) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCOP(Number(item.utilidad))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-end">
              <div className="w-80 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span className="tabular-nums">{formatCOP(Number(fv.subtotal))}</span></div>
                <div className="flex justify-between text-gray-600"><span>IVA:</span><span className="tabular-nums">{formatCOP(Number(fv.iva_total))}</span></div>
                <div className="flex justify-between font-bold text-lg text-gray-800 pt-2 border-t border-gray-300"><span>TOTAL:</span><span className="tabular-nums">{formatCOP(Number(fv.total))}</span></div>
                <div className={`flex justify-between font-medium pt-1 ${Number(fv.utilidad) >= 0 ? 'text-green-600' : 'text-red-600'}`}><span>Utilidad:</span><span className="tabular-nums">{formatCOP(Number(fv.utilidad))} ({Number(fv.margen_pct).toFixed(1)}%)</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Documentos adjuntos */}
        {docs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-500" /> Documentos adjuntos
            </h3>
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-700">{doc.nombre_archivo}</p>
                      <p className="text-xs text-gray-400">
                        {doc.tipo_documento === 'FACTURA' && 'Factura DIAN'}
                        {doc.tipo_documento === 'ORDEN_COMPRA' && 'Orden de Compra'}
                        {doc.tipo_documento === 'SOPORTE_PAGO' && 'Soporte de Pago'}
                        {!['FACTURA', 'ORDEN_COMPRA', 'SOPORTE_PAGO'].includes(doc.tipo_documento) && doc.tipo_documento}
                      </p>
                    </div>
                  </div>
                  <a href={doc.url_archivo} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-medium">
                    Ver documento
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info empresa (para impresion) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:shadow-none">
          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">{EMPRESA.razon_social} · NIT {EMPRESA.nit}</p>
            <p>{EMPRESA.direccion}, {EMPRESA.ciudad} | Tel: {EMPRESA.telefono} | {EMPRESA.email}</p>
            <p>Cuenta: {EMPRESA.banco} | {EMPRESA.tipo_cuenta} | No. {EMPRESA.numero_cuenta}</p>
          </div>
        </div>

      </div>
    </div>
  )
}
