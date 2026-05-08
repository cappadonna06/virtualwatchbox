-- ============================================================
-- Per-watch photo gallery for owned watches
-- ============================================================
-- Replaces the single watches.photo_url with a one-to-many table so users
-- can keep multiple photos (wrist shots, "received it today", service
-- receipts) on each owned watch. The primary photo is used as the
-- watchbox-slot fallback when no admin-curated catalog photo exists.

create table if not exists public.user_watch_photos (
  id uuid primary key default gen_random_uuid(),
  watch_id uuid not null references public.watches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text not null,
  caption text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_watch_photos_watch_idx
  on public.user_watch_photos (watch_id);

create index if not exists user_watch_photos_user_idx
  on public.user_watch_photos (user_id);

-- At most one primary photo per watch. Partial unique index — only enforced
-- when is_primary = true so non-primary rows aren't constrained.
create unique index if not exists user_watch_photos_one_primary_per_watch
  on public.user_watch_photos (watch_id)
  where is_primary;

alter table public.user_watch_photos enable row level security;

create policy "user_watch_photos: own rows"
  on public.user_watch_photos for all
  using (auth.uid() = user_id);

create trigger user_watch_photos_updated_at
  before update on public.user_watch_photos
  for each row execute procedure public.set_updated_at();

-- One-shot backfill: existing watches.photo_url becomes the primary gallery entry.
-- Skips rows that already have a gallery entry (idempotent re-run).
insert into public.user_watch_photos (watch_id, user_id, photo_url, is_primary)
  select w.id, w.user_id, w.photo_url, true
  from public.watches w
  where w.photo_url is not null
    and w.photo_url <> ''
    and not exists (
      select 1 from public.user_watch_photos p
      where p.watch_id = w.id
    )
on conflict do nothing;
