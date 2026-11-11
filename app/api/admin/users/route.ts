import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { isAdminEmail } from '@/lib/auth/admin'
import {
  USER_DATA_TABLES,
  classifyUser,
  type AdminUserRow,
  type AdminUsersResponse,
  type UserDataCounts,
} from '@/lib/admin/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'no-store' }

async function listAllUsers(admin: SupabaseClient): Promise<User[]> {
  const perPage = 1000
  const out: User[] = []
  for (let page = 1; page < 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    out.push(...data.users)
    if (data.users.length < perPage) break
  }
  return out
}

async function countUserData(admin: SupabaseClient, ids?: string[]): Promise<Map<string, UserDataCounts>> {
  const counts = new Map<string, UserDataCounts>()
  await Promise.all(
    USER_DATA_TABLES.map(async table => {
      let query = admin.from(table).select('user_id').not('user_id', 'is', null).range(0, 49999)
      if (ids) query = query.in('user_id', ids)
      const { data, error } = await query
      if (error) throw new Error(`${table}: ${error.message}`)
      for (const row of (data ?? []) as Array<{ user_id: string }>) {
        const entry = counts.get(row.user_id) ?? {}
        entry[table] = (entry[table] ?? 0) + 1
        counts.set(row.user_id, entry)
      }
    }),
  )
  return counts
}

function providersOf(user: User): string[] {
  const fromApp = (user.app_metadata?.providers as string[] | undefined) ?? []
  const fromIdentities = (user.identities ?? []).map(i => i.provider)
  const all = new Set([...fromApp, ...fromIdentities])
  if (all.size === 0 && user.app_metadata?.provider) all.add(String(user.app_metadata.provider))
  return Array.from(all).sort()
}

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response
  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SECRET_KEY is not set on the server.' }, { status: 500, headers: NO_STORE })
  }

  try {
    const now = Date.now()
    const [users, dataCounts, profilesRes] = await Promise.all([
      listAllUsers(admin),
      countUserData(admin),
      admin.from('user_profiles').select('id, display_name, visibility').range(0, 49999),
    ])
    if (profilesRes.error) throw profilesRes.error
    const profiles = new Map(
      ((profilesRes.data ?? []) as Array<{ id: string; display_name: string | null; visibility: string | null }>)
        .map(p => [p.id, p]),
    )

    const rows: AdminUserRow[] = users.map(user => {
      const counts = dataCounts.get(user.id) ?? {}
      const providers = providersOf(user)
      const profile = profiles.get(user.id)
      const base = {
        id: user.id,
        email: user.email ?? null,
        displayName: profile?.display_name ?? null,
        visibility: profile?.visibility ?? null,
        providers,
        createdAt: user.created_at,
        confirmedAt: user.email_confirmed_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        counts,
        isAdmin: isAdminEmail(user.email),
      }
      return { ...base, status: classifyUser(base, now) }
    })
    rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))

    const body: AdminUsersResponse = { generatedAt: new Date(now).toISOString(), users: rows }
    return NextResponse.json(body, { headers: NO_STORE })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE })
  }
}

// Deletes accounts. Without `force`, only accounts that are still suspected
// bots at delete time are removed (re-checked here, not trusted from the
// client). `force` is for a single, explicitly confirmed account.
export async function DELETE(request: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response
  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SECRET_KEY is not set on the server.' }, { status: 500, headers: NO_STORE })
  }

  let payload: { ids?: unknown; force?: unknown }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400, headers: NO_STORE })
  }
  const ids = Array.isArray(payload.ids)
    ? Array.from(new Set(payload.ids.filter((v): v is string => typeof v === 'string' && v.length > 0)))
    : []
  const force = payload.force === true
  if (ids.length === 0) {
    return NextResponse.json({ error: 'No user ids given.' }, { status: 400, headers: NO_STORE })
  }
  if (ids.length > 1000) {
    return NextResponse.json({ error: 'At most 1000 ids per request.' }, { status: 400, headers: NO_STORE })
  }
  if (force && ids.length !== 1) {
    return NextResponse.json({ error: 'force deletes one account at a time.' }, { status: 400, headers: NO_STORE })
  }

  const now = Date.now()
  const dataCounts = await countUserData(admin, ids)
  const deleted: string[] = []
  const skipped: Array<{ id: string; reason: string }> = []

  for (const id of ids) {
    const { data, error } = await admin.auth.admin.getUserById(id)
    if (error || !data.user) {
      skipped.push({ id, reason: error?.message ?? 'not found' })
      continue
    }
    const user = data.user
    if (isAdminEmail(user.email) || user.id === gate.userId) {
      skipped.push({ id, reason: 'admin account' })
      continue
    }
    const status = classifyUser(
      {
        providers: providersOf(user),
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        counts: dataCounts.get(id) ?? {},
        isAdmin: false,
      },
      now,
    )
    if (!force && status !== 'suspected_bot') {
      skipped.push({ id, reason: `status is ${status}` })
      continue
    }
    const { error: delError } = await admin.auth.admin.deleteUser(id)
    if (delError) skipped.push({ id, reason: delError.message })
    else deleted.push(id)
  }

  return NextResponse.json({ deleted, skipped }, { headers: NO_STORE })
}
