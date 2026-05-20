// Map a build-time manifest local path to its Supabase Storage URL.
//
// The build-time seed in lib/watches.ts merges in image paths from
// public/watch-assets/processed/manifest.json — historically those paths
// pointed at the local public/ dir (e.g. /watch-assets/processed/webp/X.webp),
// which only works locally because the gigabytes of processed binaries are
// gitignored. Production deploys from git, so a watch whose manifest entry
// pointed at a local path either 404'd or — worse — served whatever stale
// binary happened to be committed (the original 13-watch seed batch).
//
// Storage is the canonical source of truth: scripts/upload-images-to-storage.ts
// puts every processed image at watch-images/<catalog_watch_id>/primary.{webp,png}
// after every batch run. Rewriting manifest paths to those Storage URLs makes
// the seed agree with the rest of the app (CatalogProvider already uses
// Storage URLs) and decouples deploys from the binaries on disk.
const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/watch-images`
  : null

const LOCAL_PATTERN = /\/watch-assets\/processed\/(?:webp\/)?([^/]+)\.(webp|png)$/

export function toStorageUrl(localPath: string | undefined | null): string | undefined {
  if (!localPath) return undefined
  if (!STORAGE_BASE) return localPath
  const m = localPath.match(LOCAL_PATTERN)
  if (!m) return localPath
  const [, id, ext] = m
  return `${STORAGE_BASE}/${id}/primary.${ext}`
}
