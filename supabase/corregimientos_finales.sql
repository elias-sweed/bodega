-- Corrección final e integrada de Bodega POS.
-- Ejecutar DESPUÉS de schema.sql, ventas.sql, compras.sql, auth.sql, roles.sql,
-- usuarios.sql, mejoras.sql y mejoras_v2.sql.
-- Es idempotente para las tareas correctoras. No reemplaza datos existentes.

-- ============================================================================
-- 1) Columnas, restricciones e índices que exige el frontend final
-- ============================================================================

alter table public.ventas
  add column if not exists origen text not null default 'sistema';
alter table public.ventas
  add column if not exists ticket_externo text;
alter table public.ventas
  add column if not exists idempotency_key uuid;
alter table public.ventas
  add column if not exists creado_por text;

alter table public.detalle_ventas
  add column if not exists costo_unitario numeric(12, 2);

alter table public.ingresos_mercaderia
  add column if not exists created_at timestamptz;
update public.ingresos_mercaderia
set created_at = fecha
where created_at is null;
alter table public.ingresos_mercaderia
  alter column created_at set default now(),
  alter column created_at set not null;
alter table public.ingresos_mercaderia
  add column if not exists creado_por text;

create unique index if not exists ventas_idempotency_key_uidx
  on public.ventas (idempotency_key)
  where idempotency_key is not null;

create unique index if not exists ventas_origen_ticket_uidx
  on public.ventas (origen, ticket_externo)
  where ticket_externo is not null;

create index if not exists ventas_fecha_idx on public.ventas (fecha);
create index if not exists ingresos_mercaderia_created_at_idx
  on public.ingresos_mercaderia (created_at);
create index if not exists ingresos_mercaderia_compra_producto_idx
  on public.ingresos_mercaderia (compra_id, producto_id);

-- Las restricciones NOT VALID protegen nuevas escrituras sin bloquear la
-- corrección de eventuales filas históricas que deban revisarse primero.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.productos'::regclass
      and conname = 'productos_stock_actual_no_negativo_check'
  ) then
    alter table public.productos
      add constraint productos_stock_actual_no_negativo_check
      check (stock_actual >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.productos'::regclass
      and conname = 'productos_stock_minimo_no_negativo_check'
  ) then
    alter table public.productos
      add constraint productos_stock_minimo_no_negativo_check
      check (stock_minimo >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ventas'::regclass
      and conname = 'ventas_metodo_pago_check'
  ) then
    alter table public.ventas
      add constraint ventas_metodo_pago_check
      check (metodo_pago in ('Efectivo', 'Yape', 'Plin')) not valid;
  end if;
end $$;

-- ============================================================================
-- 2) Helpers de autorización
-- ============================================================================

create or replace function public.es_miembro()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.usuarios_autorizados
    where email = auth.jwt() ->> 'email'
  );
$$;

create or replace function public.es_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.usuarios_autorizados
    where email = auth.jwt() ->> 'email'
      and rol = 'admin'
  );
$$;

-- ============================================================================
-- 3) Autoría de ventas e ingresos
-- ============================================================================

create or replace function public.set_creado_por()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.creado_por is null or btrim(new.creado_por) = '' then
    new.creado_por := auth.jwt() ->> 'email';
  end if;
  return new;
end;
$$;

drop trigger if exists ventas_set_creado_por on public.ventas;
create trigger ventas_set_creado_por
before insert on public.ventas
for each row execute function public.set_creado_por();

drop trigger if exists ingresos_set_creado_por on public.ingresos_mercaderia;
create trigger ingresos_set_creado_por
before insert on public.ingresos_mercaderia
for each row execute function public.set_creado_por();

-- ============================================================================
-- 4) Venta normal: precio del servidor + idempotencia + stock atómico
-- ============================================================================

-- Eliminar todas las firmas anteriores (incluidas jsonb o firmas antiguas)
-- para que PostgREST resuelva una única RPC canónica.
do $$
declare
  r record;
begin
  for r in
    select
      p.proname,
      pg_get_function_identity_arguments(p.oid) as argumentos
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('registrar_venta', 'registrar_venta_caja')
  loop
    execute format(
      'drop function public.%I(%s) cascade',
      r.proname,
      r.argumentos
    );
  end loop;
end $$;

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
  v_item json;
  v_producto_id uuid;
  v_producto_nombre text;
  v_cantidad integer;
  v_precio numeric(12, 2);
  v_costo numeric(12, 2);
  v_subtotal numeric(12, 2);
  v_total numeric(12, 2) := 0;
  v_stock_actual integer;
  v_items json := '[]'::json;
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

  perform pg_advisory_xact_lock(
    hashtextextended(p_idempotency_key::text, 0)
  );

  select v.id, v.total
    into v_venta_id, v_total
  from public.ventas v
  where v.idempotency_key = p_idempotency_key;

  if found then
    select coalesce(json_agg(json_build_object(
      'producto_id', d.producto_id,
      'cantidad', d.cantidad,
      'precio_unitario', d.precio_unitario,
      'subtotal', d.subtotal
    ) order by d.id), '[]'::json)
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

  insert into public.ventas (total, metodo_pago, idempotency_key)
  values (0, p_metodo_pago, p_idempotency_key)
  returning id into v_venta_id;

  for v_item in select * from json_array_elements(p_articulos)
  loop
    v_producto_id := (v_item ->> 'producto_id')::uuid;
    v_cantidad := (v_item ->> 'cantidad')::integer;

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

    v_subtotal := v_precio * v_cantidad;
    v_total := v_total + v_subtotal;

    insert into public.detalle_ventas (
      venta_id, producto_id, cantidad, precio_unitario, subtotal, costo_unitario
    ) values (
      v_venta_id, v_producto_id, v_cantidad, v_precio, v_subtotal, v_costo
    );

    update public.productos
    set stock_actual = stock_actual - v_cantidad
    where id = v_producto_id;
  end loop;

  update public.ventas
  set total = v_total
  where id = v_venta_id;

  select coalesce(json_agg(json_build_object(
    'producto_id', d.producto_id,
    'cantidad', d.cantidad,
    'precio_unitario', d.precio_unitario,
    'subtotal', d.subtotal
  ) order by d.id), '[]'::json)
    into v_items
  from public.detalle_ventas d
  where d.venta_id = v_venta_id;

  return json_build_object(
    'venta_id', v_venta_id,
    'total', v_total,
    'idempotency_key', p_idempotency_key,
    'items', v_items
  );
end;
$$;

-- ============================================================================
-- 5) Backfill: solo ADMIN, ticket único y nunca deja stock negativo
-- ============================================================================

drop function if exists public.registrar_venta_backfill(json, text, timestamptz, text);

create function public.registrar_venta_backfill(
  p_articulos json,
  p_metodo_pago text,
  p_fecha timestamptz,
  p_ticket text
)
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
  v_ticket text := nullif(btrim(coalesce(p_ticket, '')), '');
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede importar ventas';
  end if;

  if v_ticket is null then
    raise exception 'El ticket no puede estar vacío';
  end if;

  if p_metodo_pago is null
     or p_metodo_pago not in ('Efectivo', 'Yape', 'Plin') then
    raise exception 'Método de pago inválido';
  end if;

  if p_fecha is null or p_fecha > now() + interval '1 day' then
    raise exception 'La fecha de la venta no es válida';
  end if;

  if p_articulos is null
     or json_typeof(p_articulos) <> 'array'
     or json_array_length(p_articulos) = 0 then
    raise exception 'La venta no tiene productos';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_ticket, 2));

  if exists (
    select 1 from public.ventas
    where origen = 'excel' and ticket_externo = v_ticket
  ) then
    raise exception 'VENTA_DUPLICADA:%', v_ticket;
  end if;

  insert into public.ventas (fecha, total, metodo_pago, origen, ticket_externo)
  values (p_fecha, 0, p_metodo_pago, 'excel', v_ticket)
  returning id into v_venta_id;

  for v_item in select * from json_array_elements(p_articulos)
  loop
    v_producto_id := (v_item ->> 'producto_id')::uuid;
    v_cantidad := (v_item ->> 'cantidad')::integer;
    v_precio := (v_item ->> 'precio_unitario')::numeric(12, 2);

    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'Cantidad inválida para el producto %', v_producto_id;
    end if;
    if v_precio is null or v_precio < 0 then
      raise exception 'Precio inválido para el producto %', v_producto_id;
    end if;

    select p.stock_actual, p.costo
      into v_stock_actual, v_costo
    from public.productos p
    where p.id = v_producto_id
    for update;

    if not found then
      raise exception 'El producto % no existe', v_producto_id;
    end if;

    if v_stock_actual < v_cantidad then
      raise exception 'Stock insuficiente para el producto % (disponible: %)',
        v_producto_id, v_stock_actual;
    end if;

    v_subtotal := v_precio * v_cantidad;
    v_total := v_total + v_subtotal;

    insert into public.detalle_ventas (
      venta_id, producto_id, cantidad, precio_unitario, subtotal, costo_unitario
    ) values (
      v_venta_id, v_producto_id, v_cantidad, v_precio, v_subtotal, v_costo
    );

    update public.productos
    set stock_actual = stock_actual - v_cantidad
    where id = v_producto_id;
  end loop;

  update public.ventas set total = v_total where id = v_venta_id;

  return json_build_object(
    'venta_id', v_venta_id,
    'total', v_total,
    'idempotency_key', v_ticket,
    'stock_negativo', false
  );
end;
$$;

-- ============================================================================
-- 6) Compras: ADMIN, costo válido, costo promedio e idempotencia
-- ============================================================================

drop function if exists public.registrar_compra(uuid, text, text, json, uuid);
drop function if exists public.registrar_compra(uuid, text, text, json);

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

  for v_item in select * from json_array_elements(p_items)
  loop
    v_producto_id := (v_item ->> 'producto_id')::uuid;
    v_cantidad := (v_item ->> 'cantidad')::integer;
    v_costo_total := (v_item ->> 'costo_total')::numeric(12, 2);

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

    update public.productos
    set stock_actual = stock_actual + v_cantidad,
        costo = round(
          (coalesce(v_costo_previo, 0) * v_stock_actual + v_costo_total)
          / (v_stock_actual + v_cantidad),
          2
        )
    where id = v_producto_id;

    insert into public.ingresos_mercaderia (
      compra_id, proveedor_id, nombre_proveedor, producto_id,
      cantidad_ingresada, costo_total, comprobante
    ) values (
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

-- ============================================================================
-- 7) Ajustes y edición de producto: una sola vía atómica, solo ADMIN
-- ============================================================================

drop function if exists public.registrar_ajuste_manual(uuid, integer, boolean, text);

create function public.registrar_ajuste_manual(
  p_producto_id uuid,
  p_nuevo_stock integer,
  p_es_regalo boolean default false,
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
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ajustar el stock';
  end if;

  if p_nuevo_stock < 0 then
    raise exception 'El stock no puede ser negativo';
  end if;

  v_motivo := coalesce(nullif(trim(p_motivo), ''), 'Corrección de inventario');

  select stock_actual, costo into v_stock_actual, v_costo
  from public.productos
  where id = p_producto_id
  for update;

  if not found then
    raise exception 'El producto no existe';
  end if;

  v_delta := p_nuevo_stock - v_stock_actual;
  if v_delta = 0 then
    return json_build_object(
      'ingreso_id', null,
      'stock_actual', v_stock_actual,
      'delta', 0
    );
  end if;

  update public.productos
  set stock_actual = p_nuevo_stock
  where id = p_producto_id;

  v_costo_total := case
    when v_delta > 0 and coalesce(p_es_regalo, false) then 0
    else round(v_costo * v_delta, 2)
  end;

  insert into public.ingresos_mercaderia (
    compra_id, proveedor_id, nombre_proveedor, producto_id,
    cantidad_ingresada, costo_total, comprobante, motivo
  ) values (
    null, null, 'Ajuste Manual de Inventario', p_producto_id,
    v_delta, v_costo_total, null, v_motivo
  )
  returning id into v_ingreso_id;

  return json_build_object(
    'ingreso_id', v_ingreso_id,
    'stock_actual', p_nuevo_stock,
    'delta', v_delta
  );
end;
$$;

drop function if exists public.actualizar_producto(
  uuid, text, text, text, numeric, numeric, integer, integer, text
);

create function public.actualizar_producto(
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
  v_stock_final integer;
  v_delta integer;
  v_motivo text;
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede editar productos';
  end if;

  if nullif(trim(p_nombre), '') is null or nullif(trim(p_categoria), '') is null then
    raise exception 'Nombre y categoría son obligatorios';
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

  v_stock_final := coalesce(p_nuevo_stock, v_stock_actual);
  if v_stock_final < 0 then
    raise exception 'El stock no puede ser negativo';
  end if;
  v_delta := v_stock_final - v_stock_actual;

  update public.productos
  set nombre = p_nombre,
      categoria = p_categoria,
      codigo_barras = nullif(trim(p_codigo_barras), ''),
      precio_venta = p_precio_venta,
      costo = p_costo,
      stock_minimo = p_stock_minimo,
      stock_actual = v_stock_final
  where id = p_id;

  if v_delta <> 0 then
    insert into public.ingresos_mercaderia (
      compra_id, proveedor_id, nombre_proveedor, producto_id,
      cantidad_ingresada, costo_total, comprobante, motivo
    ) values (
      null, null, 'Ajuste Manual de Inventario', p_id,
      v_delta, round(p_costo * v_delta, 2), null, 'Edición: ' || v_motivo
    );
  end if;

  return json_build_object(
    'producto_id', p_id,
    'stock_actual', v_stock_final,
    'delta', v_delta
  );
end;
$$;

-- Crear producto y registrar el stock inicial en una sola operación.
drop function if exists public.crear_producto(
  text, text, text, numeric, numeric, integer, integer
);

create function public.crear_producto(
  p_nombre text,
  p_categoria text,
  p_codigo_barras text,
  p_precio_venta numeric(12, 2),
  p_costo numeric(12, 2),
  p_stock_inicial integer,
  p_stock_minimo integer
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

  insert into public.productos (
    nombre, categoria, codigo_barras, precio_venta, costo,
    stock_actual, stock_minimo
  ) values (
    trim(p_nombre), trim(p_categoria), nullif(trim(p_codigo_barras), ''),
    p_precio_venta, p_costo, 0, p_stock_minimo
  )
  returning * into v_producto;

  if p_stock_inicial > 0 then
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

-- La función antigua queda como primitiva admin y valida costo/no negativos.
drop function if exists public.registrar_ingreso(
  uuid, uuid, text, uuid, integer, numeric, text
);

create function public.registrar_ingreso(
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
  if not public.es_admin() then
    raise exception 'Solo un administrador puede registrar ingresos';
  end if;
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0';
  end if;
  if p_costo_total is null or p_costo_total < 0 then
    raise exception 'El costo total no puede ser negativo';
  end if;

  select stock_actual, costo into v_stock_actual, v_costo_previo
  from public.productos
  where id = p_producto_id
  for update;

  if not found then
    raise exception 'El producto no existe';
  end if;

  update public.productos
  set stock_actual = stock_actual + p_cantidad,
      costo = round(
        (coalesce(v_costo_previo, 0) * v_stock_actual + p_costo_total)
        / (v_stock_actual + p_cantidad),
        2
      )
  where id = p_producto_id
  returning stock_actual into v_stock_actual;

  insert into public.ingresos_mercaderia (
    compra_id, proveedor_id, nombre_proveedor, producto_id,
    cantidad_ingresada, costo_total, comprobante
  ) values (
    p_compra_id, p_proveedor_id, nullif(trim(p_nombre_proveedor), ''),
    p_producto_id, p_cantidad, p_costo_total, nullif(trim(p_comprobante), '')
  )
  returning id into v_ingreso_id;

  return json_build_object(
    'ingreso_id', v_ingreso_id,
    'stock_actual', v_stock_actual
  );
end;
$$;

-- ============================================================================
-- 8) Resumen: mismas fuentes que historial y sin doble conteo
-- ============================================================================

drop function if exists public.dashboard_resumen();

create function public.dashboard_resumen()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoy timestamptz;
  v_inicio_mes timestamptz;
  v_ventas_hoy numeric(14, 2);
  v_conteo_hoy integer;
  v_efectivo numeric(14, 2);
  v_yape numeric(14, 2);
  v_plin numeric(14, 2);
  v_gasto_mes numeric(14, 2);
  v_ganancia_hoy numeric(14, 2);
  v_total_productos integer;
  v_bajos integer;
  v_agotados integer;
begin
  if not public.es_miembro() then
    raise exception 'No autorizado';
  end if;

  v_hoy := date_trunc('day', now() at time zone 'America/Lima')
    at time zone 'America/Lima';
  v_inicio_mes := date_trunc('month', now() at time zone 'America/Lima')
    at time zone 'America/Lima';

  select coalesce(sum(v.total), 0), count(*)
    into v_ventas_hoy, v_conteo_hoy
  from public.ventas v
  where v.fecha >= v_hoy and v.fecha <= now();

  select
    coalesce(sum(total) filter (where metodo_pago = 'Efectivo'), 0),
    coalesce(sum(total) filter (where metodo_pago = 'Yape'), 0),
    coalesce(sum(total) filter (where metodo_pago = 'Plin'), 0)
  into v_efectivo, v_yape, v_plin
  from public.ventas
  where fecha >= v_hoy and fecha <= now();

  select coalesce(sum(costo_total), 0)
    into v_gasto_mes
  from public.ingresos_mercaderia
  where created_at >= v_inicio_mes
    and created_at <= now()
    and cantidad_ingresada > 0
    and compra_id is not null;

  select coalesce(sum(
    d.subtotal - coalesce(d.costo_unitario, p.costo) * d.cantidad
  ), 0)
    into v_ganancia_hoy
  from public.ventas v
  join public.detalle_ventas d on d.venta_id = v.id
  left join public.productos p on p.id = d.producto_id
  where v.fecha >= v_hoy and v.fecha <= now();

  select count(*) into v_total_productos from public.productos;
  select count(*) into v_bajos
    from public.productos
    where stock_actual <= stock_minimo;
  select count(*) into v_agotados
    from public.productos
    where stock_actual <= 0;

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

-- ============================================================================
-- 9) Gestión de usuarios: el último admin queda protegido en la BD
-- ============================================================================

drop function if exists public.cambiar_rol_usuario(text, text);

create function public.cambiar_rol_usuario(p_email text, p_rol text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_rol_actual text;
  v_otros_admin integer;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar roles';
  end if;
  if p_rol not in ('admin', 'cajero') then
    raise exception 'Rol inválido';
  end if;

  select rol into v_rol_actual
  from public.usuarios_autorizados
  where email = v_email
  for update;

  if v_rol_actual is null then
    raise exception 'El usuario no existe';
  end if;

  if v_rol_actual = 'admin' and p_rol <> 'admin' then
    select count(*) into v_otros_admin
    from public.usuarios_autorizados
    where rol = 'admin' and email <> v_email;
    if v_otros_admin = 0 then
      raise exception 'No se puede quitar el rol del último administrador';
    end if;
  end if;

  update public.usuarios_autorizados
  set rol = p_rol
  where email = v_email;

  return json_build_object('email', v_email, 'rol', p_rol);
end;
$$;

drop function if exists public.eliminar_usuario_autorizado(text);

create function public.eliminar_usuario_autorizado(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_rol_actual text;
  v_otros_admin integer;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede quitar accesos';
  end if;
  if v_email = lower(auth.jwt() ->> 'email') then
    raise exception 'No puedes quitarte tu propio acceso';
  end if;

  select rol into v_rol_actual
  from public.usuarios_autorizados
  where email = v_email
  for update;

  if v_rol_actual is null then
    raise exception 'El usuario no existe';
  end if;

  if v_rol_actual = 'admin' then
    select count(*) into v_otros_admin
    from public.usuarios_autorizados
    where rol = 'admin' and email <> v_email;
    if v_otros_admin = 0 then
      raise exception 'No se puede quitar al último administrador';
    end if;
  end if;

  delete from public.usuarios_autorizados where email = v_email;
  return true;
end;
$$;

-- ============================================================================
-- 10) RLS final: lectura para miembros; administration solo para ADMIN
-- ============================================================================

alter table public.productos enable row level security;
alter table public.ventas enable row level security;
alter table public.detalle_ventas enable row level security;
alter table public.proveedores enable row level security;
alter table public.ingresos_mercaderia enable row level security;
alter table public.usuarios_autorizados enable row level security;

drop policy if exists productos_select on public.productos;
drop policy if exists productos_insert on public.productos;
drop policy if exists productos_update on public.productos;
drop policy if exists productos_delete on public.productos;
drop policy if exists productos_select_authenticated on public.productos;
drop policy if exists productos_insert_authenticated on public.productos;
drop policy if exists productos_update_authenticated on public.productos;
drop policy if exists productos_delete_authenticated on public.productos;
drop policy if exists ventas_select on public.ventas;
drop policy if exists ventas_select_authenticated on public.ventas;
drop policy if exists detalle_ventas_select on public.detalle_ventas;
drop policy if exists detalle_ventas_select_authenticated on public.detalle_ventas;
drop policy if exists proveedores_select on public.proveedores;
drop policy if exists proveedores_select_authenticated on public.proveedores;
drop policy if exists proveedores_insert_authenticated on public.proveedores;
drop policy if exists proveedores_update_authenticated on public.proveedores;
drop policy if exists proveedores_delete_authenticated on public.proveedores;
drop policy if exists ingresos_select on public.ingresos_mercaderia;
drop policy if exists ingresos_select_authenticated on public.ingresos_mercaderia;
drop policy if exists usuarios_autorizados_select_own on public.usuarios_autorizados;
drop policy if exists usuarios_autorizados_select_admin on public.usuarios_autorizados;
drop policy if exists usuarios_autorizados_insert_admin on public.usuarios_autorizados;
drop policy if exists usuarios_autorizados_update_admin on public.usuarios_autorizados;
drop policy if exists usuarios_autorizados_delete_admin on public.usuarios_autorizados;

create policy productos_select_miembro on public.productos
for select to authenticated using (public.es_miembro());
create policy productos_insert_admin on public.productos
for insert to authenticated with check (public.es_admin());
create policy productos_update_admin on public.productos
for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy productos_delete_admin on public.productos
for delete to authenticated using (public.es_admin());

create policy ventas_select_miembro on public.ventas
for select to authenticated using (public.es_miembro());
create policy detalle_ventas_select_miembro on public.detalle_ventas
for select to authenticated using (public.es_miembro());
create policy proveedores_select_miembro on public.proveedores
for select to authenticated using (public.es_miembro());
create policy proveedores_insert_admin on public.proveedores
for insert to authenticated with check (public.es_admin());
create policy proveedores_update_admin on public.proveedores
for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy proveedores_delete_admin on public.proveedores
for delete to authenticated using (public.es_admin());
create policy ingresos_select_miembro on public.ingresos_mercaderia
for select to authenticated using (public.es_miembro());

create policy usuarios_autorizados_select_own on public.usuarios_autorizados
for select to authenticated
using (email = auth.jwt() ->> 'email' or public.es_admin());

-- No hay INSERT/UPDATE/DELETE directo de usuarios: se usan Edge/RPC y RLS.

-- ============================================================================
-- 11) Grants explícitos: fuera anon y fuera PUBLIC
-- ============================================================================

revoke execute on function public.es_miembro() from public, anon;
revoke execute on function public.es_admin() from public, anon;
revoke execute on function public.set_creado_por() from public, anon, authenticated;
revoke execute on function public.registrar_venta_caja(json, text, uuid) from public, anon;
revoke execute on function public.registrar_venta_backfill(json, text, timestamptz, text) from public, anon;
revoke execute on function public.registrar_compra(uuid, text, text, json, uuid) from public, anon;
revoke execute on function public.registrar_ingreso(uuid, uuid, text, uuid, integer, numeric, text) from public, anon;
revoke execute on function public.registrar_ajuste_manual(uuid, integer, boolean, text) from public, anon;
revoke execute on function public.actualizar_producto(uuid, text, text, text, numeric, numeric, integer, integer, text) from public, anon;
revoke execute on function public.crear_producto(text, text, text, numeric, numeric, integer, integer) from public, anon;
revoke execute on function public.dashboard_resumen() from public, anon;
revoke execute on function public.cambiar_rol_usuario(text, text) from public, anon;
revoke execute on function public.eliminar_usuario_autorizado(text) from public, anon;

grant execute on function public.es_miembro() to authenticated;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.registrar_venta_caja(json, text, uuid) to authenticated;
grant execute on function public.registrar_venta_backfill(json, text, timestamptz, text) to authenticated;
grant execute on function public.registrar_compra(uuid, text, text, json, uuid) to authenticated;
grant execute on function public.registrar_ingreso(uuid, uuid, text, uuid, integer, numeric, text) to authenticated;
grant execute on function public.registrar_ajuste_manual(uuid, integer, boolean, text) to authenticated;
grant execute on function public.actualizar_producto(uuid, text, text, text, numeric, numeric, integer, integer, text) to authenticated;
grant execute on function public.crear_producto(text, text, text, numeric, numeric, integer, integer) to authenticated;
grant execute on function public.dashboard_resumen() to authenticated;
grant execute on function public.cambiar_rol_usuario(text, text) to authenticated;
grant execute on function public.eliminar_usuario_autorizado(text) to authenticated;

-- ============================================================================
-- 12) Fuera el sistema legacy de ajustes y Realtime idempotente
-- ============================================================================

drop function if exists public.registrar_ajuste_stock(uuid, text, integer, text);
drop function if exists public.registrar_ajuste_stock(uuid, text, integer);
drop table if exists public.ajustes_stock;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'productos'
  ) then
    alter publication supabase_realtime add table public.productos;
  end if;
end $$;

-- ============================================================================
-- 13) Carga de inventario inicial (solo ADMIN, atomica)
-- ============================================================================
-- Registra lo que ya existe fisicamente en la bodega como "Stock inicial".
-- No crea compras, proveedores ni gastos. Los productos que ya tienen
-- movimientos deben corregirse desde "Ajustar stock", no desde este flujo.
drop function if exists public.cargar_inventario_inicial(json);

create function public.cargar_inventario_inicial(
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
  if not public.es_admin() then
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
        0, v_stock_minimo
      )
      returning * into v_product;

      if v_cantidad > 0 then
        insert into public.ingresos_mercaderia (
          compra_id, proveedor_id, nombre_proveedor, producto_id,
          cantidad_ingresada, costo_total, comprobante, motivo
        ) values (
          null, null, 'Ajuste Manual de Inventario', v_product.id,
          v_cantidad, round(v_costo * v_cantidad, 2), null, 'Stock inicial'
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
