'use client'

import { brand } from '@/lib/brand'

type Props = {
  personalized: boolean
  bylineRight: string
  bylineLeft: string
  insightRead: string
}

export default function HeroMasthead({ personalized, bylineRight, bylineLeft, insightRead }: Props) {
  return (
    <>
      {/* Desktop: light editorial hero */}
      <div className="discover-hero-desktop" style={{ background: brand.colors.bg }}>
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '40px 56px 56px',
          }}
        >
          <div
            className="discover-masthead"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 28,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Kicker color={brand.colors.ink} size={9.5}>Discover</Kicker>
              <span style={{ color: brand.colors.borderMid, fontSize: 10 }}>—</span>
              <Kicker color={brand.colors.muted} size={9.5}>{bylineLeft}</Kicker>
            </div>
            <Kicker color={brand.colors.muted} size={9.5}>{bylineRight}</Kicker>
          </div>

          <h1
            className="discover-hero-h1"
            style={{
              fontFamily: brand.font.serif,
              fontWeight: 300,
              fontSize: 72,
              lineHeight: 1,
              letterSpacing: '-0.022em',
              margin: 0,
              marginBottom: 20,
              color: brand.colors.ink,
            }}
          >
            Your next move.
          </h1>

          <p
            className="discover-hero-sub"
            style={{
              fontFamily: brand.font.serif,
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: 20,
              lineHeight: 1.5,
              color: brand.colors.mutedDark,
              margin: 0,
              maxWidth: 640,
              textWrap: 'pretty',
            }}
          >
            {personalized ? (
              <>
                Your collection reads <em style={{ fontStyle: 'italic' }}>{insightRead.toLowerCase()}</em>. Recommendations, upgrades, and reads shaped around what it&rsquo;s missing.
              </>
            ) : (
              <>Recommendations, upgrades, and reads for any thoughtful collector. Sign in to make these your own.</>
            )}
          </p>
        </div>
      </div>

      {/* Mobile: dark hero matching collection-page header pattern */}
      <div
        className="discover-mobile-hero"
        style={{
          display: 'none',
          background: '#1e1b16',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px 20px' }}>
          <h1
            style={{
              fontFamily: brand.font.serif,
              fontSize: 48,
              fontWeight: 400,
              lineHeight: 1.08,
              color: brand.colors.slot,
              margin: 0,
            }}
          >
            Discover
          </h1>
          <p
            style={{
              fontFamily: brand.font.sans,
              fontSize: 14,
              color: 'rgba(250,248,244,0.55)',
              margin: '6px 0 0',
              letterSpacing: '0.02em',
            }}
          >
            {personalized ? (
              <>Recommendations shaped around your collection.</>
            ) : (
              <>Recommendations for any thoughtful collector.</>
            )}
          </p>
        </div>
      </div>
    </>
  )
}

function Kicker({ children, color, size = 10 }: { children: React.ReactNode; color: string; size?: number }) {
  return (
    <div
      style={{
        fontFamily: brand.font.sans,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color,
      }}
    >
      {children}
    </div>
  )
}
