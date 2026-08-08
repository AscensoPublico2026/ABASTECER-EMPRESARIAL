'use client'

import { useState, useTransition, useRef } from 'react'
import { registrarGasto } from './actions'
import { createClient } from '@/lib/supabase/client'
import { formatCOP } from '@/lib/format'
import {
  PlusCircle, X, Loader2, CheckCircle2, AlertCircle, Upload, FileCheck,
  Target, FileWarning, ShieldCheck,
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

interface Props {
  cotizaciones: CotizacionOpcion[]
  cuentas: { id: string; nombre: string; es_reserva: boolean }[]
  proveedores: ProveedorOpcion[]
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

export default function FormGasto({ cotizaciones, cuentas, proveedores }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [soportePdf, setSoportePdf] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [esCostoVenta, setEsCostoVenta] = useState(false)
  const [tipoSoporte, setTipoSoporte] = useState<TipoSoporte>('FACTURA')
  const [monto, setMonto] = useState('')
  const [ivaIncluido, setIvaIncluido] = useState('')

  // Reparto del gasto entre varias ventas
  const [reparto, setReparto] = useState<LineaReparto[]>([{ cotizacion_id: '', monto: '' }])

  // Proveedor: si el tercero ya existe, sus datos llenan el documento soporte
  const [proveedorId, setProveedorId] = useState('')

  const cuentasOperativas = cuentas.filter((c) => !c.es_reserva)
  const montoNum = num(monto)
  const ivaNum = num(ivaIncluido)
  const base = Math.max(0, montoNum - ivaNum)
  const ocupado = pendiente || subiendo

  const totalRepartido = reparto.reduce((s, r) => s + (r.cotizacion_id ? num(r.monto) : 0), 0)
  const sinRepartir = montoNum - totalRepartido
  const proveedorElegido = proveedores.find((p) => p.id === proveedorId)

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
    setMonto('')
    setIvaIncluido('')
    setReparto([{ cotizacion_id: '', monto: '' }])
    setProveedorId('')
  }

  async function handleSubmit(formData: FormData) {
    if (ivaNum > montoNum) {
      setResultado({ ok: false, mensaje: 'El IVA no puede ser mayor al monto total.' })
      return
    }

    formData.set('monto', String(montoNum))
    formData.set('iva_incluido', String(ivaNum))
    formData.set('es_costo_venta', esCostoVenta ? 'true' : 'false')
    formData.set('tipo_soporte', tipoSoporte)
    formData.set('proveedor_id', proveedorId)

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto total *</label>
              <input
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required inputMode="numeric"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-right"
                placeholder="60000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IVA incluido</label>
              <input
                value={ivaIncluido}
                onChange={(e) => setIvaIncluido(e.target.value)}
                inputMode="numeric"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-right"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select name="categoria" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                <option value="TRANSPORTE">Transporte</option>
                <option value="CONSTITUCION">Constitucion</option>
                <option value="IMPUESTOS">Impuestos</option>
                <option value="SERVICIOS">Servicios</option>
                <option value="MARKETING">Marketing</option>
                <option value="TECNOLOGIA">Tecnologia</option>
                <option value="LEGAL">Legal</option>
                <option value="BANCARIO">Bancario</option>
                <option value="OTROS">Otros</option>
              </select>
            </div>
          </div>

          {montoNum > 0 && (
            <div className="bg-gray-50 rounded-xl px-4 py-2.5 text-xs text-gray-600 flex justify-between">
              <span>Base sin IVA: <strong className="text-gray-800">{formatCOP(base)}</strong></span>
              {ivaNum > 0 && <span>IVA descontable: <strong className="text-blue-700">{formatCOP(ivaNum)}</strong></span>}
            </div>
          )}

          {/* ===== ES COSTO DE UNA VENTA ===== */}
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
              {proveedores.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Ya lo tienes registrado? Elige y se llenan los datos
                  </label>
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">Escribir los datos a mano</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.razon_social}{p.nit ? ` · ${p.nit}` : ''}
                      </option>
                    ))}
                  </select>
                  {proveedorElegido && (
                    <p className="text-xs text-blue-700 mt-1">
                      Datos traidos de {proveedorElegido.razon_social}. Los puedes corregir abajo.
                    </p>
                  )}
                </div>
              )}

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
