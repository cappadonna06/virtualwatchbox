-- ============================================================
-- Virtual Watchbox — Add real FK on watches.catalog_id (and watch_states.catalog_watch_id)
-- ============================================================
-- This migration is a VERIFICATION GATE. It ABORTS if any owned watch or
-- watch state references a catalog id that doesn't resolve in
-- public.catalog_watches. Operator action: run `npm run catalog:seed`
-- (or insert the missing catalog rows manually) and re-run.
--
-- After the gate passes, FKs are added with ON DELETE RESTRICT so admins
-- can't silently nuke a user's owned-watch row by deleting a catalog entry.
-- ============================================================

do $$
declare
  v_orphan_watches integer;
  v_orphan_states  integer;
begin
  -- Check watches
  select count(*) into v_orphan_watches
  from public.watches w
  left join public.catalog_watches c on c.id = w.catalog_id
  where c.id is null;

  -- Check watch_states
  select count(*) into v_orphan_states
  from public.watch_states s
  left join public.catalog_watches c on c.id = s.catalog_watch_id
  where c.id is null;

  if v_orphan_watches > 0 or v_orphan_states > 0 then
    raise exception
      'Cannot add FKs: % orphan rows in watches, % orphan rows in watch_states. Run `npm run catalog:seed` (or insert the missing catalog_watches rows) and re-run this migration.',
      v_orphan_watches, v_orphan_states;
  end if;
end $$;

-- watches.catalog_id → catalog_watches(id) -------------------------------
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'watches_catalog_id_fkey'
  ) then
    alter table public.watches
      add constraint watches_catalog_id_fkey
      foreign key (catalog_id)
      references public.catalog_watches(id)
      on delete restrict;
  end if;
end $$;

create index if not exists watches_catalog_id_idx
  on public.watches (catalog_id);
create index if not exists watches_user_catalog_idx
  on public.watches (user_id, catalog_id);

-- watch_states.catalog_watch_id → catalog_watches(id) --------------------
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'watch_states_catalog_watch_id_fkey'
  ) then
    alter table public.watch_states
      add constraint watch_states_catalog_watch_id_fkey
      foreign key (catalog_watch_id)
      references public.catalog_watches(id)
      on delete restrict;
  end if;
end $$;

create index if not exists watch_states_catalog_watch_id_idx
  on public.watch_states (catalog_watch_id);
