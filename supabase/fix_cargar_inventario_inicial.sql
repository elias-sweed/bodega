-- Corrección puntual para Inventario.
-- Ejecutar DESPUÉS de que existan las tablas productos, ingresos_mercaderia
-- y usuarios_autorizados. No reemplaza ni requiere ejecutar el SQL final completo.
--
-- Crea únicamente la RPC que usa la pantalla "Cargar inventario inicial".

create or replace function public.cargar_inventario_inicial(
  p_items json
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item json;
  v_tipo text;
  v_cantidad integer;
  v_product_id uuid;
  v_product public.productos;
  v_delta integer;
  v_nombre text;
  v_categoria text;
  v_codigo_barras text;
  v_precio_venta numeric(12, 2);
  v_costo numeric(12, 2);
  v_stock_minimo integer;
  v_creados integer := 0;
  v_actualizados integer := 0;
  v_unidades integer := 0;
  v_productos_vistos uuid[] := '{}'::uuid[];
begin
  if not exists (
    select 1
    from public.usuarios_autorizados
    where email = auth.jwt() ->> 'email'
      and rol = 'admin'
  ) then
    raise exception 'Solo el administrador puede cargar el inventario inicial';
  end if;

  if p_items is null
     or json_typeof(p_items) <> 'array'
     or json_array_length(p_items) = 0 then
    raise exception 'Agrega al menos un producto para cargar el inventario';
  end if;

  for v_item in
    select value from json_array_elements(p_items)
  loop
    v_tipo := lower(trim(coalesce(v_item ->> 'tipo', '')));
    v_cantidad := (v_item ->> 'cantidad')::integer;

    if v_cantidad is null or v_cantidad < 0 then
      raise exception 'La cantidad debe ser un numero entero igual o mayor a 0';
    end if;

    if v_tipo = 'existente' then
      v_product_id := nullif(trim(v_item ->> 'producto_id'), '')::uuid;

      if v_product_id is null then
        raise exception 'El producto seleccionado no es valido';
      end if;

      if v_product_id = any(v_productos_vistos) then
        raise exception 'El producto % fue agregado dos veces', v_product_id;
      end if;

      select *
        into v_product
        from public.productos
       where id = v_product_id
       for update;

      if not found then
        raise exception 'El producto % no existe', v_product_id;
      end if;

      if exists (
        select 1
        from public.detalle_ventas
        where producto_id = v_product_id
      ) or exists (
        select 1
        from public.ingresos_mercaderia
        where producto_id = v_product_id
      ) then
        raise exception 'El producto % ya tiene movimientos; usa Ajustar stock', v_product_id;
      end if;

      v_delta := v_cantidad - v_product.stock_actual;

      update public.productos
         set stock_actual = v_cantidad
       where id = v_product_id;

      if v_delta <> 0 then
        insert into public.ingresos_mercaderia (
          compra_id, proveedor_id, nombre_proveedor, producto_id,
          cantidad_ingresada, costo_total, comprobante, motivo
        ) values (
          null, null, 'Ajuste Manual de Inventario', v_product_id,
          v_delta, round(v_product.costo * v_delta, 2), null, 'Stock inicial'
        );
      end if;

      v_productos_vistos := array_append(v_productos_vistos, v_product_id);
      v_actualizados := v_actualizados + 1;

    elsif v_tipo = 'nuevo' then
      v_nombre := nullif(trim(v_item ->> 'nombre'), '');
      v_categoria := nullif(trim(v_item ->> 'categoria'), '');
      v_codigo_barras := nullif(trim(coalesce(v_item ->> 'codigo_barras', '')), '');
      v_precio_venta := (v_item ->> 'precio_venta')::numeric(12, 2);
      -- En la primera carga no se conoce el costo: se deja en cero.
      v_costo := coalesce((v_item ->> 'costo')::numeric(12, 2), 0);
      v_stock_minimo := coalesce((v_item ->> 'stock_minimo')::integer, 5);

      if v_nombre is null or v_categoria is null then
        raise exception 'Nombre y categoria son obligatorios para productos nuevos';
      end if;
      if v_precio_venta is null or v_precio_venta < 0 then
        raise exception 'El precio de venta no puede ser negativo';
      end if;
      if v_stock_minimo < 0 then
        raise exception 'El stock minimo no puede ser negativo';
      end if;
      if exists (
        select 1
        from public.productos
        where lower(trim(nombre)) = lower(v_nombre)
      ) then
        raise exception 'Ya existe un producto con el nombre %', v_nombre;
      end if;
      if v_codigo_barras is not null and exists (
        select 1
        from public.productos
        where codigo_barras = v_codigo_barras
      ) then
        raise exception 'El codigo de barras ya esta asignado a otro producto';
      end if;

      insert into public.productos (
        nombre, categoria, codigo_barras, precio_venta, costo,
        stock_actual, stock_minimo
      ) values (
        v_nombre, v_categoria, v_codigo_barras, v_precio_venta, v_costo,
        v_cantidad, v_stock_minimo
      )
      returning * into v_product;

      if v_cantidad > 0 then
        insert into public.ingresos_mercaderia (
          compra_id, proveedor_id, nombre_proveedor, producto_id,
          cantidad_ingresada, costo_total, comprobante, motivo
        ) values (
          null, null, 'Ajuste Manual de Inventario', v_product.id,
          v_cantidad, 0, null, 'Stock inicial'
        );
      end if;

      v_creados := v_creados + 1;
    else
      raise exception 'Tipo de producto no valido: %', v_tipo;
    end if;

    v_unidades := v_unidades + v_cantidad;
  end loop;

  return json_build_object(
    'productos', v_creados + v_actualizados,
    'creados', v_creados,
    'actualizados', v_actualizados,
    'unidades', v_unidades
  );
end;
$$;

revoke execute on function public.cargar_inventario_inicial(json) from public, anon;
grant execute on function public.cargar_inventario_inicial(json) to authenticated;

-- Debe devolver la firma de la RPC recién creada.
select to_regprocedure('public.cargar_inventario_inicial(json)') as rpc_inventario_inicial;
