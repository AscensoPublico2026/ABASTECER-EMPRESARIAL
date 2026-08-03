import { formatCOP, formatFecha } from '@/lib/format'
import type { AnalisisVenta, AnalisisItem, EventoTrazabilidad } from '@/lib/queries/analisisVenta'
import {
  TrendingUp, AlertTriangle, CheckCircle2, Landmark,
  Wallet, PieChart, FileWarning, ListTree,
} from 'lucide-react'

interface Props {
  analisis: AnalisisVenta
  items: AnalisisItem[]
  trazabilidad: EventoTrazabilidad[]
}

const ETIQUETA_DOC: Record<string, { texto: string; color: string }> = {
  COTIZACION:     { texto: 'Cotizacion',      color: 'bg-blue-50 text-blue-700 border-blue-200' },
  FACTURA_COMPRA: { texto: 'Factura compra',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  EGRESO_CAJA:    { texto: 'Salida de caja',  color: 'bg-red-50 text-red-700 border-red-200' },
  GASTO:          { texto: 'Gasto',           color: 'bg-orange-50 text-orange-700 border-orange-200' },
  REMISION:       { texto: 'Remision',        color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  FACTURA_VENTA:  { texto: 'Factura venta',   color: 'bg-purple-50 text-purple-700 border-purple-200' },
  INGRESO_CAJA:   { texto: 'Entrada de caja', color: 'bg-green-50 text-green-700 border-green-200' },
}

export default function PanelAnalisisVenta({ analisis: a, items, trazabilidad }: Props) {
  const sinCosto = !a.tiene_costo_asignado
  const margenColor =
    a.margen_bruto_pct >= 30 ? 'text-green-600'
    : a.margen_bruto_pct >= 20 ? 'text-amber-600'
    : 'text-red-600'

  // Ordenar trazabilidad: cada compra seguida de su pago respectivo
  // Orden logico: Cotizacion → (Compra + su pago) × N → Entrega → Factura venta → Cobro

  interface EventoConEtapa extends EventoTrazabilidad {
    _esEtapa?: boolean
    _etiquetaEtapa?: string
    _grupo?: number
  }

  function separador(etiqueta: string): EventoConEtapa {
    return {
      _esEtapa: true, _etiquetaEtapa: etiqueta, documento_tipo: '',
      documento_numero: null, documento_fecha: null, valor: null,
      estado: null, documento_id: null,
    }
  }

  // Agrupar: emparejar cada compra/gasto con su salida de caja
  function ordenarTrazabilidad(): EventoConEtapa[] {
    const cotizacion = trazabilidad.filter((e) => e.documento_tipo === 'COTIZACION')
    const compras = trazabilidad.filter((e) => e.documento_tipo === 'FACTURA_COMPRA')
    const gastos = trazabilidad.filter((e) => e.documento_tipo === 'GASTO')
    const salidas = trazabilidad.filter((e) => e.documento_tipo === 'EGRESO_CAJA')
    const remisiones = trazabilidad.filter((e) => e.documento_tipo === 'REMISION')
    const facturasVenta = trazabilidad.filter((e) => e.documento_tipo === 'FACTURA_VENTA')
    const cobros = trazabilidad.filter((e) => e.documento_tipo === 'INGRESO_CAJA')

    const resultado: EventoConEtapa[] = []

    // 1. Cotizacion
    if (cotizacion.length > 0) {
      resultado.push(separador('1. Cotizacion'))
      for (const c of cotizacion) resultado.push(c)
    }

    // 2. Compras y gastos: cada documento seguido de SU pago
    // El concepto del movimiento de caja contiene el numero del documento,
    // por ejemplo "Compra FCJA1119" para la factura FCJA1119.
    const docsCosto = [...compras, ...gastos].sort((a, b) => {
      const fa = a.documento_fecha ?? ''
      const fb = b.documento_fecha ?? ''
      if (fa !== fb) return fa < fb ? -1 : 1
      return (a.documento_numero ?? '').localeCompare(b.documento_numero ?? '')
    })

    if (docsCosto.length > 0) {
      resultado.push(separador('2. Compras y costos'))

      // Cada salida de caja se consume una sola vez
      const salidasDisponibles = [...salidas]

      for (const doc of docsCosto) {
        resultado.push(doc)

        const numero = (doc.documento_numero ?? '').trim()
        if (!numero) continue

        // Buscar la salida de caja cuyo concepto menciona este documento
        const idx = salidasDisponibles.findIndex((p) =>
          (p.documento_numero ?? '').toUpperCase().includes(numero.toUpperCase())
        )

        if (idx !== -1) {
          resultado.push(salidasDisponibles[idx])
          salidasDisponibles.splice(idx, 1)
        }
      }

      // Salidas que no se pudieron emparejar con ningun documento
      for (const p of salidasDisponibles) resultado.push(p)
    }

    // 3. Entrega
    if (remisiones.length > 0) {
      resultado.push(separador('3. Entrega'))
      for (const r of remisiones) resultado.push(r)
    }

    // 4. Facturacion
    if (facturasVenta.length > 0) {
      resultado.push(separador('4. Facturacion'))
      for (const f of facturasVenta) resultado.push(f)
    }

    // 5. Cobro
    if (cobros.length > 0) {
      resultado.push(separador('5. Cobro del cliente'))
      for (const c of cobros) resultado.push(c)
    }

    return resultado
  }

  const trazabilidadOrdenada = ordenarTrazabilidad()

  return (
    <div className="print:hidden space-y-5">

      {/* Aviso si falta asignar costos */}
      {sinCosto && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Esta venta todavia no tiene costos asignados</p>
            <p className="text-amber-700 mt-0.5">
              Registra la factura de compra y asignale las unidades a esta cotizacion.
              Mientras no lo hagas, la utilidad que ves es la venta completa sin descontar costo.
            </p>
          </div>
        </div>
      )}

      {/* ============ RESUMEN EN 4 NUMEROS ============ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <PieChart className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Vendido</span>
          </div>
          <p className="text-xl font-bold text-gray-800 tabular-nums">{formatCOP(a.venta_subtotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Base sin IVA</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Nos costo</span>
          </div>
          <p className="text-xl font-bold text-gray-800 tabular-nums">{formatCOP(a.costo_real)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {a.num_facturas_compra} factura(s){a.costo_gastos > 0 ? ` + ${formatCOP(a.costo_gastos)} gastos` : ''}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Utilidad bruta</span>
          </div>
          <p className="text-xl font-bold text-green-600 tabular-nums">{formatCOP(a.utilidad_bruta)}</p>
          <p className={`text-xs mt-0.5 font-medium ${margenColor}`}>
            Margen {a.margen_bruto_pct.toFixed(1)}%
          </p>
        </div>

        <div className="bg-green-700 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs text-green-100 uppercase tracking-wide">Utilidad neta</span>
          </div>
          <p className="text-xl font-bold text-white tabular-nums">{formatCOP(a.utilidad_neta)}</p>
          <p className="text-xs text-green-100 mt-0.5">
            Lo que queda · {a.margen_neto_pct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* ============ TOTAL A SEPARAR (ARRIBA) ============ */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-red-900 text-sm">Total a separar de esta venta</h3>
          <p className="text-xs text-red-700 mt-0.5">Metelo en la cuenta de reserva para que no se gaste</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-red-600 tabular-nums">{formatCOP(a.total_a_separar)}</p>
          <p className="text-xs text-gray-500 mt-1">
            <span className="text-blue-600 font-medium">IVA {formatCOP(a.iva_neto_dian)}</span>
            {' + '}
            <span className="text-amber-600 font-medium">Simple {formatCOP(a.impuesto_simple_pendiente)}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ============ BOLSILLO 1: IVA ============ */}
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 text-sm">Bolsillo IVA</h3>
              <p className="text-xs text-blue-600">Plata que no es tuya, es de la DIAN</p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">IVA que cobraste al cliente</span>
              <span className="tabular-nums text-gray-800 font-medium">{formatCOP(a.iva_cobrado)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">IVA que pagaste en las compras</span>
              <span className="tabular-nums text-green-600 font-medium">- {formatCOP(a.iva_pagado)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t-2 border-blue-200">
              <span className="font-bold text-blue-900">Guardar para IVA</span>
              <span className="font-bold tabular-nums text-xl text-blue-700">
                {formatCOP(a.iva_neto_dian)}
              </span>
            </div>
          </div>

          <div className="mt-4 bg-blue-50 rounded-xl p-3.5">
            <p className="text-xs text-blue-800 leading-relaxed">
              Cobraste {formatCOP(a.iva_cobrado)} de IVA al cliente, pero ya pagaste {formatCOP(a.iva_pagado)} de IVA a tus proveedores. La diferencia es lo que le debes a la DIAN. Se paga cada bimestre.
            </p>
          </div>
        </div>

        {/* ============ BOLSILLO 2: IMPUESTO SIMPLE ============ */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 text-sm">Bolsillo Impuesto Simple</h3>
              <p className="text-xs text-amber-600">Sale de tu utilidad, se paga bimestral</p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">5% sobre la venta ({formatCOP(a.venta_subtotal)})</span>
              <span className="tabular-nums text-gray-800 font-medium">{formatCOP(a.impuesto_simple)}</span>
            </div>
            {a.retenciones > 0 && (
              <>
                <div className="flex justify-between items-center text-green-700">
                  <span>Retenciones que el cliente ya pago por ti:</span>
                  <span></span>
                </div>
                {a.retencion_retefuente > 0 && (
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-gray-500 text-xs">Retefuente</span>
                    <span className="tabular-nums text-green-600 font-medium">- {formatCOP(a.retencion_retefuente)}</span>
                  </div>
                )}
                {a.retencion_reteiva > 0 && (
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-gray-500 text-xs">ReteIVA</span>
                    <span className="tabular-nums text-green-600 font-medium">- {formatCOP(a.retencion_reteiva)}</span>
                  </div>
                )}
                {a.retencion_reteica > 0 && (
                  <div className="flex justify-between items-center pl-4">
                    <span className="text-gray-500 text-xs">ReteICA</span>
                    <span className="tabular-nums text-green-600 font-medium">- {formatCOP(a.retencion_reteica)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between items-center pt-3 border-t-2 border-amber-200">
              <span className="font-bold text-amber-900">Guardar para Simple</span>
              <span className="font-bold tabular-nums text-xl text-amber-700">
                {formatCOP(a.impuesto_simple_pendiente)}
              </span>
            </div>
          </div>

          <div className="mt-4 bg-amber-50 rounded-xl p-3.5">
            <p className="text-xs text-amber-800 leading-relaxed">
              {a.retenciones > 0
                ? `El impuesto es ${formatCOP(a.impuesto_simple)} pero el cliente ya le pago ${formatCOP(a.retenciones)} a la DIAN por ti (retenciones). Solo te falta guardar la diferencia.`
                : `Es el 5% de lo que vendiste. Nadie te retuvo, asi que debes guardar el 100% de este impuesto.`}
            </p>
          </div>
        </div>
      </div>

      {/* ============ PRODUCTO POR PRODUCTO ============ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm">Rentabilidad por producto</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Precio de compra real contra precio de venta
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-2.5 font-medium text-gray-500 text-xs">Producto</th>
                <th className="px-3 py-2.5 font-medium text-gray-500 text-xs text-center">Cant</th>
                <th className="px-3 py-2.5 font-medium text-gray-500 text-xs text-right">Compra c/u</th>
                <th className="px-3 py-2.5 font-medium text-gray-500 text-xs text-right">Venta c/u</th>
                <th className="px-3 py-2.5 font-medium text-gray-500 text-xs text-center">Multiplicador</th>
                <th className="px-3 py-2.5 font-medium text-gray-500 text-xs text-right">Utilidad</th>
                <th className="px-5 py-2.5 font-medium text-gray-500 text-xs text-right">Margen</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const negativo = it.utilidad < 0
                return (
                  <tr key={it.cotizacion_item_id} className={`border-b border-gray-50 last:border-0 ${negativo ? 'bg-orange-50/50' : ''}`}>
                    <td className="px-5 py-3 text-gray-800">{it.descripcion}</td>
                    <td className="px-3 py-3 text-center text-gray-600">{it.cantidad}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-600">
                      {it.tiene_costo_real
                        ? formatCOP(it.costo_unitario_real)
                        : <span className="text-gray-300 text-xs">sin asignar</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-600">{formatCOP(it.precio_venta_unitario)}</td>
                    <td className="px-3 py-3 text-center">
                      {it.multiplicador !== null ? (
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                          it.multiplicador >= 1.4 ? 'bg-green-50 text-green-700'
                          : it.multiplicador >= 1 ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                        }`}>
                          {it.multiplicador.toFixed(2)}x
                        </span>
                      ) : <span className="text-gray-300 text-xs">-</span>}
                    </td>
                    <td className={`px-3 py-3 text-right tabular-nums font-medium ${negativo ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCOP(it.utilidad)}
                    </td>
                    <td className={`px-5 py-3 text-right tabular-nums ${
                      it.margen_pct >= 30 ? 'text-green-600'
                      : it.margen_pct >= 20 ? 'text-amber-600'
                      : 'text-red-600'
                    }`}>
                      {it.margen_pct.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-green-50 font-medium">
                <td className="px-5 py-3 text-gray-800">TOTAL</td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-700">{formatCOP(a.costo_real)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-700">{formatCOP(a.venta_subtotal)}</td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3 text-right tabular-nums text-green-700">{formatCOP(a.utilidad_bruta)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-green-700">{a.margen_bruto_pct.toFixed(1)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ============ GASTOS SIN SOPORTE ============ */}
      {a.num_gastos_sin_soporte > 0 && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
          <FileWarning className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-orange-800">
              {a.num_gastos_sin_soporte} gasto(s) sin soporte por {formatCOP(a.costo_no_deducible)}
            </p>
            <p className="text-orange-700 mt-0.5">
              Sin factura ni documento soporte ese valor no es deducible de impuestos.
              Genera el documento soporte con los datos del tercero.
            </p>
          </div>
        </div>
      )}

      {/* ============ TRAZABILIDAD ============ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <ListTree className="w-4 h-4 text-gray-500" />
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Trazabilidad completa</h3>
            <p className="text-xs text-gray-500 mt-0.5">Historia de esta venta, en orden</p>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {trazabilidadOrdenada.map((ev, i) => {
            const et = ETIQUETA_DOC[ev.documento_tipo] ?? { texto: ev.documento_tipo, color: 'bg-gray-50 text-gray-600 border-gray-200' }
            const esEtapa = ev._esEtapa
            return esEtapa ? (
              <div key={`etapa-${i}`} className="px-5 py-2 bg-gray-50">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{ev._etiquetaEtapa}</span>
              </div>
            ) : (
              <div key={`${ev.documento_tipo}-${ev.documento_id ?? i}`} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50/50">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${et.color}`}>
                  {et.texto}
                </span>
                <span className="font-mono text-xs text-gray-700 flex-1 truncate">
                  {ev.documento_numero ?? '-'}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {ev.documento_fecha ? formatFecha(ev.documento_fecha) : '-'}
                </span>
                {ev.estado && (
                  <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline">{ev.estado}</span>
                )}
                <span className="tabular-nums text-sm text-gray-700 w-28 text-right font-medium">
                  {ev.valor !== null ? formatCOP(ev.valor) : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
