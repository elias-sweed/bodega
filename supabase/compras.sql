-- Fase 4: Compras - proveedores e ingresos de mercadería + función transaccional
-- Ejecutar en el SQL Editor de Supabase.

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  empresa text,
  created_at timestamptz not null default now()
);

create table public.ingresos_mercaderia (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid,
  proveedor_id uuid references public.proveedores(id) on delete set null,
  nombre_proveedor text,
  producto_id uuid references public.productos(id) on delete set null,
  cantidad_ingresada integer not null check (cantidad_ingresada > 0),
  costo_total numeric(12, 2) not null default 0 check (costo_total >= 0),
  comprobante text,
  fecha timestamptz not null default now()
);

-- Compatibilidad: agrega las columnas comprobante/compra_id/nombre_proveedor si la tabla ya existía.
alter table public.ingresos_mercaderia add column if not exists comprobante text;
alter table public.ingresos_mercaderia add column if not exists compra_id uuid;
alter table public.ingresos_mercaderia add column if not exists nombre_proveedor text;

create index ingresos_mercaderia_proveedor_id_idx on public.ingresos_mercaderia (proveedor_id);
create index ingresos_mercaderia_producto_id_idx on public.ingresos_mercaderia (producto_id);
create index ingresos_mercaderia_fecha_idx on public.ingresos_mercaderia (fecha);
create index ingresos_mercaderia_compra_id_idx on public.ingresos_mercaderia (compra_id);

-- Seguridad a nivel de fila
alter table public.proveedores enable row level security;
alter table public.ingresos_mercaderia enable row level security;

create policy "proveedores_select" on public.proveedores
  for select using (true);

create policy "ingresos_select" on public.ingresos_mercaderia
  for select using (true);

-- ---------------------------------------------------------------------------
-- Función transaccional: inserta el ingreso de mercadería y suma al stock.
-- Atómica: si algo falla, se revierte por completo.
-- Además recalcula el COSTO UNITARIO del producto (promedio ponderado entre el
-- costo del stock existente y el costo de esta compra), para que Inventario y
-- el cálculo de márgenes trabajen con el costo real de la última compra.
-- ---------------------------------------------------------------------------
drop function if exists public.registrar_ingreso(uuid, uuid, integer, numeric, text);
drop function if exists public.registrar_ingreso(uuid, uuid, uuid, integer, numeric, text);

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
  if p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0';
  end if;

  select stock_actual, costo
    into v_stock_actual, v_costo_previo
  from public.productos
  where id = p_producto_id
  for update;

  if not found then
    raise exception 'El producto % no existe', p_producto_id;
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

grant execute on function public.registrar_ingreso(uuid, uuid, text, uuid, integer, numeric, text) to anon, authenticated;

-- Limpieza de datos de prueba. Ejecutar una vez en el SQL Editor:
--   delete from public.proveedores
--   where lower(nombre) in ('bakus', 'carlos lópez', 'juan pérez', 'maría garcía');
-- El proveedor genérico "Proveedor Varios / Sin Comprobante" es una opción fija
-- del selector de Compras (no se guarda en la tabla proveedores).