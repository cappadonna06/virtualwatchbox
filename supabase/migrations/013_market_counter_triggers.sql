-- ============================================================
-- Virtual Watchbox — Market engagement counter triggers
-- ============================================================
-- Maintains follow/target/grail/owned counts on catalog_watch_market in
-- response to writes on watch_states and watches. Counters power heat-score
-- inputs and the home-page top-N reads without scanning user tables.
--
-- Drift safety: a reconciliation function recomputes from authoritative
-- tables. Run on a nightly cron, or manually after bulk imports.
-- ============================================================

-- Ensure a market row exists for the given catalog_watch_id ---------------
create or replace function public.ensure_market_row(p_catalog_watch_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.catalog_watch_market (catalog_watch_id)
    values (p_catalog_watch_id)
  on conflict (catalog_watch_id) do nothing;
end;
$$;

-- watch_states trigger ----------------------------------------------------
-- Increments / decrements follow_count_denorm / target_count_denorm /
-- grail_count_denorm based on state.
create or replace function public.watch_states_market_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_state text;
  v_new_state text;
  v_old_id    text;
  v_new_id    text;
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') and new.catalog_watch_id is not null then
    perform public.ensure_market_row(new.catalog_watch_id);
  end if;

  v_new_state := case when tg_op in ('INSERT','UPDATE') then new.state else null end;
  v_old_state := case when tg_op in ('UPDATE','DELETE') then old.state else null end;
  v_new_id    := case when tg_op in ('INSERT','UPDATE') then new.catalog_watch_id else null end;
  v_old_id    := case when tg_op in ('UPDATE','DELETE') then old.catalog_watch_id else null end;

  -- Decrement old (delete or update of state/catalog_watch_id)
  if v_old_state is not null and (
       tg_op = 'DELETE'
       or v_new_state is distinct from v_old_state
       or v_new_id    is distinct from v_old_id
  ) then
    if v_old_state = 'follow' then
      update public.catalog_watch_market
        set follow_count_denorm = greatest(0, follow_count_denorm - 1)
        where catalog_watch_id = v_old_id;
    elsif v_old_state = 'target' then
      update public.catalog_watch_market
        set target_count_denorm = greatest(0, target_count_denorm - 1)
        where catalog_watch_id = v_old_id;
    elsif v_old_state = 'grail' then
      update public.catalog_watch_market
        set grail_count_denorm = greatest(0, grail_count_denorm - 1)
        where catalog_watch_id = v_old_id;
    end if;
  end if;

  -- Increment new (insert or update of state/catalog_watch_id)
  if v_new_state is not null and (
       tg_op = 'INSERT'
       or v_new_state is distinct from v_old_state
       or v_new_id    is distinct from v_old_id
  ) then
    if v_new_state = 'follow' then
      update public.catalog_watch_market
        set follow_count_denorm = follow_count_denorm + 1
        where catalog_watch_id = v_new_id;
    elsif v_new_state = 'target' then
      update public.catalog_watch_market
        set target_count_denorm = target_count_denorm + 1
        where catalog_watch_id = v_new_id;
    elsif v_new_state = 'grail' then
      update public.catalog_watch_market
        set grail_count_denorm = grail_count_denorm + 1
        where catalog_watch_id = v_new_id;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists watch_states_market_counters on public.watch_states;
create trigger watch_states_market_counters
  after insert or update or delete on public.watch_states
  for each row execute function public.watch_states_market_counters();

-- watches trigger (owned_count) ------------------------------------------
create or replace function public.watches_market_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_id text;
  v_new_id text;
begin
  v_new_id := case when tg_op in ('INSERT','UPDATE') then new.catalog_id else null end;
  v_old_id := case when tg_op in ('UPDATE','DELETE') then old.catalog_id else null end;

  if v_new_id is not null then
    perform public.ensure_market_row(v_new_id);
  end if;

  if v_old_id is not null and (tg_op = 'DELETE' or v_new_id is distinct from v_old_id) then
    update public.catalog_watch_market
      set owned_count_denorm = greatest(0, owned_count_denorm - 1)
      where catalog_watch_id = v_old_id;
  end if;

  if v_new_id is not null and (tg_op = 'INSERT' or v_new_id is distinct from v_old_id) then
    update public.catalog_watch_market
      set owned_count_denorm = owned_count_denorm + 1
      where catalog_watch_id = v_new_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists watches_market_counters on public.watches;
create trigger watches_market_counters
  after insert or update or delete on public.watches
  for each row execute function public.watches_market_counters();

-- Reconciliation ---------------------------------------------------------
-- Drift-correct counters from authoritative tables. Cheap with the indexes
-- already on watch_states and watches. Idempotent.
create or replace function public.recompute_market_counters()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Make sure every catalog watch has a market row first.
  insert into public.catalog_watch_market (catalog_watch_id)
    select id from public.catalog_watches
  on conflict (catalog_watch_id) do nothing;

  with f as (
    select catalog_watch_id, count(*)::int as c
    from public.watch_states where state = 'follow'
    group by catalog_watch_id
  ), t as (
    select catalog_watch_id, count(*)::int as c
    from public.watch_states where state = 'target'
    group by catalog_watch_id
  ), g as (
    select catalog_watch_id, count(*)::int as c
    from public.watch_states where state = 'grail'
    group by catalog_watch_id
  ), o as (
    select catalog_id as catalog_watch_id, count(*)::int as c
    from public.watches
    group by catalog_id
  )
  update public.catalog_watch_market m
    set follow_count_denorm = coalesce(f.c, 0),
        target_count_denorm = coalesce(t.c, 0),
        grail_count_denorm  = coalesce(g.c, 0),
        owned_count_denorm  = coalesce(o.c, 0),
        last_pop_computed_at = now()
    from public.catalog_watch_market m2
    left join f on f.catalog_watch_id = m2.catalog_watch_id
    left join t on t.catalog_watch_id = m2.catalog_watch_id
    left join g on g.catalog_watch_id = m2.catalog_watch_id
    left join o on o.catalog_watch_id = m2.catalog_watch_id
    where m.catalog_watch_id = m2.catalog_watch_id;
end;
$$;

-- Heat score (placeholder) -----------------------------------------------
-- Simple inputs to start; tune after first pass of real data. Public so
-- admin UI can trigger a one-off recompute after manual edits.
create or replace function public.compute_heat_score(p_catalog_watch_id text)
returns numeric
language sql
security definer
set search_path = public
as $$
  select round(
    -- Engagement: log-scaled to dampen fat-tail bias.
    -- Cast to numeric: ln() returns double precision and Postgres only
    -- defines round(numeric, integer), not round(double precision, integer).
    (
      coalesce(ln(follow_count_denorm + 1) * 5.0, 0)
        + coalesce(ln(target_count_denorm + 1) * 8.0, 0)
        + coalesce(ln(grail_count_denorm  + 1) * 12.0, 0)
        + coalesce(ln(owned_count_denorm  + 1) * 3.0, 0)
    )::numeric
  , 2)
  from public.catalog_watch_market
  where catalog_watch_id = p_catalog_watch_id;
$$;

create or replace function public.recompute_all_heat_scores()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.catalog_watch_market m
    set heat_score = public.compute_heat_score(m.catalog_watch_id),
        last_pop_computed_at = now();

  -- Recompute popularity_rank (1 = highest heat). NULLs ranked last.
  with ranked as (
    select catalog_watch_id,
           row_number() over (order by heat_score desc nulls last, owned_count_denorm desc) as rk
    from public.catalog_watch_market
  )
  update public.catalog_watch_market m
    set popularity_rank = r.rk
    from ranked r
    where m.catalog_watch_id = r.catalog_watch_id;
end;
$$;

-- Initial backfill so freshly-installed market rows have plausible counters
select public.recompute_market_counters();
