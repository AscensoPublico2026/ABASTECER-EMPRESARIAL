import { Database, ExternalLink, AlertTriangle } from 'lucide-react'

interface SetupBannerProps {
  /** true si las variables de entorno estan puestas pero la consulta fallo */
  configurado: boolean
  error: string | null
}

export default function SetupBanner({ configurado, error }: SetupBannerProps) {
  // Caso 1: faltan las variables de entorno de Supabase
  if (!configurado) {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
        <div className="bg-amber-50 px-6 py-4 flex items-start gap-3 border-b border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900">
              Base de datos no conectada
            </h3>
            <p className="text-sm text-amber-700 mt-0.5">
              El modulo funciona, pero necesita Supabase para guardar datos.
            </p>
          </div>
        </div>
        <div className="p-6 space-y-4 text-sm text-gray-600">
          <p className="font-medium text-gray-800">
            Faltan las variables de entorno en Vercel:
          </p>
          <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs space-y-1.5 text-gray-700">
            <div>NEXT_PUBLIC_SUPABASE_URL</div>
            <div>NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
          </div>
          <p className="text-xs text-gray-500">
            Se configuran en Vercel: Settings &rarr; Environment Variables. Despues
            hay que volver a desplegar el proyecto.
          </p>
        </div>
      </div>
    )
  }

  // Caso 2: variables puestas, pero las tablas no existen todavia
  return (
    <div className="bg-white rounded-2xl border border-blue-200 overflow-hidden">
      <div className="bg-blue-50 px-6 py-4 flex items-start gap-3 border-b border-blue-200">
        <Database className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-blue-900">
            Falta crear las tablas en Supabase
          </h3>
          <p className="text-sm text-blue-700 mt-0.5">
            Es un solo paso y se hace una unica vez.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-5 text-sm">
        <ol className="space-y-3 text-gray-700">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <span>
              Abre tu proyecto en Supabase y entra a{' '}
              <strong>SQL Editor</strong> &rarr; <strong>New query</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
            <span>
              Copia todo el contenido del archivo{' '}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                supabase/migrations/001_socios_capital.sql
              </code>{' '}
              del repositorio.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              3
            </span>
            <span>
              Pegalo en el editor y presiona <strong>Run</strong>. Crea las tablas
              y deja registrados a Julio y Laura con 50% cada uno.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              4
            </span>
            <span>Recarga esta pagina.</span>
          </li>
        </ol>

        <a
          href="https://github.com/AscensoPublico2026/ABASTECER-EMPRESARIAL/blob/main/supabase/migrations/001_socios_capital.sql"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          Ver el script SQL en GitHub
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {error && (
          <details className="pt-2 border-t border-gray-100">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
              Detalle tecnico del error
            </summary>
            <p className="mt-2 text-xs text-gray-500 font-mono bg-gray-50 p-3 rounded-lg break-words">
              {error}
            </p>
          </details>
        )}
      </div>
    </div>
  )
}
