import type { CatalogWatch, OwnedWatch, ResolvedOwnedWatch, ResolvedWatch, WatchCondition } from '@/types/watch'

export const DEFAULT_RESOLVED_WATCH_CONDITION: WatchCondition = 'Excellent'

export function createCatalogWatchMap(catalog: CatalogWatch[]) {
  return new Map(catalog.map(watch => [watch.id, watch]))
}

export function createCatalogDisplayWatch(watch: CatalogWatch): ResolvedWatch {
  return {
    ...watch,
    id: watch.id,
    watchId: watch.id,
    condition: DEFAULT_RESOLVED_WATCH_CONDITION,
    notes: '',
  }
}

export function resolveOwnedWatch(
  ownedWatch: OwnedWatch,
  catalog: CatalogWatch[] | Map<string, CatalogWatch>,
): ResolvedOwnedWatch | null {
  const sourceWatch = catalog instanceof Map
    ? catalog.get(ownedWatch.watchId)
    : catalog.find(watch => watch.id === ownedWatch.watchId)

  if (!sourceWatch) return null

  return {
    ...sourceWatch,
    id: ownedWatch.id,
    watchId: sourceWatch.id,
    condition: ownedWatch.condition,
    purchaseDate: ownedWatch.purchaseDate,
    purchasePrice: ownedWatch.purchasePrice,
    notes: ownedWatch.notes,
    ownershipStatus: ownedWatch.ownershipStatus,
  }
}

export function resolveOwnedWatches(
  ownedWatches: OwnedWatch[],
  catalog: CatalogWatch[] | Map<string, CatalogWatch>,
) {
  return ownedWatches
    .map(watch => resolveOwnedWatch(watch, catalog))
    .filter((watch): watch is ResolvedOwnedWatch => watch !== null)
}

export function resolveCatalogWatchId(entryId: string, catalogIds: string[]) {
  if (catalogIds.includes(entryId)) return entryId

  const match = [...catalogIds]
    .sort((a, b) => b.length - a.length)
    .find(catalogId => entryId.startsWith(`${catalogId}-`))

  return match ?? null
}
