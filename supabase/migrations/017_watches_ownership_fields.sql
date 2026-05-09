-- ============================================================
-- Virtual Watchbox — Slim watches + add ownership fields
-- ============================================================
-- 1. Drop NOT NULL on the legacy catalog-mirror columns so app code can
--    stop writing them. Existing rows keep their values; new rows can
--    omit them. The columns themselves are dropped in a later destructive
--    migration once readers have moved off them.
-- 2. Add the ownership/instance richness the new model calls for.
-- ============================================================

-- 1) Relax legacy mirror columns ----------------------------------------
alter table public.watches alter column brand        drop not null;
alter table public.watches alter column model        drop not null;
-- reference, case_size_mm, etc. were already nullable in 001 — no-ops below
-- are safe. Wrapping in DO blocks would be defensive overhead; commented out.

-- 2) Add ownership + provenance + valuation overrides ------------------
alter table public.watches
  add column if not exists acquisition_method text,
  add column if not exists purchase_currency  text not null default 'USD',
  add column if not exists purchase_location  text,
  add column if not exists has_box            boolean not null default false,
  add column if not exists has_papers         boolean not null default false,
  add column if not exists warranty_expires_at date,
  add column if not exists last_serviced_at   date,
  add column if not exists service_notes      text,
  add column if not exists insurance_value_usd integer,
  add column if not exists asking_price       integer,
  add column if not exists tags               text[] not null default '{}';

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'watches_acquisition_method_check'
  ) then
    alter table public.watches
      add constraint watches_acquisition_method_check
      check (acquisition_method is null or acquisition_method in
        ('new','pre-owned','gift','inherited','trade','auction'));
  end if;
end $$;

create index if not exists watches_user_tags_gin
  on public.watches using gin (tags);
