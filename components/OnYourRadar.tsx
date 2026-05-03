'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { renderableWatches as catalogWatches } from '@/lib/renderableWatches'
import WatchStateControl from '@/components/collection/WatchStateControl'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  followedWatchIds: Set<string>
}

export default function OnYourRadar({ followedWatchIds }: Props) {
  const router = useRouter()

  const followedWatches = useMemo(
    () => catalogWatches.filter(watch => followedWatchIds.has(watch.id)),
    [followedWatchIds],
  )

  if (followedWatches.length === 0) return null

  function openWatchDetail(watchId: string) {
    router.push(`/collection/add/${watchId}?source=followed`)
  }

  return (
    <div className="radar-section" style={{ padding: '56px 56px 60px', borderTop: '1px solid #EAE5DC' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 6 }}>
            Followed · {followedWatches.length} {followedWatches.length === 1 ? 'watch' : 'watches'}
          </div>
          <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 26, fontWeight: 400, color: '#1A1410' }}>
            On Your <em>Radar.</em>
          </h3>
        </div>
        <button
          onClick={() => router.push('/playground')}
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            color: '#C9A84C',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
        >
          Open Playground →
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {followedWatches.map(watch => (
          <div
            key={watch.id}
            onClick={() => openWatchDetail(watch.id)}
            style={{
              flex: '0 0 160px',
              background: '#fff',
              border: '1px solid #EAE5DC',
              borderRadius: 10,
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'box-shadow 0.15s, transform 0.15s',
            }}
            onMouseEnter={event => {
              event.currentTarget.style.boxShadow = '0 4px 16px rgba(26,20,16,0.10)'
              event.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={event => {
              event.currentTarget.style.boxShadow = 'none'
              event.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ position: 'relative' }}>
              <WatchImageOrDial
                watch={watch}
                width={160}
                height={160}
                imageStyle={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', background: '#F8F4EE', display: 'block', padding: 8 }}
                dialSize={92}
              />
              <WatchStateControl
                catalogWatchId={watch.id}
                source="profile"
                size="sm"
              />
            </div>
            <div style={{ padding: '10px 12px 12px' }}>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 3 }}>
                {watch.brand}
              </div>
              <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 14, lineHeight: 1.2, color: '#1A1410', marginBottom: 2 }}>
                {watch.model}
              </div>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, color: '#A89880', marginBottom: 5 }}>
                {watch.dialColor}
              </div>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#C9A84C', fontWeight: 600 }}>
                {fmt(watch.estimatedValue)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
