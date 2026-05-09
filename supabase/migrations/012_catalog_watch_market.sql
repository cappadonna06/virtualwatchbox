-- ============================================================
-- Virtual Watchbox — Market layer (current snapshot + history)
-- ============================================================
-- Splits "data that changes" out of catalog_watches:
--   * catalog_watch_market         — 1:1 current snapshot (hot path)
--   * catalog_watch_market_history — append-only daily series (sparkline/trend)
--
-- Public read on both. Writes restricted to admins / service role.
-- Engagement counters live on the snapshot table; triggers on watch_states
-- and watches keep them in sync (migration 013).
--
-- Backfill: market_value_usd seeded from catalog_watches.estimated_value
-- so existing reads keep working through the resolver.
-- ============================================================

-- Current snapshot -------------------------------------------------------
create table if not exists public.catalog_watch_market (
  catalog_watch_id text primary key references public.catalog_watches(id) on delete cascade,

  -- Pricing
  market_value_usd      integer,
  market_value_low_usd  integer,
  market_value_high_usd integer,
  currency              text not null default 'USD',
  value_source          text,
  value_confidence      text check (value_confidence is null or value_confidence in ('low','medium','high')),
  trend_30d_pct         numeric(6,2),
  trend_90d_pct         numeric(6,2),
  last_priced_at        timestamptz,

  -- Engagement / heat
  heat_score            numeric(7,2),
  popularity_rank       integer,
  follow_count_denorm   integer not null default 0,
  target_count_denorm   integer not null default 0,
  grail_count_denorm    integer not null default 0,
  owned_count_denorm    integer not null default 0,
  last_pop_computed_at  timestamptz,

  updated_at            timestamptz not null default now()
);

create index if not exists catalog_watch_market_heat_idx
  on public.catalog_watch_market (heat_score desc nulls last);
create index if not exists catalog_watch_market_popularity_idx
  on public.catalog_watch_market (popularity_rank);
create index if not exists catalog_watch_market_value_idx
  on public.catalog_watch_market (market_value_usd);

-- updated_at auto-update
drop trigger if exists catalog_watch_market_updated_at on public.catalog_watch_market;
create trigger catalog_watch_market_updated_at
  before update on public.catalog_watch_market
  for each row execute procedure public.set_updated_at();

-- Append-only history ----------------------------------------------------
create table if not exists public.catalog_watch_market_history (
  id                    bigserial primary key,
  catalog_watch_id      text not null references public.catalog_watches(id) on delete cascade,
  snapshot_date         date not null,
  market_value_usd      integer,
  market_value_low_usd  integer,
  market_value_high_usd integer,
  value_source          text,
  heat_score            numeric(7,2),
  follow_count          integer,
  target_count          integer,
  owned_count           integer,
  unique (catalog_watch_id, snapshot_date)
);

create index if not exists catalog_watch_market_history_watch_date_idx
  on public.catalog_watch_market_history (catalog_watch_id, snapshot_date desc);

-- RLS --------------------------------------------------------------------
alter table public.catalog_watch_market         enable row level security;
alter table public.catalog_watch_market_history enable row level security;

drop policy if exists "catalog_watch_market: public read" on public.catalog_watch_market;
create policy "catalog_watch_market: public read"
  on public.catalog_watch_market
  for select using (true);

drop policy if exists "catalog_watch_market: admin write" on public.catalog_watch_market;
create policy "catalog_watch_market: admin write"
  on public.catalog_watch_market
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "catalog_watch_market_history: public read" on public.catalog_watch_market_history;
create policy "catalog_watch_market_history: public read"
  on public.catalog_watch_market_history
  for select using (true);

drop policy if exists "catalog_watch_market_history: admin write" on public.catalog_watch_market_history;
create policy "catalog_watch_market_history: admin write"
  on public.catalog_watch_market_history
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Backfill from legacy catalog_watches.estimated_value ------------------
-- Idempotent: insert one row per catalog watch, do nothing on conflict.
insert into public.catalog_watch_market (catalog_watch_id, market_value_usd, value_source)
  select id,
         nullif(estimated_value, 0),
         case when estimated_value > 0 then 'seed' else null end
  from public.catalog_watches
on conflict (catalog_watch_id) do nothing;
