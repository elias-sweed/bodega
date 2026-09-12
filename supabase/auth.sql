-- Fase 6: Autenticación y Row Level Security
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de schema.sql, ventas.sql y compras.sql.

-- ---------------------------------------------------------------------------
-- ANÁLISIS DE AISLAMIENTO DE DATOS
-- ---------------------------------------------------------------------------
-- El esquema actual está modelado como UNA SOLA BODEGA:
--   - Ninguna tabla (productos, ventas, detalle_ventas, proveedores,
--     ingresos_mercaderia) tiene una columna tipo bodega_id / organization_id.
--   - Todos los datos pertenecen al mismo negocio.
-- Por lo tanto la estrategia correcta en esta fase es "TO authenticated":
-- cualquier usuario autenticado del proyecto accede a los datos de la bodega.
-- Si en el futuro se quisiera alojar MÚLTIPLES bodegas independientes en esta
-- misma base, eso exige una migración (tabla de perfiles + columna tenant +
-- políticas basadas en auth.uid()); no es el caso actual.
-- ---------------------------------------------------------------------------

-- 1) Garantizar RLS habilitado en todas las tablas de negocio.
alter table public.productos enable row level security;
alter table public.ventas enable row level security;
alter table public.detalle_ventas enable row level security;
alter table public.proveedores enable row level security;
alter table public.ingresos_mercaderia enable row level security;

-- 2) Eliminar las políticas "abiertas" de las fases 2-4 (acceso indiscriminado).
drop policy if exists "productos_select" on public.productos;
drop policy if exists "productos_insert" on public.productos;
drop policy if exists "productos_update" on public.productos;
drop policy if exists "productos_delete" on public.productos;
drop policy if exists "ventas_select" on public.ventas;
drop policy if exists "detalle_ventas_select" on public.detalle_ventas;
drop policy if exists "proveedores_select" on public.proveedores;
drop policy if exists "ingresos_select" on public.ingresos_mercaderia;

-- ---------------------------------------------------------------------------
-- PRODUCTOS: CRUD completo, SOLO para usuarios autenticados.
--   SELECT  -> el POS/Inventario/Dashboard/Compras leen el catálogo.
--   INSERT  -> alta de producto desde Inventario.
--   UPDATE  -> stock ajustado por Inventario (si se edita stock) y lectura.
--   DELETE  -> borrado desde Inventario.
-- Se analiza cada operación individualmente: ninguna usa accesos abiertos.
-- ---------------------------------------------------------------------------
create policy "productos_select_authenticated"
  on public.productos for select to authenticated using (true);

create policy "productos_insert_authenticated"
  on public.productos for insert to authenticated with check (true);

create policy "productos_update_authenticated"
  on public.productos for update to authenticated using (true) with check (true);

create policy "productos_delete_authenticated"
  on public.productos for delete to authenticated using (true);

-- ---------------------------------------------------------------------------
-- VENTAS / DETALLE_VENTAS / PROVEEDORES / INGRESOS_MERCADERIA: lectura únicamente.
--   La escritura de estas tablas NO debe llegar directa desde el cliente:
--   ventas + detalle_ventas  -> función public.registrar_venta(...)
--   ingresos_mercaderia      -> función public.registrar_ingreso(...)
--   proveedores              -> solo se alimenta por SQL/seed del desarrollador.
-- Estas funciones son SECURITY DEFINER (propiedad del dueño de la tabla), así
-- que sus operaciones internas no pasan por RLS; de ese modo las inserciones,
-- updates de stock y validaciones siguen funcionando sin romper la integridad.
-- ---------------------------------------------------------------------------
create policy "ventas_select_authenticated"
  on public.ventas for select to authenticated using (true);

create policy "detalle_ventas_select_authenticated"
  on public.detalle_ventas for select to authenticated using (true);

create policy "proveedores_select_authenticated"
  on public.proveedores for select to authenticated using (true);

create policy "ingresos_mercaderia_select_authenticated"
  on public.ingresos_mercaderia for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- FUNCIONES RPC: remover el acceso del rol anónimo.
--   Después de esta fase, un usuario NO autenticado:
--     * no puede leer ninguna tabla (el único rol sin políticas es anon),
--     * no puede invocar registrar_venta ni registrar_ingreso.
-- ---------------------------------------------------------------------------
revoke execute on function public.registrar_venta(json, text) from anon;
revoke execute on function public.registrar_ingreso(uuid, uuid, text, uuid, integer, numeric, text) from anon;

grant execute on function public.registrar_venta(json, text) to authenticated;
grant execute on function public.registrar_ingreso(uuid, uuid, text, uuid, integer, numeric, text) to authenticated;

-- VALIDACIÓN RÁPIDA (lectura): antes de aplicar, la app debía crear estos datos.
-- Nota: al habilitar estas políticas, el rol anon deja de poder leer/insertar.
-- Verificar en el Dashboard que las consultas del POS sigan respondiendo con
-- sesión iniciada (los cambios de stock y carrito pasan por las funciones RPC).