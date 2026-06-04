'use client'

import Link from 'next/link'
import { brand } from '@/lib/brand'
import { StrapIcon } from './atoms'

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, whiteSpace: 'nowrap' }}>
      <span style={{ fontFamily: brand.font.serif, fontSize: 22, fontWeight: 500, color: brand.colors.ink, lineHeight: 1 }}>{value}</span>
      <span style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>{label}</span>
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
      {/* Sub-tab: Watches | Straps */}
      <div style={{ display: 'inline-flex', gap: 2, marginBottom: 18, padding: 3, background: brand.colors.slot, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg }}>
        <Link href="/collection" style={{
          fontFamily: brand.font.sans, fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: brand.radius.sm,
          textDecoration: 'none', background: 'transparent', color: brand.colors.muted, transition: `all ${brand.transition.fast}`,
        }}>Watches</Link>
        <span style={{
          fontFamily: brand.font.sans, fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: brand.radius.sm,
          background: brand.colors.ink, color: brand.colors.slot,
        }}>Straps</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <Link href="/collection" style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: brand.colors.muted, textDecoration: 'none', display: 'inline-block', marginBottom: 10 }}>← Collection</Link>
          <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: brand.colors.gold, marginBottom: 6 }}>The Strap Drawer</div>
          <h1 style={{ fontFamily: brand.font.serif, fontSize: 54, fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em', color: brand.colors.ink, margin: 0, whiteSpace: 'nowrap' }}>Strap Drawer</h1>
        </div>
        <button onClick={onAdd} className="sd-header-addbtn" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500,
          letterSpacing: '0.1em', textTransform: 'uppercase', padding: '11px 20px', background: brand.colors.ink, color: brand.colors.slot,
          border: 'none', borderRadius: brand.radius.btn, cursor: 'pointer',
        }}>
          <StrapIcon name="plus" size={14} /> Add Strap
        </button>
      </div>

      {strapCount > 0 && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          background: brand.colors.slot, border: `1px solid ${brand.colors.borderMid}`, borderRadius: brand.radius.lg,
          padding: '13px 22px', boxShadow: brand.shadow.xs, width: 'fit-content',
        }}>
          <Stat value={strapCount} label={strapCount === 1 ? 'strap' : 'straps'} />
          <Dot />
          <Stat value={compatibleWatchCount} label="compatible watches" />
          <Dot />
          <Stat value={comboCount} label="combinations" />
        </div>
      )}
    </div>
  )
}
