-- Seguridad login: quita a `anon` de todas las RPC ejecutables por red.
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de importar_ventas_offline.sql.
-- (CREATE OR REPLACE conserva grants viejos; por eso se revocan explícito.
-- La membresía real la sigue verificando es_miembro() dentro de cada función.)

revoke execute on function public.registrar_venta(json, text) from anon;
revoke execute on function public.registrar_venta_backfill(json, text, timestamptz, text) from anon;
revoke execute on function public.registrar_compra(uuid, text, text, json) from anon;
revoke execute on function public.registrar_ingreso(uuid, uuid, text, uuid, integer, numeric, text) from anon;
revoke execute on function public.registrar_ajuste_manual(uuid, integer, boolean, text) from anon;
revoke execute on function public.actualizar_producto(uuid, text, text, text, numeric, numeric, integer, integer, text) from anon;
revoke execute on function public.dashboard_resumen() from anon;

-- NOTA: si alguna firma difiere (overloads viejos), revócala también, ej:
--   revoke execute on function public.registrar_venta(json) from anon;
