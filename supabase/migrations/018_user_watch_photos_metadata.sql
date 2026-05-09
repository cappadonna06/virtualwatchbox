-- ============================================================
-- Virtual Watchbox — user_watch_photos metadata
-- ============================================================
-- Adds optional photo classification + when-it-was-taken so the gallery
-- can be filtered ("show only wrist shots") and so future suggestions
-- can flag missing artifacts ("you don't have a box-and-papers photo").
-- ============================================================

alter table public.user_watch_photos
  add column if not exists photo_type text,
  add column if not exists taken_at   date;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_watch_photos_photo_type_check'
  ) then
    alter table public.user_watch_photos
      add constraint user_watch_photos_photo_type_check
      check (photo_type is null or photo_type in
        ('wrist_shot','box_papers','macro','lifestyle','dial','case_back','other'));
  end if;
end $$;
