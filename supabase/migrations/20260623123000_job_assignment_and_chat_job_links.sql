alter table public.jobs
  add column if not exists assigned_pro_id uuid references auth.users(id) on delete set null,
  add column if not exists assigned_pro_name text,
  add column if not exists assigned_at timestamptz;

alter table public.conversations
  add column if not exists job_id text references public.jobs(id) on delete set null;

drop policy if exists "jobs_marketplace_select_open" on public.jobs;
create policy "jobs_marketplace_select_open"
on public.jobs
for select
using (
  auth.uid() is not null
  and status = 'scheduled'
  and assigned_pro_id is null
);

drop policy if exists "jobs_assigned_pro_select" on public.jobs;
create policy "jobs_assigned_pro_select"
on public.jobs
for select
using (
  auth.uid() is not null
  and assigned_pro_id = auth.uid()
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'jobs'
  ) then
    alter publication supabase_realtime add table public.jobs;
  end if;
end $$;
