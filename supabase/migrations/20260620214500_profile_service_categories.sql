alter table public.profiles
  add column if not exists trades text[] not null default array[]::text[],
  add column if not exists custom_trade text;

update public.profiles
set trades = array[trade]
where trades = array[]::text[]
  and trade is not null;
