'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { brand } from '@/lib/brand'
import type { LugGeometry, LugPoint } from '@/lib/caseSegmentation'

type SegStatus = 'pending' | 'approved' | 'needs_review' | 'rejected' | 'not_applicable'

type Row = {
  catalog_watch_id: string
  brand: string | null
  model: string | null
  reference: string | null
  primary_webp_url: string | null
  case_only_url: string | null
  case_only_webp_url: string | null
  lug_geometry: LugGeometry | null
  segmentation_confidence: number | null
  segmentation_status: SegStatus | null
  segmentation_reviewed_at: string | null
  case_shape: string | null
  strap_attachment_type: string | null
}

type ApiResponse = {
  rows: Row[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  counts: Record<'all' | SegStatus, number>
  status: SegStatus | 'all'
}

const STATUS_TABS: Array<{ key: 'all' | SegStatus; label: string }> = [
  { key: 'needs_review', label: 'Needs review' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'not_applicable', label: 'N/A (integrated)' },
  { key: 'all', label: 'All' },
]

const STATUS_BADGE: Record<SegStatus, { bg: string; fg: string; border: string; label: string }> = {
  pending:         { bg: '#FFFFFF', fg: brand.colors.muted, border: brand.colors.borderMid, label: 'Pending' },
  approved:        { bg: '#EEF6EE', fg: '#2F6B33',          border: '#BFD9C2',              label: 'Approved' },
  needs_review:    { bg: '#FFF4E6', fg: '#9A5B14',          border: '#E9C99B',              label: 'Needs review' },
  rejected:        { bg: '#FCEAEA', fg: '#9A2F2F',          border: '#E5B5B5',               label: 'Rejected' },
  not_applicable:  { bg: '#F0F0F0', fg: brand.colors.muted, border: brand.colors.borderMid, label: 'N/A' },
}

type MarkerKey = 'topLugLeft' | 'topLugRight' | 'bottomLugLeft' | 'bottomLugRight'
const MARKER_KEYS: MarkerKey[] = ['topLugLeft', 'topLugRight', 'bottomLugLeft', 'bottomLugRight']

export default function CaseSegmentationReview() {
  const [status, setStatus] = useState<'all' | SegStatus>('needs_review')
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const pageSize = 12

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250)
    return () => window.clearTimeout(handle)
  }, [searchTerm])
  useEffect(() => { setPage(1) }, [debouncedSearch, status])

  const [data, setData] = useState<ApiResponse | null>(null)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  // Local geometry edits, keyed by watch id — seeded from the row's own
  // lug_geometry the first time a marker is dragged.
  const [geomDrafts, setGeomDrafts] = useState<Record<string, LugGeometry>>({})

  const load = useCallback(async () => {
    setFetching(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ status, page: String(page), pageSize: String(pageSize) })
      if (debouncedSearch) params.set('q', debouncedSearch)
      const res = await fetch(`/api/admin/case-segmentation?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err))
    } finally {
      setFetching(false)
    }
  }, [status, page, debouncedSearch])

  useEffect(() => { void load() }, [load])

  const submit = useCallback(async (row: Row, next: SegStatus) => {
    setBusy(prev => ({ ...prev, [row.catalog_watch_id]: true }))
    try {
      const geometry = geomDrafts[row.catalog_watch_id]
      const res = await fetch('/api/admin/case-segmentation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          catalog_watch_id: row.catalog_watch_id,
          status: next,
          lug_geometry: geometry ?? undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `HTTP ${res.status}`)
      }
      setData(prev => prev ? {
        ...prev,
        rows: prev.rows.map(r => r.catalog_watch_id === row.catalog_watch_id
          ? { ...r, segmentation_status: next, lug_geometry: geometry ?? r.lug_geometry, segmentation_confidence: geometry ? 1 : r.segmentation_confidence }
          : r),
      } : prev)
    } catch (err) {
      window.alert(`Failed to save: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(prev => ({ ...prev, [row.catalog_watch_id]: false }))
    }
  }, [geomDrafts])

  const totalPages = data?.totalPages ?? 1

  return (
    <div>
      <p style={{ margin: '0 0 20px', fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, maxWidth: 720 }}>
        Original photo vs. the case-only cutout. Drag the four markers to correct the lug attachment
        points if the automated cut is off — corrections save with confidence 1.0 and skip the
        escalation tiers next run.
      </p>

      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 480 }}>
        <input
          type="search"
          placeholder="Search brand, model, reference, or id…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%', padding: '11px 14px 11px 38px',
            border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.md,
            fontFamily: brand.font.sans, fontSize: 16, background: '#FFFFFF', color: brand.colors.ink,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

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
                fontFamily: brand.font.sans, fontSize: 12, letterSpacing: '0.02em', cursor: 'pointer',
              }}
            >
              {tab.label}<span style={{ marginLeft: 8, opacity: 0.7 }}>{count}</span>
            </button>
          )
        })}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16,
        fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted,
      }}>
        <div>{fetching ? 'Loading…' : data ? `${data.total} · page ${data.page} of ${data.totalPages}` : '—'}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={page <= 1 || fetching} onClick={() => setPage(p => Math.max(1, p - 1))} style={pagBtn(page <= 1)}>← Prev</button>
          <button disabled={page >= totalPages || fetching} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={pagBtn(page >= totalPages)}>Next →</button>
        </div>
      </div>

      {fetchError && (
        <div style={{ padding: 16, marginBottom: 16, background: '#FCEAEA', color: '#9A2F2F', border: '1px solid #E5B5B5', borderRadius: brand.radius.md, fontFamily: brand.font.sans, fontSize: 13 }}>
          Failed to load: {fetchError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(data?.rows ?? []).map(row => (
          <CaseCard
            key={row.catalog_watch_id}
            row={row}
            geometry={geomDrafts[row.catalog_watch_id] ?? row.lug_geometry}
            onGeometryChange={(g) => setGeomDrafts(prev => ({ ...prev, [row.catalog_watch_id]: g }))}
            busy={!!busy[row.catalog_watch_id]}
            onSubmit={(next) => submit(row, next)}
          />
        ))}
      </div>

      {data && data.rows.length === 0 && !fetching && (
        <div style={{ padding: 60, textAlign: 'center', color: brand.colors.muted, fontFamily: brand.font.sans, fontSize: 13 }}>
          No case-only cutouts in this view.
        </div>
      )}
    </div>
  )
}

function pagBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 12px', background: '#FFFFFF', color: disabled ? brand.colors.muted : brand.colors.ink,
    border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.btn,
    fontFamily: brand.font.sans, fontSize: 12, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
  }
}

function CaseCard({
  row, geometry, onGeometryChange, busy, onSubmit,
}: {
  row: Row
  geometry: LugGeometry | null
  onGeometryChange: (g: LugGeometry) => void
  busy: boolean
  onSubmit: (status: SegStatus) => void
}) {
  const badge = row.segmentation_status ? STATUS_BADGE[row.segmentation_status] : STATUS_BADGE.pending
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<MarkerKey | null>(null)

  const onPointerMove = useCallback((e: PointerEvent) => {
    const key = draggingRef.current
    const container = containerRef.current
    if (!key || !container || !geometry) return
    const rect = container.getBoundingClientRect()
    const xFrac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const yFrac = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    const next: LugGeometry = {
      ...geometry,
      [key]: { x: Math.round(xFrac * geometry.imageWidth), y: Math.round(yFrac * geometry.imageHeight) },
    }
    onGeometryChange(next)
  }, [geometry, onGeometryChange])

  const onPointerUp = useCallback(() => {
    draggingRef.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [onPointerMove])

  const startDrag = useCallback((key: MarkerKey) => (e: React.PointerEvent) => {
    e.preventDefault()
    draggingRef.current = key
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }, [onPointerMove, onPointerUp])

  useEffect(() => () => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [onPointerMove, onPointerUp])

  const markerPositions = useMemo(() => {
    if (!geometry) return null
    const pct = (p: LugPoint) => ({ left: `${(p.x / geometry.imageWidth) * 100}%`, top: `${(p.y / geometry.imageHeight) * 100}%` })
    return {
      topLugLeft: pct(geometry.topLugLeft),
      topLugRight: pct(geometry.topLugRight),
      bottomLugLeft: pct(geometry.bottomLugLeft),
      bottomLugRight: pct(geometry.bottomLugRight),
    }
  }, [geometry])

  return (
    <div style={{ border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg, background: brand.colors.white, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${brand.colors.borderLight}`, gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: brand.font.serif, fontSize: 16, color: brand.colors.ink }}>{row.brand ?? '—'} {row.model ?? ''}</div>
          <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, marginTop: 2 }}>
            {row.reference ?? ''} · {row.catalog_watch_id}
            {row.segmentation_confidence != null && ` · conf=${row.segmentation_confidence.toFixed(2)}`}
            {row.strap_attachment_type && ` · ${row.strap_attachment_type}`}
          </div>
        </div>
        <span style={{ padding: '3px 9px', borderRadius: brand.radius.pill, background: badge.bg, color: badge.fg, border: `1px solid ${badge.border}`, fontFamily: brand.font.sans, fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {badge.label}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: brand.colors.borderLight }}>
        <div style={{ background: '#F7F6F2', aspectRatio: '4 / 5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
          <span style={{ position: 'absolute', top: 6, left: 8, fontFamily: brand.font.sans, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: brand.colors.muted, background: 'rgba(255,255,255,0.85)', padding: '2px 6px', borderRadius: 4 }}>Original</span>
          {row.primary_webp_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.primary_webp_url} alt="original" loading="lazy" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          )}
        </div>

        <div
          ref={containerRef}
          style={{ background: '#F7F6F2', aspectRatio: '4 / 5', position: 'relative', overflow: 'hidden' }}
        >
          <span style={{ position: 'absolute', top: 6, left: 8, zIndex: 2, fontFamily: brand.font.sans, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: brand.colors.muted, background: 'rgba(255,255,255,0.85)', padding: '2px 6px', borderRadius: 4 }}>Case-only</span>
          {(row.case_only_webp_url || row.case_only_url) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.case_only_webp_url ?? row.case_only_url ?? undefined}
              alt="case-only"
              loading="lazy"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
            />
          )}
          {markerPositions && MARKER_KEYS.map(key => (
            <div
              key={key}
              onPointerDown={startDrag(key)}
              title={key}
              style={{
                position: 'absolute',
                left: markerPositions[key].left,
                top: markerPositions[key].top,
                transform: 'translate(-50%, -50%)',
                width: 14, height: 14, borderRadius: '50%',
                background: brand.colors.gold, border: `2px solid ${brand.colors.white}`,
                boxShadow: brand.shadow.sm,
                cursor: 'grab', zIndex: 3, touchAction: 'none',
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ padding: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <ActionButton label="Approve" variant="approve" disabled={busy} onClick={() => onSubmit('approved')} />
        <ActionButton label="Needs review" variant="reprocess" disabled={busy} onClick={() => onSubmit('needs_review')} />
        <ActionButton label="Reject" variant="delete" disabled={busy} onClick={() => onSubmit('rejected')} />
        <ActionButton label="Not applicable" variant="ghost" disabled={busy} onClick={() => onSubmit('not_applicable')} />
      </div>
    </div>
  )
}

function ActionButton({
  label, variant, onClick, disabled,
}: {
  label: string
  variant: 'approve' | 'reprocess' | 'delete' | 'ghost'
  onClick: () => void
  disabled?: boolean
}) {
  const palette =
    variant === 'approve'   ? { bg: brand.colors.ink, fg: brand.colors.white, border: brand.colors.ink } :
    variant === 'ghost'     ? { bg: '#FFFFFF',        fg: brand.colors.muted, border: brand.colors.border } :
    variant === 'reprocess' ? { bg: '#FFFFFF',        fg: '#9A5B14',          border: '#E9C99B' } :
                               { bg: '#FFFFFF',        fg: '#9A2F2F',          border: '#E5B5B5' }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 12px', background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}`,
        borderRadius: brand.radius.btn, fontFamily: brand.font.sans, fontSize: 12, letterSpacing: '0.02em',
        cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  )
}
