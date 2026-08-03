import { AlertTriangle } from 'lucide-react'

/**
 * Se muestra cuando la migracion 023 todavia no se ha ejecutado en Supabase.
 * Sin ella no existen las columnas ni las tablas del sitio web.
 */
export default function AvisoMigracion() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-3 text-sm">
          <div>
            <h3 className="font-semibold text-amber-900">
              Falta un paso: ejecutar la migracion del sitio web
            </h3>
            <p className="mt-1 leading-relaxed text-amber-800">
              El sitio web publico ya esta programado, pero la base de datos todavia no tiene las
              tablas y columnas que necesita. Mientras eso pase, la web se muestra con los textos de
              fabrica y el catalogo aparece vacio.
            </p>
          </div>

          <ol className="ml-4 list-decimal space-y-1.5 leading-relaxed text-amber-800">
            <li>
              Entra a Supabase &gt; <strong>SQL Editor</strong>.
            </li>
            <li>
              Abre el archivo del repositorio{' '}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[12px]">
                supabase/migrations/023_sitio_web_publico.sql
              </code>
              , copia todo su contenido y pegalo en el editor.
            </li>
            <li>
              Presiona <strong>Run</strong>. Debe terminar sin errores.
            </li>
            <li>Recarga esta pagina.</li>
          </ol>

          <p className="leading-relaxed text-amber-700">
            Si el ultimo bloque (el del bucket de Storage) falla por permisos, crea el bucket a mano:
            Supabase &gt; Storage &gt; New bucket &gt; nombre <strong>sitio</strong> &gt; marca
            <strong> Public bucket</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}
