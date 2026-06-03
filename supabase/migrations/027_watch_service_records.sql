-- ============================================================
-- Virtual Watchbox — watch_service_records (Feature 2F / Service Room)
-- ============================================================
-- Per-watch service history: each owned watch can have zero or more
-- service records. Drives the service timeline, next-due estimate, and
-- lifetime-upkeep totals. RLS scoped to the owner, same pattern as
-- user_watch_photos (migration 008).
--
-- service_type uses the Service Room's 8-type taxonomy. 'full' and
-- 'movement' are the clock-resetting services that reset next-due.
-- cost is stored in cents to avoid float drift.
-- ============================================================

create table if not exists public.watch_service_records (
  id            uuid primary key default gen_random_uuid(),
  watch_id      uuid not null references public.watches(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  service_date  date not null,
  service_type  text not null,
  provider      text,
  cost          integer,           -- cents; null = no charge recorded
  currency      text not null default 'USD',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'watch_service_records_service_type_check'
  ) then
    alter table public.watch_service_records
      add constraint watch_service_records_service_type_check
      check (service_type in (
        'full', 'movement', 'water', 'battery', 'polish', 'strap', 'repair', 'other'
      ));
  end if;
end $$;

-- Per-watch timeline queries (most-recent-first).
create index if not exists watch_service_records_watch_date_idx
  on public.watch_service_records (watch_id, service_date desc);

-- RLS perf on the owner scope.
create index if not exists watch_service_records_user_idx
  on public.watch_service_records (user_id);

alter table public.watch_service_records enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'watch_service_records'
      and policyname = 'own service records'
  ) then
    create policy "own service records"
      on public.watch_service_records for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create trigger set_updated_at before update on public.watch_service_records
  for each row execute procedure public.set_updated_at();
