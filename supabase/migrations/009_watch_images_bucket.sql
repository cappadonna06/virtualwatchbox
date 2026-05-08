-- ============================================================
-- Ensure the `watch-images` storage bucket exists for admin curated photos.
-- Migration 002 created the watch_images TABLE but the bucket itself was
-- expected to be created manually in the Supabase Dashboard. This migration
-- creates it idempotently and adds matching storage RLS so admin uploads
-- via /admin/images succeed.
-- ============================================================

insert into storage.buckets (id, name, public)
  values ('watch-images', 'watch-images', true)
  on conflict (id) do nothing;

-- Public read so curated images render everywhere.
drop policy if exists "watch-images: public read" on storage.objects;
create policy "watch-images: public read"
  on storage.objects
  for select
  using (bucket_id = 'watch-images');

-- Authenticated users can write under this bucket. The /admin/images flow
-- already gates the API route with requireAdmin(); the storage RLS just
-- needs to permit any authenticated session through.
drop policy if exists "watch-images: auth write" on storage.objects;
create policy "watch-images: auth write"
  on storage.objects
  for insert
  with check (
    bucket_id = 'watch-images'
    and auth.role() = 'authenticated'
  );

drop policy if exists "watch-images: auth update" on storage.objects;
create policy "watch-images: auth update"
  on storage.objects
  for update
  using (
    bucket_id = 'watch-images'
    and auth.role() = 'authenticated'
  );

drop policy if exists "watch-images: auth delete" on storage.objects;
create policy "watch-images: auth delete"
  on storage.objects
  for delete
  using (
    bucket_id = 'watch-images'
    and auth.role() = 'authenticated'
  );
