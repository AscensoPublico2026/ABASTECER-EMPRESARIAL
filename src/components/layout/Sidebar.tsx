'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { LayoutDashboard, Users, ShoppingCart, Receipt, Truck, UserCheck, Package, BarChart3, DollarSign, LogOut, Wallet, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
]

export default function Sidebar() {
  const pathname = usePathname()
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Abastecer" className="w-10 h-10 rounded-xl object-contain bg-white p-0.5" />
          <div>
            <h1 className="font-bold text-lg leading-tight">ABASTECER</h1>
            <p className="text-xs text-slate-400">ERP Empresarial</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link href={item.href} className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all', isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white')}>
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="p-3 border-t border-slate-700">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full">
          <LogOut className="w-5 h-5" />
          Cerrar Sesion
        </button>
      </div>
    </aside>
  )
}
