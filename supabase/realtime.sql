-- Habilita Supabase Realtime para la tabla que la app escucha "en vivo".
--
-- Ejecutar en el SQL Editor de Supabase. Con esto, cuando un cajero hace una
-- venta o una compra, el stock/precio que cambió se refleja al instante en las
-- demás pantallas (POS, Inventario, Compras) sin recargar.
--
-- Tabla necesaria: productos (es la única que alimenta el catálogo en vivo en
-- el frontend; ventas, ingresos y usuarios se leen bajo demanda).

alter publication supabase_realtime add table public.productos;