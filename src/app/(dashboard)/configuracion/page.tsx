import Header from '@/components/layout/Header'
import { obtenerCategorias } from '@/lib/queries/productos'
import GestionCategorias from './GestionCategorias'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const categorias = await obtenerCategorias()

  return (
    <>
      <Header title="Configuracion" subtitle="Gestiona categorias, listas y parametros del ERP" />
      <div className="p-8 space-y-8">

        {/* Categorias de producto */}
        <GestionCategorias categorias={categorias} />

        {/* Futuras secciones */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-2">Proximas configuraciones</h3>
          <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
            <li>Formas de pago personalizadas</li>
            <li>Categorias de gastos</li>
            <li>Plantillas de correo</li>
            <li>Datos de la empresa (logo, datos fiscales)</li>
          </ul>
        </div>
      </div>
    </>
  )
}
