'use client'

import { useRouter } from 'next/navigation'
import type { CatalogWatch } from '@/types/watch'
import { brand } from '@/lib/brand'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import { buildChrono24URL } from '@/lib/discover'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function DiscoverWatchCard({ watch }: { watch: CatalogWatch }) {
  const router = useRouter()
  const { isWatchFollowed, toggleFollowedWatch } = useCollectionSession()
  const followed = isWatchFollowed(watch.id)

  return (
    <div
      style={{
        background: brand.colors.white,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.md,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          height: 180,
          background: '#F5F2EC',
          padding: 16,
          position: 'relative',
        }}
      >
        <WatchImageOrDial
          watch={watch}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          imageStyle={{ objectFit: 'contain', padding: 16 }}
          dialSize={120}
        />
      </div>

      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: brand.colors.muted,
          }}
        >
          {watch.brand}
        </div>
        <div
          style={{
            fontFamily: brand.font.serif,
            fontSize: 18,
            color: brand.colors.ink,
            lineHeight: 1.2,
            marginTop: 2,
          }}
        >
          {watch.model}
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            color: brand.colors.muted,
            marginTop: 2,
          }}
        >
          Ref. {watch.reference}
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 13,
            color: brand.colors.gold,
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          {fmt(watch.estimatedValue)}
        </div>
        <span
          style={{
            display: 'inline-block',
            fontFamily: brand.font.sans,
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: brand.colors.ink,
            border: `1px solid ${brand.colors.border}`,
            borderRadius: 10,
            padding: '2px 8px',
            marginTop: 6,
            alignSelf: 'flex-start',
          }}
        >
          {watch.watchType}
        </span>
      </div>

      <div
        style={{
          padding: '12px 16px',
          borderTop: `1px solid ${brand.colors.border}`,
          display: 'flex',
          flexDirection: 'row',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={() => toggleFollowedWatch(watch.id)}
          aria-label={followed ? 'Unfollow watch' : 'Follow watch'}
          aria-pressed={followed}
          style={{
            width: 30,
            height: 30,
            borderRadius: brand.radius.circle,
            border: `1px solid ${followed ? brand.colors.gold : brand.colors.border}`,
            background: followed ? brand.colors.goldWash : brand.colors.white,
            color: followed ? brand.colors.gold : brand.colors.muted,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill={followed ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4">
            <path d="M7 12.2 2.4 7.6a2.8 2.8 0 0 1 4-4L7 4.2l.6-.6a2.8 2.8 0 0 1 4 4L7 12.2z" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => router.push('/playground')}
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            color: brand.colors.ink,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          Add to Playground
        </button>
        <a
          href={buildChrono24URL(watch.brand, watch.model)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            color: brand.colors.gold,
            textDecoration: 'none',
            marginLeft: 'auto',
          }}
        >
          Find For Sale ↗
        </a>
      </div>
    </div>
  )
}
