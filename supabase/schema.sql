-- =====================================================================
-- Gloria Curiel · Base de datos (Supabase / Postgres)
-- Clientes, staff, pedidos e historial de estados.
-- Ejecutar una sola vez en un proyecto nuevo de Supabase (SQL Editor).
-- =====================================================================

-- ---------- Correos que automáticamente son staff ----------
create table if not exists public.staff_emails (
  email text primary key
);
insert into public.staff_emails (email) values
  ('pgonzalezcastro1@gmail.com'),
  ('jlcastro48@yahoo.com')
on conflict do nothing;
alter table public.staff_emails enable row level security;  -- sin políticas: nadie la lee desde la página

-- ---------- Perfiles ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  nombre      text,
  empresa     text,
  telefono    text,
  role        text not null default 'cliente' check (role in ('cliente', 'staff')),
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ¿El usuario actual es staff?  (security definer para evitar recursión en RLS)
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'staff');
$$;

-- Crear perfil al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre, empresa, telefono, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'nombre',
    new.raw_user_meta_data ->> 'empresa',
    new.raw_user_meta_data ->> 'telefono',
    case when exists (select 1 from public.staff_emails s where lower(s.email) = lower(new.email))
         then 'staff' else 'cliente' end
  );
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un cliente no puede cambiarse el rol ni el correo
create or replace function public.protect_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_staff() then
    new.role := old.role;
    new.email := old.email;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile();

drop policy if exists "perfil propio o staff (leer)" on public.profiles;
create policy "perfil propio o staff (leer)" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_staff());
drop policy if exists "perfil propio o staff (editar)" on public.profiles;
create policy "perfil propio o staff (editar)" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_staff())
  with check (id = auth.uid() or public.is_staff());

-- ---------- Pedidos ----------
create table if not exists public.orders (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  status          text not null default 'cotizacion_solicitada' check (status in (
                    'cotizacion_solicitada', 'cotizado', 'confirmado',
                    'en_produccion', 'en_camino', 'entregado', 'cancelado')),
  -- Lámina regular
  largo           numeric check (largo > 0),
  ancho           numeric check (ancho > 0),
  alto            numeric check (alto > 0),
  cantidad        integer check (cantidad > 0),
  corrugado       text check (corrugado in ('Sencillo', 'Doble')),
  flauta          text check (flauta in ('C', 'B', 'E', 'BC')),
  resistencia     text,
  resistencia_asistente text,
  cumple_minimo   boolean,
  -- Extras (se cotizan aparte)
  req_suaje       boolean not null default false,
  suaje_largo     numeric,
  suaje_ancho     numeric,
  req_impresion   boolean not null default false,
  impresion_det   text,
  otros           text,
  producto        text,
  -- Solo staff
  precio          numeric(12,2),
  mensaje_cliente text,                          -- nota visible para el cliente
  fecha_entrega   date
);
create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
alter table public.orders enable row level security;

-- Los clientes solo crean cotizaciones nuevas y no pueden poner precio ni estado
create or replace function public.protect_order()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_staff() then
    if tg_op = 'INSERT' then
      new.user_id := auth.uid();
      new.status := 'cotizacion_solicitada';
      new.precio := null; new.mensaje_cliente := null; new.fecha_entrega := null;
    else
      -- El cliente solo puede cancelar mientras no esté confirmado
      if not (old.status in ('cotizacion_solicitada', 'cotizado') and new.status = 'cancelado') then
        raise exception 'No autorizado';
      end if;
      new := old; new.status := 'cancelado';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists protect_order on public.orders;
create trigger protect_order before insert or update on public.orders
  for each row execute function public.protect_order();

drop policy if exists "pedidos: leer propios o staff" on public.orders;
create policy "pedidos: leer propios o staff" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
drop policy if exists "pedidos: crear propios" on public.orders;
create policy "pedidos: crear propios" on public.orders
  for insert to authenticated with check (user_id = auth.uid() or public.is_staff());
drop policy if exists "pedidos: editar propios o staff" on public.orders;
create policy "pedidos: editar propios o staff" on public.orders
  for update to authenticated using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());
drop policy if exists "pedidos: borrar staff" on public.orders;
create policy "pedidos: borrar staff" on public.orders
  for delete to authenticated using (public.is_staff());

revoke all on public.orders from anon;

-- ---------- Notas internas (solo staff; el cliente nunca las ve) ----------
create table if not exists public.order_notes (
  order_id    bigint primary key references public.orders(id) on delete cascade,
  notas       text,
  updated_at  timestamptz not null default now()
);
alter table public.order_notes enable row level security;
drop policy if exists "notas: solo staff" on public.order_notes;
create policy "notas: solo staff" on public.order_notes
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- Historial de estados ----------
create table if not exists public.order_history (
  id          bigint generated always as identity primary key,
  order_id    bigint not null references public.orders(id) on delete cascade,
  status      text not null,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id)
);
create index if not exists order_history_order_idx on public.order_history(order_id);
alter table public.order_history enable row level security;

create or replace function public.log_order_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_history (order_id, status, created_by) values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;
drop trigger if exists log_order_status on public.orders;
create trigger log_order_status after insert or update on public.orders
  for each row execute function public.log_order_status();

drop policy if exists "historial: leer propio o staff" on public.order_history;
create policy "historial: leer propio o staff" on public.order_history
  for select to authenticated using (
    public.is_staff() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- Las funciones internas no se llaman desde la página
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile() from public, anon, authenticated;
revoke execute on function public.protect_order() from public, anon, authenticated;
revoke execute on function public.log_order_status() from public, anon, authenticated;

-- Avisos en vivo al panel de staff cuando llegan pedidos nuevos
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; when undefined_object then null;
end $$;
