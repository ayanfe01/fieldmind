alter table public.messages
  add column if not exists media_uri text,
  add column if not exists media_type text check (media_type is null or media_type in ('image'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat_attachments_public_select" on storage.objects;
drop policy if exists "chat_attachments_user_insert" on storage.objects;
drop policy if exists "chat_attachments_user_update" on storage.objects;
drop policy if exists "chat_attachments_user_delete" on storage.objects;

create policy "chat_attachments_public_select"
on storage.objects
for select
using (bucket_id = 'chat-attachments');

create policy "chat_attachments_user_insert"
on storage.objects
for insert
with check (
  bucket_id = 'chat-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "chat_attachments_user_update"
on storage.objects
for update
using (
  bucket_id = 'chat-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'chat-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "chat_attachments_user_delete"
on storage.objects
for delete
using (
  bucket_id = 'chat-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);
