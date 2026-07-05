-- ============================================================
-- Case segmentation v2 (Strap Studio — Feature 7 follow-up).
--
-- Widens the review vocabulary so watch_image_reviews can carry
-- Case Segmentation decisions (variant='case-only') alongside the existing
-- background-removal reviews (variant='primary'), and adds a 'not_applicable'
-- segmentation status for watches that should never get a case-only cutout
-- (integrated-bracelet designs — Royal Oak/Nautilus-style — where the Studio's
-- own product design intentionally stays side-by-side, per
-- docs/playbooks/case-segmentation-strategy.md).
--
-- Also adds case_shape / strap_attachment_type to catalog_watches: cheap,
-- queryable classification the segmentation pipeline derives (or a human
-- confirms in admin review) so admin triage and future routing don't need to
-- decode the lug_geometry jsonb blob.
-- ============================================================

alter table public.watch_image_reviews
  drop constraint if exists watch_image_reviews_status_check;

alter table public.watch_image_reviews
  add constraint watch_image_reviews_status_check
  check (status in ('pending', 'approved', 'needs_reprocess', 'deleted', 'needs_review', 'rejected'));

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'watch_images_segmentation_status_check'
  ) then
    alter table public.watch_images
      add constraint watch_images_segmentation_status_check
      check (segmentation_status is null or segmentation_status in
        ('pending', 'approved', 'needs_review', 'rejected', 'not_applicable'));
  else
    alter table public.watch_images drop constraint watch_images_segmentation_status_check;
    alter table public.watch_images
      add constraint watch_images_segmentation_status_check
      check (segmentation_status is null or segmentation_status in
        ('pending', 'approved', 'needs_review', 'rejected', 'not_applicable'));
  end if;
end $$;

alter table public.catalog_watches
  add column if not exists case_shape text,
  add column if not exists strap_attachment_type text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_watches_case_shape_check'
  ) then
    alter table public.catalog_watches
      add constraint catalog_watches_case_shape_check
      check (case_shape is null or case_shape in
        ('round', 'square', 'cushion', 'tonneau', 'rectangular', 'other'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_watches_strap_attachment_check'
  ) then
    alter table public.catalog_watches
      add constraint catalog_watches_strap_attachment_check
      check (strap_attachment_type is null or strap_attachment_type in
        ('drilled_lug', 'integrated', 'nato_through', 'unknown'));
  end if;
end $$;

create index if not exists catalog_watches_case_shape_idx
  on public.catalog_watches (case_shape)
  where case_shape is not null;
