-- ============================================================
-- Virtual Watchbox — watch_image_reviews
-- ============================================================
-- Admin-curation feedback log for the processed-image pipeline. Each row is
-- a single review action ("approve", "needs reprocess", "wrong watch") on a
-- (catalog_watch_id, variant) image. Multiple reviews can stack over time so
-- we can track re-processing cycles: an image gets flagged needs_reprocess,
-- the batch script re-runs with tuned settings, the next review approves.
--
-- The latest review per (catalog_watch_id, variant) is what the admin UI
-- shows as the current status; older rows are kept for audit.
-- ============================================================

create table if not exists public.watch_image_reviews (
  id uuid primary key default gen_random_uuid(),
  catalog_watch_id text not null references public.catalog_watches(id) on delete cascade,
  variant text not null default 'primary',
  status text not null check (status in ('pending','approved','needs_reprocess','deleted')),
  notes text,
  reviewer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists watch_image_reviews_watch_idx
  on public.watch_image_reviews (catalog_watch_id, variant, created_at desc);

create index if not exists watch_image_reviews_status_idx
  on public.watch_image_reviews (status, created_at desc);

alter table public.watch_image_reviews enable row level security;

drop policy if exists "watch_image_reviews: admin read"  on public.watch_image_reviews;
drop policy if exists "watch_image_reviews: admin write" on public.watch_image_reviews;

create policy "watch_image_reviews: admin read"
  on public.watch_image_reviews
  for select
  using (public.is_admin(auth.uid()));

create policy "watch_image_reviews: admin write"
  on public.watch_image_reviews
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
