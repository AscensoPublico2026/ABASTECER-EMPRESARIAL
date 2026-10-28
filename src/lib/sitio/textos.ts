/**
 * TEXTOS INSTITUCIONALES DEL SITIO WEB
 *
 * Alineados con el portafolio comercial oficial (catálogo PDF). Aquí solo
 * va lo que la empresa puede sostener: sin cifras ni promesas que no estén
 * en el portafolio. Los datos de contacto (WhatsApp, correo, dirección,
 * horario) siguen siendo editables desde el ERP en Sitio Web > Contenido.
 */

export const MARCA = {
  nombre: 'Abastecer Empresarial S.A.S.',
  slogan: 'Tu aliado en abastecimiento empresarial.',
  titulo_seo: 'Abastecer Empresarial S.A.S. | Un solo aliado para múltiples necesidades de suministro',
  descripcion_seo:
    'Proveedor empresarial en Cali: dotación con tu logo, elementos de protección personal (EPP), calzado de seguridad, señalización, extintores, aseo, cafetería, papelería, tecnología y más. Cotiza por WhatsApp.',
  portafolio_pdf: '/portafolio-abastecer-empresarial.pdf',
}

export const QUIENES_SOMOS = {
  titulo: 'Un solo aliado para múltiples necesidades de suministro',
  parrafos: [
    'Abastecer Empresarial S.A.S. es una empresa colombiana dedicada al suministro de productos para empresas, instituciones y organizaciones.',
    'Atendemos los requerimientos de todas las áreas de tu operación con un solo aliado: desde dotación y elementos de protección personal, hasta aseo, tecnología, mobiliario y mucho más.',
  ],
  ampliado: [
    'Nacimos para resolverle a las áreas de compras, talento humano y seguridad y salud en el trabajo una tarea que consume tiempo: cotizar con muchos proveedores, coordinar entregas distintas y cuadrar facturas por separado.',
    'Organizamos nuestro portafolio en doce líneas de suministro y, cuando lo que necesitas no aparece, lo buscamos con nuestra red de proveedores. Así tu empresa habla con un solo aliado y recibe una sola propuesta.',
  ],
}

/** Las cuatro razones del portafolio (portada del catálogo) */
export const PILARES = [
  { icono: 'caja', titulo: 'Variedad', texto: '12 líneas de suministro para todas las áreas de tu empresa.' },
  { icono: 'casco', titulo: 'Especialización', texto: 'Dotación, EPP y suministros de seguridad y salud en el trabajo.' },
  { icono: 'lupa', titulo: 'Búsqueda', texto: 'Alternativas para productos que no están en el portafolio.' },
  { icono: 'tarjeta', titulo: 'Cotización', texto: 'A la medida de las necesidades de cada cliente.' },
] as const

/** Compras especiales (página final del catálogo) */
export const COMPRAS_ESPECIALES = {
  titulo: '¿Buscas algo que no aparece en el portafolio?',
  texto: 'Cuéntanos qué necesitas. Revisamos alternativas con nuestros proveedores para ayudarte a encontrar una solución.',
  puedes_enviar: [
    { icono: 'documento', titulo: 'Una descripción', texto: 'o especificación' },
    { icono: 'camara', titulo: 'Una fotografía', texto: 'del producto' },
    { icono: 'etiqueta', titulo: 'Una referencia', texto: 'o marca' },
    { icono: 'enlace', titulo: 'Un enlace', texto: 'de internet' },
  ],
  pasos: [
    { titulo: 'Cuéntanos', texto: 'Envíanos tu requerimiento por WhatsApp o por el formulario de contacto.' },
    { titulo: 'Revisamos', texto: 'Buscamos alternativas con nuestros proveedores.' },
    { titulo: 'Cotizamos', texto: 'Recibes una cotización según disponibilidad, características, costo y viabilidad.' },
  ],
  mensaje: 'Hola, busco un producto que no aparece en el portafolio. ¿Me pueden ayudar a cotizarlo?',
}

export const MISION =
  'Simplificar el abastecimiento de las empresas colombianas. Reunimos en un solo aliado la dotación, los elementos de protección personal y los suministros que cada área necesita para operar con seguridad, y los entregamos con asesoría cercana, cotizaciones claras y cumplimiento en lo que acordamos.'

export const VISION =
  'En 2030 seremos el aliado de abastecimiento empresarial de referencia en el suroccidente colombiano, reconocidos por cumplir lo que prometemos, por la calidad de lo que entregamos y por hacerles más fácil el trabajo a las áreas de compras, talento humano y seguridad y salud en el trabajo de nuestros clientes.'

export const VALORES = [
  { icono: 'check', titulo: 'Cumplimiento', texto: 'Lo que acordamos, lo entregamos: en cantidad, especificación y fecha.' },
  { icono: 'medalla', titulo: 'Calidad', texto: 'Elegimos proveedores y referencias que respondan a la necesidad real de tu operación.' },
  { icono: 'usuarios', titulo: 'Cercanía', texto: 'Hablas con una persona que conoce tu empresa y te acompaña en cada pedido.' },
  { icono: 'escudo', titulo: 'Transparencia', texto: 'Cotizaciones claras, condiciones explícitas y respaldo formal en cada compra.' },
  { icono: 'estrella', titulo: 'Soluciones', texto: 'Si no está en el portafolio, buscamos alternativas hasta encontrar la adecuada.' },
] as const

export interface Sector {
  icono: string
  nombre: string
  descripcion: string
  necesidades: string[]
  lineas: string[] // slugs de portafolio.ts
  mensaje: string
}

export const SECTORES: Sector[] = [
  {
    icono: 'fabrica',
    nombre: 'Industria y manufactura',
    descripcion: 'Plantas de producción que necesitan proteger a su personal y mantener ordenadas sus instalaciones.',
    necesidades: ['Dotación industrial y overoles en dril', 'EPP para cabeza, manos, ojos y oídos', 'Señalización y demarcación de áreas', 'Puntos ecológicos y canecas', 'Estanterías para bodega'],
    lineas: ['dotacion', 'proteccion-personal-epp', 'senalizacion-y-demarcacion', 'estanterias-y-almacenamiento'],
    mensaje: 'Hola, soy de una empresa industrial y quiero cotizar dotación y EPP.',
  },
  {
    icono: 'casco',
    nombre: 'Construcción y obra civil',
    descripcion: 'Obras que exigen protección completa del trabajador y control del tránsito en el frente de trabajo.',
    necesidades: ['Cascos, barbuquejos y caretas', 'Arneses, eslingas y conectores', 'Botas de seguridad y botas PVC', 'Conos, chalecos y paletas pare y siga', 'Botiquines y camillas'],
    lineas: ['proteccion-personal-epp', 'trabajo-en-alturas', 'calzado-de-seguridad', 'senalizacion-y-demarcacion'],
    mensaje: 'Hola, soy de una constructora y quiero cotizar EPP para obra.',
  },
  {
    icono: 'edificio',
    nombre: 'Empresas y oficinas',
    descripcion: 'Equipos administrativos que necesitan insumos diarios, buena imagen y puestos de trabajo cómodos.',
    necesidades: ['Papelería y útiles de oficina', 'Aseo y cafetería', 'Sillas ergonómicas y accesorios', 'Equipos de cómputo y periféricos', 'Polos y camisas con tu logo'],
    lineas: ['papeleria-aseo-y-cafeteria', 'ergonomia-y-tecnologia', 'dotacion', 'identificacion-y-promocionales'],
    mensaje: 'Hola, quiero cotizar suministros para nuestra oficina.',
  },
  {
    icono: 'hospital',
    nombre: 'Clínicas, IPS y salud',
    descripcion: 'Instituciones donde la bioseguridad, el aseo y la identificación del personal son parte de la operación.',
    necesidades: ['Tapabocas y respiradores', 'Guantes de nitrilo', 'Trajes desechables tipo Tyvek', 'Aseo y desinfección', 'Carnés y portacarnés'],
    lineas: ['proteccion-personal-epp', 'papeleria-aseo-y-cafeteria', 'identificacion-y-promocionales', 'incendios-y-emergencias'],
    mensaje: 'Hola, soy del sector salud y quiero cotizar EPP y productos de aseo.',
  },
  {
    icono: 'usuarios',
    nombre: 'Instituciones educativas',
    descripcion: 'Colegios, universidades e institutos que cuidan a estudiantes, docentes y personal de apoyo.',
    necesidades: ['Aseo y cafetería', 'Papelería administrativa', 'Puntos ecológicos', 'Botiquines, extintores y señalización', 'Detalles para fechas especiales'],
    lineas: ['papeleria-aseo-y-cafeteria', 'canecas-y-contenedores', 'incendios-y-emergencias', 'fechas-especiales-y-diseno'],
    mensaje: 'Hola, soy de una institución educativa y quiero cotizar suministros.',
  },
  {
    icono: 'camion',
    nombre: 'Logística y transporte',
    descripcion: 'Bodegas, centros de distribución y flotas que se mueven todos los días.',
    necesidades: ['Chalecos reflectivos y conos', 'Calzado de seguridad', 'Guantes y protección para manos', 'Estanterías y canastillas', 'Extintores y kits de carretera'],
    lineas: ['senalizacion-y-demarcacion', 'calzado-de-seguridad', 'estanterias-y-almacenamiento', 'incendios-y-emergencias'],
    mensaje: 'Hola, somos una empresa de logística y queremos cotizar elementos de seguridad.',
  },
  {
    icono: 'tienda',
    nombre: 'Comercio y servicios',
    descripcion: 'Negocios que atienden público y necesitan una imagen uniforme y una marca visible.',
    necesidades: ['Polos, camisas y gorras con tu logo', 'Carnés y portacarnés', 'Productos promocionales', 'Papelería y aseo', 'Servicio de diseño gráfico'],
    lineas: ['dotacion', 'identificacion-y-promocionales', 'papeleria-aseo-y-cafeteria', 'fechas-especiales-y-diseno'],
    mensaje: 'Hola, quiero cotizar uniformes y artículos con la marca de mi negocio.',
  },
  {
    icono: 'tractor',
    nombre: 'Agroindustria',
    descripcion: 'Operaciones en campo con exposición al sol, la humedad y el trabajo pesado.',
    necesidades: ['Pavas y protección solar', 'Botas PVC', 'Guantes y conjuntos impermeables', 'Tambores y canastillas plásticas', 'Overoles y conjuntos en dril'],
    lineas: ['dotacion', 'calzado-de-seguridad', 'proteccion-personal-epp', 'canecas-y-contenedores'],
    mensaje: 'Hola, somos del sector agroindustrial y queremos cotizar dotación y EPP.',
  },
]

export const AVISO_LEGAL =
  'Referencias, disponibilidad, cantidades, tiempos de entrega y opciones de personalización sujetos a confirmación en la cotización.'
