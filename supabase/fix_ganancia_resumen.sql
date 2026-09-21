-- FIX: ganancia_estimada_hoy contaba el total de la venta REPETIDO por cada
-- producto del ticket (ej. un ticket de S/ 50 con 5 líneas sumaba S/ 250).
-- Ahora: suma por LÍNEA (subtotal − costo × cantidad).
-- Ejecutar en el SQL Editor de Supabase (idempotente).

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

  -- Por LÍNEA: lo cobrado menos lo que costó (antes usaba v.total por línea).
  select coalesce(sum(d.subtotal - coalesce(d.costo_unitario, p.costo) * d.cantidad), 0)
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
