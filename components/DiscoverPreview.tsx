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
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'

const PANEL_BG = '#1e1b16'

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

  if (!leadWatch) return null

  const headlineNoun = headlineNounFor(boxInsight?.missingType ?? null)

  return (
    <section
      className="discover-preview"
      style={{
        background: PANEL_BG,
        color: brand.colors.slot,
        borderTop: `1px solid ${brand.colors.border}`,
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '56px 56px' }}>
        <div
          className="discover-preview-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 1fr',
            gap: 48,
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <GoldKicker>Discover</GoldKicker>
              <div style={{ height: 1, width: 24, background: 'rgba(201,168,76,0.6)' }} />
              <GoldKicker>{personalized ? 'Personalized For You' : 'Your Next Move'}</GoldKicker>
            </div>

            <h2
              style={{
                fontFamily: brand.font.serif,
                fontWeight: 300,
                fontSize: 36,
                lineHeight: 1.1,
                letterSpacing: '-0.015em',
                margin: 0,
                marginBottom: 16,
                color: brand.colors.slot,
              }}
            >
              A <em style={{ fontStyle: 'italic' }}>{headlineNoun}</em>{isGuest ? ', to lead the week.' : ' to round out the box.'}
            </h2>

            <p
              style={{
                fontFamily: brand.font.serif,
                fontStyle: 'italic',
                fontSize: 16,
                lineHeight: 1.5,
                color: 'rgba(250,248,244,0.7)',
                margin: 0,
                marginBottom: 24,
                maxWidth: 440,
                textWrap: 'pretty',
              }}
            >
              {personalized ? (boxInsight?.copy || "Based on what you own and what’s missing.") : "A curated editor’s pick for the week."}
            </p>

            <div
              className="discover-preview-specs"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, auto)',
                gap: 24,
                paddingTop: 18,
                borderTop: '1px solid rgba(250,248,244,0.15)',
                marginBottom: 24,
              }}
            >
              <SpecCell label="Brand" value={leadWatch.brand} />
              <SpecCell label="Reference" value={leadWatch.reference} />
              <SpecCell label="Market" value={fmt(leadWatch.estimatedValue)} />
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/discover"
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 10.5,
                  fontWeight: 500,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase' as const,
                  padding: '11px 22px',
                  background: brand.colors.gold,
                  color: brand.colors.ink,
                  border: 'none',
                  borderRadius: 2,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                View on Discover →
              </Link>
              <Link
                href={`/collection/add/${leadWatch.id}?from=home`}
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 10.5,
                  fontWeight: 500,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase' as const,
                  padding: '11px 18px',
                  background: 'transparent',
                  color: brand.colors.slot,
                  border: '1px solid rgba(250,248,244,0.28)',
                  borderRadius: 2,
                  textDecoration: 'none',
                }}
              >
                View details
              </Link>
            </div>
          </div>

          <div style={{ position: 'relative', textAlign: 'center' }}>
            <Link
              href={`/collection/add/${leadWatch.id}?from=home`}
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'block',
                width: '100%',
                maxWidth: 300,
                height: 370,
                margin: '0 auto',
                filter: 'drop-shadow(0 16px 28px rgba(0,0,0,0.4))',
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              <WatchImageOrDial
                watch={leadWatch}
                fill
                sizes="(max-width: 768px) 70vw, 300px"
                imageStyle={{ objectFit: 'contain' }}
                dialSize={220}
              />
            </Link>
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase' as const,
                  color: 'rgba(250,248,244,0.65)',
                  marginBottom: 4,
                }}
              >
                {leadWatch.brand}
              </div>
              <div style={{ fontFamily: brand.font.serif, fontStyle: 'italic', fontSize: 20, color: brand.colors.slot }}>
                {leadWatch.model}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function GoldKicker({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: brand.font.sans,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.18em',
        textTransform: 'uppercase' as const,
        color: brand.colors.gold,
      }}
    >
      {children}
    </div>
  )
}

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: brand.font.sans,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase' as const,
          color: 'rgba(250,248,244,0.45)',
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: brand.font.serif, fontSize: 16, color: brand.colors.slot }}>
        {value}
      </div>
    </div>
  )
}
