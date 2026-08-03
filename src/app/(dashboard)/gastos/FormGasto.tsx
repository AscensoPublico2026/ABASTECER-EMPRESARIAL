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

interface Props {
  cotizaciones: CotizacionOpcion[]
  cuentas: { id: string; nombre: string; es_reserva: boolean }[]
}

type TipoSoporte = 'FACTURA' | 'DOCUMENTO_SOPORTE' | 'NINGUNO'

function num(v: string) {
  return Number(v.replace(/\./g, '').replace(',', '.')) || 0
}

export default function FormGasto({ cotizaciones, cuentas }: Props) {
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

  const cuentasOperativas = cuentas.filter((c) => !c.es_reserva)
  const montoNum = num(monto)
  const ivaNum = num(ivaIncluido)
  const base = Math.max(0, montoNum - ivaNum)
  const ocupado = pendiente || subiendo

  function cerrar() {
    setAbierto(false)
    setResultado(null)
    setSoportePdf(null)
    setEsCostoVenta(false)
    setTipoSoporte('FACTURA')
    setMonto('')
    setIvaIncluido('')
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

            {esCostoVenta && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venta a la que pertenece *</label>
                <select name="cotizacion_id" required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                  <option value="">Seleccionar venta</option>
                  {cotizaciones.map((c) => (
                    <option key={c.id} value={c.id}>{c.numero} · {c.cliente_nombre}</option>
                  ))}
                </select>
                {cotizaciones.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
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
              <div>
                <label className="block text-xs text-gray-600 mb-1">Nombre completo *</label>
                <input name="tercero_nombre" required className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white" placeholder="Nombre del transportador" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tipo doc</label>
                  <select name="tercero_tipo_documento" className="w-full px-2 py-2 border border-blue-200 rounded-lg text-sm bg-white">
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="NIT">NIT</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="PEP">PEP</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Numero *</label>
                  <input name="tercero_documento" required inputMode="numeric" className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white" placeholder="1234567890" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Telefono</label>
                  <input name="tercero_telefono" className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Direccion</label>
                  <input name="tercero_direccion" className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white" />
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
            {cuentasOperativas.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta de salida</label>
                <select name="cuenta_id" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                  <option value="">No registrar en caja</option>
                  {cuentasOperativas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
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
