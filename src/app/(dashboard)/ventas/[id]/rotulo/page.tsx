'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EMPRESA } from '@/lib/empresa'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { useParams } from 'next/navigation'

/**
 * ROTULO PARA CAJAS - EDITABLE
 *
 * Los campos se cargan automaticamente desde la base de datos,
 * pero TODOS son editables antes de imprimir.
 */
export default function RotuloPage() {
  const params = useParams()
  const id = params.id as string

  const [empresa, setEmpresa] = useState('')
  const [nit, setNit] = useState('')
  const [direccion, setDireccion] = useState('')
  const [quienRecibe, setQuienRecibe] = useState('')
  const [celular, setCelular] = useState('')
  const [remision, setRemision] = useState('')
  const [ordenCompra, setOrdenCompra] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      const supabase = createClient()
      const { data: cot } = await supabase
        .from('cotizaciones')
        .select('*, clientes(razon_social, nit, contacto_nombre, contacto_telefono, direccion_entrega, ciudad)')
        .eq('id', id)
        .single()

      if (cot) {
        const cliente = cot.clientes as Record<string, string> | null
        setEmpresa(cliente?.razon_social ?? '')
        setNit(cliente?.nit ?? '')
        const dir = [cliente?.direccion_entrega, cliente?.ciudad].filter(Boolean).join(', ')
        setDireccion(dir)
        setQuienRecibe(cliente?.contacto_nombre ?? '')
        setCelular(cliente?.contacto_telefono ?? '')
        setRemision(cot.remision_numero ?? '')
        setOrdenCompra(cot.oc_cliente ?? '')
        setObservaciones(cot.remision_observaciones ?? '')
      }
      setCargando(false)
    }
    cargar()
  }, [id])

  if (cargando) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-400">Cargando...</p></div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra superior */}
      <div className="print:hidden bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <Link href={`/ventas/${id}/remision`} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver a la remision
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          <Printer className="w-4 h-4" /> Imprimir rotulo
        </button>
      </div>

      {/* Rotulo */}
      <div className="max-w-[180mm] mx-auto my-8 print:my-0 bg-white shadow-lg print:shadow-none p-8 print:p-6">
        <div className="border-4 border-gray-900 rounded-xl p-8 space-y-6">

          {/* REMITENTE (fijo, no editable) */}
          <div className="border-b-2 border-gray-300 pb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Remitente</p>
            <p className="text-lg font-bold text-gray-900">{EMPRESA.razon_social}</p>
            <p className="text-sm text-gray-600">NIT: {EMPRESA.nit}</p>
            <p className="text-sm text-gray-600">{EMPRESA.direccion}</p>
            <p className="text-sm text-gray-600">{EMPRESA.ciudad}</p>
            <p className="text-sm text-gray-600">Tel: {EMPRESA.telefono}</p>
          </div>

          {/* DESTINATARIO (editable) */}
          <div className="border-b-2 border-gray-300 pb-4 space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Destinatario</p>

            {/* Empresa */}
            <input
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className="w-full text-2xl font-black text-gray-900 border-b border-dashed border-gray-300 focus:border-blue-400 outline-none print:border-none bg-transparent"
              placeholder="Nombre de la empresa"
            />

            {/* NIT */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">NIT:</span>
              <input
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                className="flex-1 text-sm font-semibold text-gray-700 border-b border-dashed border-gray-300 focus:border-blue-400 outline-none print:border-none bg-transparent"
                placeholder="NIT"
              />
            </div>

            {/* Direccion */}
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full text-lg font-bold text-gray-800 border-b border-dashed border-gray-300 focus:border-blue-400 outline-none print:border-none bg-transparent"
              placeholder="Direccion de entrega"
            />

            {/* Quien recibe + celular */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <p className="text-xs text-gray-500 font-medium">Quien recibe</p>
                <input
                  value={quienRecibe}
                  onChange={(e) => setQuienRecibe(e.target.value)}
                  className="w-full text-sm text-gray-800 font-medium border-b border-dashed border-gray-300 focus:border-blue-400 outline-none print:border-none bg-transparent"
                  placeholder="Nombre de quien recibe"
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Celular</p>
                <input
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  className="w-full text-sm text-gray-800 font-medium border-b border-dashed border-gray-300 focus:border-blue-400 outline-none print:border-none bg-transparent"
                  placeholder="Celular"
                />
              </div>
            </div>
          </div>

          {/* REMISION + OC */}
          <div className="grid grid-cols-2 gap-4 border-b-2 border-gray-300 pb-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Remision</p>
              <input
                value={remision}
                onChange={(e) => setRemision(e.target.value)}
                className="w-full text-xl font-black text-gray-900 border-b border-dashed border-gray-300 focus:border-blue-400 outline-none print:border-none bg-transparent"
                placeholder="REM-2026-XXX"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Orden de compra</p>
              <input
                value={ordenCompra}
                onChange={(e) => setOrdenCompra(e.target.value)}
                className="w-full text-xl font-black text-gray-900 border-b border-dashed border-gray-300 focus:border-blue-400 outline-none print:border-none bg-transparent"
                placeholder="OC del cliente"
              />
            </div>
          </div>

          {/* CAJA / PESO */}
          <div className="border-2 border-dashed border-gray-400 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Caja</p>
              <p className="text-3xl font-black text-gray-400">_____ <span className="text-lg">de</span> _____</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-500 uppercase">Peso aprox.</p>
              <p className="text-xl font-bold text-gray-400">_______ kg</p>
            </div>
          </div>

          {/* OBSERVACIONES */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Observaciones</p>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full text-sm text-gray-700 border-b border-dashed border-gray-300 focus:border-blue-400 outline-none print:border-none bg-transparent resize-none"
              placeholder="Observaciones de entrega..."
            />
          </div>
        </div>

        <p className="print:hidden text-center text-xs text-gray-400 mt-4">
          Todos los campos son editables. Modifica lo que necesites y luego dale Imprimir.
        </p>
      </div>
    </div>
  )
}
