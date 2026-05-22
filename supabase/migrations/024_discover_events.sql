-- discover_events: client-side telemetry for /discover.
--
-- Powers ranking iteration: which sections see the most clicks, which slot
-- indexes in our top-10 pools actually get picked, how often users refresh,
-- etc. Insert-only from the client; analytical reads happen service-role.

create table if not exists public.discover_events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'impression', 'click', 'refresh', 'target', 'follow', 'grail', 'market_click'
  )),
  section text not null check (section in ('upgrade', 'hero', 'next_slot')),
  seed_key text,
  catalog_watch_id text,
  slot_index int,
  refresh_offset int default 0,
  created_at timestamptz not null default now()
);

create index if not exists discover_events_user_ts_idx
  on public.discover_events (user_id, created_at desc);
create index if not exists discover_events_section_ts_idx
  on public.discover_events (section, created_at desc);
create index if not exists discover_events_watch_ts_idx
  on public.discover_events (catalog_watch_id, created_at desc);

alter table public.discover_events enable row level security;

drop policy if exists "discover_events_insert_own" on public.discover_events;
create policy "discover_events_insert_own"
  on public.discover_events for insert
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "discover_events_select_own" on public.discover_events;
create policy "discover_events_select_own"
  on public.discover_events for select
  using (user_id is null or user_id = auth.uid());
