-- Tabla de productos para Bodega POS
-- Ejecutar en el SQL Editor de Supabase.

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  codigo_barras text unique,
  nombre text not null,
  categoria text not null,
  precio_venta numeric(12, 2) not null default 0 check (precio_venta >= 0),
  costo numeric(12, 2) not null default 0 check (costo >= 0),
  stock_actual integer not null default 0,
  stock_minimo integer not null default 0,
  created_at timestamptz not null default now()
);

-- Índice para búsquedas rápidas por nombre y código de barras
create index productos_nombre_idx on public.productos (nombre);
create index productos_codigo_barras_idx on public.productos (codigo_barras);

-- Seguridad a nivel de fila
alter table public.productos enable row level security;

-- Políticas para la fase 2 (sin autenticación). Ajustar al añadir auth.
create policy "productos_select" on public.productos
  for select
  using (true);

create policy "productos_insert" on public.productos
  for insert
  with check (true);

create policy "productos_update" on public.productos
  for update
  using (true);

create policy "productos_delete" on public.productos
  for delete
  using (true);