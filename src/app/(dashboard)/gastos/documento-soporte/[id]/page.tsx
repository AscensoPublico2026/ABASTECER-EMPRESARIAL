import { createServerSupabaseClient } from '@/lib/supabase/server'
import { EMPRESA } from '@/lib/empresa'
import { formatCOP, formatFecha } from '@/lib/format'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BotonImprimir from '@/app/(dashboard)/ventas/[id]/BotonImprimir'

export const dynamic = 'force-dynamic'

const TIPO_DOC: Record<string, string> = {
  CC: 'Cedula de Ciudadania',
  CE: 'Cedula de Extranjeria',
  NIT: 'NIT',
  PASAPORTE: 'Pasaporte',
  PEP: 'Permiso Especial de Permanencia',
}

export default async function DocumentoSoportePage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: ds } = await supabase
    .from('documentos_soporte')
    .select('*, cotizaciones(numero)')
    .eq('id', params.id)
    .single()

  if (!ds) notFound()

  const cot = ds.cotizaciones as { numero?: string } | null

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra superior */}
      <div className="print:hidden bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <Link href="/gastos" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver a gastos
        </Link>
        <BotonImprimir />
      </div>

      {/* Documento */}
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
            <h2 className="text-base font-bold text-gray-700 leading-tight">
              DOCUMENTO SOPORTE
            </h2>
            <p className="text-xs text-gray-500 leading-tight mt-0.5">
              en adquisiciones con no obligados a facturar
            </p>
            <p className="text-lg font-mono font-bold text-gray-800 mt-2">{ds.numero}</p>
            <p className="text-xs text-gray-500 mt-1">Fecha: {formatFecha(ds.fecha)}</p>
          </div>
        </div>

        {/* Marco legal */}
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-600">
            Expedido conforme al articulo 55 de la Resolucion DIAN 000042 de 2020 y el articulo
            1.6.1.4.12 del Decreto 1625 de 2016. Documento emitido por el adquirente para soportar
            costos y deducciones en operaciones con sujetos no obligados a expedir factura.
          </p>
        </div>

        {/* Adquirente */}
        <div className="mb-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Adquirente (quien paga)</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium text-gray-800">{EMPRESA.razon_social}</p>
            <p className="text-xs text-gray-500">NIT: {EMPRESA.nit}</p>
            <p className="text-xs text-gray-500">{EMPRESA.direccion}, {EMPRESA.ciudad}</p>
            <p className="text-xs text-gray-500">Regimen: {EMPRESA.regimen}</p>
          </div>
        </div>

        {/* Tercero */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">
            Vendedor o prestador del servicio (no obligado a facturar)
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium text-gray-800">{ds.tercero_nombre}</p>
            <p className="text-xs text-gray-500">
              {TIPO_DOC[ds.tercero_tipo_documento as string] ?? ds.tercero_tipo_documento}: {ds.tercero_documento}
            </p>
            {ds.tercero_direccion && <p className="text-xs text-gray-500">Direccion: {ds.tercero_direccion}</p>}
            {ds.tercero_ciudad && <p className="text-xs text-gray-500">Ciudad: {ds.tercero_ciudad}</p>}
            {ds.tercero_telefono && <p className="text-xs text-gray-500">Telefono: {ds.tercero_telefono}</p>}
          </div>
        </div>

        {/* Detalle */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="bg-gray-700 text-white">
              <th className="px-3 py-2 text-left text-xs">Concepto</th>
              <th className="px-3 py-2 text-center text-xs">Cantidad</th>
              <th className="px-3 py-2 text-right text-xs">Valor unitario</th>
              <th className="px-3 py-2 text-right text-xs">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="px-3 py-3 text-gray-800 border-b border-gray-100">{ds.concepto}</td>
              <td className="px-3 py-3 text-center text-gray-600 border-b border-gray-100">{Number(ds.cantidad)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-gray-600 border-b border-gray-100">
                {formatCOP(Number(ds.valor_unitario))}
              </td>
              <td className="px-3 py-3 text-right tabular-nums font-medium text-gray-800 border-b border-gray-100">
                {formatCOP(Number(ds.subtotal))}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Total */}
        <div className="flex justify-end mb-8">
          <div className="w-72">
            <div className="flex justify-between font-bold text-lg text-gray-800 pt-2 border-t-2 border-gray-300">
              <span>VALOR TOTAL:</span>
              <span className="tabular-nums">{formatCOP(Number(ds.subtotal))}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">
              Operacion no gravada con IVA (sujeto no responsable)
            </p>
          </div>
        </div>

        {/* Referencia interna */}
        {(cot?.numero || ds.observaciones) && (
          <div className="border-t border-gray-200 pt-4 mb-6 space-y-1 text-xs text-gray-600">
            {cot?.numero && <div><strong>Asociado a la venta:</strong> {cot.numero}</div>}
            {ds.observaciones && <div><strong>Observaciones:</strong> {ds.observaciones}</div>}
          </div>
        )}

        {/* Declaracion */}
        <div className="border-t border-gray-200 pt-4 mb-8">
          <p className="text-xs text-gray-700 leading-relaxed">
            El adquirente declara que el vendedor o prestador del servicio identificado en este
            documento <strong>no esta obligado a expedir factura de venta ni documento equivalente</strong>,
            y que la operacion aqui descrita fue efectivamente realizada y pagada.
          </p>
        </div>

        {/* Firmas */}
        <div className="grid grid-cols-2 gap-12 mt-12 pt-6 border-t border-gray-200">
          <div>
            <div className="border-b border-gray-400 mb-2 h-12"></div>
            <p className="text-xs text-gray-700 font-medium">Adquirente</p>
            <p className="text-xs text-gray-500">{EMPRESA.razon_social}</p>
            <p className="text-xs text-gray-500">NIT {EMPRESA.nit}</p>
          </div>
          <div>
            <div className="border-b border-gray-400 mb-2 h-12"></div>
            <p className="text-xs text-gray-700 font-medium">Vendedor / prestador del servicio</p>
            <p className="text-xs text-gray-500">{ds.tercero_nombre}</p>
            <p className="text-xs text-gray-500">
              {ds.tercero_tipo_documento} {ds.tercero_documento}
            </p>
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
