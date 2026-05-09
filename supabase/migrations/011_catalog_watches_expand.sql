-- ============================================================
-- Virtual Watchbox — Expand catalog_watches with kitchen-sink fields
-- ============================================================
-- Additive only. All new columns nullable or defaulted so existing rows
-- and existing app code keep working unchanged. Ingestion pipelines can
-- populate everything; UI surfaces fields as it's ready.
--
-- Field groups:
--   Identity      — model_family, slug, nickname
--   Case          — lug_to_lug, thickness, finishes, bezel/crystal materials, water resistance, weight
--   Dial          — dial_finish, marker_type, lume_color
--   Movement      — caliber, movement_type, power reserve, frequency, jewel count
--   Strap         — bracelet_type, clasp_type
--   Production    — year_introduced/discontinued, production_status, msrp, country
--   Categorization — style_tags, gender_target
--   Lineage       — replaces/replaced_by reference
--   Curation      — approved_by, approved_at, verification_status/notes
--   Bookkeeping   — content_version (cache bust on facts edit)
--
-- estimated_value and image_url remain on this table during transition;
-- they will be retired in the destructive cleanup migration once readers
-- have migrated to catalog_watch_market and watch_images respectively.
-- ============================================================

-- Identity ---------------------------------------------------------------
alter table public.catalog_watches
  add column if not exists model_family text,
  add column if not exists nickname     text;

-- slug is generated; safe to add as a stored column (idempotent name)
alter table public.catalog_watches
  add column if not exists slug text generated always as (
    lower(regexp_replace(coalesce(brand,'')||'-'||coalesce(model,'')||'-'||coalesce(reference,''),
                         '[^a-zA-Z0-9]+','-','g'))
  ) stored;

-- Physical case ----------------------------------------------------------
alter table public.catalog_watches
  add column if not exists lug_to_lug_mm        numeric(5,2),
  add column if not exists thickness_mm         numeric(5,2),
  add column if not exists case_finish          text,
  add column if not exists bezel_material       text,
  add column if not exists bezel_type           text,
  add column if not exists crystal_material     text,
  add column if not exists water_resistance_m   integer,
  add column if not exists weight_g             integer;

-- Dial -------------------------------------------------------------------
alter table public.catalog_watches
  add column if not exists dial_finish text,
  add column if not exists marker_type text,
  add column if not exists lume_color  text;

-- Movement ---------------------------------------------------------------
alter table public.catalog_watches
  add column if not exists caliber             text,
  add column if not exists movement_type       text,
  add column if not exists power_reserve_hours integer,
  add column if not exists frequency_vph       integer,
  add column if not exists jewel_count         integer;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_watches_movement_type_check'
  ) then
    alter table public.catalog_watches
      add constraint catalog_watches_movement_type_check
      check (movement_type is null or movement_type in
        ('automatic','manual','quartz','mecaquartz','solar','spring-drive'));
  end if;
end $$;

-- Strap / bracelet -------------------------------------------------------
alter table public.catalog_watches
  add column if not exists bracelet_type text,
  add column if not exists clasp_type    text;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_watches_bracelet_type_check'
  ) then
    alter table public.catalog_watches
      add constraint catalog_watches_bracelet_type_check
      check (bracelet_type is null or bracelet_type in ('bracelet','strap','integrated'));
  end if;
end $$;

-- Production -------------------------------------------------------------
alter table public.catalog_watches
  add column if not exists year_introduced       integer,
  add column if not exists year_discontinued     integer,
  add column if not exists production_status     text not null default 'current',
  add column if not exists limited_edition_count integer,
  add column if not exists msrp_at_launch_usd    integer,
  add column if not exists country_of_origin     text;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_watches_year_introduced_check'
  ) then
    alter table public.catalog_watches
      add constraint catalog_watches_year_introduced_check
      check (year_introduced is null or year_introduced between 1850 and 2100);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_watches_production_status_check'
  ) then
    alter table public.catalog_watches
      add constraint catalog_watches_production_status_check
      check (production_status in ('current','discontinued','limited','one-off','prototype'));
  end if;
end $$;

-- Categorization ---------------------------------------------------------
alter table public.catalog_watches
  add column if not exists style_tags    text[] not null default '{}',
  add column if not exists gender_target text not null default 'unisex';

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_watches_gender_target_check'
  ) then
    alter table public.catalog_watches
      add constraint catalog_watches_gender_target_check
      check (gender_target in ('unisex','mens','womens'));
  end if;
end $$;

-- Lineage ----------------------------------------------------------------
alter table public.catalog_watches
  add column if not exists replaces_reference    text,
  add column if not exists replaced_by_reference text;

-- Curation / verification ------------------------------------------------
alter table public.catalog_watches
  add column if not exists approved_by         uuid references auth.users(id) on delete set null,
  add column if not exists approved_at         timestamptz,
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verification_notes  text;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_watches_verification_status_check'
  ) then
    alter table public.catalog_watches
      add constraint catalog_watches_verification_status_check
      check (verification_status in ('verified','unverified','community'));
  end if;
end $$;

-- Tighten the existing 'source' check to the planned set (additive — old
-- rows default to 'manual' which is in both sets).
do $$ begin
  if exists (
    select 1 from pg_constraint where conname = 'catalog_watches_source_check'
  ) then
    alter table public.catalog_watches drop constraint catalog_watches_source_check;
  end if;
  alter table public.catalog_watches
    add constraint catalog_watches_source_check
    check (source in ('manual','seed','ingestion','user_submission','partner_feed'));
end $$;

-- Bookkeeping ------------------------------------------------------------
alter table public.catalog_watches
  add column if not exists content_version integer not null default 1;

-- Unique guard against accidental dupes (brand, reference, dial_color) ---
-- Allowed to be permissive since dial_color may legitimately distinguish
-- two refs. Skips if a dup already exists; admin can clean up first then
-- re-run. Wrapped in DO block so re-runs don't error.
do $$ begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname  = 'catalog_watches_brand_reference_dial_color_idx'
  ) then
    begin
      create unique index catalog_watches_brand_reference_dial_color_idx
        on public.catalog_watches (brand, reference, dial_color);
    exception when unique_violation then
      raise notice 'catalog_watches has duplicate (brand, reference, dial_color); skipping unique index. Resolve and re-run.';
    end;
  end if;
end $$;

-- Indexes ----------------------------------------------------------------
create index if not exists catalog_watches_brand_family_idx
  on public.catalog_watches (brand, model_family);
create index if not exists catalog_watches_watch_type_idx
  on public.catalog_watches (watch_type);
create index if not exists catalog_watches_style_tags_gin
  on public.catalog_watches using gin (style_tags);
create index if not exists catalog_watches_complications_gin
  on public.catalog_watches using gin (complications);
create index if not exists catalog_watches_production_status_idx
  on public.catalog_watches (production_status);

-- Bump content_version on any update so cache busters can invalidate.
create or replace function public.bump_catalog_watches_content_version()
returns trigger language plpgsql as $$
begin
  -- Only bump if any non-bookkeeping column actually changed.
  if to_jsonb(new) - 'updated_at' - 'content_version' is distinct from
     to_jsonb(old) - 'updated_at' - 'content_version'
  then
    new.content_version = coalesce(old.content_version, 1) + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists catalog_watches_content_version on public.catalog_watches;
create trigger catalog_watches_content_version
  before update on public.catalog_watches
  for each row execute function public.bump_catalog_watches_content_version();
