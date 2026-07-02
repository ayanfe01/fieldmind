alter table public.conversations
  add column if not exists participant_user_ids uuid[] not null default array[]::uuid[];

update public.conversations
set participant_user_ids = array[owner_id]
where participant_user_ids = array[]::uuid[];

drop policy if exists "conversations_owner_all" on public.conversations;
drop policy if exists "messages_owner_all" on public.messages;
drop policy if exists "conversations_participants_select" on public.conversations;
drop policy if exists "conversations_participants_insert" on public.conversations;
drop policy if exists "conversations_participants_update" on public.conversations;
drop policy if exists "conversations_participants_delete" on public.conversations;
drop policy if exists "messages_participants_select" on public.messages;
drop policy if exists "messages_participants_insert" on public.messages;
drop policy if exists "messages_owner_update" on public.messages;
drop policy if exists "messages_owner_delete" on public.messages;

create policy "conversations_participants_select"
on public.conversations
for select
using (auth.uid() = any(participant_user_ids));

create policy "conversations_participants_insert"
on public.conversations
for insert
with check (auth.uid() = owner_id and auth.uid() = any(participant_user_ids));

create policy "conversations_participants_update"
on public.conversations
for update
using (auth.uid() = any(participant_user_ids))
with check (auth.uid() = any(participant_user_ids));

create policy "conversations_participants_delete"
on public.conversations
for delete
using (auth.uid() = owner_id);

create policy "messages_participants_select"
on public.messages
for select
using (
  exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and auth.uid() = any(conversations.participant_user_ids)
  )
);

create policy "messages_participants_insert"
on public.messages
for insert
with check (
  sender_id = auth.uid()::text
  and exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and auth.uid() = any(conversations.participant_user_ids)
  )
);

create policy "messages_owner_update"
on public.messages
for update
using (sender_id = auth.uid()::text)
with check (sender_id = auth.uid()::text);

create policy "messages_owner_delete"
on public.messages
for delete
using (sender_id = auth.uid()::text);
