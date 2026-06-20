create table if not exists public.conversations (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  participant_id text not null,
  participant_name text not null,
  participant_role text not null check (participant_role in ('tradesperson', 'customer', 'admin')),
  subject text,
  quote_requested boolean not null default false,
  last_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  conversation_id text not null references public.conversations(id) on delete cascade,
  sender_id text not null,
  sender_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists conversations_owner_id_idx on public.conversations(owner_id);
create index if not exists messages_owner_id_idx on public.messages(owner_id);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversations_owner_all" on public.conversations;
create policy "conversations_owner_all" on public.conversations for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "messages_owner_all" on public.messages;
create policy "messages_owner_all" on public.messages for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
