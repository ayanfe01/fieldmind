create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('tradesperson', 'customer', 'admin')),
  name text not null,
  email text not null,
  phone text,
  business_name text,
  trade text,
  pricing_mode text check (pricing_mode in ('hourly', 'fixed', 'quote')),
  hourly_rate numeric(10,2),
  fixed_rate numeric(10,2),
  years_experience integer,
  service_area text,
  license_number text,
  bio text,
  property_address text,
  property_type text,
  profile_photo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  address text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  title text not null,
  description text not null,
  scheduled_date date not null,
  scheduled_time text not null,
  estimated_hours numeric(8,2) not null default 1,
  status text not null check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  address text not null,
  quote_id text,
  invoice_id text,
  notes text,
  customer_media jsonb not null default '[]'::jsonb,
  completion_media jsonb not null default '[]'::jsonb,
  escrow_status text check (escrow_status in ('holding', 'released', 'disputed')),
  customer_verified_at timestamptz,
  payment_method text check (payment_method in ('stripe', 'cash')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  job_description text not null,
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null check (status in ('draft', 'sent', 'accepted', 'declined')),
  notes text,
  valid_until timestamptz not null,
  payment_terms text check (payment_terms in ('full_after', 'split_50_50', 'full_upfront', 'custom')),
  deposit_percent numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  quote_id text,
  client_id text not null,
  job_description text not null,
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null check (status in ('draft', 'sent', 'paid', 'overdue')),
  due_date timestamptz not null,
  paid_at timestamptz,
  notes text,
  payment_terms text check (payment_terms in ('full_after', 'split_50_50', 'full_upfront', 'custom')),
  deposit_percent numeric(5,2),
  deposit_amount numeric(12,2),
  final_amount numeric(12,2),
  deposit_paid_at timestamptz,
  deposit_payment_intent_id text,
  final_payment_intent_id text,
  payment_status text check (payment_status in ('unpaid', 'deposit_paid', 'fully_paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  status text not null check (status in ('pending', 'completed', 'failed')),
  bank_last4 text not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_items (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  uri text not null,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_owner_id_idx on public.clients(owner_id);
create index if not exists jobs_owner_id_idx on public.jobs(owner_id);
create index if not exists jobs_status_idx on public.jobs(status);
create index if not exists quotes_owner_id_idx on public.quotes(owner_id);
create index if not exists invoices_owner_id_idx on public.invoices(owner_id);
create index if not exists withdrawals_owner_id_idx on public.withdrawals(owner_id);
create index if not exists portfolio_items_owner_id_idx on public.portfolio_items(owner_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
drop trigger if exists set_jobs_updated_at on public.jobs;
create trigger set_jobs_updated_at before update on public.jobs for each row execute function public.set_updated_at();
drop trigger if exists set_quotes_updated_at on public.quotes;
create trigger set_quotes_updated_at before update on public.quotes for each row execute function public.set_updated_at();
drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at before update on public.invoices for each row execute function public.set_updated_at();
drop trigger if exists set_withdrawals_updated_at on public.withdrawals;
create trigger set_withdrawals_updated_at before update on public.withdrawals for each row execute function public.set_updated_at();
drop trigger if exists set_portfolio_items_updated_at on public.portfolio_items;
create trigger set_portfolio_items_updated_at before update on public.portfolio_items for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.jobs enable row level security;
alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.withdrawals enable row level security;
alter table public.portfolio_items enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "clients_owner_all" on public.clients;
create policy "clients_owner_all" on public.clients for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "jobs_owner_all" on public.jobs;
create policy "jobs_owner_all" on public.jobs for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "quotes_owner_all" on public.quotes;
create policy "quotes_owner_all" on public.quotes for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "invoices_owner_all" on public.invoices;
create policy "invoices_owner_all" on public.invoices for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "withdrawals_owner_all" on public.withdrawals;
create policy "withdrawals_owner_all" on public.withdrawals for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "portfolio_items_owner_all" on public.portfolio_items;
create policy "portfolio_items_owner_all" on public.portfolio_items for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
