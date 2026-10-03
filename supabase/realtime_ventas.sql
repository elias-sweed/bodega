-- Habilita Realtime para ventas: los demás dispositivos se enteran al instante
-- cuando alguien registra una venta (así PC y celular no se pisan).
-- Ejecutar en el SQL Editor de Supabase.

alter publication supabase_realtime add table public.ventas;
