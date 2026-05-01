'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { useIsMobile } from './useResponsiveState'
import CollectionWatchboxSurface from './CollectionWatchboxSurface'

export default function CollectionSection() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { collectionWatches, reorderCollectionWatches } = useCollectionSession()

  function handleReorder(from: number, to: number) {
    const next = [...collectionWatches]
    ;[next[from], next[to]] = [next[to], next[from]]
    reorderCollectionWatches(next)
  }

  return (
    <section
      className="collection-section"
      style={{ padding: isMobile ? '56px 20px' : '80px 56px', borderTop: '1px solid var(--color-border)' }}
    >
      <div style={{ marginBottom: 36 }}>
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
              color: 'var(--color-muted)',
              marginBottom: 12,
            }}
          >
            My Collection →
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-cormorant)',
              fontSize: 38,
              fontWeight: 400,
              lineHeight: 1.15,
              color: 'var(--color-ink)',
              whiteSpace: 'nowrap',
              margin: 0,
            }}
          >
            Your Virtual <em>Watch Box.</em>
          </h2>
        </Link>
      </div>

      <CollectionWatchboxSurface
        watches={collectionWatches}
        onEmptySlotClick={() => router.push('/collection/add')}
        onReorder={handleReorder}
      />
    </section>
  )
}
