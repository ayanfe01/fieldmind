-- ─────────────────────────────────────────────
-- 1. Add completion timestamps to jobs
-- ─────────────────────────────────────────────
alter table public.jobs
  add column if not exists completed_at   timestamptz,
  add column if not exists invoice_sent_at timestamptz;

-- ─────────────────────────────────────────────
-- 2. Ratings table
-- ─────────────────────────────────────────────
create table if not exists public.ratings (
  id              uuid primary key default gen_random_uuid(),
  job_id          text not null references public.jobs(id) on delete cascade,
  invoice_id      text references public.invoices(id) on delete set null,
  rater_id        uuid not null references auth.users(id) on delete cascade,
  rater_name      text not null,
  rated_user_id   uuid not null references auth.users(id) on delete cascade,
  stars           smallint not null check (stars between 1 and 5),
  review          text,
  created_at      timestamptz not null default now()
);

-- Only one rating per rater per job
create unique index if not exists ratings_rater_job_unique
  on public.ratings (rater_id, job_id);

-- ─────────────────────────────────────────────
-- 3. RLS policies for ratings
-- ─────────────────────────────────────────────
alter table public.ratings enable row level security;

-- Anyone can read ratings (they're public — displayed on pro profiles)
drop policy if exists "ratings_public_read" on public.ratings;
create policy "ratings_public_read"
  on public.ratings for select
  using (true);

-- Only the rater can insert their own rating
drop policy if exists "ratings_rater_insert" on public.ratings;
create policy "ratings_rater_insert"
  on public.ratings for insert
  with check (rater_id = auth.uid());

-- Rater can update (edit review text / stars) their own rating
drop policy if exists "ratings_rater_update" on public.ratings;
create policy "ratings_rater_update"
  on public.ratings for update
  using (rater_id = auth.uid())
  with check (rater_id = auth.uid());

-- ─────────────────────────────────────────────
-- 4. Expose average rating on pro profile view
--    (used by the marketplace / pro profile page)
-- ─────────────────────────────────────────────
create or replace view public.pro_ratings_summary as
  select
    rated_user_id                         as pro_id,
    count(*)::int                         as total_ratings,
    round(avg(stars)::numeric, 1)         as avg_stars
  from public.ratings
  group by rated_user_id;
