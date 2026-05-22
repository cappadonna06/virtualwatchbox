-- discover_insights: globally-cached editorial copy for /discover.
--
-- Two flavors keyed by (kind, from_watch_id, to_watch_id):
--   kind='upgrade' → per-pair upgrade rationale (1 sentence, 12–22 words).
--     from_watch_id = owned watch, to_watch_id = upgrade candidate.
--   kind='hero'    → hero { read, leadInsight } encoded as JSON string in copy.
--     from_watch_id = '' (empty-string sentinel — NULL would let two hero
--     rows for the same to_watch_id both succeed because NULL ≠ NULL in
--     unique indexes; also onConflict can't address a partial index).
--
-- prompt_version lets us re-generate the table by bumping the version
-- constant in code without dropping rows; lookups always filter on the
-- current version, so older copies sit dormant.

create table if not exists public.discover_insights (
  id bigserial primary key,
  kind text not null check (kind in ('upgrade', 'hero')),
  from_watch_id text not null default '',
  to_watch_id text not null,
  copy text not null,
  model_used text,
  prompt_version int not null default 1,
  generated_at timestamptz not null default now(),
  constraint discover_insights_pair_key
    unique (kind, from_watch_id, to_watch_id, prompt_version)
);

create index if not exists discover_insights_lookup_idx
  on public.discover_insights (kind, to_watch_id, prompt_version);

alter table public.discover_insights enable row level security;

-- Editorial copy is not sensitive — anyone can read.
drop policy if exists "discover_insights_select_all" on public.discover_insights;
create policy "discover_insights_select_all"
  on public.discover_insights for select using (true);

-- No client-side insert/update policies; writes happen via service-role
-- inside the /api/discover/personalize route.
