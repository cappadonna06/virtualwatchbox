'use client'

// components/serviceRoom/HubLedger.tsx — the "file cabinet": a sortable ledger
// of the whole box. Click a row to open the dossier; click a header to sort.

import { useState } from 'react'
import { brand } from '@/lib/brand'
import {
  formatCost, formatMonthYear, lastAnyService, lastFullService, lifetimeCostCents,
  serviceStatus, serviceTypeMeta, warrantyStatus, type ServiceWatch,
} from '@/lib/serviceRoom/derive'
import { Icon, SectionHead, StatusChip, WatchShot, iconBtn } from '@/components/serviceRoom/primitives'
import type { LayoutProps } from '@/components/serviceRoom/layoutTypes'

const sans = brand.font.sans
const serif = brand.font.serif

type ColId = 'watch' | 'last' | 'next' | 'interval' | 'cost' | 'docs' | 'warranty'
const COLS: { id: ColId; label: string; w: string; align: 'left' | 'right' }[] = [
  { id: 'watch', label: 'Piece', w: '2.9fr', align: 'left' },
  { id: 'last', label: 'Last serviced', w: '0.95fr', align: 'left' },
  { id: 'next', label: 'Next due', w: '1.2fr', align: 'left' },
  { id: 'interval', label: 'Interval', w: '0.65fr', align: 'left' },
  { id: 'cost', label: 'Lifetime upkeep', w: '1fr', align: 'right' },
  { id: 'docs', label: 'Papers', w: '0.8fr', align: 'left' },
  { id: 'warranty', label: 'Warranty', w: '1.1fr', align: 'left' },
]
const gridTemplate = COLS.map(c => c.w).join(' ') + ' 28px'

function sortValue(sw: ServiceWatch, key: ColId, now: Date): number | string {
  switch (key) {
    case 'watch': return (sw.watch.brand + sw.watch.model).toLowerCase()
    case 'last': { const l = lastAnyService(sw); return l ? new Date(`${l.serviceDate}T12:00:00`).getTime() : 0 }
    case 'next': return serviceStatus(sw, now).due.getTime()
    case 'interval': return sw.intervalYears
    case 'cost': return lifetimeCostCents(sw)
    case 'docs': return sw.documents.length
    case 'warranty': { const ws = warrantyStatus(sw, now); return ws ? new Date(`${ws.date}T12:00:00`).getTime() : -1 }
    default: return 0
  }
}

export function HubLedger({ watches, now, onPick, onLog, activeId, isMobile }: LayoutProps) {
  const [sort, setSort] = useState<{ key: ColId; dir: 1 | -1 }>({ key: 'next', dir: 1 })
  const rows = [...watches].sort((a, b) => {
    const va = sortValue(a, sort.key, now), vb = sortValue(b, sort.key, now)
    return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir
  })
  const totalCost = watches.reduce((s, w) => s + lifetimeCostCents(w), 0)
  const totalDocs = watches.reduce((s, w) => s + w.documents.length, 0)
  const toggleSort = (key: ColId) => setSort(s => s.key === key ? { key, dir: (-s.dir) as 1 | -1 } : { key, dir: 1 })

  // ── Mobile: stacked status-bordered cards + native <select> sort ─────────
  if (isMobile) {
    return (
      <div>
        <SectionHead eyebrow="The file cabinet" title="Every piece, on the record" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted }}>Sort</span>
          <select
            value={sort.key}
            onChange={e => setSort({ key: e.target.value as ColId, dir: 1 })}
            style={{ fontFamily: sans, fontSize: 15, color: brand.colors.ink, background: brand.colors.white, border: `1px solid ${brand.colors.borderLight}`, borderRadius: brand.radius.md, padding: '8px 11px', flex: 1, outline: 'none' }}
          >
            <option value="next">Next due</option>
            <option value="last">Last serviced</option>
            <option value="cost">Lifetime upkeep</option>
            <option value="interval">Interval</option>
            <option value="docs">Papers on file</option>
            <option value="watch">Brand &amp; model</option>
          </select>
          <button type="button" onClick={() => setSort(s => ({ ...s, dir: (-s.dir) as 1 | -1 }))} title="Reverse order" aria-label="Reverse sort order" style={{ ...iconBtn, width: 40, height: 40 }}>
            <span style={{ fontSize: 11, color: brand.colors.muted, transform: sort.dir < 0 ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▾</span>
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map(sw => {
            const st = serviceStatus(sw, now)
            const la = lastAnyService(sw)
            const ws = warrantyStatus(sw, now)
            return (
              <div key={sw.watch.id} onClick={() => onPick(sw)} style={{
                background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderLeft: `3px solid ${st.dot}`,
                borderRadius: brand.radius.lg, padding: 14, cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 48, height: 48, flexShrink: 0 }}><WatchShot watch={sw.watch} size={48} shadow="0 4px 8px rgba(26,20,16,0.18)" /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: brand.colors.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sw.watch.brand}</div>
                    <div style={{ fontFamily: serif, fontSize: 15, color: brand.colors.muted, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sw.watch.model}</div>
                  </div>
                  <StatusChip status={st} size="sm" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px', margin: '13px 0', paddingTop: 13, borderTop: `1px solid ${brand.colors.border}` }}>
                  <LedgerCell label="Last serviced" value={la ? formatMonthYear(la.serviceDate) : '—'} sub={la ? serviceTypeMeta(la.serviceType).label : undefined} />
                  <LedgerCell label="Next due" value={formatMonthYear(st.due)} accent={st.fg} />
                  <LedgerCell label="Lifetime upkeep" value={formatCost(lifetimeCostCents(sw))} />
                  <LedgerCell label="Warranty" value={ws ? (ws.key === 'expired' ? 'Expired' : formatMonthYear(ws.date)) : '—'} accent={ws ? ws.fg : brand.colors.muted} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: brand.colors.muted }}>
                    <Icon name="doc" size={14} color={brand.colors.muted} />
                    <span style={{ fontFamily: sans, fontSize: 14, color: brand.colors.ink }}>{sw.documents.length} on file</span>
                    {sw.watch.hasPapers === false && <span style={{ fontFamily: sans, fontSize: 11, color: brand.serviceStatus.due.fg, background: brand.serviceStatus.due.bg, padding: '1px 7px', borderRadius: 10 }}>no papers</span>}
                  </span>
                  <button type="button" onClick={e => { e.stopPropagation(); onLog(sw) }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', padding: '8px 14px', background: 'transparent', color: brand.colors.ink, border: `1px solid ${brand.colors.borderLight}`, borderRadius: brand.radius.btn, cursor: 'pointer' }}>
                    <Icon name="plus" size={13} color={brand.colors.ink} />Log
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, padding: '14px 16px', background: brand.colors.bg, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg }}>
          <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: brand.colors.ink }}>{watches.length} piece{watches.length === 1 ? '' : 's'} · {totalDocs} docs</span>
          <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, color: brand.colors.goldDeep }}>{formatCost(totalCost)}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionHead eyebrow="The file cabinet" title="Every piece, on the record" />
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 760, background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.xl, overflow: 'hidden' }}>
          {/* header */}
          <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: 14, alignItems: 'center', padding: '13px 20px', borderBottom: `1px solid ${brand.colors.border}`, background: brand.colors.bg }}>
            {COLS.map(c => (
              <button key={c.id} type="button" onClick={() => toggleSort(c.id)} style={{
                display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
                fontFamily: sans, fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: sort.key === c.id ? brand.colors.ink : brand.colors.muted,
              }}>
                {c.label}
                <span style={{ opacity: sort.key === c.id ? 1 : 0.25, fontSize: 8, transform: sort.key === c.id && sort.dir < 0 ? 'rotate(180deg)' : 'none' }}>▾</span>
              </button>
            ))}
            <span />
          </div>

          {/* rows */}
          {rows.map((sw, i) => {
            const st = serviceStatus(sw, now)
            const la = lastAnyService(sw)
            const ws = warrantyStatus(sw, now)
            const active = activeId === sw.watch.id
            return (
              <div key={sw.watch.id} onClick={() => onPick(sw)} style={{
                display: 'grid', gridTemplateColumns: gridTemplate, gap: 14, alignItems: 'center',
                padding: '14px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${brand.colors.border}` : 'none',
                cursor: 'pointer', background: active ? brand.colors.goldWash : brand.colors.white, transition: 'background 0.12s ease',
              }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = brand.colors.slot }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = brand.colors.white }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <span style={{ width: 56, height: 56, flexShrink: 0 }}><WatchShot watch={sw.watch} size={56} shadow="0 4px 9px rgba(26,20,16,0.18)" /></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: brand.colors.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sw.watch.brand}</div>
                    <div style={{ fontFamily: serif, fontSize: 15, color: brand.colors.muted, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sw.watch.model}</div>
                  </div>
                </div>
                <div style={{ fontFamily: sans, fontSize: 14, color: la ? brand.colors.ink : brand.colors.muted }}>
                  {la ? <>{formatMonthYear(la.serviceDate)}<div style={{ fontSize: 12, color: brand.colors.muted }}>{serviceTypeMeta(la.serviceType).label}</div></> : '—'}
                </div>
                <div><StatusChip status={st} size="sm" showDate /></div>
                <div style={{ fontFamily: sans, fontSize: 14, color: brand.colors.ink }}>{sw.intervalYears} yr</div>
                <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: brand.colors.ink, textAlign: 'right' }}>{formatCost(lifetimeCostCents(sw))}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: brand.colors.muted }}>
                  <Icon name="doc" size={14} color={brand.colors.muted} />
                  <span style={{ fontFamily: sans, fontSize: 14, color: brand.colors.ink }}>{sw.documents.length}</span>
                  {sw.watch.hasPapers === false && <span title="Missing original papers" style={{ fontFamily: sans, fontSize: 11, color: brand.serviceStatus.due.fg, background: brand.serviceStatus.due.bg, padding: '1px 6px', borderRadius: 10 }}>no papers</span>}
                </div>
                <div>
                  {ws ? <span style={{ fontFamily: sans, fontSize: 12, color: ws.fg, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 6, background: ws.fg, opacity: 0.7 }} />
                    {ws.key === 'expired' ? 'Expired' : formatMonthYear(ws.date)}
                  </span> : <span style={{ color: brand.colors.muted, fontSize: 12 }}>—</span>}
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); onLog(sw) }} title="Log a service" style={{ ...iconBtn, width: 26, height: 26 }}>
                  <Icon name="plus" size={13} color={brand.colors.muted} />
                </button>
              </div>
            )
          })}

          {/* totals */}
          <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: 14, alignItems: 'center', padding: '14px 20px', borderTop: `1.5px solid ${brand.colors.borderLight}`, background: brand.colors.bg }}>
            <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: brand.colors.ink }}>{watches.length} piece{watches.length === 1 ? '' : 's'}</div>
            <div /><div /><div />
            <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: brand.colors.goldDeep, textAlign: 'right' }}>{formatCost(totalCost)}</div>
            <div style={{ fontFamily: sans, fontSize: 14, color: brand.colors.muted }}>{totalDocs} docs</div>
            <div /><div />
          </div>
        </div>
      </div>
    </div>
  )
}

function LedgerCell({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div>
      <span style={{ display: 'block', marginBottom: 3, fontFamily: sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted }}>{label}</span>
      <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: accent ?? brand.colors.ink }}>{value}</span>
      {sub && <div style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}
