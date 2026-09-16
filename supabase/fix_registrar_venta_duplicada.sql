-- ARREGLO: elimina la versión duplicada de registrar_venta (variante jsonb).
-- Al existir dos funciones con el mismo nombre (una con json y otra con jsonb),
-- Supabase no sabe cuál elegir y rechaza TODAS las ventas con:
--   "Could not choose the best candidate function between ..."
-- Conserva la correcta: public.registrar_venta(json, text) (con es_miembro).
-- Es seguro ejecutarlo varias veces.

drop function if exists public.registrar_venta(jsonb);
drop function if exists public.registrar_venta(jsonb, text);