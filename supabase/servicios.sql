-- Permite marcar un producto como SERVICIO (impresión, escaneo, tipeo).
-- Los servicios se venden sin agotarse en stock. Ejecutar en el SQL Editor.

alter table public.productos
  add column if not exists tipo text not null default 'producto'
    check (tipo in ('producto', 'servicio'));

-- Consumo opcional de un insumo por cada servicio vendido
-- (ej.: "Impresión B/N" descuenta 1 hoja de Papel Bond por copia).
alter table public.productos
  add column if not exists consumo_producto_id uuid null
    references public.productos(id) on delete set null;

alter table public.productos
  add column if not exists consumo_por_unidad integer not null default 0
    check (consumo_por_unidad >= 0);

-- Los servicios no cuentan como "agotados" en las alertas.
drop function if exists public.productos_bajo_stock();

create function public.productos_bajo_stock()
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
