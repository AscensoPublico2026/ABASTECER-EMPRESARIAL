import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  obtenerAnalisisVenta, obtenerAnalisisItems, obtenerTrazabilidad,
} from '@/lib/queries/analisisVenta'
import { formatCOP, formatFecha } from '@/lib/format'
import ResumenPlata from '@/components/ventas/ResumenPlata'
import BotonImprimir from '../BotonImprimir'
import {
  construirTimeline, textoEstadoPago, hayComprasPorPagar, hayPagosEnOtraVenta,
} from '@/lib/ventas/timelineVenta'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

/**
 * INFORME DE LA VENTA - version para imprimir o guardar en PDF.
 *
 * El usuario esta armando un paquete fisico por cada venta (cotizacion,
 * remision, factura, soportes) y necesita meter ahi el informe de cuanto
 * gano. El panel del detalle de la venta esta marcado print:hidden, porque
 * en esa pagina lo que se imprime es la cotizacion PARA EL CLIENTE.
 *
 * Por eso el informe interno va en su propia pagina: asi se imprime
 * aparte, sin mezclarse con el documento del cliente, y sin arriesgarse a
 * mandarle al cliente un papel que dice cuanto le ganamos.
 */
const ETIQUETA: Record<string, string> = {
  COTIZACION: 'Cotizacion',
  FACTURA_COMPRA: 'Factura de compra',
  EGRESO_CAJA: 'Salida de plata',
  GASTO: 'Gasto',
  REMISION: 'Remision',
  FACTURA_VENTA: 'Factura de venta',
  INGRESO_CAJA: 'Entrada de plata',
}

export default async function InformeVentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = createServerSupabaseClient()
  const { data: cot } = await supabase
    .from('cotizaciones')
    .select('id, numero, fecha, estado, forma_pago, dias_credito, clientes(razon_social, nit)')
    .eq('id', id)
    .maybeSingle()

  if (!cot) notFound()

  const analisis = await obtenerAnalisisVenta(id)
  if (!analisis) notFound()

  const items = await obtenerAnalisisItems(id)

  // construirTimeline empareja cada factura de compra con su pago, colapsa
  // en una sola fila lo que se pago el mismo dia, y excluye los 4x1000.
  const timeline = construirTimeline(await obtenerTrazabilidad(id))
  const hayPorPagar = hayComprasPorPagar(timeline)
  const hayPagosFuera = hayPagosEnOtraVenta(timeline)

  const cliente = cot.clientes as { razon_social?: string; nit?: string } | null

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">

      {/* Barra de acciones: no se imprime */}
      <div className="print:hidden bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <Link
          href={`/ventas/${id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a la venta
        </Link>
        <BotonImprimir />
      </div>

      <div className="print:hidden max-w-[210mm] mx-auto px-4 pt-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-900 leading-relaxed">
            <strong>Este informe es de uso interno.</strong> Dice cuanto le ganaste al cliente,
            asi que NO se lo entregues. Es para tu paquete de la venta y para tu contador.
          </p>
          <p className="text-xs text-amber-800 mt-1.5">
            Al imprimir, en las opciones del navegador desactiva
            &quot;Encabezados y pies de pagina&quot; para que no salga la fecha ni el link.
          </p>
        </div>
      </div>

      {/* ---------------- HOJA ---------------- */}
      <div className="max-w-[210mm] mx-auto my-6 print:my-0 bg-white shadow-lg print:shadow-none p-10 print:p-[12mm] space-y-6 print:space-y-4">

        {/* Encabezado */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-gray-900 pb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Informe de la venta</h1>
            <p className="text-sm text-gray-600 mt-0.5">Abastecer Empresarial SAS</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold text-gray-900 text-lg">{cot.numero}</p>
            <p className="text-gray-600">{formatFecha(String(cot.fecha))}</p>
            <p className="text-xs text-gray-500 mt-0.5">{String(cot.estado).replace(/_/g, ' ')}</p>
          </div>
        </div>

        {/* Cliente */}
        <div className="grid grid-cols-2 gap-6 text-sm evitar-corte">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Cliente</p>
            <p className="font-medium text-gray-900">{cliente?.razon_social ?? 'Sin cliente'}</p>
            {cliente?.nit && <p className="text-gray-600 text-xs">NIT {cliente.nit}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Forma de pago</p>
            <p className="font-medium text-gray-900">
              {String(cot.forma_pago ?? 'Contado')}
              {Number(cot.dias_credito ?? 0) > 0 && ` a ${cot.dias_credito} dias`}
            </p>
          </div>
        </div>

        {/* LA CASCADA - nunca se debe partir: es el corazon del informe */}
        <div className="evitar-corte">
          <ResumenPlata analisis={analisis} />
        </div>

        {/* Producto por producto */}
        <div className="evitar-corte">
          <h2 className="font-bold text-gray-900 text-sm mb-2">Producto por producto</h2>
          <table className="w-full text-xs border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">Producto</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-700 border-b border-gray-300">Cant</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700 border-b border-gray-300">Me costo c/u</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700 border-b border-gray-300">Lo vendi c/u</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700 border-b border-gray-300">Gane</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700 border-b border-gray-300">Margen</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.cotizacion_item_id} className="border-b border-gray-200 last:border-0">
                  <td className="px-2 py-2 text-gray-800">{it.descripcion}</td>
                  <td className="px-2 py-2 text-center text-gray-700">{it.cantidad}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-gray-700">
                    {it.tiene_costo_real ? formatCOP(it.costo_unitario_real) : 'sin asignar'}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-gray-700">{formatCOP(it.precio_venta_unitario)}</td>
                  <td className={`px-2 py-2 text-right tabular-nums font-medium ${it.utilidad < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                    {formatCOP(it.utilidad)}
                  </td>
                  <td className={`px-2 py-2 text-right tabular-nums ${it.margen_pct < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                    {it.margen_pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td className="px-2 py-2 text-gray-900" colSpan={2}>TOTAL</td>
                <td className="px-2 py-2 text-right tabular-nums text-gray-900">{formatCOP(analisis.costo_real)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-gray-900">{formatCOP(analisis.venta_subtotal)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-gray-900">{formatCOP(analisis.utilidad_bruta)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-gray-900">{analisis.margen_bruto_pct.toFixed(1)}%</td>
              </tr>
            </tfoot>
          </table>
          {items.some((it) => it.utilidad < 0) && (
            <p className="text-xs text-red-700 mt-1.5">
              Hay productos en rojo: los vendiste mas barato de lo que te costaron.
            </p>
          )}
        </div>

        {/* Los dos bolsillos de impuestos.
            Esta era la seccion que quedaba recortada entre las dos hojas y
            se perdia. Con evitar-corte, si no alcanza en la hoja actual se
            pasa COMPLETA a la siguiente en vez de partirse. */}
        <div className="evitar-corte">
          <h2 className="font-bold text-gray-900 text-sm mb-2">Lo que hay que guardar para la DIAN</h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="border border-gray-300 p-3">
              <p className="font-semibold text-gray-900 mb-2">Bolsillo IVA</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-gray-600">IVA que le cobre al cliente</span><span className="tabular-nums">{formatCOP(analisis.iva_cobrado)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">IVA que pague en compras</span><span className="tabular-nums">- {formatCOP(analisis.iva_pagado)}</span></div>
                {analisis.retencion_reteiva > 0 && (
                  <div className="flex justify-between"><span className="text-gray-600">ReteIVA que me retuvieron</span><span className="tabular-nums">- {formatCOP(analisis.retencion_reteiva)}</span></div>
                )}
                <div className="flex justify-between border-t border-gray-300 pt-1 mt-1 font-bold">
                  <span>Guardar para IVA</span><span className="tabular-nums">{formatCOP(analisis.iva_neto_dian)}</span>
                </div>
              </div>
            </div>
            <div className="border border-gray-300 p-3">
              <p className="font-semibold text-gray-900 mb-2">Bolsillo Impuesto Simple</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-gray-600">5% de la venta sin IVA</span><span className="tabular-nums">{formatCOP(analisis.impuesto_simple)}</span></div>
                {(analisis.retencion_retefuente + analisis.retencion_reteica) > 0 && (
                  <div className="flex justify-between"><span className="text-gray-600">Retefuente y reteICA</span><span className="tabular-nums">- {formatCOP(analisis.retencion_retefuente + analisis.retencion_reteica)}</span></div>
                )}
                <div className="flex justify-between border-t border-gray-300 pt-1 mt-1 font-bold">
                  <span>Guardar para Simple</span><span className="tabular-nums">{formatCOP(analisis.impuesto_simple_pendiente)}</span>
                </div>
              </div>
              {analisis.retencion_reteiva > 0 && (analisis.retencion_retefuente + analisis.retencion_reteica) === 0 && (
                <p className="text-gray-500 mt-2 leading-relaxed">
                  La reteIVA no baja este impuesto: baja el del bolsillo IVA.
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 border-2 border-gray-900 px-3 py-2 flex items-center justify-between">
            <span className="font-bold text-gray-900 text-sm">TOTAL A GUARDAR PARA IMPUESTOS</span>
            <span className="font-bold text-gray-900 tabular-nums text-base">{formatCOP(analisis.total_a_separar)}</span>
          </div>
        </div>

        {/* Historia de la venta.
            Esta si puede partirse si es muy larga (una venta con muchas
            compras), pero el encabezado de la tabla se repite en la hoja
            siguiente y ninguna fila se corta por la mitad. */}
        <div>
          <h2 className="font-bold text-gray-900 text-sm mb-2">Historia de esta venta</h2>
          <table className="w-full text-xs border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b border-gray-300">Fecha</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b border-gray-300">Documento</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b border-gray-300">Numero</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-b border-gray-300">Estado</th>
                <th className="px-2 py-1.5 text-right font-semibold text-gray-700 border-b border-gray-300">Valor</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((fila, i) => {
                if (fila.esEtapa) {
                  return (
                    <tr key={`e-${i}`} className="bg-gray-50">
                      <td colSpan={5} className="px-2 py-1.5 font-semibold text-gray-700 uppercase text-[10px] tracking-wide border-t border-gray-300">
                        {fila.etiquetaEtapa}
                      </td>
                    </tr>
                  )
                }
                const e = fila.evento!
                const estado = textoEstadoPago(fila)
                const porPagar = fila.estadoPago === 'POR_PAGAR'
                return (
                  <tr key={`f-${i}`} className="border-b border-gray-200 last:border-0">
                    <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">
                      {e.documento_fecha ? formatFecha(e.documento_fecha) : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-gray-800">{ETIQUETA[e.documento_tipo] ?? e.documento_tipo}</td>
                    <td className="px-2 py-1.5 text-gray-600 font-mono">{e.documento_numero ?? '—'}</td>
                    <td className={`px-2 py-1.5 ${porPagar ? 'text-red-700 font-semibold' : 'text-gray-500'}`}>
                      {estado ?? ''}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 whitespace-nowrap">
                      {e.valor !== null ? formatCOP(e.valor) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {hayPorPagar && (
            <p className="text-xs text-red-700 mt-1.5 font-medium">
              Hay compras de esta venta que todavia NO se han pagado. Son cuentas por pagar
              vivas: la plata todavia no ha salido del banco.
            </p>
          )}
          {hayPagosFuera && (
            <p className="text-xs text-gray-500 mt-1.5">
              Las que dicen solo &quot;Pagada&quot; ya estan pagadas, pero esa compra se
              repartio entre varias ventas y el movimiento de banco quedo registrado en otra.
              El detalle del pago esta en el Libro de Tesoreria.
            </p>
          )}
        </div>

        {/* Avisos de calidad del dato */}
        {(!analisis.tiene_costo_asignado || analisis.num_gastos_sin_soporte > 0) && (
          <div className="border-2 border-red-600 p-3 text-xs space-y-1.5 evitar-corte">
            <p className="font-bold text-red-800">Atencion: este informe puede estar incompleto</p>
            {!analisis.tiene_costo_asignado && (
              <p className="text-red-700">
                Esta venta no tiene ninguna compra asignada. La ganancia que ves es la venta
                completa sin descontar lo que te costo la mercancia: NO es real.
              </p>
            )}
            {analisis.num_gastos_sin_soporte > 0 && (
              <p className="text-red-700">
                Hay {analisis.num_gastos_sin_soporte} gasto{analisis.num_gastos_sin_soporte !== 1 ? 's' : ''} sin
                soporte. Sin factura ni documento soporte, la DIAN no los acepta como costo.
              </p>
            )}
          </div>
        )}

        {/* Pie */}
        <div className="border-t border-gray-300 pt-3 text-xs text-gray-500">
          <p>
            Informe interno generado por el sistema. Los valores salen de las facturas de compra
            asignadas a esta venta, los gastos imputados y los movimientos de tesoreria.
          </p>
        </div>
      </div>
    </div>
  )
}
