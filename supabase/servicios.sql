-- Permite marcar un producto como SERVICIO (impresión, escaneo, tipeo).
-- Los servicios se venden sin agotarse en stock. Ejecutar en el SQL Editor.

alter table public.productos
  add column if not exists tipo text not null default 'producto'
    check (tipo in ('producto', 'servicio'));

-- Los servicios no cuentan como "agotados" en las alertas.
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
