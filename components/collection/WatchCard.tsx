'use client'

import Image from 'next/image'
import type { OwnershipStatus, ResolvedOwnedWatch, ResolvedWatch, WatchCondition } from '@/types/watch'
import { brand } from '@/lib/brand'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import WatchStateControl from './WatchStateControl'
import type { WatchStateSource } from '@/types/watch'
import { IntentBadge } from './WatchStateIcons'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const statusStyles: Record<OwnershipStatus, { background: string; color: string }> = {
  'Owned':          { background: brand.status.owned.bg,          color: brand.status.owned.text },
  'For Sale':       { background: brand.status.forSale.bg,        color: brand.status.forSale.text },
  'Recently Added': { background: brand.status.recentlyAdded.bg,  color: brand.status.recentlyAdded.text },
  'Needs Service':  { background: brand.status.needsService.bg,   color: brand.status.needsService.text },
}

const conditionStyles: Record<WatchCondition, { background: string; color: string }> = {
  'Unworn':    { background: brand.condition.unworn.bg,    color: brand.condition.unworn.text },
  'Like New':  { background: brand.condition.likeNew.bg,   color: brand.condition.likeNew.text },
  'Excellent': { background: brand.condition.excellent.bg, color: brand.condition.excellent.text },
  'Good':      { background: brand.condition.good.bg,      color: brand.condition.good.text },
  'Fair':      { background: brand.condition.fair.bg,      color: brand.condition.fair.text },
}

interface Props {
  watch: ResolvedOwnedWatch | ResolvedWatch
  isActive: boolean
  onSelect: () => void
  mode?: 'collection' | 'playground' | 'saved'
  stateSource?: WatchStateSource | null
}

export default function WatchCard({ watch, isActive, onSelect, mode = 'collection', stateSource = null }: Props) {
  const { isWatchJewel } = useCollectionSession()
  const status = 'ownershipStatus' in watch ? statusStyles[watch.ownershipStatus] : statusStyles.Owned
  const condition = conditionStyles[watch.condition]
  const showStateControl = stateSource !== null
  const showMetaBadge = mode !== 'saved'
  const showJewelBadge = mode === 'collection' && isWatchJewel(watch.watchId)

  return (
    <div
      onClick={onSelect}
      style={{
        position: 'relative',
        cursor: 'pointer',
        background: brand.colors.white,
        border: isActive
          ? `2px solid ${brand.colors.gold}`
          : `1px solid ${brand.colors.borderMid}`,
        borderRadius: brand.radius.lg,
        overflow: 'hidden',
        boxShadow: isActive
          ? brand.shadow.gold
          : brand.shadow.xs,
        transition: `box-shadow ${brand.transition.base}, border-color ${brand.transition.base}`,
      }}
    >
      {/* Image / dial section */}
      <div
        style={{
          background: brand.colors.bg,
          aspectRatio: '4/3',
          position: 'relative',
          overflow: 'hidden',
          borderBottom: `1px solid ${brand.colors.borderMid}`,
        }}
      >
        <Image
          src={watch.imageUrl}
          alt={watch.model}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
          style={{ objectFit: 'contain', objectPosition: 'center', padding: 12 }}
        />
        {showJewelBadge && (
          <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 3 }}>
            <IntentBadge state="jewel" compact />
          </div>
        )}
        {showStateControl && (
          <WatchStateControl
            catalogWatchId={watch.watchId}
            source={stateSource}
            size="sm"
          />
        )}
      </div>

      {/* Info section */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: brand.colors.gold,
            marginBottom: 4,
          }}
        >
          {watch.brand}
        </div>
        <div
          style={{
            fontFamily: brand.font.serif,
            fontSize: 20,
            fontWeight: 400,
            color: brand.colors.ink,
            lineHeight: 1.15,
            marginBottom: 4,
          }}
        >
          {watch.model}
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            color: brand.colors.muted,
            marginBottom: 2,
          }}
        >
          Ref. {watch.reference}
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            color: brand.colors.muted,
            marginBottom: 10,
          }}
        >
          {watch.caseSizeMm}mm · {watch.dialColor}
        </div>

        {/* Type badge */}
        <span
          style={{
            display: 'inline-block',
            fontFamily: brand.font.sans,
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            background: brand.colors.dark,
            color: brand.colors.bg,
            padding: '3px 9px',
            borderRadius: brand.radius.pill,
            marginBottom: 12,
          }}
        >
          {watch.watchType}
        </span>

        {/* Estimated value */}
        <div
          style={{
            fontFamily: brand.font.serif,
            fontSize: 24,
            fontWeight: 500,
            color: brand.colors.ink,
            marginBottom: 10,
          }}
        >
          {fmt(watch.estimatedValue)}
        </div>

        {/* Status / condition badge */}
        {showMetaBadge && (
          <span
            style={{
              display: 'inline-block',
              fontFamily: brand.font.sans,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.06em',
              padding: '3px 10px',
              borderRadius: brand.radius.pill,
              background: mode === 'playground' ? condition.background : status.background,
              color: mode === 'playground' ? condition.color : status.color,
            }}
          >
            {mode === 'playground'
              ? watch.condition
              : 'ownershipStatus' in watch
                ? watch.ownershipStatus
                : 'Owned'}
          </span>
        )}
      </div>
    </div>
  )
}
