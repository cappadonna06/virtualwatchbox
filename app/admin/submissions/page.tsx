'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { brand } from '@/lib/brand'
import { useAuth } from '@/lib/auth/AuthProvider'
import { isAdminEmail } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/client'

type PendingRow = {
  id: string
  brand: string
  model: string
  reference: string
  dial_color: string
  case_size_mm: number | null
  case_material: string
  watch_type: string
  image_url: string | null
  submitted_by: string | null
  created_at: string
  source: string
  moderation_status: 'pending' | 'approved' | 'rejected'
}

export const dynamic = 'force-dynamic'

export default function AdminSubmissionsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState<PendingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

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
        .select('id, brand, model, reference, dial_color, case_size_mm, case_material, watch_type, image_url, submitted_by, created_at, source, moderation_status')
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

  async function decide(id: string, action: 'approve' | 'reject') {
    setRowBusy(id, true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('catalog_watches')
        .update({ moderation_status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', id)
      if (error) throw error
      setRows(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update submission')
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
          Watches submitted by users via the photo flow. Approve to add to the public catalog, or reject to hide.
        </p>
      </div>

      {error && (
        <div style={{
          padding: '10px 12px',
          borderRadius: brand.radius.sm,
          background: 'rgba(208,64,64,0.08)',
          border: '1px solid rgba(208,64,64,0.3)',
          color: '#9A2222',
          fontFamily: brand.font.sans, fontSize: 12,
          marginBottom: 14,
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div style={{
          padding: '40px 24px',
          textAlign: 'center',
          borderRadius: brand.radius.xl,
          border: `1px dashed ${brand.colors.borderLight}`,
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
          {rows.map(r => {
            const rowBusy = busy.has(r.id)
            return (
              <div key={r.id} style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr auto',
                gap: 18,
                alignItems: 'center',
                padding: '14px 16px',
                background: brand.colors.white,
                border: `1px solid ${brand.colors.borderMid}`,
                borderRadius: brand.radius.xl,
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
                    <span style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted }}>
                      No photo
                    </span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.gold, marginBottom: 4 }}>
                    {r.brand}
                  </div>
                  <div style={{ fontFamily: brand.font.serif, fontSize: 22, color: brand.colors.ink, lineHeight: 1.1, marginBottom: 4 }}>
                    {r.model}
                  </div>
                  <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, marginBottom: 8, letterSpacing: '0.02em' }}>
                    Ref. {r.reference || '—'}
                  </div>
                  <div style={{
                    display: 'flex', gap: 12, flexWrap: 'wrap',
                    fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.ink,
                  }}>
                    <span>{r.case_size_mm ?? '—'}mm</span>
                    <span style={{ color: brand.colors.borderMid }}>·</span>
                    <span>{r.case_material || '—'}</span>
                    <span style={{ color: brand.colors.borderMid }}>·</span>
                    <span>{r.dial_color || '—'} dial</span>
                    <span style={{ color: brand.colors.borderMid }}>·</span>
                    <span>{r.watch_type}</span>
                  </div>
                  <div style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted, marginTop: 6, letterSpacing: '0.04em' }}>
                    Submitted {new Date(r.created_at).toLocaleDateString()} · {r.id}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    onClick={() => decide(r.id, 'approve')}
                    disabled={rowBusy}
                    style={{
                      padding: '8px 16px',
                      background: brand.colors.ink,
                      color: brand.colors.bg,
                      border: 'none',
                      borderRadius: brand.radius.btn,
                      cursor: rowBusy ? 'not-allowed' : 'pointer',
                      fontFamily: brand.font.sans,
                      fontSize: 12, fontWeight: 500, letterSpacing: '0.04em',
                    }}
                  >
                    Approve →
                  </button>
                  <button
                    onClick={() => decide(r.id, 'reject')}
                    disabled={rowBusy}
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      color: brand.colors.muted,
                      border: `1px solid ${brand.colors.border}`,
                      borderRadius: brand.radius.btn,
                      cursor: rowBusy ? 'not-allowed' : 'pointer',
                      fontFamily: brand.font.sans,
                      fontSize: 12, fontWeight: 400,
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
