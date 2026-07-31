'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { LayoutDashboard, Users, ShoppingCart, Receipt, Truck, UserCheck, Package, BarChart3, DollarSign, LogOut, Wallet, FileText, UserCog, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Centro Financiero', href: '/financiero', icon: DollarSign },
  { name: 'Socios & Capital', href: '/socios', icon: Users },
  { name: 'Catalogo', href: '/inventario', icon: Package },
  { name: 'Cotizaciones', href: '/ventas', icon: Receipt },
  { name: 'Facturacion', href: '/facturacion', icon: FileText },
  { name: 'Compras', href: '/compras', icon: ShoppingCart },
  { name: 'Gastos', href: '/gastos', icon: Wallet },
  { name: 'Proveedores', href: '/proveedores', icon: Truck },
  { name: 'Clientes', href: '/clientes', icon: UserCheck },
  { name: 'Indicadores', href: '/indicadores', icon: BarChart3 },
  { name: 'Perfiles', href: '/perfiles', icon: UserCog },
  { name: 'Configuracion', href: '/configuracion', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [colapsado, setColapsado] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      <aside className={clsx('fixed left-0 top-0 h-screen bg-slate-900 text-white flex flex-col transition-all duration-200 z-40', colapsado ? 'w-16' : 'w-64')}>
        <div className={clsx('border-b border-slate-700 flex items-center', colapsado ? 'p-3 justify-center' : 'p-6')}>
          {colapsado ? (
            <img src="/logo.png" alt="A" className="w-8 h-8 rounded-lg object-contain bg-white p-0.5" />
          ) : (
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Abastecer" className="w-10 h-10 rounded-xl object-contain bg-white p-0.5" />
              <div>
                <h1 className="font-bold text-lg leading-tight">ABASTECER</h1>
                <p className="text-xs text-slate-400">ERP Empresarial</p>
              </div>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  <Link href={item.href} title={colapsado ? item.name : undefined} className={clsx('flex items-center gap-3 rounded-xl text-sm font-medium transition-all', colapsado ? 'px-3 py-2.5 justify-center' : 'px-3 py-2.5', isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white')}>
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!colapsado && item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="p-2 border-t border-slate-700 space-y-1">
          <button onClick={() => setColapsado(!colapsado)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all w-full justify-center">
            {colapsado ? <PanelLeftOpen className="w-5 h-5" /> : <><PanelLeftClose className="w-5 h-5" />{!colapsado && <span>Ocultar menu</span>}</>}
          </button>
          <button onClick={handleLogout} className={clsx('flex items-center gap-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full', colapsado ? 'px-3 py-2.5 justify-center' : 'px-3 py-2.5')}>
            <LogOut className="w-5 h-5" />
            {!colapsado && 'Cerrar Sesion'}
          </button>
        </div>
      </aside>
      {/* Spacer para el contenido */}
      <style jsx global>{`main { margin-left: ${colapsado ? '4rem' : '16rem'}; transition: margin-left 0.2s; }`}</style>
    </>
  )
}
