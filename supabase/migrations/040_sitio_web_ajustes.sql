-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Ajustes sitio web
-- Migracion 040
-- ============================================================
-- 1. Quitar la categoría Ferretería del sitio web
-- 2. Actualizar los textos del brief del dueño (slogan, hero, etc.)
-- ============================================================


-- ------------------------------------------------------------
-- 1. QUITAR FERRETERIA DEL SITIO WEB
-- ------------------------------------------------------------
-- No se borra la categoría (puede tener productos asociados). Solo se
-- oculta de la web pública.
update public.categorias_producto
set visible_web = false
where nombre ilike '%ferreteria%' or nombre ilike '%ferreter%';


-- ------------------------------------------------------------
-- 2. ACTUALIZAR TEXTOS CLAVE DEL SITIO
-- ------------------------------------------------------------
-- El brief del dueño redefine el concepto de marca y los textos del hero.
-- Solo se actualizan los que cambian; el resto se mantiene.

-- MARCA: el concepto cambia de "Dotación y EPP" a "aliado integral"
update public.sitio_contenido set valor = 'Abastecer Empresarial S.A.S.'
where clave = 'marca_nombre';

update public.sitio_contenido set valor = 'Todo lo que tu empresa necesita. Un solo aliado.'
where clave = 'marca_tagline';

update public.sitio_contenido set valor = 'Tu aliado integral de abastecimiento empresarial'
where clave = 'marca_slogan';

update public.sitio_contenido set valor = 'Soluciones integrales de abastecimiento empresarial en Cali: dotación, EPP, tecnología, aseo, cafetería, papelería y más. Un solo proveedor, una sola factura. Cotiza por WhatsApp.'
where clave = 'marca_descripcion_seo';

-- HERO: alineado al brief
update public.sitio_contenido set valor = 'Abastecimiento empresarial integral'
where clave = 'hero_kicker';

update public.sitio_contenido set valor = 'Todo lo que tu empresa necesita, un solo aliado'
where clave = 'hero_titulo';

update public.sitio_contenido set valor = 'Ayudamos a las empresas a simplificar sus procesos de compra. Dotación, EPP, tecnología, aseo, cafetería, papelería y mucho más: una sola llamada, un solo proveedor, una sola factura. Cotiza por WhatsApp y recibe respuesta en menos de 24 horas.'
where clave = 'hero_subtitulo';

update public.sitio_contenido set valor = 'Explorar catálogo'
where clave = 'hero_boton_primario';

update public.sitio_contenido set valor = 'Cotizar por WhatsApp'
where clave = 'hero_boton_secundario';

update public.sitio_contenido set valor = 'Productos certificados
Cotización en 24 horas
Factura electrónica
Atención personalizada'
where clave = 'hero_badges';

-- CIFRAS: sin inventar datos
update public.sitio_contenido set valor = '24 h|Respuesta a tu cotización
10+|Líneas de abastecimiento
1|Solo proveedor para todo
100%|Factura electrónica'
where clave = 'cifras';

-- BENEFICIOS: alineados al brief
update public.sitio_contenido set valor = '¿Por qué las empresas eligen a Abastecer?'
where clave = 'beneficios_titulo';

update public.sitio_contenido set valor = 'Comprar dotación y suministros no debería ser un problema para tu equipo de compras. Nosotros centralizamos todo el proceso: cotizamos, conseguimos, entregamos y facturamos.'
where clave = 'beneficios_subtitulo';

update public.sitio_contenido set valor = 'caja|Un solo proveedor|Dejas de perseguir cinco proveedores distintos. Consolidamos tu abastecimiento en un solo pedido, una sola entrega y una sola factura.
reloj|Cotización en 24 horas|Respondemos rápido y con precios claros. Sabemos que tu área de compras necesita cerrar, no esperar.
medalla|Productos certificados|Trabajamos con marcas y referencias que cumplen la norma. Lo que protege a tu gente no se negocia.
camion|Entregas cumplidas|Programamos la entrega y llegamos cuando dijimos que íbamos a llegar. En Cali y con despachos a todo el país.
factura|Factura electrónica|Somos empresa formal con NIT, RUT y facturación electrónica DIAN. Tu contabilidad, tranquila.
usuarios|Atención personalizada|Hablas con una persona que conoce tu empresa, no con un formulario. Asesoría real en lo que necesites.'
where clave = 'beneficios';

-- NOSOTROS: alineado al brief
update public.sitio_contenido set valor = 'Somos el aliado que le simplifica el abastecimiento a tu empresa'
where clave = 'nosotros_titulo';

update public.sitio_contenido set valor = 'Abastecer Empresarial S.A.S. es una empresa colombiana con domicilio en Cali, Valle del Cauca, dedicada al suministro integral de productos y soluciones para empresas de todos los tamaños.

Nacimos de una idea simple: las áreas de compras pierden demasiado tiempo cotizando con múltiples proveedores, persiguiendo entregas y cuadrando facturas. Nosotros centralizamos todo eso.

No vendemos por catálogo cerrado: trabajamos bajo pedido, buscamos la referencia exacta que tu empresa necesita, la conseguimos al mejor costo y la entregamos con respaldo y factura electrónica.

Nuestro objetivo a largo plazo: transformar la manera en que las empresas gestionan sus compras.'
where clave = 'nosotros_texto';

-- PROCESO: 4 pasos claros
update public.sitio_contenido set valor = 'Cómo trabajamos'
where clave = 'proceso_titulo';

update public.sitio_contenido set valor = 'Cuatro pasos, sin complicaciones. Así de simple es comprar con Abastecer.'
where clave = 'proceso_subtitulo';

update public.sitio_contenido set valor = 'Cuéntanos qué necesitas|Escríbenos por WhatsApp o envíanos tu lista de requerimientos. No necesitas tener las referencias exactas: te ayudamos a definirlas.
Recibes la cotización|En menos de 24 horas hábiles te enviamos la cotización formal, con precios, IVA, tiempos de entrega y condiciones.
Apruebas y programamos|Confirmas la orden y acordamos la fecha de entrega. Te mantenemos informado del estado de tu pedido.
Entregamos y facturamos|Entregamos con remisión, factura electrónica y garantía. Y quedamos atentos a lo que sigue.'
where clave = 'proceso_pasos';

-- SECTORES: los del brief
update public.sitio_contenido set valor = 'Empresas que confían en nosotros'
where clave = 'sectores_titulo';

update public.sitio_contenido set valor = 'Si tu empresa tiene personal, tiene necesidades de abastecimiento. Estos son algunos de los sectores donde trabajamos todos los días.'
where clave = 'sectores_subtitulo';

update public.sitio_contenido set valor = 'edificio|Empresas y oficinas
fabrica|Industria y manufactura
casco|Construcción y obra civil
tienda|Comercio y servicios
hospital|Clínicas e IPS
usuarios|Instituciones educativas
camion|Logística y transporte
tractor|Agroindustria'
where clave = 'sectores';

-- CTA FINAL
update public.sitio_contenido set valor = '¿Listo para simplificar las compras de tu empresa?'
where clave = 'cta_titulo';

update public.sitio_contenido set valor = 'Envíanos tu lista de requerimientos por WhatsApp y recibe una cotización formal en menos de 24 horas hábiles. Sin registros, sin formularios, sin vueltas.'
where clave = 'cta_texto';

update public.sitio_contenido set valor = 'Cotizar por WhatsApp'
where clave = 'cta_boton';

-- WHATSAPP: confirmar el numero correcto
update public.sitio_contenido set valor = '573508624021'
where clave = 'contacto_whatsapp';

update public.sitio_contenido set valor = 'Hola, los contacto desde la página web de Abastecer Empresarial. Necesito una cotización para mi empresa.'
where clave = 'contacto_whatsapp_mensaje';


-- ============================================================
-- VERIFICACION
-- ============================================================
select clave, valor from public.sitio_contenido
where grupo in ('marca', 'hero', 'cta')
order by grupo, orden;

select nombre, visible_web from public.categorias_producto
order by nombre;
