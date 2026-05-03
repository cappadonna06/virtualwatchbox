-- ============================================================
-- Virtual Watchbox — Watch Images Table
-- Stores metadata for catalog watch images uploaded via the
-- admin intake tool (/admin/images). Images themselves are
-- stored in Supabase Storage bucket "watch-images".
--
-- Before running this migration, create the storage bucket:
--   Supabase Dashboard → Storage → New bucket
--   Name: watch-images
--   Public: true (images are served publicly in the catalog)
-- ============================================================

create table if not exists public.watch_images (
  id uuid primary key default gen_random_uuid(),
  watch_id text not null unique,          -- catalog watch id (e.g. 'rolex-submariner')
  png_url text not null,                  -- Supabase Storage public URL for PNG
  webp_url text not null,                 -- Supabase Storage public URL for WebP
  source_width integer,
  source_height integer,
  processed_width integer,
  processed_height integer,
  background_removal_applied boolean not null default false,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Public read: catalog images are visible to all users
-- Write: only authenticated users (curator) can manage images
alter table public.watch_images enable row level security;

create policy "watch_images: public read" on public.watch_images
  for select using (true);

create policy "watch_images: auth write" on public.watch_images
  for all using (auth.uid() is not null);

-- ============================================================
-- Storage bucket policy (run after creating the bucket)
-- ============================================================
-- In Supabase Dashboard → Storage → watch-images → Policies,
-- add a policy for INSERT/UPDATE/DELETE requiring auth.uid() is not null.
-- Public read is handled by the bucket being set to public.
