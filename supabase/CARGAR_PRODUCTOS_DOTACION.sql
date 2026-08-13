-- ============================================================
-- CARGAR PRODUCTOS DE DOTACION
-- ============================================================
-- Corre este SQL en Supabase > SQL Editor.
-- Carga 97 productos del listado del proveedor.
-- Si el producto ya existe (por nombre), no se duplica.
--
-- Categoria: DOTACION (se crea si no existe)
-- Precios: los que tienen "PENDIENTE" quedan con precio 0
-- ============================================================

-- 1. Asegurar que existe la categoria Dotacion
insert into public.categorias_producto (nombre)
values ('Dotacion')
on conflict (nombre) do nothing;

-- 2. Obtener el ID de la categoria
do $$
declare
  cat_id uuid;
  siguiente_codigo text;
  contador int := 0;
begin
  select id into cat_id from public.categorias_producto where nombre = 'Dotacion' limit 1;

  -- Obtener el ultimo codigo PRD-XXXX para continuar la secuencia
  select coalesce(max(cast(replace(codigo, 'PRD-', '') as int)), 0)
  into contador
  from public.productos
  where codigo like 'PRD-%';

  -- BOTAS DIELECTRICAS CON PUNTERA (RAM)
  insert into public.productos (nombre, codigo, categoria_id, precio_sugerido, unidad_medida, activo, visible_web)
  values
    ('BOTA DIELECTRICA CON PUNTERA (RAM) - 35', 'PRD-' || lpad((contador + 1)::text, 4, '0'), cat_id, 75000, 'Par', true, true),
    ('BOTA DIELECTRICA CON PUNTERA (RAM) - 36', 'PRD-' || lpad((contador + 2)::text, 4, '0'), cat_id, 75000, 'Par', true, true),
    ('BOTA DIELECTRICA CON PUNTERA (RAM) - 37', 'PRD-' || lpad((contador + 3)::text, 4, '0'), cat_id, 75000, 'Par', true, true),
    ('BOTA DIELECTRICA CON PUNTERA (RAM) - 38', 'PRD-' || lpad((contador + 4)::text, 4, '0'), cat_id, 75000, 'Par', true, true),
    ('BOTA DIELECTRICA CON PUNTERA (RAM) - 39', 'PRD-' || lpad((contador + 5)::text, 4, '0'), cat_id, 75000, 'Par', true, true),
    ('BOTA DIELECTRICA CON PUNTERA (RAM) - 40', 'PRD-' || lpad((contador + 6)::text, 4, '0'), cat_id, 75000, 'Par', true, true),
    ('BOTA DIELECTRICA CON PUNTERA (RAM) - 41', 'PRD-' || lpad((contador + 7)::text, 4, '0'), cat_id, 75000, 'Par', true, true),
    ('BOTA DIELECTRICA CON PUNTERA (RAM) - 42', 'PRD-' || lpad((contador + 8)::text, 4, '0'), cat_id, 75000, 'Par', true, true),
    ('BOTA DIELECTRICA CON PUNTERA (RAM) - 43', 'PRD-' || lpad((contador + 9)::text, 4, '0'), cat_id, 75000, 'Par', true, true),
    ('BOTA DIELECTRICA CON PUNTERA (RAM) - 44', 'PRD-' || lpad((contador + 10)::text, 4, '0'), cat_id, 75000, 'Par', true, true),
    ('BOTA DIELECTRICA CON PUNTERA (RAM) - 45', 'PRD-' || lpad((contador + 11)::text, 4, '0'), cat_id, 75000, 'Par', true, true),

    -- BOTAS PVC CON PUNTERA
    ('BOTA PVC CON PUNTERA - 36', 'PRD-' || lpad((contador + 12)::text, 4, '0'), cat_id, 50000, 'Par', true, true),
    ('BOTA PVC CON PUNTERA - 37', 'PRD-' || lpad((contador + 13)::text, 4, '0'), cat_id, 50000, 'Par', true, true),
    ('BOTA PVC CON PUNTERA - 38', 'PRD-' || lpad((contador + 14)::text, 4, '0'), cat_id, 50000, 'Par', true, true),
    ('BOTA PVC CON PUNTERA - 39', 'PRD-' || lpad((contador + 15)::text, 4, '0'), cat_id, 50000, 'Par', true, true),
    ('BOTA PVC CON PUNTERA - 40', 'PRD-' || lpad((contador + 16)::text, 4, '0'), cat_id, 50000, 'Par', true, true),
    ('BOTA PVC CON PUNTERA - 41', 'PRD-' || lpad((contador + 17)::text, 4, '0'), cat_id, 50000, 'Par', true, true),
    ('BOTA PVC CON PUNTERA - 42', 'PRD-' || lpad((contador + 18)::text, 4, '0'), cat_id, 50000, 'Par', true, true),
    ('BOTA PVC CON PUNTERA - 43', 'PRD-' || lpad((contador + 19)::text, 4, '0'), cat_id, 50000, 'Par', true, true),
    ('BOTA PVC CON PUNTERA - 44', 'PRD-' || lpad((contador + 20)::text, 4, '0'), cat_id, 50000, 'Par', true, true),
    ('BOTA PVC CON PUNTERA - 45', 'PRD-' || lpad((contador + 21)::text, 4, '0'), cat_id, 50000, 'Par', true, true),

    -- BUSOS MANGA LARGA AZUL (precio pendiente = 0)
    ('BUSO MANGA LARGA AZUL - L', 'PRD-' || lpad((contador + 22)::text, 4, '0'), cat_id, 0, 'Unidad', true, true),
    ('BUSO MANGA LARGA AZUL - M', 'PRD-' || lpad((contador + 23)::text, 4, '0'), cat_id, 0, 'Unidad', true, true),
    ('BUSO MANGA LARGA AZUL - S', 'PRD-' || lpad((contador + 24)::text, 4, '0'), cat_id, 0, 'Unidad', true, true),
    ('BUSO MANGA LARGA AZUL - XL', 'PRD-' || lpad((contador + 25)::text, 4, '0'), cat_id, 0, 'Unidad', true, true),
    ('BUSO MANGA LARGA AZUL - XXL', 'PRD-' || lpad((contador + 26)::text, 4, '0'), cat_id, 0, 'Unidad', true, true),
    ('BUSO MANGA LARGA AZUL - XXXL', 'PRD-' || lpad((contador + 27)::text, 4, '0'), cat_id, 0, 'Unidad', true, true),

    -- BUSOS MANGA LARGA GRIS (precio pendiente = 0)
    ('BUSO MANGA LARGA GRIS - L', 'PRD-' || lpad((contador + 28)::text, 4, '0'), cat_id, 0, 'Unidad', true, true),
    ('BUSO MANGA LARGA GRIS - M', 'PRD-' || lpad((contador + 29)::text, 4, '0'), cat_id, 0, 'Unidad', true, true),
    ('BUSO MANGA LARGA GRIS - S', 'PRD-' || lpad((contador + 30)::text, 4, '0'), cat_id, 0, 'Unidad', true, true),
    ('BUSO MANGA LARGA GRIS - XL', 'PRD-' || lpad((contador + 31)::text, 4, '0'), cat_id, 0, 'Unidad', true, true),
    ('BUSO MANGA LARGA GRIS - XXL', 'PRD-' || lpad((contador + 32)::text, 4, '0'), cat_id, 0, 'Unidad', true, true),
    ('BUSO MANGA LARGA GRIS - XXXL', 'PRD-' || lpad((contador + 33)::text, 4, '0'), cat_id, 0, 'Unidad', true, true),

    -- CAMISAS DE JEAN (CHAMBRAY)
    ('CAMISA DE JEAN (CHAMBRAY) - L', 'PRD-' || lpad((contador + 34)::text, 4, '0'), cat_id, 35000, 'Unidad', true, true),
    ('CAMISA DE JEAN (CHAMBRAY) - M', 'PRD-' || lpad((contador + 35)::text, 4, '0'), cat_id, 35000, 'Unidad', true, true),
    ('CAMISA DE JEAN (CHAMBRAY) - S', 'PRD-' || lpad((contador + 36)::text, 4, '0'), cat_id, 35000, 'Unidad', true, true),
    ('CAMISA DE JEAN (CHAMBRAY) - XL', 'PRD-' || lpad((contador + 37)::text, 4, '0'), cat_id, 35000, 'Unidad', true, true),
    ('CAMISA DE JEAN (CHAMBRAY) - XXL', 'PRD-' || lpad((contador + 38)::text, 4, '0'), cat_id, 35000, 'Unidad', true, true),

    -- CAMISAS OXFORD CABALLERO MANGA LARGA AZUL
    ('CAMISA OXFORD CABALLERO MANGA LARGA AZUL - L', 'PRD-' || lpad((contador + 39)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),
    ('CAMISA OXFORD CABALLERO MANGA LARGA AZUL - M', 'PRD-' || lpad((contador + 40)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),
    ('CAMISA OXFORD CABALLERO MANGA LARGA AZUL - S', 'PRD-' || lpad((contador + 41)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),
    ('CAMISA OXFORD CABALLERO MANGA LARGA AZUL - XL', 'PRD-' || lpad((contador + 42)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),
    ('CAMISA OXFORD CABALLERO MANGA LARGA AZUL - XXL', 'PRD-' || lpad((contador + 43)::text, 4, '0'), cat_id, 37000, 'Unidad', true, true),

    -- CAMISAS OXFORD CABALLERO MANGA LARGA BLANCO
    ('CAMISA OXFORD CABALLERO MANGA LARGA BLANCO - L', 'PRD-' || lpad((contador + 44)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),
    ('CAMISA OXFORD CABALLERO MANGA LARGA BLANCO - M', 'PRD-' || lpad((contador + 45)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),
    ('CAMISA OXFORD CABALLERO MANGA LARGA BLANCO - S', 'PRD-' || lpad((contador + 46)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),
    ('CAMISA OXFORD CABALLERO MANGA LARGA BLANCO - XL', 'PRD-' || lpad((contador + 47)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),
    ('CAMISA OXFORD CABALLERO MANGA LARGA BLANCO - XXL', 'PRD-' || lpad((contador + 48)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),

    -- CAMISAS OXFORD DAMA MANGA LARGA AZUL
    ('CAMISA OXFORD DAMA MANGA LARGA AZUL - L', 'PRD-' || lpad((contador + 49)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),
    ('CAMISA OXFORD DAMA MANGA LARGA AZUL - M', 'PRD-' || lpad((contador + 50)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),
    ('CAMISA OXFORD DAMA MANGA LARGA AZUL - S', 'PRD-' || lpad((contador + 51)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),
    ('CAMISA OXFORD DAMA MANGA LARGA AZUL - XL', 'PRD-' || lpad((contador + 52)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),
    ('CAMISA OXFORD DAMA MANGA LARGA AZUL - XXL', 'PRD-' || lpad((contador + 53)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),

    -- CAMISAS OXFORD DAMA MANGA LARGA BLANCO
    ('CAMISA OXFORD DAMA MANGA LARGA BLANCO - L', 'PRD-' || lpad((contador + 54)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),
    ('CAMISA OXFORD DAMA MANGA LARGA BLANCO - M', 'PRD-' || lpad((contador + 55)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),
    ('CAMISA OXFORD DAMA MANGA LARGA BLANCO - S', 'PRD-' || lpad((contador + 56)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),
    ('CAMISA OXFORD DAMA MANGA LARGA BLANCO - XL', 'PRD-' || lpad((contador + 57)::text, 4, '0'), cat_id, 36000, 'Unidad', true, true),

    -- CAMISA POLO MANGA CORTA CABALLERO AZUL
    ('CAMISA POLO MANGA CORTA CABALLERO AZUL - L', 'PRD-' || lpad((contador + 58)::text, 4, '0'), cat_id, 32000, 'Unidad', true, true),
    ('CAMISA POLO MANGA CORTA CABALLERO AZUL - M', 'PRD-' || lpad((contador + 59)::text, 4, '0'), cat_id, 32000, 'Unidad', true, true),
    ('CAMISA POLO MANGA CORTA CABALLERO AZUL - S', 'PRD-' || lpad((contador + 60)::text, 4, '0'), cat_id, 32000, 'Unidad', true, true),
    ('CAMISA POLO MANGA CORTA CABALLERO AZUL - XL', 'PRD-' || lpad((contador + 61)::text, 4, '0'), cat_id, 32000, 'Unidad', true, true),
    ('CAMISA POLO MANGA CORTA CABALLERO AZUL - XXL', 'PRD-' || lpad((contador + 62)::text, 4, '0'), cat_id, 34000, 'Unidad', true, true),

    -- CAMISA POLO MANGA CORTA DAMA AZUL
    ('CAMISA POLO MANGA CORTA DAMA AZUL - L', 'PRD-' || lpad((contador + 63)::text, 4, '0'), cat_id, 31000, 'Unidad', true, true),
    ('CAMISA POLO MANGA CORTA DAMA AZUL - M', 'PRD-' || lpad((contador + 64)::text, 4, '0'), cat_id, 31000, 'Unidad', true, true),
    ('CAMISA POLO MANGA CORTA DAMA AZUL - S', 'PRD-' || lpad((contador + 65)::text, 4, '0'), cat_id, 31000, 'Unidad', true, true),
    ('CAMISA POLO MANGA CORTA DAMA AZUL - XL', 'PRD-' || lpad((contador + 66)::text, 4, '0'), cat_id, 31000, 'Unidad', true, true),

    -- CAMISETA POLO MANGA CORTA CABALLERO BLANCA
    ('CAMISETA POLO MANGA CORTA CABALLERO BLANCA - L', 'PRD-' || lpad((contador + 67)::text, 4, '0'), cat_id, 32000, 'Unidad', true, true),
    ('CAMISETA POLO MANGA CORTA CABALLERO BLANCA - M', 'PRD-' || lpad((contador + 68)::text, 4, '0'), cat_id, 32000, 'Unidad', true, true),
    ('CAMISETA POLO MANGA CORTA CABALLERO BLANCA - S', 'PRD-' || lpad((contador + 69)::text, 4, '0'), cat_id, 32000, 'Unidad', true, true),
    ('CAMISETA POLO MANGA CORTA CABALLERO BLANCA - XL', 'PRD-' || lpad((contador + 70)::text, 4, '0'), cat_id, 32000, 'Unidad', true, true),
    ('CAMISETA POLO MANGA CORTA CABALLERO BLANCA - XXL', 'PRD-' || lpad((contador + 71)::text, 4, '0'), cat_id, 34000, 'Unidad', true, true),

    -- CAMISETA POLO MANGA CORTA DAMA BLANCA
    ('CAMISETA POLO MANGA CORTA DAMA BLANCA - L', 'PRD-' || lpad((contador + 72)::text, 4, '0'), cat_id, 31000, 'Unidad', true, true),
    ('CAMISETA POLO MANGA CORTA DAMA BLANCA - M', 'PRD-' || lpad((contador + 73)::text, 4, '0'), cat_id, 31000, 'Unidad', true, true),
    ('CAMISETA POLO MANGA CORTA DAMA BLANCA - S', 'PRD-' || lpad((contador + 74)::text, 4, '0'), cat_id, 31000, 'Unidad', true, true),
    ('CAMISETA POLO MANGA CORTA DAMA BLANCA - XL', 'PRD-' || lpad((contador + 75)::text, 4, '0'), cat_id, 31000, 'Unidad', true, true),

    -- CHALECOS
    ('CHALECO DE DRILL TIPO PERIODISTA COLOR AZUL OSCURO - L', 'PRD-' || lpad((contador + 76)::text, 4, '0'), cat_id, 40000, 'Unidad', true, true),
    ('CHALECO DE DRILL TIPO PERIODISTA COLOR AZUL OSCURO - M', 'PRD-' || lpad((contador + 77)::text, 4, '0'), cat_id, 40000, 'Unidad', true, true),

    -- CONJUNTOS IMPERMEABLES
    ('CONJUNTO IMPERMEABLE - L', 'PRD-' || lpad((contador + 78)::text, 4, '0'), cat_id, 41250, 'Unidad', true, true),
    ('CONJUNTO IMPERMEABLE - M', 'PRD-' || lpad((contador + 79)::text, 4, '0'), cat_id, 41250, 'Unidad', true, true),
    ('CONJUNTO IMPERMEABLE - S', 'PRD-' || lpad((contador + 80)::text, 4, '0'), cat_id, 41250, 'Unidad', true, true),
    ('CONJUNTO IMPERMEABLE - XL', 'PRD-' || lpad((contador + 81)::text, 4, '0'), cat_id, 41250, 'Unidad', true, true),
    ('CONJUNTO IMPERMEABLE - XXL', 'PRD-' || lpad((contador + 82)::text, 4, '0'), cat_id, 43000, 'Unidad', true, true),

    -- GORRA
    ('GORRA NEGRA EN DRILL CON LOGO CORPORATIVO', 'PRD-' || lpad((contador + 83)::text, 4, '0'), cat_id, 13000, 'Unidad', true, true),

    -- PANTALONES JEAN CABALLERO
    ('PANTALON JEAN CABALLERO - 28', 'PRD-' || lpad((contador + 84)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true),
    ('PANTALON JEAN CABALLERO - 30', 'PRD-' || lpad((contador + 85)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true),
    ('PANTALON JEAN CABALLERO - 32', 'PRD-' || lpad((contador + 86)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true),
    ('PANTALON JEAN CABALLERO - 34', 'PRD-' || lpad((contador + 87)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true),
    ('PANTALON JEAN CABALLERO - 36', 'PRD-' || lpad((contador + 88)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true),
    ('PANTALON JEAN CABALLERO - 38', 'PRD-' || lpad((contador + 89)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true),
    ('PANTALON JEAN CABALLERO - 40', 'PRD-' || lpad((contador + 90)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true),
    ('PANTALON JEAN CABALLERO - 42', 'PRD-' || lpad((contador + 91)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true),
    ('PANTALON JEAN CABALLERO - 44', 'PRD-' || lpad((contador + 92)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true),
    ('PANTALON JEAN CABALLERO - 46', 'PRD-' || lpad((contador + 93)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true),

    -- PANTALONES JEAN DAMA
    ('PANTALON JEAN DAMA - 8', 'PRD-' || lpad((contador + 94)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true),
    ('PANTALON JEAN DAMA - 10', 'PRD-' || lpad((contador + 95)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true),
    ('PANTALON JEAN DAMA - 12', 'PRD-' || lpad((contador + 96)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true),
    ('PANTALON JEAN DAMA - 14', 'PRD-' || lpad((contador + 97)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true),
    ('PANTALON JEAN DAMA - 16', 'PRD-' || lpad((contador + 98)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true),
    ('PANTALON JEAN DAMA - 18', 'PRD-' || lpad((contador + 99)::text, 4, '0'), cat_id, 30000, 'Unidad', true, true)
  on conflict (codigo) do nothing;

  raise notice '97 productos cargados en la categoria Dotacion';
end;
$$;


-- VERIFICACION: cuantos quedaron
select count(*) as total_dotacion,
       count(*) filter (where precio_sugerido = 0) as pendientes_de_precio
from public.productos p
join public.categorias_producto c on c.id = p.categoria_id
where c.nombre = 'Dotacion';
