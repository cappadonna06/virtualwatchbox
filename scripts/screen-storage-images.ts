/**
 * Rules-only quality sweep over EVERY primary catalog image in Supabase
 * Storage (no local files needed, no LLM, $0 cost). Downloads each image
 * straight from its watch_images URL, runs the deterministic screener
 * (lib/imageProcessing/screener.ts), and — with --apply — writes a
 * watch_image_reviews row (status='needs_reprocess', tagged) for anything
 * flagged, so it shows up in /admin/image-review and as ⚠ in /admin/catalog.
 *
 * Catches: sideways/diagonal (principal-axis tilt), rotated, multi-object,
 * dial-only, truncated bracelet, tiny subject. Wrong-subject cases (arm in
 * shot, display box) need the LLM pass — see screen-existing-images.ts --llm.
 *
 * NEVER deletes an image — it only inserts review rows. Idempotent-ish: skips
 * any watch whose latest review is already approved / needs_reprocess / deleted,
 * so re-runs don't pile up duplicate flags or overrule a human decision.
 *
 * Run:
 *   set -a && . ./.env.local && set +a
 *   npx tsx scripts/screen-storage-images.ts                 # dry-run (free, writes nothing)
 *   npx tsx scripts/screen-storage-images.ts --apply         # write flags to Supabase
 *   npx tsx scripts/screen-storage-images.ts --limit=200     # sample
 *   npx tsx scripts/screen-storage-images.ts --concurrency=12
 *
 * Output: console summary by tag + full JSON at /tmp/screen-storage-results.json
 */
import * as fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { screenProcessedImage, type ScreenerResult } from '../lib/imageProcessing/screener'

const ARGV = process.argv.slice(2)
const has = (f: string) => ARGV.includes(f)
const val = (name: string) => {
  const hit = ARGV.find(a => a.startsWith(name + '='))
  return hit ? hit.slice(name.length + 1) : undefined
}

const APPLY = has('--apply')
const LIMIT = Number(val('--limit') ?? 0)
const CONCURRENCY = Math.max(1, Number(val('--concurrency') ?? 8))
const REPORT = val('--report') ?? '/tmp/screen-storage-results.json'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY in env / .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PAGE = 1000
const DECIDED = new Set(['approved', 'needs_reprocess', 'deleted'])

async function fetchAllPrimaryImages(): Promise<Array<{ id: string; url: string }>> {
  const out: Array<{ id: string; url: string }> = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('watch_images')
      .select('catalog_watch_id, png_url, webp_url')
      .eq('variant', 'primary')
      .range(offset, offset + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const r of data as Array<{ catalog_watch_id: string; png_url: string | null; webp_url: string | null }>) {
      const url = r.png_url || r.webp_url
      if (url) out.push({ id: r.catalog_watch_id, url })
    }
    if (data.length < PAGE) break
  }
  return out
}

async function fetchLatestStatusByWatch(): Promise<Map<string, string>> {
  const latest = new Map<string, string>()
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('watch_image_reviews')
      .select('catalog_watch_id, status, created_at')
      .eq('variant', 'primary')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const r of data as Array<{ catalog_watch_id: string; status: string }>) {
      if (!latest.has(r.catalog_watch_id)) latest.set(r.catalog_watch_id, r.status)
    }
    if (data.length < PAGE) break
  }
  return latest
}

type Entry = { id: string; url: string; result?: ScreenerResult; error?: string }

async function main() {
  const t0 = Date.now()
  console.log(`[storage-screen] ${APPLY ? 'APPLY' : 'DRY-RUN'} · rules only · concurrency ${CONCURRENCY}`)

  const allImages = await fetchAllPrimaryImages()
  const latest = await fetchLatestStatusByWatch()
  let targets = allImages.filter(i => !DECIDED.has(latest.get(i.id) ?? ''))
  const skipped = allImages.length - targets.length
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(`[storage-screen] ${allImages.length} primary images · ${skipped} already decided (skipped) · screening ${targets.length}`)
  console.log('')

  const entries: Entry[] = targets.map(t => ({ id: t.id, url: t.url }))
  let done = 0
  let cursor = 0
  async function worker() {
    while (true) {
      const i = cursor; cursor += 1
      if (i >= entries.length) return
      const e = entries[i]
      try {
        const res = await fetch(e.url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buf = Buffer.from(await res.arrayBuffer())
        e.result = await screenProcessedImage(buf)
      } catch (err) {
        e.error = (err as Error).message
      }
      done += 1
      if (done % 250 === 0) {
        const rate = done / ((Date.now() - t0) / 1000)
        console.log(`[storage-screen] ${done}/${entries.length} (${rate.toFixed(1)}/s)`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  const flagged = entries.filter(e => e.result && e.result.tags.length > 0)
  const errored = entries.filter(e => e.error)
  const byTag = new Map<string, number>()
  for (const e of flagged) for (const t of e.result!.tags) byTag.set(t, (byTag.get(t) ?? 0) + 1)

  console.log('')
  console.log(`[storage-screen] === SUMMARY ===`)
  console.log(`[storage-screen] flagged ${flagged.length}/${entries.length} · ${errored.length} download/decode errors`)
  for (const [t, n] of [...byTag.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${t.padEnd(22)} ${n}`)
  }

  fs.writeFileSync(REPORT, JSON.stringify({
    generated_at: new Date().toISOString(),
    flagged: flagged.map(e => ({ id: e.id, tags: e.result!.tags, reasons: e.result!.reasons })),
    errors: errored.map(e => ({ id: e.id, error: e.error })),
  }, null, 2))
  console.log('')
  console.log(`[storage-screen] report → ${REPORT}`)

  if (APPLY && flagged.length > 0) {
    // Everything flagged lands in one reviewable bucket: needs_reprocess. The
    // tags carry the specifics; you decide approve / reprocess / delete in the
    // UI. We never delete the image here.
    const rows = flagged.map(e => ({
      catalog_watch_id: e.id,
      variant: 'primary',
      status: 'needs_reprocess',
      tags: e.result!.tags,
      notes: `[auto-screener] ${e.result!.reasons.map(r => `[rule] ${r}`).join(' | ')}`.slice(0, 1000),
      reviewer_id: null,
    }))
    let inserted = 0
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500)
      const { error } = await supabase.from('watch_image_reviews').insert(chunk)
      if (error) console.warn(`  insert chunk failed: ${error.message}`)
      else inserted += chunk.length
    }
    console.log(`[storage-screen] wrote ${inserted} needs_reprocess rows → review at /admin/image-review`)
  } else if (!APPLY) {
    console.log(`[storage-screen] DRY-RUN: nothing written. Re-run with --apply to flag in Supabase.`)
  }

  console.log(`[storage-screen] done in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
}

main().catch(err => { console.error(err); process.exit(1) })
