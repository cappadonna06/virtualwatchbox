-- Adds the user's real-watchbox photo to the existing user_profiles row.
-- Stored as a data URL string, matching profile_image_url / cover_image_url.
alter table public.user_profiles
  add column if not exists watchbox_photo_url text;
