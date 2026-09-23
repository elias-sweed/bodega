-- Verificación final (solo lectura).
-- Ejecutar después de supabase/corregimientos_finales.sql.

select * from (
  select 'Esquema' as area,
         case when to_regclass('public.productos') is not null
               and to_regclass('public.ventas') is not null
               and to_regclass('public.detalle_ventas') is not null
               and to_regclass('public.ingresos_mercaderia') is not null
               and to_regclass('public.usuarios_autorizados') is not null
             then 'OK' else 'FALTA' end as estado

  union all
  select 'Idempotencia ventas',
         case when to_regprocedure('public.registrar_venta_caja(json,text,uuid)') is not null
             then 'OK' else 'FALTA' end

  union all
  select 'Una sola RPC venta',
         case when count(*) = 1
             then 'OK' else 'HAY SOBRECARGAS' end
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'registrar_venta_caja'

  union all
  select 'Total de ventas',
         case when is_nullable = 'NO' and column_default is not null
             then 'OK' else 'REVISAR' end
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'ventas'
    and column_name = 'total'

  union all
  select 'RPC compras',
         case when to_regprocedure('public.registrar_compra(uuid,text,text,json,uuid)') is not null
             then 'OK' else 'FALTA' end

  union all
  select 'RPC ajuste',
         case when to_regprocedure('public.registrar_ajuste_manual(uuid,integer,boolean,text)') is not null
             then 'OK' else 'FALTA' end

  union all
  select 'RPC crear producto',
         case when to_regprocedure('public.crear_producto(text,text,text,numeric,numeric,integer,integer)') is not null
             then 'OK' else 'FALTA' end

  union all
  select 'Ajuste legacy eliminado',
         case when to_regclass('public.ajustes_stock') is null
             then 'OK' else 'AÚN EXISTE' end

  union all
  select 'Sin sobreventa normal',
         case when count(*) = 0 then 'OK' else 'HAY STOCK NEGATIVO' end
  from public.productos where stock_actual < 0

  union all
  select 'Realtime productos',
         case when exists (
           select 1 from pg_publication_tables
           where pubname = 'supabase_realtime'
             and schemaname = 'public'
             and tablename = 'productos'
         ) then 'OK' else 'FALTA' end
) verificacion
order by area;

-- Estas funciones no deben estar disponibles para anon.
select
  has_function_privilege('anon', 'public.registrar_venta_caja(json,text,uuid)', 'EXECUTE') as anon_puede_vender,
  has_function_privilege('anon', 'public.registrar_compra(uuid,text,text,json,uuid)', 'EXECUTE') as anon_puede_comprar,
  has_function_privilege('anon', 'public.registrar_ajuste_manual(uuid,integer,boolean,text)', 'EXECUTE') as anon_puede_ajustar,
  has_function_privilege('anon', 'public.crear_producto(text,text,text,numeric,numeric,integer,integer)', 'EXECUTE') as anon_puede_crear_producto;

-- Deben existir solo las firmas finales de las funciones principales.
select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'registrar_venta_caja', 'registrar_compra', 'registrar_ajuste_manual',
    'crear_producto', 'actualizar_producto', 'dashboard_resumen'
  )
order by p.proname, argumentos;
