-- ============================================================
-- Virtual Watchbox — slim photo-type taxonomy + document support
-- ============================================================
-- 1. Trim the photo_type taxonomy to the "Grouped 7":
--      Photos:    wrist_shot · detail · lifestyle
--      Documents: receipt · warranty_card · service_record · box_papers
--    'detail' absorbs the old dial/case_back/macro; appraisal/manual/other
--    are dropped (untagged is the catch-all).
-- 2. Add mime_type so non-image attachments (PDFs, etc.) can live in the
--    same per-watch gallery and render as document tiles.
-- 3. Add service_record_id so an uploaded file can be tied to the service
--    event it documents. ON DELETE SET NULL keeps the file in the gallery
--    if its service record is later removed.
-- ============================================================

-- 1) Remap legacy values before tightening the constraint -----------------
update public.user_watch_photos
  set photo_type = 'detail'
  where photo_type in ('dial', 'case_back', 'macro');

update public.user_watch_photos
  set photo_type = null
  where photo_type in ('appraisal', 'manual', 'other');

-- 1b) Replace the CHECK constraint with the 7 allowed types ---------------
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
      'wrist_shot', 'detail', 'lifestyle',
      'receipt', 'warranty_card', 'service_record', 'box_papers'
    ));
end $$;

-- 2) Document support -----------------------------------------------------
alter table public.user_watch_photos
  add column if not exists mime_type text;

-- 3) Link an attachment to the service event it documents -----------------
alter table public.user_watch_photos
  add column if not exists service_record_id uuid
    references public.watch_service_records(id) on delete set null;

create index if not exists user_watch_photos_service_record_idx
  on public.user_watch_photos (service_record_id);
