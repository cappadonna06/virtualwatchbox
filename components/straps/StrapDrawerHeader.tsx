'use client'

import Link from 'next/link'
import { brand } from '@/lib/brand'
import { StrapIcon } from './atoms'

function Stat({ value, label, valueSize = 22, labelSize = 12 }: { value: number; label: string; valueSize?: number; labelSize?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }}>
      <span style={{ fontFamily: brand.font.serif, fontSize: valueSize, fontWeight: 500, color: brand.colors.ink, lineHeight: 1 }}>{value}</span>
      <span style={{ fontFamily: brand.font.sans, fontSize: labelSize, color: brand.colors.muted }}>{label}</span>
    </div>
  )
}

function Dot() {
  return <span style={{ width: 3, height: 3, borderRadius: '50%', background: brand.colors.borderLight, flexShrink: 0 }} />
}

export function StrapDrawerHeader({
  strapCount,
  compatibleWatchCount,
  comboCount,
  onAdd,
}: {
  strapCount: number
  compatibleWatchCount: number
  comboCount: number
  onAdd: () => void
}) {
  return (
    <div style={{ paddingTop: 8 }}>
      <Link
        href="/collection"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: brand.font.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: brand.colors.muted, textDecoration: 'none', marginBottom: 12, transition: `color ${brand.transition.fast}` }}
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 10H4" /><path d="M9 5l-5 5 5 5" /></svg>
        Collection
      </Link>

      {/* Title — desktop (single line, matches mobile copy) */}
      <div className="sd-head-d">
        <h1 style={{ fontFamily: brand.font.serif, fontSize: 54, fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em', color: brand.colors.ink, margin: 0, whiteSpace: 'nowrap' }}>The Strap Drawer</h1>
      </div>
      {/* Title — mobile is a single line, no eyebrow */}
      <h1 className="sd-head-m" style={{ fontFamily: brand.font.serif, fontSize: 34, fontWeight: 300, lineHeight: 1.04, letterSpacing: '-0.01em', color: brand.colors.ink, margin: 0 }}>The Strap Drawer</h1>

      {/* Toolbar row: Add Strap + stats on one line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 18 }}>
        {/* Desktop: dark primary button */}
        <button onClick={onAdd} className="sd-add-d" style={{
          alignItems: 'center', gap: 8, fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500,
          letterSpacing: '0.1em', textTransform: 'uppercase', padding: '11px 20px', background: brand.colors.ink, color: brand.colors.slot,
          border: 'none', borderRadius: brand.radius.btn, cursor: 'pointer',
        }}>
          <StrapIcon name="plus" size={14} /> Add Strap
        </button>
        {/* Mobile: outline pill */}
        <button onClick={onAdd} className="sd-add-m" style={{
          alignItems: 'center', gap: 8, fontFamily: brand.font.sans, fontSize: 14, fontWeight: 500,
          padding: '11px 16px', background: brand.colors.slot, color: brand.colors.ink,
          border: `1px solid ${brand.colors.borderLight}`, borderRadius: 9, cursor: 'pointer',
        }}>
          <StrapIcon name="plus" size={15} color={brand.colors.gold} sw={2} /> Add Strap
        </button>

        {strapCount > 0 && (
          <>
            {/* Desktop: full stats pill */}
            <div className="sd-stats-d" style={{
              alignItems: 'center', gap: 14, flexWrap: 'wrap',
              background: brand.colors.slot, border: `1px solid ${brand.colors.borderMid}`, borderRadius: brand.radius.lg,
              padding: '13px 22px', boxShadow: brand.shadow.xs, width: 'fit-content',
            }}>
              <Stat value={strapCount} label={strapCount === 1 ? 'strap' : 'straps'} />
              <Dot />
              <Stat value={compatibleWatchCount} label="compatible watches" />
              <Dot />
              <Stat value={comboCount} label="combinations" />
            </div>
            {/* Mobile: light inline stats, pushed right */}
            <div className="sd-stats-m" style={{ marginLeft: 'auto', alignItems: 'baseline', gap: 8, whiteSpace: 'nowrap' }}>
              <Stat value={strapCount} label={strapCount === 1 ? 'strap' : 'straps'} valueSize={17} labelSize={12} />
              <Dot />
              <Stat value={comboCount} label="combinations" valueSize={17} labelSize={12} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
