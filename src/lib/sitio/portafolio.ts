/**
 * PORTAFOLIO COMERCIAL — fuente única del contenido comercial del sitio web.
 *
 * Refleja, línea por línea, el catálogo PDF oficial de Abastecer Empresarial
 * (portafolio de 17 páginas). Si el catálogo cambia, se actualiza aquí y el
 * sitio queda alineado automáticamente: inicio, soluciones, páginas de cada
 * línea y pie de página leen de este archivo.
 *
 * Las fotos viven en /public/sitio/p (productos) y /public/sitio/fotos.
 */

export const COLORES: Record<string, string> = {
  Blanco: '#ffffff', Crema: '#efe2c2', Beige: '#c9ae84', Gris: '#8c8c8c', Vinotinto: '#7a1d3a',
  Café: '#6b4423', 'Azul oscuro': '#1d2a4f', 'Azul rey': '#1f4fa3', Negro: '#1a1a1a', Rojo: '#d83a26',
  'Verde limón': '#8cc63f', Verde: '#1d9a4b', Rosado: '#f1c3d3', Durazno: '#f5cbb5',
  'Azul claro': '#b8ccee', Índigo: '#2c3f72', Azul: '#1f4b8f', Amarillo: '#f4c800',
}

export interface Producto {
  nombre: string
  imagen: string
  detalle?: string
  colores?: string[]
  /** foto de ambiente (ocupa toda la tarjeta) en vez de recorte sobre fondo */
  foto?: boolean
}

export interface Sublinea {
  titulo: string
  descripcion: string
  productos: Producto[]
  principales?: string[]
  /** texto adicional para el recuadro de consulta */
  nota?: string
}

export interface Linea {
  numero: string
  slug: string
  nombre: string
  corto: string
  resumen: string
  intro: string
  /** imágenes para la tarjeta de la línea (portada / índice) */
  portada: string[]
  sublineas: Sublinea[]
  /** líneas del catálogo de referencias (base de datos) relacionadas */
  catalogo: string[]
  mensaje: string
  destacada?: boolean
}

const POLO = ['Blanco', 'Verde limón', 'Rojo', 'Azul rey', 'Azul oscuro', 'Gris', 'Negro']

export const LINEAS: Linea[] = [
  {
    numero: '01',
    slug: 'dotacion',
    nombre: 'Dotación empresarial e industrial',
    corto: 'Dotación',
    resumen: 'Uniformes, polos, camisas, overoles y gorras con tu logo bordado o estampado.',
    intro: 'Uniformes y prendas de trabajo para equipos operativos y administrativos, personalizados con tu logo.',
    portada: ['overol', 'polo', 'oxford-mujer'],
    destacada: true,
    catalogo: ['dotacion'],
    mensaje: 'Hola, quiero cotizar dotación empresarial con el logo de mi empresa.',
    sublineas: [
      {
        titulo: 'Polos, camisas y chaquetas',
        descripcion: 'Prendas superiores para áreas administrativas, comerciales y operativas.',
        productos: [
          { nombre: 'Camiseta polo', imagen: 'polo', detalle: 'Hombre y mujer · Tallas S–XXL', colores: POLO },
          { nombre: 'Camibuso polo', imagen: 'camibuso-polo', detalle: 'Hombre y mujer · Tallas S–XXL', colores: POLO },
          { nombre: 'Camisa oxford', imagen: 'oxford-hombre', detalle: 'Hombre · Tallas S–XXL', colores: ['Blanco', 'Azul claro'] },
          { nombre: 'Camisa oxford', imagen: 'oxford-mujer', detalle: 'Mujer · Tallas S–XXL', colores: ['Blanco', 'Azul claro'] },
          { nombre: 'Camisa jean industrial', imagen: 'camisa-jean-hombre', detalle: 'Hombre · Tallas S–XXXL', colores: ['Índigo'] },
          { nombre: 'Camisa jean industrial', imagen: 'camisa-jean-mujer', detalle: 'Mujer · Tallas S–XXXL', colores: ['Índigo'] },
          { nombre: 'Camibuso', imagen: 'camibuso', detalle: 'Manga larga · Tallas S–XL', colores: ['Gris', 'Azul rey', 'Negro'] },
          { nombre: 'Chaqueta jean', imagen: 'chaqueta-jean', detalle: 'Tallas S–XL', colores: ['Índigo'] },
        ],
      },
      {
        titulo: 'Pantalones, overoles y conjuntos',
        descripcion: 'Prendas resistentes para planta, obra y campo. Pantalón jean en versión normal o dieléctrica.',
        productos: [
          { nombre: 'Pantalón jean mujer', imagen: 'jean-mujer', detalle: 'Pretina alta · Tallas 6–24', colores: ['Azul', 'Negro'] },
          { nombre: 'Pantalón jean', imagen: 'jean', detalle: 'Normal o dieléctrico · Tallas 28–44', colores: ['Índigo'] },
          { nombre: 'Overol en dril', imagen: 'overol', detalle: 'Dril twill · Tallas S–XL', colores: ['Negro', 'Azul oscuro', 'Gris', 'Beige'] },
          { nombre: 'Conjunto en dril', imagen: 'conjunto-dril', detalle: 'Camisa y pantalón · Tallas S–XL', colores: ['Negro', 'Azul oscuro', 'Beige'] },
        ],
      },
      {
        titulo: 'Gorras, protección solar y complementos',
        descripcion: 'Gorras personalizables con tu logo, prendas para trabajo al aire libre y complementos para tu equipo.',
        productos: [
          { nombre: 'Gorra en dril', imagen: 'gorra-dril', detalle: 'Talla única', colores: ['Blanco', 'Crema', 'Beige', 'Gris', 'Vinotinto', 'Café', 'Azul oscuro', 'Azul rey', 'Negro'] },
          { nombre: 'Gorra en malla', imagen: 'gorra-malla', detalle: 'Talla única', colores: ['Gris', 'Rojo', 'Vinotinto', 'Azul oscuro', 'Beige', 'Negro'] },
          { nombre: 'Gorra en jean', imagen: 'gorra-jean', detalle: 'Talla única', colores: ['Índigo'] },
          { nombre: 'Monja', imagen: 'monja', detalle: 'Dril o jean · Talla única', colores: ['Negro', 'Beige', 'Azul oscuro'] },
          { nombre: 'Pava multifuncional', imagen: 'pava-multifuncional', detalle: 'Cubre rostro y cuello', colores: ['Beige', 'Azul oscuro', 'Negro'] },
          { nombre: 'Pava', imagen: 'pava', detalle: 'Con cubrenuca', colores: ['Beige', 'Azul oscuro', 'Negro'] },
          { nombre: 'Pasamontañas', imagen: 'pasamontanas', detalle: 'Talla única', colores: ['Azul oscuro', 'Negro', 'Vinotinto', 'Rojo', 'Azul rey', 'Verde', 'Rosado', 'Durazno'] },
          { nombre: 'Máscara en poliéster', imagen: 'mascara', detalle: 'Talla única', colores: ['Negro', 'Azul oscuro'] },
          { nombre: 'Chaleco periodista', imagen: 'chaleco', detalle: 'Multibolsillos · Tallas S–XL', colores: ['Negro', 'Azul oscuro', 'Beige', 'Gris'] },
          { nombre: 'Hoodie', imagen: 'hoodie', detalle: 'Tallas S–XL', colores: ['Negro'] },
        ],
      },
    ],
  },
  {
    numero: '02',
    slug: 'proteccion-personal-epp',
    nombre: 'Protección personal (EPP)',
    corto: 'EPP',
    resumen: 'Cabeza, visual, auditiva, respiratoria, manos y corporal.',
    intro: 'Organizados por línea de protección. Cotizamos referencias, tallas y marcas según tu necesidad.',
    portada: ['casco-tipo-1', 'protector-copa', 'respirador-doble', 'guantes-vaqueta'],
    destacada: true,
    catalogo: ['epp'],
    mensaje: 'Hola, quiero cotizar elementos de protección personal (EPP).',
    sublineas: [
      {
        titulo: 'Protección para la cabeza',
        descripcion: 'Cascos y accesorios para obra, planta y trabajo al aire libre.',
        productos: [
          { nombre: 'Casco tipo I certificado', imagen: 'casco-tipo-1', colores: ['Blanco', 'Amarillo', 'Azul rey', 'Verde', 'Rojo', 'Gris'] },
          { nombre: 'Casco tipo I con ratchet', imagen: 'casco-ratchet', colores: ['Blanco', 'Amarillo', 'Azul rey'] },
          { nombre: 'Casco tipo II', imagen: 'casco-tipo-2', colores: ['Blanco', 'Amarillo', 'Azul rey'] },
        ],
        principales: ['Cascos tipo I certificados', 'Cascos tipo I con ratchet', 'Cascos tipo II', 'Cascos para alturas y rescate', 'Barbuquejos de 3 y 4 puntos', 'Alerones en jean'],
      },
      {
        titulo: 'Protección visual y facial',
        descripcion: 'Gafas, monogafas y caretas contra impacto, salpicaduras y partículas.',
        productos: [
          { nombre: 'Gafas tricolor, B105 y Spy', imagen: 'gafas' },
          { nombre: 'Monogafas', imagen: 'monogafas' },
          { nombre: 'Careta para esmerilar', imagen: 'careta' },
        ],
        principales: ['Gafas tricolor, B105 y Spy', 'Lentes claros u oscuros', 'Monogafas', 'Gafas de laboratorio', 'Caretas para esmerilar', 'Caretas guadañadoras', 'Visores y acetatos de repuesto', 'Caretas para soldador'],
      },
      {
        titulo: 'Protección auditiva',
        descripcion: 'Control del ruido en planta, obra y operación de maquinaria.',
        productos: [
          { nombre: 'Protector auditivo tipo copa', imagen: 'protector-copa' },
          { nombre: 'Tapaoídos de inserción', imagen: 'tapaoidos-insercion' },
          { nombre: 'Tapaoídos de espuma', imagen: 'tapaoidos-espuma' },
        ],
        principales: ['Protectores auditivos tipo copa', 'Protectores auditivos para casco', 'Tapaoídos de inserción con estuche', 'Tapaoídos de espuma'],
      },
      {
        titulo: 'Protección respiratoria',
        descripcion: 'Respiradores y tapabocas para polvos, gases y vapores.',
        productos: [
          { nombre: 'Respirador de doble filtro', imagen: 'respirador-doble' },
          { nombre: 'Respirador de un filtro', imagen: 'respirador-uno' },
          { nombre: 'Tapabocas N95', imagen: 'tapabocas-n95' },
        ],
        principales: ['Respiradores de doble filtro', 'Respiradores de un filtro', 'Máscaras de media cara y completas', 'Filtros y cartuchos', 'Prefiltros y retenedores', 'Tapabocas N95', 'Tapabocas desechables', 'Tapabocas industriales'],
      },
      {
        titulo: 'Protección para manos',
        descripcion: 'Guantes para manipulación, corte, calor y trabajo pesado.',
        productos: [
          { nombre: 'Guantes en vaqueta', imagen: 'guantes-vaqueta' },
          { nombre: 'Guantes anticorte', imagen: 'guantes-anticorte' },
          { nombre: 'Guantes en carnaza', imagen: 'guantes-carnaza' },
        ],
        principales: ['Guantes en vaqueta', 'Guantes anticorte', 'Guantes en carnaza', 'Guantes de nitrilo', 'Guantes de impacto', 'Guantes para soldador', 'Guantes de hilaza con puntos', 'Mangas en carnaza y vaqueta'],
      },
      {
        titulo: 'Protección corporal',
        descripcion: 'Prendas de protección para procesos, químicos y ambientes húmedos.',
        productos: [
          { nombre: 'Traje desechable tipo Tyvek', imagen: 'traje-tyvek' },
          { nombre: 'Delantal en vaqueta', imagen: 'delantal' },
          { nombre: 'Conjunto impermeable', imagen: 'impermeable' },
        ],
        principales: ['Trajes desechables tipo Tyvek', 'Delantales en vaqueta, carnaza y PVC', 'Conjuntos impermeables', 'Capas y gabardinas', 'Overoles', 'Fajas lumbares', 'Rodilleras y canilleras', 'Zapatones en PVC'],
      },
    ],
  },
  {
    numero: '03',
    slug: 'calzado-de-seguridad',
    nombre: 'Calzado de seguridad',
    corto: 'Calzado',
    resumen: 'Botas, botines y tenis de seguridad, botas PVC y calzado de dotación.',
    intro: 'Calzado para obra, industria, ambientes húmedos y uso diario en la operación.',
    portada: ['bota-cuero', 'bota-pvc'],
    catalogo: ['epp'],
    mensaje: 'Hola, quiero cotizar calzado de seguridad.',
    sublineas: [
      {
        titulo: 'Calzado de seguridad y laboral',
        descripcion: 'Referencias en cuero y PVC, con y sin puntera, para cada tipo de operación.',
        productos: [
          { nombre: 'Bota de seguridad en cuero', imagen: 'bota-cuero', colores: ['Negro', 'Café'] },
          { nombre: 'Tenis de seguridad', imagen: 'tenis-seguridad' },
          { nombre: 'Bota PVC con puntera', imagen: 'bota-pvc', colores: ['Negro', 'Blanco', 'Amarillo'] },
        ],
        principales: ['Botas de seguridad en cuero', 'Botines de seguridad', 'Tenis de seguridad', 'Botas para soldador', 'Botas PVC con y sin puntera', 'Punteras de seguridad', 'Polainas en carnaza', 'Calzado laboral de dotación'],
      },
    ],
  },
  {
    numero: '04',
    slug: 'trabajo-en-alturas',
    nombre: 'Trabajo en alturas',
    corto: 'Alturas',
    resumen: 'Arneses, eslingas, conectores y equipos de rescate.',
    intro: 'Equipos para detención de caídas, posicionamiento y rescate.',
    portada: ['arnes', 'mosqueton'],
    catalogo: ['epp'],
    mensaje: 'Hola, quiero cotizar equipos para trabajo en alturas.',
    sublineas: [
      {
        titulo: 'Equipos para trabajo en alturas',
        descripcion: 'Detención de caídas, posicionamiento y rescate.',
        productos: [
          { nombre: 'Arnés de cuerpo completo', imagen: 'arnes' },
          { nombre: 'Eslinga en Y con absorbedor', imagen: 'eslinga' },
          { nombre: 'Mosquetón en aluminio', imagen: 'mosqueton' },
        ],
        principales: ['Arneses de cuerpo completo', 'Eslingas en Y con absorbedor', 'Eslingas de posicionamiento', 'Mosquetones en aluminio y acero', 'Anclajes portátiles', 'Líneas de vida', 'Poleas y frenos arrestadores', 'Sillas de suspensión'],
      },
    ],
  },
  {
    numero: '05',
    slug: 'senalizacion-y-demarcacion',
    nombre: 'Señalización y demarcación',
    corto: 'Señalización',
    resumen: 'Conos, chalecos, paletas, avisos en PVC y señalización a la medida.',
    intro: 'Avisos, demarcación de áreas y control de tránsito en tus instalaciones.',
    portada: ['cono', 'paleta-pare-siga'],
    catalogo: ['senalizacion'],
    mensaje: 'Hola, quiero cotizar señalización y demarcación.',
    sublineas: [
      {
        titulo: 'Señalización y demarcación',
        descripcion: 'Avisos, demarcación de áreas y control de tránsito en tus instalaciones.',
        productos: [
          { nombre: 'Cono vial reflectivo', imagen: 'cono' },
          { nombre: 'Chaleco reflectivo', imagen: 'chaleco-reflectivo' },
          { nombre: 'Paleta pare y siga', imagen: 'paleta-pare-siga' },
        ],
        principales: ['Avisos en PVC por tipo de señal', 'Conos viales reflectivos', 'Chalecos reflectivos', 'Paletas pare y siga', 'Cintas de demarcación y peligro', 'Cintas antideslizantes', 'Señales de piso mojado', 'Señalización personalizada'],
      },
    ],
  },
  {
    numero: '06',
    slug: 'incendios-y-emergencias',
    nombre: 'Incendios y emergencias',
    corto: 'Emergencias',
    resumen: 'Extintores, detección, botiquines, camillas y dotación para brigadas.',
    intro: 'Protección contra incendios y dotación para brigadas y atención de emergencias.',
    portada: ['extintor-multiproposito', 'botiquin'],
    catalogo: ['extintores'],
    mensaje: 'Hola, quiero cotizar extintores y elementos para emergencias.',
    sublineas: [
      {
        titulo: 'Protección contra incendios',
        descripcion: 'Extintores y detección para oficinas, bodegas, vehículos y plantas.',
        productos: [
          { nombre: 'Extintor multipropósito', imagen: 'extintor-multiproposito' },
          { nombre: 'Extintor de CO₂', imagen: 'extintor-co2' },
          { nombre: 'Detector de humo', imagen: 'detector-humo' },
        ],
        principales: ['Extintores multipropósito', 'Extintores de CO₂', 'Capacidades de 5 a 30 lb', 'Detectores de humo', 'Bases para extintor', 'Soportes de pared', 'Señales de ubicación de extintor'],
      },
      {
        titulo: 'Emergencias y primeros auxilios',
        descripcion: 'Dotación para brigadas y atención de emergencias.',
        productos: [
          { nombre: 'Botiquín', imagen: 'botiquin' },
          { nombre: 'Camilla de inmovilización', imagen: 'camilla' },
          { nombre: 'Lámpara de emergencia', imagen: 'lampara-emergencia' },
        ],
        principales: ['Botiquines tipo A y B', 'Maletas y bolsos para botiquín', 'Camillas de inmovilización', 'Inmovilizadores de cuello', 'Lámparas de emergencia', 'Kits de control de derrames', 'Kits de carretera', 'Brazaletes de brigadista'],
      },
    ],
  },
  {
    numero: '07',
    slug: 'canecas-y-contenedores',
    nombre: 'Canecas y contenedores',
    corto: 'Canecas',
    resumen: 'Puntos ecológicos, canecas, tambores y canastillas.',
    intro: 'Puntos ecológicos, canecas, tambores y canastillas para separar residuos y organizar tus espacios.',
    portada: ['punto-ecologico-3', 'tambor'],
    catalogo: [],
    mensaje: 'Hola, quiero cotizar canecas y puntos ecológicos.',
    sublineas: [
      {
        titulo: 'Puntos ecológicos',
        descripcion: 'Separación de residuos en la fuente para oficinas, plantas y zonas comunes.',
        productos: [
          { nombre: 'Punto ecológico de 2 canecas', imagen: 'punto-ecologico-2' },
          { nombre: 'Punto ecológico de 3 canecas', imagen: 'punto-ecologico-3' },
          { nombre: 'Punto ecológico de 4 canecas', imagen: 'punto-ecologico-4' },
        ],
      },
      {
        titulo: 'Canecas, tambores y canastillas',
        descripcion: 'Recipientes para residuos, almacenamiento y transporte de materiales.',
        productos: [
          { nombre: 'Caneca de pedal', imagen: 'caneca-pedal' },
          { nombre: 'Tambor plástico con tapa', imagen: 'tambor' },
          { nombre: 'Canastillas plásticas', imagen: 'canastillas' },
        ],
        principales: ['Puntos ecológicos de 2, 3 y 4 canecas', 'Canecas de pedal', 'Canecas con tapa vaivén', 'Canecas sin tapa y papeleras', 'Tambores plásticos con tapa', 'Baldes plásticos', 'Canastillas caladas y cerradas', 'Cajas y contenedores organizadores'],
        nota: 'Consúltanos tamaños, colores y capacidades.',
      },
    ],
  },
  {
    numero: '08',
    slug: 'ergonomia-y-tecnologia',
    nombre: 'Ergonomía y tecnología',
    corto: 'Ergonomía',
    resumen: 'Sillas, accesorios ergonómicos, equipos de cómputo y periféricos.',
    intro: 'Todo lo que necesita el puesto de trabajo: comodidad, equipos y accesorios.',
    portada: ['silla-ergonomica', 'portatil'],
    catalogo: ['tecnologia'],
    mensaje: 'Hola, quiero cotizar productos de ergonomía y tecnología.',
    sublineas: [
      {
        titulo: 'Ergonomía para la oficina',
        descripcion: 'Elementos que mejoran la postura y la comodidad en el puesto de trabajo.',
        productos: [
          { nombre: 'Sillas ergonómicas', imagen: 'silla-ergonomica' },
          { nombre: 'Bases para portátil y pantalla', imagen: 'base-portatil' },
          { nombre: 'Reposapiés ergonómico', imagen: 'reposapies' },
        ],
        principales: ['Sillas ergonómicas', 'Bases para portátil', 'Bases y brazos para pantalla', 'Reposapiés', 'Pads ergonómicos para mouse'],
      },
      {
        titulo: 'Tecnología y periféricos',
        descripcion: 'Equipos y accesorios para el trabajo diario en oficina y operación.',
        productos: [
          { nombre: 'Equipos de cómputo portátiles', imagen: 'portatil' },
          { nombre: 'Impresoras y tintas', imagen: 'impresora' },
          { nombre: 'Teclados, mouse y cámaras web', imagen: 'perifericos' },
        ],
        principales: ['Equipos de cómputo portátiles', 'Teclados y mouse', 'Cámaras web', 'Parlantes y micrófonos', 'Impresoras', 'Consumibles de impresora', 'Módems y routers', 'Cables y adaptadores'],
      },
    ],
  },
  {
    numero: '09',
    slug: 'estanterias-y-almacenamiento',
    nombre: 'Estanterías y almacenamiento',
    corto: 'Estanterías',
    resumen: 'Estanterías metálicas para oficina, archivo y bodega, también a la medida.',
    intro: 'Soluciones para ordenar oficinas, archivos y bodegas.',
    portada: ['estanteria-oficina', 'estanteria-bodega'],
    catalogo: [],
    mensaje: 'Hola, quiero cotizar estanterías. Les comparto medidas, niveles, carga y material.',
    sublineas: [
      {
        titulo: 'Estanterías',
        descripcion: 'Metálicas y por niveles, en diferentes tamaños y capacidades de carga.',
        productos: [
          { nombre: 'Estantería para oficina y archivo', imagen: 'estanteria-oficina' },
          { nombre: 'Estantería para bodega', imagen: 'estanteria-bodega' },
          { nombre: 'Estantería a la medida', imagen: 'estanteria-medida' },
        ],
        principales: ['Estanterías metálicas por niveles', 'Estanterías para archivo', 'Estanterías para bodega', 'Estanterías a la medida', 'Entrepaños y niveles adicionales'],
        nota: 'Cuéntanos las medidas, el número de niveles, la carga y el material, y te cotizamos una estantería hecha para tu espacio.',
      },
    ],
  },
  {
    numero: '10',
    slug: 'identificacion-y-promocionales',
    nombre: 'Identificación y promocionales',
    corto: 'Identificación',
    resumen: 'Carnés, portacarnés y artículos personalizados con tu marca.',
    intro: 'Carnés, portacarnés y artículos personalizados con la imagen de tu empresa.',
    portada: ['portacarne-yoyo', 'portacarne-cinta'],
    catalogo: ['identificacion'],
    mensaje: 'Hola, quiero cotizar carnés y productos promocionales con mi marca.',
    sublineas: [
      {
        titulo: 'Carnés e identificación',
        descripcion: 'Carnés impresos con tu marca y portacarnés para oficina, planta y obra.',
        productos: [
          { nombre: 'Carnés impresos', imagen: 'carne' },
          { nombre: 'Portacarné de brazo', imagen: 'portacarne-brazo' },
          { nombre: 'Portacarné de cinta', imagen: 'portacarne-cinta' },
          { nombre: 'Portacarné con yoyo', imagen: 'portacarne-yoyo' },
        ],
        principales: ['Carnés impresos a todo color', 'Diseño con tu marca y datos', 'Portacarnés de brazo', 'Cintas para colgar al cuello', 'Portacarnés con yoyo retráctil', 'Fundas y estuches portacarné'],
        nota: 'Envíanos el logo y los datos de tu personal, y nosotros elaboramos los carnés.',
      },
    ],
  },
  {
    numero: '11',
    slug: 'papeleria-aseo-y-cafeteria',
    nombre: 'Papelería, aseo y cafetería',
    corto: 'Papelería',
    resumen: 'Los insumos del día a día de tu oficina, en un solo proveedor.',
    intro: 'Los insumos del día a día de tu oficina, en un solo proveedor.',
    portada: ['archivadores', 'aseo'],
    catalogo: ['papeleria', 'aseo', 'cafeteria'],
    mensaje: 'Hola, quiero cotizar papelería, aseo y cafetería para mi empresa.',
    sublineas: [
      {
        titulo: 'Papelería y útiles de oficina',
        descripcion: 'Papel, archivo y útiles para el trabajo diario de la oficina.',
        productos: [
          { nombre: 'Resmas de papel', imagen: 'resmas' },
          { nombre: 'Archivadores AZ', imagen: 'archivadores' },
          { nombre: 'Útiles de oficina', imagen: 'utiles', foto: true },
        ],
        principales: ['Resmas de papel carta y oficio', 'Carpetas, AZ y archivadores', 'Cajas de archivo', 'Bolígrafos, lápices y marcadores', 'Cosedoras, perforadoras y ganchos', 'Notas adhesivas y libretas', 'Sobres y papel especial', 'Cintas, pegantes y tijeras'],
      },
      {
        titulo: 'Aseo y cafetería',
        descripcion: 'Insumos para mantener limpios tus espacios y atender a tu equipo y visitantes.',
        productos: [
          { nombre: 'Productos de aseo', imagen: 'aseo' },
          { nombre: 'Escobas, traperos y baldes', imagen: 'escobas' },
          { nombre: 'Cafetería', imagen: 'cafeteria' },
        ],
        principales: ['Limpiadores y desinfectantes', 'Jabones y gel antibacterial', 'Papel higiénico y toallas', 'Bolsas para basura', 'Escobas, traperos y baldes', 'Paños, esponjas y guantes', 'Café, azúcar y aromáticas', 'Vasos, mezcladores y servilletas'],
      },
    ],
  },
  {
    numero: '12',
    slug: 'fechas-especiales-y-diseno',
    nombre: 'Fechas especiales y diseño',
    corto: 'Fechas especiales',
    resumen: 'Anchetas, mercados, regalos corporativos y servicio de diseño gráfico.',
    intro: 'Celebra con tu equipo y tus clientes, y comunica tu marca con piezas propias.',
    portada: ['anchetas', 'juguetes'],
    catalogo: [],
    mensaje: 'Hola, quiero cotizar anchetas y detalles para fechas especiales.',
    sublineas: [
      {
        titulo: 'Anchetas y fechas especiales',
        descripcion: 'Regalos y detalles para celebrar con tu equipo, tus clientes y sus familias.',
        productos: [
          { nombre: 'Anchetas', imagen: 'anchetas' },
          { nombre: 'Mercados empresariales', imagen: 'mercados', foto: true },
          { nombre: 'Juguetes y regalos', imagen: 'juguetes' },
        ],
        principales: ['Anchetas navideñas y corporativas', 'Mercados para colaboradores', 'Juguetes para hijos de colaboradores', 'Regalos y detalles corporativos', 'Decoración para fiestas y eventos', 'Kits para cumpleaños', 'Día de la Madre y del Padre', 'Halloween y Amor y Amistad', 'Temporada navideña'],
      },
    ],
  },
]

/** Artículos promocionales más pedidos (línea 10) */
export const PROMOCIONALES = ['Mugs, termos y botellas', 'Libretas, agendas y carpetas', 'Bolígrafos y resaltadores', 'Gorras, morrales y bolsos', 'Sombrillas y abanicos', 'Llaveros, memorias USB y más']

/** Piezas del servicio de diseño gráfico (línea 12) */
export const DISENO = ['Logos e imagen corporativa', 'Carnés y papelería corporativa', 'Avisos y señalización a la medida', 'Piezas para redes sociales', 'Etiquetas y empaques', 'Catálogos, volantes y pendones']

/** Avisos en PVC por tipo de señal (línea 05) */
export const SENALES = [
  { tipo: 'Prohibición', color: '#d83a26', imagenes: ['senal-1', 'senal-2'] },
  { tipo: 'Advertencia', color: '#f2b705', imagenes: ['senal-3', 'senal-4'] },
  { tipo: 'Obligación', color: '#1f4fa3', imagenes: ['senal-5', 'senal-6'] },
  { tipo: 'Información', color: '#1d9a4b', imagenes: ['senal-7', 'senal-8'] },
]

export const imagenProducto = (nombre: string) => `/sitio/p/${nombre}.webp`
export const imagenFoto = (nombre: string) => `/sitio/fotos/${nombre}.webp`

export function lineaPorSlug(slug: string): Linea | undefined {
  return LINEAS.find((l) => l.slug === slug)
}

/** Total de referencias ilustradas en el portafolio */
export const TOTAL_REFERENCIAS = LINEAS.reduce(
  (n, l) => n + l.sublineas.reduce((m, s) => m + s.productos.length, 0),
  0
)
