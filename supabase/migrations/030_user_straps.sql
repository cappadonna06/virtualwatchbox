-- ============================================================
-- Virtual Watchbox — user_straps + strap_watch_overrides (Feature 7 / Strap Drawer)
-- ============================================================
-- First-class strap inventory. Unlike watches, straps have no universal
-- catalog — users add them manually. lug_width_mm is the compatibility key
-- and is required. RLS scoped to the owner, same pattern as
-- watch_service_records (migration 027).
--
-- strap_watch_overrides records manual fit decisions ('fits' / 'excluded')
-- that override the automatic lug-width match. One row per (strap, watch).
-- purchase_price is stored in cents to avoid float drift.
-- ============================================================

create table if not exists public.user_straps (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text,
  brand          text,
  material       text not null,
  sub_material   text,
  color          text not null,
  color_hex      text,
  lug_width_mm   integer not null,
  style          text,
  tapered_to_mm  integer,
  length_mm      integer,
  clasp_type     text,
  purchase_price integer,            -- cents; null = no price recorded
  purchase_url   text,
  photo_url      text,
  notes          text,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_straps_material_check'
  ) then
    alter table public.user_straps
      add constraint user_straps_material_check
      check (material in (
        'leather', 'rubber', 'nylon', 'canvas', 'fabric',
        'metal', 'silicone', 'ceramic', 'exotic', 'other'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_straps_style_check'
  ) then
    alter table public.user_straps
      add constraint user_straps_style_check
      check (style is null or style in (
        'dressy', 'sporty', 'casual', 'rugged', 'vintage'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_straps_lug_width_check'
  ) then
    alter table public.user_straps
      add constraint user_straps_lug_width_check
      check (lug_width_mm between 6 and 32);
  end if;
end $$;

-- Drawer ordering + filter queries.
create index if not exists user_straps_user_sort_idx
  on public.user_straps (user_id, sort_order);

-- Lug-width compatibility lookups.
create index if not exists user_straps_user_lug_idx
  on public.user_straps (user_id, lug_width_mm);

alter table public.user_straps enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_straps'
      and policyname = 'own straps'
  ) then
    create policy "own straps"
      on public.user_straps for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create trigger set_updated_at before update on public.user_straps
  for each row execute procedure public.set_updated_at();

-- ─── Overrides ─────────────────────────────────────────────────────────────

create table if not exists public.strap_watch_overrides (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  strap_id    uuid not null references public.user_straps(id) on delete cascade,
  watch_id    uuid not null references public.watches(id) on delete cascade,
  override    text not null,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (strap_id, watch_id)
);

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'strap_watch_overrides_override_check'
  ) then
    alter table public.strap_watch_overrides
      add constraint strap_watch_overrides_override_check
      check (override in ('fits', 'excluded'));
  end if;
end $$;

create index if not exists strap_watch_overrides_strap_idx
  on public.strap_watch_overrides (strap_id);

create index if not exists strap_watch_overrides_watch_idx
  on public.strap_watch_overrides (watch_id);

create index if not exists strap_watch_overrides_user_idx
  on public.strap_watch_overrides (user_id);

alter table public.strap_watch_overrides enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'strap_watch_overrides'
      and policyname = 'own strap overrides'
  ) then
    create policy "own strap overrides"
      on public.strap_watch_overrides for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
