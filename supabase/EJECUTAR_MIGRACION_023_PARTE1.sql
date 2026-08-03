create or replace function public.slugificar(texto text)
returns text
language sql
immutable
as $$
  select btrim(regexp_replace(
    lower(translate(coalesce(texto, ''),
      'ÁÀÂÄÃÅáàâäãåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÖÕóòôöõÚÙÛÜúùûüÑñÇç',
      'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCc')),
    '[^a-z0-9]+', '-', 'g'), '-')
$$;

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
    if base = '' then base := 'producto'; end if;
    candidato := base;
    while exists (select 1 from public.productos p where p.slug = candidato and p.id is distinct from new.id) loop
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

do $$
declare r record;
begin
  for r in select id from public.productos where slug is null or slug = '' loop
    update public.productos set slug = null where id = r.id;
  end loop;
end;
$$;

alter table public.categorias_producto
  add column if not exists slug            text,
  add column if not exists nombre_web      text,
  add column if not exists descripcion_web text,
  add column if not exists icono           text default 'caja',
  add column if not exists imagen_url      text,
  add column if not exists visible_web     boolean not null default true;

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

update public.categorias_producto set slug = public.slugificar(nombre) where slug is null or slug = '';
create unique index if not exists idx_categorias_slug on public.categorias_producto(slug);

update public.categorias_producto set
  nombre_web = coalesce(nullif(nombre_web, ''), case nombre
    when 'EPP' then 'EPP - Proteccion personal'
    when 'Dotacion' then 'Dotacion y uniformes'
    when 'Aseo' then 'Aseo y limpieza'
    when 'Cafeteria' then 'Cafeteria institucional'
    when 'Papeleria' then 'Papeleria y oficina'
    when 'Identificacion' then 'Identificacion corporativa'
    when 'Extintores' then 'Extintores y emergencias'
    when 'Senalizacion' then 'Senalizacion'
    when 'Ferreteria' then 'Ferreteria y herramienta'
    when 'Tecnologia' then 'Tecnologia'
    when 'Material electrico' then 'Material electrico'
    when 'Otro' then 'Otros suministros'
    else nombre end),
  descripcion_web = coalesce(nullif(descripcion_web, ''), case nombre
    when 'EPP' then 'Elementos de proteccion personal certificados: cascos, gafas, guantes, calzado de seguridad, proteccion respiratoria y auditiva, arnes y trabajo en alturas.'
    when 'Dotacion' then 'Dotacion de ley y uniformes empresariales: camisas, pantalones, overoles, chalecos y calzado, con bordado o logo de tu empresa.'
    when 'Aseo' then 'Aseo y limpieza institucional: desinfectantes, papel higienico, toallas, jabones, dispensadores e implementos.'
    when 'Cafeteria' then 'Todo para la cafeteria de tu empresa: cafe, azucar, vasos, servilletas, endulzantes y desechables.'
    when 'Papeleria' then 'Papeleria y suministros de oficina: resmas, carpetas, boligrafos, archivadores y utiles para el dia a dia.'
    when 'Identificacion' then 'Identificacion corporativa: carnes, lanyards, portacarnes, sellos y elementos de control de acceso.'
    when 'Extintores' then 'Extintores, recarga y mantenimiento: multiproposito, solkaflam, CO2, gabinetes y senalizacion asociada.'
    when 'Senalizacion' then 'Senalizacion industrial y de seguridad: avisos preventivos, reglamentarios e informativos, cintas y conos.'
    when 'Ferreteria' then 'Ferreteria y herramienta: manual, electrica, tornilleria, abrasivos y accesorios para mantenimiento.'
    when 'Tecnologia' then 'Tecnologia y equipos de oficina: computadores, perifericos, impresion, consumibles y accesorios.'
    when 'Material electrico' then 'Material electrico: iluminacion LED, cableado, tomas, tableros, canaletas y accesorios de instalacion.'
    when 'Otro' then 'Productos y suministros empresariales bajo pedido. Cuentanos que necesitas y lo conseguimos.'
    else 'Productos y suministros empresariales bajo pedido.' end),
  icono = case nombre
    when 'EPP' then 'casco' when 'Dotacion' then 'camiseta' when 'Aseo' then 'escoba'
    when 'Cafeteria' then 'cafe' when 'Papeleria' then 'papel' when 'Identificacion' then 'tarjeta'
    when 'Extintores' then 'extintor' when 'Senalizacion' then 'senal' when 'Ferreteria' then 'llave'
    when 'Tecnologia' then 'portatil' when 'Material electrico' then 'rayo'
    else coalesce(nullif(icono, ''), 'caja') end;
