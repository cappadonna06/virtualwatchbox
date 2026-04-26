import type { Metadata } from 'next'
import { watches } from '@/lib/watches'
import WatchBox from '@/components/watchbox/WatchBox'

export const metadata: Metadata = {
  title: 'My Collection',
}

export default function CollectionPage() {
  return (
    <div
      style={{
        padding: '48px 56px',
        minHeight: 'calc(100vh - 61px)',
        backgroundColor: '#FAF8F4',
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: '36px' }}>
        <h1
          className="font-serif"
          style={{
            fontSize: '2.5rem',
            fontWeight: 400,
            lineHeight: 1.15,
            color: '#1A1410',
            marginBottom: '10px',
          }}
        >
          My Collection
        </h1>
        <span
          className="font-sans"
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            backgroundColor: '#F0EBE3',
            border: '1px solid #E8E2D8',
            borderRadius: '20px',
            fontSize: '0.72rem',
            color: '#A89880',
            letterSpacing: '0.04em',
          }}
        >
          {watches.length} watches
        </span>
      </div>

      <WatchBox initialWatches={watches} />
    </div>
  )
}
