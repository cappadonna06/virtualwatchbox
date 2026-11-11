// Shared between /api/admin/users and /admin/users.

export const USER_DATA_TABLES = [
  'watches',
  'watch_states',
  'playground_boxes',
  'watchbox_config',
  'user_watch_photos',
  'watch_service_records',
  'user_straps',
  'strap_watch_overrides',
  'discover_events',
] as const

export type UserDataTable = (typeof USER_DATA_TABLES)[number]
export type UserDataCounts = Partial<Record<UserDataTable, number>>

export type UserStatus = 'real' | 'pending' | 'suspected_bot'

export type AdminUserRow = {
  id: string
  email: string | null
  displayName: string | null
  visibility: string | null
  providers: string[]
  createdAt: string
  confirmedAt: string | null
  lastSignInAt: string | null
  counts: UserDataCounts
  isAdmin: boolean
  status: UserStatus
}

export type AdminUsersResponse = {
  generatedAt: string
  users: AdminUserRow[]
}

// A real person who asks for a magic link usually clicks it within minutes;
// give them a day before the account counts as a bot signup.
export const PENDING_GRACE_MS = 24 * 60 * 60 * 1000

export function hasAnyData(counts: UserDataCounts): boolean {
  return Object.values(counts).some(n => (n ?? 0) > 0)
}

// The magic-link form was abused to mail strangers (Tor, Nov 2026): those
// accounts are email-only, never signed in and own nothing. Anything with a
// sign-in, an OAuth identity or saved data is treated as a person.
export function classifyUser(
  user: Pick<AdminUserRow, 'providers' | 'createdAt' | 'lastSignInAt' | 'counts' | 'isAdmin'>,
  now: number = Date.now(),
): UserStatus {
  if (user.isAdmin) return 'real'
  if (user.lastSignInAt) return 'real'
  if (user.providers.some(p => p !== 'email')) return 'real'
  if (hasAnyData(user.counts)) return 'real'
  const age = now - Date.parse(user.createdAt)
  return age < PENDING_GRACE_MS ? 'pending' : 'suspected_bot'
}
