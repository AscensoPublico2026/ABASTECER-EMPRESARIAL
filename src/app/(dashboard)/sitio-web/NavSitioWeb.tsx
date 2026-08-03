'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { LayoutDashboard, FileText, Package, Layers, Inbox } from 'lucide-react'

const PESTANAS = [
  { nombre: 'Resumen', href: '/sitio-web', icono: LayoutDashboard },
  { nombre: 'Contenido', href: '/sitio-web/contenido', icono: FileText },
  { nombre: 'Productos', href: '/sitio-web/productos', icono: Package },
  { nombre: 'Lineas', href: '/sitio-web/lineas', icono: Layers },
  { nombre: 'Solicitudes', href: '/sitio-web/solicitudes', icono: Inbox },
]

export default function NavSitioWeb({ solicitudesNuevas = 0 }: { solicitudesNuevas?: number }) {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
      {PESTANAS.map((pestana) => {
        const activa = pathname === pestana.href
        return (
          <Link
            key={pestana.href}
            href={pestana.href}
            className={clsx(
              'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
              activa
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            )}
          >
            <pestana.icono className="h-4 w-4" />
            {pestana.nombre}
            {pestana.href === '/sitio-web/solicitudes' && solicitudesNuevas > 0 ? (
              <span
                className={clsx(
                  'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold',
                  activa ? 'bg-white text-blue-700' : 'bg-red-500 text-white'
                )}
              >
                {solicitudesNuevas}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
