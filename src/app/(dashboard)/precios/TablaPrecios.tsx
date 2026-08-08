'use client'

import React, { useState, useMemo } from 'react'
import { formatCOP } from '@/lib/format'
import { SEMAFORO_INFO, type FilaListadoPrecios, type Semaforo } from '@/lib/precios/tipos'
import { Search, Printer, AlertTriangle, Clock } from 'lucide-react'

interface Props {
  filas: FilaListadoPrecios[]
}

/** Solo el nombre corto del proveedor, para que la tabla no se desborde */
function corto(nombre: string | null, max = 18): string {
  if (!nombre) return '—'
  return nombre.length > max ? nombre.slice(0, max - 1) + '…' : nombre
}

export default function TablaPrecios({ filas }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroSemaforo, setFiltroSemaforo] = useState<Semaforo | 'TODOS' | 'ATENCION'>('TODOS')
  const [expandido, setExpandido] = useState<string | null>(null)

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return filas
      .filter((f) => {
        if (q && !`${f.codigo} ${f.nombre} ${f.categoria ?? ''} ${f.op1_proveedor ?? ''}`.toLowerCase().includes(q)) {
          return false
        }
        if (filtroSemaforo === 'TODOS') return true
        if (filtroSemaforo === 'ATENCION') {
          return ['PIERDE', 'APRETADO', 'SIN_PRECIO_VENTA', 'SIN_COTIZAR'].includes(f.semaforo)
        }
        return f.semaforo === filtroSemaforo
      })
      .sort((a, b) => {
        const oa = SEMAFORO_INFO[a.semaforo].orden
        const ob = SEMAFORO_INFO[b.semaforo].orden
        if (oa !== ob) return oa - ob
        return a.nombre.localeCompare(b.nombre)
      })
  }, [filas, busqueda, filtroSemaforo])

  const conteos = useMemo(() => {
    const c: Record<string, number> = {}
    for (const f of filas) c[f.semaforo] = (c[f.semaforo] ?? 0) + 1
    return c
  }, [filas])

  const necesitanAtencion = (conteos.PIERDE ?? 0) + (conteos.APRETADO ?? 0)
    + (conteos.SIN_PRECIO_VENTA ?? 0) + (conteos.SIN_COTIZAR ?? 0)

  return (
    <div className="space-y-4">

      {/* ---------- Resumen por semaforo ---------- */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 print:hidden">
        <button
          onClick={() => setFiltroSemaforo('TODOS')}
          className={`px-3 py-2.5 rounded-xl border text-left transition ${
            filtroSemaforo === 'TODOS' ? 'border-gray-800 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <p className="text-lg font-bold text-gray-800 tabular-nums">{filas.length}</p>
          <p className="text-xs text-gray-500">Todos</p>
        </button>
        {(['BIEN', 'JUSTO', 'APRETADO', 'PIERDE', 'SIN_COTIZAR'] as Semaforo[]).map((s) => (
          <button
            key={s}
            onClick={() => setFiltroSemaforo(filtroSemaforo === s ? 'TODOS' : s)}
            className={`px-3 py-2.5 rounded-xl border text-left transition ${
              filtroSemaforo === s ? 'border-gray-800 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${SEMAFORO_INFO[s].punto}`} />
              <p className="text-lg font-bold text-gray-800 tabular-nums">{conteos[s] ?? 0}</p>
            </div>
            <p className="text-xs text-gray-500 truncate">{SEMAFORO_INFO[s].etiqueta}</p>
          </button>
        ))}
      </div>

      {necesitanAtencion > 0 && filtroSemaforo === 'TODOS' && (
        <button
          onClick={() => setFiltroSemaforo('ATENCION')}
          className="w-full flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left hover:bg-amber-100 transition print:hidden"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-900 flex-1">
            <strong>{necesitanAtencion} producto{necesitanAtencion !== 1 ? 's' : ''}</strong> necesita
            atencion: pierdes plata, el margen esta muy apretado, o falta el precio.
          </p>
          <span className="text-xs text-amber-700 font-medium whitespace-nowrap">Ver solo esos →</span>
        </button>
      )}

      {/* ---------- Buscador ---------- */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por producto, codigo, categoria o proveedor..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 whitespace-nowrap"
        >
          <Printer className="w-4 h-4" /> Imprimir / PDF
        </button>
      </div>

      {/* Encabezado solo para la version impresa */}
      <div className="hidden print:block mb-4">
        <h1 className="text-lg font-bold text-gray-900">Listado de precios · Abastecer Empresarial SAS</h1>
        <p className="text-xs text-gray-600">
          {visibles.length} productos · Generado el {new Date().toLocaleDateString('es-CO')}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Uso interno. Contiene costos y proveedores.
        </p>
      </div>

      {/* ---------- La tabla ---------- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto print:border-0 print:shadow-none print:rounded-none">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left border-b border-gray-200">
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-xs">Producto</th>
              <th className="px-3 py-2.5 font-semibold text-blue-700 text-xs text-right">MI PRECIO<br />DE VENTA</th>
              <th className="px-3 py-2.5 font-semibold text-gray-600 text-xs text-right">Conseguirlo<br />por debajo de</th>
              <th className="px-3 py-2.5 font-semibold text-green-700 text-xs">1a OPCION<br />(mas barata)</th>
              <th className="px-3 py-2.5 font-semibold text-gray-600 text-xs">2a opcion</th>
              <th className="px-3 py-2.5 font-semibold text-gray-600 text-xs">3a opcion</th>
              <th className="px-3 py-2.5 font-semibold text-purple-700 text-xs text-right">Mercado<br />(competencia)</th>
              <th className="px-3 py-2.5 font-semibold text-gray-600 text-xs text-right">Margen</th>
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-xs">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => {
              const info = SEMAFORO_INFO[f.semaforo]
              const abierto = expandido === f.producto_id
              return (
                /* Fragmento con key: cada producto puede rendir dos filas
                   (la principal y el detalle expandido) */
                <React.Fragment key={f.producto_id}>
                  <tr
                    onClick={() => setExpandido(abierto ? null : f.producto_id)}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer print:cursor-auto"
                  >
                    {/* Producto */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 leading-tight">{f.nombre}</p>
                      <p className="text-xs text-gray-400 font-mono">{f.codigo}</p>
                    </td>

                    {/* Mi precio de venta */}
                    <td className="px-3 py-3 text-right">
                      {f.mi_precio_venta > 0 ? (
                        <>
                          <p className="font-bold text-blue-700 tabular-nums">{formatCOP(f.mi_precio_venta)}</p>
                          {f.precio_lista === 0 && (
                            <p className="text-xs text-gray-400">calculado</p>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-purple-600 font-medium">definir</span>
                      )}
                    </td>

                    {/* Costo objetivo */}
                    <td className="px-3 py-3 text-right">
                      {f.costo_objetivo > 0 ? (
                        <>
                          <p className="tabular-nums text-gray-700 font-medium">{formatCOP(f.costo_objetivo)}</p>
                          <p className="text-xs text-gray-400">para ganar {f.margen_minimo_pct}%</p>
                        </>
                      ) : <span className="text-gray-300">—</span>}
                    </td>

                    {/* 1a opcion */}
                    <td className="px-3 py-3">
                      {f.op1_precio !== null ? (
                        <>
                          <p className={`font-bold tabular-nums ${
                            f.op1_precio <= f.costo_objetivo ? 'text-green-700' : 'text-red-600'
                          }`}>
                            {formatCOP(f.op1_precio)}
                          </p>
                          <p className="text-xs text-gray-500 truncate" title={f.op1_proveedor ?? ''}>
                            {corto(f.op1_proveedor)}
                          </p>
                          {!f.op1_disponible && (
                            <span className="text-xs text-red-600">sin existencias</span>
                          )}
                        </>
                      ) : <span className="text-xs text-gray-400">falta cotizar</span>}
                    </td>

                    {/* 2a opcion */}
                    <td className="px-3 py-3">
                      {f.op2_precio !== null ? (
                        <>
                          <p className="tabular-nums text-gray-600">{formatCOP(f.op2_precio)}</p>
                          <p className="text-xs text-gray-400 truncate" title={f.op2_proveedor ?? ''}>
                            {corto(f.op2_proveedor)}
                          </p>
                        </>
                      ) : <span className="text-gray-300">—</span>}
                    </td>

                    {/* 3a opcion */}
                    <td className="px-3 py-3">
                      {f.op3_precio !== null ? (
                        <>
                          <p className="tabular-nums text-gray-600">{formatCOP(f.op3_precio)}</p>
                          <p className="text-xs text-gray-400 truncate" title={f.op3_proveedor ?? ''}>
                            {corto(f.op3_proveedor)}
                          </p>
                        </>
                      ) : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Mercado */}
                    <td className="px-3 py-3 text-right">
                      {f.num_precios_mercado > 0 ? (
                        <>
                          <p className="tabular-nums text-purple-700 font-medium">
                            {formatCOP(f.mercado_promedio ?? 0)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatCOP(f.mercado_min ?? 0)} a {formatCOP(f.mercado_max ?? 0)}
                          </p>
                          {f.sobre_el_mercado && (
                            <span className="text-xs text-blue-600 font-medium">estas por encima</span>
                          )}
                        </>
                      ) : <span className="text-xs text-gray-400">sin datos</span>}
                    </td>

                    {/* Margen */}
                    <td className="px-3 py-3 text-right">
                      {f.margen_mejor_opcion !== null ? (
                        <>
                          <p className={`font-bold tabular-nums ${
                            f.margen_mejor_opcion >= f.margen_minimo_pct ? 'text-green-600'
                            : f.margen_mejor_opcion >= 10 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {f.margen_mejor_opcion.toFixed(1)}%
                          </p>
                          {f.utilidad_por_unidad !== null && (
                            <p className="text-xs text-gray-400 tabular-nums">
                              {formatCOP(f.utilidad_por_unidad)} c/u
                            </p>
                          )}
                        </>
                      ) : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${info.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${info.punto}`} />
                        {info.etiqueta}
                      </span>
                      {(f.precio_vencido || (f.dias_del_precio !== null && f.dias_del_precio > 90)) && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {f.precio_vencido ? 'precio vencido' : `${f.dias_del_precio}d`}
                        </p>
                      )}
                    </td>
                  </tr>

                  {/* Detalle expandido */}
                  {abierto && (
                    <tr className="bg-gray-50 print:hidden">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                          <div className="bg-white rounded-xl p-3 border border-gray-200">
                            <p className="font-semibold text-gray-700 mb-1.5">Que dice el semaforo</p>
                            <p className="text-gray-600 leading-relaxed">{info.explicacion}</p>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-gray-200">
                            <p className="font-semibold text-gray-700 mb-1.5">Margen de maniobra</p>
                            {f.margen_de_maniobra !== null ? (
                              <p className={f.margen_de_maniobra >= 0 ? 'text-green-700' : 'text-red-700'}>
                                {f.margen_de_maniobra >= 0
                                  ? `Te sobran ${formatCOP(f.margen_de_maniobra)} por unidad frente a tu costo objetivo.`
                                  : `Te faltan ${formatCOP(Math.abs(f.margen_de_maniobra))} por unidad para llegar a tu margen.`}
                              </p>
                            ) : <p className="text-gray-400">Falta cotizar</p>}
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-gray-200">
                            <p className="font-semibold text-gray-700 mb-1.5">Precio minimo con margen</p>
                            {f.precio_minimo_con_margen !== null ? (
                              <p className="text-gray-600">
                                Comprando al mejor proveedor, no vendas por debajo de{' '}
                                <strong className="tabular-nums">{formatCOP(f.precio_minimo_con_margen)}</strong>.
                              </p>
                            ) : <p className="text-gray-400">Falta cotizar</p>}
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-gray-200">
                            <p className="font-semibold text-gray-700 mb-1.5">Datos del producto</p>
                            <p className="text-gray-600">Costo promedio historico: <strong className="tabular-nums">{formatCOP(f.costo_promedio)}</strong></p>
                            <p className="text-gray-600">En bodega: <strong>{f.stock_actual}</strong> {f.unidad_medida ?? 'und'}</p>
                            <p className="text-gray-600">{f.num_proveedores} proveedor{f.num_proveedores !== 1 ? 'es' : ''} con precio</p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <a
                            href={`/inventario/${f.producto_id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100"
                          >
                            Ver producto y agregar precios
                          </a>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>

        {visibles.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 text-sm">No hay productos que coincidan con la busqueda.</p>
          </div>
        )}
      </div>

      {/* Leyenda, tambien se imprime */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 print:border-0 print:p-0">
        <p className="text-xs font-semibold text-gray-700 mb-2">Como leer esta tabla</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-600">
          <p><strong>Mi precio de venta:</strong> lo que se le cobra al cliente. Si dice &quot;calculado&quot;, sale del costo y el margen; conviene fijarlo a mano.</p>
          <p><strong>Conseguirlo por debajo de:</strong> el maximo que se puede pagar para ganar el margen propuesto.</p>
          <p><strong>1a, 2a y 3a opcion:</strong> proveedores del mas barato al mas caro. Los que tienen existencias van primero.</p>
          <p><strong>Mercado:</strong> a cuanto le vende la competencia al cliente final. Si tu precio esta por encima del maximo, se avisa.</p>
          <p><strong>Todos los precios estan SIN IVA</strong>, para que se puedan comparar entre si.</p>
          <p><strong>El reloj</strong> aparece cuando el precio tiene mas de 90 dias o ya se vencio: pidelo de nuevo.</p>
        </div>
      </div>
    </div>
  )
}
