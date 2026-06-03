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

export function HubLedger({ watches, now, onPick, onLog, activeId }: LayoutProps) {
  const [sort, setSort] = useState<{ key: ColId; dir: 1 | -1 }>({ key: 'next', dir: 1 })
  const rows = [...watches].sort((a, b) => {
    const va = sortValue(a, sort.key, now), vb = sortValue(b, sort.key, now)
    return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir
  })
  const totalCost = watches.reduce((s, w) => s + lifetimeCostCents(w), 0)
  const totalDocs = watches.reduce((s, w) => s + w.documents.length, 0)
  const toggleSort = (key: ColId) => setSort(s => s.key === key ? { key, dir: (-s.dir) as 1 | -1 } : { key, dir: 1 })

  return (
    <div>
      <SectionHead eyebrow="The file cabinet" title="Every piece, on the record" hint="Sort any column · click a row to open the dossier" />
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 760, background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.xl, overflow: 'hidden' }}>
          {/* header */}
          <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: 14, alignItems: 'center', padding: '13px 20px', borderBottom: `1px solid ${brand.colors.border}`, background: brand.colors.bg }}>
            {COLS.map(c => (
              <button key={c.id} type="button" onClick={() => toggleSort(c.id)} style={{
                display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
                fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
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
                    <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: brand.colors.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sw.watch.brand}</div>
                    <div style={{ fontFamily: serif, fontSize: 15, color: brand.colors.muted, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sw.watch.model}</div>
                  </div>
                </div>
                <div style={{ fontFamily: sans, fontSize: 12.5, color: la ? brand.colors.ink : brand.colors.muted }}>
                  {la ? <>{formatMonthYear(la.serviceDate)}<div style={{ fontSize: 10.5, color: brand.colors.muted }}>{serviceTypeMeta(la.serviceType).label}</div></> : '—'}
                </div>
                <div><StatusChip status={st} size="sm" showDate /></div>
                <div style={{ fontFamily: sans, fontSize: 12.5, color: brand.colors.ink }}>{sw.intervalYears} yr</div>
                <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: brand.colors.ink, textAlign: 'right' }}>{formatCost(lifetimeCostCents(sw))}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: brand.colors.muted }}>
                  <Icon name="doc" size={14} color={brand.colors.muted} />
                  <span style={{ fontFamily: sans, fontSize: 12.5, color: brand.colors.ink }}>{sw.documents.length}</span>
                  {sw.watch.hasPapers === false && <span title="Missing original papers" style={{ fontFamily: sans, fontSize: 9.5, color: brand.serviceStatus.due.fg, background: brand.serviceStatus.due.bg, padding: '1px 6px', borderRadius: 10 }}>no papers</span>}
                </div>
                <div>
                  {ws ? <span style={{ fontFamily: sans, fontSize: 11.5, color: ws.fg, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
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
            <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: brand.colors.gold, textAlign: 'right' }}>{formatCost(totalCost)}</div>
            <div style={{ fontFamily: sans, fontSize: 12.5, color: brand.colors.muted }}>{totalDocs} docs</div>
            <div /><div />
          </div>
        </div>
      </div>
    </div>
  )
}
