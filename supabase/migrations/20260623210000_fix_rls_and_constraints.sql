-- ============================================================
-- 1. Fix messages_action_type_check
--    booking_confirmed and quote_declined were added in code
--    but the DB constraint still only allows the original 2 values.
-- ============================================================
alter table public.messages
  drop constraint if exists messages_action_type_check;

alter table public.messages
  add constraint messages_action_type_check
  check (
    action_type is null
    or action_type in (
      'invoice_payment',
      'quote_review',
      'booking_confirmed',
      'quote_declined'
    )
  );

-- ============================================================
-- 2. Fix conversations_participants_insert
--    Old policy: auth.uid() = owner_id AND auth.uid() = any(participant_user_ids)
--    Problem: when a pro patches a conversation owned by a customer,
--    auth.uid() != owner_id → INSERT fails even though the pro is a participant.
--    Fix: only require auth.uid() = any(participant_user_ids)
-- ============================================================
drop policy if exists "conversations_participants_insert" on public.conversations;
create policy "conversations_participants_insert"
on public.conversations
for insert
with check (auth.uid() = any(participant_user_ids));

-- ============================================================
-- 3. Fix messages_participants_insert
--    Problem: the app fires saveConversation and saveMessage concurrently
--    (both void). If the message INSERT reaches Supabase before the
--    conversation INSERT commits, the EXISTS sub-query returns no rows
--    and the policy rejects the message.
--    Fix: also allow INSERT when the user owns the conversation
--    (owner_id = auth.uid()), which is true at INSERT time even before
--    participant_user_ids is fully populated.
-- ============================================================
drop policy if exists "messages_participants_insert" on public.messages;
create policy "messages_participants_insert"
on public.messages
for insert
with check (
  sender_id = auth.uid()::text
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (
        c.owner_id = auth.uid()
        or auth.uid() = any(c.participant_user_ids)
      )
  )
);

-- ============================================================
-- 4. Ensure jobs_assigned_pro_update policy exists
--    (idempotent — safe to re-run even if already applied)
-- ============================================================
drop policy if exists "jobs_assigned_pro_update" on public.jobs;
create policy "jobs_assigned_pro_update"
on public.jobs
for update
using (assigned_pro_id = auth.uid())
with check (assigned_pro_id = auth.uid());
