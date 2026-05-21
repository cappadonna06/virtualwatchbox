-- ============================================================
-- Virtual Watchbox — Searchable text column for catalog_watches
-- ============================================================
-- Lets searchCatalog match a single token against everything searchable
-- (brand, model, reference, model_family, nickname, watch_type, AND the
-- complications text[] array) via one ILIKE instead of an OR clause that
-- couldn't reach array columns at all.
--
-- "Longines moonphase" and "Omega chronograph" now match through the
-- complications/watch_type tail of search_text. Nicknames like "Pepsi" or
-- "Batman" match once the curated dictionary populates the nickname column.
--
-- search_text is a STORED generated column so Postgres materializes it at
-- row-write time — query path pays no per-call concatenation cost. The
-- pg_trgm GIN index makes %token% ILIKE fast at catalog scale.
--
-- Why the wrapper function: Postgres marks array_to_string() as STABLE
-- because of locale-dependent edge cases for non-text element types.
-- Stored generated columns require IMMUTABLE expressions and reject
-- STABLE ones (SQLSTATE 42P17). For a plain text[] there's no locale
-- dependency, so wrapping the call in an IMMUTABLE SQL function is the
-- standard workaround and is safe for our use case.
-- ============================================================

create extension if not exists pg_trgm;

create or replace function public.immutable_text_array_join(arr text[], sep text)
returns text
language sql
immutable
as $$
  select array_to_string(coalesce(arr, '{}'::text[]), sep)
$$;

alter table public.catalog_watches
  add column if not exists search_text text generated always as (
    coalesce(brand, '') || ' ' ||
    coalesce(model, '') || ' ' ||
    coalesce(reference, '') || ' ' ||
    coalesce(model_family, '') || ' ' ||
    coalesce(nickname, '') || ' ' ||
    coalesce(watch_type, '') || ' ' ||
    public.immutable_text_array_join(complications, ' ')
  ) stored;

create index if not exists catalog_watches_search_text_trgm
  on public.catalog_watches using gin (search_text gin_trgm_ops);
