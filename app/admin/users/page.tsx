'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { brand } from '@/lib/brand'
import { useAuth } from '@/lib/auth/AuthProvider'
import { isAdminEmail } from '@/lib/auth/admin'
import { formatRelativeDate } from '@/lib/relativeDate'
import type { AdminUserRow, AdminUsersResponse, UserStatus } from '@/lib/admin/users'

export const dynamic = 'force-dynamic'

const VERCEL_ANALYTICS_URL = 'https://vercel.com/marc-sells-projects/virtualwatchbox/analytics'
const SUPABASE_USERS_URL = 'https://supabase.com/dashboard/project/uwjswlwnnmumhwupqjdh/auth/users'
const CHART_DAYS = 90
const DAY_MS = 24 * 60 * 60 * 1000

type Filter = 'all' | UserStatus

const STATUS_META: Record<UserStatus, { label: string; tone: { bg: string; text: string } }> = {
  real: { label: 'Person', tone: brand.status.owned },
  pending: { label: 'Awaiting sign-in', tone: brand.status.forSale },
  suspected_bot: { label: 'Suspected bot', tone: brand.status.needsService },
}

const SERIES = {
  people: { label: 'People', color: brand.colors.goldDeep },
  bots: { label: 'No sign-in (bots + pending)', color: brand.colors.borderLight },
}

const DATE_LONG = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const DATE_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const NUM = new Intl.NumberFormat('en-US')

export default function AdminUsersPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const isAdmin = !!user && isAdminEmail(user.email)

  const [data, setData] = useState<AdminUsersResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setFetching(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setData(json as AdminUsersResponse)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) void load()
  }, [isAdmin, load])

  const users = useMemo(() => data?.users ?? [], [data])
  const now = data ? Date.parse(data.generatedAt) : 0

  const stats = useMemo(() => {
    const real = users.filter(u => u.status === 'real')
    const signedInWithin = (days: number) =>
      real.filter(u => u.lastSignInAt && now - Date.parse(u.lastSignInAt) < days * DAY_MS).length
    const withCollection = real.filter(u => (u.counts.watches ?? 0) > 0)
    return {
      real: real.length,
      google: real.filter(u => u.providers.includes('google')).length,
      emailOnly: real.filter(u => !u.providers.some(p => p !== 'email')).length,
      active7: signedInWithin(7),
      active30: signedInWithin(30),
      withCollection: withCollection.length,
      watches: withCollection.reduce((sum, u) => sum + (u.counts.watches ?? 0), 0),
      bots: users.filter(u => u.status === 'suspected_bot').length,
      pending: users.filter(u => u.status === 'pending').length,
    }
  }, [users, now])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter(u => {
      if (filter !== 'all' && u.status !== filter) return false
      if (!q) return true
      return (u.email ?? '').toLowerCase().includes(q) || (u.displayName ?? '').toLowerCase().includes(q)
    })
  }, [users, filter, query])

  const deleteUsers = useCallback(
    async (ids: string[], force: boolean) => {
      setBusyIds(prev => new Set([...Array.from(prev), ...ids]))
      setNotice(null)
      try {
        const res = await fetch('/api/admin/users', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, force }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
        const deleted = (json.deleted as string[]).length
        const skipped = (json.skipped as Array<{ reason: string }>).length
        setNotice(
          `Deleted ${NUM.format(deleted)} ${deleted === 1 ? 'account' : 'accounts'}` +
            (skipped ? `; skipped ${NUM.format(skipped)} (${(json.skipped as Array<{ reason: string }>)[0].reason}).` : '.'),
        )
        await load()
      } catch (err) {
        setNotice(`Delete failed: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setBusyIds(prev => {
          const next = new Set(prev)
          ids.forEach(id => next.delete(id))
          return next
        })
      }
    },
    [load],
  )

  function confirmDeleteBots() {
    const ids = users.filter(u => u.status === 'suspected_bot').map(u => u.id)
    if (ids.length === 0) return
    const ok = window.confirm(
      `Permanently delete ${ids.length} suspected bot ${ids.length === 1 ? 'account' : 'accounts'}?\n\n` +
        'Each one is an email-only account that never signed in and owns no data. This cannot be undone.',
    )
    if (ok) void deleteUsers(ids, false)
  }

  function confirmDeleteOne(row: AdminUserRow) {
    const summary = describeData(row)
    const ok = window.confirm(
      `Permanently delete ${row.email ?? row.id}?\n\n` +
        (summary ? `This also deletes: ${summary}.\n\n` : '') +
        'This cannot be undone.',
    )
    if (ok) void deleteUsers([row.id], row.status !== 'suspected_bot')
  }

  if (loading) return null

  if (!user || !isAdmin) {
    return (
      <div style={{ padding: '120px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted }}>
          {user ? 'You don’t have access to the admin dashboard.' : 'Sign in to access the admin dashboard.'}
        </p>
        {user ? (
          <button onClick={() => router.push('/')} style={ghostButton}>← Home</button>
        ) : (
          <Link href="/auth?next=/admin/users" style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.goldDeep }}>
            Sign in →
          </Link>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '48px clamp(16px, 4vw, 56px) 120px', borderTop: `1px solid ${brand.colors.border}` }}>
      <Link href="/admin" style={{ fontFamily: brand.font.sans, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted, textDecoration: 'none' }}>
        ← Admin
      </Link>
      <h1 style={{ margin: '6px 0 0', fontFamily: brand.font.serif, fontSize: 32, fontWeight: 400, color: brand.colors.ink }}>
        Users
      </h1>
      <p style={{ margin: '4px 0 28px', fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, lineHeight: 1.6 }}>
        Accounts, sign-ins and bot signups. Page traffic lives in{' '}
        <a href={VERCEL_ANALYTICS_URL} target="_blank" rel="noreferrer" style={{ color: brand.colors.goldDeep }}>
          Vercel Web Analytics ↗
        </a>
        ; raw auth records in{' '}
        <a href={SUPABASE_USERS_URL} target="_blank" rel="noreferrer" style={{ color: brand.colors.goldDeep }}>
          Supabase ↗
        </a>
        .
      </p>

      {loadError && <Banner tone="error">Couldn’t load users: {loadError}</Banner>}
      {notice && <Banner tone="info">{notice}</Banner>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 32 }}>
        <Stat label="People" value={data ? stats.real : null} hint={`${stats.google} Google · ${stats.emailOnly} email`} />
        <Stat label="Active · 7 days" value={data ? stats.active7 : null} hint={`${stats.active30} in the last 30 days`} />
        <Stat label="With a collection" value={data ? stats.withCollection : null} hint={`${NUM.format(stats.watches)} watches saved`} />
        <Stat label="Suspected bots" value={data ? stats.bots : null} hint="never signed in, no data" emphasis={stats.bots > 0} />
        <Stat label="Awaiting sign-in" value={data ? stats.pending : null} hint="email sent in the last 24h" />
      </div>

      <SignupChart users={users} now={now} />

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, margin: '32px 0 14px' }}>
        <div role="tablist" aria-label="Filter accounts" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(
            [
              ['all', 'All', users.length],
              ['real', 'People', stats.real],
              ['suspected_bot', 'Suspected bots', stats.bots],
              ['pending', 'Awaiting', stats.pending],
            ] as Array<[Filter, string, number]>
          ).map(([key, label, count]) => {
            const active = filter === key
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(key)}
                style={{
                  padding: '7px 12px',
                  borderRadius: brand.radius.btn,
                  border: `1px solid ${active ? brand.colors.goldLine : brand.colors.border}`,
                  background: active ? brand.colors.goldWash : brand.colors.white,
                  color: active ? brand.colors.ink : brand.colors.muted,
                  fontFamily: brand.font.sans,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {label} <span style={{ color: brand.colors.muted }}>{NUM.format(count)}</span>
              </button>
            )
          })}
        </div>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search email or name"
          aria-label="Search email or name"
          style={{
            flex: '1 1 200px',
            minWidth: 0,
            maxWidth: 320,
            padding: '8px 12px',
            border: `1px solid ${brand.colors.border}`,
            borderRadius: brand.radius.btn,
            fontFamily: brand.font.sans,
            fontSize: 16,
            color: brand.colors.ink,
            background: brand.colors.white,
          }}
        />
        <div style={{ flex: 1 }} />
        <button onClick={() => void load()} disabled={fetching} style={ghostButton}>
          {fetching ? 'Refreshing…' : 'Refresh'}
        </button>
        {stats.bots > 0 && (
          <button onClick={confirmDeleteBots} disabled={busyIds.size > 0} style={dangerButton}>
            Delete {NUM.format(stats.bots)} suspected {stats.bots === 1 ? 'bot' : 'bots'}
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg, background: brand.colors.white }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr>
              {['Account', 'Sign-in', 'Joined', 'Last sign-in', 'Collection', 'Status', ''].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} style={{ borderTop: `1px solid ${brand.colors.border}` }}>
                <td style={td}>
                  <div style={{ color: brand.colors.ink, fontWeight: 500, wordBreak: 'break-all' }}>
                    {row.email ?? '—'}
                    {row.isAdmin && <span style={{ marginLeft: 8, ...pill(brand.status.recentlyAdded) }}>Admin</span>}
                  </div>
                  {row.displayName && <div style={{ color: brand.colors.muted, fontSize: 12 }}>{row.displayName}</div>}
                </td>
                <td style={td}>{row.providers.map(p => (p === 'email' ? 'Magic link' : capitalize(p))).join(', ') || '—'}</td>
                <td style={td} title={DATE_LONG.format(new Date(row.createdAt))}>{formatRelativeDate(row.createdAt, new Date(now))}</td>
                <td style={td} title={row.lastSignInAt ? DATE_LONG.format(new Date(row.lastSignInAt)) : undefined}>
                  {row.lastSignInAt ? formatRelativeDate(row.lastSignInAt, new Date(now)) : <span style={{ color: brand.colors.muted }}>Never</span>}
                </td>
                <td style={td}>
                  <span style={{ color: brand.colors.ink }}>{row.counts.watches ?? 0}</span>
                  <span style={{ color: brand.colors.muted }}> {row.counts.watches === 1 ? 'watch' : 'watches'}</span>
                  {describeExtras(row) && <div style={{ color: brand.colors.muted, fontSize: 12 }}>{describeExtras(row)}</div>}
                </td>
                <td style={td}>
                  <span style={pill(STATUS_META[row.status].tone)}>{STATUS_META[row.status].label}</span>
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {!row.isAdmin && (
                    <button
                      onClick={() => confirmDeleteOne(row)}
                      disabled={busyIds.has(row.id)}
                      aria-label={`Delete ${row.email ?? row.id}`}
                      style={{ ...ghostButton, padding: '5px 10px', fontSize: 12 }}
                    >
                      {busyIds.has(row.id) ? '…' : 'Delete'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data && filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...td, textAlign: 'center', color: brand.colors.muted, padding: '28px 16px' }}>
                  No accounts match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data && (
        <p style={{ marginTop: 10, fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>
          {NUM.format(filtered.length)} of {NUM.format(users.length)} accounts · loaded {formatRelativeDate(data.generatedAt)}
        </p>
      )}
    </div>
  )
}

function SignupChart({ users, now }: { users: AdminUserRow[]; now: number }) {
  const [hover, setHover] = useState<number | null>(null)

  const days = useMemo(() => {
    if (!now) return []
    const end = new Date(now)
    end.setHours(0, 0, 0, 0)
    const buckets = Array.from({ length: CHART_DAYS }, (_, i) => {
      const day = new Date(end.getTime() - (CHART_DAYS - 1 - i) * DAY_MS)
      return { day, people: 0, bots: 0 }
    })
    const startMs = buckets[0].day.getTime()
    for (const u of users) {
      const created = new Date(u.createdAt)
      created.setHours(0, 0, 0, 0)
      const idx = Math.round((created.getTime() - startMs) / DAY_MS)
      if (idx < 0 || idx >= CHART_DAYS) continue
      if (u.status === 'real') buckets[idx].people++
      else buckets[idx].bots++
    }
    return buckets
  }, [users, now])

  const max = Math.max(1, ...days.map(d => d.people + d.bots))
  const totals = days.reduce((acc, d) => ({ people: acc.people + d.people, bots: acc.bots + d.bots }), { people: 0, bots: 0 })
  const hovered = hover !== null ? days[hover] : null
  const PLOT_H = 140

  return (
    <section
      aria-label={`Signups per day, last ${CHART_DAYS} days`}
      style={{ background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg, padding: '18px 20px 14px' }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontFamily: brand.font.serif, fontSize: 20, fontWeight: 400, color: brand.colors.ink }}>
          Signups per day <span style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>last {CHART_DAYS} days</span>
        </h2>
        <div style={{ display: 'flex', gap: 16, fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.inkSoft }}>
          {(['people', 'bots'] as const).map(key => (
            <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden style={{ width: 10, height: 10, borderRadius: 2, background: SERIES[key].color }} />
              {SERIES[key].label} · {NUM.format(totals[key])}
            </span>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: -2, fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted }}>{max}</div>
        <div
          style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: PLOT_H, padding: '0 0 0 22px', borderBottom: `1px solid ${brand.colors.borderLight}` }}
          onMouseLeave={() => setHover(null)}
        >
          {days.map((d, i) => {
            const total = d.people + d.bots
            const peopleH = (d.people / max) * PLOT_H
            const botsH = (d.bots / max) * PLOT_H
            return (
              <div
                key={i}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={total > 0 ? 0 : -1}
                aria-label={`${DATE_SHORT.format(d.day)}: ${d.people} people, ${d.bots} without sign-in`}
                style={{
                  flex: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  gap: d.people && d.bots ? 2 : 0,
                  background: hover === i ? brand.colors.goldWash : 'transparent',
                  outline: 'none',
                }}
              >
                {d.bots > 0 && <div style={{ height: botsH, background: SERIES.bots.color, borderRadius: '2px 2px 0 0' }} />}
                {d.people > 0 && (
                  <div style={{ height: peopleH, background: SERIES.people.color, borderRadius: d.bots ? 0 : '2px 2px 0 0' }} />
                )}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0 22px', fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted }}>
          <span>{days[0] ? DATE_SHORT.format(days[0].day) : ''}</span>
          <span>{days[Math.floor(CHART_DAYS / 2)] ? DATE_SHORT.format(days[Math.floor(CHART_DAYS / 2)].day) : ''}</span>
          <span>Today</span>
        </div>
        {hovered && hover !== null && (
          <div
            role="status"
            style={{
              position: 'absolute',
              top: 8,
              left: `calc(22px + ${((hover + 0.5) / CHART_DAYS) * 100}% - ${hover > CHART_DAYS / 2 ? 170 : 0}px)`,
              width: 160,
              pointerEvents: 'none',
              background: brand.colors.white,
              border: `1px solid ${brand.colors.borderMid}`,
              borderRadius: brand.radius.sm,
              boxShadow: brand.shadow.menu,
              padding: '8px 10px',
              fontFamily: brand.font.sans,
              fontSize: 12,
              color: brand.colors.ink,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{DATE_SHORT.format(hovered.day)}</div>
            {(['people', 'bots'] as const).map(key => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, color: brand.colors.inkSoft }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: SERIES[key].color }} />
                <span style={{ flex: 1 }}>{key === 'people' ? 'People' : 'No sign-in'}</span>
                <span style={{ color: brand.colors.ink, fontWeight: 500 }}>{hovered[key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function describeExtras(row: AdminUserRow): string {
  const c = row.counts
  const parts: string[] = []
  if (c.playground_boxes) parts.push(`${c.playground_boxes} playground`)
  if (c.user_watch_photos) parts.push(`${c.user_watch_photos} photos`)
  if (c.watch_service_records) parts.push(`${c.watch_service_records} service`)
  if (c.user_straps) parts.push(`${c.user_straps} straps`)
  return parts.join(' · ')
}

function describeData(row: AdminUserRow): string {
  const c = row.counts
  const parts: string[] = []
  if (c.watches) parts.push(`${c.watches} watches`)
  if (c.playground_boxes) parts.push(`${c.playground_boxes} playground boxes`)
  if (c.user_watch_photos) parts.push(`${c.user_watch_photos} photos`)
  if (c.watch_service_records) parts.push(`${c.watch_service_records} service records`)
  if (c.user_straps) parts.push(`${c.user_straps} straps`)
  if (c.watchbox_config) parts.push('their watchbox setup')
  return parts.join(', ')
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function pill(tone: { bg: string; text: string }): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: brand.radius.pill,
    background: tone.bg,
    color: tone.text,
    fontFamily: brand.font.sans,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  }
}

function Banner({ tone, children }: { tone: 'error' | 'info'; children: React.ReactNode }) {
  const t = tone === 'error' ? brand.status.needsService : brand.status.recentlyAdded
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} style={{ marginBottom: 20, padding: '10px 14px', borderRadius: brand.radius.md, background: t.bg, color: t.text, fontFamily: brand.font.sans, fontSize: 13 }}>
      {children}
    </div>
  )
}

function Stat({ label, value, hint, emphasis }: { label: string; value: number | null; hint?: string; emphasis?: boolean }) {
  return (
    <div style={{ background: brand.colors.slot, border: `1px solid ${brand.colors.borderMid}`, borderRadius: brand.radius.xl, padding: '18px 18px' }}>
      <div style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted }}>
        {label}
      </div>
      <div style={{ marginTop: 6, fontFamily: brand.font.serif, fontSize: 32, fontWeight: 400, color: emphasis ? brand.colors.goldDeep : brand.colors.ink, lineHeight: 1 }}>
        {value === null ? '—' : NUM.format(value)}
      </div>
      {hint && value !== null && <div style={{ marginTop: 6, fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>{hint}</div>}
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  fontFamily: brand.font.sans,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: brand.colors.muted,
  background: brand.colors.slot,
  whiteSpace: 'nowrap',
}

const td: React.CSSProperties = {
  padding: '12px 16px',
  fontFamily: brand.font.sans,
  fontSize: 13,
  color: brand.colors.inkSoft,
  verticalAlign: 'top',
}

const ghostButton: React.CSSProperties = {
  padding: '8px 14px',
  background: 'transparent',
  color: brand.colors.ink,
  border: `1px solid ${brand.colors.borderLight}`,
  borderRadius: brand.radius.btn,
  fontFamily: brand.font.sans,
  fontSize: 13,
  cursor: 'pointer',
}

const dangerButton: React.CSSProperties = {
  padding: '8px 14px',
  background: brand.colors.ink,
  color: brand.colors.bg,
  border: `1px solid ${brand.colors.ink}`,
  borderRadius: brand.radius.btn,
  fontFamily: brand.font.sans,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}
