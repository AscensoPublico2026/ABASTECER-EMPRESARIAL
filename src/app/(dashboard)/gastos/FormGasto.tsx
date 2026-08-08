'use client'

import { useState, useTransition, useRef } from 'react'
import { registrarGasto, crearTerceroParaSoporte } from './actions'
import { createClient } from '@/lib/supabase/client'
import { formatCOP } from '@/lib/format'
import {
  PlusCircle, X, Loader2, CheckCircle2, AlertCircle, Upload, FileCheck,
  Target, FileWarning, ShieldCheck, Boxes,
} from 'lucide-react'

interface CotizacionOpcion {
  id: string
  numero: string
  cliente_nombre: string
}

/** Un tercero que ya existe, para no volver a digitar sus datos */
export interface ProveedorOpcion {
  id: string
  razon_social: string
  nit: string | null
  tipo_documento: string | null
  contacto_telefono: string | null
  direccion: string | null
  ciudad: string | null
}

/** Un activo fijo ya registrado, para poderle cargar un mantenimiento */
export interface ActivoOpcion {
  id: string
  activo: string
  fecha_compra: string
}

interface Props {
  cotizaciones: CotizacionOpcion[]
  cuentas: { id: string; nombre: string; es_reserva: boolean }[]
  proveedores: ProveedorOpcion[]
  activos?: ActivoOpcion[]
}

type TipoSoporte = 'FACTURA' | 'DOCUMENTO_SOPORTE' | 'NINGUNO'

/** Una linea del reparto: a que venta y por cuanto */
interface LineaReparto {
  cotizacion_id: string
  monto: string
}

function num(v: string) {
  return Number(v.replace(/\./g, '').replace(',', '.')) || 0
}

export default function FormGasto({ cotizaciones, cuentas, proveedores, activos = [] }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [soportePdf, setSoportePdf] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [esCostoVenta, setEsCostoVenta] = useState(false)
  const [tipoSoporte, setTipoSoporte] = useState<TipoSoporte>('FACTURA')
  const [valorBase, setValorBase] = useState('')
  const [ivaIncluido, setIvaIncluido] = useState('')

  /**
   * CATEGORIA. Dejo de ser un select suelto porque ahora cambia el
   * comportamiento del formulario:
   *
   * ACTIVO_FIJO: la impresora, el computador, la estanteria. La plata SI
   * sale del banco (por eso hay que registrarla o el saldo no cuadra con
   * el extracto), pero NO es un gasto del periodo: la empresa cambio plata
   * por una cosa que sigue valiendo. Si se contara como gasto, el
   * resultado operativo del mes saldria hundido por una inversion.
   *
   * MANTENIMIENTO_ACTIVO: el arreglo o el repuesto de un activo. Ese SI es
   * gasto del periodo, y se le amarra al activo para saber cuanto ha
   * costado mantener esa impresora.
   */
  const [categoria, setCategoria] = useState('TRANSPORTE')
  const esActivoFijo = categoria === 'ACTIVO_FIJO'
  const esMantenimiento = categoria === 'MANTENIMIENTO_ACTIVO'
  const [activo, setActivo] = useState({
    nombre: '', serie: '', garantia_meses: '', vida_util_meses: '',
  })
  const [activoPadreId, setActivoPadreId] = useState('')

  // Reparto del gasto entre varias ventas
  const [reparto, setReparto] = useState<LineaReparto[]>([{ cotizacion_id: '', monto: '' }])

  // Proveedor: si el tercero ya existe, sus datos llenan el documento soporte
  const [proveedorId, setProveedorId] = useState('')
  const [listaProveedores, setListaProveedores] = useState(proveedores)
  const [creandoTercero, setCreandoTercero] = useState(false)
  const [errorTercero, setErrorTercero] = useState<string | null>(null)
  const [nuevoTercero, setNuevoTercero] = useState({
    razon_social: '', tipo_documento: 'CC', documento: '',
    telefono: '', direccion: '', ciudad: '',
  })

  /** Crea el tercero y lo deja seleccionado, sin perder el gasto que se venia llenando */
  function handleCrearTercero() {
    setErrorTercero(null)
    const fd = new FormData()
    fd.set('razon_social', nuevoTercero.razon_social.trim())
    fd.set('tipo_documento', nuevoTercero.tipo_documento)
    fd.set('documento', nuevoTercero.documento.trim())
    fd.set('telefono', nuevoTercero.telefono.trim())
    fd.set('direccion', nuevoTercero.direccion.trim())
    fd.set('ciudad', nuevoTercero.ciudad.trim())

    startTransition(async () => {
      const res = await crearTerceroParaSoporte(fd)
      if (res.ok && res.tercero) {
        // Si ya existia con ese documento, no se duplica: viene el existente
        setListaProveedores((prev) =>
          prev.some((p) => p.id === res.tercero!.id) ? prev : [...prev, res.tercero!],
        )
        setProveedorId(res.tercero.id)
        setCreandoTercero(false)
        setNuevoTercero({
          razon_social: '', tipo_documento: 'CC', documento: '',
          telefono: '', direccion: '', ciudad: '',
        })
      } else {
        setErrorTercero(res.mensaje)
      }
    })
  }

  const cuentasOperativas = cuentas.filter((c) => !c.es_reserva)
  /**
   * SE PIDE LA BASE Y EL IVA, Y EL ERP CALCULA EL TOTAL.
   *
   * ANTES se pedia "Monto total" (con el IVA ya dentro) mas "IVA incluido".
   * Eso es al reves de como esta escrita cualquier factura, que trae
   * subtotal, IVA y total. El usuario tenia la factura de la impresora en la
   * mano, escribio el SUBTOTAL en el campo que decia "Monto total", y el ERP
   * registro en el banco menos plata de la que realmente salio.
   *
   * Y no habia forma de darse cuenta: el formulario nunca mostraba el total
   * que iba a salir de la cuenta.
   *
   * Ahora se pide como esta en la factura y el total se calcula y se muestra
   * en grande, porque ESE es el numero que va a salir del banco.
   */
  const baseNum = num(valorBase)
  const ivaNum = num(ivaIncluido)
  const montoNum = baseNum + ivaNum
  const base = baseNum

  /**
   * Control de coherencia del IVA. En Colombia las tarifas son 0%, 5% y 19%.
   * Si el IVA digitado no da ninguna de esas, casi siempre es un error de
   * digitacion y hay que avisarlo antes de guardar.
   */
  const ivaPctReal = baseNum > 0 ? (ivaNum / baseNum) * 100 : 0
  const ivaRaro = baseNum > 0 && ivaNum > 0
    && ![0, 5, 19].some((t) => Math.abs(ivaPctReal - t) < 0.6)

  /** Pone el IVA que corresponde a la tarifa, calculado sobre la base */
  function aplicarIva(pct: number) {
    setIvaIncluido(String(Math.round(baseNum * pct / 100)))
  }
  const ocupado = pendiente || subiendo

  const totalRepartido = reparto.reduce((s, r) => s + (r.cotizacion_id ? num(r.monto) : 0), 0)
  const sinRepartir = montoNum - totalRepartido
  const proveedorElegido = listaProveedores.find((p) => p.id === proveedorId)

  function agregarReparto() {
    setReparto([...reparto, { cotizacion_id: '', monto: '' }])
  }

  function quitarReparto(idx: number) {
    setReparto(reparto.length === 1 ? reparto : reparto.filter((_, i) => i !== idx))
  }

  function actualizarReparto(idx: number, campo: keyof LineaReparto, valor: string) {
    setReparto(reparto.map((r, i) => (i === idx ? { ...r, [campo]: valor } : r)))
  }

  /**
   * Divide el gasto en partes iguales entre las ventas elegidas.
   * El sobrante de la division se le suma a la primera, para que la suma
   * de las partes de EXACTAMENTE el monto del gasto y no queden pesos
   * sueltos sin asignar.
   */
  function repartirIgual() {
    const conVenta = reparto.filter((r) => r.cotizacion_id)
    if (conVenta.length === 0 || montoNum <= 0) return
    const parte = Math.floor(montoNum / conVenta.length)
    const sobrante = montoNum - parte * conVenta.length
    let primera = true
    setReparto(reparto.map((r) => {
      if (!r.cotizacion_id) return r
      const valor = primera ? parte + sobrante : parte
      primera = false
      return { ...r, monto: String(valor) }
    }))
  }

  function cerrar() {
    setAbierto(false)
    setResultado(null)
    setSoportePdf(null)
    setEsCostoVenta(false)
    setTipoSoporte('FACTURA')
    setValorBase('')
    setIvaIncluido('')
    setCategoria('TRANSPORTE')
    setActivo({ nombre: '', serie: '', garantia_meses: '', vida_util_meses: '' })
    setActivoPadreId('')
    setReparto([{ cotizacion_id: '', monto: '' }])
    setProveedorId('')
    setCreandoTercero(false)
    setErrorTercero(null)
    setNuevoTercero({
      razon_social: '', tipo_documento: 'CC', documento: '',
      telefono: '', direccion: '', ciudad: '',
    })
  }

  async function handleSubmit(formData: FormData) {
    // El monto que se guarda es base + IVA, asi que el IVA nunca puede ser
    // mayor que el total. Lo que si hay que validar es que haya una base.
    if (baseNum <= 0) {
      setResultado({ ok: false, mensaje: 'Escribe el valor antes de IVA (el subtotal de la factura).' })
      return
    }

    formData.set('monto', String(montoNum))
    formData.set('iva_incluido', String(ivaNum))
    // Un activo fijo nunca es costo de una venta: no se consumio para
    // cumplir un pedido, se quedo en la empresa.
    formData.set('es_costo_venta', esCostoVenta && !esActivoFijo ? 'true' : 'false')
    formData.set('tipo_soporte', tipoSoporte)
    formData.set('proveedor_id', proveedorId)
    formData.set('categoria', categoria)

    // Datos del activo (solo si aplica)
    formData.set('activo_nombre', esActivoFijo ? activo.nombre : '')
    formData.set('activo_serie', esActivoFijo ? activo.serie : '')
    formData.set('activo_garantia_meses', esActivoFijo ? activo.garantia_meses : '')
    formData.set('activo_vida_util_meses', esActivoFijo ? activo.vida_util_meses : '')
    formData.set('activo_padre_id', esMantenimiento ? activoPadreId : '')

    if (esMantenimiento && !activoPadreId) {
      setResultado({ ok: false, mensaje: 'Elige a que activo le hiciste el mantenimiento, para que quede el historial de ese equipo.' })
      return
    }

    // El reparto viaja como JSON: puede ser 1 venta o varias
    const repartoLimpio = reparto
      .filter((r) => r.cotizacion_id && num(r.monto) > 0)
      .map((r) => ({ cotizacion_id: r.cotizacion_id, monto: num(r.monto) }))

    if (esCostoVenta) {
      if (repartoLimpio.length === 0) {
        setResultado({ ok: false, mensaje: 'Elige al menos una venta y ponle el monto que le corresponde.' })
        return
      }
      const suma = repartoLimpio.reduce((s, r) => s + r.monto, 0)
      if (suma - montoNum > 1) {
        setResultado({
          ok: false,
          mensaje: `Estas repartiendo ${formatCOP(suma)} pero el gasto es de ${formatCOP(montoNum)}. No puedes repartir mas de lo que costo.`,
        })
        return
      }
    }
    formData.set('reparto', JSON.stringify(repartoLimpio))

    setResultado(null)
    setSubiendo(true)

    try {
      if (soportePdf) {
        const supabase = createClient()
        const ext = soportePdf.name.split('.').pop()
        const path = `gastos/${Date.now()}_soporte.${ext}`
        const { error } = await supabase.storage
          .from('documentos')
          .upload(path, soportePdf, { contentType: soportePdf.type })

        if (error) {
          setResultado({ ok: false, mensaje: `Error subiendo archivo: ${error.message}` })
          setSubiendo(false)
          return
        }
        const { data } = supabase.storage.from('documentos').getPublicUrl(path)
        formData.set('soporte_url', data.publicUrl)
        formData.set('soporte_nombre', soportePdf.name)
      }

      startTransition(async () => {
        const res = await registrarGasto(formData)
        setResultado(res)
        setSubiendo(false)
        if (res.ok) setTimeout(cerrar, 2200)
      })
    } catch (err) {
      setResultado({ ok: false, mensaje: err instanceof Error ? err.message : 'Error.' })
      setSubiendo(false)
    }
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
        <PlusCircle className="w-4 h-4" /> Registrar gasto
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg my-8 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h3 className="font-semibold text-gray-800">Registrar gasto</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Si el gasto pertenece a una venta, vinculalo para que la utilidad sea real
            </p>
          </div>
          <button onClick={cerrar} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form action={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
            <input name="concepto" required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="Ej: FLETE ENTREGA CANASTILLAS" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor antes de IVA *</label>
              <input
                value={valorBase}
                onChange={(e) => setValorBase(e.target.value)}
                required inputMode="numeric"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-right"
                placeholder="654881"
              />
              <p className="text-[11px] text-gray-500 mt-0.5">El subtotal de la factura</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IVA</label>
              <input
                value={ivaIncluido}
                onChange={(e) => setIvaIncluido(e.target.value)}
                inputMode="numeric"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-right"
                placeholder="0"
              />
              {/* Botones de tarifa: el IVA se calcula sobre la base para que
                  no haya que sacarlo con calculadora ni digitarlo mal. */}
              <div className="flex gap-1 mt-1">
                {[0, 5, 19].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => aplicarIva(pct)}
                    disabled={baseNum <= 0}
                    className="flex-1 text-[11px] py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              >
                <option value="TRANSPORTE">Transporte</option>
                <option value="CONSTITUCION">Constitucion</option>
                <option value="IMPUESTOS">Impuestos</option>
                <option value="SERVICIOS">Servicios</option>
                <option value="MARKETING">Marketing</option>
                <option value="TECNOLOGIA">Tecnologia</option>
                <option value="LEGAL">Legal</option>
                <option value="BANCARIO">Bancario</option>
                <option value="ACTIVO_FIJO">Activo fijo (impresora, equipo)</option>
                <option value="MANTENIMIENTO_ACTIVO">Mantenimiento de un activo</option>
                <option value="OTROS">Otros</option>
              </select>
            </div>
          </div>

          {/* ===== ACTIVO FIJO =====
              La plata sale del banco igual, pero no es gasto del periodo:
              es cambiar plata por una cosa que sigue valiendo. Por eso se
              reporta aparte y no hunde el resultado operativo del mes. */}
          {esActivoFijo && (
            <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Boxes className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-800">
                  <b>Es una inversion, no un gasto del mes.</b> La plata sale del banco
                  (por eso queda registrada y el saldo cuadra con el extracto), pero no se
                  resta del resultado operativo: la empresa cambio plata por algo que sigue
                  valiendo. Va a quedar en el listado de activos fijos.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del activo</label>
                  <input
                    value={activo.nombre}
                    onChange={(e) => setActivo({ ...activo, nombre: e.target.value })}
                    placeholder="IMPRESORA EPSON L3250"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Serie o placa</label>
                  <input
                    value={activo.serie}
                    onChange={(e) => setActivo({ ...activo, serie: e.target.value })}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Garantia (meses)</label>
                  <input
                    value={activo.garantia_meses}
                    onChange={(e) => setActivo({ ...activo, garantia_meses: e.target.value })}
                    type="number" min="0" placeholder="24"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  />
                  <p className="text-[11px] text-gray-500 mt-0.5">2 anios = 24. El ERP calcula hasta que fecha.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Vida util (meses)</label>
                  <input
                    value={activo.vida_util_meses}
                    onChange={(e) => setActivo({ ...activo, vida_util_meses: e.target.value })}
                    type="number" min="0" placeholder="60"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  />
                  <p className="text-[11px] text-gray-500 mt-0.5">Solo para saber cuanto vale hoy. No baja el impuesto.</p>
                </div>
              </div>
            </div>
          )}

          {/* ===== MANTENIMIENTO DE UN ACTIVO =====
              Este SI es gasto del periodo, pero se amarra al equipo para
              saber cuanto ha costado mantener esa impresora. */}
          {esMantenimiento && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                A que activo le hiciste el mantenimiento *
              </label>
              {activos.length === 0 ? (
                <p className="text-xs text-amber-800">
                  Todavia no hay activos fijos registrados. Registra primero la compra del
                  equipo con la categoria <b>Activo fijo</b> y despues le cargas el mantenimiento.
                </p>
              ) : (
                <>
                  <select
                    value={activoPadreId}
                    onChange={(e) => setActivoPadreId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">-- Seleccionar activo --</option>
                    {activos.map((a) => (
                      <option key={a.id} value={a.id}>{a.activo}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-amber-800">
                    El mantenimiento si es gasto del mes. Se le suma al historial del equipo
                    para saber cuanto llevas gastado en el.
                  </p>
                </>
              )}
            </div>
          )}

          {/* EL TOTAL QUE SALE DE LA CUENTA, EN GRANDE.
              Este es el numero que el banco va a descontar. Antes no se
              mostraba en ninguna parte, y por eso se registro la impresora
              por menos de lo que realmente se pago. */}
          {montoNum > 0 && (
            <div className="border-2 border-gray-900 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 text-xs text-gray-600 flex justify-between">
                <span>Valor antes de IVA: <strong className="text-gray-800">{formatCOP(base)}</strong></span>
                <span>
                  IVA{ivaNum > 0 ? ` (${ivaPctReal.toFixed(1)}%)` : ''}:{' '}
                  <strong className="text-blue-700">{formatCOP(ivaNum)}</strong>
                </span>
              </div>
              <div className="px-4 py-3 bg-gray-900 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">SALE DE LA CUENTA</p>
                  <p className="text-[11px] text-gray-300">
                    Base + IVA. Es lo que el banco te va a descontar.
                  </p>
                </div>
                <p className="text-xl font-bold text-white tabular-nums">{formatCOP(montoNum)}</p>
              </div>
            </div>
          )}

          {/* El IVA no da ninguna tarifa colombiana: casi seguro esta mal digitado */}
          {ivaRaro && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Ese IVA es el <b>{ivaPctReal.toFixed(1)}%</b> del valor base, y en Colombia las
                tarifas son 0%, 5% o 19%. Revisa la factura: si te equivocas aqui, el banco
                queda descuadrado. Usa los botones de tarifa para calcularlo.
              </p>
            </div>
          )}

          {/* ===== ES COSTO DE UNA VENTA =====
              No se muestra para activos fijos: la impresora no se consumio
              para cumplir un pedido, se quedo en la empresa. */}
          {!esActivoFijo && (
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={esCostoVenta}
                onChange={(e) => setEsCostoVenta(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-800">Este gasto es costo de una venta</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Fletes, mano de obra o cualquier costo para cumplir un pedido.
                  Se resta de la utilidad de esa venta.
                </p>
              </div>
            </label>

            {/* REPARTO ENTRE VARIAS VENTAS.
                Caso real: un flete de 45.000 que entrego 3 pedidos. El
                documento soporte se emite UNA sola vez por los 45.000
                (que es lo correcto ante la DIAN) y el costo se divide
                entre las 3 ventas. Antes solo se podia elegir UNA venta y
                tocaba inventar tres gastos. */}
            {esCostoVenta && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    A que ventas le corresponde este costo *
                  </label>
                  {reparto.length > 1 && montoNum > 0 && (
                    <button
                      type="button"
                      onClick={repartirIgual}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Repartir en partes iguales
                    </button>
                  )}
                </div>

                {reparto.map((r, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <select
                      value={r.cotizacion_id}
                      onChange={(e) => actualizarReparto(i, 'cotizacion_id', e.target.value)}
                      className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                    >
                      <option value="">Seleccionar venta</option>
                      {cotizaciones
                        .filter((c) => c.id === r.cotizacion_id || !reparto.some((x) => x.cotizacion_id === c.id))
                        .map((c) => (
                          <option key={c.id} value={c.id}>{c.numero} · {c.cliente_nombre}</option>
                        ))}
                    </select>
                    <input
                      value={r.monto}
                      onChange={(e) => actualizarReparto(i, 'monto', e.target.value)}
                      inputMode="numeric"
                      placeholder="Monto"
                      className="w-32 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-right tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => quitarReparto(i)}
                      disabled={reparto.length === 1}
                      className="p-2.5 text-gray-400 hover:text-red-500 disabled:opacity-30"
                      title="Quitar esta venta"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={agregarReparto}
                  disabled={reparto.length >= cotizaciones.length}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium disabled:opacity-40"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Agregar otra venta
                </button>

                {/* Control del reparto: que no quede plata sin asignar ni de mas */}
                {montoNum > 0 && (
                  <div className={`rounded-xl px-3 py-2.5 text-xs ${
                    Math.abs(sinRepartir) < 1 ? 'bg-green-50 text-green-800'
                    : sinRepartir > 0 ? 'bg-amber-50 text-amber-800'
                    : 'bg-red-50 text-red-800'
                  }`}>
                    <div className="flex justify-between">
                      <span>Gasto total</span>
                      <span className="tabular-nums font-medium">{formatCOP(montoNum)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Repartido entre {reparto.filter((r) => r.cotizacion_id).length} venta(s)</span>
                      <span className="tabular-nums font-medium">{formatCOP(totalRepartido)}</span>
                    </div>
                    <div className="flex justify-between border-t border-current/20 mt-1 pt-1 font-semibold">
                      <span>
                        {Math.abs(sinRepartir) < 1 ? 'Cuadra' : sinRepartir > 0 ? 'Falta repartir' : 'Te pasaste'}
                      </span>
                      <span className="tabular-nums">{formatCOP(Math.abs(sinRepartir))}</span>
                    </div>
                    {sinRepartir > 0 && (
                      <p className="mt-1.5 leading-relaxed">
                        Lo que quede sin repartir no entra a ninguna venta, asi que la utilidad
                        de esas ventas va a salir mas alta de lo real.
                      </p>
                    )}
                  </div>
                )}

                {cotizaciones.length === 0 && (
                  <p className="text-xs text-amber-600">
                    No hay ventas disponibles. Debe estar aprobada o mas adelante en el flujo.
                  </p>
                )}
              </div>
            )}
          </div>
          )}

          {/* ===== SOPORTE ===== */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Que soporte tiene este gasto</label>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${tipoSoporte === 'FACTURA' ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" checked={tipoSoporte === 'FACTURA'} onChange={() => setTipoSoporte('FACTURA')} className="mt-0.5 text-green-600" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-sm font-medium text-gray-800">Tengo factura</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">El proveedor me dio factura. Es deducible.</p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${tipoSoporte === 'DOCUMENTO_SOPORTE' ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" checked={tipoSoporte === 'DOCUMENTO_SOPORTE'} onChange={() => setTipoSoporte('DOCUMENTO_SOPORTE')} className="mt-0.5 text-blue-600" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-800">Sin factura, hacer documento soporte</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Le pague a un particular. Con nombre y cedula el gasto SI es deducible.
                  </p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${tipoSoporte === 'NINGUNO' ? 'border-amber-300 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" checked={tipoSoporte === 'NINGUNO'} onChange={() => setTipoSoporte('NINGUNO')} className="mt-0.5 text-amber-600" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <FileWarning className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-sm font-medium text-gray-800">Sin ningun soporte</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    No tengo datos del tercero. El gasto NO sera deducible.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Datos del tercero para documento soporte */}
          {tipoSoporte === 'DOCUMENTO_SOPORTE' && (
            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <p className="text-xs text-blue-800 font-medium">
                Datos de la persona a la que le pagaste
              </p>

              {/* TRAER LOS DATOS DEL TERCERO SI YA EXISTE.
                  Antes habia que digitar nombre, cedula, telefono y
                  direccion cada vez, incluso para el transportador de
                  siempre. Si ya esta creado como proveedor, esos datos ya
                  estan guardados: aqui se traen solos. */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-gray-600">
                    {creandoTercero ? 'Crear el tercero' : 'Elige el tercero y se llenan los datos'}
                  </label>
                  <button
                    type="button"
                    onClick={() => { setCreandoTercero(!creandoTercero); setErrorTercero(null) }}
                    className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1"
                  >
                    {creandoTercero ? (
                      <>Volver a la lista</>
                    ) : (
                      <><PlusCircle className="w-3 h-3" /> No existe, crearlo</>
                    )}
                  </button>
                </div>

                {creandoTercero ? (
                  /* Crear el tercero sin abandonar el gasto.
                     Antes tocaba irse a Proveedores, crearlo, y empezar el
                     gasto de nuevo desde cero. */
                  <div className="space-y-2 bg-white rounded-lg p-3 border border-blue-200">
                    <input
                      value={nuevoTercero.razon_social}
                      onChange={(e) => setNuevoTercero({ ...nuevoTercero, razon_social: e.target.value })}
                      placeholder="Nombre completo del tercero *"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={nuevoTercero.tipo_documento}
                        onChange={(e) => setNuevoTercero({ ...nuevoTercero, tipo_documento: e.target.value })}
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="CC">CC</option>
                        <option value="CE">CE</option>
                        <option value="NIT">NIT</option>
                        <option value="PASAPORTE">Pasaporte</option>
                        <option value="PEP">PEP</option>
                      </select>
                      <input
                        value={nuevoTercero.documento}
                        onChange={(e) => setNuevoTercero({ ...nuevoTercero, documento: e.target.value })}
                        inputMode="numeric"
                        placeholder="Numero *"
                        className="col-span-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={nuevoTercero.telefono}
                        onChange={(e) => setNuevoTercero({ ...nuevoTercero, telefono: e.target.value })}
                        placeholder="Telefono"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <input
                        value={nuevoTercero.ciudad}
                        onChange={(e) => setNuevoTercero({ ...nuevoTercero, ciudad: e.target.value })}
                        placeholder="Ciudad"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <input
                      value={nuevoTercero.direccion}
                      onChange={(e) => setNuevoTercero({ ...nuevoTercero, direccion: e.target.value })}
                      placeholder="Direccion"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    {errorTercero && (
                      <p className="text-xs text-red-600">{errorTercero}</p>
                    )}
                    <button
                      type="button"
                      onClick={handleCrearTercero}
                      disabled={!nuevoTercero.razon_social.trim() || !nuevoTercero.documento.trim() || ocupado}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {ocupado ? 'Creando...' : 'Crear y usar en este documento soporte'}
                    </button>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Queda guardado como proveedor, asi que la proxima vez solo lo eliges.
                      Si ya existe alguien con ese documento, se selecciona en vez de duplicarlo.
                    </p>
                  </div>
                ) : (
                  <>
                    <select
                      value={proveedorId}
                      onChange={(e) => setProveedorId(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                    >
                      <option value="">Escribir los datos a mano</option>
                      {listaProveedores.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.razon_social}{p.nit ? ` · ${p.nit}` : ''}
                        </option>
                      ))}
                    </select>
                    {proveedorElegido ? (
                      <p className="text-xs text-blue-700 mt-1">
                        Datos traidos de {proveedorElegido.razon_social}. Los puedes corregir abajo.
                      </p>
                    ) : listaProveedores.length === 0 ? (
                      <p className="text-xs text-amber-700 mt-1">
                        Todavia no tienes terceros registrados. Usa &quot;No existe, crearlo&quot;.
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Nombre completo *</label>
                <input
                  name="tercero_nombre"
                  required
                  key={`nom-${proveedorId}`}
                  defaultValue={proveedorElegido?.razon_social ?? ''}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                  placeholder="Nombre del transportador"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tipo doc</label>
                  <select
                    name="tercero_tipo_documento"
                    key={`tipo-${proveedorId}`}
                    defaultValue={proveedorElegido?.tipo_documento ?? 'CC'}
                    className="w-full px-2 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                  >
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="NIT">NIT</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="PEP">PEP</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Numero *</label>
                  <input
                    name="tercero_documento"
                    required
                    inputMode="numeric"
                    key={`doc-${proveedorId}`}
                    defaultValue={proveedorElegido?.nit ?? ''}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                    placeholder="1234567890"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Telefono</label>
                  <input
                    name="tercero_telefono"
                    key={`tel-${proveedorId}`}
                    defaultValue={proveedorElegido?.contacto_telefono ?? ''}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Direccion</label>
                  <input
                    name="tercero_direccion"
                    key={`dir-${proveedorId}`}
                    defaultValue={proveedorElegido?.direccion ?? ''}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
              <p className="text-xs text-blue-700">
                Se genera el documento DS-2026-XXX automaticamente. Lo puedes imprimir para que lo firme.
              </p>
            </div>
          )}

          {tipoSoporte === 'NINGUNO' && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                Este gasto se registrara pero <strong>no sera deducible</strong>. Si consigues los datos
                del tercero despues, puedes generar el documento soporte desde la lista de gastos.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
              <select name="forma_pago" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pagado por</label>
              <select name="pagado_por" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                <option value="Empresa">Empresa (Bold)</option>
                <option value="Julio">Julio</option>
                <option value="Laura">Laura</option>
              </select>
            </div>
            {cuentasOperativas.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">De que cuenta se pago *</label>
                <select
                  name="cuenta_id"
                  required
                  defaultValue={cuentasOperativas[0]?.id ?? ''}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                >
                  {cuentasOperativas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Se descuenta del saldo de esta cuenta</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-800">
                  No hay cuentas creadas. Crea una en Tesoreria para poder registrar gastos.
                </p>
              </div>
            )}
          </div>

          {/* Soporte PDF */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adjuntar soporte (opcional)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${soportePdf ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300'}`}
            >
              {soportePdf ? (
                <>
                  <FileCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-green-700 font-medium truncate">{soportePdf.name}</p>
                    <p className="text-xs text-green-600">{(soportePdf.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSoportePdf(null); if (fileRef.current) fileRef.current.value = '' }} className="text-gray-400 hover:text-red-500 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Factura, recibo o comprobante</p>
                    <p className="text-xs text-gray-400">PDF, PNG o JPG</p>
                  </div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setSoportePdf(e.target.files?.[0] ?? null)} className="hidden" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea name="notas" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" placeholder="Detalles..." />
          </div>

          {resultado && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <span>{resultado.mensaje}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={cerrar} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={ocupado} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {ocupado && <Loader2 className="w-4 h-4 animate-spin" />}
              {subiendo ? 'Subiendo...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
