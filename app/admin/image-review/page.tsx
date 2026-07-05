'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { brand } from '@/lib/brand'
import { useAuth } from '@/lib/auth/AuthProvider'
import { isAdminEmail } from '@/lib/auth/admin'
import { withVersion } from '@/lib/watchImages/cacheBust'
import CaseSegmentationReview from '@/components/admin/CaseSegmentationReview'

export const dynamic = 'force-dynamic'

type ReviewStatus = 'pending' | 'approved' | 'needs_reprocess' | 'deleted'

type Row = {
  catalog_watch_id: string
  brand: string | null
  model: string | null
  reference: string | null
  webp_url: string
  png_url: string
  raw_url: string | null
  processed_width: number | null
  processed_height: number | null
  background_removal_applied: boolean
  status: ReviewStatus
  notes: string | null
  tags: string[]
  last_reviewed_at: string | null
}

type TagKey =
  | 'bracelet_top' | 'bracelet_bottom' | 'band' | 'case' | 'small_detail'
  | 'halo' | 'edge_eroded' | 'bottom_clipped'
  | 'shadow_remnant' | 'bg_remnant'
  // Auto-detected by the rules/LLM screener (lib/imageProcessing/screener.ts,
  // lib/imageProcessing/llmScreener.ts). Reviewers see these as auto-applied
  // tags they can confirm, override, or remove. New auto-screener tags
  // should be added here AND in app/api/admin/image-review/route.ts.
  | 'aspect_ratio_off' | 'multi_object' | 'dial_only' | 'bracelet_truncated' | 'tiny_subject'
  | 'wrong_subject_arm' | 'wrong_subject_box' | 'multi_watch' | 'wrong_orientation' | 'incomplete'

// Tag groups map directly to pipeline stages. The --feedback pass uses these
// to pick which knobs to bump on the re-run: "missing parts" → ML refinement,
// "edge" → alpha-feather + shadow walker thresholds, "background" → flood
// fill seeds + shadow walker depth.
const TAG_GROUPS: ReadonlyArray<{ heading: string; items: ReadonlyArray<{ key: TagKey; label: string }> }> = [
  { heading: 'Missing parts',     items: [
    { key: 'bracelet_top',    label: 'Bracelet top' },
    { key: 'bracelet_bottom', label: 'Bracelet bottom' },
    { key: 'band',            label: 'Band/strap' },
    { key: 'case',            label: 'Case' },
    { key: 'small_detail',    label: 'Small detail' },
  ]},
  { heading: 'Edge quality',      items: [
    { key: 'halo',            label: 'Halo / fringe' },
    { key: 'edge_eroded',     label: 'Edge chewed' },
    { key: 'bottom_clipped',  label: 'Bottom clipped' },
  ]},
  { heading: 'Background',        items: [
    { key: 'shadow_remnant',  label: 'Shadow remnant' },
    { key: 'bg_remnant',      label: 'BG remnant' },
  ]},
  { heading: 'Auto-detected',     items: [
    { key: 'aspect_ratio_off',  label: 'Rotated / wrong AR' },
    { key: 'multi_object',      label: 'Multi-object (rules)' },
    { key: 'dial_only',         label: 'Dial only' },
    { key: 'bracelet_truncated',label: 'Bracelet truncated' },
    { key: 'tiny_subject',      label: 'Tiny subject' },
    { key: 'wrong_subject_arm', label: 'Arm in shot (LLM)' },
    { key: 'wrong_subject_box', label: 'In display box (LLM)' },
    { key: 'multi_watch',       label: 'Multiple watches (LLM)' },
    { key: 'wrong_orientation', label: 'Wrong orientation (LLM)' },
    { key: 'incomplete',        label: 'Incomplete (LLM)' },
  ]},
]

type ApiResponse = {
  rows: Row[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  counts: Record<'all' | ReviewStatus, number>
  status: ReviewStatus | 'all'
}

// The only states that matter day-to-day are "flagged" (needs_reprocess) vs
// "cleared" (approved). Everything else is just "not yet looked at" and lives
// under All. Pending and removed images aren't their own tabs.
const STATUS_TABS: Array<{ key: 'all' | ReviewStatus; label: string }> = [
  { key: 'needs_reprocess', label: 'Flagged' },
  { key: 'approved', label: 'Cleared' },
  { key: 'all', label: 'All' },
]

const STATUS_BADGE: Record<ReviewStatus, { bg: string; fg: string; border: string; label: string }> = {
  pending:         { bg: '#FFFFFF',           fg: brand.colors.muted, border: brand.colors.borderMid, label: 'Not reviewed' },
  approved:        { bg: '#EEF6EE',           fg: '#2F6B33',          border: '#BFD9C2',              label: 'Cleared' },
  needs_reprocess: { bg: '#FFF4E6',           fg: '#9A5B14',          border: '#E9C99B',              label: 'Flagged' },
  deleted:         { bg: '#FCEAEA',           fg: '#9A2F2F',          border: '#E5B5B5',              label: 'Removed' },
}

export default function AdminImageReviewPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [mode, setMode] = useState<'background' | 'case'>('background')
  const [status, setStatus] = useState<'all' | ReviewStatus>('needs_reprocess')
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const pageSize = 24

  // Debounce the search input so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250)
    return () => window.clearTimeout(handle)
  }, [searchTerm])

  // Reset to page 1 when the search or status changes — otherwise you can
  // land on an empty page 4 of a narrow result set.
  useEffect(() => { setPage(1) }, [debouncedSearch, status])
  const [data, setData] = useState<ApiResponse | null>(null)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [tagDrafts, setTagDrafts] = useState<Record<string, Set<TagKey>>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  const toggleTag = useCallback((watchId: string, tag: TagKey, seed: string[]) => {
    setTagDrafts(prev => {
      const current = prev[watchId] ?? new Set(seed as TagKey[])
      const next = new Set(current)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return { ...prev, [watchId]: next }
    })
  }, [])

  const load = useCallback(async () => {
    setFetching(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({
        status,
        page: String(page),
        pageSize: String(pageSize),
      })
      if (debouncedSearch) params.set('q', debouncedSearch)
      const res = await fetch(`/api/admin/image-review?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as ApiResponse
      setData(json)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err))
    } finally {
      setFetching(false)
    }
  }, [status, page, debouncedSearch])

  useEffect(() => {
    if (user && isAdminEmail(user.email)) void load()
  }, [user, load])

  const submitReview = useCallback(async (row: Row, next: ReviewStatus) => {
    const tagSet = tagDrafts[row.catalog_watch_id] ?? new Set(row.tags as TagKey[])
    const tagList = Array.from(tagSet)
    const noteValue = drafts[row.catalog_watch_id] ?? row.notes ?? null
    setBusy(prev => ({ ...prev, [row.catalog_watch_id]: true }))
    try {
      const res = await fetch('/api/admin/image-review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          catalog_watch_id: row.catalog_watch_id,
          status: next,
          notes: noteValue,
          tags: tagList,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `HTTP ${res.status}`)
      }
      // Optimistic local update so the card reflects the new status without a
      // full reload; reload happens lazily when the user switches tab/page.
      setData(prev => prev ? {
        ...prev,
        rows: prev.rows.map(r => r.catalog_watch_id === row.catalog_watch_id
          ? { ...r, status: next, notes: noteValue, tags: tagList, last_reviewed_at: new Date().toISOString() }
          : r),
      } : prev)
    } catch (err) {
      window.alert(`Failed to save review: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(prev => ({ ...prev, [row.catalog_watch_id]: false }))
    }
  }, [drafts, tagDrafts])

  const totalPages = data?.totalPages ?? 1

  if (loading) return null

  if (!user) {
    return (
      <div style={{ padding: '120px 56px', textAlign: 'center' }}>
        <p style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted }}>
          Sign in to access the admin dashboard.
        </p>
        <Link href="/auth" style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.gold }}>
          Sign in →
        </Link>
      </div>
    )
  }

  if (!isAdminEmail(user.email)) {
    return (
      <div style={{ padding: '120px 56px', textAlign: 'center' }}>
        <p style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted }}>
          You don&apos;t have access to the admin dashboard.
        </p>
        <button
          onClick={() => router.push('/')}
          style={{
            marginTop: 12, padding: '10px 20px', background: 'transparent', color: brand.colors.ink,
            border: `1px solid ${brand.colors.ink}`, borderRadius: brand.radius.btn,
            fontFamily: brand.font.sans, fontSize: 13, cursor: 'pointer',
          }}
        >
          ← Home
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '48px 56px 120px', borderTop: `1px solid ${brand.colors.border}` }}>
      <p style={{ margin: '0 0 4px', fontFamily: brand.font.sans, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted }}>
        Admin
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontFamily: brand.font.serif, fontSize: 32, fontWeight: 400, color: brand.colors.ink }}>
          Image review
        </h1>
        <Link
          href="/admin"
          style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, textDecoration: 'none' }}
        >
          ← Dashboard
        </Link>
      </div>
      <p style={{ margin: '6px 0 24px', fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, maxWidth: 720 }}>
        Side-by-side check of the catalog&apos;s processed primary image vs. the original. Flag bad rows for re-processing; the batch script can re-run them with bumped quality settings.
      </p>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['background', 'case'] as const).map(m => {
          const active = mode === m
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '9px 16px',
                background: active ? brand.colors.gold : '#FFFFFF',
                color: active ? brand.colors.white : brand.colors.ink,
                border: `1px solid ${active ? brand.colors.gold : brand.colors.border}`,
                borderRadius: brand.radius.md,
                fontFamily: brand.font.sans, fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
                cursor: 'pointer',
              }}
            >
              {m === 'background' ? 'Background removal' : 'Case segmentation'}
            </button>
          )
        })}
      </div>

      {mode === 'case' ? <CaseSegmentationReview /> : <>

      {/* Search */}
      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 480 }}>
        <input
          type="search"
          placeholder="Search brand, model, reference, or id…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '11px 14px 11px 38px',
            border: `1px solid ${brand.colors.border}`,
            borderRadius: brand.radius.md,
            // 16px is the iOS Safari focus-zoom threshold — anything smaller
            // triggers an auto-zoom that persists and breaks the layout.
            fontFamily: brand.font.sans, fontSize: 16,
            background: '#FFFFFF',
            color: brand.colors.ink,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: brand.colors.muted, fontSize: 14, pointerEvents: 'none',
        }}>⌕</span>
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: brand.colors.muted,
              fontSize: 14, cursor: 'pointer', padding: '4px 8px',
            }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {STATUS_TABS.map(tab => {
          const active = status === tab.key
          const count = data?.counts?.[tab.key] ?? 0
          return (
            <button
              key={tab.key}
              onClick={() => { setStatus(tab.key); setPage(1) }}
              style={{
                padding: '7px 14px',
                background: active ? brand.colors.ink : '#FFFFFF',
                color: active ? brand.colors.white : brand.colors.ink,
                border: `1px solid ${active ? brand.colors.ink : brand.colors.border}`,
                borderRadius: brand.radius.pill,
                fontFamily: brand.font.sans, fontSize: 12, letterSpacing: '0.02em',
                cursor: 'pointer',
              }}
            >
              {tab.label}
              <span style={{ marginLeft: 8, opacity: 0.7 }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Pagination header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        marginBottom: 16,
        fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted,
      }}>
        <div>
          {fetching
            ? 'Loading…'
            : data
              ? `${data.total} ${status === 'all' ? 'total' : `${status.replace('_', ' ')}`} · page ${data.page} of ${data.totalPages}`
              : '—'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            disabled={page <= 1 || fetching}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={paginationBtnStyle(page <= 1)}
          >← Prev</button>
          <button
            disabled={page >= totalPages || fetching}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={paginationBtnStyle(page >= totalPages)}
          >Next →</button>
        </div>
      </div>

      {fetchError && (
        <div style={{
          padding: 16, marginBottom: 16,
          background: '#FCEAEA', color: '#9A2F2F', border: '1px solid #E5B5B5',
          borderRadius: brand.radius.md, fontFamily: brand.font.sans, fontSize: 13,
        }}>
          Failed to load: {fetchError}
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(data?.rows ?? []).map(row => {
          const badge = STATUS_BADGE[row.status]
          const isBusy = !!busy[row.catalog_watch_id]
          const draft = drafts[row.catalog_watch_id] ?? row.notes ?? ''
          return (
            <div key={row.catalog_watch_id} style={{
              border: `1px solid ${brand.colors.border}`,
              borderRadius: brand.radius.lg,
              background: brand.colors.white,
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                padding: '14px 16px', borderBottom: `1px solid ${brand.colors.borderLight}`,
                gap: 12,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: brand.font.serif, fontSize: 16, color: brand.colors.ink }}>
                    {row.brand ?? '—'} {row.model ?? ''}
                  </div>
                  <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.reference ?? ''} · {row.catalog_watch_id}
                  </div>
                  <Link
                    href={`/admin/images?watchId=${encodeURIComponent(row.catalog_watch_id)}`}
                    style={{
                      display: 'inline-block', marginTop: 6,
                      fontFamily: brand.font.sans, fontSize: 11, fontWeight: 600,
                      letterSpacing: '0.04em', color: brand.colors.gold, textDecoration: 'none',
                    }}
                  >
                    Replace photo →
                  </Link>
                </div>
                <span style={{
                  padding: '3px 9px', borderRadius: brand.radius.pill,
                  background: badge.bg, color: badge.fg, border: `1px solid ${badge.border}`,
                  fontFamily: brand.font.sans, fontSize: 10, letterSpacing: '0.04em',
                  textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>
                  {badge.label}
                </span>
              </div>

              {/* Processed catalog image */}
              <ImagePane src={withVersion(row.webp_url) ?? row.webp_url} />

              {/* Tags + notes + actions */}
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <TagPicker
                  watchId={row.catalog_watch_id}
                  selected={tagDrafts[row.catalog_watch_id] ?? new Set(row.tags as TagKey[])}
                  onToggle={(tag) => toggleTag(row.catalog_watch_id, tag, row.tags)}
                />
                <textarea
                  value={draft}
                  onChange={e => setDrafts(prev => ({ ...prev, [row.catalog_watch_id]: e.target.value }))}
                  placeholder="Notes (optional — e.g. 'left bracelet eaten from 9 o'clock down')"
                  rows={2}
                  style={{
                    width: '100%', resize: 'vertical',
                    padding: 10,
                    background: '#FAFAF8',
                    border: `1px solid ${brand.colors.border}`,
                    borderRadius: brand.radius.sm,
                    fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.ink,
                    lineHeight: 1.4,
                  }}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(() => {
                    const tagCount = (tagDrafts[row.catalog_watch_id] ?? new Set(row.tags as TagKey[])).size
                    const reprocessPrimary = tagCount > 0
                    return (
                      <>
                        <ActionButton
                          label={reprocessPrimary ? 'Approve anyway' : 'Approve'}
                          variant={reprocessPrimary ? 'ghost' : 'approve'}
                          disabled={isBusy}
                          onClick={() => submitReview(row, 'approved')}
                        />
                        <ActionButton
                          label={reprocessPrimary ? `Needs reprocess (${tagCount})` : 'Needs reprocess'}
                          variant={reprocessPrimary ? 'reprocessPrimary' : 'reprocess'}
                          disabled={isBusy}
                          onClick={() => submitReview(row, 'needs_reprocess')}
                        />
                        <ActionButton
                          label="Remove image"
                          variant="delete"
                          disabled={isBusy}
                          onClick={() => submitReview(row, 'deleted')}
                        />
                      </>
                    )
                  })()}
                </div>
                {row.last_reviewed_at && (
                  <div style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted }}>
                    Last reviewed {new Date(row.last_reviewed_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {data && data.rows.length === 0 && !fetching && (
        <div style={{ padding: 60, textAlign: 'center', color: brand.colors.muted, fontFamily: brand.font.sans, fontSize: 13 }}>
          No images in this view.
        </div>
      )}
      </>}
    </div>
  )
}

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    background: '#FFFFFF',
    color: disabled ? brand.colors.muted : brand.colors.ink,
    border: `1px solid ${brand.colors.border}`,
    borderRadius: brand.radius.btn,
    fontFamily: brand.font.sans, fontSize: 12,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }
}

function TagPicker({
  watchId,
  selected,
  onToggle,
}: {
  watchId: string
  selected: Set<TagKey>
  onToggle: (tag: TagKey) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {TAG_GROUPS.map(group => (
        <div key={group.heading} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <span style={{
            fontFamily: brand.font.sans, fontSize: 9, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: brand.colors.muted,
            minWidth: 92,
          }}>{group.heading}</span>
          {group.items.map(({ key, label }) => {
            const active = selected.has(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => onToggle(key)}
                aria-pressed={active}
                aria-label={`${label} for ${watchId}`}
                style={{
                  padding: '3px 9px',
                  background: active ? brand.colors.ink : '#FFFFFF',
                  color: active ? brand.colors.white : brand.colors.ink,
                  border: `1px solid ${active ? brand.colors.ink : brand.colors.border}`,
                  borderRadius: brand.radius.pill,
                  fontFamily: brand.font.sans, fontSize: 11, letterSpacing: '0.01em',
                  cursor: 'pointer',
                  lineHeight: 1.3,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function ImagePane({ src, label }: { src: string | null; label?: string }) {
  return (
    <div style={{ background: '#F7F6F2', position: 'relative', aspectRatio: '4 / 3', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {label && (
        <span style={{
          position: 'absolute', top: 6, left: 8,
          fontFamily: brand.font.sans, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: brand.colors.muted, background: 'rgba(255,255,255,0.85)', padding: '2px 6px', borderRadius: 4,
        }}>{label}</span>
      )}
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label ?? 'watch'}
          loading="lazy"
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      ) : (
        <span style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, fontStyle: 'italic' }}>
          no image
        </span>
      )}
    </div>
  )
}

function ActionButton({
  label, variant, onClick, disabled,
}: {
  label: string
  variant: 'approve' | 'reprocess' | 'reprocessPrimary' | 'delete' | 'ghost'
  onClick: () => void
  disabled?: boolean
}) {
  const palette =
    variant === 'approve'           ? { bg: brand.colors.ink, fg: brand.colors.white, border: brand.colors.ink } :
    variant === 'ghost'             ? { bg: '#FFFFFF',        fg: brand.colors.muted, border: brand.colors.border } :
    variant === 'reprocess'         ? { bg: '#FFFFFF',        fg: '#9A5B14',          border: '#E9C99B' } :
    variant === 'reprocessPrimary'  ? { bg: '#9A5B14',        fg: '#FFFFFF',          border: '#9A5B14' } :
                                       { bg: '#FFFFFF',        fg: '#9A2F2F',          border: '#E5B5B5' }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 12px',
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        borderRadius: brand.radius.btn,
        fontFamily: brand.font.sans, fontSize: 12, letterSpacing: '0.02em',
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  )
}
