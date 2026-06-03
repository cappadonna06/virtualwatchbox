-- ============================================================
-- Virtual Watchbox — extend user_watch_photos.photo_type taxonomy
-- ============================================================
-- Migration 018 added photo_type with the original 7 visual types. The
-- Service Room surfaces document-oriented photos ("Papers & Provenance")
-- and the photo-type picker, so we widen the CHECK constraint to the full
-- 12-type set: the 5 visual types + 6 document types + 'other'.
--
-- Document types (receipt, warranty_card, service_record, box_papers,
-- appraisal, manual) are grouped as "Papers & Provenance" in the UI.
-- ============================================================

do $$ begin
  if exists (
    select 1 from pg_constraint where conname = 'user_watch_photos_photo_type_check'
  ) then
    alter table public.user_watch_photos
      drop constraint user_watch_photos_photo_type_check;
  end if;

  alter table public.user_watch_photos
    add constraint user_watch_photos_photo_type_check
    check (photo_type is null or photo_type in (
      'wrist_shot', 'dial', 'case_back', 'macro', 'lifestyle',
      'receipt', 'warranty_card', 'service_record', 'box_papers', 'appraisal', 'manual',
      'other'
    ));
end $$;
