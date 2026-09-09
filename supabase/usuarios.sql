-- Fase 6.2: Página "Usuarios" — gestión de acceso (SOLO administradores)
-- Ejecutar DESPUÉS de auth.sql y roles.sql.

-- Helper SECURITY DEFINER: es true únicamente si el email de la sesión figura
-- como 'admin' en usuarios_autorizados. Corre con permisos del dueño de la
-- tabla, por lo que evita la recursión de RLS al consultar la misma tabla.
create or replace function public.es_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.usuarios_autorizados
    where email = auth.jwt() ->> 'email' and rol = 'admin'
  );
$$;

-- El admin necesita leer la lista COMPLETA (la política select_own de roles.sql
-- sigue vigente para que cada usuario vea solo su propio rol).
drop policy if exists "usuarios_autorizados_select_admin" on public.usuarios_autorizados;
create policy "usuarios_autorizados_select_admin"
  on public.usuarios_autorizados for select to authenticated
  using (public.es_admin());

-- Agregar / cambiar rol / quitar acceso: solo admin.
drop policy if exists "usuarios_autorizados_insert_admin" on public.usuarios_autorizados;
create policy "usuarios_autorizados_insert_admin"
  on public.usuarios_autorizados for insert to authenticated
  with check (public.es_admin());

drop policy if exists "usuarios_autorizados_update_admin" on public.usuarios_autorizados;
create policy "usuarios_autorizados_update_admin"
  on public.usuarios_autorizados for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

drop policy if exists "usuarios_autorizados_delete_admin" on public.usuarios_autorizados;
create policy "usuarios_autorizados_delete_admin"
  on public.usuarios_autorizados for delete to authenticated
  using (public.es_admin());

-- Nota: es_admin() también puede usarse en políticas futuras de otras tablas
-- (p. ej. gateó de UI) sin duplicar la consulta de whitelist.