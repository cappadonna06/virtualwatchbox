/**
 * Upload processed images to Supabase Storage (bucket: watch-images) and
 * rewrite watch_images.png_url / webp_url to point at the public Storage
 * URLs.
 *
 * Why: production deploys ship from git. The 1,452 processed PNGs + WebPs
 * live only in public/watch-assets/processed/ on your local disk (≈908MB)
 * so production has no way to serve them. Putting them in Storage gives
 * you a CDN URL the deployed app can hit without bloating the git repo.
 *
 * Storage layout:
 *   watch-images/<catalog_watch_id>/primary.png
 *   watch-images/<catalog_watch_id>/primary.webp
 *
 * Required env:
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY  (bucket is public-read,
 *     but we still need service key for the upload + DB update)
 *
 * Idempotent. Resume on rerun: skips objects already present in the bucket
 * unless --overwrite is passed.
 *
 * Usage:
 *   DRY_RUN=1 npm run images:upload-storage          # preview
 *   npm run images:upload-storage                     # upload everything
 *   npm run images:upload-storage -- --top=100        # smoke test
 *   npm run images:upload-storage -- --overwrite      # re-upload already-uploaded
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()

const BUCKET = 'watch-images'
const PROCESSED_DIR = path.join(repoRoot, 'public', 'watch-assets', 'processed')
const WEBP_DIR = path.join(PROCESSED_DIR, 'webp')
const MANIFEST_PATH = path.join(PROCESSED_DIR, 'manifest.json')

const ARGV = process.argv.slice(2)
function arg(name: string): string | undefined {
  const hit = ARGV.find(a => a === name || a.startsWith(`${name}=`))
  if (!hit) return undefined
  if (hit === name) return ARGV[ARGV.indexOf(hit) + 1]
  return hit.slice(name.length + 1)
}

const TOP = Number(arg('--top') ?? 0)
const CONCURRENCY = Number(process.env.UPLOAD_CONCURRENCY ?? 5)
const DRY_RUN = process.env.DRY_RUN === '1'
const OVERWRITE = ARGV.includes('--overwrite') || process.env.OVERWRITE === '1'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

function fail(msg: string): never {
  console.error(`[upload-images] ${msg}`)
  process.exit(1)
}

type ManifestEntry = {
  watchId: string
  pngPath: string
  webpPath: string
}

async function objectExists(supabase: SupabaseClient, objectPath: string): Promise<boolean> {
  // storage.list with the parent path + filter by name; cheaper than HEAD
  const slash = objectPath.lastIndexOf('/')
  const dir = slash >= 0 ? objectPath.slice(0, slash) : ''
  const name = slash >= 0 ? objectPath.slice(slash + 1) : objectPath
  const { data } = await supabase.storage.from(BUCKET).list(dir, {
    limit: 100,
    search: name,
  })
  return Array.isArray(data) && data.some(d => d.name === name)
}

async function uploadOne(
  supabase: SupabaseClient,
  localPath: string,
  storagePath: string,
  contentType: string,
): Promise<{ uploaded: boolean; publicUrl: string }> {
  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl

  if (!OVERWRITE) {
    if (await objectExists(supabase, storagePath)) {
      return { uploaded: false, publicUrl }
    }
  }
  if (DRY_RUN) {
    return { uploaded: false, publicUrl }
  }

  const buf = fs.readFileSync(localPath)
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
    contentType,
    upsert: OVERWRITE,
    cacheControl: '31536000', // 1 year — file names are content-addressed by id
  })
  if (error) throw new Error(`upload ${storagePath} failed: ${error.message}`)
  return { uploaded: true, publicUrl }
}

async function main() {
  if (!SUPABASE_URL) fail('Missing SUPABASE_URL.')
  if (!SUPABASE_KEY && !DRY_RUN) fail('Missing SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY.')
  if (!fs.existsSync(MANIFEST_PATH)) fail(`No manifest at ${MANIFEST_PATH}`)

  const supabase: SupabaseClient = createClient(SUPABASE_URL!, SUPABASE_KEY ?? 'anon', {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as ManifestEntry[]
  let targets = manifest
  if (TOP > 0) targets = targets.slice(0, TOP)

  console.log(
    `[upload-images] ${targets.length} watches to process${DRY_RUN ? ' (DRY_RUN)' : ''}${OVERWRITE ? ' (OVERWRITE)' : ''}`,
  )

  let uploaded = 0
  let skipped = 0
  let failed = 0
  const dbRows: Array<{ catalog_watch_id: string; png_url: string; webp_url: string }> = []

  const queue = [...targets]
  const workers: Promise<void>[] = []
  for (let i = 0; i < Math.max(1, CONCURRENCY); i += 1) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const m = queue.shift()!
          const watchId = m.watchId
          // Resolve local paths. manifest stores web-rooted paths like
          // "/watch-assets/processed/foo.png".
          const localPng = path.join(repoRoot, 'public', m.pngPath.replace(/^\//, ''))
          const localWebp = path.join(repoRoot, 'public', m.webpPath.replace(/^\//, ''))
          if (!fs.existsSync(localPng) || !fs.existsSync(localWebp)) {
            failed += 1
            console.warn(`[upload-images] missing local files for ${watchId}`)
            continue
          }
          const pngStoragePath = `${watchId}/primary.png`
          const webpStoragePath = `${watchId}/primary.webp`
          try {
            const [pngRes, webpRes] = await Promise.all([
              uploadOne(supabase, localPng, pngStoragePath, 'image/png'),
              uploadOne(supabase, localWebp, webpStoragePath, 'image/webp'),
            ])
            if (pngRes.uploaded || webpRes.uploaded) uploaded += 1
            else skipped += 1
            dbRows.push({
              catalog_watch_id: watchId,
              png_url: pngRes.publicUrl,
              webp_url: webpRes.publicUrl,
            })
            if ((uploaded + skipped) % 50 === 0) {
              console.log(`[upload-images] progress: uploaded=${uploaded} skipped=${skipped} failed=${failed}`)
            }
          } catch (err) {
            failed += 1
            console.warn(`[upload-images] error ${watchId}: ${(err as Error).message}`)
          }
        }
      })(),
    )
  }
  await Promise.all(workers)

  console.log(`[upload-images] storage upload phase: uploaded=${uploaded} skipped=${skipped} failed=${failed}`)
  if (DRY_RUN) {
    console.log('[upload-images] DRY_RUN — sample DB update payload:')
    console.log(JSON.stringify(dbRows[0], null, 2))
    return
  }

  // Update DB rows in chunks so png_url/webp_url point at Storage URLs
  console.log(`[upload-images] updating ${dbRows.length} watch_images rows…`)
  const CHUNK = 100
  let written = 0
  for (let i = 0; i < dbRows.length; i += CHUNK) {
    const slice = dbRows.slice(i, i + CHUNK)
    // Upsert by (catalog_watch_id, variant) — primary variant has a partial
    // unique index on catalog_watch_id, so use that.
    const rows = slice.map(r => ({
      catalog_watch_id: r.catalog_watch_id,
      png_url: r.png_url,
      webp_url: r.webp_url,
      variant: 'primary',
      sort_order: 0,
    }))
    // We can't UPSERT on the partial unique index directly via supabase-js.
    // Instead: delete primary row for these ids, then insert. Same pattern
    // seedCatalog.ts uses.
    const ids = slice.map(r => r.catalog_watch_id)
    const { error: delErr } = await supabase
      .from('watch_images')
      .delete()
      .eq('variant', 'primary')
      .in('catalog_watch_id', ids)
    if (delErr) {
      console.warn(`[upload-images] delete chunk ${i / CHUNK} warn: ${delErr.message}`)
    }
    const { error: insErr } = await supabase.from('watch_images').insert(rows)
    if (insErr) {
      console.error(`[upload-images] insert chunk ${i / CHUNK} failed: ${insErr.message}`)
      process.exit(1)
    }
    written += slice.length
    if (written % 500 === 0 || written === dbRows.length) {
      console.log(`[upload-images]   updated ${written}/${dbRows.length} rows`)
    }
  }

  console.log()
  console.log('[upload-images] DONE.')
  console.log(`  Storage objects: ${uploaded + skipped}`)
  console.log(`  DB rows updated: ${written}`)
  console.log()
  console.log('Next: open your app and the Supabase Storage URLs should now resolve.')
}

void main().catch(err => {
  console.error(err)
  process.exit(1)
})
