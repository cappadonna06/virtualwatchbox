import type { ResolvedOwnedWatch } from '@/types/watch'
import { watches as catalogWatches } from '@/lib/watches'
import { DISCOVER_DEMO_COLLECTION_IDS } from '@/lib/discover'

/**
 * Unique brand list from a user's collection, in order of first appearance.
 */
export function getCollectionBrands(watches: Pick<ResolvedOwnedWatch, 'brand'>[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const w of watches) {
    const b = w.brand?.trim()
    if (!b || seen.has(b)) continue
    seen.add(b)
    out.push(b)
  }
  return out
}

/**
 * Brands from the demo Discover collection — used as a fallback "For You" feed
 * for guests so the page never feels empty.
 */
export function getDemoCollectionBrands(): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of DISCOVER_DEMO_COLLECTION_IDS) {
    const w = catalogWatches.find((c) => c.id === id)
    if (!w?.brand) continue
    if (seen.has(w.brand)) continue
    seen.add(w.brand)
    out.push(w.brand)
  }
  return out
}
