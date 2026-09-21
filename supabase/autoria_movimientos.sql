-- Autoría de movimientos: guarda QUIÉN registró cada venta/compra/ajuste.
-- Ejecutar en el SQL Editor de Supabase (idempotente, se puede re-ejecutar).
-- No toca las funciones existentes: un trigger rellena creado_por con el email
-- de la sesión (auth.jwt). Las filas viejas quedan con creado_por = null.

alter table public.ventas
  add column if not exists creado_por text;

alter table public.ingresos_mercaderia
  add column if not exists creado_por text;

create or replace function public.set_creado_por()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.creado_por is null or btrim(NEW.creado_por) = '' then
    NEW.creado_por := auth.jwt() ->> 'email';
  end if;
  return NEW;
end;
$$;

drop trigger if exists ventas_set_creado_por on public.ventas;
create trigger ventas_set_creado_por
  before insert on public.ventas
  for each row execute function public.set_creado_por();

drop trigger if exists ingresos_set_creado_por on public.ingresos_mercaderia;
create trigger ingresos_set_creado_por
  before insert on public.ingresos_mercaderia
  for each row execute function public.set_creado_por();
