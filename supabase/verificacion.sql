-- VERIFICACIÓN de migraciones (SOLO LECTURA, no modifica nada).
-- Pégala y ejecútala en el SQL Editor de Supabase para comprobar si las
-- migraciones ya están aplicadas. Puedes correrla todas las veces que quieras.
--
-- Resultado esperado: todas las filas con estado 'OK' (o 'FALTA CRÍTICO' = nada).

select * from (
  select 'roles.sql' as script,
         'tabla usuarios_autorizados' as objeto,
         case when to_regclass('public.usuarios_autorizados') is not null
              then 'OK (aplicado)' else 'FALTA CRÍTICO' end as estado

  union all select 'usuarios.sql',
         'función es_admin()',
         case when to_regprocedure('public.es_admin()') is not null
              then 'OK (aplicado)' else 'PENDIENTE' end

  union all select 'usuarios.sql',
         'política usuarios_autorizados_insert_admin',
         case when exists (
                select 1 from pg_policy p
                join pg_class c on c.oid = p.polrelid
                where c.relname = 'usuarios_autorizados'
                  and p.polname = 'usuarios_autorizados_insert_admin'
              ) then 'OK (aplicado)' else 'PENDIENTE' end

  union all select 'mejoras.sql',
         'política proveedores_insert_authenticated',
         case when exists (
                select 1 from pg_policy p
                join pg_class c on c.oid = p.polrelid
                where c.relname = 'proveedores'
                  and p.polname = 'proveedores_insert_authenticated'
              ) then 'OK (aplicado)' else 'PENDIENTE' end

  union all select 'mejoras.sql',
         'política proveedores_update_authenticated (solo admin)',
         case when exists (
                select 1 from pg_policy p
                join pg_class c on c.oid = p.polrelid
                where c.relname = 'proveedores'
                  and p.polname = 'proveedores_update_authenticated'
              ) then 'OK (aplicado)' else 'PENDIENTE' end

  union all select 'mejoras_v2.sql',
         'columna detalle_ventas.costo_unitario',
         case when exists (
                select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'detalle_ventas'
                  and column_name = 'costo_unitario'
              ) then 'OK (aplicado)' else 'PENDIENTE' end

  union all select 'mejoras_v2.sql',
         'función es_miembro()',
         case when to_regprocedure('public.es_miembro()') is not null
              then 'OK (aplicado)' else 'PENDIENTE' end

  union all select 'mejoras_v2.sql',
         'función registrar_compra(uuid,text,text,json)',
         case when to_regprocedure('public.registrar_compra(uuid,text,text,json)') is not null
              then 'OK (aplicado)' else 'PENDIENTE' end

  union all select 'mejoras_v2.sql',
         'función actualizar_producto(...)',
         case when to_regprocedure('public.actualizar_producto(uuid,text,text,text,numeric,numeric,integer,integer,text)') is not null
              then 'OK (aplicado)' else 'PENDIENTE' end

  union all select 'mejoras_v2.sql',
         'función dashboard_resumen()',
         case when to_regprocedure('public.dashboard_resumen()') is not null
              then 'OK (aplicado)' else 'PENDIENTE' end

  union all select 'mejoras_v2.sql',
         'tabla ajustes_stock eliminada',
         case when to_regclass('public.ajustes_stock') is null
              then 'OK (aplicado)' else 'PENDIENTE (aún existe)' end

  union all select 'ventas.sql',
         'función registrar_venta(json,text)',
         case when to_regprocedure('public.registrar_venta(json,text)') is not null
              then 'OK (existe)' else 'FALTA CRÍTICO' end

  union all select 'ventas.sql',
         'SIN versión duplicada de registrar_venta (jsonb)',
         case when exists (
                select 1 from pg_proc p
                where p.pronamespace = to_regnamespace('public')
                  and p.proname = 'registrar_venta'
                  and pg_get_function_identity_arguments(p.oid) = 'jsonb, text'
              )
              then 'OJO: hay versión jsonb duplicada. Ejecuta fix_registrar_venta_duplicada.sql'
              else 'OK (solo una versión)' end
) filas
order by script, objeto;

-- ---------------------------------------------------------------------------
-- Diagnóstico extra (ayuda a entender por qué falla o no la venta):
-- ¿registrar_venta es la versión NUEVA (exige whitelist) o la antigua?
-- ---------------------------------------------------------------------------
select 'registrar_venta' as objeto,
       case
         when pg_get_functiondef(p.oid) like '%es_miembro()%'
              then 'Versión NUEVA (exige whitelist es_miembro)'
         else 'Versión ANTIGUA (cualquier usuario autenticado puede vender)'
       end as estado
from pg_proc p
where p.oid = to_regprocedure('public.registrar_venta(json,text)');

-- ¿Quién tiene permitido cobrar/ejecutar la función?
select 'ejecución registrar_venta por: authenticated' as objeto,
       case when has_function_privilege('authenticated', 'public.registrar_venta(json,text)', 'EXECUTE')
            then 'OK (tiene permiso)' else 'FALTA (sin permiso)' end as estado;

-- Whitelist actual: compara estos correos con el con el que inicias sesión.
select 'whitelist' as script,
       'correos autorizados en usuarios_autorizados' as objeto,
       string_agg(email || ' (' || rol || ')', ', ' order by email) as estado
from public.usuarios_autorizados;