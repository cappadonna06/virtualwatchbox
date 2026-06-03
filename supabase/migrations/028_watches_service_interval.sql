-- ============================================================
-- Virtual Watchbox — configurable per-watch service interval
-- ============================================================
-- The Service Room lets owners choose a full-service cadence (3/5/7/10
-- years) per watch. next-due = last clock-resetting service (or acquisition
-- date) + interval_years. Defaults to 5 — the common mechanical cadence.
-- ============================================================

alter table public.watches
  add column if not exists interval_years integer not null default 5;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'watches_interval_years_check'
  ) then
    alter table public.watches
      add constraint watches_interval_years_check
      check (interval_years in (3, 5, 7, 10));
  end if;
end $$;
