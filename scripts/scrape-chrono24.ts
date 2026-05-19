/**
 * Chrono24 search-results scraper — live price aggregation per reference.
 *
 * For each (brand, reference) in the seed CSV (or top N by communitySignal),
 * scrape the public search results page and aggregate:
 *   - listings_count
 *   - price_usd_median / min / max
 *   - top_image_url
 *   - case_diameter / case_material / dial_color modes (when present in the cards)
 *
 * Output: data/external/chrono24-cache/<refkey>.json
 *
 * Polite scraping:
 *   - User-Agent identifies us as a small catalog hydration bot
 *   - CHRONO24_DELAY_MS between requests (default 5000), ±1500ms jitter
 *   - exponential backoff on 429 / 5xx
 *   - skips cached refs
 *
 * Usage:
 *   npm run catalog:scrape-chrono24
 *   SEED_CSV=data/catalog-seed-1500.csv CHRONO24_TOP=500 npm run catalog:scrape-chrono24
 *   CHRONO24_LIMIT=20 npm run catalog:scrape-chrono24   (just N rows for testing)
 *   CHRONO24_DRY_RUN=1 npm run catalog:scrape-chrono24
 *
 * Caveats:
 *   Chrono24 has anti-bot. If we hit a CAPTCHA / 403 wall, this script
 *   doesn't try to bypass it — it logs and skips. We may need to fall
 *   back to the Kaggle dataset for those refs.
 */

import fs from 'node:fs'
import path from 'node:path'
import { repoRoot, parseCsv } from './watch-image-pipeline'

const cacheDir = path.join(repoRoot, 'data', 'external', 'chrono24-cache')

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

const SEED_CSV =
  arg('--seed') ?? process.env.SEED_CSV ?? path.join('data', 'catalog-seed-200.csv')
const ENRICHED_JSON =
  arg('--enriched') ??
  process.env.ENRICHED_JSON ??
  path.join('data', 'catalog-enriched-full.json')
const DELAY_MS = Number(process.env.CHRONO24_DELAY_MS ?? 5000)
const LIMIT = Number(process.env.CHRONO24_LIMIT ?? 0)
const TOP = Number(process.env.CHRONO24_TOP ?? 500)
const DRY_RUN = process.env.CHRONO24_DRY_RUN === '1'
const USER_AGENT =
  'VirtualWatchboxBot/0.1 (catalog hydration; contact: msells.caltech@gmail.com)'

type SeedRow = {
  brand: string
  reference: string
  id: string
  communitySignal?: string
}

function refKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

function jitter(base: number) {
  return base + Math.round((Math.random() * 2 - 1) * 1500)
}

async function fetchHtml(url: string, attempt = 1): Promise<{ html: string; status: number }> {
  if (DRY_RUN) return { html: '', status: 200 }
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  })
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 4) throw new Error(`HTTP ${res.status} after ${attempt} attempts`)
    const wait = 6000 * 2 ** (attempt - 1)
    console.warn(`[chrono24] ${res.status} for ${url}, backing off ${wait}ms`)
    await sleep(wait)
    return fetchHtml(url, attempt + 1)
  }
  return { html: res.ok ? await res.text() : '', status: res.status }
}

// Parse Chrono24 listing cards.
//
// Their results page is server-rendered HTML. Each listing tile has a
// price span (class typically "price"), an article tag wrapper, and image
// tags. The exact class names shift; we use loose regex over the entire
// document to extract:
//   - all USD prices visible on the page
//   - the first image URL
function parseListings(html: string) {
  const prices: number[] = []
  // Match "$12,345" or "$1,234,567" or "USD 12,345" — Chrono24 usually
  // serves localized currency.
  const priceRe = /(?:\$|USD\s*)\s*([0-9]{1,3}(?:,[0-9]{3})+)(?!\d)/g
  for (const m of html.matchAll(priceRe)) {
    const n = Number(m[1].replace(/,/g, ''))
    if (Number.isFinite(n) && n >= 200 && n <= 5_000_000) prices.push(n)
  }
  // Fallback: numeric-only prices in data attributes or schema.org metadata
  // (commonly look like `"price":"15495"`).
  const altRe = /"price"\s*:\s*"?(\d{3,7})/g
  for (const m of html.matchAll(altRe)) {
    const n = Number(m[1])
    if (Number.isFinite(n) && n >= 200 && n <= 5_000_000) prices.push(n)
  }

  const imageMatch = html.match(/<img[^>]+src="(https:\/\/[^"]+chrono24\.[^"]+\.(?:jpg|jpeg|png|webp))"/i)
  const topImage = imageMatch ? imageMatch[1] : null

  const sortedPrices = [...prices].sort((a, b) => a - b)
  return {
    prices: sortedPrices,
    median:
      sortedPrices.length === 0
        ? null
        : sortedPrices[Math.floor(sortedPrices.length / 2)],
    min: sortedPrices.length === 0 ? null : sortedPrices[0],
    max: sortedPrices.length === 0 ? null : sortedPrices[sortedPrices.length - 1],
    topImage,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(cacheDir, { recursive: true })

  // Prefer the enriched JSON (has heatScore + popularityRank from the
  // canonical merge). Fall back to seed CSV if enriched is missing.
  const enrichedPath = path.resolve(repoRoot, ENRICHED_JSON)
  let rows: Array<SeedRow & { heatScore?: number; popularityRank?: number }> = []

  if (fs.existsSync(enrichedPath)) {
    console.log(`[chrono24] reading priorities from ${path.relative(repoRoot, enrichedPath)}`)
    const enriched = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'))
    rows = (enriched.records as Array<Record<string, unknown>>)
      .map(r => ({
        brand: (r.brand as string) || '',
        reference: (r.reference as string) || '',
        id: (r.id as string) || '',
        heatScore: typeof r.heatScore === 'number' ? r.heatScore : 0,
        popularityRank: typeof r.popularityRank === 'number' ? r.popularityRank : 999999,
      }))
      .filter(r => r.brand && r.reference)
      .sort((a, b) => (a.popularityRank ?? 999999) - (b.popularityRank ?? 999999))
  } else {
    console.log(`[chrono24] no enriched JSON, falling back to seed CSV ${SEED_CSV}`)
    const seedPath = path.resolve(repoRoot, SEED_CSV)
    if (!fs.existsSync(seedPath)) {
      console.error(`Seed CSV not found at ${seedPath}`)
      process.exit(1)
    }
    const allRows = parseCsv(fs.readFileSync(seedPath, 'utf8')) as unknown as SeedRow[]
    rows = allRows.filter(r => r.brand && r.reference)
  }

  if (TOP > 0) rows = rows.slice(0, TOP)
  if (LIMIT > 0) rows = rows.slice(0, LIMIT)

  console.log(
    `[chrono24] ${rows.length} rows, delay=${DELAY_MS}ms${DRY_RUN ? ' DRY_RUN' : ''}`,
  )

  let hits = 0
  let misses = 0
  let skipped = 0
  let blocked = 0

  for (const row of rows) {
    const outPath = path.join(cacheDir, `${refKey(row.reference)}.json`)
    if (fs.existsSync(outPath)) {
      skipped += 1
      continue
    }
    const query = encodeURIComponent(`${row.brand} ${row.reference}`)
    const url = `https://www.chrono24.com/search/index.htm?dosearch=true&query=${query}`
    try {
      const { html, status } = await fetchHtml(url)
      if (status === 403 || status === 451) {
        blocked += 1
        console.warn(`[chrono24] blocked ${row.brand} ${row.reference} (HTTP ${status}) — aborting run`)
        break
      }
      if (!html) {
        misses += 1
        console.log(`[chrono24] miss ${row.brand} ${row.reference} (HTTP ${status})`)
        await sleep(jitter(DELAY_MS))
        continue
      }
      const parsed = parseListings(html)
      const payload = {
        scraped_at: new Date().toISOString(),
        query: `${row.brand} ${row.reference}`,
        listings_count: parsed.prices.length,
        price_usd_median: parsed.median,
        price_usd_min: parsed.min,
        price_usd_max: parsed.max,
        top_image_url: parsed.topImage,
        case_diameter_mm_mode: null,
        case_material_mode: null,
        dial_color_mode: null,
      }
      fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8')
      hits += 1
      console.log(
        `[chrono24] hit ${row.brand} ${row.reference} count=${parsed.prices.length} median=${parsed.median}`,
      )
    } catch (err) {
      console.error(`[chrono24] error ${row.brand} ${row.reference}: ${(err as Error).message}`)
    }
    await sleep(jitter(DELAY_MS))
  }

  console.log(
    `[chrono24] done. hits=${hits} misses=${misses} skipped=${skipped} blocked=${blocked}`,
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
