/**
 * One-shot wrapper that takes admin-flagged watches from queue to live.
 *
 * Steps:
 *   1. Query watch_image_reviews for ids whose latest status is 'needs_reprocess'.
 *   2. Spawn `process-watch-images.ts --only-flagged` so the processor runs the
 *      exact same selection (and respects tag overrides).
 *   3. Targeted upload of just the (re)processed ids to Supabase Storage.
 *   4. Update watch_images rows so png_url/webp_url point at the Storage paths.
 *   5. (Optional) flip status from 'needs_reprocess' → 'approved' for ids that
 *      processed cleanly, so the same row doesn't get reprocessed forever.
 *
 * Replaces the three manual steps from the old reprocess flow:
 *   - npx tsx scripts/process-watch-images.ts --only-flagged
 *   - npm run images:upload-storage -- --overwrite   (re-uploads ALL 2.9K)
 *   - manual SQL/curl to flip status
 *
 * Required env:
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npm run images:reprocess-cycle                 # full cycle
 *   npm run images:reprocess-cycle -- --dry-run    # list ids, no work
 *   npm run images:reprocess-cycle -- --no-approve # skip the status flip
 *   npm run images:reprocess-cycle -- --no-upload  # process only (debug)
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()

const BUCKET = 'watch-images'
const PROCESSED_DIR = path.join(repoRoot, 'public', 'watch-assets', 'processed')
const WEBP_DIR = path.join(PROCESSED_DIR, 'webp')
const MANIFEST_PATH = path.join(PROCESSED_DIR, 'manifest.json')

const DRY_RUN = process.argv.includes('--dry-run')
const NO_APPROVE = process.argv.includes('--no-approve')
const NO_UPLOAD = process.argv.includes('--no-upload')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env')
  process.exit(1)
}

type ManifestEntry = {
  watchId: string
  pngPath: string
  webpPath: string
  sourceWidth?: number
  sourceHeight?: number
  processedWidth?: number
  processedHeight?: number
  backgroundRemovalApplied?: boolean
}

async function getFlaggedIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('watch_image_reviews')
    .select('catalog_watch_id, status, created_at')
    .eq('variant', 'primary')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`watch_image_reviews query: ${error.message}`)

  const latest = new Map<string, string>()
  for (const r of data ?? []) {
    if (!latest.has(r.catalog_watch_id as string)) {
      latest.set(r.catalog_watch_id as string, r.status as string)
    }
  }
  return [...latest.entries()]
    .filter(([, s]) => s === 'needs_reprocess')
    .map(([id]) => id)
    .sort()
}

function runProcessor(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['tsx', 'scripts/process-watch-images.ts', '--only-flagged'],
      { cwd: repoRoot, stdio: 'inherit' },
    )
    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) resolve()
      else reject(new Error(`process-watch-images exited ${code}`))
    })
  })
}

async function uploadOne(
  supabase: SupabaseClient,
  watchId: string,
): Promise<{ pngUrl: string; webpUrl: string }> {
  const pngLocal = path.join(PROCESSED_DIR, `${watchId}.png`)
  const webpLocal = path.join(WEBP_DIR, `${watchId}.webp`)
  if (!fs.existsSync(pngLocal) || !fs.existsSync(webpLocal)) {
    throw new Error(`missing local files for ${watchId}`)
  }
  const pngPath = `${watchId}/primary.png`
  const webpPath = `${watchId}/primary.webp`

  const pngBuf = fs.readFileSync(pngLocal)
  const webpBuf = fs.readFileSync(webpLocal)

  const pngRes = await supabase.storage.from(BUCKET).upload(pngPath, pngBuf, {
    contentType: 'image/png',
    upsert: true,
    cacheControl: '31536000',
  })
  if (pngRes.error) throw new Error(`upload png ${watchId}: ${pngRes.error.message}`)

  const webpRes = await supabase.storage.from(BUCKET).upload(webpPath, webpBuf, {
    contentType: 'image/webp',
    upsert: true,
    cacheControl: '31536000',
  })
  if (webpRes.error) throw new Error(`upload webp ${watchId}: ${webpRes.error.message}`)

  return {
    pngUrl: supabase.storage.from(BUCKET).getPublicUrl(pngPath).data.publicUrl,
    webpUrl: supabase.storage.from(BUCKET).getPublicUrl(webpPath).data.publicUrl,
  }
}

async function updateWatchImagesRow(
  supabase: SupabaseClient,
  entry: ManifestEntry,
  urls: { pngUrl: string; webpUrl: string },
): Promise<void> {
  // delete-then-insert (no native upsert on partial unique index)
  const { error: delErr } = await supabase
    .from('watch_images')
    .delete()
    .eq('variant', 'primary')
    .eq('catalog_watch_id', entry.watchId)
  if (delErr) throw new Error(`delete ${entry.watchId}: ${delErr.message}`)

  const { error: insErr } = await supabase.from('watch_images').insert({
    catalog_watch_id: entry.watchId,
    png_url: urls.pngUrl,
    webp_url: urls.webpUrl,
    source_width: entry.sourceWidth ?? null,
    source_height: entry.sourceHeight ?? null,
    processed_width: entry.processedWidth ?? null,
    processed_height: entry.processedHeight ?? null,
    background_removal_applied: !!entry.backgroundRemovalApplied,
    variant: 'primary',
    sort_order: 0,
  })
  if (insErr) throw new Error(`insert ${entry.watchId}: ${insErr.message}`)
}

async function flipToApproved(
  supabase: SupabaseClient,
  ids: string[],
  reviewerId: string,
): Promise<void> {
  // Insert a fresh review row per id with status='approved'. Don't update the
  // existing row — keeps the audit trail.
  const rows = ids.map(id => ({
    catalog_watch_id: id,
    variant: 'primary',
    status: 'approved',
    notes: 'auto-approved by run-reprocess-cycle.ts after successful reprocess + upload',
    tags: [],
    reviewer_id: reviewerId,
  }))
  // Chunk to keep request size small.
  for (let i = 0; i < rows.length; i += 50) {
    const slice = rows.slice(i, i + 50)
    const { error } = await supabase.from('watch_image_reviews').insert(slice)
    if (error) throw new Error(`flip-to-approved insert: ${error.message}`)
  }
}

async function pickReviewerId(supabase: SupabaseClient): Promise<string | null> {
  // Reuse any reviewer_id from an existing approved row, so the audit trail
  // continues to point at a real admin.
  const { data } = await supabase
    .from('watch_image_reviews')
    .select('reviewer_id')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
  return (data?.[0]?.reviewer_id as string | undefined) ?? null
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log('[reprocess-cycle] step 1/4: query flagged ids')
  const flaggedIds = await getFlaggedIds(supabase)
  console.log(`[reprocess-cycle] ${flaggedIds.length} ids with status='needs_reprocess'`)
  if (flaggedIds.length === 0) {
    console.log('[reprocess-cycle] nothing to do.')
    return
  }
  for (const id of flaggedIds.slice(0, 20)) console.log(`  · ${id}`)
  if (flaggedIds.length > 20) console.log(`  · …and ${flaggedIds.length - 20} more`)

  if (DRY_RUN) {
    console.log('[reprocess-cycle] DRY_RUN — stopping before processor.')
    return
  }

  console.log('\n[reprocess-cycle] step 2/4: run processor --only-flagged')
  await runProcessor()

  if (NO_UPLOAD) {
    console.log('[reprocess-cycle] --no-upload — stopping after processor.')
    return
  }

  console.log('\n[reprocess-cycle] step 3/4: targeted upload + watch_images update')
  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  const byId = new Map(manifest.map(e => [e.watchId, e]))
  let uploadOk = 0
  let uploadFail = 0
  const failedIds: string[] = []
  for (const id of flaggedIds) {
    const entry = byId.get(id)
    if (!entry) {
      console.warn(`  ✗ ${id}: not in manifest after processing — skipping upload`)
      uploadFail += 1
      failedIds.push(id)
      continue
    }
    try {
      const urls = await uploadOne(supabase, id)
      await updateWatchImagesRow(supabase, entry, urls)
      uploadOk += 1
      console.log(`  ✓ ${id}`)
    } catch (err) {
      uploadFail += 1
      failedIds.push(id)
      console.warn(`  ✗ ${id}: ${(err as Error).message}`)
    }
  }
  console.log(`[reprocess-cycle] uploads: ${uploadOk} ok, ${uploadFail} failed`)

  if (NO_APPROVE) {
    console.log('[reprocess-cycle] --no-approve — leaving review statuses as-is.')
    return
  }

  const succeededIds = flaggedIds.filter(id => !failedIds.includes(id))
  if (succeededIds.length === 0) {
    console.log('[reprocess-cycle] no successful uploads — skipping approval flip.')
    return
  }

  console.log(`\n[reprocess-cycle] step 4/4: flip ${succeededIds.length} reviews to 'approved'`)
  const reviewerId = await pickReviewerId(supabase)
  if (!reviewerId) {
    console.warn('[reprocess-cycle] no admin reviewer_id available — leaving reviews as needs_reprocess')
    return
  }
  await flipToApproved(supabase, succeededIds, reviewerId)
  console.log('[reprocess-cycle] DONE.')
  console.log('\nNext: bump IMAGE_VERSION in lib/watchImages/cacheBust.ts so browsers refetch.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
