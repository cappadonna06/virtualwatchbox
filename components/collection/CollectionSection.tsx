'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { useIsMobile } from './useResponsiveState'
import CollectionWatchboxSurface from './CollectionWatchboxSurface'
import CollectionEmptyState from './CollectionEmptyState'
import SyncRibbon from './SyncRibbon'
import { brand } from '@/lib/brand'

export default function CollectionSection() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { collectionWatches, swapCollectionSlots } = useCollectionSession()
  const isEmpty = collectionWatches.length === 0

  function handleReorder(fromSlot: number, toSlot: number) {
    swapCollectionSlots(fromSlot, toSlot)
  }

  return (
    <section
      className="collection-section"
      style={{ padding: isMobile ? '40px 20px 44px' : '56px 56px 60px', borderTop: `1px solid ${brand.colors.border}` }}
    >
      <div style={{ marginBottom: isMobile ? 28 : 32 }}>
        <Link
          href="/collection"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          <div
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: brand.colors.muted,
              marginBottom: 12,
            }}
          >
            {isEmpty ? 'Start your watchbox →' : 'Your Collection →'}
          </div>
          <h2
            style={{
              fontFamily: brand.font.serif,
              fontSize: 38,
              fontWeight: 400,
              lineHeight: 1.15,
              color: brand.colors.ink,
              whiteSpace: 'nowrap',
              margin: 0,
            }}
          >
            Your Virtual <em>Watch Box.</em>
          </h2>
        </Link>
      </div>

      {isEmpty ? (
        <CollectionEmptyState variant="home" />
      ) : (
        <>
          <SyncRibbon />
          <CollectionWatchboxSurface
            watches={collectionWatches}
            onEmptySlotClick={slot => router.push(`/collection/add?slot=${slot}`)}
            onReorder={handleReorder}
          />
        </>
      )}
    </section>
  )
}
