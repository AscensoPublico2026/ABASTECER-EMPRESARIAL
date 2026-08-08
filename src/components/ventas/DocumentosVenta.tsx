import type { DocumentosDeVenta } from '@/lib/queries/documentosVenta'
import { formatCOP, formatFecha } from '@/lib/format'
import { FolderOpen, Download, ExternalLink, AlertTriangle } from 'lucide-react'

const COLOR_GRUPO: Record<string, string> = {
  'LA VENTA': 'text-blue-700',
  'DEL CLIENTE': 'text-purple-700',
  'COMPRAS Y COSTOS': 'text-amber-700',
  'ENTREGA': 'text-indigo-700',
  'USO INTERNO': 'text-gray-600',
}

const ORDEN_GRUPO = ['LA VENTA', 'DEL CLIENTE', 'COMPRAS Y COSTOS', 'ENTREGA', 'USO INTERNO']

export default function DocumentosVenta({ datos }: { datos: DocumentosDeVenta }) {
  const { documentos, faltantes } = datos

  if (documentos.length === 0) return null

  const grupos = ORDEN_GRUPO
    .map((g) => ({ nombre: g, docs: documentos.filter((d) => d.grupo === g) }))
    .filter((g) => g.docs.length > 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <FolderOpen className="w-4 h-4 text-gray-500" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 text-sm">Documentos de esta venta</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Todo lo que necesitas para armar el paquete. Los que dice &quot;Abrir&quot; los genera
            el sistema: se abren listos para imprimir o guardar en PDF.
          </p>
        </div>
        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">
          {documentos.length}
        </span>
      </div>

      <div className="divide-y divide-gray-50">
        {grupos.map((g) => (
          <div key={g.nombre}>
            <div className="px-5 py-2 bg-gray-50">
              <span className={`text-xs font-semibold uppercase tracking-wider ${COLOR_GRUPO[g.nombre] ?? 'text-gray-500'}`}>
                {g.nombre}
              </span>
            </div>
            {g.docs.map((d, i) => (
              <div key={`${d.url}-${i}`} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800 capitalize">{d.tipo}</span>
                    {d.numero && (
                      <span className="font-mono text-xs text-gray-500">{d.numero}</span>
                    )}
                  </div>
                  {d.detalle && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{d.detalle}</p>
                  )}
                </div>

                {d.fecha && (
                  <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:inline">
                    {formatFecha(d.fecha)}
                  </span>
                )}
                {d.valor !== null && d.valor > 0 && (
                  <span className="text-sm tabular-nums text-gray-600 whitespace-nowrap hidden md:inline">
                    {formatCOP(d.valor)}
                  </span>
                )}

                {/* Los que genera el ERP se abren en pantalla para imprimir.
                    Los archivos subidos se descargan directo. */}
                {d.clase === 'PAGINA' ? (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir
                  </a>
                ) : (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar
                  </a>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Checklist de lo que falta */}
      {faltantes.length > 0 && (
        <div className="px-5 py-4 bg-amber-50 border-t border-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-900">
                Al paquete de esta venta le falta:
              </p>
              <ul className="mt-1 space-y-0.5">
                {faltantes.map((f, i) => (
                  <li key={i} className="text-xs text-amber-800">• {f}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
