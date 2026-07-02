-- Public quote links: clients without the app open a web page served by the
-- quote-link edge function, view the quote, and accept with an e-signature.
alter table public.quotes
  add column if not exists share_token text,
  add column if not exists sent_at timestamptz,
  add column if not exists viewed_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists signed_name text;

create unique index if not exists quotes_share_token_idx
  on public.quotes (share_token)
  where share_token is not null;
