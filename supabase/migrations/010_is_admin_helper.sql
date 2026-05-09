-- ============================================================
-- Virtual Watchbox — is_admin() helper
-- ============================================================
-- Centralizes the admin check so RLS policies on catalog_watches,
-- catalog_watch_market, etc. can gate writes consistently.
--
-- Convention: admins flagged via user_profiles.visibility -> 'admin' = true.
-- This matches the existing requireAdmin() server helper which can be wired
-- to the same flag (or kept on its env-based allowlist for now). When/if a
-- dedicated admins table is introduced, only this function changes.
-- ============================================================

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = uid
      and coalesce((visibility ->> 'admin')::boolean, false) = true
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_admin(uuid) to anon;
