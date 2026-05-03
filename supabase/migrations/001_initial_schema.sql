-- ============================================================
-- Virtual Watchbox — Initial Schema
-- Run in Supabase SQL Editor or via: supabase db push
-- ============================================================

-- User profiles (extends auth.users)
create table if not exists public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  handle text unique,
  profile_image_url text,
  visibility jsonb not null default '{
    "showCollectionStats": true,
    "showGrail": true,
    "showFollowedWatches": false,
    "showPlayground": true
  }',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Owned watches (user's physical collection)
create table if not exists public.watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  catalog_id text not null,           -- references lib/watches.ts id (e.g. 'rolex-submariner')
  brand text not null,
  model text not null,
  reference text,
  case_size_mm numeric,
  case_material text,
  dial_color text,
  movement text,
  complications text[] default '{}',
  watch_type text,
  condition text,
  ownership_status text not null default 'Owned',
  purchase_price integer,
  purchase_date date,
  estimated_value integer,
  notes text,
  sort_order integer not null default 0,
  photo_url text,                     -- future: Cloudinary upload URL
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Watch states: follow, target, grail, jewel
-- catalog_watch_id references the watch catalog (lib/watches.ts), not the watches table
create table if not exists public.watch_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  catalog_watch_id text not null,
  state text not null check (state in ('follow', 'target', 'grail', 'jewel')),
  metadata jsonb not null default '{}',
  -- metadata for 'target': { targetPrice, desiredCondition, intent, replacesWatchId, linkedPlaygroundBoxId, notes, targetDate }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, catalog_watch_id, state)
);

-- Playground boxes
create table if not exists public.playground_boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  frame text not null default 'light-oak',
  lining text not null default 'cream',
  slot_count integer not null default 6,
  tags text[] default '{}',
  entries jsonb not null default '[]',
  -- entries shape: Array<{ id: string, watchId: string, overrides?: PlaygroundWatchOverrides }>
  share_slug text unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Watchbox config (the collection page box: frame, lining, slot count)
create table if not exists public.watchbox_config (
  user_id uuid references auth.users on delete cascade primary key,
  frame text not null default 'light-oak',
  lining text not null default 'cream',
  slot_count integer not null default 6,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.user_profiles enable row level security;
alter table public.watches enable row level security;
alter table public.watch_states enable row level security;
alter table public.playground_boxes enable row level security;
alter table public.watchbox_config enable row level security;

-- user_profiles: users read/write their own row
create policy "user_profiles: own row" on public.user_profiles
  for all using (auth.uid() = id);

-- watches: users read/write their own watches
create policy "watches: own rows" on public.watches
  for all using (auth.uid() = user_id);

-- watch_states: users read/write their own states
create policy "watch_states: own rows" on public.watch_states
  for all using (auth.uid() = user_id);

-- playground_boxes: users read/write their own boxes
create policy "playground_boxes: own rows" on public.playground_boxes
  for all using (auth.uid() = user_id);

-- watchbox_config: users read/write their own config
create policy "watchbox_config: own row" on public.watchbox_config
  for all using (auth.uid() = user_id);

-- ============================================================
-- Auto-create user_profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Updated_at auto-update
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.watches
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.watch_states
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.playground_boxes
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.watchbox_config
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.user_profiles
  for each row execute procedure public.set_updated_at();
