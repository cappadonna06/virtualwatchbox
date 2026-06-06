'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { brand } from '@/lib/brand'
import { renderableWatches as catalogWatches } from '@/lib/renderableWatches'
import WatchStateControl from '@/components/collection/WatchStateControl'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import { usePrefersReducedMotion } from '@/components/collection/useResponsiveState'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  followedWatchIds: Set<string>
}

export default function OnYourRadar({ followedWatchIds }: Props) {
  const router = useRouter()
  const prefersReducedMotion = usePrefersReducedMotion()

  const followedWatches = useMemo(
    () => catalogWatches.filter(watch => followedWatchIds.has(watch.id)),
    [followedWatchIds],
  )

  if (followedWatches.length === 0) return null

  function openWatchDetail(watchId: string) {
    router.push(`/collection/add/${watchId}?source=followed`)
  }

  const cardTransition = prefersReducedMotion
    ? 'none'
    : 'border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease'

  return (
    <div className="radar-section" style={{ padding: '56px 56px 60px', borderTop: `1px solid ${brand.colors.borderMid}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: brand.font.sans, fontSize: brand.text.label, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 8 }}>
            Followed · {followedWatches.length} {followedWatches.length === 1 ? 'watch' : 'watches'}
          </div>
          <h2 style={{ fontFamily: brand.font.serif, fontSize: brand.text.h2, fontWeight: 400, lineHeight: 1.08, letterSpacing: '-0.005em', color: brand.colors.ink }}>
            On Your <em style={{ fontStyle: 'italic' }}>Radar.</em>
          </h2>
        </div>
        <button
          onClick={() => router.push('/playground')}
          style={{
            fontFamily: brand.font.sans,
            fontSize: brand.text.label,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            color: brand.colors.goldDeep,
            background: 'none',
            border: 'none',
            padding: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Open Playground →
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 18,
          overflowX: 'auto',
          padding: '4px 4px 18px',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
        }}
      >
        {followedWatches.map(watch => (
          <div
            key={watch.id}
            onClick={() => openWatchDetail(watch.id)}
            style={{
              scrollSnapAlign: 'start',
              flex: '0 0 226px',
              background: brand.colors.white,
              border: `1px solid ${brand.colors.border}`,
              borderRadius: 14,
              overflow: 'hidden',
              cursor: 'pointer',
              transition: cardTransition,
            }}
            onMouseEnter={event => {
              event.currentTarget.style.borderColor = brand.colors.borderLight
              event.currentTarget.style.boxShadow = '0 10px 28px rgba(26,20,16,0.10)'
              if (!prefersReducedMotion) event.currentTarget.style.transform = 'translateY(-3px)'
            }}
            onMouseLeave={event => {
              event.currentTarget.style.borderColor = brand.colors.border
              event.currentTarget.style.boxShadow = 'none'
              event.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div
              style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                background: 'linear-gradient(160deg, #FBF8F3, #F1EADF)',
                display: 'grid',
                placeItems: 'center',
                padding: 18,
              }}
            >
              <WatchImageOrDial
                watch={watch}
                width={190}
                height={190}
                imageStyle={{ maxHeight: '90%', width: 'auto', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 8px 16px rgba(26,20,16,0.16))' }}
                dialSize={110}
              />
              <WatchStateControl
                catalogWatchId={watch.id}
                source="profile"
                size="sm"
                placement="top-right"
              />
            </div>
            <div style={{ padding: '16px 16px 18px' }}>
              <div style={{ fontFamily: brand.font.sans, fontSize: brand.text.labelSm, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted }}>
                {watch.brand}
              </div>
              <div style={{ fontFamily: brand.font.serif, fontSize: brand.text.cardTitle, lineHeight: 1.12, color: brand.colors.ink, margin: '5px 0 4px' }}>
                {watch.model}
              </div>
              <div style={{ fontFamily: brand.font.sans, fontSize: brand.text.bodySm, color: brand.colors.muted, marginBottom: 12 }}>
                {watch.dialColor}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: brand.font.sans, fontSize: brand.text.price, fontWeight: 600, color: brand.colors.goldDeep, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(watch.estimatedValue)}
                </span>
                <span style={{ fontFamily: brand.font.sans, fontSize: brand.text.labelSm, letterSpacing: '0.08em', textTransform: 'uppercase', color: brand.colors.faint }}>
                  Market
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
