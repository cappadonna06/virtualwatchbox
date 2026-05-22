'use client'

import { brand } from '@/lib/brand'
import type { DiscoverSection } from '@/lib/discoverAnalytics'
import { logDiscoverEvent } from '@/lib/discoverAnalytics'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'

type Props = {
  section: DiscoverSection
  seedKey: string
}

// Per-section refresh affordance. Increments a session-scoped offset for
// `seedKey` in the collection session, which drives `dailyIndex(..., offset)`
// to advance one step through the underlying top-10 pool. Logs a `refresh`
// event so we can tell which sections actually invite re-rolls.
export default function RefreshButton({ section, seedKey }: Props) {
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

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        fontFamily: brand.font.sans,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: brand.colors.muted,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
      aria-label="Refresh recommendations"
    >
      <span aria-hidden style={{ fontSize: 12, color: brand.colors.gold }}>↻</span>
      Refresh
    </button>
  )
}
