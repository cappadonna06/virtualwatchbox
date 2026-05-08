'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { brand } from '@/lib/brand'
import { useAuth } from '@/lib/auth/AuthProvider'
import { isAdminEmail } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/client'
import type { WatchType } from '@/types/watch'

const WATCH_TYPES: WatchType[] = [
  'Diver', 'Dress', 'Sport', 'Chronograph', 'GMT',
  'Pilot', 'Field', 'Integrated Bracelet', 'Vintage',
]

type PendingRow = {
  id: string
  brand: string
  model: string
  reference: string
  dial_color: string
  case_size_mm: number | null
  case_material: string
  watch_type: string
  movement: string | null
  estimated_value: number | null
  image_url: string | null
  submitted_by: string | null
  created_at: string
  source: string
  moderation_status: 'pending' | 'approved' | 'rejected'
}

type Group = {
  signature: string
  primary: PendingRow
  duplicates: PendingRow[]
}

export const dynamic = 'force-dynamic'

function dedupe(rows: PendingRow[]): Group[] {
  const buckets = new Map<string, PendingRow[]>()
  for (const r of rows) {
    const sig = [
      (r.brand ?? '').trim().toLowerCase(),
      (r.model ?? '').trim().toLowerCase(),
      (r.reference ?? '').trim().toLowerCase().replace(/[\s\-./]/g, ''),
    ].join('|')
    const list = buckets.get(sig) ?? []
    list.push(r)
    buckets.set(sig, list)
  }
  return Array.from(buckets.entries()).map(([signature, list]) => {
    // Most recent submission as the primary; older ones as duplicates.
    const sorted = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))
    return { signature, primary: sorted[0], duplicates: sorted.slice(1) }
  })
}

export default function AdminSubmissionsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState<PendingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<PendingRow>>({})
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  const groups = useMemo(() => dedupe(rows), [rows])

  const setRowBusy = (id: string, b: boolean) => {
    setBusy(prev => {
      const next = new Set(prev)
      if (b) next.add(id); else next.delete(id)
      return next
    })
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('catalog_watches')
        .select('id, brand, model, reference, dial_color, case_size_mm, case_material, watch_type, movement, estimated_value, image_url, submitted_by, created_at, source, moderation_status')
        .eq('moderation_status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      setRows((data ?? []) as PendingRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function decide(id: string, action: 'approve' | 'reject', alsoIds: string[] = []) {
    setRowBusy(id, true)
    try {
      const supabase = createClient()
      const targetStatus = action === 'approve' ? 'approved' : 'rejected'
      const { error } = await supabase
        .from('catalog_watches')
        .update({ moderation_status: targetStatus })
        .in('id', [id, ...alsoIds])
      if (error) throw error
      setRows(prev => prev.filter(r => r.id !== id && !alsoIds.includes(r.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update submission')
    } finally {
      setRowBusy(id, false)
    }
  }

  function startEdit(row: PendingRow) {
    setEditingId(row.id)
    setEditDraft({
      brand: row.brand,
      model: row.model,
      reference: row.reference,
      dial_color: row.dial_color,
      case_size_mm: row.case_size_mm,
      case_material: row.case_material,
      watch_type: row.watch_type,
      movement: row.movement ?? '',
      estimated_value: row.estimated_value,
    })
  }

  async function saveEdit(id: string) {
    setRowBusy(id, true)
    try {
      const res = await fetch(`/api/admin/catalog/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editDraft),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const j = await res.json() as { watch: PendingRow }
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...j.watch } : r))
      setEditingId(null)
      setEditDraft({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save edits')
    } finally {
      setRowBusy(id, false)
    }
  }

  if (authLoading) return null

  if (!user || !isAdminEmail(user.email)) {
    return (
      <div style={{ minHeight: 'calc(100vh - 61px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: brand.font.serif, fontSize: 22, color: brand.colors.ink, margin: '0 0 12px' }}>
            Admin access required.
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '10px 24px', background: 'transparent', color: brand.colors.ink,
              border: `1px solid ${brand.colors.ink}`, borderRadius: brand.radius.btn,
              fontFamily: brand.font.sans, fontSize: 13, cursor: 'pointer',
            }}
          >
            ← Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: 1100,
      margin: '0 auto',
      padding: '48px 40px 120px',
      borderTop: `1px solid ${brand.colors.border}`,
    }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: brand.font.serif, fontSize: 32, fontWeight: 500,
          color: brand.colors.ink, margin: '0 0 6px', letterSpacing: '0.01em',
        }}>
          User Submissions
        </h1>
        <p style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, margin: 0 }}>
          Watches submitted by users via the photo flow. Edit AI-detected fields, replace the photo with a curated version, then approve.
          Multiple submissions of the same watch are grouped together.
        </p>
      </div>

      {error && (
        <div style={{
          padding: '10px 12px', borderRadius: brand.radius.sm,
          background: 'rgba(208,64,64,0.08)', border: '1px solid rgba(208,64,64,0.3)',
          color: '#9A2222', fontFamily: brand.font.sans, fontSize: 12, marginBottom: 14,
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>Loading…</p>
      ) : groups.length === 0 ? (
        <div style={{
          padding: '40px 24px', textAlign: 'center',
          borderRadius: brand.radius.xl, border: `1px dashed ${brand.colors.borderLight}`,
          background: brand.colors.slot,
        }}>
          <p style={{ fontFamily: brand.font.serif, fontSize: 20, color: brand.colors.ink, margin: '0 0 6px' }}>
            No pending submissions
          </p>
          <p style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, margin: 0 }}>
            User photo submissions will appear here for review.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groups.map(group => {
            const r = group.primary
            const rowBusy = busy.has(r.id)
            const isEditing = editingId === r.id
            const isExpanded = expandedGroup === group.signature
            return (
              <div
                key={group.signature}
                style={{
                  padding: '16px 18px',
                  background: brand.colors.white,
                  border: `1px solid ${brand.colors.borderMid}`,
                  borderRadius: brand.radius.xl,
                }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr auto',
                  gap: 18,
                  alignItems: 'center',
                }}>
                  <div style={{
                    width: 120, height: 120, flexShrink: 0,
                    borderRadius: brand.radius.md,
                    background: brand.colors.slot,
                    border: `1px solid ${brand.colors.border}`,
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {r.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted }}>No photo</span>
                    )}
                  </div>

                  {isEditing ? (
                    <EditFields draft={editDraft} setDraft={setEditDraft} />
                  ) : (
                    <ReadOnlyFields row={r} />
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdit(r.id)}
                          disabled={rowBusy}
                          style={primaryBtn}
                        >
                          Save edits
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditDraft({}) }}
                          disabled={rowBusy}
                          style={ghostBtn}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => decide(r.id, 'approve', group.duplicates.map(d => d.id))}
                          disabled={rowBusy}
                          style={primaryBtn}
                        >
                          {group.duplicates.length > 0
                            ? `Approve all (${group.duplicates.length + 1}) →`
                            : 'Approve →'}
                        </button>
                        <button onClick={() => startEdit(r)} disabled={rowBusy} style={ghostBtn}>
                          ✎ Edit fields
                        </button>
                        <Link
                          href={`/admin/images?watchId=${r.id}`}
                          style={{ ...ghostBtn, textAlign: 'center', textDecoration: 'none' }}
                        >
                          ⤴ Replace photo
                        </Link>
                        <button
                          onClick={() => decide(r.id, 'reject', group.duplicates.map(d => d.id))}
                          disabled={rowBusy}
                          style={mutedBtn}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Group footer */}
                <div style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: `1px solid ${brand.colors.borderLight}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  color: brand.colors.muted,
                }}>
                  <span>
                    Submitted {new Date(r.created_at).toLocaleDateString()} · id <code style={{ fontSize: 10 }}>{r.id}</code>
                    {group.duplicates.length > 0 && (
                      <>
                        {' · '}
                        <span style={{ color: brand.colors.gold, fontWeight: 600 }}>
                          + {group.duplicates.length} duplicate submission{group.duplicates.length > 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                  </span>
                  {group.duplicates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedGroup(isExpanded ? null : group.signature)}
                      style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.ink,
                        textDecoration: 'underline', textUnderlineOffset: 2,
                      }}
                    >
                      {isExpanded ? 'Hide duplicates' : 'Show duplicates'}
                    </button>
                  )}
                </div>

                {isExpanded && group.duplicates.length > 0 && (
                  <div style={{
                    marginTop: 10,
                    padding: 10,
                    background: brand.colors.slot,
                    borderRadius: brand.radius.sm,
                    display: 'grid',
                    gap: 6,
                  }}>
                    {group.duplicates.map(d => (
                      <div key={d.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.ink,
                      }}>
                        {d.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={d.image_url}
                            alt=""
                            style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                          />
                        )}
                        <span style={{ flex: 1 }}>
                          <code style={{ fontSize: 10 }}>{d.id}</code> · {new Date(d.created_at).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => decide(d.id, 'reject')}
                          style={{
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                            color: brand.colors.muted, fontSize: 11, textDecoration: 'underline',
                          }}
                        >
                          Reject just this one
                        </button>
                      </div>
                    ))}
                    <p style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted, margin: '4px 0 0', fontStyle: 'italic' }}>
                      Approving the primary will approve all {group.duplicates.length + 1} submissions in this group together.
                    </p>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ReadOnlyFields({ row }: { row: PendingRow }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600,
        letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.gold, marginBottom: 4,
      }}>
        {row.brand}
      </div>
      <div style={{ fontFamily: brand.font.serif, fontSize: 22, color: brand.colors.ink, lineHeight: 1.1, marginBottom: 4 }}>
        {row.model}
      </div>
      <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, marginBottom: 8, letterSpacing: '0.02em' }}>
        Ref. {row.reference || '—'}
      </div>
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap',
        fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.ink,
      }}>
        <span>{row.case_size_mm ?? '—'}mm</span>
        <span style={{ color: brand.colors.borderMid }}>·</span>
        <span>{row.case_material || '—'}</span>
        <span style={{ color: brand.colors.borderMid }}>·</span>
        <span>{row.dial_color || '—'} dial</span>
        <span style={{ color: brand.colors.borderMid }}>·</span>
        <span>{row.watch_type}</span>
        {row.estimated_value ? (
          <>
            <span style={{ color: brand.colors.borderMid }}>·</span>
            <span style={{ color: brand.colors.gold, fontFamily: brand.font.serif, fontSize: 13 }}>
              ${row.estimated_value.toLocaleString()}
            </span>
          </>
        ) : null}
      </div>
    </div>
  )
}

function EditFields({
  draft,
  setDraft,
}: {
  draft: Partial<PendingRow>
  setDraft: (next: Partial<PendingRow>) => void
}) {
  const upd = (k: keyof PendingRow, v: unknown) => setDraft({ ...draft, [k]: v })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, minWidth: 0 }}>
      <Field label="Brand" value={draft.brand ?? ''} onChange={v => upd('brand', v)} />
      <Field label="Model" value={draft.model ?? ''} onChange={v => upd('model', v)} />
      <Field label="Reference" value={draft.reference ?? ''} onChange={v => upd('reference', v)} />
      <Field label="Dial color" value={draft.dial_color ?? ''} onChange={v => upd('dial_color', v)} />
      <Field label="Case size (mm)" value={draft.case_size_mm == null ? '' : String(draft.case_size_mm)} type="number" onChange={v => upd('case_size_mm', v ? Number(v) : null)} />
      <Field label="Case material" value={draft.case_material ?? ''} onChange={v => upd('case_material', v)} />
      <SelectField
        label="Watch type"
        value={(draft.watch_type as string) ?? 'Sport'}
        options={WATCH_TYPES}
        onChange={v => upd('watch_type', v)}
      />
      <Field label="Est. value (USD)" value={draft.estimated_value == null ? '' : String(draft.estimated_value)} type="number" onChange={v => upd('estimated_value', v ? Number(v) : null)} />
      <Field
        label="Movement"
        value={(draft.movement as string) ?? ''}
        onChange={v => upd('movement', v)}
        full
      />
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  full = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'number'
  full?: boolean
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, gridColumn: full ? 'span 2' : undefined }}>
      <span style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '6px 8px',
          fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.ink,
          background: brand.colors.bg,
          border: `1px solid ${brand.colors.borderMid}`,
          borderRadius: brand.radius.sm,
          outline: 'none',
        }}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted }}>
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '6px 8px',
          fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.ink,
          background: brand.colors.bg,
          border: `1px solid ${brand.colors.borderMid}`,
          borderRadius: brand.radius.sm,
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

const primaryBtn: React.CSSProperties = {
  padding: '8px 16px',
  background: brand.colors.ink, color: brand.colors.bg,
  border: 'none', borderRadius: brand.radius.btn,
  fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const ghostBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: 'transparent', color: brand.colors.ink,
  border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.btn,
  fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const mutedBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: 'none', color: brand.colors.muted,
  border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.btn,
  fontFamily: brand.font.sans, fontSize: 11, fontWeight: 400,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
