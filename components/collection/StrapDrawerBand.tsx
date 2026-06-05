'use client'

import { useState } from 'react'
import Link from 'next/link'
import { brand } from '@/lib/brand'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import type { StrapWatchOverride, UserStrap } from '@/types/watch'
import { compatibleWatches, totalCombos } from '@/lib/strapCompatibility'
import { findTemplatePhoto } from '@/lib/strapTemplates'
import { StrapPhotoFallback } from '@/components/straps/StrapPhotoFallback'
import { strapTitle, type StrapDrawerWatch } from '@/components/straps/atoms'
import { useStrapDrawerWatches } from '@/components/straps/useStrapDrawerWatches'

// Decorative "strap spine" bar colors — art constants, not brand tokens.
const SPINE_COLORS = ['#3A2A1E', '#5A2A2E', '#1C1C1C', '#4A5236', '#6E7355']

const ArrowRight = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 10h12" /><path d="M11 5l5 5-5 5" />
  </svg>
)

function BandCard({ strap, watches, overrides, fixedWidth }: {
  strap: UserStrap
  watches: StrapDrawerWatch[]
  overrides: StrapWatchOverride[]
  fixedWidth?: number
}) {
  const [hover, setHover] = useState(false)
  const title = strapTitle(strap)
  const photo = strap.photoUrl ?? findTemplatePhoto(strap.material, strap.subMaterial, strap.color)
  const fitCount = compatibleWatches(strap, watches, overrides).length
  return (
    <Link
      href={`/collection/straps?strap=${strap.id}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: fixedWidth ? `0 0 ${fixedWidth}px` : '1 1 0', minWidth: 0, maxWidth: fixedWidth ?? 220, textDecoration: 'none', display: 'block',
        background: brand.colors.slot, border: `1px solid ${hover ? brand.colors.borderLight : brand.colors.borderMid}`,
        borderRadius: brand.radius.md, overflow: 'hidden',
        boxShadow: hover ? '0 8px 22px rgba(26,20,16,0.10)' : brand.shadow.xs,
        transform: hover ? 'translateY(-3px)' : 'none',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div style={{ aspectRatio: '4 / 5', borderBottom: `1px solid ${brand.colors.borderMid}`, overflow: 'hidden' }}>
        {photo
          ? (
            <div style={{ width: '100%', height: '100%', background: `radial-gradient(ellipse 120% 80% at 50% 30%, #FFFFFF 0%, #FBF8F2 72%, ${brand.colors.paper} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={photo} alt={title} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px 4px', transform: hover ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.3s ease' }} />
            </div>
          )
          : <StrapPhotoFallback height="100%" />}
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontFamily: brand.font.sans, fontSize: 8.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.gold, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {strap.brand || strap.color}
        </div>
        <div style={{ fontFamily: brand.font.serif, fontSize: 16, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.1, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          <span style={{ fontFamily: brand.font.sans, fontSize: 9.5, fontWeight: 500, color: brand.fit.widthBadge.text, background: brand.fit.widthBadge.bg, border: `1px solid ${brand.fit.widthBadge.border}`, borderRadius: brand.radius.btn, padding: '2px 6px', flexShrink: 0 }}>{strap.lugWidthMm} mm</span>
          <span style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted }}>Fits {fitCount}</span>
        </div>
      </div>
    </Link>
  )
}

function OpenerTile({ remaining, total, fixedWidth }: { remaining: number; total: number; fixedWidth?: number }) {
  const [hover, setHover] = useState(false)
  return (
    <Link
      href="/collection/straps"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: fixedWidth ? `0 0 ${fixedWidth}px` : '1 1 0', minWidth: 0, maxWidth: fixedWidth ?? 220, textDecoration: 'none',
        border: `1px solid ${hover ? brand.colors.gold : brand.colors.borderMid}`, borderRadius: brand.radius.md,
        background: hover ? brand.fit.widthBadge.bg : 'transparent',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 16,
        boxShadow: hover ? '0 8px 22px rgba(201,168,76,0.14)' : 'none',
        transform: hover ? 'translateY(-3px)' : 'none',
        transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s, background 0.2s',
      }}
    >
      <span style={{ display: 'flex', gap: 4, alignItems: 'center' }} aria-hidden="true">
        {SPINE_COLORS.map((c, i) => (
          <span key={i} style={{ width: 7, height: 44, borderRadius: 3, background: c, boxShadow: '0 4px 10px rgba(26,20,16,0.16), inset 0 1px 0 rgba(255,255,255,0.14)' }} />
        ))}
      </span>
      <span style={{ textAlign: 'center' }}>
        <span style={{ display: 'block', fontFamily: brand.font.serif, fontSize: 26, fontWeight: 500, color: brand.colors.ink, lineHeight: 1 }}>+{remaining}</span>
        <span style={{ display: 'block', fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.mutedDark, marginTop: 4 }}>more straps</span>
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: hover ? brand.colors.ink : brand.fit.widthBadge.text }}>
        View all {total}<ArrowRight size={12} />
      </span>
    </Link>
  )
}

function Header({ strapCount, comboCount, variant }: { strapCount: number; comboCount: number; variant: 'desktop' | 'mobile' }) {
  const [hover, setHover] = useState(false)
  const isMobile = variant === 'mobile'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: isMobile ? 12 : 24, flexWrap: 'wrap', marginBottom: isMobile ? 14 : 22 }}>
      <div>
        <div style={{ fontFamily: brand.font.sans, fontSize: isMobile ? 9 : 9.5, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: brand.colors.gold, marginBottom: isMobile ? 7 : 10 }}>Also in your collection</div>
        <h2 style={{ fontFamily: brand.font.serif, fontSize: isMobile ? 26 : 34, fontWeight: 400, lineHeight: isMobile ? 1 : 1.04, color: brand.colors.ink, margin: '0 0 8px' }}>The Strap Drawer</h2>
        {isMobile
          ? <div style={{ fontFamily: brand.font.sans, fontSize: 11.5, color: brand.colors.muted }}>{strapCount} straps · {comboCount} combinations</div>
          : <p style={{ fontFamily: brand.font.sans, fontSize: 13.5, color: brand.colors.mutedDark, lineHeight: 1.5, margin: 0, maxWidth: 440 }}>The leathers, rubbers and bracelets you swap between — and which of your watches each one fits.</p>}
      </div>
      {isMobile ? (
        <Link href="/collection/straps" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: brand.font.sans, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: brand.colors.ink, textDecoration: 'none', borderBottom: `1.5px solid ${brand.colors.gold}`, paddingBottom: 3 }}>
          Open<ArrowRight size={12} />
        </Link>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: brand.font.serif, fontSize: 22, fontWeight: 500, color: brand.colors.ink }}>{strapCount}</span>
              <span style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>straps</span>
            </span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: brand.colors.borderLight }} />
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: brand.font.serif, fontSize: 22, fontWeight: 500, color: brand.colors.ink }}>{comboCount}</span>
              <span style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>combinations</span>
            </span>
          </div>
          <Link
            href="/collection/straps"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none', fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '11px 20px', background: brand.colors.ink, color: brand.colors.bg, borderRadius: brand.radius.btn, opacity: hover ? 0.9 : 1, transition: 'opacity 0.15s' }}
          >
            Open the drawer<ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  )
}

function Promo({ variant }: { variant: 'desktop' | 'mobile' }) {
  const isMobile = variant === 'mobile'
  return (
    <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
      <div>
        <div style={{ fontFamily: brand.font.sans, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: brand.colors.gold, marginBottom: isMobile ? 7 : 10 }}>Also in your collection</div>
        <h2 style={{ fontFamily: brand.font.serif, fontSize: isMobile ? 26 : 34, fontWeight: 400, lineHeight: 1.04, color: brand.colors.ink, margin: '0 0 8px' }}>The Strap Drawer</h2>
        <p style={{ fontFamily: brand.font.sans, fontSize: isMobile ? 12.5 : 13.5, color: brand.colors.mutedDark, lineHeight: 1.55, margin: 0, maxWidth: 440 }}>
          Track the leathers, rubbers, NATOs and bracelets you swap between — we&rsquo;ll tell you which of your watches each one fits.
        </p>
      </div>
      <Link href="/collection/straps" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none', fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '11px 20px', background: brand.colors.ink, color: brand.colors.bg, borderRadius: brand.radius.btn }}>
        + Start your Strap Drawer<ArrowRight size={14} />
      </Link>
    </div>
  )
}

export default function StrapDrawerBand({ variant }: { variant: 'desktop' | 'mobile' }) {
  const { straps, strapOverrides } = useCollectionSession()
  const watches = useStrapDrawerWatches()
  const isMobile = variant === 'mobile'

  const wrapperStyle: React.CSSProperties = {
    marginTop: isMobile ? 28 : 64,
    paddingTop: isMobile ? 24 : 40,
    borderTop: `1px solid ${brand.colors.border}`,
  }

  if (straps.length === 0) {
    return <div style={wrapperStyle}><Promo variant={variant} /></div>
  }

  const featured = [...straps].sort((a, b) => b.sortOrder - a.sortOrder).slice(0, 5)
  const remaining = straps.length - featured.length
  const comboCount = totalCombos(watches, straps, strapOverrides)

  return (
    <div style={wrapperStyle}>
      <Header strapCount={straps.length} comboCount={comboCount} variant={variant} />
      {isMobile ? (
        <div className="mc-band-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {featured.map(s => <BandCard key={s.id} strap={s} watches={watches} overrides={strapOverrides} fixedWidth={140} />)}
          {remaining > 0 && <OpenerTile remaining={remaining} total={straps.length} fixedWidth={116} />}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16 }}>
          {featured.map(s => <BandCard key={s.id} strap={s} watches={watches} overrides={strapOverrides} />)}
          {remaining > 0 && <OpenerTile remaining={remaining} total={straps.length} />}
        </div>
      )}
    </div>
  )
}
