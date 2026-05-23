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
    'Keeps the sport complication slot covered while stepping into a reference with genuine heritage.',
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

// Deterministic FNV-1a-ish string hash. We use this anywhere a "random"
// pick would otherwise diverge between SSR and client hydration. Seeding
// off the watch id (or another stable key) makes the same render twice.
function stringHash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function getUpgradeRationale(watchType: string, seedKey = ''): string {
  const templates = RATIONALE_TEMPLATES[watchType]
    ?? ['Preserves this slot in your box while moving into a higher-tier reference. A natural next step.']
  return templates[stringHash(`${watchType}::${seedKey}`) % templates.length]
}

export const DISCOVER_DEMO_COLLECTION_IDS: string[] = [
  'seiko-alpinist-spb143',
  'tudor-black-bay-gmt',
  'tissot-prx-powermatic-80',
  'orient-bambino',
]

// Heat-driven demo collection. When the user is signed out or has an empty
// box, /discover needs *something* to anchor the algorithms — the lead pick
// needs a missing gap, the upgrade row needs a from-watch, etc. Previously
// this looked up the four hard-coded DISCOVER_DEMO_COLLECTION_IDS in the
// static 87-watch seed; this version draws from whatever catalog the caller
// supplies (the dynamic Supabase top-2000 in production) and prefers
// type-diverse, high-heat watches that also have a resolvable image. Result
// feels like a real collector's starter box without depending on the seed.
export function pickDemoCollection(
  allWatches: CatalogWatch[],
  options: { hasImage?: (w: CatalogWatch) => boolean; count?: number } = {},
): CatalogWatch[] {
  const count = options.count ?? 4
  const ranked = [...allWatches]
    .filter(w => Boolean(w.watchType))
    .filter(w => options.hasImage ? options.hasImage(w) : Boolean(w.imageUrl))
    .sort((a, b) => (b.market?.heatScore ?? 0) - (a.market?.heatScore ?? 0))

  if (ranked.length === 0) return []

  // Type-diverse pass: take the top-heat watch of each unique type first.
  const picked: CatalogWatch[] = []
  const seenTypes = new Set<WatchType>()
  for (const w of ranked) {
    if (picked.length >= count) break
    const t = w.watchType as WatchType
    if (seenTypes.has(t)) continue
    seenTypes.add(t)
    picked.push(w)
  }
  // Fill any remaining slots with the next-best regardless of type.
  for (const w of ranked) {
    if (picked.length >= count) break
    if (picked.find(p => p.id === w.id)) continue
    picked.push(w)
  }
  return picked
}

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
    'Your collection has no chronograph. The sport complication slot is worth claiming.',
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

export type PriceAnchor = {
  median: number
  target: number
  floor: number
  ceiling: number
}

export function collectionPriceAnchor(collection: CatalogWatch[]): PriceAnchor | null {
  const values = collection
    .map(w => w.estimatedValue)
    .filter(v => typeof v === 'number' && v > 0)
    .sort((a, b) => a - b)
  if (values.length === 0) return null
  const median = values[Math.floor(values.length / 2)]
  return {
    median,
    target: Math.round(median * 1.15),
    floor: Math.max(Math.round(median * 0.5), 200),
    ceiling: Math.round(median * 5),
  }
}

function priceScore(value: number, anchor: PriceAnchor): number {
  const dist = Math.abs(value - anchor.target)
  return value < anchor.target ? dist * 1.2 : dist
}

export type SelectionOptions = {
  hasImage?: (watch: CatalogWatch) => boolean
  priceAnchor?: PriceAnchor | null
}

function passesImage(watch: CatalogWatch, hasImage?: (w: CatalogWatch) => boolean): boolean {
  if (hasImage) return hasImage(watch)
  return Boolean(watch.imageUrl)
}

export type BoxInsight = {
  missingType: WatchType
  suggestion: CatalogWatch
  suggestionPool: CatalogWatch[]
  copy: string
}

const BOX_INSIGHT_POOL_SIZE = 10

export function getBoxInsight(
  collectionWatches: CatalogWatch[],
  allWatches: CatalogWatch[],
  options: SelectionOptions = {},
): BoxInsight | null {
  const ownedTypes = new Set(collectionWatches.map(w => w.watchType))
  const ownedFamilies = new Set(collectionWatches.map(w => modelFamilyKey(w)))
  const anchor = options.priceAnchor ?? collectionPriceAnchor(collectionWatches)

  for (const type of MISSING_TYPE_PRIORITY) {
    if (ownedTypes.has(type)) continue

    let candidates = allWatches
      .filter(w => w.watchType === type)
      .filter(w => passesImage(w, options.hasImage))
      .filter(w => !ownedFamilies.has(modelFamilyKey(w)))

    if (anchor) {
      const inBand = candidates.filter(w => w.estimatedValue >= anchor.floor && w.estimatedValue <= anchor.ceiling)
      if (inBand.length > 0) candidates = inBand
      // Lower is better. Heat score (0–1) discounts the effective price-distance
      // by up to ~$1500-worth — keeps the band-anchor honest while letting
      // popular references win against equally-priced obscure ones.
      const scoreFor = (w: CatalogWatch) =>
        priceScore(w.estimatedValue, anchor) - (w.market?.heatScore ?? 0) * 1500
      candidates.sort((a, b) => scoreFor(a) - scoreFor(b))
    } else {
      candidates.sort((a, b) => {
        if (a.estimatedValue !== b.estimatedValue) return a.estimatedValue - b.estimatedValue
        return (b.market?.heatScore ?? 0) - (a.market?.heatScore ?? 0)
      })
    }

    if (candidates.length === 0) continue
    const suggestionPool = candidates.slice(0, BOX_INSIGHT_POOL_SIZE)
    const suggestion = suggestionPool[0]
    const copies = MISSING_TYPE_COPY[type]
    // Deterministic copy choice keyed off the suggestion id so SSR and
    // hydration agree, but the string still rotates as the suggestion
    // changes (different missing-type, different watch).
    const copy = copies[stringHash(`${type}::${suggestion.id}`) % copies.length]
    return { missingType: type, suggestion, suggestionPool, copy }
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

export type UpgradeSuggestionPool = {
  ownedWatch: CatalogWatch
  upgradePool: CatalogWatch[]
  headline: string
}

const UPGRADE_POOL_SIZE = 10
const MAX_UPGRADE_CARDS = 3

function findHardcodedUpgrade(
  owned: CatalogWatch,
  ownedIds: Set<string>,
  watchById: Map<string, CatalogWatch>,
  hasImage?: (w: CatalogWatch) => boolean,
): CatalogWatch | null {
  const chain = UPGRADE_PATHS[owned.id]
  if (!chain) return null
  const ownedFamily = modelFamilyKey(owned)
  for (const candidateId of chain) {
    if (ownedIds.has(candidateId)) continue
    const watch = watchById.get(candidateId)
    if (!watch || !passesImage(watch, hasImage)) continue
    if (modelFamilyKey(watch) === ownedFamily) continue
    return watch
  }
  return null
}

function findHardcodedUpgradePool(
  owned: CatalogWatch,
  ownedIds: Set<string>,
  watchById: Map<string, CatalogWatch>,
  hasImage?: (w: CatalogWatch) => boolean,
): CatalogWatch[] {
  const chain = UPGRADE_PATHS[owned.id]
  if (!chain) return []
  const ownedFamily = modelFamilyKey(owned)
  const out: CatalogWatch[] = []
  for (const candidateId of chain) {
    if (ownedIds.has(candidateId)) continue
    const watch = watchById.get(candidateId)
    if (!watch || !passesImage(watch, hasImage)) continue
    if (modelFamilyKey(watch) === ownedFamily) continue
    out.push(watch)
  }
  return out
}

function normalizeModel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function modelFamilyKey(watch: CatalogWatch): string {
  const family = watch.modelFamily?.trim()
  if (family) return `${watch.brand.toLowerCase()}::${family.toLowerCase()}`
  return `${watch.brand.toLowerCase()}::${normalizeModel(watch.model)}`
}

function findAlgorithmicUpgrade(
  owned: CatalogWatch,
  ownedIds: Set<string>,
  collectionWatches: CatalogWatch[],
  allWatches: CatalogWatch[],
  hasImage?: (w: CatalogWatch) => boolean,
): CatalogWatch | null {
  const pool = findAlgorithmicUpgradePool(owned, ownedIds, collectionWatches, allWatches, hasImage)
  return pool[0] ?? null
}

function findAlgorithmicUpgradePool(
  owned: CatalogWatch,
  ownedIds: Set<string>,
  collectionWatches: CatalogWatch[],
  allWatches: CatalogWatch[],
  hasImage?: (w: CatalogWatch) => boolean,
): CatalogWatch[] {
  const ownedTier = BRAND_TIERS[owned.brand] ?? 1
  const sameTypeOwnedCount = collectionWatches.filter(w => w.watchType === owned.watchType).length
  if (sameTypeOwnedCount > 2) return []

  const ownedFamily = modelFamilyKey(owned)
  const ownedBrandLower = owned.brand.toLowerCase()

  const idealTarget = owned.estimatedValue * 2
  const minVal = owned.estimatedValue * 1.3
  const maxVal = owned.estimatedValue * 4

  const baseFilter = (w: CatalogWatch) =>
    !ownedIds.has(w.id) &&
    passesImage(w, hasImage) &&
    w.watchType === owned.watchType &&
    (BRAND_TIERS[w.brand] ?? 1) >= ownedTier &&
    modelFamilyKey(w) !== ownedFamily

  // Hard cap at 4x — better to show no upgrade card than recommend an 8x stretch
  // ("upgrade your $4K Aqua Terra to a $36K Patek" is not useful advice).
  const pool = allWatches.filter(w => baseFilter(w) && w.estimatedValue >= minVal && w.estimatedValue <= maxVal)
  if (pool.length === 0) return []

  const differentBrand = pool.filter(w => w.brand.toLowerCase() !== ownedBrandLower)
  const tier = differentBrand.length > 0 ? differentBrand : pool

  // Distance from ideal target dominates; high heat shaves up to ~$1500
  // from the effective distance so popular references break ties.
  const scoreFor = (w: CatalogWatch) =>
    Math.abs(w.estimatedValue - idealTarget) - (w.market?.heatScore ?? 0) * 1500
  const ranked = [...tier].sort((a, b) => scoreFor(a) - scoreFor(b))
  return ranked
}

export function getUpgradeSuggestions(
  collectionWatches: CatalogWatch[],
  allWatches: CatalogWatch[],
  _followedWatchIds: string[],
  jewelWatchId: string | null,
  grailWatchId: string | null,
  targetWatchIds: string[],
  options: SelectionOptions = {},
): UpgradeSuggestion[] {
  const pools = getUpgradeSuggestionPools(collectionWatches, allWatches, jewelWatchId, options)
  const targetSet = new Set(targetWatchIds)
  const suggestions: UpgradeSuggestion[] = []
  const usedUpgradeIds = new Set<string>()

  for (const pool of pools) {
    if (suggestions.length >= MAX_UPGRADE_CARDS) break
    const upgrade = pool.upgradePool.find(w => !usedUpgradeIds.has(w.id))
    if (!upgrade) continue
    usedUpgradeIds.add(upgrade.id)
    suggestions.push({
      ownedWatch: pool.ownedWatch,
      upgradeWatch: upgrade,
      headline: pool.headline,
      balanceNote: getUpgradeRationale(pool.ownedWatch.watchType, `${pool.ownedWatch.id}->${upgrade.id}`),
      isGrail: grailWatchId === upgrade.id,
      isTarget: targetSet.has(upgrade.id),
      isJewel: false,
    })
  }

  return suggestions
}

// Build ranked pools (up to 10 picks per owned watch) so /discover can rotate
// daily and respond to "Refresh" without losing the per-owned-watch grouping.
// Pools are returned in collection order; render-time pickers decide which
// pools to surface and which element to show. Hardcoded chain picks always
// come first (curated stories), followed by algorithmic matches.
export function getUpgradeSuggestionPools(
  collectionWatches: CatalogWatch[],
  allWatches: CatalogWatch[],
  jewelWatchId: string | null,
  options: SelectionOptions = {},
): UpgradeSuggestionPool[] {
  const ownedIds = new Set(collectionWatches.map(w => w.id))
  const watchById = new Map(allWatches.map(w => [w.id, w] as const))
  const out: UpgradeSuggestionPool[] = []

  for (const owned of collectionWatches) {
    if (jewelWatchId && owned.id === jewelWatchId) continue

    const hardcoded = findHardcodedUpgradePool(owned, ownedIds, watchById, options.hasImage)
    const algorithmic = findAlgorithmicUpgradePool(owned, ownedIds, collectionWatches, allWatches, options.hasImage)

    const seen = new Set<string>()
    const pool: CatalogWatch[] = []
    for (const w of [...hardcoded, ...algorithmic]) {
      if (seen.has(w.id)) continue
      seen.add(w.id)
      pool.push(w)
      if (pool.length >= UPGRADE_POOL_SIZE) break
    }
    if (pool.length === 0) continue

    out.push({
      ownedWatch: owned,
      upgradePool: pool,
      headline: `Upgrade your ${owned.watchType}`,
    })
  }

  return out
}

export type NextSlotPool = {
  watchType: WatchType | 'Other'
  pool: CatalogWatch[]
}

const NEXT_SLOT_POOL_SIZE = 10

// Like getNextSlotRecommendations but returns the per-type ranked pools that
// feed the daily rotation + refresh button. Caller picks one watch per type.
export function getNextSlotPools(
  collectionWatches: CatalogWatch[],
  followedWatchIds: string[],
  allWatches: CatalogWatch[],
  options: SelectionOptions = {},
): NextSlotPool[] {
  const ownedIds = new Set(collectionWatches.map(w => w.id))
  const ownedFamilyKeys = new Set(
    collectionWatches.map(w => modelFamilyKey(w)),
  )
  const followedIds = new Set(followedWatchIds)
  const anchor = options.priceAnchor ?? collectionPriceAnchor(collectionWatches)

  const typeCounts = new Map<WatchType, number>()
  for (const w of collectionWatches) {
    typeCounts.set(w.watchType, (typeCounts.get(w.watchType) ?? 0) + 1)
  }
  const minOwnedCount = collectionWatches.length === 0
    ? 0
    : Math.min(...Array.from(typeCounts.values()))

  const notOwned = (w: CatalogWatch) =>
    !ownedIds.has(w.id) &&
    !ownedFamilyKeys.has(modelFamilyKey(w))

  const eligible = allWatches
    .filter(notOwned)
    .filter(w => passesImage(w, options.hasImage))
    .filter(w => !anchor || (w.estimatedValue >= anchor.floor && w.estimatedValue <= anchor.ceiling))

  const pool = eligible.length > 0
    ? eligible
    : allWatches.filter(notOwned).filter(w => passesImage(w, options.hasImage))

  const scored = pool.map(w => {
    const typeCount = typeCounts.get(w.watchType) ?? 0
    const underrepBonus = typeCount === 0
      ? 3
      : typeCount === minOwnedCount
        ? 1
        : 0
    const followedPenalty = followedIds.has(w.id) ? -1 : 0
    const tier = BRAND_TIERS[w.brand] ?? 1
    const priceBonus = anchor
      ? 2 - Math.min(2, priceScore(w.estimatedValue, anchor) / Math.max(anchor.target, 1))
      : 0
    const heatBonus = (w.market?.heatScore ?? 0) * 1.2
    const jitter = (stringHash(w.id) % 1000) / 5000
    return {
      watch: w,
      score: underrepBonus + followedPenalty + tier * 0.3 + priceBonus + heatBonus + jitter,
    }
  })

  scored.sort((a, b) => b.score - a.score)

  const seenModels = new Set<string>()
  const buckets = new Map<WatchType | 'Other', CatalogWatch[]>()
  for (const s of scored) {
    const key = modelFamilyKey(s.watch)
    if (seenModels.has(key)) continue
    seenModels.add(key)
    const t: WatchType | 'Other' = s.watch.watchType ?? 'Other'
    const bucket = buckets.get(t) ?? []
    if (bucket.length < NEXT_SLOT_POOL_SIZE) {
      bucket.push(s.watch)
      buckets.set(t, bucket)
    }
  }

  // Preserve type-discovery order: pools surface in the order their top-ranked
  // watch appears in the global sort.
  const typeOrder: (WatchType | 'Other')[] = []
  const seenTypes = new Set<WatchType | 'Other'>()
  for (const s of scored) {
    const t: WatchType | 'Other' = s.watch.watchType ?? 'Other'
    if (seenTypes.has(t)) continue
    seenTypes.add(t)
    typeOrder.push(t)
  }

  return typeOrder
    .map(t => ({ watchType: t, pool: buckets.get(t) ?? [] }))
    .filter(p => p.pool.length > 0)
}

export function getNextSlotRecommendations(
  collectionWatches: CatalogWatch[],
  followedWatchIds: string[],
  allWatches: CatalogWatch[],
  count = 6,
  options: SelectionOptions = {},
): CatalogWatch[] {
  const ownedIds = new Set(collectionWatches.map(w => w.id))
  const ownedFamilyKeys = new Set(
    collectionWatches.map(w => modelFamilyKey(w)),
  )
  const followedIds = new Set(followedWatchIds)
  const anchor = options.priceAnchor ?? collectionPriceAnchor(collectionWatches)

  const typeCounts = new Map<WatchType, number>()
  for (const w of collectionWatches) {
    typeCounts.set(w.watchType, (typeCounts.get(w.watchType) ?? 0) + 1)
  }
  const minOwnedCount = collectionWatches.length === 0
    ? 0
    : Math.min(...Array.from(typeCounts.values()))

  const notOwned = (w: CatalogWatch) =>
    !ownedIds.has(w.id) &&
    !ownedFamilyKeys.has(modelFamilyKey(w))

  const eligible = allWatches
    .filter(notOwned)
    .filter(w => passesImage(w, options.hasImage))
    .filter(w => !anchor || (w.estimatedValue >= anchor.floor && w.estimatedValue <= anchor.ceiling))

  const pool = eligible.length > 0
    ? eligible
    : allWatches.filter(notOwned).filter(w => passesImage(w, options.hasImage))

  const scored = pool.map(w => {
    const typeCount = typeCounts.get(w.watchType) ?? 0
    // Reward types the user does NOT own. Equal-count types get a smaller bonus.
    const underrepBonus = typeCount === 0
      ? 3
      : typeCount === minOwnedCount
        ? 1
        : 0
    const followedPenalty = followedIds.has(w.id) ? -1 : 0
    const tier = BRAND_TIERS[w.brand] ?? 1
    const priceBonus = anchor
      ? 2 - Math.min(2, priceScore(w.estimatedValue, anchor) / Math.max(anchor.target, 1))
      : 0
    // Heat score is a 0–1 popularity signal from catalog_watch_market.
    // Treating it as a real "this watch is having a moment" lift gives us
    // natural variety without needing a non-deterministic random term.
    const heatBonus = (w.market?.heatScore ?? 0) * 1.2
    // Small deterministic jitter keyed off the id — keeps near-tied scores
    // from grouping by alphabetical id but is identical on SSR + client.
    const jitter = (stringHash(w.id) % 1000) / 5000
    return {
      watch: w,
      score: underrepBonus + followedPenalty + tier * 0.3 + priceBonus + heatBonus + jitter,
    }
  })

  scored.sort((a, b) => b.score - a.score)

  // Dedupe by normalized model — keep the best-scored variant per model.
  const seenModels = new Set<string>()
  const dedupedRanked: { watch: CatalogWatch; score: number }[] = []
  for (const s of scored) {
    const key = modelFamilyKey(s.watch)
    if (seenModels.has(key)) continue
    seenModels.add(key)
    dedupedRanked.push(s)
  }

  // Type variety pass: first pick the top-scored candidate of each unique
  // watch type, then fill remaining slots from the next-best regardless of
  // type. Without this, an underrep-heavy collection collapses into three
  // GMTs (or three of whatever happens to be missing).
  const result: CatalogWatch[] = []
  const seenTypes = new Set<WatchType | 'Other'>()
  const remainder: CatalogWatch[] = []
  for (const { watch } of dedupedRanked) {
    const t: WatchType | 'Other' = watch.watchType ?? 'Other'
    if (!seenTypes.has(t) && result.length < count) {
      seenTypes.add(t)
      result.push(watch)
    } else {
      remainder.push(watch)
    }
  }
  for (const w of remainder) {
    if (result.length >= count) break
    result.push(w)
  }
  return result
}

// ─── Editorial helpers (new) ─────────────────────────────────────────────

function modeOf<T extends string>(values: T[]): T | null {
  if (values.length === 0) return null
  const counts = new Map<T, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best: T | null = null
  let bestCount = 0
  for (const [v, c] of counts) {
    if (c > bestCount) { best = v; bestCount = c }
  }
  return best
}

function priceBand(median: number): string {
  if (median < 5_000)  return 'sub-$5K'
  if (median < 10_000) return 'sub-$10K'
  if (median < 25_000) return '$10K–$25K'
  return '$25K+'
}

function normalizeDial(color: string | undefined | null): string {
  if (!color) return ''
  const c = color.toLowerCase().trim()
  if (c.includes('blue'))   return 'blue'
  if (c.includes('black'))  return 'black'
  if (c.includes('white'))  return 'white'
  if (c.includes('silver')) return 'silver'
  if (c.includes('green'))  return 'green'
  if (c.includes('grey') || c.includes('gray')) return 'grey'
  if (c.includes('brown'))  return 'brown'
  if (c.includes('cream') || c.includes('ivory')) return 'cream'
  if (c.includes('champagne') || c.includes('gold')) return 'champagne'
  if (c.includes('salmon') || c.includes('orange') || c.includes('red')) return 'warm'
  return c.split(/\s+/)[0]
}

export function computeBoxRead(collection: CatalogWatch[]): string {
  if (collection.length === 0) return 'Editor’s curation, broad strokes'

  const parts: string[] = []

  const brandCounts = new Map<string, number>()
  for (const w of collection) brandCounts.set(w.brand, (brandCounts.get(w.brand) ?? 0) + 1)
  let topBrand: string | null = null
  let topBrandShare = 0
  for (const [b, c] of brandCounts) {
    const share = c / collection.length
    if (share > topBrandShare) { topBrand = b; topBrandShare = share }
  }
  if (topBrand && topBrandShare >= 0.4 && collection.length >= 3) {
    parts.push(`${topBrand}-anchored`)
  } else {
    const typeMode = modeOf(collection.map(w => w.watchType).filter((t): t is WatchType => Boolean(t)))
    if (typeMode) parts.push(`${typeMode}-led`)
  }

  const dialColors = collection.map(w => normalizeDial(w.dialColor)).filter(Boolean)
  const dialCounts = new Map<string, number>()
  for (const c of dialColors) dialCounts.set(c, (dialCounts.get(c) ?? 0) + 1)
  const dialRanked = Array.from(dialCounts.entries()).sort((a, b) => b[1] - a[1])
  if (dialRanked.length === 1 && dialRanked[0][1] >= 2) {
    parts.push(dialRanked[0][0])
  } else if (dialRanked.length >= 2 && dialRanked[0][1] + dialRanked[1][1] >= Math.max(2, collection.length * 0.5)) {
    parts.push(`${dialRanked[0][0]}–${dialRanked[1][0]}`)
  }

  const values = collection.map(w => w.estimatedValue).filter(v => v > 0).sort((a, b) => a - b)
  if (values.length > 0) {
    const median = values[Math.floor(values.length / 2)]
    parts.push(priceBand(median))
  }

  return parts.join(', ')
}

export function computeStrapSummary(collection: CatalogWatch[]): string {
  const lugs = collection.map(w => w.lugWidthMm).filter((n): n is number => typeof n === 'number')
  if (lugs.length === 0) return 'Swap-friendly across most boxes — bring your lug widths in by adding watches.'

  const counts = new Map<number, number>()
  for (const n of lugs) counts.set(n, (counts.get(n) ?? 0) + 1)
  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  const [topLug, topCount] = ranked[0]

  if (topCount === lugs.length) {
    return `All ${lugs.length} of your watches share ${topLug} mm lugs. Anything in this row will fit.`
  }
  return `${topCount} of your ${lugs.length} watches share ${topLug} mm lugs. Swap-friendly across most of your box.`
}

export function priceBandFor(watch: CatalogWatch): { low: number; high: number; median: number } {
  const median = watch.estimatedValue
  return {
    low: Math.round(median * 0.85),
    high: Math.round(median * 1.15),
    median,
  }
}

export function upgradeDeltaFor(from: CatalogWatch, to: CatalogWatch): string {
  const delta = to.estimatedValue - from.estimatedValue
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  return `${delta >= 0 ? '+' : '−'}${fmt.format(Math.abs(delta))}`
}

export function isAspirationalUpgrade(from: CatalogWatch, to: CatalogWatch): boolean {
  if (from.estimatedValue <= 0) return false
  return to.estimatedValue >= from.estimatedValue * 3
}

export function brandsOfInterest(collection: CatalogWatch[], topN = 3): string[] {
  if (collection.length === 0) return []
  const counts = new Map<string, number>()
  for (const w of collection) counts.set(w.brand, (counts.get(w.brand) ?? 0) + 1)
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([brand]) => brand)
}

export const PERSONALIZE_VERSION = 1

export function personalizeHash(input: {
  watchIds: string[]
  slotCount: number
  grailWatchId: string | null
  gapType: string | null
}): string {
  const sorted = [...input.watchIds].sort().join('|')
  return [
    sorted,
    String(input.slotCount),
    input.grailWatchId ?? '',
    input.gapType ?? '',
    `v${PERSONALIZE_VERSION}`,
  ].join('::')
}

const GENERIC_BYLINES = [
  'For the refined collector',
  'For the discerning wrist',
  'For the studied eye',
  'For the deliberate collector',
  'For the considered hand',
]

export function genericByline(): string {
  const dayStr = new Date().toDateString()
  let hash = 0
  for (let i = 0; i < dayStr.length; i += 1) hash = (hash * 31 + dayStr.charCodeAt(i)) | 0
  return GENERIC_BYLINES[Math.abs(hash) % GENERIC_BYLINES.length]
}

export function bestFitBoxIndex(slotCount: number, capacities: number[]): number {
  let bestIdx = 0
  let bestDist = Infinity
  for (let i = 0; i < capacities.length; i += 1) {
    const dist = Math.abs(capacities[i] - slotCount)
    if (dist < bestDist || (dist === bestDist && capacities[i] < capacities[bestIdx])) {
      bestDist = dist
      bestIdx = i
    }
  }
  return bestIdx
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
