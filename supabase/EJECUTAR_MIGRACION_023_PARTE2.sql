create table if not exists public.sitio_contenido (
  clave      text primary key,
  valor      text,
  grupo      text not null default 'general',
  etiqueta   text not null,
  ayuda      text,
  tipo       text not null default 'texto' check (tipo in ('texto', 'texto_largo', 'lista', 'url', 'imagen', 'telefono', 'email')),
  orden      integer not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_sitio_contenido_updated_at on public.sitio_contenido;
create trigger trg_sitio_contenido_updated_at
  before update on public.sitio_contenido
  for each row execute function public.set_updated_at();

insert into public.sitio_contenido (clave, grupo, etiqueta, ayuda, tipo, orden, valor) values
('marca_nombre', 'marca', 'Nombre comercial', null, 'texto', 1, 'Abastecer Empresarial S.A.S.'),
('marca_tagline', 'marca', 'Tagline del logo', null, 'texto', 2, 'Dotacion y EPP para un entorno seguro'),
('marca_slogan', 'marca', 'Eslogan', null, 'texto', 3, 'Tu aliado en abastecimiento empresarial'),
('marca_descripcion_seo', 'marca', 'Descripcion SEO', null, 'texto_largo', 4, 'Dotacion, EPP y suministros empresariales en Cali. Un solo proveedor para todo lo que tu empresa necesita: cotizamos en 24 horas y entregamos con factura electronica.'),
('hero_kicker', 'hero', 'Texto superior', null, 'texto', 1, 'Dotacion y EPP para un entorno seguro'),
('hero_titulo', 'hero', 'Titulo principal', null, 'texto', 2, 'Todo lo que tu empresa necesita, en un solo lugar'),
('hero_subtitulo', 'hero', 'Subtitulo', null, 'texto_largo', 3, 'Somos la empresa que abastece a otras empresas. Dotacion, elementos de proteccion personal, aseo, cafeteria, papeleria y mucho mas: una sola llamada, un solo proveedor, una sola factura.'),
('hero_boton_primario', 'hero', 'Boton principal', null, 'texto', 4, 'Ver catalogo'),
('hero_boton_secundario', 'hero', 'Boton secundario', null, 'texto', 5, 'Solicitar cotizacion'),
('hero_badges', 'hero', 'Sellos de confianza', null, 'lista', 6, E'Productos certificados\nEntregas cumplidas\nFactura electronica\nAsesoria en SST'),
('hero_imagen_url', 'hero', 'Imagen hero', null, 'imagen', 7, ''),
('cifras', 'cifras', 'Cifras destacadas', null, 'lista', 1, E'24 h|Respuesta a tu cotizacion\n11|Lineas de abastecimiento\n1|Solo proveedor para todo\n100%|Factura electronica'),
('beneficios_titulo', 'beneficios', 'Titulo', null, 'texto', 1, 'Por que las empresas nos eligen'),
('beneficios_subtitulo', 'beneficios', 'Subtitulo', null, 'texto_largo', 2, 'Comprar dotacion y suministros no deberia costarle tiempo a tu equipo. Nosotros nos encargamos de todo el proceso.'),
('beneficios', 'beneficios', 'Beneficios', null, 'lista', 3, E'caja|Un solo proveedor|Consolidamos tu abastecimiento en un solo pedido, una sola entrega y una sola factura.\nreloj|Cotizacion en 24 horas|Respondemos rapido y con precios claros.\nmedalla|Productos certificados|Trabajamos con marcas que cumplen la norma.\ncamion|Entregas cumplidas|Llegamos cuando dijimos que ibamos a llegar.\nfactura|Factura electronica|Empresa formal con NIT, RUT y facturacion DIAN.\nusuarios|Atencion personalizada|Hablas con una persona que conoce tu empresa.'),
('nosotros_titulo', 'nosotros', 'Titulo', null, 'texto', 1, 'Somos el aliado que le resuelve el abastecimiento a tu empresa'),
('nosotros_texto', 'nosotros', 'Texto', null, 'texto_largo', 2, E'Abastecer Empresarial S.A.S. es una empresa colombiana con domicilio en Cali, Valle del Cauca, dedicada al suministro de dotacion, EPP y productos institucionales.\n\nNacimos de una idea simple: las areas de compras pierden demasiado tiempo cotizando con multiples proveedores. Nosotros centralizamos todo eso.\n\nTrabajamos bajo pedido: buscamos la referencia exacta que necesitas, la conseguimos al mejor costo y la entregamos con factura electronica.'),
('mision', 'nosotros', 'Mision', null, 'texto_largo', 3, 'Abastecer a las empresas de todo lo que necesitan para operar seguras y productivas, con calidad certificada, cumplimiento en entregas y asesoria cercana.'),
('vision', 'nosotros', 'Vision', null, 'texto_largo', 4, 'Para 2030 ser el aliado de abastecimiento empresarial de referencia en el suroccidente colombiano.'),
('valores', 'nosotros', 'Valores', null, 'lista', 5, E'escudo|Seguridad|Protegemos lo mas importante: las personas.\nmedalla|Calidad|Productos certificados. No sacrificamos norma por precio.\nmanos|Confianza|Transparencia y cumplimiento en cada entrega.\ncaja|Compromiso|Respondemos por lo que vendemos.\nestrella|Soluciones|Todo en un solo lugar y con un solo responsable.'),
('proceso_titulo', 'proceso', 'Titulo', null, 'texto', 1, 'Como trabajamos'),
('proceso_subtitulo', 'proceso', 'Subtitulo', null, 'texto_largo', 2, 'Cuatro pasos, sin vueltas.'),
('proceso_pasos', 'proceso', 'Pasos', null, 'lista', 3, E'Cuentanos que necesitas|Escribenos por WhatsApp o envianos tu lista.\nRecibes la cotizacion|En menos de 24 horas habiles, con precios e IVA.\nApruebas y programamos|Confirmas y acordamos fecha de entrega.\nEntregamos y facturamos|Con remision, factura electronica y garantia.'),
('sectores_titulo', 'sectores', 'Titulo', null, 'texto', 1, 'Empresas que atendemos'),
('sectores_subtitulo', 'sectores', 'Subtitulo', null, 'texto_largo', 2, 'Si tu empresa tiene personal, tiene necesidades de abastecimiento.'),
('sectores', 'sectores', 'Sectores', null, 'lista', 3, E'casco|Construccion y obra civil\nfabrica|Industria y manufactura\nhospital|Salud e instituciones\ntienda|Comercio y servicios\ncamion|Logistica y transporte\nedificio|Oficinas y corporativo\ntractor|Agroindustria\nusuarios|Sector publico y educacion'),
('catalogo_titulo', 'catalogo', 'Titulo', null, 'texto', 1, 'Nuestro catalogo'),
('catalogo_subtitulo', 'catalogo', 'Subtitulo', null, 'texto_largo', 2, 'Busca por nombre o navega por linea. Si no encuentras lo que necesitas, escribenos.'),
('catalogo_nota', 'catalogo', 'Nota precios', null, 'texto_largo', 3, 'Los precios se cotizan segun cantidad y condiciones de entrega. Arma tu lista y te enviamos la cotizacion en menos de 24 horas.'),
('cta_titulo', 'cta', 'Titulo final', null, 'texto', 1, 'Listo para dejar de perseguir proveedores?'),
('cta_texto', 'cta', 'Texto final', null, 'texto_largo', 2, 'Envianos tu lista y recibe cotizacion formal en menos de 24 horas. Sin compromiso.'),
('cta_boton', 'cta', 'Boton', null, 'texto', 3, 'Solicitar cotizacion'),
('contacto_whatsapp', 'contacto', 'WhatsApp', null, 'telefono', 1, '573508624021'),
('contacto_whatsapp_mensaje', 'contacto', 'Mensaje WhatsApp', null, 'texto_largo', 2, 'Hola, los contacto desde la pagina web de Abastecer Empresarial. Necesito una cotizacion.'),
('contacto_telefono', 'contacto', 'Telefono', null, 'telefono', 3, '350 862 4021'),
('contacto_email', 'contacto', 'Correo', null, 'email', 4, 'abastecerempresarial@gmail.com'),
('contacto_direccion', 'contacto', 'Direccion', null, 'texto', 5, 'Carrera 13 #15-36'),
('contacto_ciudad', 'contacto', 'Ciudad', null, 'texto', 6, 'Cali, Valle del Cauca'),
('contacto_horario', 'contacto', 'Horario', null, 'texto', 7, 'Lunes a viernes 8:00 a.m. - 6:00 p.m.'),
('contacto_cobertura', 'contacto', 'Cobertura', null, 'texto', 8, 'Cali y area metropolitana. Despachos a todo Colombia.'),
('contacto_maps_url', 'contacto', 'Google Maps', null, 'url', 9, ''),
('red_instagram', 'redes', 'Instagram', null, 'url', 1, ''),
('red_facebook', 'redes', 'Facebook', null, 'url', 2, ''),
('red_linkedin', 'redes', 'LinkedIn', null, 'url', 3, ''),
('red_tiktok', 'redes', 'TikTok', null, 'url', 4, ''),
('footer_texto', 'footer', 'Texto pie', null, 'texto_largo', 1, 'Dotacion, EPP y suministros empresariales. Somos tu aliado: cotizamos, entregamos y respondemos.'),
('footer_legal', 'footer', 'Linea legal', null, 'texto', 2, 'Abastecer Empresarial S.A.S. - NIT 902088758-4 - Cali, Colombia')
on conflict (clave) do nothing;

create table if not exists public.sitio_solicitudes (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null default 'CONTACTO' check (tipo in ('CONTACTO', 'COTIZACION')),
  nombre         text not null,
  empresa        text,
  nit            text,
  email          text,
  telefono       text,
  ciudad         text,
  mensaje        text,
  items          jsonb not null default '[]'::jsonb,
  origen         text,
  estado         text not null default 'NUEVO' check (estado in ('NUEVO', 'EN_PROCESO', 'ATENDIDO', 'DESCARTADO')),
  notas_internas text,
  cliente_id     uuid references public.clientes(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_sitio_solicitudes_estado on public.sitio_solicitudes(estado);
create index if not exists idx_sitio_solicitudes_fecha on public.sitio_solicitudes(created_at desc);

drop trigger if exists trg_sitio_solicitudes_updated_at on public.sitio_solicitudes;
create trigger trg_sitio_solicitudes_updated_at
  before update on public.sitio_solicitudes
  for each row execute function public.set_updated_at();

drop view if exists public.catalogo_web;
create view public.catalogo_web as
select p.id, p.slug, p.codigo,
  coalesce(nullif(p.nombre_web, ''), p.nombre) as nombre,
  coalesce(nullif(p.descripcion_web, ''), p.descripcion) as descripcion,
  p.marca, p.unidad_medida, p.imagen_url, p.imagenes, p.ficha,
  p.destacado_web, p.orden_web, p.created_at,
  c.id as categoria_id,
  coalesce(nullif(c.nombre_web, ''), c.nombre) as categoria_nombre,
  c.slug as categoria_slug, c.icono as categoria_icono
from public.productos p
left join public.categorias_producto c on c.id = p.categoria_id
where p.activo = true and p.visible_web = true;

drop view if exists public.lineas_web;
create view public.lineas_web as
select c.id, coalesce(nullif(c.nombre_web, ''), c.nombre) as nombre,
  c.slug, c.descripcion_web, coalesce(nullif(c.icono, ''), 'caja') as icono,
  c.imagen_url, c.orden, count(p.id) as total_productos
from public.categorias_producto c
left join public.productos p on p.categoria_id = c.id and p.activo = true and p.visible_web = true
where c.visible_web = true
group by c.id, c.nombre, c.nombre_web, c.slug, c.descripcion_web, c.icono, c.imagen_url, c.orden;

grant select on public.catalogo_web to anon, authenticated;
grant select on public.lineas_web to anon, authenticated;

alter table public.sitio_contenido enable row level security;
alter table public.sitio_solicitudes enable row level security;

create policy "sitio_contenido_auth_all" on public.sitio_contenido
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "sitio_contenido_public_select" on public.sitio_contenido
  for select to anon using (true);
create policy "sitio_solicitudes_auth_all" on public.sitio_solicitudes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "sitio_solicitudes_public_insert" on public.sitio_solicitudes
  for insert to anon with check (
    estado = 'NUEVO' and notas_internas is null and cliente_id is null
    and length(nombre) between 2 and 120
    and length(coalesce(mensaje, '')) <= 4000
    and length(coalesce(empresa, '')) <= 200
  );

grant insert on public.sitio_solicitudes to anon;
