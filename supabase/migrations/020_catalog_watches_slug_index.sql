-- ============================================================
-- Virtual Watchbox — Index on catalog_watches.slug
-- ============================================================
-- Migration 011 added `slug` as a generated stored column
--   (lower(brand-model-reference)). With ingestion landing real volume
-- the URL router will lookup by slug in the hot path, so we need an
-- index. Generated stored columns can be indexed normally.
--
-- This is intentionally NOT unique: the slug is derived, and two distinct
-- catalog entries can in principle compute the same slug if a curator
-- inserts identical brand/model/reference. The unique constraint to
-- prevent dupes lives on (brand, reference, dial_color) — see migration 011.
-- ============================================================

create index if not exists catalog_watches_slug_idx
  on public.catalog_watches (slug);
