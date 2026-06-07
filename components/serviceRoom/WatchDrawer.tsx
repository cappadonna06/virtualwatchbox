'use client'

// components/serviceRoom/WatchDrawer.tsx — the per-piece Service Dossier
// quick-peek: ownership strip + service summary (with 3/5/7/10yr interval
// toggle) + a link into the full dossier tab on the watch detail page.

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { brand } from '@/lib/brand'
import {
  ACQ_LABEL, formatCost, formatDate, lastFullService, lifetimeCostCents,
  humanizeMonths, relTime, serviceStatus, serviceTypeMeta, warrantyStatus, type ServiceWatch,
} from '@/lib/serviceRoom/derive'
import type { ServiceIntervalYears, WatchServiceRecord } from '@/types/watch'
import {
  Icon, Meta, StatusChip, WarrantyChip, WatchTile,
  bookingUrl, btnPrimary, btnSecondary, iconBtn,
} from '@/components/serviceRoom/primitives'

const sans = brand.font.sans
const serif = brand.font.serif
const INTERVALS: ServiceIntervalYears[] = [3, 5, 7, 10]

type Props = {
  sw: ServiceWatch | null
  now: Date
  onClose: () => void
  onLog: (sw: ServiceWatch) => void
  onInterval: (sw: ServiceWatch, years: ServiceIntervalYears) => void
  onExport: (sw: ServiceWatch) => void
  /** Open the edit modal for an individual service record (in-hub editing). */
  onEditRecord: (record: WatchServiceRecord) => void
  /** Persist editable ownership facts (box / papers / warranty) from the drawer. */
  onSetOwnership: (sw: ServiceWatch, updates: OwnershipUpdates) => void
  /** When a modal (log/edit) is layered over the drawer, suppress the drawer's
   *  own Esc handler so Esc only closes the topmost layer. */
  escDisabled?: boolean
}

type OwnershipUpdates = { hasBox?: boolean; hasPapers?: boolean; warrantyExpiresAt?: string }

export function WatchDrawer({ sw, now, onClose, onLog, onInterval, onExport, onEditRecord, onSetOwnership, escDisabled = false }: Props) {
  const [displayed, setDisplayed] = useState<ServiceWatch | null>(sw)
  const panelRef = useRef<HTMLDivElement>(null)
  const open = !!sw

  // Live-read inside the keydown handler so toggling escDisabled doesn't
  // re-run the effect (which would re-fire the focus timeout and steal focus
  // from the open modal).
  const escDisabledRef = useRef(escDisabled)
  escDisabledRef.current = escDisabled

  useEffect(() => { if (sw) setDisplayed(sw) }, [sw])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !escDisabledRef.current) onClose() }
    window.addEventListener('keydown', onKey)
    const id = window.setTimeout(() => panelRef.current?.focus(), 60)
    return () => { window.removeEventListener('keydown', onKey); window.clearTimeout(id) }
  }, [open, onClose])

  const w = displayed

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.32)', backdropFilter: 'blur(2px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: `opacity ${brand.transition.smooth}`, zIndex: 300,
      }} />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={w ? `${w.watch.brand} ${w.watch.model} service dossier` : 'Service dossier'}
        style={{
          position: 'fixed', top: 0, right: 0, height: '100%', width: 'min(456px, 100vw)',
          background: brand.colors.slot, borderLeft: `1px solid ${brand.colors.borderMid}`, boxShadow: '-12px 0 40px rgba(26,20,16,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)', transition: `transform ${brand.transition.sheet}`,
          zIndex: 301, display: 'flex', flexDirection: 'column', outline: 'none',
        }}
      >
        {w && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: `1px solid ${brand.colors.border}`, flexShrink: 0 }}>
              <Meta>Service Dossier</Meta>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => onExport(w)} title="Export dossier" style={{ ...btnSecondary, padding: '6px 12px' }}>
                  <Icon name="download" size={13} color={brand.colors.ink} />Export
                </button>
                <button type="button" onClick={onClose} title="Close" aria-label="Close dossier" style={{ ...iconBtn, width: 30, height: 30 }}>
                  <Icon name="close" size={14} color={brand.colors.muted} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 22 }}>
              {/* hero */}
              <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                <WatchTile watch={w.watch} size={116} radius={brand.radius.xl} pad={0.1} />
                <div style={{ minWidth: 0 }}>
                  <Meta style={{ color: brand.colors.goldDeep }}>{w.watch.brand}</Meta>
                  <h2 style={{ fontFamily: serif, fontSize: 30, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.02, margin: '2px 0 5px' }}>{w.watch.model}</h2>
                  <div style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted, lineHeight: 1.5 }}>
                    Ref. {w.watch.reference}<br />{w.watch.caseSizeMm}mm · {w.watch.caseMaterial}<br />{w.watch.movement}
                  </div>
                </div>
              </div>

              <OwnershipStrip sw={w} now={now} onSet={u => onSetOwnership(w, u)} />
              <ServiceSummary sw={w} now={now} onLog={onLog} onInterval={onInterval} />
              <ServiceHistory sw={w} onEdit={onEditRecord} />
              <DocumentsPeek sw={w} onClose={onClose} />

              {/* Full record (timeline, notes, attachments) lives on the
                  watch's Service Dossier tab. */}
              <Link
                href={`/collection/watch/${w.watch.id}?tab=service&from=service-room`}
                onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  padding: '13px 16px', background: brand.colors.bg, border: `1px solid ${brand.colors.border}`,
                  borderRadius: brand.radius.lg, textDecoration: 'none',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: brand.colors.ink }}>Open full dossier</span>
                  <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted }}>
                    {w.records.length} service{w.records.length === 1 ? '' : 's'} · {w.documents.length} document{w.documents.length === 1 ? '' : 's'}
                  </span>
                </span>
                <span style={{ fontFamily: sans, fontSize: 16, color: brand.colors.goldDeep }}>→</span>
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

// ── Ownership strip (editable — box / papers / warranty, in-hub) ───────────
const ownDateInput: CSSProperties = {
  fontFamily: sans, fontSize: 13, color: brand.colors.ink, background: brand.colors.white,
  border: `1px solid ${brand.colors.borderLight}`, borderRadius: brand.radius.sm, padding: '6px 9px', outline: 'none',
}

function OwnershipStrip({ sw, now, onSet }: { sw: ServiceWatch; now: Date; onSet: (u: OwnershipUpdates) => void }) {
  const w = sw.watch
  const ws = warrantyStatus(sw, now)
  return (
    <div>
      <Meta style={{ display: 'block', marginBottom: 9 }}>Ownership &amp; warranty</Meta>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <OwnToggle icon="box" label="Box" active={w.hasBox === true} onClick={() => onSet({ hasBox: !(w.hasBox === true) })} />
        <OwnToggle icon="doc" label="Papers" active={w.hasPapers === true} onClick={() => onSet({ hasPapers: !(w.hasPapers === true) })} />
        {w.acquisitionMethod && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 11, fontWeight: 500, padding: '6px 12px', borderRadius: brand.radius.pill, background: brand.ownershipChip.absentBg, color: brand.colors.ink, border: `1px solid ${brand.colors.border}` }}>
            <Icon name="receipt" size={12} color={brand.colors.muted} />{ACQ_LABEL[w.acquisitionMethod]}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Meta style={{ fontSize: 11 }}>Warranty until</Meta>
        <input type="date" value={w.warrantyExpiresAt ?? ''} onChange={e => onSet({ warrantyExpiresAt: e.target.value })} style={ownDateInput} aria-label="Warranty expiry date" />
        {ws && <WarrantyChip warranty={ws} size="sm" />}
      </div>
    </div>
  )
}

function OwnToggle({ icon, label, active, onClick }: { icon: 'box' | 'doc'; label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: sans, fontSize: 12, fontWeight: 500,
      padding: '6px 12px', borderRadius: brand.radius.pill, cursor: 'pointer', transition: `all ${brand.transition.fast}`,
      background: active ? brand.ownershipChip.presentBg : brand.ownershipChip.absentBg,
      color: active ? brand.serviceStatus.ok.fg : brand.colors.muted,
      border: `1px solid ${active ? brand.ownershipChip.presentBorder : brand.colors.border}`,
    }}>
      <Icon name={active ? 'check' : icon} size={12} color={active ? brand.serviceStatus.ok.fg : brand.colors.muted} />{label}
    </button>
  )
}

// ── Service summary card (with interval toggle) ────────────────────────────
function ServiceSummary({ sw, now, onLog, onInterval }: { sw: ServiceWatch; now: Date; onLog: (sw: ServiceWatch) => void; onInterval: (sw: ServiceWatch, y: ServiceIntervalYears) => void }) {
  const st = serviceStatus(sw, now)
  const lf = lastFullService(sw)
  return (
    <div style={{ background: brand.colors.bg, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.xl, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <StatusChip status={st} showDate />
        <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted }}>
          {st.key === 'overdue' ? `${humanizeMonths(st.months)} overdue` : `due ${relTime(st.due, now)}`}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 12px', marginBottom: 16 }}>
        <SumStat label="Last full service" value={lf ? formatDate(lf.serviceDate) : 'Never serviced'} />
        <SumStat label="Lifetime upkeep" value={formatCost(lifetimeCostCents(sw))} accent={brand.colors.goldDeep} />
        <div>
          <Meta style={{ display: 'block', marginBottom: 5, fontSize: 11 }}>Service every</Meta>
          <div style={{ display: 'inline-flex', border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.sm, overflow: 'hidden', background: brand.colors.white }}>
            {INTERVALS.map(n => (
              <button key={n} type="button" onClick={() => onInterval(sw, n)} style={{
                fontFamily: sans, fontSize: 12, fontWeight: 600, padding: '5px 9px', border: 'none', cursor: 'pointer',
                background: sw.intervalYears === n ? brand.colors.ink : 'transparent', color: sw.intervalYears === n ? brand.colors.slot : brand.colors.muted,
              }}>{n}y</button>
            ))}
          </div>
        </div>
        <SumStat label="Next full service" value={formatDate(st.due, { year: 'numeric', month: 'short' })} accent={st.fg} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => onLog(sw)} style={{ ...btnPrimary, flex: 1, justifyContent: 'center', padding: '10px 16px' }}>
          <Icon name="plus" size={13} color={brand.colors.slot} />Log a service
        </button>
        <a href={bookingUrl(sw.watch.brand)} target="_blank" rel="noopener noreferrer sponsored" style={{ ...btnSecondary, justifyContent: 'center', padding: '9px 14px' }}>Find a center ↗</a>
      </div>
    </div>
  )
}

// ── Service history (editable inline — tap a record to edit/remove) ─────────
function ServiceHistory({ sw, onEdit }: { sw: ServiceWatch; onEdit: (r: WatchServiceRecord) => void }) {
  if (sw.records.length === 0) return null
  const sorted = [...sw.records].sort((a, b) => (a.serviceDate < b.serviceDate ? 1 : a.serviceDate > b.serviceDate ? -1 : 0))
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <Meta>Service history</Meta>
        <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted }}>tap to edit</span>
      </div>
      <div>
        {sorted.map((r, i) => {
          const t = serviceTypeMeta(r.serviceType)
          const last = i === sorted.length - 1
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onEdit(r)}
              style={{
                width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 2px',
                background: 'none', border: 'none', borderBottom: last ? 'none' : `1px solid ${brand.colors.border}`,
                cursor: 'pointer', transition: `background ${brand.transition.fast}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = brand.colors.bg }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <span style={{ width: 16, textAlign: 'center', flexShrink: 0, fontSize: 13, color: t.resets ? brand.colors.gold : brand.colors.muted }}>{t.glyph}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: brand.colors.ink, lineHeight: 1.2 }}>{t.label}</div>
                <div style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatDate(r.serviceDate)}{r.provider ? ` · ${r.provider}` : ''}
                </div>
              </div>
              {r.cost != null && (
                <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: brand.colors.ink, flexShrink: 0 }}>{formatCost(r.cost)}</span>
              )}
              <Icon name="chevron" size={13} color={brand.colors.faint} style={{ flexShrink: 0 }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Papers & Provenance peek — document thumbnails linking into the dossier ──
function DocumentsPeek({ sw, onClose }: { sw: ServiceWatch; onClose: () => void }) {
  if (sw.documents.length === 0) return null
  const shown = sw.documents.slice(0, 4)
  return (
    <Link
      href={`/collection/watch/${sw.watch.id}?tab=service&from=service-room`}
      onClick={onClose}
      style={{ display: 'block', textDecoration: 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <Meta>Papers &amp; provenance</Meta>
        <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted }}>{sw.documents.length} on file →</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {shown.map(d => {
          const isImg = !d.mimeType || d.mimeType.startsWith('image/')
          return (
            <div key={d.id} style={{ width: 52, height: 52, borderRadius: brand.radius.sm, overflow: 'hidden', border: `1px solid ${brand.colors.border}`, background: brand.colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isImg
                ? <img src={d.photoUrl} alt={d.caption ?? 'Document'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: brand.colors.muted }}>DOC</span>}
            </div>
          )
        })}
      </div>
    </Link>
  )
}

function SumStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <Meta style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>{label}</Meta>
      <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: accent ?? brand.colors.ink }}>{value}</span>
    </div>
  )
}
