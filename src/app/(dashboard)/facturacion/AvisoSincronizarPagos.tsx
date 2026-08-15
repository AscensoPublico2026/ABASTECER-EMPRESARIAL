'use client'

import { useState, useTransition } from 'react'
import { sincronizarFacturasConPago, type FacturaDesfasada } from '../ventas/actions'
import { formatCOP } from '@/lib/format'
import { AlertTriangle, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react'

interface Props {
  desfasadas: FacturaDesfasada[]
}

/**
 * Aviso para las facturas que siguen como "Pendiente" aunque su venta ya
 * tiene el pago registrado.
 *
 * Pasaba porque el pago se guardaba solo en la cotizacion y nunca se
 * reflejaba en la factura: dos verdades sobre el mismo dinero. La causa
 * ya esta corregida; esto pone al dia las que quedaron atras, copiando el
 * pago que ya existe en la venta (no se vuelve a digitar nada).
 */
export default function AvisoSincronizarPagos({ desfasadas }: Props) {
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)

  if (desfasadas.length === 0 && !resultado) return null

  const total = desfasadas.reduce((s, f) => s + f.total, 0)

  function sincronizar() {
    startTransition(async () => {
      const res = await sincronizarFacturasConPago()
      setResultado(res)
    })
  }

  if (resultado?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-900">{resultado.mensaje}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-amber-900">
            {desfasadas.length} factura(s) dicen &quot;Pendiente&quot; pero ya estan pagadas
          </h3>
          <p className="mt-1 text-sm text-amber-800">
            El pago quedo registrado en la venta pero no se reflejo en la factura.
            Al sincronizar se marcan como <strong>Cobradas</strong> con su fecha de pago y
            sus retenciones. No tienes que volver a digitar nada.
          </p>

          <ul className="mt-3 space-y-1 rounded-xl border border-amber-200 bg-white p-3">
            {desfasadas.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 flex-1 truncate text-gray-700">
                  <strong className="text-gray-900">{f.numero}</strong>
                  {f.cliente ? ` · ${f.cliente}` : ''}
                  <span className="ml-1.5 text-gray-400">pagada el {f.fecha_pago}</span>
                </span>
                <span className="shrink-0 tabular-nums font-medium text-gray-800">
                  {formatCOP(f.total)}
                </span>
              </li>
            ))}
          </ul>

          {resultado && !resultado.ok && (
            <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {resultado.mensaje}
            </p>
          )}

          <button
            onClick={sincronizar}
            disabled={pendiente}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {pendiente ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {pendiente ? 'Sincronizando...' : `Marcar como Cobradas (${formatCOP(total)})`}
          </button>
        </div>
      </div>
    </div>
  )
}
