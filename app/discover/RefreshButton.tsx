'use client'

import { useState, type CSSProperties } from 'react'
import { brand } from '@/lib/brand'
import type { DiscoverSection } from '@/lib/discoverAnalytics'
import { logDiscoverEvent } from '@/lib/discoverAnalytics'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'

type Props = {
  section: DiscoverSection
  seedKey: string
  // 'inline' — text+icon button, used in the hero kicker row.
  // 'corner' — icon-only chrome, used at the top-right of upgrade/next-slot cards.
  variant?: 'inline' | 'corner'
  tone?: 'light' | 'dark'
}

// Per-section refresh affordance. Increments a session-scoped offset for
// `seedKey` in the collection session, which drives `dailyIndex(..., offset)`
// to advance one step through the underlying top-10 pool. Logs a `refresh`
// event so we can tell which sections actually invite re-rolls.
export default function RefreshButton({ section, seedKey, variant = 'inline', tone = 'light' }: Props) {
  const session = useCollectionSession()
  const offset = session.discoverRefreshOffsets[seedKey] ?? 0
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  // Each hover triggers another forward 360° turn — never reverses, so the
  // arrow feels deliberate rather than seesaw'd.
  const [turns, setTurns] = useState(0)
  // Click should also feel like a twirl, even if the cursor was already on
  // the button (e.g. tap-to-click on mobile or repeated clicks).
  const [clickTurns, setClickTurns] = useState(0)

  function handleClick() {
    session.bumpDiscoverRefresh(seedKey)
    logDiscoverEvent({
      eventType: 'refresh',
      section,
      seedKey,
      refreshOffset: offset + 1,
    })
    setClickTurns(t => t + 1)
  }

  function handleMouseEnter() {
    setHovered(true)
    setTurns(t => t + 1)
  }

  function handleMouseLeave() {
    setHovered(false)
    setPressed(false)
  }

  if (variant === 'corner') {
    const baseBg = tone === 'dark' ? 'rgba(250,248,244,0.06)' : brand.colors.white
    const hoverBg = brand.colors.goldWash
    const baseBorder = tone === 'dark' ? 'rgba(250,248,244,0.28)' : brand.colors.borderLight
    const scale = pressed ? 0.92 : hovered ? 1.08 : 1
    const totalTurns = turns + clickTurns

    const cornerStyle: CSSProperties = {
      width: 28,
      height: 28,
      borderRadius: 999,
      border: `1px solid ${hovered ? brand.colors.goldLine : baseBorder}`,
      background: hovered ? hoverBg : baseBg,
      color: brand.colors.gold,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      fontSize: 14,
      lineHeight: 1,
      boxShadow: hovered ? brand.shadow.md : 'none',
      transform: `scale(${scale})`,
      transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, background 140ms ease',
    }

    return (
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        aria-label="Refresh recommendation"
        title="Refresh"
        style={cornerStyle}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            transform: `rotate(${totalTurns * 360}deg)`,
            transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          ↻
        </span>
      </button>
    )
  }

  const totalTurns = turns + clickTurns
  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      aria-label="Refresh recommendation"
      style={{
        fontFamily: brand.font.sans,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: hovered
          ? brand.colors.gold
          : tone === 'dark' ? 'rgba(250,248,244,0.7)' : brand.colors.muted,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'color 140ms ease',
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          fontSize: 14,
          color: brand.colors.gold,
          transform: `rotate(${totalTurns * 360}deg)`,
          transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        ↻
      </span>
    </button>
  )
}
