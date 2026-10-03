-- RPC: productos_bajo_stock
-- Filtra productos con stock_actual <= stock_minimo directamente en el servidor
-- para evitar traer todos los productos y filtrar en el cliente.

create or replace function public.productos_bajo_stock()
returns setof public.productos
language sql
stable
as $$
  select *
  from public.productos
  where stock_actual <= stock_minimo
    and tipo <> 'servicio'
  order by nombre asc;
$$;

-- Permitir ejecución a usuarios autenticados
grant execute on function public.productos_bajo_stock() to authenticated;
