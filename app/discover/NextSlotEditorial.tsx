'use client'

import Link from 'next/link'
import type { CatalogWatch, WatchType } from '@/types/watch'
import { brand } from '@/lib/brand'
import { buildChrono24URL, priceBandFor, getUpgradeRationale } from '@/lib/discover'
import { logDiscoverEvent } from '@/lib/discoverAnalytics'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import WatchStateControl from '@/components/collection/WatchStateControl'
import EditorialHeader from './EditorialHeader'
import RefreshButton from './RefreshButton'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtK(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return fmt(n)
}

type Props = {
  watches: CatalogWatch[]
  ownedTypes: Set<WatchType>
  seedKeyByWatchId?: Map<string, string>
}

export default function NextSlotEditorial({ watches, ownedTypes, seedKeyByWatchId }: Props) {
  const recs = watches.slice(0, 3)

  return (
    <section
      id="next-slot"
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '56px 56px 32px',
      }}
    >
      <EditorialHeader
        kicker="§ 04"
        title="For your next slot."
        sub="Watches not yet in your box. Three alternative reads across the same gap, in different price tiers."
      />
      <div
        className="discover-nextslot-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}
      >
        {recs.map((watch, i) => (
          <NextSlotCard
            key={watch.id}
            watch={watch}
            rank={String(i + 1).padStart(2, '0')}
            ownedTypes={ownedTypes}
            slotIndex={i}
            seedKey={seedKeyByWatchId?.get(watch.id) ?? `nextSlot::${watch.watchType ?? 'Other'}`}
          />
        ))}
      </div>
    </section>
  )
}

function NextSlotCard({
  watch,
  rank,
  ownedTypes,
  slotIndex,
  seedKey,
}: {
  watch: CatalogWatch
  rank: string
  ownedTypes: Set<WatchType>
  slotIndex: number
  seedKey: string
}) {
  const band = priceBandFor(watch)
  const type = (watch.watchType ?? 'Watch') as WatchType
  const addressesLabel = ownedTypes.has(type)
    ? `Deepens your ${type.toLowerCase()}`
    : `Adds a ${type.toLowerCase()} to the rotation`
  const thesis = getUpgradeRationale(type, watch.id)

  return (
    <article
      style={{
        background: brand.colors.slot,
        border: `1px solid ${brand.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 4 }}>
        <RefreshButton section="next_slot" seedKey={seedKey} variant="corner" />
      </div>
      <Link
        href={`/collection/add/${watch.id}?from=discover`}
        onClick={() => logDiscoverEvent({
          eventType: 'click', section: 'next_slot', seedKey, catalogWatchId: watch.id, slotIndex,
        })}
        style={{
          background: brand.colors.paperWarm,
          aspectRatio: '4/3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          textDecoration: 'none',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            fontFamily: brand.font.serif,
            fontStyle: 'italic',
            fontSize: 14,
            color: brand.colors.goldDeep,
            zIndex: 1,
          }}
        >
          No. {rank}
        </div>
        <div style={{ position: 'relative', width: '70%', height: '90%' }}>
          <WatchImageOrDial
            watch={watch}
            fill
            sizes="(max-width: 768px) 80vw, 280px"
            imageStyle={{ objectFit: 'contain', filter: 'drop-shadow(0 12px 22px rgba(26,20,16,0.18))' }}
            dialSize={140}
          />
        </div>
        <div
          onClick={e => { e.stopPropagation(); e.preventDefault() }}
          style={{ position: 'absolute', left: 14, bottom: 14, zIndex: 2 }}
        >
          <WatchStateControl
            catalogWatchId={watch.id}
            source="discover_next_slot"
            size="sm"
            layout="inline"
          />
        </div>
      </Link>

      <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: brand.colors.goldDeep,
            marginBottom: 8,
          }}
        >
          {addressesLabel}
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: brand.colors.ink,
            marginBottom: 6,
          }}
        >
          {watch.brand}
        </div>
        <div
          style={{
            fontFamily: brand.font.serif,
            fontSize: 22,
            fontWeight: 400,
            fontStyle: 'italic',
            lineHeight: 1.1,
            color: brand.colors.ink,
            marginBottom: 6,
          }}
        >
          {watch.model}
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 12,
            color: brand.colors.muted,
            marginBottom: 14,
            letterSpacing: '0.04em',
          }}
        >
          Ref. {watch.reference} · {watch.caseSizeMm} mm · {type}
        </div>

        <p
          style={{
            fontFamily: brand.font.serif,
            fontStyle: 'italic',
            fontSize: 15,
            lineHeight: 1.55,
            color: brand.colors.inkSoft,
            margin: 0,
            marginBottom: 16,
            flex: 1,
            textWrap: 'pretty',
          }}
        >
          {thesis}
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 14,
            borderTop: `1px solid ${brand.colors.border}`,
          }}
        >
          <div>
            <div style={{ fontFamily: brand.font.serif, fontSize: 16, color: brand.colors.ink }}>
              {fmtK(band.low)} – {fmtK(band.high)}
            </div>
            <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, marginTop: 2 }}>
              Median {fmt(band.median)}
            </div>
          </div>
          <a
            href={buildChrono24URL(watch.brand, watch.model)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => logDiscoverEvent({
              eventType: 'market_click', section: 'next_slot', seedKey, catalogWatchId: watch.id, slotIndex,
            })}
            style={{
              fontFamily: brand.font.sans,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: brand.colors.ink,
              textDecoration: 'none',
            }}
          >
            Find on market ↗
          </a>
        </div>
      </div>
    </article>
  )
}
