import type { CatalogWatch } from '@/types/watch'
import { SEEDED_OWNED_WATCHES } from './collectionData'
import { createSeededPlaygroundBoxes } from './playgroundData'

/**
 * Editorial heat score for the admin photo-intake backlog.
 *
 * Inputs are entirely static today — brand tier + a small bonus for watches
 * that already appear in the seeded demo data. No DB roundtrip. When we have
 * real per-watch signal in `watch_states`, swap the bonus for a Supabase
 * aggregate and pass the count in via the second arg.
 *
 * Returned score is roughly 0–100 (can exceed 100 for popular seeded items).
 */

type Tier = 'A' | 'B' | 'C' | 'D'

const TIER_SCORE: Record<Tier, number> = {
  A: 100,
  B: 75,
  C: 50,
  D: 25,
}

const BRAND_TIER: Record<string, Tier> = {
  // Tier A — top-tier prestige
  'Rolex': 'A',
  'Patek Philippe': 'A',
  'Audemars Piguet': 'A',
  'A. Lange & Söhne': 'A',
  'Vacheron Constantin': 'A',
  'Richard Mille': 'A',
  'F.P. Journe': 'A',

  // Tier B — high-end mainstream
  'Omega': 'B',
  'IWC': 'B',
  'Jaeger-LeCoultre': 'B',
  'Cartier': 'B',
  'Tudor': 'B',
  'Panerai': 'B',
  'Breitling': 'B',
  'Grand Seiko': 'B',
  'Zenith': 'B',
  'Blancpain': 'B',
  'Ulysse Nardin': 'B',
  'Hublot': 'B',

  // Tier C — mid-tier enthusiast
  'TAG Heuer': 'C',
  'Longines': 'C',
  'Oris': 'C',
  'Bulgari': 'C',
  'Bell & Ross': 'C',
  'Chopard': 'C',
  'Glashütte Original': 'C',
  'Nomos': 'C',
  'Hermès': 'C',
  'Sinn': 'C',

  // Tier D — entry / fashion / heritage
  'Tissot': 'D',
  'Hamilton': 'D',
  'Seiko': 'D',
  'Orient': 'D',
  'Frederique Constant': 'D',
  'Mido': 'D',
  'Citizen': 'D',
}

const DEFAULT_TIER: Tier = 'C'

const SEEDED_WATCH_IDS: Set<string> = (() => {
  const ids = new Set<string>()
  for (const owned of SEEDED_OWNED_WATCHES) ids.add(owned.watchId)
  for (const box of createSeededPlaygroundBoxes()) {
    for (const entry of box.entries) ids.add(entry.watchId)
  }
  return ids
})()

const SEED_BONUS = 15

export function brandTier(brand: string): Tier {
  return BRAND_TIER[brand] ?? DEFAULT_TIER
}

// Order-of-magnitude rescale: the backend score (scripts/heat-score.ts) is
// 0-1000; the legacy tier fallback is 0-115. Without this multiplier, every
// watch that has a backend score would dominate every watch that doesn't,
// regardless of actual ranking. ×8 brings the tier fallback to ~0-920 so a
// mixed pool ranks coherently while the backend score still wins when
// signals warrant it.
const TIER_FALLBACK_SCALE = 8

export function heatScore(watch: Pick<CatalogWatch, 'id' | 'brand' | 'market'>): number {
  if (watch.market?.heatScore != null) return watch.market.heatScore
  let score = TIER_SCORE[brandTier(watch.brand)]
  if (SEEDED_WATCH_IDS.has(watch.id)) score += SEED_BONUS
  return score * TIER_FALLBACK_SCALE
}

export function tierLabel(tier: Tier): string {
  return tier
}

export function isSeededWatch(watchId: string): boolean {
  return SEEDED_WATCH_IDS.has(watchId)
}
