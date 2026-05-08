import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client that uses a SECRET API key and bypasses RLS.
 *
 * Use ONLY in route handlers that have already gated the request with
 * requireAdmin() or equivalent. Never import this from client components.
 *
 * Common use case: admin needs to read or update pending submissions owned by
 * other users. Those rows are filtered out by the RLS policy
 * `submitted_by = auth.uid() OR moderation_status = 'approved'`, so the
 * authenticated session client can't see them. This client can.
 *
 * Env var lookup order:
 *   1. SUPABASE_SECRET_KEY — Supabase's recommended modern key name
 *      (Dashboard → Project Settings → API → Publishable and secret API keys)
 *   2. SUPABASE_SERVICE_ROLE_KEY — legacy name from the older "anon /
 *      service_role" tab. Still works; Supabase now flags it as legacy.
 *
 * Either is fine functionally. If neither is set, this returns null and
 * callers fall back to the regular session client (which still works for
 * approved rows and rows owned by the current user).
 */
let cached: SupabaseClient | null | undefined
export function createAdminClient(): SupabaseClient | null {
  if (cached !== undefined) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey =
    process.env.SUPABASE_SECRET_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secretKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[supabase/admin] SUPABASE_SECRET_KEY is not set — admin features that need to read pending submissions or bypass RLS will fall back to the session client.',
      )
    }
    cached = null
    return null
  }

  cached = createServiceClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}
