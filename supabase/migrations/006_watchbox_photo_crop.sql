-- Stores the user's drag/zoom crop state for their watchbox photo so a
-- single uploaded photo can be re-cropped without re-uploading. Mirrors
-- user_profiles.profile_image_crop in shape: { x, y, zoom, area:{x,y,width,height} }.
alter table public.watchbox_config
  add column if not exists watchbox_photo_crop jsonb;
