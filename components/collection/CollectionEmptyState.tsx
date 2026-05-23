'use client'

import { useLayoutEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { brand } from '@/lib/brand'
import { SLOT_COUNTS, watchboxSlotPadding } from '@/lib/frameConfig'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { useIsMobile } from './useResponsiveState'
import WatchBox from './WatchBox'

interface Props {
  variant: 'home' | 'collection'
}

const ROWS = 2

function calcSlotPx(
  containerWidth: number,
  maxHeight: number,
  columns: number,
  widthPadding: number,
  heightPadding: number,
  gap: number,
) {
  const slotFromWidth = (containerWidth - widthPadding - (columns - 1) * gap) / columns
  const slotFromHeight = ((maxHeight - heightPadding) * 3) / (4 * ROWS)
  return Math.max(16, Math.min(slotFromWidth, slotFromHeight))
}

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
  const [screenWidth, setScreenWidth] = useState(0)

  useLayoutEffect(() => {
    const update = () => setScreenWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const slotConfig = SLOT_COUNTS.find(s => s.n === watchboxConfig.slotCount) ?? SLOT_COUNTS[1]
  const containerWidth = isMobile
    ? Math.max(200, screenWidth - 40)
    : Math.max(200, screenWidth - 444)
  const maxHeight = isMobile ? 300 : 480
  const slotPad = watchboxSlotPadding(isMobile)
  const slotWidth = screenWidth > 0
    ? Math.floor(calcSlotPx(containerWidth, maxHeight, slotConfig.cols, slotPad.widthPadding, slotPad.heightPadding, slotPad.gap))
    : undefined
  const boxWidth = slotWidth !== undefined
    ? slotPad.widthPadding + (slotConfig.cols - 1) * slotPad.gap + slotConfig.cols * slotWidth
    : undefined

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
      <div
        style={{
          width: '100%',
          maxWidth: boxWidth,
          marginBottom: isMobile ? 24 : 36,
        }}
      >
        <WatchBox
          watches={[]}
          activeSlot={null}
          onSlotClick={handleAdd}
          onEmptySlotClick={handleAdd}
          frame={watchboxConfig.frame}
          lining={watchboxConfig.lining}
          slotCount={watchboxConfig.slotCount}
          slotWidth={slotWidth}
          showFirstSlotLabel
        />
      </div>

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
