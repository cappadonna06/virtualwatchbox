-- Adds the user's real-watchbox photo to their watchbox_config row.
-- Stored as a data URL string, matching the profile/cover/hero photo
-- pattern on user_profiles. Lives on watchbox_config because the photo
-- is conceptually part of the watchbox surface, not the user profile.
alter table public.watchbox_config
  add column if not exists watchbox_photo_url text;
