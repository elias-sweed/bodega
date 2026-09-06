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
  proveedor_id uuid references public.proveedores(id) on delete set null,
  producto_id uuid references public.productos(id) on delete set null,
  cantidad_ingresada integer not null check (cantidad_ingresada > 0),
  costo_total numeric(12, 2) not null default 0 check (costo_total >= 0),
  fecha timestamptz not null default now()
);

create index ingresos_mercaderia_proveedor_id_idx on public.ingresos_mercaderia (proveedor_id);
create index ingresos_mercaderia_producto_id_idx on public.ingresos_mercaderia (producto_id);
create index ingresos_mercaderia_fecha_idx on public.ingresos_mercaderia (fecha);

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
-- ---------------------------------------------------------------------------
create or replace function public.registrar_ingreso(
  p_proveedor_id uuid,
  p_producto_id uuid,
  p_cantidad integer,
  p_costo_total numeric(12, 2)
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ingreso_id uuid;
  v_stock_actual integer;
begin
  if p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0';
  end if;

  update public.productos
  set stock_actual = stock_actual + p_cantidad
  where id = p_producto_id
  returning stock_actual into v_stock_actual;

  if not found then
    raise exception 'El producto % no existe', p_producto_id;
  end if;

  insert into public.ingresos_mercaderia (proveedor_id, producto_id, cantidad_ingresada, costo_total)
  values (p_proveedor_id, p_producto_id, p_cantidad, p_costo_total)
  returning id into v_ingreso_id;

  return json_build_object('ingreso_id', v_ingreso_id, 'stock_actual', v_stock_actual);
end;
$$;

grant execute on function public.registrar_ingreso(uuid, uuid, integer, numeric) to anon, authenticated;

-- Proveedores de ejemplo para probar el dropdown
insert into public.proveedores (nombre, empresa) values
  ('Juan Pérez', 'Distribuidora La Central'),
  ('María García', 'Bodega Mayorista XY'),
  ('Carlos López', 'Proveedor de Papelería');