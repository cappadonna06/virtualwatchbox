import type { CatalogWatch, OwnedWatch, ResolvedOwnedWatch, ResolvedWatch, WatchCondition } from '@/types/watch'

export const DEFAULT_RESOLVED_WATCH_CONDITION: WatchCondition = 'Excellent'

export function createCatalogWatchMap(catalog: CatalogWatch[]) {
  return new Map(catalog.map(watch => [watch.id, watch]))
}

// Centralized value resolution. Reads market.marketValueUsd when present,
// then falls back to msrpAtLaunchUsd, then the legacy estimatedValue field.
// Used by stat tiles and any callsite that doesn't already do its own join.
export function resolveCatalogValue(watch: CatalogWatch): number {
  const market = watch.market?.marketValueUsd
  if (typeof market === 'number' && market > 0) return market
  const msrp = watch.msrpAtLaunchUsd
  if (typeof msrp === 'number' && msrp > 0) return msrp
  return typeof watch.estimatedValue === 'number' ? watch.estimatedValue : 0
}

export function createCatalogDisplayWatch(watch: CatalogWatch): ResolvedWatch {
  return {
    ...watch,
    estimatedValue: resolveCatalogValue(watch),
    market: watch.market,
    id: watch.id,
    watchId: watch.id,
    condition: DEFAULT_RESOLVED_WATCH_CONDITION,
    notes: '',
  }
}

export function resolveOwnedWatch(
  ownedWatch: OwnedWatch,
  catalog: CatalogWatch[] | Map<string, CatalogWatch>,
  primaryPhotoByOwnedId?: Map<string, string>,
): ResolvedOwnedWatch | null {
  const sourceWatch = catalog instanceof Map
    ? catalog.get(ownedWatch.watchId)
    : catalog.find(watch => watch.id === ownedWatch.watchId)

  if (!sourceWatch) return null

  // Image fallback chain (highest priority first):
  //   1. Catalog imageUrl       — admin curated, always wins
  //   2. Primary gallery photo  — user's chosen primary from user_watch_photos
  //   3. Legacy ownedWatch.photoUrl — kept during the gallery transition
  //   4. SVG dial fallback      — handled downstream by WatchImageOrDial
  const galleryPrimary = primaryPhotoByOwnedId?.get(ownedWatch.id)
  const imageUrl = sourceWatch.imageUrl || galleryPrimary || ownedWatch.photoUrl || undefined

  return {
    ...sourceWatch,
    estimatedValue: resolveCatalogValue(sourceWatch),
    market: sourceWatch.market,
    imageUrl,
    id: ownedWatch.id,
    watchId: sourceWatch.id,
    condition: ownedWatch.condition,
    purchaseDate: ownedWatch.purchaseDate,
    purchasePrice: ownedWatch.purchasePrice,
    notes: ownedWatch.notes,
    ownershipStatus: ownedWatch.ownershipStatus,
    slot: ownedWatch.slot,
    acquisitionMethod: ownedWatch.acquisitionMethod,
    hasBox: ownedWatch.hasBox,
    hasPapers: ownedWatch.hasPapers,
    warrantyExpiresAt: ownedWatch.warrantyExpiresAt,
    lastServicedAt: ownedWatch.lastServicedAt,
    serviceNotes: ownedWatch.serviceNotes,
  }
}

export function resolveOwnedWatches(
  ownedWatches: OwnedWatch[],
  catalog: CatalogWatch[] | Map<string, CatalogWatch>,
  primaryPhotoByOwnedId?: Map<string, string>,
) {
  return ownedWatches
    .map(watch => resolveOwnedWatch(watch, catalog, primaryPhotoByOwnedId))
    .filter((watch): watch is ResolvedOwnedWatch => watch !== null)
}

export function resolveCatalogWatchId(entryId: string, catalogIds: string[]) {
  if (catalogIds.includes(entryId)) return entryId

  const match = [...catalogIds]
    .sort((a, b) => b.length - a.length)
    .find(catalogId => entryId.startsWith(`${catalogId}-`))

  return match ?? null
}
