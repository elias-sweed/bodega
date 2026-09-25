-- Corrección de compras cuando el producto tiene costo pendiente.
-- Ejecutar en Supabase > SQL Editor, en el mismo proyecto de la app.
--
-- Regla:
--   costo actual = 0  -> la primera compra real establece el costo por unidad
--   costo actual > 0  -> la compra siguiente usa costo promedio ponderado
--
-- La función sigue siendo atómica e idempotente: suma stock, actualiza costo y
-- registra la compra una sola vez. No modifica datos manualmente.

begin;

drop function if exists public.registrar_compra(uuid, text, text, json);
drop function if exists public.registrar_compra(uuid, text, text, json, uuid);

do $$
declare
  v_signature record;
begin
  for v_signature in
    select p.oid::regprocedure::text as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'registrar_compra'
  loop
    execute format('drop function %s', v_signature.signature);
  end loop;
end;
$$;

create function public.registrar_compra(
  p_proveedor_id uuid,
  p_nombre_proveedor text,
  p_comprobante text,
  p_items json,
  p_idempotency_key uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compra_id uuid;
  v_item json;
  v_producto_id uuid;
  v_cantidad integer;
  v_costo_total numeric(12, 2);
  v_costo_previo numeric(12, 2);
  v_costo_unitario numeric(12, 2);
  v_costo_nuevo numeric(12, 2);
  v_stock_actual integer;
  v_total numeric(12, 2) := 0;
  v_count integer := 0;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede registrar compras';
  end if;

  if p_idempotency_key is null then
    raise exception 'Falta el identificador de la compra';
  end if;

  if p_items is null
     or json_typeof(p_items) <> 'array'
     or json_array_length(p_items) = 0 then
    raise exception 'La compra no tiene productos';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_idempotency_key::text, 1)
  );

  v_compra_id := p_idempotency_key;

  select coalesce(sum(i.costo_total), 0), count(*)
    into v_total, v_count
  from public.ingresos_mercaderia i
  where i.compra_id = v_compra_id;

  if v_count > 0 then
    return json_build_object(
      'compra_id', v_compra_id,
      'total', v_total,
      'items', v_count
    );
  end if;

  for v_item in select value from json_array_elements(p_items)
  loop
    v_producto_id := nullif(trim(v_item ->> 'producto_id'), '')::uuid;
    v_cantidad := (v_item ->> 'cantidad')::integer;
    v_costo_total := (v_item ->> 'costo_total')::numeric(12, 2);

    if v_producto_id is null then
      raise exception 'El producto no es válido';
    end if;
    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'La cantidad debe ser mayor a 0';
    end if;
    if v_costo_total is null or v_costo_total < 0 then
      raise exception 'El costo total no puede ser negativo';
    end if;

    select p.stock_actual, p.costo
      into v_stock_actual, v_costo_previo
    from public.productos p
    where p.id = v_producto_id
    for update;

    if not found then
      raise exception 'El producto no existe (id: %)', v_producto_id;
    end if;

    v_costo_unitario := round(v_costo_total / v_cantidad, 2);
    if coalesce(v_costo_previo, 0) <= 0 then
      v_costo_nuevo := v_costo_unitario;
    else
      v_costo_nuevo := round(
        (v_costo_previo * v_stock_actual + v_costo_total)
        / (v_stock_actual + v_cantidad),
        2
      );
    end if;

    update public.productos
      set stock_actual = stock_actual + v_cantidad,
          costo = v_costo_nuevo
    where id = v_producto_id;

    insert into public.ingresos_mercaderia (
      compra_id, proveedor_id, nombre_proveedor, producto_id,
      cantidad_ingresada, costo_total, comprobante
    )
    values (
      v_compra_id, p_proveedor_id, nullif(trim(p_nombre_proveedor), ''),
      v_producto_id, v_cantidad, v_costo_total, nullif(trim(p_comprobante), '')
    );

    v_total := v_total + v_costo_total;
    v_count := v_count + 1;
  end loop;

  return json_build_object(
    'compra_id', v_compra_id,
    'total', v_total,
    'items', v_count
  );
end;
$$;

revoke all on function public.registrar_compra(uuid, text, text, json, uuid)
  from public, anon;
grant execute on function public.registrar_compra(uuid, text, text, json, uuid)
  to authenticated;

comment on function public.registrar_compra(uuid, text, text, json, uuid) is
  'Compra atómica; primera compra con costo pendiente establece el costo por unidad y las siguientes usan promedio ponderado.';

commit;

-- Debe existir una sola firma de registrar_compra.
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as argumentos,
  count(*) over () as total_rpcs
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'registrar_compra';

-- Debe ser false.
select has_function_privilege(
  'anon',
  'public.registrar_compra(uuid,text,text,json,uuid)',
  'EXECUTE'
) as anon_puede_comprar;

notify pgrst, 'reload schema';
