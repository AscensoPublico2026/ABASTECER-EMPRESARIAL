import { createServerSupabaseClient } from '@/lib/supabase/server'
import { EMPRESA } from '@/lib/empresa'
import { formatCOP } from '@/lib/format'
import { fechaLarga, numeroEnLetras, separarCodigo } from '@/lib/cotizaciones/formato'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BotonDescargarPDF from './BotonDescargarPDF'
import PanelAnalisisVenta from '@/components/ventas/PanelAnalisisVenta'
import DocumentosVenta from '@/components/ventas/DocumentosVenta'
import {
  obtenerAnalisisVenta,
  obtenerAnalisisItems,
  obtenerTrazabilidad,
} from '@/lib/queries/analisisVenta'
import { obtenerDocumentosDeVenta } from '@/lib/queries/documentosVenta'

export const dynamic = 'force-dynamic'

export default async function CotizacionDetallePage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: cot } = await supabase
    .from('cotizaciones')
    .select('*, cotizacion_items(*), clientes(razon_social, nit, contacto_nombre, contacto_email, contacto_telefono, direccion_entrega, ciudad)')
    .eq('id', params.id)
    .single()

  if (!cot) notFound()

  const cliente = cot.clientes as Record<string, string | null> | null
  const items = (cot.cotizacion_items ?? []) as Record<string, unknown>[]
  const conCodigo = items.some((it) => separarCodigo(String(it.descripcion ?? '')).codigo)
  const observaciones = String(cot.observaciones ?? '')
    .split(/\n+/)
    .map((l) => l.replace(/^[\s•\-*·]+/, '').trim())
    .filter(Boolean)

  // Analisis financiero interno
  const analisis = await obtenerAnalisisVenta(params.id)
  const analisisItems = analisis ? await obtenerAnalisisItems(params.id) : []
  const trazabilidad = analisis ? await obtenerTrazabilidad(params.id) : []

  // Todos los documentos de la venta, para el paquete
  const docsVenta = await obtenerDocumentosDeVenta(params.id)

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

      {/* Documento de cotizacion (imprimible) — mismo diseno que el PDF */}
      <div className="max-w-[210mm] mx-auto my-8 print:my-0 bg-white shadow-lg print:shadow-none overflow-hidden text-[#1F2937]">
        {/* Franja con los colores de la marca */}
        <div className="flex h-1.5">
          <div className="flex-[6] bg-[#0D1B2A]" />
          <div className="flex-[2] bg-[#16B23C]" />
          <div className="flex-[1] bg-[#F2B705]" />
        </div>

        <div className="px-6 sm:px-10 pt-6 pb-8 print:px-[12mm]">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E7EE]">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icono.png" alt="Logo" className="h-12 w-auto object-contain" />
              <div>
                <h1 className="text-lg font-bold text-[#0D1B2A] leading-tight">{EMPRESA.razon_social}</h1>
                <p className="text-[11px] text-[#636B73]">NIT {EMPRESA.nit} · {EMPRESA.direccion}, {EMPRESA.ciudad}</p>
                <p className="text-[11px] text-[#636B73]">Tel. {EMPRESA.telefono} · {EMPRESA.email}</p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] font-bold tracking-[0.3em] text-[#16B23C]">COTIZACIÓN</p>
              <p className="text-2xl font-bold text-[#0D1B2A]">{cot.numero}</p>
            </div>
          </div>

          {/* Cliente | Condiciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <div className="bg-[#F2F4F7] rounded-md border-l-[3px] border-[#0D1B2A] px-4 py-3">
              <p className="text-[10px] font-bold tracking-widest text-[#636B73] mb-1">CLIENTE</p>
              <p className="text-base font-bold text-[#0D1B2A]">{cliente?.razon_social ?? 'Sin cliente'}</p>
              {cliente?.nit && <p className="text-xs text-gray-700 mt-0.5">NIT {cliente.nit}</p>}
              {cliente?.contacto_nombre && (
                <p className="text-xs text-gray-700 mt-0.5">Atención: {cliente.contacto_nombre}{cliente.contacto_telefono ? ` · ${cliente.contacto_telefono}` : ''}</p>
              )}
              {!cliente?.contacto_nombre && cliente?.contacto_telefono && <p className="text-xs text-gray-700 mt-0.5">Tel. {cliente.contacto_telefono}</p>}
              {cliente?.contacto_email && <p className="text-xs text-gray-700 mt-0.5">{cliente.contacto_email}</p>}
              {(cliente?.direccion_entrega || cliente?.ciudad) && (
                <p className="text-xs text-gray-700 mt-0.5">{[cliente?.direccion_entrega, cliente?.ciudad].filter(Boolean).join(', ')}</p>
              )}
            </div>
            <div className="bg-[#F2F4F7] rounded-md border-l-[3px] border-[#16B23C] px-4 py-3">
              <p className="text-[10px] font-bold tracking-widest text-[#636B73] mb-1">CONDICIONES</p>
              {[
                ['Fecha', fechaLarga(cot.fecha)],
                ['Válida hasta', fechaLarga(cot.fecha_validez)],
                ['Forma de pago', cot.forma_pago || 'Contado'],
                ['Productos', String(items.length)],
              ].map(([label, valor]) => (
                <div key={label} className="flex justify-between text-xs mt-1">
                  <span className="text-[#636B73]">{label}</span>
                  <span className="font-bold text-[#0D1B2A]">{valor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla de productos */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-[13px] min-w-[560px]">
              <thead>
                <tr className="bg-[#0D1B2A] text-white text-[11px] tracking-wide">
                  <th className="px-2 py-2 text-left font-bold rounded-l-md w-8">#</th>
                  {conCodigo && <th className="px-2 py-2 text-left font-bold w-20">CÓDIGO</th>}
                  <th className="px-2 py-2 text-left font-bold">DESCRIPCIÓN</th>
                  <th className="px-2 py-2 text-center font-bold w-14">CANT.</th>
                  <th className="px-2 py-2 text-right font-bold w-24">VR. UNITARIO</th>
                  <th className="px-2 py-2 text-center font-bold w-12">IVA</th>
                  <th className="px-2 py-2 text-right font-bold rounded-r-md w-28">SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const { codigo, texto } = separarCodigo(String(item.descripcion ?? ''))
                  return (
                    <tr key={String(item.id)} className={`border-b border-[#E2E7EE] ${idx % 2 === 1 ? 'bg-[#F8FAFC]' : ''}`}>
                      <td className="px-2 py-2 text-[#636B73]">{idx + 1}</td>
                      {conCodigo && <td className="px-2 py-2 text-xs text-[#636B73] whitespace-nowrap">{codigo || '—'}</td>}
                      <td className="px-2 py-2">{conCodigo ? texto : String(item.descripcion ?? '')}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{Number(item.cantidad).toLocaleString('es-CO')}</td>
                      <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap">{formatCOP(Number(item.precio_unitario))}</td>
                      <td className="px-2 py-2 text-center text-[#636B73]">{String(item.iva_porcentaje)}%</td>
                      <td className="px-2 py-2 text-right tabular-nums font-bold text-[#0D1B2A] whitespace-nowrap">{formatCOP(Number(item.subtotal))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Observaciones | Totales */}
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_260px] gap-4 mt-5 break-inside-avoid">
            <div className="bg-[#F2F4F7] rounded-md px-4 py-3">
              <p className="text-[10px] font-bold tracking-widest text-[#636B73] mb-1">OBSERVACIONES</p>
              <ul className="space-y-1">
                {(observaciones.length ? observaciones : ['Sin observaciones.']).map((o, i) => (
                  <li key={i} className="flex gap-2 text-xs text-gray-700 leading-snug">
                    <span className="text-[#16B23C] font-bold">•</span><span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex justify-between text-sm px-3 py-1.5 border-b border-[#E2E7EE]">
                <span className="text-[#636B73]">Subtotal</span><span className="font-bold text-[#0D1B2A] tabular-nums">{formatCOP(Number(cot.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm px-3 py-1.5 border-b border-[#E2E7EE]">
                <span className="text-[#636B73]">IVA</span><span className="font-bold text-[#0D1B2A] tabular-nums">{formatCOP(Number(cot.iva_total))}</span>
              </div>
              <div className="flex justify-between items-center mt-2 px-3 py-2.5 bg-[#0D1B2A] text-white rounded-md border-l-4 border-[#16B23C] print:[-webkit-print-color-adjust:exact]">
                <span className="font-bold tracking-wider">TOTAL</span>
                <span className="text-xl font-bold tabular-nums">{formatCOP(Number(cot.total))}</span>
              </div>
              <p className="text-[10px] text-[#636B73] text-right mt-1.5 leading-snug">Son: {numeroEnLetras(Number(cot.total))}</p>
            </div>
          </div>

          {/* Datos para pago | Firma */}
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_260px] gap-4 mt-6 items-end break-inside-avoid">
            <div className="border border-[#E2E7EE] rounded-md px-4 py-3">
              <p className="text-[10px] font-bold tracking-widest text-[#636B73] mb-1">DATOS PARA PAGO</p>
              {[
                ['Entidad', EMPRESA.banco],
                [EMPRESA.tipo_cuenta, `No. ${EMPRESA.numero_cuenta}`],
                ['Titular', `${EMPRESA.razon_social} · NIT ${EMPRESA.nit}`],
              ].map(([label, valor]) => (
                <div key={label} className="flex gap-3 text-xs mt-0.5">
                  <span className="text-[#636B73] w-28 shrink-0">{label}</span>
                  <span className="font-bold text-[#0D1B2A]">{valor}</span>
                </div>
              ))}
            </div>
            <div className="text-center">
              <div className="border-t border-[#0D1B2A] mb-1" />
              <p className="text-sm font-bold text-[#0D1B2A]">{cot.creado_por_nombre || EMPRESA.razon_social}</p>
              <p className="text-[11px] text-[#636B73]">{cot.creado_por_nombre ? EMPRESA.razon_social : `Tel. ${EMPRESA.telefono}`}</p>
            </div>
          </div>

          <p className="text-center text-sm font-bold text-[#0D1B2A] mt-6">¡Gracias por tenernos en cuenta!</p>
          <p className="text-center text-[10px] text-gray-400 mt-4 pt-2 border-t border-[#E2E7EE]">{EMPRESA.razon_social} · {EMPRESA.slogan}</p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DOCUMENTOS DE LA VENTA (para armar el paquete) */}
      {/* ============================================================ */}
      <div className="max-w-[210mm] mx-auto mb-8 print:hidden">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-800">Documentos de esta venta</h2>
          <p className="text-sm text-gray-500">
            Todo lo relacionado con esta venta en un solo lugar, para descargar o imprimir.
          </p>
        </div>
        <DocumentosVenta datos={docsVenta} />
      </div>

      {/* ============================================================ */}
      {/* ANALISIS FINANCIERO (no se imprime, es uso interno) */}
      {/* ============================================================ */}
      {analisis && (
        <div className="max-w-[210mm] mx-auto mb-12 print:hidden">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-800">Analisis financiero interno</h2>
            <p className="text-sm text-gray-500">
              Costo real, IVA, utilidad y trazabilidad de esta venta. No se imprime ni se envia al cliente.
            </p>
          </div>
          <PanelAnalisisVenta analisis={analisis} items={analisisItems} trazabilidad={trazabilidad} />
        </div>
      )}
    </div>
  )
}
