'use client'

import { useMemo } from 'react'
import type { CatalogWatch, WatchType } from '@/types/watch'
import { brand } from '@/lib/brand'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { useWatchImages } from '@/lib/watchImages/WatchImagesProvider'
import { useCatalog } from '@/lib/catalog/CatalogProvider'
import {
  getBoxInsight,
  getNextSlotRecommendations,
  getUpgradeSuggestions,
  computeBoxRead,
  brandsOfInterest,
  collectionPriceAnchor,
  genericByline,
  pickDemoCollection,
} from '@/lib/discover'
import { getProfileDemoState } from '@/lib/profileDemo'

import HeroMasthead from './HeroMasthead'
import SectionNav from './SectionNav'
import CompleteTheBoxLead from './CompleteTheBoxLead'
import UpgradeSpread from './UpgradeSpread'
import NextSlotEditorial from './NextSlotEditorial'
import NewsEditorial from './NewsEditorial'
import { usePersonalizedInsight } from './usePersonalizedInsight'
import './discover.css'

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
  }))
}

function todayByline(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
}

function profileDisplayName(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const state = getProfileDemoState()
    const name = state.displayName?.trim()
    if (!name || name === 'Private Collector') return null
    const first = name.split(/\s+/)[0]
    return first || null
  } catch {
    return null
  }
}

export default function DiscoverPage() {
  const { user } = useAuth()
  const session = useCollectionSession()
  const { getImageUrl } = useWatchImages()
  // Supabase-backed catalog. CatalogProvider transparently falls back to
  // the curated static seed when the Supabase load hasn't completed (SSR,
  // first paint) or when the load fails, so consumers can treat this as
  // "always populated."
  const { allWatches: catalogWatches } = useCatalog()
  const isGuest = !user

  const hasImage = useMemo(
    () => (watch: CatalogWatch) => Boolean(getImageUrl(watch.id) ?? watch.imageUrl),
    [getImageUrl],
  )

  const realCollection = useMemo(() => ownedToCatalog(session.collectionWatches), [session.collectionWatches])

  // Demo collection for guest / empty-box sessions: top-heat watches from
  // the live Supabase catalog, with a type-variety pass so the four picks
  // span different watch types (Field, GMT, Dress, Chrono, etc.) rather
  // than landing on four Rolex sport models.
  const demoCollection: CatalogWatch[] = useMemo(
    () => pickDemoCollection(catalogWatches, { hasImage, count: 4 }),
    [catalogWatches, hasImage],
  )

  const collection = realCollection.length > 0 ? realCollection : demoCollection
  const personalized = !isGuest && realCollection.length > 0

  const priceAnchor = useMemo(() => collectionPriceAnchor(collection), [collection])

  const boxInsight = useMemo(
    () => getBoxInsight(collection, catalogWatches, { hasImage, priceAnchor }),
    [collection, catalogWatches, hasImage, priceAnchor],
  )

  const upgradeSuggestions = useMemo(
    () => getUpgradeSuggestions(
      collection,
      catalogWatches,
      session.followedWatchIds,
      session.collectionJewelWatchId,
      session.grailWatchId,
      session.nextTargets.map(t => t.watchId),
      { hasImage, priceAnchor },
    ),
    [collection, catalogWatches, session.followedWatchIds, session.collectionJewelWatchId, session.grailWatchId, session.nextTargets, hasImage, priceAnchor],
  )

  const nextSlotRecs = useMemo(
    () => getNextSlotRecommendations(collection, session.followedWatchIds, catalogWatches, 3, { hasImage, priceAnchor }),
    [collection, catalogWatches, session.followedWatchIds, hasImage, priceAnchor],
  )

  const ownedTypes = useMemo(
    () => new Set(collection.map(w => w.watchType).filter((t): t is WatchType => Boolean(t))),
    [collection],
  )

  const fallbackRead = useMemo(() => computeBoxRead(collection), [collection])
  const newsBrandFilter = useMemo(
    () => personalized ? brandsOfInterest(collection, 3) : [],
    [collection, personalized],
  )

  const leadWatch = boxInsight?.suggestion ?? null
  const personalize = usePersonalizedInsight({
    collection,
    slotCount: session.watchboxConfig.slotCount,
    grailWatchId: session.grailWatchId,
    gapType: boxInsight?.missingType ?? null,
    gapLabel: boxInsight?.missingType ?? null,
    leadPick: leadWatch
      ? { brand: leadWatch.brand, model: leadWatch.model, reference: leadWatch.reference, type: leadWatch.watchType ?? 'Watch', value: leadWatch.estimatedValue }
      : null,
    fallbackRead,
    brandReadHint: fallbackRead,
    priceTarget: priceAnchor?.target ?? null,
    enabled: personalized,
  })

  const insightRead = personalize.read || fallbackRead
  const leadInsight = personalize.leadInsight || boxInsight?.copy || ''

  const firstName = personalized ? profileDisplayName() : null
  const bylineLeft = isGuest
    ? 'Editor’s curation'
    : (firstName ? `For ${firstName}` : genericByline())

  return (
    <div style={{ background: brand.colors.bg, color: brand.colors.ink }}>
      <HeroMasthead
        personalized={personalized}
        bylineLeft={bylineLeft}
        bylineRight={todayByline()}
        insightRead={insightRead}
      />

      <SectionNav />

      {leadWatch && (
        <CompleteTheBoxLead
          watch={leadWatch}
          gapLabel={personalized ? (boxInsight?.missingType ?? 'This week') : 'Featured this week'}
          gapType={boxInsight?.missingType ?? null}
          insight={leadInsight || `A ${(boxInsight?.missingType ?? 'next pick').toLowerCase()} would round out the box.`}
          personalized={personalized}
        />
      )}

      {personalized && upgradeSuggestions.length > 0 && (
        <UpgradeSpread suggestions={upgradeSuggestions} />
      )}

      <NextSlotEditorial watches={nextSlotRecs} ownedTypes={ownedTypes} />

      <NewsEditorial brandFilter={newsBrandFilter} />
    </div>
  )
}
