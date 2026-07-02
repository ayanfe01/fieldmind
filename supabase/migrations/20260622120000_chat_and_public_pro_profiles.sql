alter table public.conversations
  add column if not exists initiator_name text;

update public.conversations c
set initiator_name = coalesce(p.name, c.owner_id::text)
from public.profiles p
where c.owner_id = p.id
  and c.initiator_name is null;

drop policy if exists "profiles_service_pros_select" on public.profiles;

create policy "profiles_service_pros_select"
on public.profiles
for select
using (
  auth.uid() = id
  or 'tradesperson' = any(roles)
);
