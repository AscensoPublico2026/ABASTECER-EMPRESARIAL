import Header from '@/components/layout/Header'
import { obtenerPerfiles } from '@/lib/queries/perfil'
import FormPerfil from './FormPerfil'
import ListaPerfiles from './ListaPerfiles'

export const dynamic = 'force-dynamic'

export default async function PerfilesPage() {
  const perfiles = await obtenerPerfiles()

  const maestros = perfiles.filter((p) => p.rol === 'MAESTRO')
  const empleados = perfiles.filter((p) => p.rol === 'EMPLEADO')

  return (
    <>
      <Header title="Perfiles de Usuario" subtitle="Gestion de accesos y modulos asignados" />
      <div className="p-8 space-y-8">

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 uppercase">Total perfiles</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{perfiles.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100 bg-purple-50/30">
            <p className="text-xs text-purple-600 uppercase font-semibold">Maestros (ven todo)</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{maestros.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 uppercase">Empleados</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{empleados.length}</p>
          </div>
        </div>

        {/* Crear perfil */}
        <FormPerfil />

        {/* Lista de perfiles */}
        <ListaPerfiles perfiles={perfiles} />
      </div>
    </>
  )
}
