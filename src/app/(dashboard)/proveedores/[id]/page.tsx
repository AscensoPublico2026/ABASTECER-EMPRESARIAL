import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import { formatCOP, formatFecha } from '@/lib/format'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import FormEditarProveedor from './FormEditarProveedor'
import SubirDocumento from '@/components/documentos/SubirDocumento'

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

  // Historial de compras a este proveedor
  const { data: compras } = await supabase
    .from('facturas_compra')
    .select('id, numero_factura, fecha_factura, subtotal, iva_total, total, estado, forma_pago')
    .eq('proveedor_id', params.id)
    .order('fecha_factura', { ascending: false })
    .limit(20)

  const estado = ESTADOS_PROVEEDOR[proveedor.estado as string] ?? ESTADOS_PROVEEDOR.ACTIVO
  const historialCompras = compras ?? []
  const totalComprado = historialCompras.reduce((s, c) => s + Number(c.total ?? 0), 0)
  const categorias = (proveedor.categorias ?? []) as string[]

  // Documentos adjuntos
  const { data: docsData } = await supabase
    .from('documentos')
    .select('id, tipo_documento, nombre_archivo, url_archivo, created_at')
    .eq('entidad_tipo', 'PROVEEDOR')
    .eq('entidad_id', params.id)
    .order('created_at', { ascending: false })

  const documentos = docsData ?? []

  return (
    <>
      <Header title={proveedor.razon_social} subtitle="Perfil completo del proveedor" />
      <div className="p-8 space-y-6">
        <Link href="/proveedores" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm w-fit">
          <ArrowLeft className="w-4 h-4" /> Volver a proveedores
        </Link>

        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${estado.color}`}>{estado.etiqueta}</span>
          {proveedor.nit && <span className="text-sm text-gray-500">NIT: {proveedor.nit}</span>}
          {proveedor.dias_credito > 0 && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-medium">Credito {proveedor.dias_credito} dias</span>}
          {totalComprado > 0 && <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">Total comprado: {formatCOP(totalComprado)}</span>}
        </div>

        {/* Categorias/etiquetas */}
        {categorias.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categorias.map((cat) => (
              <span key={cat} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium">{cat}</span>
            ))}
          </div>
        )}

        <FormEditarProveedor proveedor={proveedor} />

        {/* Documentos */}
        <SubirDocumento
          entidadTipo="PROVEEDOR"
          entidadId={params.id}
          tiposPermitidos={[
            { value: 'RUT', label: 'RUT' },
            { value: 'CAMARA_COMERCIO', label: 'Camara de Comercio' },
            { value: 'CERTIFICADO_BANCARIO', label: 'Certificado Bancario' },
            { value: 'ESTADOS_FINANCIEROS', label: 'Estados Financieros' },
            { value: 'OTRO', label: 'Otro documento' },
          ]}
          documentosExistentes={documentos}
        />

        {/* Historial de compras */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-gray-800">Historial de compras ({historialCompras.length})</h3>
          </div>
          {historialCompras.length === 0 ? (
            <p className="px-6 py-6 text-sm text-gray-400">Sin compras registradas a este proveedor.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-2 font-medium text-gray-500">No. Factura</th>
                  <th className="px-6 py-2 font-medium text-gray-500">Fecha</th>
                  <th className="px-6 py-2 font-medium text-gray-500 text-right">Subtotal</th>
                  <th className="px-6 py-2 font-medium text-gray-500 text-right">IVA</th>
                  <th className="px-6 py-2 font-medium text-gray-500 text-right">Total</th>
                  <th className="px-6 py-2 font-medium text-gray-500">Estado</th>
                </tr></thead>
                <tbody>
                  {historialCompras.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-mono text-xs text-gray-700">{c.numero_factura ?? '-'}</td>
                      <td className="px-6 py-3 text-gray-500">{formatFecha(c.fecha_factura)}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-gray-600">{formatCOP(Number(c.subtotal))}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-gray-600">{formatCOP(Number(c.iva_total))}</td>
                      <td className="px-6 py-3 text-right tabular-nums font-medium">{formatCOP(Number(c.total))}</td>
                      <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${c.estado === 'PAGADA' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c.estado === 'PAGADA' ? 'Pagada' : 'Por pagar'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
