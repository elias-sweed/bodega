-- =============================================================
-- Arregla la hora de creación de productos para el filtro "Recientes"
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- Es idempotente: se puede correr de nuevo sin problemas.
-- =============================================================
begin;

-- 1) Columna con valor por defecto "ahora" si todavía no existe.
alter table public.productos
  add column if not exists created_at timestamptz
  default now();

-- 2) Rellena las filas que quedaron sin fecha (antes daban NULL y no salían
--    en el filtro "Recientes").
update public.productos
set created_at = now()
where created_at is null;

-- 3) Refuerza: desde ahora todo producto nuevo queda con su hora de registro.
alter table public.productos
  alter column created_at set default now(),
  alter column created_at set not null;

commit;