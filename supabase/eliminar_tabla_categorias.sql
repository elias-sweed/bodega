-- =============================================================
-- Elimina la tabla vacía public.categorias.
-- Las categorías reales viven en public.productos.categoria
-- (cada producto guarda su categoría como texto), y la app las
-- lista deduplicándolas de ahí (fetchProductCategories). La tabla
-- categorias quedó sin uso: nadie la consulta ni la referencia.
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- Es idempotente: se puede correr de nuevo sin problemas.
-- =============================================================
begin;

-- Antes de borrar, revisa que esté vacía (debería estarlo).
select count(*) as filas_en_categorias from public.categorias;

drop table if exists public.categorias;

commit;