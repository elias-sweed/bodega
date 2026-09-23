-- Reparación directa y aislada del cobro.
-- Ejecutar SOLO este archivo en el SQL Editor del proyecto
-- icxuhgumcfxhwcfmwosm.
--
-- Usa una RPC nueva para que PostgREST no pueda resolver ni conservar la
-- versión antigua de registrar_venta. No reemplaza el resto de las tablas,
-- compras, RLS, usuarios ni reportes.

begin;

alter table public.ventas
  add column if not exists idempotency_key uuid;

create unique index if not exists ventas_idempotency_key_uidx
  on public.ventas (idempotency_key)
  where idempotency_key is not null;

alter table public.detalle_ventas
  add column if not exists costo_unitario numeric(12, 2);

drop function if exists public.registrar_venta_caja(json, text, uuid);

create function public.registrar_venta_caja(
  p_articulos json,
  p_metodo_pago text default 'Efectivo',
  p_idempotency_key uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta_id uuid;
  v_item jsonb;
  v_producto_id uuid;
  v_producto_nombre text;
  v_cantidad integer;
  v_precio numeric(12, 2);
  v_costo numeric(12, 2);
  v_subtotal numeric(12, 2);
  v_total numeric(12, 2) := 0;
  v_stock_actual integer;
  v_articulos jsonb;
  v_items jsonb := '[]'::jsonb;
begin
  if not public.es_miembro() then
    raise exception 'No autorizado';
  end if;

  if p_idempotency_key is null then
    raise exception 'Falta el identificador de la venta';
  end if;

  if p_metodo_pago is null
     or p_metodo_pago not in ('Efectivo', 'Yape', 'Plin') then
    raise exception 'Método de pago inválido';
  end if;

  if p_articulos is null
     or json_typeof(p_articulos) <> 'array'
     or json_array_length(p_articulos) = 0 then
    raise exception 'La venta no tiene productos';
  end if;

  v_articulos := p_articulos::jsonb;

  perform pg_advisory_xact_lock(
    hashtextextended(p_idempotency_key::text, 0)
  );

  -- Si esta misma clave ya se procesó, devuelve la venta existente.
  select v.id, v.total
    into v_venta_id, v_total
  from public.ventas v
  where v.idempotency_key = p_idempotency_key;

  if found then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'producto_id', d.producto_id,
          'cantidad', d.cantidad,
          'precio_unitario', d.precio_unitario,
          'subtotal', d.subtotal
        ) order by d.id
      ),
      '[]'::jsonb
    )
      into v_items
    from public.detalle_ventas d
    where d.venta_id = v_venta_id;

    return json_build_object(
      'venta_id', v_venta_id,
      'total', v_total,
      'idempotency_key', p_idempotency_key,
      'items', v_items
    );
  end if;

  -- Calcula y bloquea cada producto antes de crear la venta. El total se
  -- obtiene SIEMPRE desde productos.precio_venta en el servidor.
  for v_item in
    select value
    from jsonb_array_elements(v_articulos)
    order by value ->> 'producto_id'
  loop
    v_producto_id := nullif(v_item ->> 'producto_id', '')::uuid;
    v_cantidad := (v_item ->> 'cantidad')::integer;

    if v_producto_id is null then
      raise exception 'El producto no es válido';
    end if;

    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'La cantidad debe ser mayor a 0';
    end if;

    select p.stock_actual, p.costo, p.precio_venta, p.nombre
      into v_stock_actual, v_costo, v_precio, v_producto_nombre
    from public.productos p
    where p.id = v_producto_id
    for update;

    if not found then
      raise exception 'El producto no existe (id: %)', v_producto_id;
    end if;

    if v_stock_actual < v_cantidad then
      raise exception 'Stock insuficiente para el producto % (disponible: %)',
        v_producto_nombre, v_stock_actual;
    end if;

    if v_precio is null or v_precio < 0 then
      raise exception 'El producto % tiene un precio de venta inválido',
        v_producto_nombre;
    end if;

    v_subtotal := v_precio * v_cantidad;
    v_total := coalesce(v_total, 0) + v_subtotal;

    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'producto_id', v_producto_id,
        'cantidad', v_cantidad,
        'precio_unitario', v_precio,
        'subtotal', v_subtotal,
        'costo_unitario', v_costo
      )
    );

    update public.productos
    set stock_actual = stock_actual - v_cantidad
    where id = v_producto_id;
  end loop;

  if v_total is null then
    raise exception 'No se pudo calcular el total de la venta';
  end if;

  -- Se inserta el total YA calculado. Nunca se inserta NULL.
  insert into public.ventas (total, metodo_pago, idempotency_key)
  values (v_total, p_metodo_pago, p_idempotency_key)
  returning id into v_venta_id;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    insert into public.detalle_ventas (
      venta_id,
      producto_id,
      cantidad,
      precio_unitario,
      subtotal,
      costo_unitario
    ) values (
      v_venta_id,
      (v_item ->> 'producto_id')::uuid,
      (v_item ->> 'cantidad')::integer,
      (v_item ->> 'precio_unitario')::numeric(12, 2),
      (v_item ->> 'subtotal')::numeric(12, 2),
      (v_item ->> 'costo_unitario')::numeric(12, 2)
    );
  end loop;

  return json_build_object(
    'venta_id', v_venta_id,
    'total', v_total,
    'idempotency_key', p_idempotency_key,
    'items', v_items
  );
end;
$$;

comment on function public.registrar_venta_caja(json, text, uuid) is
  'RPC transaccional directa de Caja; precio del servidor, stock bloqueado e idempotencia.';

revoke all on function public.registrar_venta_caja(json, text, uuid) from public;
revoke all on function public.registrar_venta_caja(json, text, uuid) from anon;
grant execute on function public.registrar_venta_caja(json, text, uuid) to authenticated;

commit;

-- Fuerza a PostgREST a recargar la firma nueva.
notify pgrst, 'reload schema';

-- Debe devolver la firma nueva y exactamente 1 fila.
select
  p.oid::regprocedure as rpc_activa,
  count(*) over () as firmas_ventas_caja
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'registrar_venta_caja';

select
  has_function_privilege(
    'anon',
    'public.registrar_venta_caja(json,text,uuid)',
    'EXECUTE'
  ) as anon_puede_cobrar,
  has_function_privilege(
    'authenticated',
    'public.registrar_venta_caja(json,text,uuid)',
    'EXECUTE'
  ) as autenticado_puede_cobrar;
