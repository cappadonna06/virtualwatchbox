-- ============================================================
-- User photo submissions: pending catalog rows + private storage
-- ============================================================

-- Columns for moderation
alter table public.catalog_watches
  add column if not exists moderation_status text not null default 'approved'
    check (moderation_status in ('approved', 'pending', 'rejected'));

alter table public.catalog_watches
  add column if not exists submitted_by uuid references auth.users(id) on delete set null;

alter table public.catalog_watches
  add column if not exists image_url text;

create index if not exists catalog_watches_moderation_idx
  on public.catalog_watches (moderation_status);

create index if not exists catalog_watches_submitted_by_idx
  on public.catalog_watches (submitted_by);

-- Replace public-read policy so pending submissions are only visible to
-- their submitter (or admins via service role / direct query).
drop policy if exists "catalog_watches: public read" on public.catalog_watches;

create policy "catalog_watches: read approved or own pending"
  on public.catalog_watches
  for select
  using (
    moderation_status = 'approved'
    or submitted_by = auth.uid()
  );

-- ============================================================
-- Storage bucket for user-uploaded watch photos
-- ============================================================

insert into storage.buckets (id, name, public)
  values ('watch-photos', 'watch-photos', true)
  on conflict (id) do nothing;

-- Read: anyone can read (bucket is public so existing assets keep working).
create policy "watch-photos: public read"
  on storage.objects
  for select
  using (bucket_id = 'watch-photos');

-- Write: authenticated users can upload only under their own user_id prefix.
-- Folder layout: user-uploads/{user_id}/{filename}
create policy "watch-photos: user uploads under own folder"
  on storage.objects
  for insert
  with check (
    bucket_id = 'watch-photos'
    and auth.role() = 'authenticated'
    and (
      -- service-role or admin tooling bypasses
      auth.uid() is null
      or (storage.foldername(name))[1] = 'user-uploads'
        and (storage.foldername(name))[2] = auth.uid()::text
    )
  );

create policy "watch-photos: users delete own"
  on storage.objects
  for delete
  using (
    bucket_id = 'watch-photos'
    and (storage.foldername(name))[1] = 'user-uploads'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
