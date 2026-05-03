-- ============================================================
-- Virtual Watchbox — User profile persistence fields
-- Adds profile metadata/images needed for cloud backup.
-- ============================================================

alter table public.user_profiles
  add column if not exists bio text,
  add column if not exists profile_image_crop jsonb,
  add column if not exists cover_image_url text,
  add column if not exists collection_hero_image_url text,
  add column if not exists featured_profile_watch text not null default 'grail';

alter table public.user_profiles
  drop constraint if exists user_profiles_featured_profile_watch_check;

alter table public.user_profiles
  add constraint user_profiles_featured_profile_watch_check
  check (featured_profile_watch in ('grail', 'jewel', 'none'));

update public.user_profiles
set featured_profile_watch = 'grail'
where featured_profile_watch is null;
