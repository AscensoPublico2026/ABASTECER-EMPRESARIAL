import Header from '@/components/layout/Header'
import KpiCard from '@/components/socios/KpiCard'
import SetupBanner from '@/components/socios/SetupBanner'
import TablaSocios from '@/components/socios/TablaSocios'
import TablaMovimientos from '@/components/socios/TablaMovimientos'
import FormMovimiento from '@/components/socios/FormMovimiento'
import { obtenerDatosSocios, obtenerSociosActivos } from '@/lib/queries/socios'
import { obtenerCuentasParaSelect } from '@/lib/queries/tesoreria'
import { formatCOP } from '@/lib/format'
import { Wallet, HandCoins, Users, TrendingUp, Info } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SociosPage() {
  const datos = await obtenerDatosSocios()
  const sociosSelect = await obtenerSociosActivos()
  const cuentas = await obtenerCuentasParaSelect()

  const hayProblema = !datos.configurado || datos.error !== null
  const { totales } = datos

  return (
    <>
      <Header
        title="Socios & Capital"
        subtitle="Aportes, participacion y movimientos con los socios"
      />

      <div className="p-8 space-y-8">
        {/* Aviso de configuracion si aplica */}
        {hayProblema && (
          <SetupBanner configurado={datos.configurado} error={datos.error} />
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            titulo="Capital social"
            valor={formatCOP(totales.capitalSocial)}
            descripcion="Aportes permanentes de los socios"
            icono={Wallet}
            color="blue"
          />
          <KpiCard
            titulo="Prestamos por devolver"
            valor={formatCOP(totales.prestamosPendientes)}
            descripcion="Lo que la empresa debe a los socios"
            icono={HandCoins}
            color="indigo"
          />
          <KpiCard
            titulo="Dividendos pagados"
            valor={formatCOP(totales.dividendosPagados)}
            descripcion="Utilidades ya repartidas"
            icono={TrendingUp}
            color="green"
          />
          <KpiCard
            titulo="Socios activos"
            valor={String(totales.numeroSocios)}
            descripcion="Participacion total 100%"
            icono={Users}
            color="purple"
          />
        </div>

        {/* Recordatorio conceptual */}
        <div className="flex items-start gap-3 bg-blue-50/60 border border-blue-100 rounded-2xl px-5 py-4">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-900 leading-relaxed">
            <strong>Capital social no es patrimonio.</strong> El capital es lo que
            los socios aportaron; el patrimonio es lo que realmente vale la empresa
            (activos menos pasivos) y se calculara en el Centro de Control
            Financiero cuando existan compras, ventas e inventario.
          </p>
        </div>

        {/* Composicion accionaria */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Composicion accionaria</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Participacion y saldos por socio
            </p>
          </div>
          <TablaSocios socios={datos.socios} />
        </div>

        {/* Movimientos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-800">
                Movimientos con socios
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Ultimos 50 movimientos registrados
              </p>
            </div>
            <FormMovimiento
              socios={sociosSelect}
              cuentas={cuentas}
              deshabilitado={sociosSelect.length === 0}
            />
          </div>
          <TablaMovimientos movimientos={datos.movimientos} />
        </div>
      </div>
    </>
  )
}
