create table if not exists public.catalog_watches (
  id text primary key,
  brand text not null,
  model text not null,
  reference text not null,
  case_size_mm numeric not null,
  lug_width_mm numeric,
  case_material text not null default '',
  dial_color text not null default '',
  movement text not null default '',
  complications text[] not null default '{}',
  estimated_value integer not null default 0,
  watch_type text not null default 'Sport',
  dial_color_hex text not null default '#1A1410',
  marker_color_hex text not null default '#C8BCAF',
  hand_color_hex text not null default '#FFFFFF',
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_watches_brand_idx on public.catalog_watches (brand);

alter table public.catalog_watches enable row level security;

-- Public read: anyone can browse the catalog
create policy "catalog_watches: public read" on public.catalog_watches
  for select using (true);

-- Write: only authenticated users (curator) can manage catalog entries
create policy "catalog_watches: auth write" on public.catalog_watches
  for all using (auth.uid() is not null);

create or replace function set_catalog_watches_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger catalog_watches_updated_at
  before update on public.catalog_watches
  for each row execute function set_catalog_watches_updated_at();
