'use client'

import { useState } from 'react'
import { brand } from '@/lib/brand'
import { usePrefersReducedMotion } from '@/components/collection/useResponsiveState'

const items = [
  { ref: 'Rolex Sub 126610LN', val: '$14,200', dir: 'up' },
  { ref: 'AP Royal Oak 15500ST', val: '$28,500', dir: 'down' },
  { ref: 'Patek 5711/1A', val: '$65,000', dir: 'up' },
  { ref: 'IWC Pilot IW327001', val: '$6,800', dir: 'flat' },
  { ref: 'Longines Legend Diver', val: '$1,350', dir: 'up' },
  { ref: 'Omega Speedy Moonwatch', val: '$5,400', dir: 'up' },
  { ref: 'Tudor Black Bay 58', val: '$3,100', dir: 'down' },
  { ref: 'Cartier Santos M', val: '$7,200', dir: 'up' },
]

export default function Ticker() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [hovered, setHovered] = useState(false)
  const doubled = [...items, ...items]

  return (
    <section
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderTop: `1px solid ${brand.colors.border}`,
        borderBottom: `1px solid ${brand.colors.border}`,
        background: brand.colors.bg,
        padding: '12px 0 10px',
      }}
      aria-label="Market Pulse"
    >
      <div className="ticker-shell" style={{ padding: '0 56px 10px' }}>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: brand.colors.muted,
          }}
        >
          Market Pulse
        </div>
      </div>

      <div style={{ overflow: 'hidden' }}>
        <div
          className="ticker-inner"
          style={{
            display: 'flex',
            gap: '52px',
            width: 'max-content',
            animation: prefersReducedMotion ? 'none' : 'ticker 54s linear infinite',
            animationPlayState: hovered ? 'paused' : 'running',
          }}
        >
          {doubled.map((it, i) => (
            <span
              key={`${it.ref}-${i}`}
              style={{
                fontFamily: brand.font.sans,
                fontSize: 11,
                letterSpacing: '0.05em',
                color: brand.colors.muted,
                whiteSpace: 'nowrap',
              }}
            >
              <strong style={{ color: brand.colors.ink, fontWeight: 500 }}>{it.ref}</strong>
              {' · '}{it.val}
              <span style={{ color: it.dir === 'up' ? '#76966b' : it.dir === 'down' ? '#9a756f' : brand.colors.muted }}>
                {it.dir === 'up' ? ' ↑' : it.dir === 'down' ? ' ↓' : ' →'}
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
