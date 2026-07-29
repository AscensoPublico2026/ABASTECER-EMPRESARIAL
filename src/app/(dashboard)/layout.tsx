import Sidebar from '@/components/layout/Sidebar'
import { vincularPerfilConUsuario } from './perfiles/actions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Vincular perfil con usuario si no esta vinculado aun
  await vincularPerfilConUsuario()

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64">{children}</main>
    </div>
  )
}
