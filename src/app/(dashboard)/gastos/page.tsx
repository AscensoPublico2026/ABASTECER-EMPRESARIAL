import Header from '@/components/layout/Header'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { obtenerCotizacionesParaAsignar } from '@/lib/queries/compras'
import { obtenerCuentasParaSelect } from '@/lib/queries/tesoreria'
import { formatCOP, formatFecha } from '@/lib/format'
import { Wallet, FileWarning, ShieldCheck, Target, FileText } from 'lucide-react'
import FormGasto from './FormGasto'
import AccionesGasto from './AccionesGasto'

export const dynamic = 'force-dynamic'

const CATEGORIAS: Record<string, string> = {
  CONSTITUCION: 'Constitucion',
  IMPUESTOS: 'Impuestos',
  SERVICIOS: 'Servicios',
  TRANSPORTE: 'Transporte',
  MARKETING: 'Marketing',
  TECNOLOGIA: 'Tecnologia',
  LEGAL: 'Legal',
  BANCARIO: 'Bancario',
  OTROS: 'Otros',
}

export default async function GastosPage() {
  const supabase = createServerSupabaseClient()

  // Nota: no se puede embeber documentos_soporte porque hay dos llaves foraneas
  // entre gastos y documentos_soporte (gasto_id y documento_soporte_id).
  // PostgREST no sabe cual usar, asi que se consulta aparte.
  const [{ data, error }, cotizaciones, cuentas, provRes] = await Promise.all([
    supabase
      .from('gastos')
      .select('*, cotizaciones(numero)')
      .order('fecha', { ascending: false })
      .limit(100),
    obtenerCotizacionesParaAsignar(),
    obtenerCuentasParaSelect(),
    // Terceros ya registrados, para llenar solos los datos del documento
    // soporte y no tener que digitar nombre y cedula cada vez
    supabase
      .from('proveedores')
      .select('id, razon_social, nit, tipo_documento, contacto_telefono, direccion, ciudad')
      .eq('estado', 'ACTIVO')
      .order('razon_social'),
  ])

  const proveedores = (provRes.data ?? []).map((p) => ({
    id: String(p.id),
    razon_social: String(p.razon_social ?? ''),
    nit: (p.nit as string | null) ?? null,
    tipo_documento: (p.tipo_documento as string | null) ?? null,
    contacto_telefono: (p.contacto_telefono as string | null) ?? null,
    direccion: (p.direccion as string | null) ?? null,
    ciudad: (p.ciudad as string | null) ?? null,
  }))

  const gastos = data ?? []

  // Documentos soporte de estos gastos, indexados por gasto_id
  const soportesPorGasto = new Map<string, { id: string; numero: string }>()
  if (gastos.length > 0) {
    const { data: soportes } = await supabase
      .from('documentos_soporte')
      .select('id, numero, gasto_id')
      .in('gasto_id', gastos.map((g) => g.id))

    for (const s of soportes ?? []) {
      if (s.gasto_id) {
        soportesPorGasto.set(String(s.gasto_id), { id: String(s.id), numero: String(s.numero) })
      }
    }
  }
  const totalGastos = gastos.reduce((s, g) => s + Number(g.monto ?? 0), 0)
  const totalCostoVenta = gastos
    .filter((g) => g.es_costo_venta)
    .reduce((s, g) => s + Number(g.monto ?? 0), 0)
  const totalOperativo = totalGastos - totalCostoVenta
  const noDeducibles = gastos.filter((g) => !g.deducible)
  const totalNoDeducible = noDeducibles.reduce((s, g) => s + Number(g.monto ?? 0), 0)

  return (
    <>
      <Header title="Gastos" subtitle="Gastos operativos y costos de venta" />
      <div className="p-8 space-y-8">

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total gastos</p>
            <p className="text-2xl font-bold text-gray-800 mt-1 tabular-nums">{formatCOP(totalGastos)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{gastos.length} registro(s)</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Costo de ventas</p>
            <p className="text-2xl font-bold text-blue-600 mt-1 tabular-nums">{formatCOP(totalCostoVenta)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Imputado a ventas especificas</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Gasto operativo</p>
            <p className="text-2xl font-bold text-purple-600 mt-1 tabular-nums">{formatCOP(totalOperativo)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Estructura del negocio</p>
          </div>
          <div className={`bg-white rounded-2xl p-6 shadow-sm border ${totalNoDeducible > 0 ? 'border-amber-200' : 'border-gray-100'}`}>
            <p className="text-sm text-gray-500">No deducible</p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${totalNoDeducible > 0 ? 'text-amber-600' : 'text-gray-800'}`}>
              {formatCOP(totalNoDeducible)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{noDeducibles.length} sin soporte valido</p>
          </div>
        </div>

        {/* Alerta de gastos sin soporte */}
        {noDeducibles.length > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <FileWarning className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">
                {noDeducibles.length} gasto(s) sin soporte por {formatCOP(totalNoDeducible)}
              </p>
              <p className="text-amber-700 mt-0.5">
                Sin factura ni documento soporte no se pueden deducir de impuestos.
                Si consigues el nombre y la cedula del tercero, genera el documento soporte desde la fila del gasto.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-800">Gastos registrados</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Costos de venta, gastos operativos y su estado tributario
              </p>
            </div>
            <FormGasto cotizaciones={cotizaciones} cuentas={cuentas} proveedores={proveedores} />
          </div>

          {error && <div className="px-6 py-4 bg-red-50 text-red-700 text-sm">Error: {error.message}</div>}

          {gastos.length === 0 && !error ? (
            <div className="text-center py-12 text-gray-400">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Sin gastos registrados</p>
              <p className="text-sm mt-1">
                Registra costos de venta como fletes, o gastos operativos como camara de comercio.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs">Fecha</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs">Concepto</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs">Categoria</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs">Venta</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-right">Monto</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-right">IVA</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs">Soporte</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((g) => {
                    const cot = g.cotizaciones as { numero?: string } | null
                    const ds = soportesPorGasto.get(String(g.id)) ?? null
                    return (
                      <tr key={g.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${!g.deducible ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatFecha(g.fecha)}</td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800">{g.concepto}</p>
                          {g.tercero_nombre && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {g.tercero_nombre}
                              {g.tercero_documento ? ` · ${g.tercero_documento}` : ''}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs whitespace-nowrap">
                            {CATEGORIAS[g.categoria] ?? g.categoria}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {g.es_costo_venta && cot?.numero ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-mono whitespace-nowrap">
                              <Target className="w-3 h-3" />
                              {cot.numero}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Operativo</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums font-medium text-gray-800">
                          {formatCOP(Number(g.monto))}
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums text-gray-500">
                          {Number(g.iva_incluido ?? 0) > 0 ? formatCOP(Number(g.iva_incluido)) : '-'}
                        </td>
                        <td className="px-4 py-4">
                          {g.deducible ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-md text-xs whitespace-nowrap">
                              <ShieldCheck className="w-3 h-3" />
                              {ds?.numero ?? 'Factura'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs whitespace-nowrap">
                              <FileWarning className="w-3 h-3" />
                              Sin soporte
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {ds?.id && (
                              <a
                                href={`/gastos/documento-soporte/${ds.id}`}
                                title="Ver documento soporte"
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <AccionesGasto
                              gasto={{
                                id: g.id,
                                concepto: g.concepto,
                                monto: Number(g.monto),
                                deducible: Boolean(g.deducible),
                                tieneDocumentoSoporte: Boolean(ds?.id),
                              }}
                              cotizaciones={cotizaciones}
                              cuentas={cuentas}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
