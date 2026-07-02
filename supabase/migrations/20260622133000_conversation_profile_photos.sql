alter table public.conversations
  add column if not exists initiator_photo text,
  add column if not exists participant_photo text;

update public.conversations c
set initiator_photo = p.profile_photo
from public.profiles p
where c.owner_id = p.id
  and c.initiator_photo is null;
