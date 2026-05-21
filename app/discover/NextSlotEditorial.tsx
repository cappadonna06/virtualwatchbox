'use client'

import type { CatalogWatch, WatchType } from '@/types/watch'
import { brand } from '@/lib/brand'
import { buildChrono24URL, priceBandFor, getUpgradeRationale } from '@/lib/discover'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import EditorialHeader from './EditorialHeader'

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
}

export default function NextSlotEditorial({ watches, ownedTypes }: Props) {
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
        kicker="§ 03"
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
}: {
  watch: CatalogWatch
  rank: string
  ownedTypes: Set<WatchType>
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
      }}
    >
      <div
        style={{
          background: brand.colors.paperWarm,
          aspectRatio: '4/3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
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
            color: brand.colors.gold,
            zIndex: 1,
          }}
        >
          No. {rank}
        </div>
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            fontFamily: brand.font.sans,
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: brand.colors.muted,
            zIndex: 1,
          }}
        >
          {type}
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
      </div>

      <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: brand.colors.gold,
            marginBottom: 8,
          }}
        >
          {addressesLabel}
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 10,
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
            fontSize: 11,
            color: brand.colors.muted,
            marginBottom: 14,
            letterSpacing: '0.04em',
          }}
        >
          Ref. {watch.reference} · {watch.caseSizeMm} mm
        </div>

        <p
          style={{
            fontFamily: brand.font.serif,
            fontStyle: 'italic',
            fontSize: 13.5,
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
            <div style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted, marginTop: 2 }}>
              Median {fmt(band.median)}
            </div>
          </div>
          <a
            href={buildChrono24URL(watch.brand, watch.model)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: brand.font.sans,
              fontSize: 10.5,
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
