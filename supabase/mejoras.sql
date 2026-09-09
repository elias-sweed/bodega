-- Fase 6.2: Mejoras de flujo (crear proveedor rápido, inventario admin-only)
-- Ejecutar DESPUÉS de auth.sql y roles.sql.

-- PROVEEDORES:
--   INSERT  -> cualquier miembro (un cajero debe poder registrar al nuevo proveedor
--              que llega con mercadería, "al vuelo" desde Compras).
--   UPDATE  -> solo admin (corregir nombre/empresa, consolidar duplicados).
--   DELETE  -> solo admin.
drop policy if exists "proveedores_insert_authenticated" on public.proveedores;
drop policy if exists "proveedores_update_authenticated" on public.proveedores;
drop policy if exists "proveedores_delete_authenticated" on public.proveedores;

create policy "proveedores_insert_authenticated"
  on public.proveedores for insert to authenticated
  with check (
    exists (
      select 1 from public.usuarios_autorizados
      where email = auth.jwt() ->> 'email'
    )
  );

create policy "proveedores_update_authenticated"
  on public.proveedores for update to authenticated
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

create policy "proveedores_delete_authenticated"
  on public.proveedores for delete to authenticated
  using (
    exists (
      select 1 from public.usuarios_autorizados
      where email = auth.jwt() ->> 'email' and rol = 'admin'
    )
  );