-- ============================================================
-- ABASTECER EMPRESARIAL SAS - Sitio Web Publico
-- Migracion 023
-- ============================================================
-- Habilita abastecerempresarial.com:
--   1. Columnas "web" en productos y categorias (imagen, slug, visible)
--   2. sitio_contenido: TODOS los textos de la web, editables desde el ERP
--   3. sitio_solicitudes: mensajes y solicitudes de cotizacion que llegan
--   4. Vistas catalogo_web y lineas_web: lo UNICO que ve internet
--      (nunca se exponen costos, margenes ni stock)
--
-- NOTA: los TEXTOS que ve el cliente van con tildes (es una web publica).
-- Los nombres de columnas y comentarios de codigo siguen sin tildes.
-- ============================================================
-- IMPORTANTE: bucket de Storage para las imagenes.
--   La seccion 8 lo crea por SQL. Si tu rol no tiene permisos,
--   crealo a mano: Storage > New bucket > nombre "sitio" > Public: SI
-- ============================================================


-- ------------------------------------------------------------
-- 1. Funcion auxiliar: convertir texto a slug (URL amigable)
--    "Casco de Seguridad Dielectrico" -> "casco-de-seguridad-dielectrico"
-- ------------------------------------------------------------
create or replace function public.slugificar(texto text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(texto, ''),
      'ÁÀÂÄÃÅáàâäãåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÖÕóòôöõÚÙÛÜúùûüÑñÇç',
      'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCc')),
    '[^a-z0-9]+', '-', 'g'), '-')
$$;

comment on function public.slugificar(text) is 'Convierte un texto a slug para URLs del sitio web publico.';


-- ------------------------------------------------------------
-- 2. Columnas web en productos
-- ------------------------------------------------------------
alter table public.productos
  add column if not exists slug            text,
  add column if not exists nombre_web      text,
  add column if not exists descripcion_web text,
  add column if not exists marca           text,
  add column if not exists imagen_url      text,
  add column if not exists imagenes        text[] not null default '{}',
  add column if not exists ficha           text,
  add column if not exists visible_web     boolean not null default true,
  add column if not exists destacado_web   boolean not null default false,
  add column if not exists orden_web       integer not null default 0;

comment on column public.productos.slug is 'URL del producto en la web: /catalogo/<slug>. Se genera automatico desde el nombre.';
comment on column public.productos.nombre_web is 'Nombre comercial para la web (con tildes y mayuscula normal). Si esta vacio se usa "nombre".';
comment on column public.productos.descripcion_web is 'Descripcion comercial para la web. Si esta vacia se usa "descripcion".';
comment on column public.productos.ficha is 'Especificaciones tecnicas, una por linea con formato "Atributo|Valor".';
comment on column public.productos.visible_web is 'Si es true (y activo), el producto aparece en el catalogo publico.';
comment on column public.productos.destacado_web is 'Aparece en la seccion de destacados de la pagina de inicio.';

create index if not exists idx_productos_visible_web on public.productos(visible_web);
create index if not exists idx_productos_destacado_web on public.productos(destacado_web);
create unique index if not exists idx_productos_slug on public.productos(slug);

create or replace function public.generar_slug_producto()
returns trigger
language plpgsql
as $$
declare
  base      text;
  candidato text;
  n         integer := 1;
begin
  if new.slug is null or trim(new.slug) = '' then
    base := public.slugificar(coalesce(nullif(new.nombre_web, ''), new.nombre));
    if base = '' then
      base := 'producto';
    end if;
    candidato := base;
    while exists (
      select 1 from public.productos p
      where p.slug = candidato and p.id is distinct from new.id
    ) loop
      n := n + 1;
      candidato := base || '-' || n;
    end loop;
    new.slug := candidato;
  else
    new.slug := public.slugificar(new.slug);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_slug_producto on public.productos;
create trigger trg_slug_producto
  before insert or update of nombre, nombre_web, slug on public.productos
  for each row execute function public.generar_slug_producto();

-- Rellenar slugs de los productos que ya existen (uno por uno para evitar choques)
do $$
declare
  r record;
begin
  for r in select id from public.productos where slug is null or slug = '' loop
    update public.productos set slug = null where id = r.id; -- dispara el trigger
  end loop;
end;
$$;


-- ------------------------------------------------------------
-- 3. Columnas web en categorias_producto (las "lineas" del sitio)
-- ------------------------------------------------------------
alter table public.categorias_producto
  add column if not exists slug            text,
  add column if not exists nombre_web      text,
  add column if not exists descripcion_web text,
  add column if not exists icono           text default 'caja',
  add column if not exists imagen_url      text,
  add column if not exists visible_web     boolean not null default true;

comment on column public.categorias_producto.icono is 'Icono del sitio web: casco, camiseta, escoba, cafe, papel, tarjeta, extintor, senal, llave, portatil, rayo, caja.';
comment on column public.categorias_producto.slug is 'URL de la linea: /catalogo?linea=<slug>';
comment on column public.categorias_producto.nombre_web is 'Nombre de la linea en la web (con tildes). Si esta vacio se usa "nombre".';

create or replace function public.generar_slug_categoria()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or trim(new.slug) = '' then
    new.slug := public.slugificar(new.nombre);
  else
    new.slug := public.slugificar(new.slug);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_slug_categoria on public.categorias_producto;
create trigger trg_slug_categoria
  before insert or update of nombre, slug on public.categorias_producto
  for each row execute function public.generar_slug_categoria();

update public.categorias_producto set slug = public.slugificar(nombre)
  where slug is null or slug = '';
create unique index if not exists idx_categorias_slug on public.categorias_producto(slug);

-- Nombre con tildes, icono y descripcion comercial de las lineas iniciales
update public.categorias_producto set
  nombre_web = coalesce(nullif(nombre_web, ''), case nombre
    when 'EPP'                then 'EPP - Protección personal'
    when 'Dotacion'           then 'Dotación y uniformes'
    when 'Aseo'               then 'Aseo y limpieza'
    when 'Cafeteria'          then 'Cafetería institucional'
    when 'Papeleria'          then 'Papelería y oficina'
    when 'Identificacion'     then 'Identificación corporativa'
    when 'Extintores'         then 'Extintores y emergencias'
    when 'Senalizacion'       then 'Señalización'
    when 'Ferreteria'         then 'Ferretería y herramienta'
    when 'Tecnologia'         then 'Tecnología'
    when 'Material electrico' then 'Material eléctrico'
    when 'Otro'               then 'Otros suministros'
    else nombre
  end),
  descripcion_web = coalesce(nullif(descripcion_web, ''), case nombre
    when 'EPP'                then 'Elementos de protección personal certificados: cascos, gafas, guantes, calzado de seguridad, protección respiratoria y auditiva, arnés y trabajo en alturas.'
    when 'Dotacion'           then 'Dotación de ley y uniformes empresariales: camisas, pantalones, overoles, chalecos y calzado, con bordado o logo de tu empresa.'
    when 'Aseo'               then 'Aseo y limpieza institucional: desinfectantes, papel higiénico, toallas, jabones, dispensadores e implementos.'
    when 'Cafeteria'          then 'Todo para la cafetería de tu empresa: café, azúcar, vasos, servilletas, endulzantes y desechables.'
    when 'Papeleria'          then 'Papelería y suministros de oficina: resmas, carpetas, bolígrafos, archivadores y útiles para el día a día.'
    when 'Identificacion'     then 'Identificación corporativa: carnés, lanyards, portacarnés, sellos y elementos de control de acceso.'
    when 'Extintores'         then 'Extintores, recarga y mantenimiento: multipropósito, solkaflam, CO2, gabinetes y señalización asociada.'
    when 'Senalizacion'       then 'Señalización industrial y de seguridad: avisos preventivos, reglamentarios e informativos, cintas y conos.'
    when 'Ferreteria'         then 'Ferretería y herramienta: manual, eléctrica, tornillería, abrasivos y accesorios para mantenimiento.'
    when 'Tecnologia'         then 'Tecnología y equipos de oficina: computadores, periféricos, impresión, consumibles y accesorios.'
    when 'Material electrico' then 'Material eléctrico: iluminación LED, cableado, tomas, tableros, canaletas y accesorios de instalación.'
    when 'Otro'               then 'Productos y suministros empresariales bajo pedido. Cuéntanos qué necesitas y lo conseguimos.'
    else 'Productos y suministros empresariales bajo pedido.'
  end),
  icono = case nombre
    when 'EPP'                then 'casco'
    when 'Dotacion'           then 'camiseta'
    when 'Aseo'               then 'escoba'
    when 'Cafeteria'          then 'cafe'
    when 'Papeleria'          then 'papel'
    when 'Identificacion'     then 'tarjeta'
    when 'Extintores'         then 'extintor'
    when 'Senalizacion'       then 'senal'
    when 'Ferreteria'         then 'llave'
    when 'Tecnologia'         then 'portatil'
    when 'Material electrico' then 'rayo'
    else coalesce(nullif(icono, ''), 'caja')
  end;


-- ------------------------------------------------------------
-- 4. sitio_contenido: los textos de la web, editables sin programar
-- ------------------------------------------------------------
create table if not exists public.sitio_contenido (
  clave      text primary key,
  valor      text,
  grupo      text not null default 'general',
  etiqueta   text not null,
  ayuda      text,
  tipo       text not null default 'texto'
             check (tipo in ('texto', 'texto_largo', 'lista', 'url', 'imagen', 'telefono', 'email')),
  orden      integer not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.sitio_contenido is 'Contenido editable del sitio web publico. Se administra en el ERP: /sitio-web/contenido';

drop trigger if exists trg_sitio_contenido_updated_at on public.sitio_contenido;
create trigger trg_sitio_contenido_updated_at
  before update on public.sitio_contenido
  for each row execute function public.set_updated_at();

-- Contenido inicial (no sobreescribe lo que ya se haya editado)
insert into public.sitio_contenido (clave, grupo, etiqueta, ayuda, tipo, orden, valor) values

-- MARCA -------------------------------------------------------
('marca_nombre', 'marca', 'Nombre comercial', 'Cómo se llama la empresa en la web.', 'texto', 1,
 'Abastecer Empresarial S.A.S.'),
('marca_tagline', 'marca', 'Tagline del logo', 'Frase corta que acompaña al logo.', 'texto', 2,
 'Dotación y EPP para un entorno seguro'),
('marca_slogan', 'marca', 'Eslogan', 'Frase de marca.', 'texto', 3,
 'Tu aliado en abastecimiento empresarial'),
('marca_descripcion_seo', 'marca', 'Descripción para Google (SEO)', 'Máximo 160 caracteres. Es lo que se lee en los resultados de búsqueda de Google.', 'texto_largo', 4,
 'Dotación, EPP y suministros empresariales en Cali. Un solo proveedor para todo lo que tu empresa necesita: cotizamos en 24 horas y entregamos con factura electrónica.'),

-- HERO (primera pantalla) -------------------------------------
('hero_kicker', 'hero', 'Texto pequeño superior', 'Va encima del título, en letra pequeña.', 'texto', 1,
 'Dotación y EPP para un entorno seguro'),
('hero_titulo', 'hero', 'Título principal', 'Lo primero que lee el cliente. Corto y directo.', 'texto', 2,
 'Todo lo que tu empresa necesita, en un solo lugar'),
('hero_subtitulo', 'hero', 'Subtítulo', 'Dos o tres líneas explicando qué hacemos.', 'texto_largo', 3,
 'Somos la empresa que abastece a otras empresas. Dotación, elementos de protección personal, aseo, cafetería, papelería y mucho más: una sola llamada, un solo proveedor, una sola factura.'),
('hero_boton_primario', 'hero', 'Botón principal', 'Texto del botón verde.', 'texto', 4,
 'Ver catálogo'),
('hero_boton_secundario', 'hero', 'Botón secundario', 'Texto del segundo botón.', 'texto', 5,
 'Solicitar cotización'),
('hero_badges', 'hero', 'Sellos de confianza', 'Uno por línea. Aparecen debajo de los botones.', 'lista', 6,
 'Productos certificados
Entregas cumplidas
Factura electrónica
Asesoría en SST'),
('hero_imagen_url', 'hero', 'Imagen del hero (opcional)', 'Si la dejas vacía se muestra un diseño con el logo. Puedes subir una foto de tu operación.', 'imagen', 7, ''),

-- CIFRAS ------------------------------------------------------
('cifras', 'cifras', 'Cifras destacadas', 'Una por línea con formato VALOR|ETIQUETA. Ejemplo: 24 h|Respuesta a tu cotización', 'lista', 1,
 '24 h|Respuesta a tu cotización
11|Líneas de abastecimiento
1|Solo proveedor para todo
100%|Factura electrónica'),

-- PROPUESTA DE VALOR -----------------------------------------
('beneficios_titulo', 'beneficios', 'Título de la sección', null, 'texto', 1,
 '¿Por qué las empresas nos eligen?'),
('beneficios_subtitulo', 'beneficios', 'Subtítulo de la sección', null, 'texto_largo', 2,
 'Comprar dotación y suministros no debería costarle tiempo a tu equipo. Nosotros nos encargamos de todo el proceso.'),
('beneficios', 'beneficios', 'Beneficios', 'Uno por línea con formato ICONO|TÍTULO|DESCRIPCIÓN. Iconos: caja, reloj, medalla, camion, factura, usuarios, escudo, manos, estrella, mapa, ojo, check.', 'lista', 3,
 'caja|Un solo proveedor|Dejas de perseguir cinco proveedores distintos. Consolidamos tu abastecimiento en un solo pedido, una sola entrega y una sola factura.
reloj|Cotización en 24 horas|Respondemos rápido y con precios claros. Sabemos que tu área de compras necesita cerrar, no esperar.
medalla|Productos certificados|Trabajamos con marcas y referencias que cumplen la norma. Lo que protege a tu gente no se negocia.
camion|Entregas cumplidas|Programamos la entrega y llegamos cuando dijimos que íbamos a llegar. En Cali y con despachos a todo el país.
factura|Factura electrónica|Somos empresa formal con NIT, RUT y facturación electrónica DIAN. Tu contabilidad, tranquila.
usuarios|Atención personalizada|Hablas con una persona que conoce tu empresa, no con un formulario. Asesoría real en dotación y SST.'),

-- NOSOTROS ----------------------------------------------------
('nosotros_titulo', 'nosotros', 'Título de "Quiénes somos"', null, 'texto', 1,
 'Somos el aliado que le resuelve el abastecimiento a tu empresa'),
('nosotros_texto', 'nosotros', 'Texto de "Quiénes somos"', 'Puedes escribir varios párrafos: sepáralos con una línea en blanco.', 'texto_largo', 2,
 'Abastecer Empresarial S.A.S. es una empresa colombiana con domicilio en Cali, Valle del Cauca, dedicada al suministro de dotación, elementos de protección personal y productos institucionales para empresas de todos los tamaños.

Nacimos de una idea simple: las áreas de compras y de seguridad y salud en el trabajo pierden demasiado tiempo cotizando con múltiples proveedores, persiguiendo entregas y cuadrando facturas. Nosotros centralizamos todo eso.

No vendemos por catálogo cerrado: trabajamos bajo pedido, buscamos la referencia exacta que tu empresa necesita, la conseguimos al mejor costo y la entregamos con respaldo y factura electrónica.'),
('mision', 'nosotros', 'Misión', 'Qué hacemos y para quién.', 'texto_largo', 3,
 'Abastecer a las empresas de todo lo que necesitan para operar seguras y productivas, entregando dotación, elementos de protección personal y suministros institucionales con calidad certificada, cumplimiento en las entregas y asesoría cercana. Simplificamos el abastecimiento empresarial: un solo proveedor, un solo contacto, una sola factura.'),
('vision', 'nosotros', 'Visión', 'Hacia dónde vamos.', 'texto_largo', 4,
 'Para el año 2030 ser reconocidos como el aliado de abastecimiento empresarial de referencia en el suroccidente colombiano, por cumplir siempre lo que prometemos, por la calidad de los productos que entregamos y por hacerle la vida más fácil a las áreas de compras y de seguridad y salud en el trabajo de nuestros clientes.'),
('valores', 'nosotros', 'Valores', 'Uno por línea con formato ICONO|TÍTULO|DESCRIPCIÓN.', 'lista', 5,
 'escudo|Seguridad|Protegemos lo más importante: las personas que hacen funcionar tu empresa.
medalla|Calidad|Productos certificados y de alta calidad. No sacrificamos norma por precio.
manos|Confianza|Transparencia y cumplimiento en cada cotización, cada entrega y cada factura.
caja|Compromiso|Con tu empresa, en cada entrega. Respondemos por lo que vendemos.
estrella|Soluciones|Todo lo que tu empresa necesita, en un solo lugar y con un solo responsable.'),

-- COMO TRABAJAMOS ---------------------------------------------
('proceso_titulo', 'proceso', 'Título de la sección', null, 'texto', 1,
 'Cómo trabajamos'),
('proceso_subtitulo', 'proceso', 'Subtítulo de la sección', null, 'texto_largo', 2,
 'Cuatro pasos, sin vueltas. Así es comprar con Abastecer Empresarial.'),
('proceso_pasos', 'proceso', 'Pasos del proceso', 'Uno por línea con formato TÍTULO|DESCRIPCIÓN.', 'lista', 3,
 'Cuéntanos qué necesitas|Escríbenos por WhatsApp o envíanos tu lista de requerimientos. No necesitas tener las referencias exactas: te ayudamos a definirlas.
Recibes la cotización|En menos de 24 horas hábiles te enviamos la cotización formal, con precios, IVA, tiempos de entrega y condiciones.
Apruebas y programamos|Confirmas la orden y acordamos la fecha de entrega. Te mantenemos informado del estado de tu pedido.
Entregamos y facturamos|Entregamos con remisión, factura electrónica y garantía. Y quedamos atentos a lo que sigue.'),

-- SECTORES ----------------------------------------------------
('sectores_titulo', 'sectores', 'Título de la sección', null, 'texto', 1,
 'Empresas que atendemos'),
('sectores_subtitulo', 'sectores', 'Subtítulo de la sección', null, 'texto_largo', 2,
 'Si tu empresa tiene personal, tiene necesidades de abastecimiento. Estos son los sectores donde más trabajamos.'),
('sectores', 'sectores', 'Sectores', 'Uno por línea con formato ICONO|NOMBRE. Iconos: casco, fabrica, hospital, tienda, camion, edificio, tractor, usuarios.', 'lista', 3,
 'casco|Construcción y obra civil
fabrica|Industria y manufactura
hospital|Salud e instituciones
tienda|Comercio y servicios
camion|Logística y transporte
edificio|Oficinas y corporativo
tractor|Agroindustria
usuarios|Sector público y educación'),

-- CATALOGO ----------------------------------------------------
('catalogo_titulo', 'catalogo', 'Título del catálogo', null, 'texto', 1,
 'Nuestro catálogo'),
('catalogo_subtitulo', 'catalogo', 'Subtítulo del catálogo', null, 'texto_largo', 2,
 'Busca por nombre o navega por línea. Si no encuentras lo que necesitas, escríbenos: trabajamos bajo pedido y conseguimos referencias específicas.'),
('catalogo_nota', 'catalogo', 'Nota sobre precios', 'Se muestra donde iría el precio. Explica por qué no publicamos precios.', 'texto_largo', 3,
 'Los precios se cotizan según cantidad, especificaciones y condiciones de entrega. Arma tu lista y te enviamos la cotización formal en menos de 24 horas hábiles.'),

-- LLAMADO FINAL -----------------------------------------------
('cta_titulo', 'cta', 'Título del llamado final', null, 'texto', 1,
 '¿Listo para dejar de perseguir proveedores?'),
('cta_texto', 'cta', 'Texto del llamado final', null, 'texto_largo', 2,
 'Envíanos tu lista de requerimientos y recibe una cotización formal en menos de 24 horas hábiles. Sin compromiso.'),
('cta_boton', 'cta', 'Texto del botón', null, 'texto', 3,
 'Solicitar cotización'),

-- CONTACTO ----------------------------------------------------
('contacto_whatsapp', 'contacto', 'WhatsApp', 'Solo números, con indicativo del país. Ejemplo: 573508624021', 'telefono', 1,
 '573508624021'),
('contacto_whatsapp_mensaje', 'contacto', 'Mensaje automático de WhatsApp', 'Texto con el que se abre el chat cuando el cliente da clic.', 'texto_largo', 2,
 'Hola, los contacto desde la página web de Abastecer Empresarial. Necesito una cotización.'),
('contacto_telefono', 'contacto', 'Teléfono / celular', 'Como se muestra en la web.', 'telefono', 3,
 '350 862 4021'),
('contacto_email', 'contacto', 'Correo principal', null, 'email', 4,
 'abastecerempresarial@gmail.com'),
('contacto_direccion', 'contacto', 'Dirección', null, 'texto', 5,
 'Carrera 13 #15-36'),
('contacto_ciudad', 'contacto', 'Ciudad', null, 'texto', 6,
 'Cali, Valle del Cauca'),
('contacto_horario', 'contacto', 'Horario de atención', null, 'texto', 7,
 'Lunes a viernes de 8:00 a.m. a 6:00 p.m. · Sábados de 8:00 a.m. a 12:00 m.'),
('contacto_cobertura', 'contacto', 'Cobertura', null, 'texto', 8,
 'Cali y área metropolitana. Despachos a todo Colombia.'),
('contacto_maps_url', 'contacto', 'Enlace de Google Maps', 'Opcional. Pega la URL de la ubicación.', 'url', 9, ''),

-- REDES -------------------------------------------------------
('red_instagram', 'redes', 'Instagram', 'URL completa. Si lo dejas vacío, no se muestra el icono.', 'url', 1, ''),
('red_facebook', 'redes', 'Facebook', 'URL completa. Si lo dejas vacío, no se muestra el icono.', 'url', 2, ''),
('red_linkedin', 'redes', 'LinkedIn', 'URL completa. Si lo dejas vacío, no se muestra el icono.', 'url', 3, ''),
('red_tiktok', 'redes', 'TikTok', 'URL completa. Si lo dejas vacío, no se muestra el icono.', 'url', 4, ''),

-- FOOTER ------------------------------------------------------
('footer_texto', 'footer', 'Texto del pie de página', null, 'texto_largo', 1,
 'Dotación, elementos de protección personal y suministros empresariales. Somos tu aliado en abastecimiento: cotizamos, entregamos y respondemos.'),
('footer_legal', 'footer', 'Línea legal', 'Datos de la empresa que se muestran abajo.', 'texto', 2,
 'Abastecer Empresarial S.A.S. · NIT 902088758-4 · Cali, Valle del Cauca, Colombia')

on conflict (clave) do nothing;


-- ------------------------------------------------------------
-- 5. sitio_solicitudes: lo que envian los clientes desde la web
-- ------------------------------------------------------------
create table if not exists public.sitio_solicitudes (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null default 'CONTACTO'
                 check (tipo in ('CONTACTO', 'COTIZACION')),
  nombre         text not null,
  empresa        text,
  nit            text,
  email          text,
  telefono       text,
  ciudad         text,
  mensaje        text,
  items          jsonb not null default '[]'::jsonb,
  origen         text,
  estado         text not null default 'NUEVO'
                 check (estado in ('NUEVO', 'EN_PROCESO', 'ATENDIDO', 'DESCARTADO')),
  notas_internas text,
  cliente_id     uuid references public.clientes(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.sitio_solicitudes is 'Mensajes y solicitudes de cotizacion recibidos desde el sitio web publico. Bandeja en el ERP: /sitio-web/solicitudes';
comment on column public.sitio_solicitudes.items is 'Productos que el cliente agrego a su lista: [{"nombre":"...","codigo":"...","cantidad":10}]';

create index if not exists idx_sitio_solicitudes_estado on public.sitio_solicitudes(estado);
create index if not exists idx_sitio_solicitudes_fecha on public.sitio_solicitudes(created_at desc);

drop trigger if exists trg_sitio_solicitudes_updated_at on public.sitio_solicitudes;
create trigger trg_sitio_solicitudes_updated_at
  before update on public.sitio_solicitudes
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 6. Vistas publicas: lo UNICO que internet puede leer
--    Nunca exponen costo_promedio, ultimo_costo, margen ni stock.
-- ------------------------------------------------------------
drop view if exists public.catalogo_web;
create view public.catalogo_web as
select
  p.id,
  p.slug,
  p.codigo,
  coalesce(nullif(p.nombre_web, ''), p.nombre)             as nombre,
  coalesce(nullif(p.descripcion_web, ''), p.descripcion)   as descripcion,
  p.marca,
  p.unidad_medida,
  p.imagen_url,
  p.imagenes,
  p.ficha,
  p.destacado_web,
  p.orden_web,
  p.created_at,
  c.id                                                     as categoria_id,
  coalesce(nullif(c.nombre_web, ''), c.nombre)             as categoria_nombre,
  c.slug                                                   as categoria_slug,
  c.icono                                                  as categoria_icono
from public.productos p
left join public.categorias_producto c on c.id = p.categoria_id
where p.activo = true and p.visible_web = true;

comment on view public.catalogo_web is 'Catalogo publico. Solo productos activos y publicados, sin informacion de costos.';

drop view if exists public.lineas_web;
create view public.lineas_web as
select
  c.id,
  coalesce(nullif(c.nombre_web, ''), c.nombre) as nombre,
  c.slug,
  c.descripcion_web,
  coalesce(nullif(c.icono, ''), 'caja')        as icono,
  c.imagen_url,
  c.orden,
  count(p.id)                                  as total_productos
from public.categorias_producto c
left join public.productos p
  on p.categoria_id = c.id and p.activo = true and p.visible_web = true
where c.visible_web = true
group by c.id, c.nombre, c.nombre_web, c.slug, c.descripcion_web, c.icono, c.imagen_url, c.orden;

comment on view public.lineas_web is 'Lineas de producto visibles en el sitio web, con el conteo de productos publicados.';

grant select on public.catalogo_web to anon, authenticated;
grant select on public.lineas_web  to anon, authenticated;


-- ------------------------------------------------------------
-- 7. Row Level Security
-- ------------------------------------------------------------
alter table public.sitio_contenido   enable row level security;
alter table public.sitio_solicitudes enable row level security;

-- Contenido: internet lo LEE, el equipo lo edita
drop policy if exists "sitio_contenido_auth_all" on public.sitio_contenido;
create policy "sitio_contenido_auth_all" on public.sitio_contenido
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "sitio_contenido_public_select" on public.sitio_contenido;
create policy "sitio_contenido_public_select" on public.sitio_contenido
  for select to anon using (true);

-- Solicitudes: internet solo puede INSERTAR (nunca leer lo de otros)
drop policy if exists "sitio_solicitudes_auth_all" on public.sitio_solicitudes;
create policy "sitio_solicitudes_auth_all" on public.sitio_solicitudes
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "sitio_solicitudes_public_insert" on public.sitio_solicitudes;
create policy "sitio_solicitudes_public_insert" on public.sitio_solicitudes
  for insert to anon with check (
    estado = 'NUEVO'
    and notas_internas is null
    and cliente_id is null
    and length(nombre) between 2 and 120
    and length(coalesce(mensaje, '')) <= 4000
    and length(coalesce(empresa, '')) <= 200
  );

grant insert on public.sitio_solicitudes to anon;


-- ------------------------------------------------------------
-- 8. Bucket de Storage para las imagenes del sitio
--    Si esta seccion falla por permisos, crea el bucket a mano:
--    Storage > New bucket > nombre "sitio" > Public bucket: SI
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sitio', 'sitio', true, 5242880,
        array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif'])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif'];

-- Cualquiera puede VER las imagenes del sitio; solo el equipo puede subirlas
drop policy if exists "sitio_imagenes_public_read" on storage.objects;
create policy "sitio_imagenes_public_read" on storage.objects
  for select using (bucket_id = 'sitio');

drop policy if exists "sitio_imagenes_auth_write" on storage.objects;
create policy "sitio_imagenes_auth_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'sitio');

drop policy if exists "sitio_imagenes_auth_update" on storage.objects;
create policy "sitio_imagenes_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'sitio');

drop policy if exists "sitio_imagenes_auth_delete" on storage.objects;
create policy "sitio_imagenes_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'sitio');


-- ============================================================
-- FIN migracion 023
-- Verificacion rapida:
--   select count(*) from public.catalogo_web;
--   select nombre, total_productos from public.lineas_web order by orden;
--   select clave, valor from public.sitio_contenido order by grupo, orden;
-- ============================================================
