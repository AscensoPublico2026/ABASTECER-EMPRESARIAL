import Header from '@/components/layout/Header'
import { obtenerProveedores } from '@/lib/queries/proveedores'
import { ESTADOS_PROVEEDOR } from '@/types/proveedores'
import { Truck, Phone, Mail, MapPin } from 'lucide-react'
import FormProveedor from './FormProveedor'

export const dynamic = 'force-dynamic'

export default async function ProveedoresPage() {
  const { data: proveedores, error } = await obtenerProveedores()

  return (
    <>
      <Header title="Proveedores" subtitle="Directorio y registro de proveedores" />

      <div className="p-8 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Proveedores activos</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {proveedores.filter((p) => p.estado === 'ACTIVO').length}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">En evaluacion</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {proveedores.filter((p) => p.estado === 'EN_EVALUACION').length}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Con credito</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">
              {proveedores.filter((p) => p.dias_credito > 0).length}
            </p>
          </div>
        </div>

        {/* Lista de proveedores */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-800">Directorio de Proveedores</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Registro Unico de Proveedor (Decision #019)
              </p>
            </div>
            <FormProveedor />
          </div>

          {error && (
            <div className="px-6 py-4 bg-red-50 text-red-700 text-sm border-b border-red-100">
              Error: {error}
            </div>
          )}

          {proveedores.length === 0 && !error ? (
            <div className="text-center py-12 text-gray-400">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Sin proveedores registrados</p>
              <p className="text-sm mt-1">
                Registra tu primer proveedor para empezar a cotizar.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {proveedores.map((p) => {
                const estado = ESTADOS_PROVEEDOR[p.estado]
                return (
                  <div key={p.id} className="px-6 py-4 hover:bg-gray-50/50 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <a href={`/proveedores/${p.id}`} className="hover:text-blue-600 hover:underline">
                            <h4 className="font-medium text-gray-800 truncate">
                              {p.razon_social}
                            </h4>
                          </a>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${estado.color}`}>
                            {estado.etiqueta}
                          </span>
                        </div>
                        {p.nit && (
                          <p className="text-xs text-gray-400 mt-0.5">NIT: {p.nit}</p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                          {p.contacto_nombre && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {p.contacto_nombre}
                              {p.contacto_telefono && ` - ${p.contacto_telefono}`}
                            </span>
                          )}
                          {p.contacto_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              {p.contacto_email}
                            </span>
                          )}
                          {p.ciudad && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {p.ciudad}
                            </span>
                          )}
                        </div>
                        {p.categorias.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {p.categorias.map((cat) => (
                              <span key={cat} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs">
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-400">{p.condiciones_pago}</p>
                        {p.dias_credito > 0 && (
                          <p className="text-xs text-indigo-600 font-medium">
                            {p.dias_credito} dias credito
                          </p>
                        )}
                        {p.tiempo_entrega && (
                          <p className="text-xs text-gray-400 mt-1">{p.tiempo_entrega}</p>
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
