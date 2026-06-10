-- ============================================================
-- Case-only segmentation columns on public.watch_images (Strap Studio — Feature 7).
--
-- The Strap Studio's "true composite" mode layers a strap image BEHIND a
-- case-only render of the watch head (strap region transparent). These columns
-- store the segmentation output + lug-attachment geometry that the composite
-- renderer uses to position/scale the strap, plus a review status so a human
-- can approve/reject each cutout in /admin/image-review → "Case Segmentation".
--
-- Columns live on the canonical `primary` variant row for each catalog_watch_id.
-- The client never reads these directly — the segmentation script also writes a
-- committed static bridge (data/case-only-images.json → lib/caseOnlyImages.ts)
-- so the Studio resolves case-only assets at module-load with zero round-trips.
-- These columns are the source of truth + the admin-review surface.
-- ============================================================

alter table public.watch_images
  add column if not exists case_only_url text,
  add column if not exists case_only_webp_url text,
  add column if not exists lug_geometry jsonb,
  add column if not exists segmentation_confidence numeric,
  add column if not exists segmentation_reviewed_at timestamptz;

-- segmentation_status with a checked vocabulary. Added separately so the CHECK
-- can be created idempotently (ADD COLUMN IF NOT EXISTS can't carry a named
-- constraint that may already exist from a prior run).
alter table public.watch_images
  add column if not exists segmentation_status text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'watch_images_segmentation_status_check'
  ) then
    alter table public.watch_images
      add constraint watch_images_segmentation_status_check
      check (segmentation_status is null or segmentation_status in
        ('pending', 'approved', 'needs_review', 'rejected'));
  end if;
end $$;

-- Partial index: the admin "Case Segmentation" queue filters to rows that have a
-- case-only cutout, ordered by status. Keeps that scan off the full table.
create index if not exists watch_images_segmentation_status_idx
  on public.watch_images (segmentation_status)
  where case_only_url is not null;
