import Header from '@/components/layout/Header'
import { obtenerClientes } from '@/lib/queries/clientes'
import { ESTADOS_CLIENTE } from '@/types/clientes'
import { UserCheck, Phone, Mail, MapPin } from 'lucide-react'
import FormCliente from './FormCliente'

export const dynamic = 'force-dynamic'

export default async function ClientesPage() {
  const { data: clientes, error } = await obtenerClientes()

  const activos = clientes.filter((c) => c.estado === 'ACTIVO').length
  const prospectos = clientes.filter((c) => c.estado === 'PROSPECTO').length
  const conCredito = clientes.filter((c) => c.tiene_credito).length

  return (
    <>
      <Header title="Clientes" subtitle="Directorio y gestion de clientes" />

      <div className="p-8 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Clientes activos</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{activos}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Prospectos</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{prospectos}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Con credito</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{conCredito}</p>
          </div>
        </div>

        {/* Lista de clientes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-800">Directorio de Clientes</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Registro y seguimiento comercial
              </p>
            </div>
            <FormCliente />
          </div>

          {error && (
            <div className="px-6 py-4 bg-red-50 text-red-700 text-sm border-b border-red-100">
              Error: {error}
            </div>
          )}

          {clientes.length === 0 && !error ? (
            <div className="text-center py-12 text-gray-400">
              <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Sin clientes registrados</p>
              <p className="text-sm mt-1">
                Registra tu primer cliente. Recuerda: primera venta siempre de contado (Decision #019).
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {clientes.map((c) => {
                const estado = ESTADOS_CLIENTE[c.estado]
                return (
                  <div key={c.id} className="px-6 py-4 hover:bg-gray-50/50 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <a href={`/clientes/${c.id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                            {c.razon_social}
                          </a>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${estado.color}`}
                          >
                            {estado.etiqueta}
                          </span>
                        </div>
                        {c.nit && (
                          <p className="text-xs text-gray-400 mt-0.5">NIT: {c.nit}</p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                          {c.contacto_nombre && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {c.contacto_nombre}
                              {c.contacto_telefono && ` - ${c.contacto_telefono}`}
                            </span>
                          )}
                          {c.contacto_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              {c.contacto_email}
                            </span>
                          )}
                          {c.ciudad && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {c.ciudad}
                            </span>
                          )}
                        </div>
                        {c.sector && (
                          <p className="text-xs text-gray-400 mt-1.5">Sector: {c.sector}</p>
                        )}
                        {c.categorias_interes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {c.categorias_interes.map((cat) => (
                              <span
                                key={cat}
                                className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {c.tiene_credito && (
                          <>
                            <p className="text-xs text-indigo-600 font-medium">
                              {c.dias_credito} dias credito
                            </p>
                            {c.cupo_credito > 0 && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                Cupo: ${c.cupo_credito.toLocaleString()}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
