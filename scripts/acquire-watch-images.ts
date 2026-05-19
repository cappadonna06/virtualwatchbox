/**
 * Heat-aware multi-source image acquisition.
 *
 * Walks the catalog by descending heatScore (lowest popularityRank first)
 * and tries each source in priority order until it finds a usable image.
 * Saves raw images to public/watch-assets/raw/<watch-id>.<ext> with the
 * same naming convention process-watch-images.ts already expects.
 *
 * Sources (in order):
 *   1. watchbase  — extract og:image URL from cached WatchBase HTML
 *                   (we've already downloaded the page; this is free + fast +
 *                   high quality product photography)
 *   2. wikimedia  — Wikimedia Commons search by brand+reference
 *
 * Output: public/watch-assets/raw/<watch-id>.<ext>
 *         data/external/_logs/image-acquire-misses.csv   (manual queue)
 *
 * Usage:
 *   npm run images:acquire                  # top 500 by heat
 *   npm run images:acquire -- --top=1000
 *   npm run images:acquire -- --dry-run
 *   npm run images:acquire -- --sources=wikimedia
 *   npm run images:acquire -- --sources=watchbase,wikimedia (default)
 *   npm run images:acquire -- --overwrite   # re-acquire even if cached
 */

import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { repoRoot, ensureWatchAssetDirs, rawDir } from './watch-image-pipeline'

const ARGV = process.argv.slice(2)
function arg(name: string): string | undefined {
  const hit = ARGV.find(a => a === name || a.startsWith(`${name}=`))
  if (!hit) return undefined
  if (hit === name) {
    const idx = ARGV.indexOf(hit)
    return ARGV[idx + 1]
  }
  return hit.slice(name.length + 1)
}
function hasFlag(name: string) {
  return ARGV.includes(name)
}

const ENRICHED_JSON =
  arg('--enriched') ?? process.env.ENRICHED_JSON ?? path.join('data', 'catalog-enriched-full.json')
const TOP = Number(arg('--top') ?? process.env.IMAGES_TOP ?? 500)
const SOURCES = (arg('--sources') ?? 'watchbase,wikimedia').split(',').map(s => s.trim())
const DRY_RUN = hasFlag('--dry-run')
const OVERWRITE = hasFlag('--overwrite')
const DELAY_MS = Number(process.env.IMAGES_DELAY_MS ?? 800)

const watchbaseCacheDir = path.join(repoRoot, 'data', 'external', 'watchbase-cache')
const missesCsvPath = path.join(repoRoot, 'data', 'external', '_logs', 'image-acquire-misses.csv')

type WatchRow = {
  id: string
  brand: string
  model: string
  modelFamily?: string | null
  reference: string
  heatScore: number
  popularityRank: number
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

function brandSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function refKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function extFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    const ext = path.extname(pathname)
    if (['.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(ext)) return ext
    return '.jpg'
  } catch {
    return '.jpg'
  }
}

async function rawImageExists(watchId: string): Promise<string | null> {
  for (const ext of ['.png', '.jpg', '.jpeg', '.webp', '.avif']) {
    const p = path.join(rawDir, `${watchId}${ext}`)
    try {
      await fs.access(p)
      return p
    } catch {
      // continue
    }
  }
  return null
}

async function download(url: string, destPath: string): Promise<void> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'VirtualWatchboxBot/0.1 (catalog images; contact: msells.caltech@gmail.com)',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = await res.arrayBuffer()
  if (buf.byteLength < 1024) {
    throw new Error(`response too small (${buf.byteLength} bytes) — likely a placeholder`)
  }
  await fs.writeFile(destPath, Buffer.from(buf))
}

// ─── Source 1: WatchBase cached HTML ───────────────────────────────────

function watchbaseImageUrl(brand: string, reference: string): string | null {
  const brandDir = path.join(watchbaseCacheDir, brandSlug(brand))
  const htmlPath = path.join(brandDir, `${refKey(reference)}.html`)
  if (!fsSync.existsSync(htmlPath)) return null
  const html = fsSync.readFileSync(htmlPath, 'utf8')
  // og:image is WatchBase's canonical product photo (clean URL, no UI chrome).
  const og = html.match(/property="og:image"\s+content="([^"]+)"/)
  if (og && og[1] && /watchbase\.com.*watch\//.test(og[1])) {
    return og[1]
  }
  // Fallback: first <img> that's a product photo (skip logos / referral banners).
  const imgMatches = Array.from(
    html.matchAll(/<img[^>]+(?:src|data-src)="(https:\/\/[^"]+cdn\.watchbase\.com\/watch\/[^"]+\.(?:jpg|jpeg|png|webp))"/gi),
  )
  if (imgMatches.length > 0) return imgMatches[0][1]
  return null
}

async function tryWatchbase(record: WatchRow): Promise<string | null> {
  const url = watchbaseImageUrl(record.brand, record.reference)
  if (!url) return null
  const ext = extFromUrl(url)
  const dest = path.join(rawDir, `${record.id}${ext}`)
  if (DRY_RUN) {
    console.log(`  watchbase DRY ${record.id} <= ${url}`)
    return 'watchbase'
  }
  try {
    await download(url, dest)
    return 'watchbase'
  } catch (err) {
    console.warn(
      `  watchbase ERR ${record.id}: ${(err as Error).message} (${url})`,
    )
    return null
  }
}

// ─── Source 2: Wikimedia Commons ───────────────────────────────────────

type WmPage = { imageinfo?: Array<{ url?: string }>; title?: string }
type WmResponse = {
  query?: {
    pages?: { [k: string]: WmPage }
  }
}

async function searchWikimedia(query: string, limit = 6): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: String(limit),
    gsrnamespace: '6',
    prop: 'imageinfo',
    iiprop: 'url',
    format: 'json',
    origin: '*',
  })
  try {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`)
    if (!res.ok) return []
    const data = (await res.json()) as WmResponse
    const pages = Object.values(data.query?.pages ?? {})
    return pages
      .map(p => p.imageinfo?.[0]?.url)
      .filter((u): u is string => Boolean(u))
      // Wikimedia returns lots of SVG diagrams / logos — filter to raster
      .filter(u => /\.(jpe?g|png|webp)(?:$|\?)/i.test(u))
  } catch {
    return []
  }
}

function buildWikimediaQueries(record: WatchRow): string[] {
  const { brand, model, modelFamily, reference } = record
  const fam = modelFamily ?? model
  return [
    `"${brand}" "${reference}" watch`,
    `"${brand}" ${reference} watch`,
    `"${brand}" "${fam}" "${reference}"`,
    `${brand} ${reference} watch`,
  ].filter(q => q && q.length < 200)
}

async function tryWikimedia(record: WatchRow): Promise<string | null> {
  for (const q of buildWikimediaQueries(record)) {
    const urls = await searchWikimedia(q)
    if (urls.length === 0) continue
    const url = urls[0]
    const ext = extFromUrl(url)
    const dest = path.join(rawDir, `${record.id}${ext}`)
    if (DRY_RUN) {
      console.log(`  wikimedia DRY ${record.id} <= ${url}`)
      return 'wikimedia'
    }
    try {
      await download(url, dest)
      return 'wikimedia'
    } catch (err) {
      console.warn(`  wikimedia ERR ${record.id}: ${(err as Error).message} (${url})`)
      continue
    }
  }
  return null
}

// ─── Main loop ─────────────────────────────────────────────────────────

async function main() {
  ensureWatchAssetDirs()
  await fs.mkdir(path.dirname(missesCsvPath), { recursive: true })

  const enrichedPath = path.resolve(repoRoot, ENRICHED_JSON)
  if (!fsSync.existsSync(enrichedPath)) {
    console.error(`Enriched catalog not found at ${enrichedPath}`)
    console.error('Run `npm run catalog:enrich` first.')
    process.exit(1)
  }
  const enriched = JSON.parse(fsSync.readFileSync(enrichedPath, 'utf8'))
  const all = (enriched.records as WatchRow[])
    .filter(r => r.brand && r.reference && r.id)
    .sort((a, b) => (a.popularityRank ?? 999999) - (b.popularityRank ?? 999999))
  const targets = TOP > 0 ? all.slice(0, TOP) : all
  console.log(`[images:acquire] processing ${targets.length} of ${all.length}, sources: ${SOURCES.join(', ')}${DRY_RUN ? ' DRY_RUN' : ''}${OVERWRITE ? ' OVERWRITE' : ''}`)

  let acquired = 0
  let skipped = 0
  const sourceCounts: { [k: string]: number } = { watchbase: 0, wikimedia: 0 }
  const missRows: string[] = ['popularityRank,heatScore,brand,model,reference,id,wikimedia_search_url,brand_site_url']

  for (const r of targets) {
    // Skip if image already exists (unless overwrite)
    if (!OVERWRITE) {
      const existing = await rawImageExists(r.id)
      if (existing) {
        skipped += 1
        continue
      }
    }

    let result: string | null = null
    for (const source of SOURCES) {
      if (source === 'watchbase') result = await tryWatchbase(r)
      else if (source === 'wikimedia') result = await tryWikimedia(r)
      if (result) break
    }

    if (result) {
      acquired += 1
      sourceCounts[result] = (sourceCounts[result] ?? 0) + 1
      if (acquired % 25 === 0 || acquired < 10) {
        console.log(
          `[images:acquire] ✓ #${r.popularityRank} ${r.brand} ${r.reference} → ${result}  (acq=${acquired} skip=${skipped})`,
        )
      }
    } else {
      // Record in misses CSV with starter search URLs for manual work
      const q = encodeURIComponent(`${r.brand} ${r.reference} watch`)
      const wmSearch = `https://commons.wikimedia.org/w/index.php?search=${q}&fulltext=1`
      const brandQ = encodeURIComponent(`${r.brand} ${r.reference} official`)
      const brandSearch = `https://www.google.com/search?q=${brandQ}&tbm=isch`
      missRows.push(
        [r.popularityRank, r.heatScore, r.brand, r.model, r.reference, r.id, wmSearch, brandSearch]
          .map(v => `"${String(v).replaceAll('"', '""')}"`)
          .join(','),
      )
    }

    // Polite delay only when we actually hit a network source.
    if (result === 'wikimedia') await sleep(DELAY_MS)
  }

  await fs.writeFile(missesCsvPath, missRows.join('\n') + '\n', 'utf8')

  console.log()
  console.log('═══ Image acquisition summary ═══')
  console.log(`  processed:    ${targets.length}`)
  console.log(`  acquired:     ${acquired}`)
  for (const [src, n] of Object.entries(sourceCounts)) {
    if (n > 0) console.log(`    via ${src.padEnd(12)} ${n}`)
  }
  console.log(`  skipped (cached): ${skipped}`)
  console.log(`  misses (manual queue): ${missRows.length - 1}`)
  console.log()
  console.log(`Manual queue with search URLs: ${path.relative(repoRoot, missesCsvPath)}`)
  console.log(`Raw images:                    ${path.relative(repoRoot, rawDir)}`)
  console.log()
  console.log('Next:')
  console.log('  npm run images:process     # background-removal + WebP variants')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
