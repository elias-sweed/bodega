-- Fase 3: Ventas y detalle de ventas + función transaccional
-- Ejecutar en el SQL Editor de Supabase (después de schema.sql).

-- Encabezado de la venta
create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  total numeric(12, 2) not null default 0 check (total >= 0),
  metodo_pago text not null default 'Efectivo' check (metodo_pago in ('Efectivo', 'Yape', 'Plin'))
);

-- Compatibilidad: agrega el método de pago si la tabla ya existía.
alter table public.ventas add column if not exists metodo_pago text not null default 'Efectivo';

-- Líneas de la venta
create table public.detalle_ventas (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12, 2) not null check (precio_unitario >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0)
);

create index detalle_ventas_venta_id_idx on public.detalle_ventas (venta_id);
create index detalle_ventas_producto_id_idx on public.detalle_ventas (producto_id);

-- Seguridad a nivel de fila
alter table public.ventas enable row level security;
alter table public.detalle_ventas enable row level security;

create policy "ventas_select" on public.ventas
  for select using (true);

create policy "detalle_ventas_select" on public.detalle_ventas
  for select using (true);

-- ---------------------------------------------------------------------------
-- Función transaccional: inserta la venta, el detalle y descuenta stock.
-- Toda la operación es atómica: si algo falla, se revierte por completo.
-- ---------------------------------------------------------------------------
drop function if exists public.registrar_venta(json);

create or replace function public.registrar_venta(p_articulos json, p_metodo_pago text default 'Efectivo')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta_id uuid;
  v_item json;
  v_producto_id uuid;
  v_cantidad integer;
  v_precio numeric(12, 2);
  v_subtotal numeric(12, 2);
  v_total numeric(12, 2) := 0;
  v_stock_actual integer;
begin
  insert into public.ventas (total, metodo_pago)
  values (0, coalesce(p_metodo_pago, 'Efectivo'))
  returning id into v_venta_id;

  for v_item in select * from json_array_elements(p_articulos)
  loop
    v_producto_id := (v_item ->> 'producto_id')::uuid;
    v_cantidad := (v_item ->> 'cantidad')::integer;
    v_precio := (v_item ->> 'precio_unitario')::numeric(12, 2);

    select stock_actual into v_stock_actual
    from public.productos
    where id = v_producto_id
    for update;

    if not found then
      raise exception 'El producto % no existe', v_producto_id;
    end if;

    if v_stock_actual < v_cantidad then
      raise exception 'Stock insuficiente para el producto % (disponible: %)', v_producto_id, v_stock_actual;
    end if;

    v_subtotal := v_precio * v_cantidad;
    v_total := v_total + v_subtotal;

    insert into public.detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
    values (v_venta_id, v_producto_id, v_cantidad, v_precio, v_subtotal);

    update public.productos
    set stock_actual = stock_actual - v_cantidad
    where id = v_producto_id;
  end loop;

  update public.ventas
  set total = v_total
  where id = v_venta_id;

  return json_build_object('venta_id', v_venta_id, 'total', v_total);
end;
$$;

grant execute on function public.registrar_venta(json, text) to anon, authenticated;

-- Datos de ejemplo (opcional)
-- insert into public.productos (nombre, categoria, precio_venta, costo, stock_actual, stock_minimo, codigo_barras) values
--   ('Hot cake sencillo', 'Desayuno', 25, 10, 20, 5, null),
--   ('Imprensión B/N (hoja)', 'Impresiones', 2, 0.5, 100, 20, null),
--   ('Papitas chicas', 'Snacks', 12, 7, 30, 10, '7501234567890');