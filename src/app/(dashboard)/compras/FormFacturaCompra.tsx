'use client'

import { useState, useTransition, useRef } from 'react'
import { registrarFacturaCompra } from './actions'
import { createClient } from '@/lib/supabase/client'
import { formatCOP } from '@/lib/format'
import {
  PlusCircle, X, Loader2, CheckCircle2, AlertCircle, Trash2, Plus,
  Upload, FileCheck, Target, Package,
} from 'lucide-react'
import MiniFormProveedor from '@/components/inline/MiniFormProveedor'
import MiniFormProducto from '@/components/inline/MiniFormProducto'

interface CotizacionOpcion {
  id: string
  numero: string
  cliente_nombre: string
  estado: string
  items: { producto_id: string | null; descripcion: string; cantidad: number }[]
}

interface Props {
  proveedores: { id: string; razon_social: string }[]
  productos: { id: string; codigo: string; nombre: string; costo_promedio: number; iva_porcentaje: number; stock_actual: number }[]
  cotizaciones: CotizacionOpcion[]
  cuentas: { id: string; nombre: string; es_reserva: boolean }[]
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

const ITEM_VACIO: ItemLocal = {
  producto_id: '', descripcion: '', cantidad: '1',
  precio_unitario: '', iva_porcentaje: '19', asignaciones: [],
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function num(v: string) {
  return Number(v.replace(/\./g, '').replace(',', '.')) || 0
}

type TipoComprobante = 'FACTURA' | 'DOCUMENTO_SOPORTE'

export default function FormFacturaCompra({ proveedores: proveedoresIniciales, productos: productosIniciales, cotizaciones, cuentas }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [listaProveedores, setListaProveedores] = useState(proveedoresIniciales)
  const [listaProductos, setListaProductos] = useState(productosIniciales)
  const [items, setItems] = useState<ItemLocal[]>([{ ...ITEM_VACIO }])
  const [formaPago, setFormaPago] = useState('Contado')
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>('FACTURA')
  const [terceroNombre, setTerceroNombre] = useState('')
  const [terceroDocumento, setTerceroDocumento] = useState('')
  const [terceroTipoDoc, setTerceroTipoDoc] = useState('CC')
  const [terceroTelefono, setTerceroTelefono] = useState('')
  const [terceroDireccion, setTerceroDireccion] = useState('')
  const [pdf, setPdf] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const pdfRef = useRef<HTMLInputElement>(null)

  const esContado = !formaPago.includes('Credito')
  const esDocSoporte = tipoComprobante === 'DOCUMENTO_SOPORTE'
  const cuentasOperativas = cuentas.filter((c) => !c.es_reserva)

  function agregarItem() {
    setItems([...items, { ...ITEM_VACIO, asignaciones: [] }])
  }

  function eliminarItem(idx: number) {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== idx))
  }

  function actualizarItem(idx: number, campo: keyof ItemLocal, valor: string) {
    setItems(items.map((item, i) => (i === idx ? { ...item, [campo]: valor } : item)))
  }

  function seleccionarProducto(idx: number, productoId: string) {
    const producto = listaProductos.find((p) => p.id === productoId)
    setItems(items.map((item, i) => {
      if (i !== idx) return item
      if (!producto) return { ...item, producto_id: '', iva_porcentaje: '19', asignaciones: [] }
      return {
        ...item,
        producto_id: producto.id,
        descripcion: `${producto.codigo} - ${producto.nombre}`,
        iva_porcentaje: String(producto.iva_porcentaje),
        asignaciones: [],
      }
    }))
  }

  /** Cotizaciones que incluyen este producto (sugerencias de asignacion) */
  function cotizacionesQueNecesitan(productoId: string): CotizacionOpcion[] {
    if (!productoId) return cotizaciones
    const conProducto = cotizaciones.filter((c) =>
      c.items.some((i) => i.producto_id === productoId)
    )
    return conProducto.length > 0 ? conProducto : cotizaciones
  }

  /** Cantidad que pide una cotizacion de este producto */
  function cantidadQuePide(cotizacionId: string, productoId: string): number {
    const cot = cotizaciones.find((c) => c.id === cotizacionId)
    if (!cot) return 0
    return cot.items
      .filter((i) => i.producto_id === productoId)
      .reduce((s, i) => s + i.cantidad, 0)
  }

  function agregarAsignacion(idx: number) {
    const item = items[idx]
    const sugeridas = cotizacionesQueNecesitan(item.producto_id)
    const yaAsignadas = item.asignaciones.map((a) => a.cotizacion_id)
    const siguiente = sugeridas.find((c) => !yaAsignadas.includes(c.id))
    if (!siguiente) return

    const pide = cantidadQuePide(siguiente.id, item.producto_id)
    const asignado = item.asignaciones.reduce((s, a) => s + Number(a.cantidad || 0), 0)
    const disponible = Math.max(0, Number(item.cantidad || 0) - asignado)
    const sugerida = pide > 0 ? Math.min(pide, disponible) : disponible

    setItems(items.map((it, i) => i === idx ? {
      ...it,
      asignaciones: [...it.asignaciones, { cotizacion_id: siguiente.id, cantidad: String(sugerida || '') }],
    } : it))
  }

  function actualizarAsignacion(idx: number, aIdx: number, campo: keyof AsignacionLocal, valor: string) {
    setItems(items.map((it, i) => {
      if (i !== idx) return it
      const asigs = it.asignaciones.map((a, j) => {
        if (j !== aIdx) return a
        if (campo === 'cotizacion_id') {
          // Al cambiar de cotizacion, sugerir la cantidad que pide
          const pide = cantidadQuePide(valor, it.producto_id)
          const otras = it.asignaciones
            .filter((_, k) => k !== aIdx)
            .reduce((s, x) => s + Number(x.cantidad || 0), 0)
          const disponible = Math.max(0, Number(it.cantidad || 0) - otras)
          const sugerida = pide > 0 ? Math.min(pide, disponible) : Number(a.cantidad || 0)
          return { cotizacion_id: valor, cantidad: String(sugerida || '') }
        }
        return { ...a, [campo]: valor }
      })
      return { ...it, asignaciones: asigs }
    }))
  }

  function quitarAsignacion(idx: number, aIdx: number) {
    setItems(items.map((it, i) => i === idx
      ? { ...it, asignaciones: it.asignaciones.filter((_, j) => j !== aIdx) }
      : it))
  }

  function totalAsignado(item: ItemLocal) {
    return item.asignaciones.reduce((s, a) => s + Number(a.cantidad || 0), 0)
  }

  function calcularTotales() {
    let subtotal = 0
    let iva = 0
    items.forEach((item) => {
      const sub = (Number(item.cantidad) || 0) * num(item.precio_unitario)
      subtotal += sub
      iva += sub * ((Number(item.iva_porcentaje) || 0) / 100)
    })
    return { subtotal, iva, total: subtotal + iva }
  }

  function validar(): string | null {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.descripcion) continue
      const comprada = Number(item.cantidad) || 0
      const asignada = totalAsignado(item)
      if (asignada > comprada) {
        return `Item ${i + 1}: se compraron ${comprada} unidades pero se asignaron ${asignada}.`
      }
      for (const a of item.asignaciones) {
        if (!a.cotizacion_id) return `Item ${i + 1}: selecciona la venta de cada asignacion.`
        if (Number(a.cantidad) <= 0) return `Item ${i + 1}: la cantidad asignada debe ser mayor a cero.`
      }
    }
    return null
  }

  async function handleSubmit(formData: FormData) {
    const errorValidacion = validar()
    if (errorValidacion) {
      setResultado({ ok: false, mensaje: errorValidacion })
      return
    }

    const itemsParseados = items
      .map((item) => ({
        producto_id: item.producto_id || null,
        descripcion: item.descripcion,
        cantidad: Number(item.cantidad) || 1,
        precio_unitario: num(item.precio_unitario),
        iva_porcentaje: Number(item.iva_porcentaje) || 19,
        asignaciones: item.asignaciones
          .filter((a) => a.cotizacion_id && Number(a.cantidad) > 0)
          .map((a) => ({ cotizacion_id: a.cotizacion_id, cantidad: Number(a.cantidad) })),
      }))
      .filter((i) => i.descripcion && i.precio_unitario > 0)

    if (itemsParseados.length === 0) {
      setResultado({ ok: false, mensaje: 'Agrega al menos un item con precio.' })
      return
    }

    formData.set('items', JSON.stringify(itemsParseados))
    formData.set('tipo_comprobante', tipoComprobante)
    if (esDocSoporte) {
      formData.set('tercero_nombre', terceroNombre)
      formData.set('tercero_documento', terceroDocumento)
      formData.set('tercero_tipo_documento', terceroTipoDoc)
      formData.set('tercero_telefono', terceroTelefono)
      formData.set('tercero_direccion', terceroDireccion)
    }
    setResultado(null)
    setSubiendo(true)

    try {
      // Subir PDF de la factura si hay
      if (pdf) {
        const supabase = createClient()
        const ext = pdf.name.split('.').pop()
        const path = `factura_compra/${Date.now()}_factura.${ext}`
        const { error } = await supabase.storage.from('documentos').upload(path, pdf, { contentType: pdf.type })
        if (error) {
          setResultado({ ok: false, mensaje: `Error al subir el PDF: ${error.message}` })
          setSubiendo(false)
          return
        }
        const { data } = supabase.storage.from('documentos').getPublicUrl(path)
        formData.set('soporte_url', data.publicUrl)
        formData.set('soporte_nombre', pdf.name)
      }

      startTransition(async () => {
        const res = await registrarFacturaCompra(formData)
        setResultado(res)
        setSubiendo(false)
        if (res.ok) {
          setTimeout(() => {
            setAbierto(false)
            setResultado(null)
            setItems([{ ...ITEM_VACIO, asignaciones: [] }])
            setPdf(null)
            setTipoComprobante('FACTURA')
            setTerceroNombre('')
            setTerceroDocumento('')
            setTerceroTipoDoc('CC')
            setTerceroTelefono('')
            setTerceroDireccion('')
          }, 2000)
        }
      })
    } catch (e) {
      setResultado({ ok: false, mensaje: e instanceof Error ? e.message : 'Error.' })
      setSubiendo(false)
    }
  }

  const totales = calcularTotales()
  const ocupado = pendiente || subiendo

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
        <PlusCircle className="w-4 h-4" /> Registrar Compra
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h3 className="font-semibold text-gray-800">Registrar compra</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Con factura del proveedor o con documento soporte si no hay factura
            </p>
          </div>
          <button onClick={() => { setAbierto(false); setResultado(null) }} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form action={handleSubmit} className="p-6 space-y-5">
          {/* Tipo de comprobante */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de comprobante</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoComprobante('FACTURA')}
                className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition text-left ${tipoComprobante === 'FACTURA' ? 'border-green-400 bg-green-50 text-green-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
              >
                <span className="block font-semibold">Factura del proveedor</span>
                <span className="block text-xs mt-0.5 opacity-70">
                  El proveedor te dio factura electronica
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTipoComprobante('DOCUMENTO_SOPORTE')}
                className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition text-left ${tipoComprobante === 'DOCUMENTO_SOPORTE' ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
              >
                <span className="block font-semibold">Documento Soporte</span>
                <span className="block text-xs mt-0.5 opacity-70">
                  No hay factura (informal, persona natural sin obligacion)
                </span>
              </button>
            </div>
          </div>

          {/* Proveedor y factura */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
              <select name="proveedor_id" required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                <option value="">Seleccionar proveedor</option>
                {listaProveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
              </select>
              <MiniFormProveedor onCreado={(p) => setListaProveedores((prev) => [...prev, p])} />
            </div>
            {!esDocSoporte ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No. Factura *</label>
                <input name="numero_factura" type="text" required placeholder="Ej: FCJC1119" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No. Factura</label>
                <input name="numero_factura" type="text" placeholder="Opcional (se genera DS automatico)" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                <p className="text-xs text-blue-600 mt-1">El sistema genera el numero del DS</p>
              </div>
            )}
          </div>

          {/* Datos del tercero para Documento Soporte */}
          {esDocSoporte && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-blue-800">Datos del tercero (para el Documento Soporte)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-blue-700 mb-0.5">Nombre completo *</label>
                  <input
                    type="text"
                    value={terceroNombre}
                    onChange={(e) => setTerceroNombre(e.target.value)}
                    required
                    placeholder="Ej: JUAN PEREZ"
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-blue-700 mb-0.5">Tipo</label>
                    <select
                      value={terceroTipoDoc}
                      onChange={(e) => setTerceroTipoDoc(e.target.value)}
                      className="w-full px-2 py-2 border border-blue-200 rounded-lg text-xs bg-white"
                    >
                      <option value="CC">CC</option>
                      <option value="NIT">NIT</option>
                      <option value="CE">CE</option>
                      <option value="TI">TI</option>
                      <option value="PP">PP</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-blue-700 mb-0.5">Numero *</label>
                    <input
                      type="text"
                      value={terceroDocumento}
                      onChange={(e) => setTerceroDocumento(e.target.value)}
                      required
                      placeholder="1234567890"
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-blue-700 mb-0.5">Telefono</label>
                  <input
                    type="text"
                    value={terceroTelefono}
                    onChange={(e) => setTerceroTelefono(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-blue-700 mb-0.5">Direccion</label>
                  <input
                    type="text"
                    value={terceroDireccion}
                    onChange={(e) => setTerceroDireccion(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
              <p className="text-xs text-blue-700">
                La DIAN exige el DS cuando le compras a alguien que no esta obligado a facturar. Sin DS, el gasto no es deducible.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha factura *</label>
              <input name="fecha_factura" type="date" defaultValue={hoy()} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
              <select
                name="forma_pago"
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

          {/* Cuenta de donde sale la plata (solo contado, obligatoria) */}
          {esContado && (
            cuentasOperativas.length > 0 ? (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <label className="block text-sm font-medium text-red-800 mb-1">De que cuenta se pago *</label>
                <select
                  name="cuenta_id"
                  required
                  defaultValue={cuentasOperativas[0]?.id ?? ''}
                  className="w-full px-3 py-2.5 border border-red-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-red-400 outline-none"
                >
                  {cuentasOperativas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <p className="text-xs text-red-600 mt-1.5">
                  De contado la factura queda pagada, o sea que el dinero ya salio. Se descuenta de esta cuenta.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800 font-medium">No hay cuentas de banco creadas</p>
                <p className="text-xs text-amber-700 mt-1">
                  Para registrar una compra de contado necesitas al menos una cuenta. Crea la cuenta en Tesoreria
                  o cambia la forma de pago a credito.
                </p>
              </div>
            )
          )}

          {/* PDF de la factura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PDF de la factura del proveedor</label>
            <div
              onClick={() => pdfRef.current?.click()}
              className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${pdf ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300'}`}
            >
              {pdf ? (
                <>
                  <FileCheck className="w-5 h-5 text-green-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-green-700 font-medium truncate">{pdf.name}</p>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setPdf(null) }} className="text-gray-400 hover:text-red-500 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Cargar factura del proveedor</p>
                    <p className="text-xs text-gray-400">Queda archivada en la plataforma</p>
                  </div>
                </>
              )}
            </div>
            <input ref={pdfRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} className="hidden" />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Items de la factura</label>
              <div className="flex items-center gap-3">
                <MiniFormProducto onCreado={(p) => setListaProductos((prev) => [...prev, p])} />
                <button type="button" onClick={agregarItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <Plus className="w-3.5 h-3.5" /> Agregar item
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {items.map((item, idx) => {
                const comprada = Number(item.cantidad) || 0
                const asignada = totalAsignado(item)
                const aStock = Math.max(0, comprada - asignada)
                const exceso = asignada > comprada
                const sugeridas = cotizacionesQueNecesitan(item.producto_id)

                return (
                  <div key={idx} className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-100">
                    {/* Producto */}
                    <div className="flex gap-2 items-start">
                      <select
                        value={item.producto_id}
                        onChange={(e) => seleccionarProducto(idx, e.target.value)}
                        className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      >
                        <option value="">-- Producto del catalogo --</option>
                        {listaProductos.map((p) => (
                          <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => eliminarItem(idx)} disabled={items.length === 1} className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30">
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
                          inputMode="numeric" placeholder="0"
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

                    {/* ===== ASIGNACION A VENTAS ===== */}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs font-medium text-gray-700">Para que venta es</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => agregarAsignacion(idx)}
                          disabled={cotizaciones.length === 0 || aStock <= 0}
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
                              {sugeridas.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.numero} · {c.cliente_nombre}
                                </option>
                              ))}
                            </select>
                            <input
                              value={a.cantidad}
                              onChange={(e) => actualizarAsignacion(idx, aIdx, 'cantidad', e.target.value)}
                              type="number" min="1"
                              className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-center bg-white"
                              placeholder="Cant"
                            />
                            <button type="button" onClick={() => quitarAsignacion(idx, aIdx)} className="p-1 text-gray-400 hover:text-red-500">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Resumen del reparto */}
                      {comprada > 0 && (
                        <div className={`mt-2 text-xs rounded-lg px-3 py-2 ${exceso ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                          {exceso ? (
                            <>Asignaste {asignada} de {comprada} unidades. Reduce la cantidad.</>
                          ) : (
                            <>
                              {asignada} a venta{asignada !== 1 ? 's' : ''} · {aStock} a inventario
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Totales */}
          <div className="bg-blue-50 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span className="tabular-nums">{formatCOP(totales.subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>IVA total:</span><span className="tabular-nums">{formatCOP(totales.iva)}</span></div>
            <div className="flex justify-between font-bold text-gray-800 text-base pt-1.5 border-t border-blue-200"><span>Total factura:</span><span className="tabular-nums">{formatCOP(totales.total)}</span></div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea name="notas" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" placeholder="Notas adicionales..." />
          </div>

          {resultado && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <span>{resultado.mensaje}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setAbierto(false); setResultado(null) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={ocupado} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {ocupado && <Loader2 className="w-4 h-4 animate-spin" />} Registrar factura
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
