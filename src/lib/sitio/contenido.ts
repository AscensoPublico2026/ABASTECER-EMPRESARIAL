import type { Contenido } from '@/types/sitio'

/**
 * Contenido por DEFECTO del sitio web publico.
 *
 * Es el mismo texto que siembra la migracion 023 en la tabla sitio_contenido.
 * Vive aqui tambien para que la web funcione perfecta aunque la base de datos
 * no responda o la migracion todavia no se haya ejecutado.
 *
 * Para cambiar textos NO se edita este archivo: se edita en el ERP,
 * en Sitio Web > Contenido.
 */
export const CONTENIDO_DEFECTO: Contenido = {
  // Marca
  marca_nombre: 'Abastecer Empresarial S.A.S.',
  marca_tagline: 'Dotación y EPP para un entorno seguro',
  marca_slogan: 'Tu aliado en abastecimiento empresarial',
  marca_descripcion_seo:
    'Dotación, EPP y suministros empresariales en Cali. Un solo proveedor para todo lo que tu empresa necesita: cotizamos en 24 horas y entregamos con factura electrónica.',

  // Hero
  hero_kicker: 'Dotación y EPP para un entorno seguro',
  hero_titulo: 'Todo lo que tu empresa necesita, en un solo lugar',
  hero_subtitulo:
    'Somos la empresa que abastece a otras empresas. Dotación, elementos de protección personal, aseo, cafetería, papelería y mucho más: una sola llamada, un solo proveedor, una sola factura.',
  hero_boton_primario: 'Ver catálogo',
  hero_boton_secundario: 'Solicitar cotización',
  hero_badges: 'Productos certificados\nEntregas cumplidas\nFactura electrónica\nAsesoría en SST',
  hero_imagen_url: '',

  // Cifras
  cifras:
    '24 h|Respuesta a tu cotización\n11|Líneas de abastecimiento\n1|Solo proveedor para todo\n100%|Factura electrónica',

  // Beneficios
  beneficios_titulo: '¿Por qué las empresas nos eligen?',
  beneficios_subtitulo:
    'Comprar dotación y suministros no debería costarle tiempo a tu equipo. Nosotros nos encargamos de todo el proceso.',
  beneficios: [
    'caja|Un solo proveedor|Dejas de perseguir cinco proveedores distintos. Consolidamos tu abastecimiento en un solo pedido, una sola entrega y una sola factura.',
    'reloj|Cotización en 24 horas|Respondemos rápido y con precios claros. Sabemos que tu área de compras necesita cerrar, no esperar.',
    'medalla|Productos certificados|Trabajamos con marcas y referencias que cumplen la norma. Lo que protege a tu gente no se negocia.',
    'camion|Entregas cumplidas|Programamos la entrega y llegamos cuando dijimos que íbamos a llegar. En Cali y con despachos a todo el país.',
    'factura|Factura electrónica|Somos empresa formal con NIT, RUT y facturación electrónica DIAN. Tu contabilidad, tranquila.',
    'usuarios|Atención personalizada|Hablas con una persona que conoce tu empresa, no con un formulario. Asesoría real en dotación y SST.',
  ].join('\n'),

  // Nosotros
  nosotros_titulo: 'Somos el aliado que le resuelve el abastecimiento a tu empresa',
  nosotros_texto: [
    'Abastecer Empresarial S.A.S. es una empresa colombiana con domicilio en Cali, Valle del Cauca, dedicada al suministro de dotación, elementos de protección personal y productos institucionales para empresas de todos los tamaños.',
    'Nacimos de una idea simple: las áreas de compras y de seguridad y salud en el trabajo pierden demasiado tiempo cotizando con múltiples proveedores, persiguiendo entregas y cuadrando facturas. Nosotros centralizamos todo eso.',
    'No vendemos por catálogo cerrado: trabajamos bajo pedido, buscamos la referencia exacta que tu empresa necesita, la conseguimos al mejor costo y la entregamos con respaldo y factura electrónica.',
  ].join('\n\n'),
  mision:
    'Abastecer a las empresas de todo lo que necesitan para operar seguras y productivas, entregando dotación, elementos de protección personal y suministros institucionales con calidad certificada, cumplimiento en las entregas y asesoría cercana. Simplificamos el abastecimiento empresarial: un solo proveedor, un solo contacto, una sola factura.',
  vision:
    'Para el año 2030 ser reconocidos como el aliado de abastecimiento empresarial de referencia en el suroccidente colombiano, por cumplir siempre lo que prometemos, por la calidad de los productos que entregamos y por hacerle la vida más fácil a las áreas de compras y de seguridad y salud en el trabajo de nuestros clientes.',
  valores: [
    'escudo|Seguridad|Protegemos lo más importante: las personas que hacen funcionar tu empresa.',
    'medalla|Calidad|Productos certificados y de alta calidad. No sacrificamos norma por precio.',
    'manos|Confianza|Transparencia y cumplimiento en cada cotización, cada entrega y cada factura.',
    'caja|Compromiso|Con tu empresa, en cada entrega. Respondemos por lo que vendemos.',
    'estrella|Soluciones|Todo lo que tu empresa necesita, en un solo lugar y con un solo responsable.',
  ].join('\n'),

  // Proceso
  proceso_titulo: 'Cómo trabajamos',
  proceso_subtitulo: 'Cuatro pasos, sin vueltas. Así es comprar con Abastecer Empresarial.',
  proceso_pasos: [
    'Cuéntanos qué necesitas|Escríbenos por WhatsApp o envíanos tu lista de requerimientos. No necesitas tener las referencias exactas: te ayudamos a definirlas.',
    'Recibes la cotización|En menos de 24 horas hábiles te enviamos la cotización formal, con precios, IVA, tiempos de entrega y condiciones.',
    'Apruebas y programamos|Confirmas la orden y acordamos la fecha de entrega. Te mantenemos informado del estado de tu pedido.',
    'Entregamos y facturamos|Entregamos con remisión, factura electrónica y garantía. Y quedamos atentos a lo que sigue.',
  ].join('\n'),

  // Sectores
  sectores_titulo: 'Empresas que atendemos',
  sectores_subtitulo:
    'Si tu empresa tiene personal, tiene necesidades de abastecimiento. Estos son los sectores donde más trabajamos.',
  sectores: [
    'casco|Construcción y obra civil',
    'fabrica|Industria y manufactura',
    'hospital|Salud e instituciones',
    'tienda|Comercio y servicios',
    'camion|Logística y transporte',
    'edificio|Oficinas y corporativo',
    'tractor|Agroindustria',
    'usuarios|Sector público y educación',
  ].join('\n'),

  // Catalogo
  catalogo_titulo: 'Nuestro catálogo',
  catalogo_subtitulo:
    'Busca por nombre o navega por línea. Si no encuentras lo que necesitas, escríbenos: trabajamos bajo pedido y conseguimos referencias específicas.',
  catalogo_nota:
    'Los precios se cotizan según cantidad, especificaciones y condiciones de entrega. Arma tu lista y te enviamos la cotización formal en menos de 24 horas hábiles.',

  // Llamado a la accion
  cta_titulo: '¿Listo para dejar de perseguir proveedores?',
  cta_texto:
    'Envíanos tu lista de requerimientos y recibe una cotización formal en menos de 24 horas hábiles. Sin compromiso.',
  cta_boton: 'Solicitar cotización',

  // Contacto
  contacto_whatsapp: '573508624021',
  contacto_whatsapp_mensaje:
    'Hola, los contacto desde la página web de Abastecer Empresarial. Necesito una cotización.',
  contacto_telefono: '350 862 4021',
  contacto_email: 'abastecerempresarial@gmail.com',
  contacto_direccion: 'Carrera 13 #15-36',
  contacto_ciudad: 'Cali, Valle del Cauca',
  contacto_horario: 'Lunes a viernes de 8:00 a.m. a 6:00 p.m. · Sábados de 8:00 a.m. a 12:00 m.',
  contacto_cobertura: 'Cali y área metropolitana. Despachos a todo Colombia.',
  contacto_maps_url: '',

  // Redes
  red_instagram: '',
  red_facebook: '',
  red_linkedin: '',
  red_tiktok: '',

  // Footer
  footer_texto:
    'Dotación, elementos de protección personal y suministros empresariales. Somos tu aliado en abastecimiento: cotizamos, entregamos y respondemos.',
  footer_legal: 'Abastecer Empresarial S.A.S. · NIT 902088758-4 · Cali, Valle del Cauca, Colombia',
}

/** Devuelve el valor de una clave, cayendo al texto por defecto si esta vacia. */
export function texto(contenido: Contenido, clave: string, alternativa = ''): string {
  const valor = contenido[clave]
  if (valor !== undefined && valor !== null && String(valor).trim() !== '') return String(valor)
  const defecto = CONTENIDO_DEFECTO[clave]
  if (defecto !== undefined && defecto.trim() !== '') return defecto
  return alternativa
}

/** Igual que texto(), pero devuelve '' sin recurrir al valor por defecto. */
export function textoOpcional(contenido: Contenido, clave: string): string {
  const valor = contenido[clave]
  return valor === undefined || valor === null ? '' : String(valor).trim()
}

/** Convierte un campo tipo "lista" en un arreglo de lineas limpias. */
export function lineas(contenido: Contenido, clave: string): string[] {
  return texto(contenido, clave)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

/**
 * Convierte un campo tipo "lista" con formato A|B|C en objetos.
 * Ejemplo: "reloj|Cotizacion en 24 h|Respondemos rapido" -> 3 partes.
 */
export function filas(contenido: Contenido, clave: string, columnas: number): string[][] {
  return lineas(contenido, clave).map((linea) => {
    const partes = linea.split('|').map((p) => p.trim())
    while (partes.length < columnas) partes.push('')
    return partes.slice(0, columnas)
  })
}

/** Divide un texto largo en parrafos (separados por linea en blanco). */
export function parrafos(contenido: Contenido, clave: string): string[] {
  return texto(contenido, clave)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/** Divide una ficha tecnica "Atributo|Valor" por linea. */
export function especificaciones(ficha: string | null | undefined): { atributo: string; valor: string }[] {
  if (!ficha) return []
  return ficha
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linea) => {
      const [atributo, ...resto] = linea.split('|')
      return { atributo: (atributo ?? '').trim(), valor: resto.join('|').trim() }
    })
    .filter((e) => e.atributo !== '')
}
