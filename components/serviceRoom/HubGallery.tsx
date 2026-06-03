'use client'

// components/serviceRoom/HubGallery.tsx — editorial maintenance card per piece,
// ordered by what needs attention first.

import { brand } from '@/lib/brand'
import {
  byAttention, formatCost, formatDate, lastFullService, lifetimeCostCents,
  serviceStatus, warrantyStatus, type ServiceWatch,
} from '@/lib/serviceRoom/derive'
import {
  Icon, Meta, SectionHead, StatusChip, WarrantyChip, WatchShot,
  btnPrimary, btnSecondary,
} from '@/components/serviceRoom/primitives'
import type { LayoutProps } from '@/components/serviceRoom/layoutTypes'

const sans = brand.font.sans
const serif = brand.font.serif

function Field({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <Meta style={{ display: 'block', marginBottom: 4, fontSize: 9 }}>{label}</Meta>
      <span style={{ fontFamily: sans, fontSize: 13.5, fontWeight: 600, color: accent ?? brand.colors.ink }}>{value}</span>
    </div>
  )
}

function GalleryCard({ sw, now, onPick, onLog, active }: { sw: ServiceWatch; now: Date; onPick: (sw: ServiceWatch) => void; onLog: (sw: ServiceWatch) => void; active: boolean }) {
  const st = serviceStatus(sw, now)
  const ws = warrantyStatus(sw, now)
  const lf = lastFullService(sw)
  const docs = sw.documents.length

  return (
    <div onClick={() => onPick(sw)} style={{
      background: brand.colors.white, border: `1px solid ${active ? brand.colors.gold : brand.colors.border}`,
      borderRadius: 14, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column',
      boxShadow: active ? brand.shadow.gold : brand.shadow.xs,
      transition: `box-shadow ${brand.transition.base}, border-color ${brand.transition.base}, transform ${brand.transition.base}`,
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = brand.shadow.md }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = active ? brand.shadow.gold : brand.shadow.xs }}>

      <div style={{ position: 'relative', background: brand.colors.bg, padding: '22px 22px 16px', borderBottom: `1px solid ${brand.colors.border}` }}>
        <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 1 }}><StatusChip status={st} size="sm" /></div>
        {ws && <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 1 }}><WarrantyChip warranty={ws} size="sm" /></div>}
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WatchShot watch={sw.watch} size={180} shadow="0 12px 22px rgba(26,20,16,0.2)" />
        </div>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Meta>{sw.watch.brand}</Meta>
          <div style={{ fontFamily: serif, fontSize: 23, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.08 }}>{sw.watch.model}</div>
          <span style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted }}>Ref. {sw.watch.reference} · {sw.watch.caseSizeMm}mm</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', padding: '14px 0', borderTop: `1px solid ${brand.colors.border}`, borderBottom: `1px solid ${brand.colors.border}` }}>
          <Field label="Last full service" value={lf ? formatDate(lf.serviceDate, { year: 'numeric', month: 'short' }) : 'Never'} />
          <Field label="Next due" value={formatDate(st.due, { year: 'numeric', month: 'short' })} accent={st.fg} />
          <Field label="Lifetime upkeep" value={formatCost(lifetimeCostCents(sw))} />
          <Field label="On file" value={`${docs} document${docs === 1 ? '' : 's'}`} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <button type="button" onClick={e => { e.stopPropagation(); onLog(sw) }} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>
            <Icon name="plus" size={13} color={brand.colors.slot} />Log a service
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); onPick(sw) }} style={{ ...btnSecondary, justifyContent: 'center' }}>Dossier</button>
        </div>
      </div>
    </div>
  )
}

export function HubGallery({ watches, now, onPick, onLog, activeId }: LayoutProps) {
  const sorted = [...watches].sort((a, b) => byAttention(a, b, now))
  const noun = watches.length === 1 ? 'piece' : 'pieces'
  return (
    <div>
      <SectionHead eyebrow="The collection" title={`${watches.length} ${noun} under care`} hint="Ordered by what needs attention first" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
        {sorted.map(sw => <GalleryCard key={sw.watch.id} sw={sw} now={now} onPick={onPick} onLog={onLog} active={activeId === sw.watch.id} />)}
      </div>
    </div>
  )
}
