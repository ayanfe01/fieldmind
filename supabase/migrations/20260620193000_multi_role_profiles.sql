alter table public.profiles
  add column if not exists roles text[] not null default array[]::text[];

update public.profiles
set roles = array[role]
where roles = array[]::text[];

alter table public.profiles
  drop constraint if exists profiles_roles_valid;

alter table public.profiles
  add constraint profiles_roles_valid
  check (
    array_length(roles, 1) >= 1
    and roles <@ array['tradesperson', 'customer', 'admin']::text[]
  );
