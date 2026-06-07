-- ============================================================
-- Virtual Watchbox — Lug width provenance on catalog_watches
-- ============================================================
-- Additive only. `lug_width_mm` already exists (migration 003) but carried no
-- record of *how* a value was determined. Strap-fit compatibility
-- (lib/strapCompatibility.ts) matches on an EXACT lug width, so a wrong value
-- is worse than a null (it produces a confidently-wrong "fits"). These columns
-- let us distinguish a reference-verified width from an unverified one and gate
-- what the UI / strap engine is allowed to trust.
--
--   lug_width_source     — short provenance tag, e.g. 'omega-official',
--                          'delugs', 'everest', 'strapmillcanada', 'reference-search'
--   lug_width_confidence — 'verified' | 'curated' | 'llm' | 'heuristic'
--                          (reference-first backfill writes only 'verified'/'curated';
--                           'heuristic' is reserved and never auto-written)
-- ============================================================

alter table public.catalog_watches
  add column if not exists lug_width_source     text,
  add column if not exists lug_width_confidence text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_watches_lug_width_confidence_check'
  ) then
    alter table public.catalog_watches
      add constraint catalog_watches_lug_width_confidence_check
      check (
        lug_width_confidence is null
        or lug_width_confidence in ('verified','curated','llm','heuristic')
      );
  end if;
end $$;
