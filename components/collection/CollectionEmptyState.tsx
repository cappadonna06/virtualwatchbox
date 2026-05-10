'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { brand } from '@/lib/brand'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { useIsMobile } from './useResponsiveState'

interface Props {
  variant: 'home' | 'collection'
}

const PREVIEW_GAP = 5

export default function CollectionEmptyState({ variant }: Props) {
  if (variant === 'home') {
    return <HomeEmptyState />
  }
  return <CollectionCaptionStrip />
}

function HomeEmptyState() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { watchboxConfig } = useCollectionSession()
  const [hovered, setHovered] = useState(false)

  const slotConfig = SLOT_COUNTS.find(s => s.n === watchboxConfig.slotCount) ?? SLOT_COUNTS[1]
  const frame = FRAMES.find(item => item.id === watchboxConfig.frame) ?? FRAMES[0]
  const lining = LININGS.find(item => item.id === watchboxConfig.lining) ?? LININGS[0]
  const slotWidth = isMobile ? 64 : 120
  const slotHeight = Math.round((slotWidth * 4) / 3)

  function handleAdd() {
    router.push('/collection/add')
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '8px 16px 0',
      }}
    >
      <button
        type="button"
        aria-label="Add your first watch"
        onClick={handleAdd}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          marginBottom: isMobile ? 24 : 36,
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: `transform ${brand.transition.base}`,
        }}
      >
        <div
          style={{
            borderRadius: brand.radius.lg,
            padding: '12px 12px 14px',
            background: frame.css,
            boxShadow: hovered
              ? '0 14px 40px rgba(26,20,16,0.18), 0 2px 6px rgba(26,20,16,0.08)'
              : frame.shadow,
            transition: `box-shadow ${brand.transition.base}`,
          }}
        >
          <div
            style={{
              background: lining.color,
              borderRadius: 5,
              padding: 7,
              boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${slotConfig.cols}, ${slotWidth}px)`,
                gap: PREVIEW_GAP,
              }}
            >
              {Array.from({ length: slotConfig.n }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    width: slotWidth,
                    height: slotHeight,
                    borderRadius: 3,
                    background: lining.slotBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {index === 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: isMobile ? 4 : 6,
                        color: hovered ? 'rgba(250,248,244,0.92)' : 'rgba(250,248,244,0.6)',
                        transition: `color ${brand.transition.base}`,
                      }}
                    >
                      <svg
                        width={isMobile ? 16 : 22}
                        height={isMobile ? 16 : 22}
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <line x1="7" y1="3" x2="7" y2="11" />
                        <line x1="3" y1="7" x2="11" y2="7" />
                      </svg>
                      <span
                        style={{
                          fontFamily: brand.font.sans,
                          fontSize: isMobile ? 7.5 : 9,
                          fontWeight: 600,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Add
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </button>

      <h3
        style={{
          fontFamily: brand.font.serif,
          fontSize: 30,
          fontWeight: 400,
          lineHeight: 1.15,
          color: brand.colors.ink,
          margin: '0 0 10px',
          letterSpacing: '0.005em',
        }}
      >
        Your watchbox, on every device.
      </h3>

      <p
        style={{
          fontFamily: brand.font.sans,
          fontSize: 13,
          color: brand.colors.muted,
          margin: '0 0 24px',
          lineHeight: 1.55,
          maxWidth: 420,
        }}
      >
        Add a watch to open the box. Sign in any time to sync, share, and own your watchbox.
      </p>

      <button
        onClick={handleAdd}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: brand.font.sans,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '11px 26px 11px 22px',
          background: brand.colors.ink,
          color: brand.colors.bg,
          border: 'none',
          borderRadius: brand.radius.btn,
          cursor: 'pointer',
          marginBottom: 14,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <line x1="7" y1="2.5" x2="7" y2="11.5" />
          <line x1="2.5" y1="7" x2="11.5" y2="7" />
        </svg>
        Add Your First Watch
      </button>

      <Link
        href="/playground"
        style={{
          fontFamily: brand.font.sans,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: brand.colors.muted,
          textDecoration: 'none',
        }}
      >
        Build a dream box first →
      </Link>
    </div>
  )
}

function CollectionCaptionStrip() {
  return (
    <div
      style={{
        marginTop: 18,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Link
        href="/playground"
        style={{
          fontFamily: brand.font.sans,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: brand.colors.muted,
          textDecoration: 'none',
        }}
      >
        Want to play before committing? Build a dream box first →
      </Link>
    </div>
  )
}
