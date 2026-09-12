-- Fase 6.1: Control de acceso por roles (whitelist de emails)
-- Ejecutar DESPUÉS de auth.sql y del alta de los 3 usuarios en Supabase Auth.

-- ---------------------------------------------------------------------------
-- Tabla whitelist: define QUIÉN puede usar el sistema y con qué rol.
--   - admin  -> todas las funciones.
--   - cajero -> vender, registrar compras, crear producto/proveedor, ver
--               historial. NO puede editar ni borrar productos/proveedores.
-- Esta es la seguridad REAL: aunque alguien entre con Google u otro proveedor,
-- si su correo no está aquí, RLS le niega TODO.
-- ---------------------------------------------------------------------------
create table if not exists public.usuarios_autorizados (
  email text primary key,
  rol text not null check (rol in ('admin', 'cajero')),
  created_at timestamptz not null default now()
);

alter table public.usuarios_autorizados enable row level security;

-- Cada usuario solo puede leer SU propio rol (la app lo consulta al cargar).
drop policy if exists "usuarios_autorizados_select_own" on public.usuarios_autorizados;
create policy "usuarios_autorizados_select_own"
  on public.usuarios_autorizados for select to authenticated
  using (email = auth.jwt() ->> 'email');

-- Admin principal.
insert into public.usuarios_autorizados (email, rol) values
  ('pedro@gmail.com', 'admin'),
  ('slunal@ucvvirtual.edu.pe', 'admin')
on conflict (email) do nothing;

-- Agrega aquí los otros dos correos (descomentar y reemplazar):
-- insert into public.usuarios_autorizados (email, rol) values
--   ('correo-de-la-pareja@gmail.com', 'cajero'),
--   ('correo-de-la-hermana@gmail.com', 'cajero')
-- on conflict (email) do nothing;

-- ---------------------------------------------------------------------------
-- Reemplazo las políticas de auth.sql por versiones que exigen estar en la
-- whitelist (y rol 'admin' para UPDATE/DELETE de productos).
-- ---------------------------------------------------------------------------
drop policy if exists "productos_select_authenticated" on public.productos;
drop policy if exists "productos_insert_authenticated" on public.productos;
drop policy if exists "productos_update_authenticated" on public.productos;
drop policy if exists "productos_delete_authenticated" on public.productos;
drop policy if exists "ventas_select_authenticated" on public.ventas;
drop policy if exists "detalle_ventas_select_authenticated" on public.detalle_ventas;
drop policy if exists "proveedores_select_authenticated" on public.proveedores;
drop policy if exists "ingresos_mercaderia_select_authenticated" on public.ingresos_mercaderia;

-- PRODUCTOS: lectura para todo miembro; insert para todo miembro (un cajero
-- debe poder crear productos cuando llega el proveedor); update/delete SOLO admin.
create policy "productos_select_authenticated"
  on public.productos for select to authenticated
  using (
    exists (
      select 1 from public.usuarios_autorizados
      where email = auth.jwt() ->> 'email'
    )
  );

create policy "productos_insert_authenticated"
  on public.productos for insert to authenticated
  with check (
    exists (
      select 1 from public.usuarios_autorizados
      where email = auth.jwt() ->> 'email'
    )
  );

create policy "productos_update_authenticated"
  on public.productos for update to authenticated
  using (
    exists (
      select 1 from public.usuarios_autorizados
      where email = auth.jwt() ->> 'email' and rol = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.usuarios_autorizados
      where email = auth.jwt() ->> 'email' and rol = 'admin'
    )
  );

create policy "productos_delete_authenticated"
  on public.productos for delete to authenticated
  using (
    exists (
      select 1 from public.usuarios_autorizados
      where email = auth.jwt() ->> 'email' and rol = 'admin'
    )
  );

-- VENTAS / DETALLE_VENTAS / PROVEEDORES / INGRESOS_MERCADERIA: lectura para
-- todo miembro (las escrituras siguen pasando por las RPC SECURITY DEFINER).
create policy "ventas_select_authenticated"
  on public.ventas for select to authenticated
  using (
    exists (
      select 1 from public.usuarios_autorizados
      where email = auth.jwt() ->> 'email'
    )
  );

create policy "detalle_ventas_select_authenticated"
  on public.detalle_ventas for select to authenticated
  using (
    exists (
      select 1 from public.usuarios_autorizados
      where email = auth.jwt() ->> 'email'
    )
  );

create policy "proveedores_select_authenticated"
  on public.proveedores for select to authenticated
  using (
    exists (
      select 1 from public.usuarios_autorizados
      where email = auth.jwt() ->> 'email'
    )
  );

create policy "ingresos_mercaderia_select_authenticated"
  on public.ingresos_mercaderia for select to authenticated
  using (
    exists (
      select 1 from public.usuarios_autorizados
      where email = auth.jwt() ->> 'email'
    )
  );

-- Nota: registrar_venta / registrar_ingreso corren como SECURITY DEFINER del
-- dueño de la tabla; un miembro cajero puede invocarlas (grant a authenticated)
-- aunque no tenga UPDATE directo sobre productos. La validación de stock ocurre
-- dentro de la función.