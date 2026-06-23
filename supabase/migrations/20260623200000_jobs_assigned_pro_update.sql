-- Allow the assigned pro to update job status, completion media, and notes
-- without being able to change the owner or reassign the job to someone else
drop policy if exists "jobs_assigned_pro_update" on public.jobs;
create policy "jobs_assigned_pro_update"
on public.jobs
for update
using (assigned_pro_id = auth.uid())
with check (assigned_pro_id = auth.uid());
