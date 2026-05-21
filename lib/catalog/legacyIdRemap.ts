// The 87-watch seed catalog was canonicalized to {brand}-{ref} IDs by
// scripts/migrateCatalogIds.ts. That script rewrote source code, image
// filenames, and the manifest, but did NOT migrate user data — user rows in
// Supabase (`public.watches.catalog_id`, `public.watch_states.catalog_watch_id`)
// and guest sessionStorage snapshots still reference the OLD IDs. Without a
// remap step at the load boundary, those IDs miss the current catalog and the
// watches silently drop out at render time (see lib/watchData.ts).
//
// This helper applies the committed rename map. It is a finite, terminal,
// forward-only map — safe to call unconditionally; non-legacy IDs pass through.
import migrationMap from '@/data/catalog-id-migration.json'

type MigrationEntry = {
  newId: string
  newSlug: string
  brand: string
  model: string
  reference: string
}

const map = migrationMap as Record<string, MigrationEntry>

export function remapLegacyCatalogId<T extends string | null | undefined>(id: T): T {
  if (!id) return id
  const entry = map[id]
  return (entry ? entry.newId : id) as T
}

export function remapLegacyCatalogIds(ids: readonly string[]): string[] {
  return ids.map(id => remapLegacyCatalogId(id))
}

export function hasLegacyMapping(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(map, id)
}
