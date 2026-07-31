import Sidebar from '@/components/layout/Sidebar'
import { vincularPerfilConUsuario } from './perfiles/actions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await vincularPerfilConUsuario()

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main>{children}</main>
    </div>
  )
}
