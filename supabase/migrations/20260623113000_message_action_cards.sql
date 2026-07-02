alter table public.messages
  add column if not exists action_type text check (action_type is null or action_type in ('invoice_payment', 'quote_review')),
  add column if not exists action_label text,
  add column if not exists action_payload jsonb;
