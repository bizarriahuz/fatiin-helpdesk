alter table public.tickets
  add column attachment_path text,
  add constraint tickets_attachment_path_owner_prefix
    check (attachment_path is null or attachment_path like requester_id::text || '/%');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'helpdesk-attachments',
  'helpdesk-attachments',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Requesters can upload their own ticket attachments"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'helpdesk-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Requesters and staff can read ticket attachments"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'helpdesk-attachments'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1
        from public.helpdesk_staff as staff
        where staff.user_id = (select auth.uid())
      )
    )
  );

create policy "Requesters can remove their own unlinked attachments"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'helpdesk-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
