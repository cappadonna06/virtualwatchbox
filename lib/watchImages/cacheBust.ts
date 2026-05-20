// Append a version query param to Storage image URLs so browsers re-fetch
// after a batch reprocess. Supabase Storage sends `cache-control: no-cache`,
// but in practice <img> tags routinely serve from browser disk cache anyway —
// leaving users staring at the old (pre-reprocess) bytes until the cache
// turns over naturally. Versioning the URL is the standard fix.
//
// Bump IMAGE_VERSION after every batch reprocess that overwrites Storage
// objects (i.e. after `npm run images:upload-storage -- --overwrite`).
// Production deploys can override via NEXT_PUBLIC_IMAGE_VERSION env so the
// constant isn't a code-change requirement for ops.
const IMAGE_VERSION = process.env.NEXT_PUBLIC_IMAGE_VERSION ?? '20260520-tier2-r2'

export function withVersion(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${IMAGE_VERSION}`
}
