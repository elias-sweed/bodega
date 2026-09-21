-- ============================================================================
-- IMPORTADOR DE VENTAS OFFLINE (Excel/CSV) — migración backfill
-- ============================================================================
-- DÓNDE EJECUTARLO:
--   1) Abre tu proyecto en Supabase → SQL Editor → New query.
--   2) Pega TODO este archivo y pulsa Run (es seguro ejecutarlo varias veces).
--   3) Verifica que no haya errores y que el bloque de VERIFICACIÓN final
--      muestre la función registrar_venta_backfill.
--
-- POR QUÉ EXISTE:
--   La función registrar_venta (venta normal) pone fecha=now() siempre y falla
--   si no hay stock. Para regularizar ventas hechas SIN internet necesitamos
--   fecha explícita (la del día sin conexión) y tolerancia de stock (permite
--   dejar stock en negativo para sincerarlo después). La app (HistoryPage →
--   "Importar Excel" → ImportVentasModal) ya espera esta función: SIN ejecutar
--   este SQL el botón de importar fallará con "función no existe".
-- ============================================================================

-- 1) Columnas de trazabilidad en ventas
alter table public.ventas
  add column if not exists origen text not null default 'sistema';

alter table public.ventas
  add column if not exists ticket_externo text;

-- 2) La columna de costo snapshot en el detalle (por si la base es antigua)
alter table public.detalle_ventas
  add column if not exists costo_unitario numeric(12, 2);

-- 3) Idempotencia: un mismo ticket offline no se importa dos veces
create unique index if not exists ventas_origen_ticket_uidx
  on public.ventas (origen, ticket_externo)
  where ticket_externo is not null;

-- 4) Función backfill: fecha explícita + stock tolerante (permite negativo)
create or replace function public.registrar_venta_backfill(
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
  v_nuevo_stock integer;
  v_negativo boolean := false;
  v_ticket text := nullif(btrim(coalesce(p_ticket, '')), '');
begin
  -- Solo miembros de la bodega (igual que el resto de RPC).
  if not public.es_miembro() then
    raise exception 'No autorizado';
  end if;

  -- (a) Duplicado: el mismo ticket offline ya fue importado antes
  if v_ticket is not null
     and exists (
       select 1 from public.ventas
       where origen = 'excel' and ticket_externo = v_ticket
     ) then
    raise exception 'VENTA_DUPLICADA:%', v_ticket;
  end if;

  -- (b) Cabecera con fecha explícita y marca de origen
  insert into public.ventas (fecha, total, metodo_pago, origen, ticket_externo)
  values (coalesce(p_fecha, now()), 0, coalesce(p_metodo_pago, 'Efectivo'), 'excel', v_ticket)
  returning id into v_venta_id;

  -- (c) Detalle + descuento de stock SIN bloquear por insuficiente
  for v_item in select * from json_array_elements(p_articulos)
  loop
    v_producto_id := (v_item ->> 'producto_id')::uuid;
    v_cantidad := (v_item ->> 'cantidad')::integer;
    v_precio := (v_item ->> 'precio_unitario')::numeric(12, 2);

    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'Cantidad inválida para el producto %', v_producto_id;
    end if;

    select costo into v_costo
    from public.productos
    where id = v_producto_id
    for update;

    if not found then
      raise exception 'El producto % no existe', v_producto_id;
    end if;

    v_subtotal := v_precio * v_cantidad;
    v_total := v_total + v_subtotal;

    insert into public.detalle_ventas
      (venta_id, producto_id, cantidad, precio_unitario, subtotal, costo_unitario)
    values
      (v_venta_id, v_producto_id, v_cantidad, v_precio, v_subtotal, v_costo);

    update public.productos
    set stock_actual = stock_actual - v_cantidad
    where id = v_producto_id
    returning stock_actual into v_nuevo_stock;

    if v_nuevo_stock < 0 then
      v_negativo := true;
    end if;
  end loop;

  update public.ventas
  set total = v_total
  where id = v_venta_id;

  -- (d) Resultado
  return json_build_object(
    'venta_id', v_venta_id,
    'total', v_total,
    'stock_negativo', v_negativo
  );
end;
$$;

grant execute on function public.registrar_venta_backfill(json, text, timestamptz, text)
  to authenticated;

-- VERIFICACIÓN: debe devolver 1 fila.
select p.proname,
       pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'registrar_venta_backfill';
