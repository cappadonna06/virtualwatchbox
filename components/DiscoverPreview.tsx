'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { CatalogWatch } from '@/types/watch'
import { brand } from '@/lib/brand'
import {
  getBoxInsight,
  collectionPriceAnchor,
  pickDemoCollection,
} from '@/lib/discover'
import { pickFromPool } from '@/lib/discoverRotation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { useCatalog } from '@/lib/catalog/CatalogProvider'
import { useWatchImages } from '@/lib/watchImages/WatchImagesProvider'
import { usePrefersReducedMotion } from '@/components/collection/useResponsiveState'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'

const HAIRLINE = 'rgba(245,241,233,0.14)'
const OUTLINE_BORDER = 'rgba(245,241,233,0.2)'
const GOLD_RADIAL = 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(201,168,76,0.12), transparent 70%)'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function ownedToCatalog(owned: ReturnType<typeof useCollectionSession>['collectionWatches']): CatalogWatch[] {
  return owned.map(w => ({
    id: w.watchId,
    brand: w.brand,
    model: w.model,
    reference: w.reference,
    caseSizeMm: w.caseSizeMm,
    lugWidthMm: w.lugWidthMm,
    caseMaterial: w.caseMaterial,
    dialColor: w.dialColor,
    movement: w.movement,
    complications: w.complications,
    estimatedValue: w.estimatedValue,
    imageUrl: w.imageUrl,
    imageTransparentUrl: w.imageTransparentUrl,
    imageSourceUrl: w.imageSourceUrl,
    dialConfig: w.dialConfig,
    watchType: w.watchType,
    modelFamily: (w as any).modelFamily,
  }))
}

function headlineNounFor(gapType: string | null): string {
  if (!gapType) return 'next pick'
  const lower = gapType.toLowerCase()
  switch (gapType) {
    case 'Integrated Bracelet': return 'integrated-bracelet piece'
    case 'Chronograph':         return 'chronograph'
    case 'GMT':                 return 'GMT'
    case 'Vintage':             return 'vintage piece'
    case 'Sport':               return 'sport piece'
    default:                    return `${lower} watch`
  }
}

export default function DiscoverPreview() {
  const { user } = useAuth()
  const session = useCollectionSession()
  const { getImageUrl } = useWatchImages()
  const { allWatches: catalogWatches } = useCatalog()
  const prefersReducedMotion = usePrefersReducedMotion()
  const isGuest = !user

  const hasImage = useMemo(
    () => (watch: CatalogWatch) => Boolean(getImageUrl(watch.id) ?? watch.imageUrl),
    [getImageUrl],
  )

  const realCollection = useMemo(() => ownedToCatalog(session.collectionWatches), [session.collectionWatches])
  const demoCollection = useMemo(
    () => pickDemoCollection(catalogWatches, { hasImage, count: 4 }),
    [catalogWatches, hasImage],
  )
  const personalized = !isGuest && realCollection.length > 0
  const collection = realCollection.length > 0 ? realCollection : demoCollection

  const priceAnchor = useMemo(() => collectionPriceAnchor(collection), [collection])
  const boxInsight = useMemo(
    () => getBoxInsight(collection, catalogWatches, { hasImage, priceAnchor }),
    [collection, catalogWatches, hasImage, priceAnchor],
  )

  const heroSeedKey = boxInsight ? `hero::${boxInsight.missingType}` : 'hero::none'
  const leadWatch = useMemo(() => {
    if (!boxInsight) return null
    return pickFromPool(boxInsight.suggestionPool, heroSeedKey, 0) ?? boxInsight.suggestion
  }, [boxInsight, heroSeedKey])

  const fallbackWatch = useMemo(() => {
    if (leadWatch) return null
    const withImg = catalogWatches
      .filter(w => hasImage(w))
      .sort((a, b) => (b.market?.heatScore ?? 0) - (a.market?.heatScore ?? 0))
    return withImg[0] ?? null
  }, [leadWatch, catalogWatches, hasImage])

  const displayWatch = leadWatch ?? fallbackWatch
  if (!displayWatch) return null

  const hasCollection = realCollection.length > 0
  const headlineNoun = headlineNounFor(boxInsight?.missingType ?? null)
  const kickerLabel = personalized ? 'Personalized For You' : hasCollection ? 'Your Next Move' : 'Your First Move'
  const headline = personalized
    ? <>A <em style={{ fontStyle: 'italic' }}>{headlineNoun}</em> to round out the box.</>
    : hasCollection
      ? <>A <em style={{ fontStyle: 'italic' }}>{headlineNoun}</em>, to lead the week.</>
      : <>Start your collection.</>
  const description = personalized
    ? (boxInsight?.copy || "Based on what you own and what's missing.")
    : hasCollection
      ? "Something new for a collection that already covers the fundamentals."
      : "A curated editor's pick for the week."

  return (
    <section
      className="discover-preview"
      style={{
        background: brand.colors.heroDark1,
        color: brand.colors.onDark,
        borderTop: `1px solid ${brand.colors.border}`,
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '56px 56px' }}>
        <div
          className="discover-preview-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
            gap: 56,
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <div style={{ height: 1, width: 28, background: brand.colors.gold }} />
              <span
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: brand.text.label,
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase' as const,
                  color: brand.colors.gold,
                }}
              >
                Discover · {kickerLabel}
              </span>
            </div>

            <h2
              style={{
                fontFamily: brand.font.serif,
                fontWeight: 400,
                fontSize: brand.text.h2,
                lineHeight: 1.1,
                letterSpacing: '-0.005em',
                margin: '0 0 18px',
                color: brand.colors.onDark,
              }}
            >
              {headline}
            </h2>

            <p
              style={{
                fontFamily: brand.font.sans,
                fontSize: brand.text.body,
                lineHeight: 1.7,
                color: brand.colors.onDarkMuted,
                margin: '0 0 32px',
                maxWidth: 440,
                textWrap: 'pretty',
              }}
            >
              {description}
            </p>

            <div
              className="discover-preview-specs"
              style={{
                display: 'flex',
                gap: 44,
                padding: '22px 0',
                borderTop: `1px solid ${HAIRLINE}`,
                borderBottom: `1px solid ${HAIRLINE}`,
                marginBottom: 30,
              }}
            >
              <SpecCell label="Brand" value={displayWatch.brand} />
              <SpecCell label="Reference" value={displayWatch.reference} />
              <SpecCell label="Market" value={fmt(displayWatch.estimatedValue)} isPrice />
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/discover"
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: brand.text.labelSm,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  padding: '13px 26px',
                  background: brand.colors.gold,
                  color: brand.colors.ink,
                  border: '1px solid transparent',
                  borderRadius: brand.radius.sm,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: prefersReducedMotion ? undefined : `filter ${brand.transition.fast}`,
                }}
              >
                View on Discover →
              </Link>
              <Link
                href={`/collection/add/${displayWatch.id}?from=home`}
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: brand.text.labelSm,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  padding: '13px 22px',
                  background: 'transparent',
                  color: brand.colors.onDark,
                  border: `1px solid ${OUTLINE_BORDER}`,
                  borderRadius: brand.radius.sm,
                  textDecoration: 'none',
                  transition: prefersReducedMotion ? undefined : `border-color ${brand.transition.fast}`,
                }}
              >
                View Details
              </Link>
            </div>
          </div>

          <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
            <div
              aria-hidden
              style={{ position: 'absolute', inset: 0, background: GOLD_RADIAL, pointerEvents: 'none' }}
            />
            <Link
              href={`/collection/add/${displayWatch.id}?from=home`}
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'block',
                width: '100%',
                maxWidth: 300,
                height: 370,
                margin: '0 auto',
                filter: 'drop-shadow(0 28px 50px rgba(0,0,0,0.6))',
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              <WatchImageOrDial
                watch={displayWatch}
                fill
                sizes="(max-width: 768px) 70vw, 300px"
                imageStyle={{ objectFit: 'contain' }}
                dialSize={220}
              />
            </Link>
            <div style={{ position: 'relative', zIndex: 1, marginTop: 14, textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: brand.text.label,
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase' as const,
                  color: brand.colors.onDarkMuted,
                  marginBottom: 4,
                }}
              >
                {displayWatch.brand}
              </div>
              <div
                style={{
                  fontFamily: brand.font.serif,
                  fontStyle: 'italic',
                  fontSize: brand.text.lead,
                  color: brand.colors.onDark,
                }}
              >
                {displayWatch.model}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SpecCell({ label, value, isPrice = false }: { label: string; value: string; isPrice?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontFamily: brand.font.sans,
          fontSize: brand.text.labelSm,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
          color: brand.colors.onDarkMuted,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={
          isPrice
            ? {
                fontFamily: brand.font.sans,
                fontSize: brand.text.lead,
                fontWeight: 600,
                color: brand.colors.gold,
                fontVariantNumeric: 'tabular-nums',
              }
            : {
                fontFamily: brand.font.serif,
                fontSize: brand.text.lead,
                color: brand.colors.onDark,
              }
        }
      >
        {value}
      </div>
    </div>
  )
}
