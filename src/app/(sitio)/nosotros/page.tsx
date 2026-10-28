import type { Metadata } from 'next'
import { Building2, FileCheck2, MapPin, Landmark } from 'lucide-react'
import { obtenerContenidoSitio } from '@/lib/queries/sitio'
import { EMPRESA } from '@/lib/empresa'
import { MISION, QUIENES_SOMOS } from '@/lib/sitio/textos'
import { BotonEnlace, CabeceraPagina, Encabezado } from '@/components/sitio/portafolio-ui'
import {
  SeccionQuienesSomos,
  SeccionMisionVision,
  SeccionSectores,
  SeccionCTA,
} from '@/components/sitio/secciones'

export const metadata: Metadata = {
  title: 'Nosotros',
  description: MISION.slice(0, 158),
  alternates: { canonical: '/nosotros' },
}

export default async function PaginaNosotros() {
  const contenido = await obtenerContenidoSitio()

  const datosLegales = [
    { icono: Building2, etiqueta: 'Razón social', valor: 'Abastecer Empresarial S.A.S.' },
    { icono: FileCheck2, etiqueta: 'NIT', valor: EMPRESA.nit },
    { icono: MapPin, etiqueta: 'Domicilio', valor: `${EMPRESA.ciudad}, ${EMPRESA.departamento}` },
    { icono: Landmark, etiqueta: 'Régimen tributario', valor: 'Régimen Simple de Tributación' },
  ]

  return (
    <>
      <CabeceraPagina
        migas={[{ nombre: 'Inicio', href: '/' }, { nombre: 'Nosotros' }]}
        antetitulo="Quiénes somos"
        titulo={
          <>
            Un solo aliado para <span className="text-oro-400">múltiples necesidades</span> de suministro
          </>
        }
        texto={QUIENES_SOMOS.parrafos[0]}
      />

      <SeccionQuienesSomos />
      <SeccionMisionVision />

      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <Encabezado
            antetitulo="Respaldo"
            titulo="Una empresa formal y verificable"
            texto="Somos una sociedad por acciones simplificada constituida en Colombia. Te entregamos los soportes que tu área contable necesita en cada compra."
          />
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {datosLegales.map(({ icono: Icono, etiqueta, valor }) => (
              <div key={etiqueta} className="rounded-[20px] bg-[#f6f7f8] p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#16823c] shadow-sm">
                  <Icono className="h-5 w-5" />
                </span>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-acero-400">{etiqueta}</p>
                <p className="mt-1.5 font-marca text-[15px] font-bold leading-snug text-marca-900">{valor}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <BotonEnlace href="/soluciones">Conoce nuestras 12 líneas</BotonEnlace>
          </div>
        </div>
      </section>

      <SeccionSectores />
      <SeccionCTA contenido={contenido} />
    </>
  )
}
