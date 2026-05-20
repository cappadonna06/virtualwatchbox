-- ============================================================
-- Virtual Watchbox — watch_image_reviews.tags
-- ============================================================
-- Structured failure-mode tags so the --feedback pass of process-watch-images
-- can route per-watch overrides at the pipeline stage that caused each
-- failure (ML over-segmentation vs shadow walker vs small-component pruner
-- vs alpha-edge halo).
--
-- Allowed values are not enforced at the DB level — UI is the source of
-- truth for the tag vocabulary. Storing as text[] keeps adding/removing
-- tags cheap.
-- ============================================================

alter table public.watch_image_reviews
  add column if not exists tags text[] not null default '{}';

create index if not exists watch_image_reviews_tags_idx
  on public.watch_image_reviews using gin (tags);
