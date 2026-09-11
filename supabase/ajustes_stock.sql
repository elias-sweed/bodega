-- Fase 6.3: Auditoría de ajustes manuales de stock.
-- Ejecutar DESPUÉS de auth.sql y roles.sql.
--
-- Problema resuelto: el "Ajustar stock" de Inventario sobrescribía stock_actual
-- directamente desde el cliente, SIN dejar ninguna traza del movimiento. Esto
-- rompía la auditoría (no se podía saber si el stock cambió por venta, compra o
-- un ajuste manual) y no distinguía tipo de movimiento (Entrada / Salida).
--
-- Solución: una función RPC transaccional (SECURITY DEFINER) que aplica el
-- movimiento (entrada suma, salida resta con validación de stock suficiente),
-- registra la fila en ajustes_stock (con su motivo) y devuelve el stock
-- resultante.

create table if not exists public.ajustes_stock (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid references public.productos(id) on delete set null,
  tipo text not null check (tipo in ('entrada', 'salida')),
  cantidad integer not null check (cantidad > 0),
  motivo text not null default 'Corrección de inventario',
  stock_resultante integer not null check (stock_resultante >= 0),
  fecha timestamptz not null default now()
);

-- Compatibilidad: agrega la columna motivo si la tabla ya existía.
alter table public.ajustes_stock add column if not exists motivo text not null default 'Corrección de inventario';

create index if not exists ajustes_stock_producto_id_idx on public.ajustes_stock (producto_id);
create index if not exists ajustes_stock_fecha_idx on public.ajustes_stock (fecha);

alter table public.ajustes_stock enable row level security;

drop policy if exists "ajustes_stock_select_authenticated" on public.ajustes_stock;
create policy "ajustes_stock_select_authenticated"
  on public.ajustes_stock for select to authenticated
  using (
    exists (
      select 1 from public.usuarios_autorizados
      where email = auth.jwt() ->> 'email'
    )
  );

-- Se reemplaza la firma previa (uuid, text, integer) por la versión con motivo.
drop function if exists public.registrar_ajuste_stock(uuid, text, integer);

create or replace function public.registrar_ajuste_stock(
  p_producto_id uuid,
  p_tipo text,
  p_cantidad integer,
  p_motivo text default 'Corrección de inventario'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock_actual integer;
  v_stock_resultante integer;
  v_ajuste_id uuid;
  v_motivo text;
begin
  if p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0';
  end if;

  if p_tipo not in ('entrada', 'salida') then
    raise exception 'Tipo de ajuste inválido. Usa entrada o salida';
  end if;

  v_motivo := coalesce(nullif(trim(p_motivo), ''), 'Corrección de inventario');

  select stock_actual into v_stock_actual
  from public.productos
  where id = p_producto_id
  for update;

  if not found then
    raise exception 'El producto % no existe', p_producto_id;
  end if;

  if p_tipo = 'entrada' then
    v_stock_resultante := v_stock_actual + p_cantidad;
  else
    if v_stock_actual < p_cantidad then
      raise exception 'Stock insuficiente para la salida (disponible: %)', v_stock_actual;
    end if;
    v_stock_resultante := v_stock_actual - p_cantidad;
  end if;

  update public.productos
  set stock_actual = v_stock_resultante
  where id = p_producto_id;

  insert into public.ajustes_stock (producto_id, tipo, cantidad, motivo, stock_resultante)
  values (p_producto_id, p_tipo, p_cantidad, v_motivo, v_stock_resultante)
  returning id into v_ajuste_id;

  return json_build_object('ajuste_id', v_ajuste_id, 'stock_resultante', v_stock_resultante);
end;
$$;

grant execute on function public.registrar_ajuste_stock(uuid, text, integer, text) to authenticated;