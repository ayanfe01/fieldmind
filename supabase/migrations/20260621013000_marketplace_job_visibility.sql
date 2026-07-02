drop policy if exists "jobs_marketplace_select_open" on public.jobs;
create policy "jobs_marketplace_select_open"
on public.jobs
for select
using (
  auth.uid() is not null
  and status = 'scheduled'
);
