'use client'

import type { CSSProperties } from 'react'
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

  function handleClick() {
    session.bumpDiscoverRefresh(seedKey)
    logDiscoverEvent({
      eventType: 'refresh',
      section,
      seedKey,
      refreshOffset: offset + 1,
    })
  }

  const cornerStyle: CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: 999,
    border: `1px solid ${tone === 'dark' ? 'rgba(250,248,244,0.28)' : brand.colors.borderLight}`,
    background: tone === 'dark' ? 'rgba(250,248,244,0.06)' : brand.colors.white,
    color: brand.colors.gold,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    fontSize: 14,
    lineHeight: 1,
  }

  if (variant === 'corner') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Refresh recommendation"
        title="Refresh"
        style={cornerStyle}
      >
        <span aria-hidden>↻</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Refresh recommendation"
      style={{
        fontFamily: brand.font.sans,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: tone === 'dark' ? 'rgba(250,248,244,0.7)' : brand.colors.muted,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span aria-hidden style={{ fontSize: 14, color: brand.colors.gold }}>↻</span>
    </button>
  )
}
