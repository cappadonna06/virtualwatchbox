'use client'

// components/serviceRoom/WatchDrawer.tsx — the per-piece Service Dossier:
// ownership strip · service summary (with 3/5/7/10yr interval toggle) ·
// Papers & Provenance · most-recent-first service timeline.

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { brand } from '@/lib/brand'
import {
  ACQ_LABEL, docTypeMeta, formatCost, formatDate, lastFullService, lifetimeCostCents,
  relTime, serviceStatus, serviceTypeMeta, warrantyStatus, type ServiceWatch,
} from '@/lib/serviceRoom/derive'
import type { ServiceIntervalYears } from '@/types/watch'
import {
  DocTile, Icon, Meta, StatusChip, WarrantyChip, WatchTile,
  bookingUrl, btnPrimary, btnSecondary, emptyNote, iconBtn,
} from '@/components/serviceRoom/primitives'

const sans = brand.font.sans
const serif = brand.font.serif
const drawerH3: CSSProperties = { fontFamily: serif, fontSize: 21, fontWeight: 500, color: brand.colors.ink, margin: 0, lineHeight: 1 }
const INTERVALS: ServiceIntervalYears[] = [3, 5, 7, 10]

type Props = {
  sw: ServiceWatch | null
  now: Date
  onClose: () => void
  onLog: (sw: ServiceWatch) => void
  onInterval: (sw: ServiceWatch, years: ServiceIntervalYears) => void
  onExport: (sw: ServiceWatch) => void
  onDeleteService: (sw: ServiceWatch, recordId: string) => void
}

export function WatchDrawer({ sw, now, onClose, onLog, onInterval, onExport, onDeleteService }: Props) {
  const [displayed, setDisplayed] = useState<ServiceWatch | null>(sw)
  const panelRef = useRef<HTMLDivElement>(null)
  const open = !!sw

  useEffect(() => { if (sw) setDisplayed(sw) }, [sw])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
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
                  <Meta style={{ color: brand.colors.gold }}>{w.watch.brand}</Meta>
                  <h2 style={{ fontFamily: serif, fontSize: 30, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.02, margin: '2px 0 5px' }}>{w.watch.model}</h2>
                  <div style={{ fontFamily: sans, fontSize: 11.5, color: brand.colors.muted, lineHeight: 1.5 }}>
                    Ref. {w.watch.reference}<br />{w.watch.caseSizeMm}mm · {w.watch.caseMaterial}<br />{w.watch.movement}
                  </div>
                </div>
              </div>

              <OwnershipStrip sw={w} now={now} />
              <ServiceSummary sw={w} now={now} onLog={onLog} onInterval={onInterval} />
              <div style={{ height: 1, background: brand.colors.border }} />
              <PapersSection sw={w} />
              <div style={{ height: 1, background: brand.colors.border }} />
              <ServiceTimeline sw={w} onDeleteService={onDeleteService} />
            </div>
          </>
        )}
      </aside>
    </>
  )
}

// ── Ownership strip ───────────────────────────────────────────────────────
function OwnershipStrip({ sw, now }: { sw: ServiceWatch; now: Date }) {
  const w = sw.watch
  const chips: { ok: boolean; label: string; icon: 'box' | 'doc' }[] = [
    { ok: w.hasBox === true, label: w.hasBox ? 'Box' : 'No box', icon: 'box' },
    { ok: w.hasPapers === true, label: w.hasPapers ? 'Papers' : 'No papers', icon: 'doc' },
  ]
  const ws = warrantyStatus(sw, now)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {chips.map((c, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 11, fontWeight: 500,
          padding: '5px 11px', borderRadius: brand.radius.pill,
          background: c.ok ? brand.ownershipChip.presentBg : brand.ownershipChip.absentBg, color: c.ok ? brand.serviceStatus.ok.fg : brand.colors.muted,
          border: `1px solid ${c.ok ? brand.ownershipChip.presentBorder : brand.colors.border}`,
        }}>
          <Icon name={c.ok ? 'check' : c.icon} size={12} color={c.ok ? brand.serviceStatus.ok.fg : brand.colors.muted} />{c.label}
        </span>
      ))}
      {w.acquisitionMethod && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 11, fontWeight: 500, padding: '5px 11px', borderRadius: brand.radius.pill, background: brand.ownershipChip.absentBg, color: brand.colors.ink, border: `1px solid ${brand.colors.border}` }}>
          <Icon name="receipt" size={12} color={brand.colors.muted} />{ACQ_LABEL[w.acquisitionMethod]}
        </span>
      )}
      <WarrantyChip warranty={ws} size="sm" />
    </div>
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
        <span style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted }}>
          {st.key === 'overdue' ? `${Math.round(Math.abs(st.months))} mo overdue` : `due ${relTime(st.due, now)}`}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 12px', marginBottom: 16 }}>
        <SumStat label="Last full service" value={lf ? formatDate(lf.serviceDate) : 'Never serviced'} />
        <SumStat label="Lifetime upkeep" value={formatCost(lifetimeCostCents(sw))} accent={brand.colors.gold} />
        <div>
          <Meta style={{ display: 'block', marginBottom: 5, fontSize: 9 }}>Service every</Meta>
          <div style={{ display: 'inline-flex', border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.sm, overflow: 'hidden', background: brand.colors.white }}>
            {INTERVALS.map(n => (
              <button key={n} type="button" onClick={() => onInterval(sw, n)} style={{
                fontFamily: sans, fontSize: 11.5, fontWeight: 600, padding: '5px 9px', border: 'none', cursor: 'pointer',
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

function SumStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <Meta style={{ display: 'block', marginBottom: 4, fontSize: 9 }}>{label}</Meta>
      <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: accent ?? brand.colors.ink }}>{value}</span>
    </div>
  )
}

// ── Papers & Provenance (from document-type photos) ────────────────────────
function PapersSection({ sw }: { sw: ServiceWatch }) {
  const docs = sw.documents
  const present = [...new Set(docs.map(d => d.photoType as string))]
  const [filter, setFilter] = useState<string>('all')
  const shown = filter === 'all' ? docs : docs.filter(d => d.photoType === filter)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <h3 style={drawerH3}>Papers &amp; Provenance</h3>
        <span style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted }}>{docs.length} on file</span>
      </div>

      {docs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
          <DocFilterChip active={filter === 'all'} label="All" count={docs.length} onClick={() => setFilter('all')} />
          {present.map(t => (
            <DocFilterChip key={t} active={filter === t} label={docTypeMeta(t).label} count={docs.filter(d => d.photoType === t).length} onClick={() => setFilter(t)} />
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {shown.map(d => {
          const type = d.photoType as string
          const label = d.caption?.trim() || docTypeMeta(type).label
          const date = d.takenAt || d.createdAt
          return (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 12px', background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg }}>
              <DocTile type={type} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 600, color: brand.colors.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
                  <span style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: brand.colors.gold }}>{docTypeMeta(type).label}</span>
                  <span style={{ width: 3, height: 3, borderRadius: 3, background: brand.colors.borderLight }} />
                  <span style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted }}>{formatDate(date)}</span>
                </div>
              </div>
              <a href={d.photoUrl} target="_blank" rel="noopener noreferrer" title="View full size" style={{ ...iconBtn, width: 26, height: 26 }}>
                <Icon name="arrowUpRight" size={13} color={brand.colors.muted} />
              </a>
            </div>
          )
        })}
        {sw.watch.hasPapers === false && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: brand.radius.lg, background: brand.serviceStatus.due.bg, color: brand.serviceStatus.due.fg, fontFamily: sans, fontSize: 11.5 }}>
            <Icon name="shield" size={13} color={brand.serviceStatus.due.fg} />Original papers missing — affects resale value.
          </div>
        )}
        {docs.length === 0 && sw.watch.hasPapers !== false && (
          <div style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted, padding: '4px 0' }}>
            No documents on file yet. Add receipts, warranty cards, or service records from the watch&apos;s photo gallery.
          </div>
        )}
      </div>
    </div>
  )
}

function DocFilterChip({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.02em',
      padding: '5px 11px', borderRadius: brand.radius.pill, cursor: 'pointer',
      background: active ? brand.colors.ink : 'transparent', color: active ? brand.colors.slot : brand.colors.muted,
      border: `1px solid ${active ? brand.colors.ink : brand.colors.border}`, transition: `all ${brand.transition.fast}`,
    }}>
      {label}<span style={{ opacity: 0.6 }}>{count}</span>
    </button>
  )
}

// ── Service timeline (most-recent-first) ───────────────────────────────────
function ServiceTimeline({ sw, onDeleteService }: { sw: ServiceWatch; onDeleteService: (sw: ServiceWatch, recordId: string) => void }) {
  const records = [...sw.records].sort((a, b) => (a.serviceDate < b.serviceDate ? 1 : a.serviceDate > b.serviceDate ? -1 : 0))
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <h3 style={drawerH3}>Service history</h3>
        <span style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted }}>{records.length} record{records.length === 1 ? '' : 's'}</span>
      </div>

      {records.length === 0 && (
        <div style={{ ...emptyNote, padding: '14px 0', textAlign: 'left', fontSize: 15 }}>No service logged yet.</div>
      )}

      <div style={{ position: 'relative' }}>
        {records.map((r, i) => {
          const t = serviceTypeMeta(r.serviceType)
          const last = i === records.length - 1
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 14, paddingBottom: last ? 0 : 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ width: 13, height: 13, borderRadius: 13, border: `2px solid ${t.resets ? brand.colors.gold : brand.colors.borderLight}`, background: t.resets ? brand.colors.gold : brand.colors.white, marginTop: 3, flexShrink: 0, boxShadow: t.resets ? '0 0 0 3px rgba(201,168,76,0.13)' : 'none' }} />
                {!last && <span style={{ width: 1.5, flex: 1, background: brand.colors.border, marginTop: 4 }} />}
              </div>
              <div style={{ paddingBottom: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 5 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 12, fontWeight: 600, color: brand.colors.ink }}>
                    <span style={{ color: t.resets ? brand.colors.gold : brand.colors.muted, fontSize: 13 }}>{t.glyph}</span>{t.label}
                  </span>
                  <span style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>{formatDate(r.serviceDate)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: r.notes ? 6 : 0 }}>
                  {r.provider && <span style={{ fontFamily: sans, fontSize: 11.5, color: brand.colors.muted }}>{r.provider}</span>}
                  <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, color: r.cost ? brand.colors.ink : brand.serviceStatus.ok.fg, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    {r.cost ? formatCost(r.cost) : 'No charge'}
                  </span>
                </div>
                {r.notes && <p style={{ fontFamily: sans, fontSize: 11.5, color: brand.colors.ink, opacity: 0.75, lineHeight: 1.5, margin: '0 0 6px' }}>{r.notes}</p>}
                {confirmId === r.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: sans, fontSize: 11 }}>
                    <span style={{ color: brand.serviceStatus.overdue.fg }}>Delete this record?</span>
                    <button type="button" onClick={() => { onDeleteService(sw, r.id); setConfirmId(null) }} style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, color: brand.serviceStatus.overdue.fg, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Confirm</button>
                    <button type="button" onClick={() => setConfirmId(null)} style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Cancel</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmId(r.id)} style={{ fontFamily: sans, fontSize: 10.5, color: brand.colors.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.04em' }}>Remove</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
