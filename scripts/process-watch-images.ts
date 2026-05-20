import fs from 'node:fs/promises'
import { execFile } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { watches } from '../lib/watches'
import { processWatchImageBuffer, type ProcessOptions } from '../lib/imageProcessing'
import { loadLocalEnv, repoRoot } from './watch-image-pipeline'
import {
  ensureWatchAssetDirs,
  isSupportedImage,
  manifestPath as defaultManifestPath,
  processedDir as defaultProcessedDir,
  processedWebpDir as defaultProcessedWebpDir,
  rawDir,
  withoutExtension,
} from './watch-image-pipeline'

type ManifestEntry = {
  watchId: string
  rawFilename: string
  pngPath: string
  webpPath: string
  sourceWidth: number
  sourceHeight: number
  processedWidth: number
  processedHeight: number
  backgroundRemovalApplied: boolean
}

// ─────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────
const ARGV = process.argv.slice(2)
function flag(name: string): string | undefined {
  const hit = ARGV.find(a => a === name || a.startsWith(`${name}=`))
  if (!hit) return undefined
  if (hit === name) return ARGV[ARGV.indexOf(hit) + 1]
  return hit.slice(name.length + 1)
}
const ONLY_FLAGGED       = ARGV.includes('--only-flagged')
const SKIP_APPROVED      = ARGV.includes('--skip-approved')
const NO_TAG_OVERRIDES   = ARGV.includes('--no-tag-overrides')
const DRY_RUN            = ARGV.includes('--dry-run')
const LIMIT              = Number(flag('--limit') ?? 0)
const OUT_SUFFIX         = (flag('--out-suffix') ?? '').replace(/^[-_]+/, '')
const SHOW_HELP          = ARGV.includes('--help') || ARGV.includes('-h')

if (SHOW_HELP) {
  console.log(`
process-watch-images — batch processor with Supabase-driven feedback selection.

Default: process every raw under public/watch-assets/raw/ into public/watch-assets/processed/.

Selection flags (one):
  --only-flagged       Process only watches whose latest watch_image_reviews row is 'needs_reprocess'.
  --skip-approved      Process every raw EXCEPT watches whose latest review is 'approved'.

Output:
  --out-suffix=X       Write to public/watch-assets/processed-X/ instead of processed/.
                       Validation pass writes to processed-preview, leaving the live dir untouched.
  --limit=N            Cap to first N matching watches (useful with --only-flagged for spot-checks).
  --dry-run            Print what would be processed; don't write anything.

Tuning:
  --no-tag-overrides   Don't bump per-watch knobs based on review tags (default ON when --only-flagged
                       or --skip-approved is set).

Common use:
  npx tsx scripts/process-watch-images.ts --only-flagged --out-suffix=preview
  npx tsx scripts/process-watch-images.ts --skip-approved
  npx tsx scripts/process-watch-images.ts                                       # legacy: process everything in place
`)
  process.exit(0)
}

if (ONLY_FLAGGED && SKIP_APPROVED) {
  console.error('Use either --only-flagged OR --skip-approved, not both.')
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────
// Catalog membership (kept from original — warns when a raw file has no
// matching catalog row)
// ─────────────────────────────────────────────────────────────────────────
const enrichedJsonPath = path.join(repoRoot, 'data', 'catalog-enriched-full.json')
const watchIds = new Set<string>(watches.map(watch => watch.id))
try {
  if (require('node:fs').existsSync(enrichedJsonPath)) {
    const enriched = JSON.parse(require('node:fs').readFileSync(enrichedJsonPath, 'utf8'))
    for (const r of enriched.records ?? []) {
      if (typeof r?.id === 'string') watchIds.add(r.id)
    }
  }
} catch (err) {
  console.warn(`[process] could not read enriched catalog: ${(err as Error).message}`)
}

const execFileAsync = promisify(execFile)

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

// macOS hatch: sharp's compiled libheif coverage varies by Node build, so when
// it can't decode an AVIF/HEIF input we fall back to `sips` (always present on
// darwin). The lib accepts this as `decodeFallback` and only invokes it when
// sharp throws on the original input.
async function decodeWithSips(input: Buffer): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'watch-process-'))
  const inputPath = path.join(tempDir, 'source')
  const outputPath = path.join(tempDir, 'source.png')
  try {
    await fs.writeFile(inputPath, input)
    await execFileAsync('/usr/bin/sips', ['-s', 'format', 'png', inputPath, '--out', outputPath])
    return await fs.readFile(outputPath)
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Supabase selection
// ─────────────────────────────────────────────────────────────────────────
type LatestReview = { status: string; tags: string[] }

async function loadLatestReviews(): Promise<Map<string, LatestReview>> {
  loadLocalEnv()
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY/SERVICE_ROLE_KEY in .env.local')
  }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await supabase
    .from('watch_image_reviews')
    .select('catalog_watch_id, status, tags, created_at')
    .eq('variant', 'primary')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Supabase query failed: ${error.message}`)
  const map = new Map<string, LatestReview>()
  for (const r of data ?? []) {
    if (!map.has(r.catalog_watch_id)) {
      map.set(r.catalog_watch_id, {
        status: r.status,
        tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      })
    }
  }
  return map
}

// Map review tags → ProcessOptions overrides. Defaults are tuned for the
// whole catalog; reviewer-flagged failures get knobs bumped at the specific
// pipeline stage they implicate.
function overridesForTags(tags: string[]): ProcessOptions {
  const overrides: ProcessOptions = {}
  const hasChunk = tags.some(t => t === 'band' || t === 'case' || t === 'bracelet_top' || t === 'bracelet_bottom')
  if (hasChunk) {
    // Bump dilation from 1 → 2 (2 pixels of expansion). Won't chain because
    // each pass snapshots the boundary at start; 2 px is enough for ML
    // under-shoot rescue without runaway widening on shadow gradients.
    overrides.maskDilationPasses = 2
  }
  if (tags.includes('halo')) {
    overrides.featherSigma = 1.0
  }
  return overrides
}

// ─────────────────────────────────────────────────────────────────────────
// Processing
// ─────────────────────────────────────────────────────────────────────────
async function processImage(
  rawFilename: string,
  outDirs: { png: string; webp: string },
  opts: ProcessOptions,
): Promise<ManifestEntry | null> {
  const watchId = withoutExtension(rawFilename)
  if (!watchIds.has(watchId)) {
    console.warn(`Processing ${rawFilename}: filename stem is not in the catalog yet; add a catalog watch with id "${watchId}" to render it in the app.`)
  }

  const rawPath = path.join(rawDir, rawFilename)
  const inputBuffer = await fs.readFile(rawPath)

  const decodeFallback = process.platform === 'darwin' ? decodeWithSips : undefined

  let processed
  try {
    processed = await processWatchImageBuffer(inputBuffer, { decodeFallback, ...opts })
  } catch (err) {
    console.warn(`Skipped ${rawFilename}:`, err instanceof Error ? err.message : err)
    return null
  }

  if (!processed.sourceWidth || !processed.sourceHeight) {
    console.warn(`Skipped ${rawFilename}: unreadable image dimensions`)
    return null
  }

  const pngPath = path.join(outDirs.png, `${watchId}.png`)
  const webpPath = path.join(outDirs.webp, `${watchId}.webp`)
  await fs.writeFile(pngPath, processed.pngBuffer)
  await fs.writeFile(webpPath, processed.webpBuffer)

  const publicPngRoot = path.relative(path.join(repoRoot, 'public'), outDirs.png).replace(/\\/g, '/')
  const publicWebpRoot = path.relative(path.join(repoRoot, 'public'), outDirs.webp).replace(/\\/g, '/')
  return {
    watchId,
    rawFilename,
    pngPath: `/${publicPngRoot}/${watchId}.png`,
    webpPath: `/${publicWebpRoot}/${watchId}.webp`,
    sourceWidth: processed.sourceWidth,
    sourceHeight: processed.sourceHeight,
    processedWidth: processed.processedWidth,
    processedHeight: processed.processedHeight,
    backgroundRemovalApplied: processed.backgroundRemovalApplied,
  }
}

async function main() {
  ensureWatchAssetDirs()

  // Resolve output directories. With --out-suffix=preview, writes go to
  // public/watch-assets/processed-preview/ so a validation pass can run
  // without trampling the live output.
  const processedDir = OUT_SUFFIX
    ? path.join(repoRoot, 'public', 'watch-assets', `processed-${OUT_SUFFIX}`)
    : defaultProcessedDir
  const processedWebpDir = OUT_SUFFIX
    ? path.join(processedDir, 'webp')
    : defaultProcessedWebpDir
  const manifestPath = OUT_SUFFIX
    ? path.join(processedDir, 'manifest.json')
    : defaultManifestPath
  if (OUT_SUFFIX) {
    await fs.mkdir(processedDir, { recursive: true })
    await fs.mkdir(processedWebpDir, { recursive: true })
  }

  if (!await fileExists(rawDir)) {
    console.log('No raw image directory found.')
    return
  }

  const entries = await fs.readdir(rawDir, { withFileTypes: true })
  const allRawFiles = entries
    .filter(entry => entry.isFile() && isSupportedImage(entry.name))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b))

  let reviews: Map<string, LatestReview> | null = null
  if (ONLY_FLAGGED || SKIP_APPROVED) {
    console.log('Loading latest review per watch from Supabase…')
    reviews = await loadLatestReviews()
    console.log(`  ${reviews.size} reviews found.`)
  }

  let rawFiles = allRawFiles
  if (ONLY_FLAGGED) {
    rawFiles = allRawFiles.filter(f => reviews!.get(withoutExtension(f))?.status === 'needs_reprocess')
    console.log(`Filtered to ${rawFiles.length} flagged (needs_reprocess) of ${allRawFiles.length}.`)
  } else if (SKIP_APPROVED) {
    rawFiles = allRawFiles.filter(f => reviews!.get(withoutExtension(f))?.status !== 'approved')
    const skipped = allRawFiles.length - rawFiles.length
    console.log(`Skipping ${skipped} approved; processing ${rawFiles.length} of ${allRawFiles.length}.`)
  }

  if (LIMIT > 0 && rawFiles.length > LIMIT) {
    rawFiles = rawFiles.slice(0, LIMIT)
    console.log(`Limit applied: ${rawFiles.length} of ${rawFiles.length + (allRawFiles.length - rawFiles.length)}`)
  }

  if (DRY_RUN) {
    console.log('\nDRY RUN — would process:')
    for (const f of rawFiles) {
      const watchId = withoutExtension(f)
      const review = reviews?.get(watchId)
      const tagSummary = review?.tags?.length ? ` [tags: ${review.tags.join(',')}]` : ''
      console.log(`  ${f}${review ? ` (${review.status})` : ''}${tagSummary}`)
    }
    return
  }

  console.log(`\nProcessing ${rawFiles.length} image${rawFiles.length === 1 ? '' : 's'} → ${path.relative(repoRoot, processedDir)}/`)
  const useTagOverrides = (ONLY_FLAGGED || SKIP_APPROVED) && !NO_TAG_OVERRIDES

  const manifest: ManifestEntry[] = []
  let okCount = 0
  let failCount = 0
  for (let i = 0; i < rawFiles.length; i += 1) {
    const rawFilename = rawFiles[i]
    const watchId = withoutExtension(rawFilename)
    const review = reviews?.get(watchId)
    const opts: ProcessOptions = useTagOverrides && review?.tags ? overridesForTags(review.tags) : {}
    const t0 = Date.now()
    const entry = await processImage(rawFilename, { png: processedDir, webp: processedWebpDir }, opts)
    if (entry) {
      manifest.push(entry)
      okCount += 1
      const overrideNote = Object.keys(opts).length
        ? ` [overrides: ${Object.entries(opts).map(([k, v]) => `${k}=${v}`).join(',')}]`
        : ''
      console.log(`  [${i + 1}/${rawFiles.length}] ${rawFilename} → ${entry.processedWidth}x${entry.processedHeight} (${Date.now() - t0}ms)${entry.backgroundRemovalApplied ? '' : ' [no bg removal]'}${overrideNote}`)
    } else {
      failCount += 1
    }
  }

  // Merge with existing manifest when only a subset was processed. Otherwise
  // --skip-approved / --only-flagged would drop the entries for untouched
  // watches and break the admin UI's raw-filename lookup.
  let finalManifest = manifest
  if (ONLY_FLAGGED || SKIP_APPROVED) {
    try {
      const existing: ManifestEntry[] = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
      const touched = new Set(manifest.map(e => e.watchId))
      const preserved = existing.filter(e => !touched.has(e.watchId))
      finalManifest = [...preserved, ...manifest].sort((a, b) => a.watchId.localeCompare(b.watchId))
      console.log(`Merged manifest: ${preserved.length} preserved + ${manifest.length} new = ${finalManifest.length} total.`)
    } catch {
      // No existing manifest — write what we have.
    }
  }
  await fs.writeFile(manifestPath, JSON.stringify(finalManifest, null, 2) + '\n', 'utf8')
  console.log(`\nDone. ${okCount} processed, ${failCount} skipped. Manifest: ${path.relative(process.cwd(), manifestPath)}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
