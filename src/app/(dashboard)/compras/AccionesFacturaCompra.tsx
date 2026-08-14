'use client'

import { useState, useTransition, useRef } from 'react'
import { anularFacturaCompra, pagarFacturaCompra, editarFacturaCompra, cargarFacturaParaEditar } from './actions'
import { createClient } from '@/lib/supabase/client'
import { formatCOP } from '@/lib/format'
import { ivaPorcentaje } from '@/lib/numeros'
import {
  Pencil, Ban, DollarSign, FileText, FileDown, Loader2, X,
  AlertCircle, CheckCircle2, Upload, FileCheck, Trash2, Plus, Target, Package,
} from 'lucide-react'

interface CotizacionOpcion {
  id: string
  numero: string
  cliente_nombre: string
}

interface Props {
  factura: {
    id: string
    numero_factura: string | null
    fecha_factura: string
    forma_pago: string
    estado: string
    total: number
    retencion_total?: number
    soporte_url: string | null
    /** Si la compra se registro como documento soporte, el id del DS generado */
    documento_soporte_id?: string | null
    proveedor_id?: string | null
  }
  proveedores: { id: string; razon_social: string }[]
  
  productos?: { id: string; codigo: string; nombre: string; iva_porcentaje: number }[]
  cotizaciones?: CotizacionOpcion[]
}

interface AsignacionLocal {
  cotizacion_id: string
  cantidad: string
}

interface ItemLocal {
  producto_id: string
  descripcion: string
  cantidad: string
  precio_unitario: string
  iva_porcentaje: string
  asignaciones: AsignacionLocal[]
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function num(v: string) {
  return Number(v.replace(/\./g, '').replace(',', '.')) || 0
}

export default function AccionesFacturaCompra({
  factura, proveedores, productos = [], cotizaciones = [],
}: Props) {
  const [pendiente, startTransition] = useTransition()
  const [modal, setModal] = useState<null | 'editar' | 'pagar' | 'anular'>(null)
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [pdf, setPdf] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const pdfRef = useRef<HTMLInputElement>(null)

  // Estado del formulario de edicion completa
  const [cargando, setCargando] = useState(false)
  const [items, setItems] = useState<ItemLocal[]>([])
  const [proveedorId, setProveedorId] = useState(factura.proveedor_id ?? '')
  const [numeroFactura, setNumeroFactura] = useState(factura.numero_factura ?? '')
  const [fechaFactura, setFechaFactura] = useState(factura.fecha_factura?.slice(0, 10) ?? hoy())
  const [formaPago, setFormaPago] = useState(factura.forma_pago)
  const [notas, setNotas] = useState('')
  const [tieneRetencion, setTieneRetencion] = useState(false)
  const [retefuente, setRetefuente] = useState('')
  const [reteiva, setReteiva] = useState('')
  const [reteica, setReteica] = useState('')

  const anulada = factura.estado === 'ANULADA'
  const pagada = factura.estado === 'PAGADA'
  const ocupado = pendiente || subiendo

  function cerrar() {
    setModal(null)
    setResultado(null)
    setPdf(null)
    setItems([])
  }

  /** Abre el modal de edicion y carga los items reales de la factura */
  async function abrirEditar() {
    setModal('editar')
    setResultado(null)
    setCargando(true)
    try {
      const detalle = await cargarFacturaParaEditar(factura.id)
      if (!detalle) {
        setResultado({ ok: false, mensaje: 'No se pudo cargar la factura.' })
        setCargando(false)
        return
      }
      setProveedorId(detalle.proveedor_id ?? '')
      setNumeroFactura(detalle.numero_factura ?? '')
      setFechaFactura(detalle.fecha_factura?.slice(0, 10) ?? hoy())
      setFormaPago(detalle.forma_pago)
      setNotas(detalle.notas ?? '')
      const hayRetencion = detalle.retencion_retefuente > 0 || detalle.retencion_reteiva > 0 || detalle.retencion_reteica > 0
      setTieneRetencion(hayRetencion)
      setRetefuente(detalle.retencion_retefuente > 0 ? String(detalle.retencion_retefuente) : '')
      setReteiva(detalle.retencion_reteiva > 0 ? String(detalle.retencion_reteiva) : '')
      setReteica(detalle.retencion_reteica > 0 ? String(detalle.retencion_reteica) : '')
      setItems(detalle.items.map((it) => ({
        producto_id: it.producto_id ?? '',
        descripcion: it.descripcion,
        cantidad: String(it.cantidad),
        precio_unitario: String(it.precio_unitario),
        iva_porcentaje: String(it.iva_porcentaje),
        asignaciones: it.asignaciones
          .filter((a) => a.destino === 'VENTA' && a.cotizacion_id)
          .map((a) => ({ cotizacion_id: a.cotizacion_id as string, cantidad: String(a.cantidad) })),
      })))
    } catch (e) {
      setResultado({ ok: false, mensaje: e instanceof Error ? e.message : 'Error al cargar.' })
    }
    setCargando(false)
  }

  // ---- Manejo de items ----
  function agregarItem() {
    setItems([...items, { producto_id: '', descripcion: '', cantidad: '1', precio_unitario: '', iva_porcentaje: '19', asignaciones: [] }])
  }

  function eliminarItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  function actualizarItem(idx: number, campo: keyof ItemLocal, valor: string) {
    setItems(items.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)))
  }

  function seleccionarProducto(idx: number, productoId: string) {
    const p = productos.find((x) => x.id === productoId)
    setItems(items.map((it, i) => {
      if (i !== idx) return it
      if (!p) return { ...it, producto_id: '' }
      return {
        ...it,
        producto_id: p.id,
        descripcion: `${p.codigo} - ${p.nombre}`,
        iva_porcentaje: String(p.iva_porcentaje),
      }
    }))
  }

  function agregarAsignacion(idx: number) {
    const it = items[idx]
    const yaUsadas = it.asignaciones.map((a) => a.cotizacion_id)
    const siguiente = cotizaciones.find((c) => !yaUsadas.includes(c.id))
    if (!siguiente) return
    const asignado = it.asignaciones.reduce((s, a) => s + Number(a.cantidad || 0), 0)
    const disponible = Math.max(0, Number(it.cantidad || 0) - asignado)
    setItems(items.map((x, i) => i === idx ? {
      ...x,
      asignaciones: [...x.asignaciones, { cotizacion_id: siguiente.id, cantidad: String(disponible || '') }],
    } : x))
  }

  function actualizarAsignacion(idx: number, aIdx: number, campo: keyof AsignacionLocal, valor: string) {
    setItems(items.map((it, i) => i === idx ? {
      ...it,
      asignaciones: it.asignaciones.map((a, j) => j === aIdx ? { ...a, [campo]: valor } : a),
    } : it))
  }

  function quitarAsignacion(idx: number, aIdx: number) {
    setItems(items.map((it, i) => i === idx
      ? { ...it, asignaciones: it.asignaciones.filter((_, j) => j !== aIdx) }
      : it))
  }

  function totalAsignado(it: ItemLocal) {
    return it.asignaciones.reduce((s, a) => s + Number(a.cantidad || 0), 0)
  }

  function calcularTotales() {
    let subtotal = 0
    let iva = 0
    for (const it of items) {
      const sub = (Number(it.cantidad) || 0) * num(it.precio_unitario)
      subtotal += sub
      iva += sub * (ivaPorcentaje(it.iva_porcentaje) / 100)
    }
    const total = subtotal + iva
    const totalRetenciones = tieneRetencion ? num(retefuente) + num(reteiva) + num(reteica) : 0
    return { subtotal, iva, total, totalRetenciones, neto: total - totalRetenciones }
  }

  async function handleEditar() {
    // Validar
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const comprada = Number(it.cantidad) || 0
      const asignada = totalAsignado(it)
      if (asignada > comprada) {
        setResultado({ ok: false, mensaje: `Item ${i + 1}: compraste ${comprada} pero asignaste ${asignada}.` })
        return
      }
    }

    const itemsParseados = items
      .map((it) => ({
        producto_id: it.producto_id || null,
        descripcion: it.descripcion,
        cantidad: Number(it.cantidad) || 1,
        precio_unitario: num(it.precio_unitario),
        iva_porcentaje: ivaPorcentaje(it.iva_porcentaje),
        asignaciones: it.asignaciones
          .filter((a) => a.cotizacion_id && Number(a.cantidad) > 0)
          .map((a) => ({ cotizacion_id: a.cotizacion_id, cantidad: Number(a.cantidad) })),
      }))
      .filter((i) => i.descripcion && i.precio_unitario > 0)

    if (itemsParseados.length === 0) {
      setResultado({ ok: false, mensaje: 'Agrega al menos un item con precio.' })
      return
    }

    const formData = new FormData()
    formData.set('factura_id', factura.id)
    formData.set('proveedor_id', proveedorId)
    formData.set('numero_factura', numeroFactura)
    formData.set('fecha_factura', fechaFactura)
    formData.set('forma_pago', formaPago)
    formData.set('notas', notas)
    formData.set('items', JSON.stringify(itemsParseados))
    formData.set('retencion_retefuente', tieneRetencion ? (retefuente || '0') : '0')
    formData.set('retencion_reteiva', tieneRetencion ? (reteiva || '0') : '0')
    formData.set('retencion_reteica', tieneRetencion ? (reteica || '0') : '0')

    setResultado(null)
    setSubiendo(true)

    try {
      if (pdf) {
        const supabase = createClient()
        const ext = pdf.name.split('.').pop()
        const path = `factura_compra/${factura.id}/${Date.now()}_factura.${ext}`
        const { error } = await supabase.storage.from('documentos').upload(path, pdf, { contentType: pdf.type })
        if (error) {
          setResultado({ ok: false, mensaje: error.message })
          setSubiendo(false)
          return
        }
        const { data } = supabase.storage.from('documentos').getPublicUrl(path)
        formData.set('soporte_url', data.publicUrl)
        formData.set('soporte_nombre', pdf.name)
      }

      startTransition(async () => {
        const res = await editarFacturaCompra(formData)
        setResultado(res)
        setSubiendo(false)
        if (res.ok) setTimeout(cerrar, 2200)
      })
    } catch (e) {
      setResultado({ ok: false, mensaje: e instanceof Error ? e.message : 'Error.' })
      setSubiendo(false)
    }
  }

  function handlePagar(formData: FormData) {
    formData.set('factura_id', factura.id)
    setResultado(null)
    startTransition(async () => {
      const res = await pagarFacturaCompra(formData)
      setResultado(res)
      if (res.ok) setTimeout(cerrar, 1500)
    })
  }

  function handleAnular(formData: FormData) {
    formData.set('factura_id', factura.id)
    setResultado(null)
    startTransition(async () => {
      const res = await anularFacturaCompra(formData)
      setResultado(res)
      if (res.ok) setTimeout(cerrar, 2000)
    })
  }

  return (
    <div className="flex items-center gap-1">
      {factura.soporte_url && (
        <a
          href={factura.soporte_url}
          target="_blank"
          rel="noopener noreferrer"
          title="Ver el PDF de la factura del proveedor"
          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
        >
          <FileText className="w-3.5 h-3.5" />
        </a>
      )}

      {/* Documento soporte generado por el ERP.
          Antes no habia forma de abrirlo desde la compra: el icono de
          arriba solo aparece cuando hay un PDF subido, y el documento
          soporte no se sube, lo genera el sistema. Por eso las compras
          con DS se veian sin ninguna opcion para verlo o imprimirlo. */}
      {factura.documento_soporte_id && (
        <a
          href={`/gastos/documento-soporte/${factura.documento_soporte_id}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir el documento soporte para imprimir o guardar en PDF"
          className="p-1.5 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition"
        >
          <FileDown className="w-3.5 h-3.5" />
        </a>
      )}

      {!anulada && (
        <button
          onClick={abrirEditar}
          title="Editar la factura completa"
          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}

      {!anulada && !pagada && false && (
        <button
          onClick={() => setModal('pagar')}
          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-100 transition"
        >
          <DollarSign className="w-3 h-3" /> Pagar
        </button>
      )}

      {!anulada && (
        <button
          onClick={() => setModal('anular')}
          title="Anular factura"
          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
        >
          <Ban className="w-3.5 h-3.5" />
        </button>
      )}

      {/* ===== MODAL EDITAR COMPLETO ===== */}
      {modal === 'editar' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-semibold text-gray-800">Editar compra</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {factura.numero_factura} · Puedes cambiar productos, cantidades y precios
                </p>
              </div>
              <button onClick={cerrar} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {cargando ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                <p className="text-sm text-gray-500 mt-3">Cargando la factura...</p>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Al guardar se recalcula todo: el stock de los productos, el costo asignado
                    a las ventas, la utilidad y la salida de caja. Si cambias el total, el
                    movimiento del banco se ajusta solo.
                  </p>
                </div>

                {/* Proveedor y numero */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                    <select
                      value={proveedorId}
                      onChange={(e) => setProveedorId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                    >
                      <option value="">Seleccionar proveedor</option>
                      {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">No. Factura *</label>
                    <input
                      value={numeroFactura}
                      onChange={(e) => setNumeroFactura(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha factura</label>
                    <input
                      type="date"
                      value={fechaFactura}
                      onChange={(e) => setFechaFactura(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
                    <select
                      value={formaPago}
                      onChange={(e) => setFormaPago(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                    >
                      <option value="Contado">Contado</option>
                      <option value="Credito 15 dias">Credito 15 dias</option>
                      <option value="Credito 30 dias">Credito 30 dias</option>
                      <option value="Credito 45 dias">Credito 45 dias</option>
                      <option value="Credito 60 dias">Credito 60 dias</option>
                    </select>
                  </div>
                </div>

                {/* ITEMS */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Items de la factura</label>
                    <button
                      type="button"
                      onClick={agregarItem}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar item
                    </button>
                  </div>

                  {items.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
                      <Package className="w-8 h-8 text-gray-300 mx-auto" />
                      <p className="text-sm text-gray-500 mt-2">Esta factura no tiene items</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {items.map((item, idx) => {
                      const comprada = Number(item.cantidad) || 0
                      const asignada = totalAsignado(item)
                      const aStock = Math.max(0, comprada - asignada)
                      const exceso = asignada > comprada
                      const yaUsadas = item.asignaciones.map((a) => a.cotizacion_id)

                      return (
                        <div key={idx} className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-100">
                          <div className="flex gap-2 items-start">
                            <select
                              value={item.producto_id}
                              onChange={(e) => seleccionarProducto(idx, e.target.value)}
                              className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                            >
                              <option value="">-- Producto del catalogo --</option>
                              {productos.map((p) => (
                                <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => eliminarItem(idx)}
                              title="Quitar este item"
                              className="p-1.5 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <input
                            value={item.descripcion}
                            onChange={(e) => actualizarItem(idx, 'descripcion', e.target.value)}
                            placeholder="Descripcion"
                            className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                          />

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">Cantidad</label>
                              <input
                                value={item.cantidad}
                                onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)}
                                type="number" min="1"
                                className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-center bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">Costo unitario</label>
                              <input
                                value={item.precio_unitario}
                                onChange={(e) => actualizarItem(idx, 'precio_unitario', e.target.value)}
                                inputMode="numeric"
                                className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm text-right bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">IVA</label>
                              <select
                                value={item.iva_porcentaje}
                                onChange={(e) => actualizarItem(idx, 'iva_porcentaje', e.target.value)}
                                className="w-full px-1 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                              >
                                <option value="19">19%</option>
                                <option value="5">5%</option>
                                <option value="0">0%</option>
                              </select>
                            </div>
                          </div>

                          {/* Asignacion a ventas */}
                          {cotizaciones.length > 0 && (
                            <div className="pt-3 border-t border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <Target className="w-3.5 h-3.5 text-blue-600" />
                                  <span className="text-xs font-medium text-gray-700">Para que venta es</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => agregarAsignacion(idx)}
                                  disabled={aStock <= 0 || yaUsadas.length >= cotizaciones.length}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-40"
                                >
                                  <Plus className="w-3 h-3" /> Asignar a una venta
                                </button>
                              </div>

                              {item.asignaciones.length === 0 && (
                                <div className="flex items-center gap-2 text-xs text-gray-500 bg-white rounded-lg px-3 py-2 border border-gray-200">
                                  <Package className="w-3.5 h-3.5 text-gray-400" />
                                  Sin asignar: las {comprada} unidades quedan en inventario
                                </div>
                              )}

                              <div className="space-y-2">
                                {item.asignaciones.map((a, aIdx) => (
                                  <div key={aIdx} className="flex gap-2 items-center">
                                    <select
                                      value={a.cotizacion_id}
                                      onChange={(e) => actualizarAsignacion(idx, aIdx, 'cotizacion_id', e.target.value)}
                                      className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
                                    >
                                      <option value="">-- Seleccionar venta --</option>
                                      {cotizaciones.map((c) => (
                                        <option key={c.id} value={c.id}>{c.numero} · {c.cliente_nombre}</option>
                                      ))}
                                    </select>
                                    <input
                                      value={a.cantidad}
                                      onChange={(e) => actualizarAsignacion(idx, aIdx, 'cantidad', e.target.value)}
                                      type="number" min="1"
                                      className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-center bg-white"
                                      placeholder="Cant"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => quitarAsignacion(idx, aIdx)}
                                      className="p-1 text-gray-400 hover:text-red-500"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              {comprada > 0 && (
                                <div className={`mt-2 text-xs rounded-lg px-3 py-2 ${exceso ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                  {exceso
                                    ? <>Asignaste {asignada} de {comprada} unidades. Reduce la cantidad.</>
                                    : <>{asignada} a venta{asignada !== 1 ? 's' : ''} · {aStock} a inventario</>}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Retenciones que el proveedor descuenta al pagarle */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <label className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 cursor-pointer">
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={tieneRetencion}
                        onChange={(e) => setTieneRetencion(e.target.checked)}
                        className="rounded border-gray-300 text-purple-600"
                      />
                      El proveedor descuenta retencion al pagarle
                    </span>
                    <span className="text-xs text-gray-400">Retefuente, ReteIVA o ReteICA</span>
                  </label>

                  {tieneRetencion && (
                    <div className="p-4 space-y-3 bg-purple-50/40">
                      <p className="text-xs text-purple-700">
                        Ojo: en Regimen Simple normalmente NO son agentes de retencion (Art. 911 par. 4 ET),
                        salvo pagos laborales. Verifica si esta retencion aplicaba antes de dejarla.
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Retefuente</label>
                          <input
                            value={retefuente}
                            onChange={(e) => setRetefuente(e.target.value)}
                            inputMode="numeric" placeholder="0"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">ReteIVA</label>
                          <input
                            value={reteiva}
                            onChange={(e) => setReteiva(e.target.value)}
                            inputMode="numeric" placeholder="0"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">ReteICA</label>
                          <input
                            value={reteica}
                            onChange={(e) => setReteica(e.target.value)}
                            inputMode="numeric" placeholder="0"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Totales recalculados en vivo */}
                <div className="bg-blue-50 rounded-xl p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="tabular-nums">{formatCOP(calcularTotales().subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>IVA total:</span>
                    <span className="tabular-nums">{formatCOP(calcularTotales().iva)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-800 text-base pt-1.5 border-t border-blue-200">
                    <span>Total factura:</span>
                    <span className="tabular-nums">{formatCOP(calcularTotales().total)}</span>
                  </div>
                  {calcularTotales().totalRetenciones > 0 && (
                    <>
                      <div className="flex justify-between text-purple-700">
                        <span>(−) Retenciones:</span>
                        <span className="tabular-nums">{formatCOP(calcularTotales().totalRetenciones)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-purple-800 text-base pt-1.5 border-t border-purple-200">
                        <span>Neto a pagar:</span>
                        <span className="tabular-nums">{formatCOP(calcularTotales().neto)}</span>
                      </div>
                    </>
                  )}
                  {calcularTotales().total !== factura.total && (
                    <p className="text-xs text-amber-700 pt-1.5 border-t border-blue-200">
                      El total de la factura antes era {formatCOP(factura.total)}. La salida de caja se ajustara.
                    </p>
                  )}
                </div>

                {/* PDF */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PDF de la factura {factura.soporte_url ? '(reemplazar)' : ''}
                  </label>
                  <div
                    onClick={() => pdfRef.current?.click()}
                    className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${pdf ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    {pdf ? (
                      <>
                        <FileCheck className="w-5 h-5 text-green-600" />
                        <p className="text-sm text-green-700 font-medium truncate flex-1">{pdf.name}</p>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setPdf(null) }} className="text-gray-400 hover:text-red-500 p-1">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-gray-400" />
                        <p className="text-sm text-gray-600">Cargar PDF</p>
                      </>
                    )}
                  </div>
                  <input ref={pdfRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} className="hidden" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none"
                  />
                </div>

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
                    onClick={handleEditar}
                    disabled={ocupado}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {ocupado && <Loader2 className="w-4 h-4 animate-spin" />} Guardar cambios
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== MODAL PAGAR ===== */}
      {modal === 'pagar' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Registrar pago al proveedor</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {factura.numero_factura} · {formatCOP(factura.total)}
                </p>
              </div>
              <button onClick={cerrar} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form action={handlePagar} className="p-6 space-y-4">
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-sm text-emerald-800 font-medium">
                  Se marca como pagada por {formatCOP((factura.retencion_total ?? 0) > 0 ? factura.total - (factura.retencion_total ?? 0) : factura.total)}.
                </p>
                {(factura.retencion_total ?? 0) > 0 && (
                  <p className="text-xs text-emerald-700 mt-1">
                    Esta factura ya tiene {formatCOP(factura.retencion_total ?? 0)} de retencion registrada. Si el proveedor te va a descontar
                    otro monto al pagarle, corrigelo en Editar antes de marcar como pagada.
                  </p>
                )}
              </div>

              {/* Se quito el select "Cuenta de donde sale": era un campo
                  obligatorio con la lista vacia, asi que el navegador ni
                  siquiera dejaba enviar el formulario y era imposible
                  marcar una compra como pagada. La accion del servidor
                  nunca usaba ese dato. */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de pago *</label>
                  <input name="fecha_pago" type="date" defaultValue={hoy()} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medio</label>
                  <select name="medio_pago" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
                <input name="referencia" placeholder="No. de transaccion" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>

              {resultado && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                  <span>{resultado.mensaje}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrar} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={ocupado} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                  {ocupado && <Loader2 className="w-4 h-4 animate-spin" />} Registrar pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL ANULAR ===== */}
      {modal === 'anular' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Anular factura de compra</h3>
                <p className="text-xs text-gray-500 mt-0.5">{factura.numero_factura}</p>
              </div>
              <button onClick={cerrar} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form action={handleAnular} className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800 font-medium">Al anular esta factura:</p>
                <ul className="text-xs text-red-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Se devuelve el stock que habia sumado</li>
                  <li>Se borra la asignacion de costos a las ventas</li>
                  <li>Se recalcula la utilidad de las ventas afectadas</li>
                  <li>Se borran los movimientos de caja de esta factura</li>
                  <li>Las solicitudes de compra vuelven a PENDIENTE</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de la anulacion</label>
                <textarea name="motivo" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" placeholder="Ej: se registro con valores equivocados" />
              </div>

              {resultado && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                  <span>{resultado.mensaje}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrar} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={ocupado} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {ocupado && <Loader2 className="w-4 h-4 animate-spin" />} Anular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
