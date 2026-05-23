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
  getNextSlotPools,
  getUpgradeSuggestionPools,
  getUpgradeRationale,
  computeBoxRead,
  brandsOfInterest,
  collectionPriceAnchor,
  genericByline,
  pickDemoCollection,
} from '@/lib/discover'
import { pickFromPool } from '@/lib/discoverRotation'
import type { UpgradeSuggestion } from '@/lib/discover'
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
    modelFamily: (w as any).modelFamily,
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

  // Daily-rotated lead pick: pick one watch out of the per-type top-10. The
  // rotation seed is keyed off the missing-type so the hero stays stable for
  // the day, rotates next day, and advances independently of upgrade refresh.
  const heroSeedKey = boxInsight ? `hero::${boxInsight.missingType}` : 'hero::none'
  const heroOffset = session.discoverRefreshOffsets[heroSeedKey] ?? 0
  const leadWatch = useMemo(() => {
    if (!boxInsight) return null
    return pickFromPool(boxInsight.suggestionPool, heroSeedKey, heroOffset) ?? boxInsight.suggestion
  }, [boxInsight, heroSeedKey, heroOffset])

  const upgradePools = useMemo(
    () => getUpgradeSuggestionPools(
      collection,
      catalogWatches,
      session.collectionJewelWatchId,
      { hasImage, priceAnchor },
    ),
    [collection, catalogWatches, session.collectionJewelWatchId, hasImage, priceAnchor],
  )

  const upgradeSuggestions: UpgradeSuggestion[] = useMemo(() => {
    const targetSet = new Set(session.nextTargets.map(t => t.watchId))
    const grailId = session.grailWatchId
    const used = new Set<string>()
    const out: UpgradeSuggestion[] = []

    for (const pool of upgradePools) {
      if (out.length >= 3) break
      const seedKey = `upgrade::${pool.ownedWatch.id}`
      const offset = session.discoverRefreshOffsets[seedKey] ?? 0
      // Walk the pool starting from the rotated index, skipping anything
      // already shown in another card so we don't pick the same upgrade twice.
      const baseIdx = pool.upgradePool.length === 0
        ? 0
        : (pickFromPool([...Array(pool.upgradePool.length).keys()], seedKey, offset) ?? 0)
      let pick: typeof pool.upgradePool[number] | null = null
      for (let i = 0; i < pool.upgradePool.length; i += 1) {
        const cand = pool.upgradePool[(baseIdx + i) % pool.upgradePool.length]
        if (used.has(cand.id)) continue
        pick = cand
        break
      }
      if (!pick) continue
      used.add(pick.id)
      out.push({
        ownedWatch: pool.ownedWatch,
        upgradeWatch: pick,
        headline: pool.headline,
        balanceNote: getUpgradeRationale(pool.ownedWatch.watchType, `${pool.ownedWatch.id}->${pick.id}`),
        isGrail: grailId === pick.id,
        isTarget: targetSet.has(pick.id),
        isJewel: false,
      })
    }
    return out
  }, [upgradePools, session.nextTargets, session.grailWatchId, session.discoverRefreshOffsets])

  const nextSlotPools = useMemo(
    () => getNextSlotPools(collection, session.followedWatchIds, catalogWatches, { hasImage, priceAnchor }),
    [collection, catalogWatches, session.followedWatchIds, hasImage, priceAnchor],
  )

  const { nextSlotRecs, nextSlotSeedKeys } = useMemo(() => {
    const usedIds = new Set<string>()
    const picks: CatalogWatch[] = []
    const seedMap = new Map<string, string>()
    for (const slot of nextSlotPools) {
      if (picks.length >= 3) break
      const seedKey = `nextSlot::${slot.watchType}`
      const offset = session.discoverRefreshOffsets[seedKey] ?? 0
      const baseIdx = slot.pool.length === 0
        ? 0
        : (pickFromPool([...Array(slot.pool.length).keys()], seedKey, offset) ?? 0)
      let pick: CatalogWatch | null = null
      for (let i = 0; i < slot.pool.length; i += 1) {
        const cand = slot.pool[(baseIdx + i) % slot.pool.length]
        if (usedIds.has(cand.id)) continue
        pick = cand
        break
      }
      if (!pick) continue
      usedIds.add(pick.id)
      seedMap.set(pick.id, seedKey)
      picks.push(pick)
    }
    return { nextSlotRecs: picks, nextSlotSeedKeys: seedMap }
  }, [nextSlotPools, session.discoverRefreshOffsets])

  const ownedTypes = useMemo(
    () => new Set(collection.map(w => w.watchType).filter((t): t is WatchType => Boolean(t))),
    [collection],
  )

  const fallbackRead = useMemo(() => computeBoxRead(collection), [collection])
  const newsBrandFilter = useMemo(
    () => personalized ? brandsOfInterest(collection, 3) : [],
    [collection, personalized],
  )

  const upgradePairsForCopy = useMemo(
    () => upgradeSuggestions.map(s => ({
      fromWatchId: s.ownedWatch.id,
      fromBrand: s.ownedWatch.brand,
      fromModel: s.ownedWatch.model,
      fromType: s.ownedWatch.watchType ?? 'Watch',
      toWatchId: s.upgradeWatch.id,
      toBrand: s.upgradeWatch.brand,
      toModel: s.upgradeWatch.model,
      toType: s.upgradeWatch.watchType ?? 'Watch',
      upgradeDeltaUsd: (s.upgradeWatch.estimatedValue ?? 0) - (s.ownedWatch.estimatedValue ?? 0),
    })),
    [upgradeSuggestions],
  )

  const heroLeadForCopy = useMemo(
    () => leadWatch
      ? { toWatchId: leadWatch.id, brand: leadWatch.brand, model: leadWatch.model, type: leadWatch.watchType ?? 'Watch' }
      : null,
    [leadWatch],
  )

  const personalize = usePersonalizedInsight({
    collection,
    slotCount: session.watchboxConfig.slotCount,
    grailWatchId: session.grailWatchId,
    gapType: boxInsight?.missingType ?? null,
    gapLabel: boxInsight?.missingType ?? null,
    leadPick: leadWatch
      ? { brand: leadWatch.brand, model: leadWatch.model, reference: leadWatch.reference, type: leadWatch.watchType ?? 'Watch', value: leadWatch.estimatedValue }
      : null,
    heroLead: heroLeadForCopy,
    upgradePairs: upgradePairsForCopy,
    fallbackRead,
    brandReadHint: fallbackRead,
    priceTarget: priceAnchor?.target ?? null,
    enabled: personalized,
  })

  const insightRead = personalize.read || fallbackRead
  const leadInsight = personalize.leadInsight || boxInsight?.copy || ''

  // Map pair-id → rationale sentence for UpgradeSpread to render in place of
  // the static balanceNote when the LLM/cached copy is available.
  const upgradeRationaleByPair = useMemo(() => {
    const map = new Map<string, string>()
    for (const [k, v] of Object.entries(personalize.upgradeRationales)) {
      if (typeof v === 'string' && v.trim()) map.set(k, v.trim())
    }
    return map
  }, [personalize.upgradeRationales])

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
          refreshSeedKey={heroSeedKey}
        />
      )}

      {personalized && upgradeSuggestions.length > 0 && (
        <UpgradeSpread suggestions={upgradeSuggestions} rationaleByPair={upgradeRationaleByPair} />
      )}

      <NextSlotEditorial watches={nextSlotRecs} ownedTypes={ownedTypes} seedKeyByWatchId={nextSlotSeedKeys} />

      <NewsEditorial brandFilter={newsBrandFilter} />
    </div>
  )
}
