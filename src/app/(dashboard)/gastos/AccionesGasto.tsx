'use client'

import { useState, useTransition } from 'react'
import { eliminarGasto, completarDocumentoSoporte, editarGasto, cargarGastoParaEditar } from './actions'
import { formatCOP } from '@/lib/format'
import { Trash2, FilePlus2, Loader2, X, AlertCircle, CheckCircle2, Pencil, Target } from 'lucide-react'

interface CotizacionOpcion {
  id: string
  numero: string
  cliente_nombre?: string
}

interface Props {
  gasto: {
    id: string
    concepto: string
    monto: number
    deducible: boolean
    tieneDocumentoSoporte: boolean
  }
  cotizaciones?: CotizacionOpcion[]
}

const CATEGORIAS_GASTO = [
  ['CONSTITUCION', 'Constitucion'],
  ['IMPUESTOS', 'Impuestos'],
  ['SERVICIOS', 'Servicios'],
  ['TRANSPORTE', 'Transporte'],
  ['MARKETING', 'Marketing'],
  ['TECNOLOGIA', 'Tecnologia'],
  ['LEGAL', 'Legal'],
  ['BANCARIO', 'Bancario'],
  // Un activo fijo sale del banco pero no es gasto del periodo. Tienen que
  // estar en esta lista o al editar un activo el select saldria en blanco.
  ['ACTIVO_FIJO', 'Activo fijo (impresora, equipo)'],
  ['MANTENIMIENTO_ACTIVO', 'Mantenimiento de un activo'],
  ['OTROS', 'Otros'],
] as const

export default function AccionesGasto({ gasto, cotizaciones = [] }: Props) {
  const [pendiente, startTransition] = useTransition()
  const [modal, setModal] = useState<null | 'soporte' | 'eliminar' | 'editar'>(null)
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  // Estado del formulario de edicion
  const [cargando, setCargando] = useState(false)
  const [concepto, setConcepto] = useState('')
  const [montoTxt, setMontoTxt] = useState('')
  const [ivaTxt, setIvaTxt] = useState('')
  const [fecha, setFecha] = useState('')
  const [categoria, setCategoria] = useState('OTROS')
  const [esCostoVenta, setEsCostoVenta] = useState(false)
  const [reparto, setReparto] = useState<{ cotizacion_id: string; monto: string }[]>([])
  const [notas, setNotas] = useState('')


  function cerrar() {
    setModal(null)
    setResultado(null)
  }

  function limpiarNum(v: string) {
    return Number(v.replace(/\./g, '').replace(',', '.')) || 0
  }

  async function abrirEditar() {
    setModal('editar')
    setResultado(null)
    setCargando(true)
    try {
      const d = await cargarGastoParaEditar(gasto.id)
      if (!d) {
        setResultado({ ok: false, mensaje: 'No se pudo cargar el gasto.' })
        setCargando(false)
        return
      }
      setConcepto(d.concepto)
      setMontoTxt(String(d.monto))
      setIvaTxt(String(d.iva_incluido))
      setFecha(d.fecha)
      setCategoria(d.categoria)
      setEsCostoVenta(d.es_costo_venta)
      // Cargar el reparto que ya existe
      if (d.reparto && d.reparto.length > 0) {
        setReparto(d.reparto.map((r) => ({ cotizacion_id: r.cotizacion_id, monto: String(r.monto) })))
      } else if (d.cotizacion_id) {
        // Compatibilidad: si no hay reparto pero si cotizacion_id vieja, mostrarla
        setReparto([{ cotizacion_id: d.cotizacion_id, monto: String(d.monto) }])
      } else {
        setReparto([{ cotizacion_id: '', monto: '' }])
      }
      
      setNotas(d.notas ?? '')
    } catch (e) {
      setResultado({ ok: false, mensaje: e instanceof Error ? e.message : 'Error al cargar.' })
    }
    setCargando(false)
  }

  function guardarEdicion() {
    const fd = new FormData()
    fd.set('gasto_id', gasto.id)
    fd.set('concepto', concepto)
    fd.set('monto', montoTxt)
    fd.set('iva_incluido', ivaTxt || '0')
    fd.set('fecha', fecha)
    fd.set('categoria', categoria)
    fd.set('notas', notas)
    if (esCostoVenta) {
      fd.set('es_costo_venta', 'true')
      // Enviar el reparto como JSON, igual que en registrarGasto
      const repartoLimpio = reparto
        .filter((r) => r.cotizacion_id && limpiarNum(r.monto) > 0)
        .map((r) => ({ cotizacion_id: r.cotizacion_id, monto: limpiarNum(r.monto) }))
      fd.set('reparto', JSON.stringify(repartoLimpio))
      fd.set('cotizacion_id', repartoLimpio[0]?.cotizacion_id ?? '')
    }

    setResultado(null)
    startTransition(async () => {
      const res = await editarGasto(fd)
      setResultado(res)
      if (res.ok) setTimeout(cerrar, 2200)
    })
  }

  const montoNum = limpiarNum(montoTxt)
  const ivaNum = limpiarNum(ivaTxt)
  const cambioMonto = montoNum > 0 && montoNum !== gasto.monto

  function handleSoporte(formData: FormData) {
    formData.set('gasto_id', gasto.id)
    setResultado(null)
    startTransition(async () => {
      const res = await completarDocumentoSoporte(formData)
      setResultado(res)
      if (res.ok) setTimeout(cerrar, 2000)
    })
  }

  function handleEliminar(formData: FormData) {
    formData.set('gasto_id', gasto.id)
    setResultado(null)
    startTransition(async () => {
      const res = await eliminarGasto(formData)
      setResultado(res)
      if (res.ok) setTimeout(cerrar, 1500)
    })
  }

  return (
    <>
      {!gasto.tieneDocumentoSoporte && !gasto.deducible && (
        <button
          onClick={() => setModal('soporte')}
          title="Generar documento soporte"
          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
        </button>
      )}

      <button
        onClick={abrirEditar}
        title="Editar el gasto"
        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setModal('eliminar')}
        title="Eliminar gasto"
        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* ===== MODAL EDITAR ===== */}
      {modal === 'editar' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg my-8 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h3 className="font-semibold text-gray-800">Editar gasto</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Actual: {formatCOP(gasto.monto)}
                </p>
              </div>
              <button onClick={cerrar} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {cargando ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                <p className="text-sm text-gray-500 mt-3">Cargando el gasto...</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Al guardar se ajusta la salida de caja y, si es costo de una venta,
                    se recalcula su utilidad. El 4x1000 tambien se recalcula solo.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
                  <input
                    type="text"
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto total *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={montoTxt}
                      onChange={(e) => setMontoTxt(e.target.value)}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm tabular-nums text-right ${
                        cambioMonto ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                      }`}
                    />
                    {cambioMonto && (
                      <p className="text-xs text-amber-700 mt-1">
                        Antes: {formatCOP(gasto.monto)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IVA incluido</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ivaTxt}
                      onChange={(e) => setIvaTxt(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm tabular-nums text-right"
                    />
                    {ivaNum > montoNum && montoNum > 0 && (
                      <p className="text-xs text-red-600 mt-1">El IVA no puede superar el monto</p>
                    )}
                  </div>
                </div>

                {montoNum > 0 && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-600 flex justify-between">
                    <span>Base sin IVA:</span>
                    <span className="tabular-nums font-medium text-gray-800">
                      {formatCOP(montoNum - ivaNum)}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                    >
                      {CATEGORIAS_GASTO.map(([v, t]) => (
                        <option key={v} value={v}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Costo de venta con REPARTO MULTIPLE */}
                {cotizaciones.length > 0 && (
                  <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 space-y-3">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={esCostoVenta}
                        onChange={(e) => setEsCostoVenta(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-blue-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-blue-900">Es costo de una venta</span>
                        <p className="text-xs text-blue-700 mt-0.5">
                          Se descuenta de la utilidad de esa venta. Si no lo marcas, es gasto operativo.
                        </p>
                      </div>
                    </label>

                    {esCostoVenta && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-medium text-blue-800">
                            <Target className="w-3 h-3 inline mr-1" />
                            A que ventas
                          </label>
                          {reparto.length > 1 && montoNum > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const conVenta = reparto.filter((r) => r.cotizacion_id)
                                if (conVenta.length === 0 || montoNum <= 0) return
                                const parte = Math.floor(montoNum / conVenta.length)
                                const sobrante = montoNum - parte * conVenta.length
                                let primera = true
                                setReparto(reparto.map((r) => {
                                  if (!r.cotizacion_id) return r
                                  const v = primera ? parte + sobrante : parte
                                  primera = false
                                  return { ...r, monto: String(v) }
                                }))
                              }}
                              className="text-xs text-blue-600 hover:underline font-medium"
                            >
                              Repartir igual
                            </button>
                          )}
                        </div>

                        {reparto.map((r, i) => (
                          <div key={i} className="flex gap-2 items-start">
                            <select
                              value={r.cotizacion_id}
                              onChange={(e) => setReparto(reparto.map((x, j) => j === i ? { ...x, cotizacion_id: e.target.value } : x))}
                              className="flex-1 px-2 py-2 border border-blue-200 rounded-lg text-xs bg-white"
                            >
                              <option value="">Seleccionar venta</option>
                              {cotizaciones
                                .filter((c) => c.id === r.cotizacion_id || !reparto.some((x) => x.cotizacion_id === c.id))
                                .map((c) => (
                                  <option key={c.id} value={c.id}>{c.numero}{c.cliente_nombre ? ` · ${c.cliente_nombre}` : ''}</option>
                                ))}
                            </select>
                            <input
                              value={r.monto}
                              onChange={(e) => setReparto(reparto.map((x, j) => j === i ? { ...x, monto: e.target.value } : x))}
                              inputMode="numeric"
                              placeholder="Monto"
                              className="w-24 px-2 py-2 border border-blue-200 rounded-lg text-xs text-right bg-white tabular-nums"
                            />
                            <button
                              type="button"
                              onClick={() => setReparto(reparto.length === 1 ? reparto : reparto.filter((_, j) => j !== i))}
                              disabled={reparto.length === 1}
                              className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => setReparto([...reparto, { cotizacion_id: '', monto: '' }])}
                          disabled={reparto.length >= cotizaciones.length}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium disabled:opacity-40"
                        >
                          + Agregar otra venta
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none"
                  />
                </div>

                <p className="text-xs text-gray-500">
                  El soporte tributario (factura o documento soporte) no se cambia aqui.
                  Si necesitas generar el documento soporte, usa el boton de la hoja con el signo mas.
                </p>

                {resultado && (
                  <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    <span>{resultado.mensaje}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={cerrar}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={guardarEdicion}
                    disabled={pendiente || montoNum <= 0 || ivaNum > montoNum}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {pendiente && <Loader2 className="w-4 h-4 animate-spin" />} Guardar cambios
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== MODAL DOCUMENTO SOPORTE ===== */}
      {modal === 'soporte' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Generar documento soporte</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {gasto.concepto} · {formatCOP(gasto.monto)}
                </p>
              </div>
              <button onClick={cerrar} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form action={handleSoporte} className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-blue-800">
                  Con el nombre y la cedula de la persona a la que le pagaste, este gasto
                  pasa a ser <strong>deducible</strong> de impuestos.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input name="tercero_nombre" required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tipo doc</label>
                  <select name="tercero_tipo_documento" className="w-full px-2 py-2.5 border border-gray-200 rounded-xl text-sm">
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="NIT">NIT</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="PEP">PEP</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Numero *</label>
                  <input name="tercero_documento" required inputMode="numeric" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Telefono</label>
                  <input name="tercero_telefono" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Direccion</label>
                  <input name="tercero_direccion" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>

              {resultado && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                  <span>{resultado.mensaje}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrar} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={pendiente} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {pendiente && <Loader2 className="w-4 h-4 animate-spin" />} Generar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL ELIMINAR ===== */}
      {modal === 'eliminar' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Eliminar gasto</h3>
              <button onClick={cerrar} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form action={handleEliminar} className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800 font-medium">
                  Se eliminara &quot;{gasto.concepto}&quot; por {formatCOP(gasto.monto)}
                </p>
                <ul className="text-xs text-red-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Se borra el movimiento de caja asociado</li>
                  <li>Se borra el documento soporte si lo tiene</li>
                  <li>Si era costo de una venta, se recalcula su utilidad</li>
                </ul>
              </div>

              {resultado && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                  <span>{resultado.mensaje}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrar} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={pendiente} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {pendiente && <Loader2 className="w-4 h-4 animate-spin" />} Eliminar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
