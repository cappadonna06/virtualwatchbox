'use client'

import Link from 'next/link'
import { brand } from '@/lib/brand'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { compatibleStraps, totalCombos } from '@/lib/strapCompatibility'
import { deriveSwatchId } from '@/lib/strapDrawer/constants'
import { StrapSwatch } from '@/components/straps/StrapSwatch'
import { strapTitle } from '@/components/straps/atoms'
import { useStrapDrawerWatches } from '@/components/straps/useStrapDrawerWatches'

const openBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: brand.font.sans,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  padding: '10px 18px',
  background: brand.colors.ink,
  color: brand.colors.slot,
  border: 'none',
  borderRadius: brand.radius.btn,
  textDecoration: 'none',
  cursor: 'pointer',
  flexShrink: 0,
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }}>
      <span style={{ fontFamily: brand.font.serif, fontSize: 24, fontWeight: 500, color: brand.colors.ink, lineHeight: 1 }}>{value}</span>
      <span style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>{label}</span>
    </span>
  )
}

function Dot() {
  return <span style={{ width: 3, height: 3, borderRadius: '50%', background: brand.colors.borderLight, flexShrink: 0 }} />
}

export default function StrapDrawerSummary() {
  const { straps, strapOverrides } = useCollectionSession()
  const watches = useStrapDrawerWatches()

  const kicker = (
    <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: brand.colors.gold, marginBottom: 10 }}>
      The Strap Drawer
    </div>
  )

  if (straps.length === 0) {
    return (
      <div>
        {kicker}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
          <p style={{ fontFamily: brand.font.sans, fontSize: 13, lineHeight: 1.6, color: brand.colors.mutedDark, margin: 0, maxWidth: 460 }}>
            Track the leathers, rubbers, NATOs and bracelets you swap between — we&rsquo;ll tell you which of your watches each one fits.
          </p>
          <Link href="/collection/straps" style={openBtn}>+ Start your Strap Drawer →</Link>
        </div>
      </div>
    )
  }

  const compatibleWatchCount = watches.filter(w => compatibleStraps(w, straps, strapOverrides).length > 0).length
  const comboCount = totalCombos(watches, straps, strapOverrides)
  const previews = straps.slice(0, 5)

  return (
    <div>
      {kicker}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <Stat value={straps.length} label={straps.length === 1 ? 'strap' : 'straps'} />
            <Dot />
            <Stat value={compatibleWatchCount} label="compatible watches" />
            <Dot />
            <Stat value={comboCount} label="combinations" />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {previews.map(s => (
              <div key={s.id} title={strapTitle(s)} style={{ width: 44, height: 56, borderRadius: brand.radius.sm, overflow: 'hidden', border: `1px solid ${brand.colors.borderMid}`, flexShrink: 0 }}>
                {s.photoUrl
                  ? <div style={{ width: '100%', height: '100%', background: brand.colors.paperWarm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={s.photoUrl} alt={strapTitle(s)} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} /></div>
                  : <StrapSwatch swatchId={deriveSwatchId(s.material, s.subMaterial, s.color)} material={s.material} height={56} bandWidth="42%" />}
              </div>
            ))}
          </div>
        </div>

        <Link href="/collection/straps" style={openBtn}>Open Strap Drawer →</Link>
      </div>
    </div>
  )
}
