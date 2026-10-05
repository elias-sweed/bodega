-- Servicios: que crear_producto y actualizar_producto guarden tipo/consumo.
-- Antes la RPC ignoraba esos campos y el "servicio" quedaba como producto,
-- por eso aparecía como agotado en Caja e Inventario.
-- Ejecutar en el SQL Editor de Supabase (idempotente).

drop function if exists public.crear_producto(text, text, text, numeric, numeric, integer, integer);

create function public.crear_producto(
  p_nombre text,
  p_categoria text,
  p_codigo_barras text,
  p_precio_venta numeric(12, 2),
  p_costo numeric(12, 2),
  p_stock_inicial integer,
  p_stock_minimo integer,
  p_tipo text default 'producto',
  p_consumo_producto_id uuid default null,
  p_consumo_por_unidad integer default 0
)
returns public.productos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_producto public.productos;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede crear productos';
  end if;
  if nullif(trim(p_nombre), '') is null or nullif(trim(p_categoria), '') is null then
    raise exception 'Nombre y categoría son obligatorios';
  end if;
  if p_precio_venta < 0 or p_costo < 0
     or p_stock_inicial < 0 or p_stock_minimo < 0 then
    raise exception 'Los valores no pueden ser negativos';
  end if;
  if p_tipo not in ('producto', 'servicio') then
    raise exception 'Tipo no válido: %', p_tipo;
  end if;

  insert into public.productos (
    nombre, categoria, codigo_barras, precio_venta, costo,
    stock_actual, stock_minimo, tipo,
    consumo_producto_id, consumo_por_unidad
  ) values (
    trim(p_nombre), trim(p_categoria), nullif(trim(p_codigo_barras), ''),
    p_precio_venta, p_costo, 0, p_stock_minimo, p_tipo,
    case when p_tipo = 'servicio' then p_consumo_producto_id else null end,
    case when p_tipo = 'servicio' then greatest(0, coalesce(p_consumo_por_unidad, 0)) else 0 end
  )
  returning * into v_producto;

  if p_tipo = 'producto' and p_stock_inicial > 0 then
    insert into public.ingresos_mercaderia (
      compra_id, proveedor_id, nombre_proveedor, producto_id,
      cantidad_ingresada, costo_total, comprobante, motivo
    ) values (
      null, null, 'Ajuste Manual de Inventario', v_producto.id,
      p_stock_inicial, round(p_costo * p_stock_inicial, 2), null, 'Stock inicial'
    );
    update public.productos
    set stock_actual = p_stock_inicial
    where id = v_producto.id
    returning * into v_producto;
  end if;

  return v_producto;
end;
$$;

grant execute on function public.crear_producto(text, text, text, numeric, numeric, integer, integer, text, uuid, integer) to authenticated;

drop function if exists public.actualizar_producto(uuid, text, text, text, numeric, numeric, integer, integer, text);

create function public.actualizar_producto(
  p_id uuid,
  p_nombre text,
  p_categoria text,
  p_codigo_barras text,
  p_precio_venta numeric(12, 2),
  p_costo numeric(12, 2),
  p_stock_minimo integer,
  p_nuevo_stock integer default null,
  p_motivo text default 'Corrección de inventario',
  p_tipo text default null,
  p_consumo_producto_id uuid default null,
  p_consumo_por_unidad integer default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock_actual integer;
  v_delta integer;
  v_motivo text;
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede editar productos';
  end if;

  if nullif(trim(p_nombre), '') is null then
    raise exception 'El nombre del producto es obligatorio';
  end if;
  if nullif(trim(p_categoria), '') is null then
    raise exception 'La categoría es obligatoria';
  end if;
  if p_precio_venta < 0 or p_costo < 0 or p_stock_minimo < 0 then
    raise exception 'Los valores no pueden ser negativos';
  end if;
  if p_tipo is not null and p_tipo not in ('producto', 'servicio') then
    raise exception 'Tipo no válido: %', p_tipo;
  end if;

  v_motivo := coalesce(nullif(trim(p_motivo), ''), 'Corrección de inventario');

  select stock_actual into v_stock_actual
  from public.productos
  where id = p_id
  for update;

  if not found then
    raise exception 'El producto no existe';
  end if;

  if p_nuevo_stock is null then
    v_delta := 0;
  else
    if p_nuevo_stock < 0 then
      raise exception 'El stock no puede ser negativo';
    end if;
    v_delta := p_nuevo_stock - v_stock_actual;
  end if;

  update public.productos
  set nombre = p_nombre,
      categoria = p_categoria,
      codigo_barras = nullif(trim(p_codigo_barras), ''),
      precio_venta = p_precio_venta,
      costo = p_costo,
      stock_minimo = p_stock_minimo,
      tipo = coalesce(p_tipo, tipo),
      consumo_producto_id = case
        when coalesce(p_tipo, tipo) = 'servicio' then p_consumo_producto_id
        else consumo_producto_id
      end,
      consumo_por_unidad = case
        when coalesce(p_tipo, tipo) = 'servicio' then greatest(0, coalesce(p_consumo_por_unidad, 0))
        else consumo_por_unidad
      end,
      stock_actual = case when p_nuevo_stock is null then stock_actual else p_nuevo_stock end
  where id = p_id;

  if v_delta <> 0 then
    insert into public.ingresos_mercaderia (compra_id, proveedor_id, nombre_proveedor, producto_id, cantidad_ingresada, costo_total, comprobante, motivo)
    values (null, null, 'Ajuste Manual de Inventario', p_id, v_delta, round(p_costo * v_delta, 2), null, 'Edición: ' || v_motivo);
  end if;

  return json_build_object('producto_id', p_id, 'stock_actual', p_nuevo_stock, 'delta', v_delta);
end;
$$;

grant execute on function public.actualizar_producto(uuid, text, text, text, numeric, numeric, integer, integer, text, text, uuid, integer) to authenticated;
