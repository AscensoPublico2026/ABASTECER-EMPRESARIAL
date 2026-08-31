-- ============================================================
-- 042 · CATEGORIAS DEL SITIO WEB — ESTRUCTURA COMERCIAL DE 9
-- ============================================================
--
-- Reorganiza las categorias del catalogo web a las 9 acordadas con el
-- cliente, pensadas para que la gente encuentre los productos en Google:
--
--   1. EPP - Elementos de Proteccion Personal
--   2. Dotacion y uniformes
--   3. Extintores y senalizacion
--   4. Ergonomia y oficina
--   5. Estanteria y almacenamiento
--   6. Tecnologia
--   7. Papeleria
--   8. Cafeteria
--   9. Aseo
--
-- QUE HACE
--   - Crea las categorias que faltaban (Ergonomia, Estanteria).
--   - Deja nombre bonito, descripcion SEO e icono a las 9.
--   - Fusiona Senalizacion dentro de Extintores (una sola categoria
--     comercial) moviendo sus productos y ocultando la vieja.
--   - Oculta del sitio las categorias que ya no van (Identificacion,
--     Ferreteria, Material electrico) SIN borrar sus productos: solo se
--     les quita visibilidad web. Si algun dia se necesitan, se reactivan.
--
-- Es idempotente: se puede correr varias veces sin duplicar nada.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Crear las categorias nuevas si no existen
-- ------------------------------------------------------------
insert into public.categorias_producto (nombre, orden) values
  ('Ergonomia', 4),
  ('Estanteria', 5)
on conflict (nombre) do nothing;

-- ------------------------------------------------------------
-- 2. Mover productos de Senalizacion a Extintores (se fusionan)
-- ------------------------------------------------------------
update public.productos p
set categoria_id = (select id from public.categorias_producto where nombre = 'Extintores')
where p.categoria_id = (select id from public.categorias_producto where nombre = 'Senalizacion');

-- ------------------------------------------------------------
-- 3. Nombre web, descripcion SEO, icono y orden de las 9 activas
-- ------------------------------------------------------------
update public.categorias_producto set
  nombre_web = case nombre
    when 'EPP'         then 'EPP - Elementos de Protección Personal'
    when 'Dotacion'    then 'Dotación y uniformes'
    when 'Extintores'  then 'Extintores y señalización'
    when 'Ergonomia'   then 'Ergonomía y oficina'
    when 'Estanteria'  then 'Estantería y almacenamiento'
    when 'Tecnologia'  then 'Tecnología'
    when 'Papeleria'   then 'Papelería'
    when 'Cafeteria'   then 'Cafetería'
    when 'Aseo'        then 'Aseo y limpieza'
    else nombre_web
  end,
  descripcion_web = case nombre
    when 'EPP'         then 'Elementos de protección personal certificados: cascos, gafas de seguridad, guantes, calzado de seguridad, protección respiratoria y auditiva, arnés y equipos para trabajo en alturas, impermeables y ropa de protección.'
    when 'Dotacion'    then 'Dotación de ley y uniformes empresariales: camisas, pantalones y jeans de trabajo, overoles, chalecos y calzado, con bordado o logo de tu empresa.'
    when 'Extintores'  then 'Extintores, recarga y mantenimiento, gabinetes, y señalización industrial y de seguridad: avisos preventivos, reglamentarios e informativos y avisos en PVC.'
    when 'Ergonomia'   then 'Ergonomía y accesorios de puesto de trabajo: bases y soportes para monitor, soportes para portátil, apoyapiés, apoyamuñecas y elementos para una oficina más cómoda y saludable.'
    when 'Estanteria'  then 'Estantería y almacenamiento para bodega, archivo y punto de venta: estantería metálica, entrepaños, organización y soluciones de almacenamiento.'
    when 'Tecnologia'  then 'Tecnología y equipos de oficina: computadores, portátiles, periféricos, impresión, consumibles y accesorios.'
    when 'Papeleria'   then 'Papelería y suministros de oficina: resmas, carpetas, bolígrafos, archivadores y útiles para el día a día.'
    when 'Cafeteria'   then 'Todo para la cafetería de tu empresa: café, azúcar, vasos, servilletas, endulzantes y desechables.'
    when 'Aseo'        then 'Aseo y limpieza institucional: desinfectantes, papel higiénico, toallas, jabones, dispensadores e implementos de limpieza.'
    else descripcion_web
  end,
  icono = case nombre
    when 'EPP'         then 'casco'
    when 'Dotacion'    then 'camiseta'
    when 'Extintores'  then 'extintor'
    when 'Ergonomia'   then 'monitor'
    when 'Estanteria'  then 'estanteria'
    when 'Tecnologia'  then 'portatil'
    when 'Papeleria'   then 'papel'
    when 'Cafeteria'   then 'cafe'
    when 'Aseo'        then 'escoba'
    else icono
  end,
  orden = case nombre
    when 'EPP'         then 1
    when 'Dotacion'    then 2
    when 'Extintores'  then 3
    when 'Ergonomia'   then 4
    when 'Estanteria'  then 5
    when 'Tecnologia'  then 6
    when 'Papeleria'   then 7
    when 'Cafeteria'   then 8
    when 'Aseo'        then 9
    else orden
  end
where nombre in ('EPP','Dotacion','Extintores','Ergonomia','Estanteria',
                 'Tecnologia','Papeleria','Cafeteria','Aseo');

-- ------------------------------------------------------------
-- 4. Ocultar del sitio las categorias que ya no van
-- ------------------------------------------------------------
-- No se borran (podrian tener productos o historial): solo se sacan del
-- orden visible poniendolas al final. La vista lineas_web solo muestra
-- las que tienen productos publicados, asi que quedan fuera de la web.
update public.categorias_producto
set orden = 900
where nombre in ('Identificacion','Ferreteria','Material electrico','Senalizacion','Otro');
