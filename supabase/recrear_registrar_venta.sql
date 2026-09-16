-- ARREGLO DEFINITIVO del cobro: recrea registrar_venta en su versión canónica.
--
-- Por qué: la base tiene una mezcla de versiones y NO descuenta el stock_actual
-- al vender (aunque la venta sí se guarda). Este script:
--   1) BORRA todas las variantes de registrar_venta que existan (json, jsonb…),
--   2) crea la versión correcta: guarda la venta, guarda el detalle, descuenta
--      el stock_actual de cada producto y exige permisos de miembro,
--   3) otorga el permiso de ejecución.
-- Es seguro ejecutarlo varias veces.

do $$
declare
  r record;
begin
  for r in
    select format(
             'drop function if exists public.%I(%s) cascade',
             p.proname,
             pg_get_function_identity_arguments(p.oid)
           ) as stmt
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'registrar_venta'
  loop
    execute r.stmt;
  end loop;
end $$;

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
  v_costo numeric(12, 2);
  v_subtotal numeric(12, 2);
  v_total numeric(12, 2) := 0;
  v_stock_actual integer;
begin
  if not public.es_miembro() then
    raise exception 'No autorizado';
  end if;

  insert into public.ventas (total, metodo_pago)
  values (0, coalesce(p_metodo_pago, 'Efectivo'))
  returning id into v_venta_id;

  for v_item in select * from json_array_elements(p_articulos)
  loop
    v_producto_id := (v_item ->> 'producto_id')::uuid;
    v_cantidad := (v_item ->> 'cantidad')::integer;
    v_precio := (v_item ->> 'precio_unitario')::numeric(12, 2);

    select stock_actual, costo into v_stock_actual, v_costo
    from public.productos
    where id = v_producto_id
    for update;

    if not found then
      raise exception 'El producto no existe (id: %)', v_producto_id;
    end if;

    if v_stock_actual < v_cantidad then
      raise exception 'Stock insuficiente para el producto (id: %, disponible: %)', v_producto_id, v_stock_actual;
    end if;

    v_subtotal := v_precio * v_cantidad;
    v_total := v_total + v_subtotal;

    insert into public.detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal, costo_unitario)
    values (v_venta_id, v_producto_id, v_cantidad, v_precio, v_subtotal, v_costo);

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

grant execute on function public.registrar_venta(json, text) to authenticated;

-- VERIFICACIÓN: debe mostrar exactamente 1 fila (json, text).
select p.proname,
       pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'registrar_venta';