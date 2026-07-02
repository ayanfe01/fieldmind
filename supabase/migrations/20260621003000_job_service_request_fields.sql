alter table public.jobs
  add column if not exists category text,
  add column if not exists custom_category text,
  add column if not exists budget_range text,
  add column if not exists urgency text;

create index if not exists jobs_category_idx on public.jobs(category);
create index if not exists jobs_custom_category_idx on public.jobs(custom_category);
