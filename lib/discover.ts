import type { CatalogWatch, WatchTarget, WatchType } from '@/types/watch'
import { BRAND_TIERS, UPGRADE_PATHS } from './discoverUpgradePaths'

export function buildChrono24URL(brand: string, model: string): string {
  const query = encodeURIComponent(`${brand} ${model}`)
  return `https://www.chrono24.com/search/index.htm?query=${query}`
}

const RATIONALE_TEMPLATES: Record<string, string[]> = {
  'Diver': [
    'Preserves your dive slot while stepping into a more iconic tool watch. Same role, higher ceiling.',
    'Keeps water resistance and wearability intact while moving into a reference collectors actually talk about.',
  ],
  'GMT': [
    'Keeps your travel companion slot covered while moving into a more recognized GMT reference.',
    'Same dual-timezone utility, significantly more presence on the wrist and in conversation.',
  ],
  'Chronograph': [
    'Preserves your chrono slot while moving into a movement and case that defines the category.',
    'Keeps the sport complication slot filled while stepping into a reference with genuine heritage.',
  ],
  'Dress': [
    'Maintains your formal coverage while moving the finishing and complication quality up a tier.',
    'Same elegance in the rotation, but a movement and dial that reward closer inspection.',
  ],
  'Field': [
    'Keeps a legible, rugged daily in the box while stepping into a more iconic adventure reference.',
    'Preserves the casual tool slot without adding another diver or sport watch to an already-covered role.',
  ],
  'Pilot': [
    'Same legibility and field utility, significantly more movement and case quality.',
    'Keeps aviation DNA in the box while stepping into a reference pilots and collectors both respect.',
  ],
  'Integrated Bracelet': [
    'Preserves the versatile bracelet daily slot while moving into a reference that holds value.',
    'Same everyday wearability, considerably more presence and resale consideration.',
  ],
  'Sport': [
    'Keeps a capable sport watch in the rotation while stepping up the reference quality.',
    'Same versatility, more iconic execution.',
  ],
  'Vintage': [
    'Maintains the heritage slot in your box while moving into a more sought-after reference.',
    'Same vintage sensibility, more collectible provenance.',
  ],
}

export function getUpgradeRationale(watchType: string): string {
  const templates = RATIONALE_TEMPLATES[watchType]
    ?? ['Preserves this slot in your box while moving into a higher-tier reference. A natural next step.']
  return templates[Math.floor(Math.random() * templates.length)]
}

export const DISCOVER_DEMO_COLLECTION_IDS: string[] = [
  'seiko-alpinist-spb143',
  'tudor-black-bay-gmt',
  'tissot-prx-powermatic-80',
  'orient-bambino',
]

const MISSING_TYPE_PRIORITY: WatchType[] = [
  'Dress', 'GMT', 'Chronograph', 'Field', 'Diver', 'Pilot',
]

const MISSING_TYPE_COPY: Record<WatchType, string[]> = {
  'Dress': [
    'No dress watch in your box. Every serious collection needs one formal option.',
    'Your collection is missing a dress watch. Even a minimalist box benefits from a formal anchor.',
  ],
  'GMT': [
    'Three time zones, no GMT. A travel watch changes how you think about wearing.',
    'No GMT in the lineup. Even occasional travelers find it the most-worn complication.',
  ],
  'Chronograph': [
    'Your box has no chronograph. The sport complication slot is worth filling.',
    'No chrono in the rotation. The category contains some of the most collected references in horology.',
  ],
  'Field': [
    'No field watch. A legible daily tool rounds out any box.',
    'Missing a field watch. The slot most collectors actually wear day-to-day.',
  ],
  'Diver': [
    'No diver. The foundation of most serious collections.',
    'Your box has no diver. The category that built modern tool-watch collecting.',
  ],
  'Pilot': [
    'No pilot watch. The category combines legibility and historic design language.',
    'Missing a pilot. A different kind of legibility, and a different kind of provenance.',
  ],
  'Sport': [
    'No sport watch in the lineup. The slot most collectors fall back on as a daily.',
    'Your box could use a sport watch. Versatile and underrated.',
  ],
  'Integrated Bracelet': [
    'No integrated-bracelet daily. The hardest slot to ignore once you own one.',
    'Your collection is missing the integrated-bracelet category collectors keep coming back to.',
  ],
  'Vintage': [
    'No vintage piece. A heritage reference adds depth to any modern lineup.',
    'Your collection has no vintage anchor. Worth the slot.',
  ],
}

export function getBoxInsight(
  collectionWatches: CatalogWatch[],
  allWatches: CatalogWatch[],
): { missingType: WatchType; suggestion: CatalogWatch; copy: string } | null {
  const ownedTypes = new Set(collectionWatches.map(w => w.watchType))
  for (const type of MISSING_TYPE_PRIORITY) {
    if (ownedTypes.has(type)) continue
    const candidates = allWatches
      .filter(w => w.watchType === type)
      .sort((a, b) => a.estimatedValue - b.estimatedValue)
    if (candidates.length === 0) continue
    const suggestion = candidates[0]
    const copies = MISSING_TYPE_COPY[type]
    const copy = copies[Math.floor(Math.random() * copies.length)]
    return { missingType: type, suggestion, copy }
  }
  return null
}

export type UpgradeSuggestion = {
  ownedWatch: CatalogWatch
  upgradeWatch: CatalogWatch
  headline: string
  balanceNote: string
  isGrail: boolean
  isTarget: boolean
  isJewel: boolean
}

function findHardcodedUpgrade(
  ownedId: string,
  ownedIds: Set<string>,
  watchById: Map<string, CatalogWatch>,
): CatalogWatch | null {
  const chain = UPGRADE_PATHS[ownedId]
  if (!chain) return null
  for (const candidateId of chain) {
    if (ownedIds.has(candidateId)) continue
    const watch = watchById.get(candidateId)
    if (watch) return watch
  }
  return null
}

function findAlgorithmicUpgrade(
  owned: CatalogWatch,
  ownedIds: Set<string>,
  collectionWatches: CatalogWatch[],
  allWatches: CatalogWatch[],
): CatalogWatch | null {
  const ownedTier = BRAND_TIERS[owned.brand] ?? 1
  const sameTypeOwnedCount = collectionWatches.filter(w => w.watchType === owned.watchType).length
  if (sameTypeOwnedCount > 2) return null

  const candidates = allWatches
    .filter(w => !ownedIds.has(w.id))
    .filter(w => w.watchType === owned.watchType)
    .filter(w => w.estimatedValue >= owned.estimatedValue * 1.2)
    .filter(w => (BRAND_TIERS[w.brand] ?? 1) >= ownedTier)
    .sort((a, b) => a.estimatedValue - b.estimatedValue)

  return candidates[0] ?? null
}

export function getUpgradeSuggestions(
  collectionWatches: CatalogWatch[],
  allWatches: CatalogWatch[],
  _followedWatchIds: string[],
  jewelWatchId: string | null,
  grailWatchId: string | null,
  targetWatchIds: string[],
): UpgradeSuggestion[] {
  const ownedIds = new Set(collectionWatches.map(w => w.id))
  const watchById = new Map(allWatches.map(w => [w.id, w] as const))
  const targetSet = new Set(targetWatchIds)
  const suggestions: UpgradeSuggestion[] = []
  const usedUpgradeIds = new Set<string>()

  for (const owned of collectionWatches) {
    if (suggestions.length >= 3) break
    if (jewelWatchId && owned.id === jewelWatchId) continue

    const upgrade =
      findHardcodedUpgrade(owned.id, ownedIds, watchById)
      ?? findAlgorithmicUpgrade(owned, ownedIds, collectionWatches, allWatches)

    if (!upgrade) continue
    if (usedUpgradeIds.has(upgrade.id)) continue
    usedUpgradeIds.add(upgrade.id)

    suggestions.push({
      ownedWatch: owned,
      upgradeWatch: upgrade,
      headline: `Upgrade your ${owned.watchType}`,
      balanceNote: getUpgradeRationale(owned.watchType),
      isGrail: grailWatchId === upgrade.id,
      isTarget: targetSet.has(upgrade.id),
      isJewel: false,
    })
  }

  return suggestions
}

export function getNextSlotRecommendations(
  collectionWatches: CatalogWatch[],
  followedWatchIds: string[],
  allWatches: CatalogWatch[],
  count = 6,
): CatalogWatch[] {
  const ownedIds = new Set(collectionWatches.map(w => w.id))
  const followedIds = new Set(followedWatchIds)

  const typeCounts = new Map<WatchType, number>()
  for (const w of collectionWatches) {
    typeCounts.set(w.watchType, (typeCounts.get(w.watchType) ?? 0) + 1)
  }
  const minCount = collectionWatches.length === 0
    ? 0
    : Math.min(...Array.from(typeCounts.values()))

  const eligible = allWatches.filter(w => !ownedIds.has(w.id))

  const scored = eligible.map(w => {
    const typeCount = typeCounts.get(w.watchType) ?? 0
    const underrepBonus = typeCount === minCount ? 2 : typeCount <= minCount + 1 ? 1 : 0
    const followedPenalty = followedIds.has(w.id) ? -1 : 0
    const tier = BRAND_TIERS[w.brand] ?? 1
    return {
      watch: w,
      score: underrepBonus + followedPenalty + tier * 0.3 + Math.random() * 0.5,
    }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, count).map(s => s.watch)
}

export function getTargetOpportunities(
  targets: WatchTarget[],
  grailWatchId: string | null,
  allWatches: CatalogWatch[],
): { watch: CatalogWatch; isGrail: boolean; targetPrice?: number }[] {
  const watchById = new Map(allWatches.map(w => [w.id, w] as const))
  const out: { watch: CatalogWatch; isGrail: boolean; targetPrice?: number }[] = []

  if (grailWatchId) {
    const grail = watchById.get(grailWatchId)
    if (grail) out.push({ watch: grail, isGrail: true })
  }

  for (const target of targets) {
    if (out.length >= 3) break
    if (target.watchId === grailWatchId) continue
    const watch = watchById.get(target.watchId)
    if (watch) out.push({ watch, isGrail: false, targetPrice: target.targetPrice })
  }

  return out.slice(0, 3)
}
