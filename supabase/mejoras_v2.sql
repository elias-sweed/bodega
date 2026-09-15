-- Fase 6.4: Mejoras de integridad y rendimiento (v2)
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de auth.sql, roles.sql, usuarios.sql.
--
-- Cambios:
--   1) detalle_ventas.costo_unitario: snapshot del costo al momento de la venta,
--      para que la "Ganancia neta" del historial sea exacta (no use el costo de hoy).
--   2) registrar_venta(): además captura costo; ahora exige estar en la whitelist
--      (es_miembro()) porque es SECURITY DEFINER y hoy CUALQUIER usuario de la
--      cuenta Supabase podría invocarla sin pasar por RLS.
--   3) registrar_ingreso() y registrar_ajuste_manual(): misma protección whitelist.
--   4) registrar_compra(): NUEVA. Registra TODA la compra en UNA transacción
--      (varios productos) y genera el compra_id en el servidor. Nunca deja la
--      compra registrada a medias.
--   5) actualizar_producto(): NUEVA. Edita el producto y, si cambió el stock,
--      lo hace en la MISMA transacción dejando traza en ingresos_mercaderia.
--      Solo administradores (es_admin()).
--   6) dashboard_resumen(): NUEVA. Devuelve en UN viaje los números del resumen.
--   7) es_miembro(): helper whitelist (igual patrón que es_admin()).
--   8) Se eliminan la tabla ajustes_stock y registrar_ajuste_stock (estaban sin
--      uso en la UI: todo ajuste se audita en ingresos_mercaderia).

-- ---------------------------------------------------------------------------
-- 1) Columna costo_unitario en detalle_ventas
-- ---------------------------------------------------------------------------
alter table public.detalle_ventas add column if not exists costo_unitario numeric(12, 2);

-- ---------------------------------------------------------------------------
-- 7) Helper de membresía (whitelist) para funciones RPC
-- ---------------------------------------------------------------------------
create or replace function public.es_miembro()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.usuarios_autorizados
    where email = auth.jwt() ->> 'email'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2) registrar_venta() con snapshot de costo + guard whitelist
-- ---------------------------------------------------------------------------
drop function if exists public.registrar_venta(json);
drop function if exists public.registrar_venta(json, text);

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
  v_nombre text;
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

    select stock_actual, costo, nombre into v_stock_actual, v_costo, v_nombre
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

-- ---------------------------------------------------------------------------
-- 3) Protección whitelist en registrar_ingreso y registrar_ajuste_manual
-- ---------------------------------------------------------------------------
create or replace function public.registrar_ingreso(
  p_compra_id uuid,
  p_proveedor_id uuid,
  p_nombre_proveedor text,
  p_producto_id uuid,
  p_cantidad integer,
  p_costo_total numeric(12, 2),
  p_comprobante text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ingreso_id uuid;
  v_stock_actual integer;
  v_costo_previo numeric(12, 2);
begin
  if not public.es_miembro() then
    raise exception 'No autorizado';
  end if;

  if p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0';
  end if;

  select stock_actual, costo
    into v_stock_actual, v_costo_previo
  from public.productos
  where id = p_producto_id
  for update;

  if not found then
    raise exception 'El producto no existe';
  end if;

  update public.productos
  set stock_actual = stock_actual + p_cantidad,
      costo = round(
        (coalesce(v_costo_previo, 0) * (v_stock_actual) + p_costo_total)
        / (v_stock_actual + p_cantidad),
        2
      )
  where id = p_producto_id
  returning stock_actual into v_stock_actual;

  insert into public.ingresos_mercaderia (compra_id, proveedor_id, nombre_proveedor, producto_id, cantidad_ingresada, costo_total, comprobante)
  values (p_compra_id, p_proveedor_id, nullif(trim(p_nombre_proveedor), ''), p_producto_id, p_cantidad, p_costo_total, nullif(trim(p_comprobante), ''))
  returning id into v_ingreso_id;

  return json_build_object('ingreso_id', v_ingreso_id, 'stock_actual', v_stock_actual);
end;
$$;

create or replace function public.registrar_ajuste_manual(
  p_producto_id uuid,
  p_nuevo_stock integer,
  p_es_regalo boolean,
  p_motivo text default 'Corrección de inventario'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock_actual integer;
  v_costo numeric(12, 2);
  v_delta integer;
  v_ingreso_id uuid;
  v_costo_total numeric(12, 2);
  v_motivo text;
begin
  if not public.es_miembro() then
    raise exception 'No autorizado';
  end if;

  if p_nuevo_stock < 0 then
    raise exception 'El stock no puede ser negativo';
  end if;

  v_motivo := coalesce(nullif(trim(p_motivo), ''), 'Corrección de inventario');

  select stock_actual, costo
    into v_stock_actual, v_costo
  from public.productos
  where id = p_producto_id
  for update;

  if not found then
    raise exception 'El producto no existe';
  end if;

  v_delta := p_nuevo_stock - v_stock_actual;

  if v_delta = 0 then
    return json_build_object('ingreso_id', null, 'stock_actual', v_stock_actual, 'delta', 0);
  end if;

  update public.productos
  set stock_actual = p_nuevo_stock
  where id = p_producto_id
  returning stock_actual into v_stock_actual;

  if v_delta > 0 then
    v_costo_total := case when coalesce(p_es_regalo, false) then 0 else round(v_costo * v_delta, 2) end;
  else
    v_costo_total := round(v_costo * v_delta, 2);
  end if;

  insert into public.ingresos_mercaderia (compra_id, proveedor_id, nombre_proveedor, producto_id, cantidad_ingresada, costo_total, comprobante, motivo)
  values (null, null, 'Ajuste Manual de Inventario', p_producto_id, v_delta, v_costo_total, null, v_motivo)
  returning id into v_ingreso_id;

  return json_build_object('ingreso_id', v_ingreso_id, 'stock_actual', v_stock_actual, 'delta', v_delta);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) registrar_compra(): compra atómica multi-producto
-- ---------------------------------------------------------------------------
create or replace function public.registrar_compra(
  p_proveedor_id uuid,
  p_nombre_proveedor text,
  p_comprobante text,
  p_items json
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
  v_stock_actual integer;
  v_total numeric(12, 2) := 0;
  v_count integer := 0;
begin
  if not public.es_miembro() then
    raise exception 'No autorizado';
  end if;

  if json_array_length(p_items) = 0 then
    raise exception 'La compra no tiene productos';
  end if;

  v_compra_id := gen_random_uuid();

  for v_item in select * from json_array_elements(p_items)
  loop
    v_producto_id := (v_item ->> 'producto_id')::uuid;
    v_cantidad := (v_item ->> 'cantidad')::integer;
    v_costo_total := (v_item ->> 'costo_total')::numeric(12, 2);

    if v_cantidad <= 0 then
      raise exception 'La cantidad debe ser mayor a 0';
    end if;
    if v_costo_total < 0 then
      raise exception 'El costo total no puede ser negativo';
    end if;

    select stock_actual, costo
      into v_stock_actual, v_costo_previo
    from public.productos
    where id = v_producto_id
    for update;

    if not found then
      raise exception 'El producto no existe (id: %)', v_producto_id;
    end if;

    update public.productos
    set stock_actual = stock_actual + v_cantidad,
        costo = round(
          (coalesce(v_costo_previo, 0) * v_stock_actual + v_costo_total)
          / (v_stock_actual + v_cantidad),
          2
        )
    where id = v_producto_id
    returning stock_actual into v_stock_actual;

    insert into public.ingresos_mercaderia (compra_id, proveedor_id, nombre_proveedor, producto_id, cantidad_ingresada, costo_total, comprobante)
    values (v_compra_id, p_proveedor_id, nullif(trim(p_nombre_proveedor), ''), v_producto_id, v_cantidad, v_costo_total, nullif(trim(p_comprobante), ''));

    v_total := v_total + v_costo_total;
    v_count := v_count + 1;
  end loop;

  return json_build_object('compra_id', v_compra_id, 'total', v_total, 'items', v_count);
end;
$$;

grant execute on function public.registrar_compra(uuid, text, text, json) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) actualizar_producto(): edición atómica con auditoría de stock
-- ---------------------------------------------------------------------------
create or replace function public.actualizar_producto(
  p_id uuid,
  p_nombre text,
  p_categoria text,
  p_codigo_barras text,
  p_precio_venta numeric(12, 2),
  p_costo numeric(12, 2),
  p_stock_minimo integer,
  p_nuevo_stock integer default null,
  p_motivo text default 'Corrección de inventario'
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
      stock_actual = case when p_nuevo_stock is null then stock_actual else p_nuevo_stock end
  where id = p_id;

  if v_delta <> 0 then
    insert into public.ingresos_mercaderia (compra_id, proveedor_id, nombre_proveedor, producto_id, cantidad_ingresada, costo_total, comprobante, motivo)
    values (null, null, 'Ajuste Manual de Inventario', p_id, v_delta, round(p_costo * v_delta, 2), null, 'Edición: ' || v_motivo);
  end if;

  return json_build_object('producto_id', p_id, 'stock_actual', p_nuevo_stock, 'delta', v_delta);
end;
$$;

grant execute on function public.actualizar_producto(uuid, text, text, text, numeric, numeric, integer, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) dashboard_resumen(): números del resumen en un solo viaje
-- ---------------------------------------------------------------------------
create or replace function public.dashboard_resumen()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoy timestamptz;
  v_inicio_mes timestamptz;
  v_ventas_hoy numeric(12, 2);
  v_conteo_hoy integer;
  v_efectivo numeric(12, 2);
  v_yape numeric(12, 2);
  v_plin numeric(12, 2);
  v_gasto_mes numeric(12, 2);
  v_ganancia_hoy numeric(12, 2);
  v_total_productos integer;
  v_bajos integer;
  v_agotados integer;
begin
  if not public.es_miembro() then
    raise exception 'No autorizado';
  end if;

  v_hoy := date_trunc('day', now() at time zone 'America/Lima') at time zone 'America/Lima';
  v_inicio_mes := date_trunc('month', now() at time zone 'America/Lima') at time zone 'America/Lima';

  select coalesce(sum(v.total), 0), count(*)
    into v_ventas_hoy, v_conteo_hoy
  from public.ventas v
  where v.fecha >= v_hoy;

  select coalesce(sum(total), 0) into v_efectivo from public.ventas where fecha >= v_hoy and metodo_pago = 'Efectivo';
  select coalesce(sum(total), 0) into v_yape from public.ventas where fecha >= v_hoy and metodo_pago = 'Yape';
  select coalesce(sum(total), 0) into v_plin from public.ventas where fecha >= v_hoy and metodo_pago = 'Plin';

  select coalesce(sum(costo_total), 0)
    into v_gasto_mes
  from public.ingresos_mercaderia
  where fecha >= v_inicio_mes and cantidad_ingresada > 0;

  select coalesce(sum(v.total - coalesce(d.costo_unitario, p.costo) * d.cantidad), 0)
    into v_ganancia_hoy
  from public.ventas v
  join public.detalle_ventas d on d.venta_id = v.id
  left join public.productos p on p.id = d.producto_id
  where v.fecha >= v_hoy;

  select count(*) into v_total_productos from public.productos;
  select count(*) into v_bajos from public.productos where stock_actual <= stock_minimo;
  select count(*) into v_agotados from public.productos where stock_actual <= 0;

  return json_build_object(
    'ventas_hoy_total', v_ventas_hoy,
    'ventas_hoy_count', v_conteo_hoy,
    'efectivo_hoy', v_efectivo,
    'yape_hoy', v_yape,
    'plin_hoy', v_plin,
    'gasto_compras_mes', v_gasto_mes,
    'ganancia_estimada_hoy', v_ganancia_hoy,
    'total_productos', v_total_productos,
    'bajos_stock', v_bajos,
    'agotados', v_agotados
  );
end;
$$;

grant execute on function public.dashboard_resumen() to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Eliminar el sistema de auditoría duplicado que quedó sin uso en la UI.
-- Todo ajuste de stock se audita en ingresos_mercaderia.
-- ---------------------------------------------------------------------------
drop function if exists public.registrar_ajuste_stock(uuid, text, integer, text);
drop function if exists public.registrar_ajuste_stock(uuid, text, integer);
drop table if exists public.ajustes_stock;