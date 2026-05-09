-- ============================================================
-- Virtual Watchbox — watch_images multi-variant support
-- ============================================================
-- The original watch_images table assumed one image per catalog watch
-- (UNIQUE(watch_id)). This migration relaxes that to N:1 with a `variant`
-- discriminator so ingestion can capture multiple shots over time:
--
--   primary    — front-facing background-removed (used in watchbox slots)
--   dial       — close-up / macro
--   case_back  — movement view through caseback
--   bracelet   — bracelet/strap detail
--   lume       — lume shot
--   lifestyle  — wrist/lifestyle
--   macro      — non-dial detail macro
--
-- A partial unique index ensures at most one `primary` per watch. Other
-- variants are unconstrained on count (use sort_order for display).
--
-- Renames watch_id → catalog_watch_id and adds a real FK now that the
-- referenced rows live in public.catalog_watches.
-- ============================================================

-- Add the new columns (additive; safe to re-run) -------------------------
alter table public.watch_images
  add column if not exists variant    text not null default 'primary',
  add column if not exists sort_order integer not null default 0,
  add column if not exists caption    text;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'watch_images_variant_check'
  ) then
    alter table public.watch_images
      add constraint watch_images_variant_check
      check (variant in ('primary','dial','case_back','bracelet','lume','lifestyle','macro'));
  end if;
end $$;

-- Drop the old single-image constraint -----------------------------------
alter table public.watch_images
  drop constraint if exists watch_images_watch_id_key;

-- Rename the FK column for clarity (only if not already renamed) ---------
do $$ begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'watch_images'
      and column_name  = 'watch_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'watch_images'
      and column_name  = 'catalog_watch_id'
  ) then
    alter table public.watch_images rename column watch_id to catalog_watch_id;
  end if;
end $$;

-- Add real FK to catalog_watches (deferred so seed/ingest can land first)
-- Idempotent: only add if not already present.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'watch_images_catalog_watch_id_fkey'
  ) then
    -- Only add the FK if every existing row resolves; otherwise log and skip.
    if exists (
      select 1 from public.watch_images i
      left join public.catalog_watches c on c.id = i.catalog_watch_id
      where c.id is null
    ) then
      raise notice 'watch_images contains rows whose catalog_watch_id does not resolve in catalog_watches; FK skipped. Resolve and re-run.';
    else
      alter table public.watch_images
        add constraint watch_images_catalog_watch_id_fkey
        foreign key (catalog_watch_id)
        references public.catalog_watches(id)
        on delete cascade;
    end if;
  end if;
end $$;

-- Indexes ----------------------------------------------------------------
create index if not exists watch_images_catalog_idx
  on public.watch_images (catalog_watch_id);

create unique index if not exists watch_images_one_primary_per_watch
  on public.watch_images (catalog_watch_id)
  where variant = 'primary';

create unique index if not exists watch_images_watch_variant_sort_idx
  on public.watch_images (catalog_watch_id, variant, sort_order);
