-- Corrección aislada del ajuste manual de stock.
-- Pegar y ejecutar UNA sola vez en Supabase > SQL Editor.
--
-- El frontend llama esta RPC con esta firma exacta:
--   registrar_ajuste_manual(uuid, integer, boolean, text)
--
-- Este script elimina la firma antigua de 3 argumentos, crea la RPC canónica,
-- asegura la columna de motivo y deja el permiso solo para usuarios
-- autenticados. No modifica los precios ni el stock existente.

begin;

-- La columna motivo es necesaria para guardar el motivo seleccionado en la UI.
alter table public.ingresos_mercaderia
  add column if not exists motivo text;

-- La tabla admite movimientos negativos (salidas por merma/vencimiento).
alter table public.ingresos_mercaderia
  drop constraint if exists ingresos_mercaderia_cantidad_ingresada_check;
alter table public.ingresos_mercaderia
  drop constraint if exists ingresos_mercaderia_costo_total_check;

-- Quitar todas las firmas conocidas de la RPC. La versión con el orden
-- (text, boolean) también existía en la base y provocaba PGRST203.
drop function if exists public.registrar_ajuste_manual(uuid, integer, boolean);
drop function if exists public.registrar_ajuste_manual(uuid, integer, boolean, text);
drop function if exists public.registrar_ajuste_manual(uuid, integer, text, boolean);

do $$
declare
  v_signature record;
begin
  for v_signature in
    select p.oid::regprocedure::text as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'registrar_ajuste_manual'
  loop
    execute format('drop function %s', v_signature.signature);
  end loop;
end;
$$;

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
  -- El botón de Stock solo se muestra a ADMIN. La consulta va dentro de la
  -- función SECURITY DEFINER para no depender de políticas RLS del cliente.
  if not exists (
    select 1
    from public.usuarios_autorizados
    where email = auth.jwt() ->> 'email'
      and rol = 'admin'
  ) then
    raise exception 'Solo el administrador puede ajustar el stock';
  end if;

  if p_nuevo_stock is null or p_nuevo_stock < 0 then
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
    return json_build_object(
      'ingreso_id', null,
      'stock_actual', v_stock_actual,
      'delta', 0
    );
  end if;

  update public.productos
    set stock_actual = p_nuevo_stock
    where id = p_producto_id
    returning stock_actual into v_stock_actual;

  if v_delta > 0 and coalesce(p_es_regalo, false) then
    v_costo_total := 0;
  else
    v_costo_total := round(coalesce(v_costo, 0) * v_delta, 2);
  end if;

  insert into public.ingresos_mercaderia (
    compra_id,
    proveedor_id,
    nombre_proveedor,
    producto_id,
    cantidad_ingresada,
    costo_total,
    comprobante,
    motivo
  )
  values (
    null,
    null,
    'Ajuste Manual de Inventario',
    p_producto_id,
    v_delta,
    v_costo_total,
    null,
    v_motivo
  )
  returning id into v_ingreso_id;

  return json_build_object(
    'ingreso_id', v_ingreso_id,
    'stock_actual', v_stock_actual,
    'delta', v_delta
  );
end;
$$;

-- No dejar la RPC disponible para roles anónimos.
revoke all on function public.registrar_ajuste_manual(uuid, integer, boolean, text)
  from public, anon;
grant execute on function public.registrar_ajuste_manual(uuid, integer, boolean, text)
  to authenticated;

comment on function public.registrar_ajuste_manual(uuid, integer, boolean, text) is
  'Ajuste manual atómico de stock con motivo y traza en ingresos_mercaderia.';

commit;

-- Verificaciones de solo lectura: deben devolver una sola firma y permisos
-- false para anon.
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'registrar_ajuste_manual';

select has_function_privilege(
  'anon',
  'public.registrar_ajuste_manual(uuid,integer,boolean,text)',
  'EXECUTE'
) as anon_puede_ajustar;

-- Ayuda a PostgREST a recargar la firma recién creada.
notify pgrst, 'reload schema';
