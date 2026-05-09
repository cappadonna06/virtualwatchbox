-- ============================================================
-- Virtual Watchbox — Tighten catalog_watches RLS
-- ============================================================
-- 003_catalog_watches.sql granted "all" to any authenticated user; that's
-- too loose now that real ingestion + admin curation are landing. After
-- this migration:
--
--   READ  — public for approved rows; submitter sees own pending; admins
--           see everything
--   WRITE — admin only (UPDATE / DELETE), unless the write is a user
--           submitting a NEW pending row tagged with their own uid
--
-- Service-role clients (admin tooling, seed script, ingestion worker)
-- bypass RLS entirely so they keep working.
-- ============================================================

-- Drop the loose blanket policy from 003 ---------------------------------
drop policy if exists "catalog_watches: auth write" on public.catalog_watches;

-- Re-create the read policy so admins also see pending/rejected rows ----
drop policy if exists "catalog_watches: read approved or own pending" on public.catalog_watches;
create policy "catalog_watches: read approved or own pending or admin"
  on public.catalog_watches
  for select
  using (
    moderation_status = 'approved'
    or submitted_by   = auth.uid()
    or public.is_admin(auth.uid())
  );

-- Insert: admins, OR users submitting a pending row tagged to themselves
drop policy if exists "catalog_watches: admin or user submit insert" on public.catalog_watches;
create policy "catalog_watches: admin or user submit insert"
  on public.catalog_watches
  for insert
  with check (
    public.is_admin(auth.uid())
    or (
      auth.uid() is not null
      and submitted_by      = auth.uid()
      and moderation_status = 'pending'
      and source            = 'user_submission'
    )
  );

-- Update / Delete: admins only
drop policy if exists "catalog_watches: admin update" on public.catalog_watches;
create policy "catalog_watches: admin update"
  on public.catalog_watches
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "catalog_watches: admin delete" on public.catalog_watches;
create policy "catalog_watches: admin delete"
  on public.catalog_watches
  for delete
  using (public.is_admin(auth.uid()));

-- Same tightening for watch_images: today RLS is auth-write blanket.
drop policy if exists "watch_images: auth write" on public.watch_images;

drop policy if exists "watch_images: admin write" on public.watch_images;
create policy "watch_images: admin write"
  on public.watch_images
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
