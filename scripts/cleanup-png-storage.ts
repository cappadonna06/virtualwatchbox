/**
 * Delete the PNG copies of catalog images from Supabase Storage and null
 * out png_url in watch_images. WebP is what the runtime serves anyway —
 * the PNGs were a transparency-friendly fallback that we no longer need
 * (WebP supports alpha) and they're 5-6× larger than WebP.
 *
 * Frees ~770 MB on the free tier (from ~907 MB → ~137 MB).
 *
 * Usage:
 *   DRY_RUN=1 npm run images:cleanup-png    # preview
 *   npm run images:cleanup-png               # delete for real
 *
 * Idempotent. Safe to re-run; objects already gone are silently skipped.
 */

import fs from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()

const BUCKET = 'watch-images'
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const CHUNK = 100

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

function fail(m: string): never {
  console.error(`[cleanup-png] ${m}`)
  process.exit(1)
}

async function listAllPngs(supabase: SupabaseClient): Promise<string[]> {
  // List the top-level directory of the bucket → each entry is a watch-id
  // folder. For each, fetch its files and collect anything named *.png.
  const out: string[] = []
  const seen = new Set<string>()
  // Storage list paginates with limit/offset.
  let folderOffset = 0
  const FOLDER_PAGE = 100
  while (true) {
    const { data: folders, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: FOLDER_PAGE, offset: folderOffset })
    if (error) throw new Error(`list bucket root: ${error.message}`)
    if (!folders || folders.length === 0) break
    for (const f of folders) {
      // Each watch-id is a "folder" entry (name without an extension).
      if (f.id || seen.has(f.name)) continue // entries with id are files at root; skip
      seen.add(f.name)
      const { data: files } = await supabase.storage
        .from(BUCKET)
        .list(f.name, { limit: 100 })
      if (!files) continue
      for (const file of files) {
        if (file.name.toLowerCase().endsWith('.png')) {
          out.push(`${f.name}/${file.name}`)
        }
      }
    }
    if (folders.length < FOLDER_PAGE) break
    folderOffset += FOLDER_PAGE
  }
  return out
}

async function main() {
  if (!SUPABASE_URL) fail('Missing SUPABASE_URL.')
  if (!SUPABASE_KEY && !DRY_RUN) fail('Missing SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY.')

  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY ?? 'anon', {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log('[cleanup-png] listing PNG objects in the bucket…')
  const pngPaths = await listAllPngs(supabase)
  console.log(`[cleanup-png] found ${pngPaths.length} PNG objects`)

  if (pngPaths.length === 0) {
    console.log('[cleanup-png] no storage objects left to delete — proceeding to DB cleanup anyway.')
  }

  if (DRY_RUN) {
    console.log('[cleanup-png] DRY_RUN — would delete:')
    for (const p of pngPaths.slice(0, 10)) console.log(`  ${p}`)
    if (pngPaths.length > 10) console.log(`  …and ${pngPaths.length - 10} more`)
    return
  }

  // Delete in chunks
  if (pngPaths.length > 0) {
    console.log('[cleanup-png] deleting PNG objects…')
    let deleted = 0
    for (let i = 0; i < pngPaths.length; i += CHUNK) {
      const slice = pngPaths.slice(i, i + CHUNK)
      const { error } = await supabase.storage.from(BUCKET).remove(slice)
      if (error) {
        console.warn(`[cleanup-png] delete chunk ${i / CHUNK} warn: ${error.message}`)
        continue
      }
      deleted += slice.length
      if ((i / CHUNK) % 5 === 0) console.log(`  deleted ${deleted}/${pngPaths.length}`)
    }
    console.log(`[cleanup-png] storage: deleted ${deleted} PNG objects`)
  }

  // Clear png_url in watch_images. The schema has png_url as NOT NULL so
  // we set it to '' (empty string) — the resolver in CatalogProvider treats
  // empty-string the same as null/undefined.
  console.log('[cleanup-png] clearing png_url in watch_images table…')
  const { error: updErr, count } = await supabase
    .from('watch_images')
    .update({ png_url: '' }, { count: 'exact' })
    .eq('variant', 'primary')
    .neq('png_url', '')
  if (updErr) {
    console.error(`[cleanup-png] DB update failed: ${updErr.message}`)
    process.exit(1)
  }
  console.log(`[cleanup-png] watch_images: cleared png_url on ${count ?? '?'} rows`)

  console.log()
  console.log('[cleanup-png] DONE. WebP-only from here.')
  console.log('Tip: check Supabase Dashboard → Storage → watch-images to confirm freed space.')
}

void main().catch(err => {
  console.error(err)
  process.exit(1)
})
