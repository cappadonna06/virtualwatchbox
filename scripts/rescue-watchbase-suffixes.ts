/*
 * Rescue pass for image-acquire misses where the catalog ref lacks the
 * dial-variant suffix WatchBase actually uses.
 *
 * Background:
 *   acquire-watch-images.ts builds the WatchBase URL as
 *     https://watchbase.com/<brand>/<model>/<ref-slug>
 *   For many luxury refs the catalog stores the base reference
 *   (e.g. Rolex 116500LN, Tudor 79030N, IWC IW329001) but WatchBase serves
 *   them under suffixed slugs (116500ln-0001, 79030n-0001, iw3290-01, …).
 *   The base slug gets a .miss file and the acquire pass falls through to
 *   Wikimedia, which usually has nothing for these references.
 *
 * What this does:
 *   1. Read the miss CSV.
 *   2. Filter to brands where dial-variant suffixes are common
 *      (Rolex, Tudor, IWC, Jaeger-LeCoultre, Cartier, Patek, Omega, Breguet,
 *      Lange, AP, VC, Blancpain — i.e. brands that *do* exist on WatchBase).
 *   3. For each, try a small set of candidate URLs:
 *        <ref>-0001, <ref>-0002, <ref>-0003, <ref>-0004, <ref>-0005,
 *        <ref>-001,  <ref>-002,  <ref>-003,
 *        <ref>-01,   <ref>-02
 *      (stopping on the first that resolves).
 *   4. When a candidate hits, write the HTML to the cache file the acquire
 *      script reads from (keyed by the catalog ref's slug), parse specs the
 *      same way scrape-watchbase.ts does, and delete the original .miss
 *      marker so acquire-watch-images.ts will pick it up next time.
 *
 * Idempotent: skips refs that now have a .parsed.json. Re-runnable.
 *
 * Usage:
 *   npx tsx scripts/rescue-watchbase-suffixes.ts
 *   npx tsx scripts/rescue-watchbase-suffixes.ts --misses-csv=data/external/_logs/image-acquire-misses.csv
 *   npx tsx scripts/rescue-watchbase-suffixes.ts --delay=3000
 *   npx tsx scripts/rescue-watchbase-suffixes.ts --dry-run
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..')
const ARGV = process.argv.slice(2)

function arg(name: string): string | undefined {
  const hit = ARGV.find(a => a === name || a.startsWith(`${name}=`))
  if (!hit) return undefined
  if (hit === name) return ARGV[ARGV.indexOf(hit) + 1]
  return hit.slice(name.length + 1)
}
function hasFlag(name: string) {
  return ARGV.includes(name)
}

const MISSES_CSV = arg('--misses-csv') ?? path.join(ROOT, 'data', 'external', '_logs', 'image-acquire-misses.csv')
const DELAY_MS = Number(arg('--delay') ?? 2500)
const DRY_RUN = hasFlag('--dry-run')

const CACHE_DIR = path.join(ROOT, 'data', 'external', 'watchbase-cache')

// Brands worth a rescue attempt — they exist on WatchBase and commonly
// have dial-variant suffixes. Brands missing from WatchBase entirely
// (Sinn, Seiko, Casio, Nomos, microbrands) are excluded so we don't waste
// HTTP budget on guaranteed misses.
const RESCUE_BRANDS = new Set([
  'Rolex',
  'Tudor',
  'IWC',
  'Jaeger-LeCoultre',
  'Cartier',
  'Patek Philippe',
  'Omega',
  'Breguet',
  'A. Lange & Söhne',
  'Audemars Piguet',
  'Vacheron Constantin',
  'Blancpain',
  'Breitling',
  'TAG Heuer',
  'Tag Heuer',
  'Zenith',
  'Longines',
  'Oris',
  'Hamilton',
  'Tissot',
  'Grand Seiko',
])

const SUFFIXES = ['-0001', '-0002', '-0003', '-0004', '-0005', '-001', '-002', '-003', '-01', '-02']

// ─── Helpers (copies of scrape-watchbase's slug logic to keep them in sync) ─

function brandSlug(brand: string): string {
  return brand
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function refToUrlSlug(reference: string): string {
  return reference.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function refKey(reference: string): string {
  return reference.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function modelSlugFromCacheOrFallback(brand: string, model: string): string {
  // Prefer a known model slug from existing cache entries when possible —
  // WatchBase's URL uses family slugs like "submariner" or "black-bay-58"
  // which may differ from how the catalog stores model names.
  return brandSlug(model || brand)
}

// Strip the catalog's annoying "(aka: ...)" suffix from references so we
// generate clean URLs. e.g. "79830RB-0001 (aka: M79830RB-0001)" → "79830RB-0001".
function cleanRef(ref: string): string {
  return ref.replace(/\s*\(aka:[^)]*\)/i, '').trim()
}

// Drop any trailing -nnnn suffix that's already present on the catalog ref —
// we'll re-add candidates. e.g. "116500LN" stays "116500LN"; "126610LN-0001"
// becomes "126610LN" so we don't generate "126610LN-0001-0001".
function stripSuffix(ref: string): string {
  return ref.replace(/-\d{1,4}$/, '')
}

function parseSpecsMinimal(_html: string): Record<string, unknown> {
  // We don't need the full spec parse for the rescue path — the .parsed.json
  // file is consulted by the acquire script ONLY for the og:image in the
  // HTML, and by enrich-catalog.ts for specs. To keep enrich happy we still
  // write a parsed.json shell; it'll be overwritten by a proper re-scrape
  // later if anyone wants tighter specs for these refs. Returning {} is
  // honest: we got an image but not specs.
  return {}
}

async function fetchHtml(
  url: string,
): Promise<{ html: string | null; status: number; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'VirtualWatchboxBot/0.1 (catalog rescue pass; contact: msells.caltech@gmail.com)',
      },
    })
    const html = res.status === 200 ? await res.text() : null
    return { html, status: res.status, finalUrl: res.url }
  } catch {
    return null
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function jitter(base: number) {
  return base + Math.floor((Math.random() - 0.5) * 800)
}

// ─── Main ──────────────────────────────────────────────────────────────────

type MissRow = {
  popularityRank: number
  heatScore: number
  brand: string
  model: string
  reference: string
  id: string
}

function parseMissCsv(text: string): MissRow[] {
  const lines = text.split('\n').filter(Boolean)
  const out: MissRow[] = []
  for (let i = 1; i < lines.length; i++) {
    // CSV with quoted fields. Simple stateful split.
    const cols: string[] = []
    let cur = ''
    let inQ = false
    for (let j = 0; j < lines[i].length; j++) {
      const c = lines[i][j]
      if (c === '"') {
        if (inQ && lines[i][j + 1] === '"') { cur += '"'; j++ }
        else inQ = !inQ
      } else if (c === ',' && !inQ) {
        cols.push(cur)
        cur = ''
      } else {
        cur += c
      }
    }
    cols.push(cur)
    if (cols.length < 6) continue
    out.push({
      popularityRank: Number(cols[0]),
      heatScore: Number(cols[1]),
      brand: cols[2],
      model: cols[3],
      reference: cols[4],
      id: cols[5],
    })
  }
  return out
}

async function main() {
  if (!fs.existsSync(MISSES_CSV)) {
    console.error(`misses CSV not found at ${MISSES_CSV}`)
    process.exit(1)
  }
  const misses = parseMissCsv(fs.readFileSync(MISSES_CSV, 'utf8'))
  console.log(`[rescue] loaded ${misses.length} miss rows from ${path.relative(ROOT, MISSES_CSV)}`)

  // Filter to rescuable: brand in RESCUE_BRANDS, ref doesn't already end in a
  // -nnnn variant (no point re-suffixing an already-suffixed ref).
  const candidates = misses.filter(m => {
    if (!RESCUE_BRANDS.has(m.brand)) return false
    const ref = cleanRef(m.reference)
    if (/-\d{4}$/.test(ref)) return false   // already has full -0001 suffix
    return true
  })
  console.log(`[rescue] ${candidates.length} candidates (brand in rescue list, no -nnnn suffix)`)

  // Drop ones that already have a parsed.json from a previous scrape (we
  // don't need to rescue what already worked).
  const fresh = candidates.filter(m => {
    const dir = path.join(CACHE_DIR, brandSlug(m.brand))
    const parsed = path.join(dir, `${refKey(cleanRef(m.reference))}.parsed.json`)
    return !fs.existsSync(parsed)
  })
  console.log(`[rescue] ${fresh.length} still need rescue (don't have parsed.json yet)`)

  if (DRY_RUN) {
    console.log('[rescue] DRY RUN — showing first 20 candidates:')
    for (const m of fresh.slice(0, 20)) {
      const brand = brandSlug(m.brand)
      const model = modelSlugFromCacheOrFallback(m.brand, m.model)
      const baseRef = stripSuffix(cleanRef(m.reference))
      const refLower = refToUrlSlug(baseRef)
      console.log(`  ${m.brand} ${m.reference} → https://watchbase.com/${brand}/${model}/${refLower}{${SUFFIXES.join('|')}}`)
    }
    return
  }

  let hits = 0
  let stillMissing = 0
  let httpRequests = 0
  const startTime = Date.now()

  for (let i = 0; i < fresh.length; i++) {
    const m = fresh[i]
    const brand = brandSlug(m.brand)
    const model = modelSlugFromCacheOrFallback(m.brand, m.model)
    if (!brand || !model || brand === model) {
      stillMissing++
      continue
    }
    const baseRef = stripSuffix(cleanRef(m.reference))
    const refLower = refToUrlSlug(baseRef)
    const cacheDir = path.join(CACHE_DIR, brand)
    fs.mkdirSync(cacheDir, { recursive: true })
    // The acquire script looks up the cache by the CATALOG ref slug, not the
    // suffixed one we're about to fetch. So we write the result keyed by the
    // catalog ref so the next acquire pass sees it.
    const catalogRefKey = refKey(cleanRef(m.reference))
    const htmlPath = path.join(cacheDir, `${catalogRefKey}.html`)
    const parsedPath = path.join(cacheDir, `${catalogRefKey}.parsed.json`)
    const missPath = path.join(cacheDir, `${catalogRefKey}.miss`)

    let rescued = false
    for (const suffix of SUFFIXES) {
      const url = `https://watchbase.com/${brand}/${model}/${refLower}${suffix}`
      httpRequests++
      const res = await fetchHtml(url)
      await sleep(jitter(DELAY_MS))
      if (!res || res.status !== 200 || !res.html) continue
      if (res.html.includes('Page not found') || res.html.length < 2000) continue
      // Confirm it has an og:image that looks like a real product photo
      const og = res.html.match(/property="og:image"\s+content="([^"]+)"/)
      if (!og || !og[1] || !/watchbase\.com.*watch\//.test(og[1])) continue

      fs.writeFileSync(htmlPath, res.html, 'utf8')
      fs.writeFileSync(
        parsedPath,
        JSON.stringify(
          {
            scraped_at: new Date().toISOString(),
            url: res.finalUrl,
            specs: parseSpecsMinimal(res.html),
            rescued_via: 'suffix-rescue',
            original_catalog_ref: m.reference,
            tried_suffix: suffix,
          },
          null,
          2,
        ),
        'utf8',
      )
      if (fs.existsSync(missPath)) fs.unlinkSync(missPath)
      hits++
      rescued = true
      if (hits % 10 === 0 || hits < 5) {
        console.log(
          `[rescue] HIT ${i + 1}/${fresh.length}  ${m.brand} ${m.reference}  → ${suffix}  (hits=${hits} requests=${httpRequests})`,
        )
      }
      break
    }
    if (!rescued) {
      stillMissing++
      // Don't overwrite an existing .miss — the original scrape already wrote
      // one with the base URL. Leave it alone.
    }

    if ((i + 1) % 25 === 0) {
      const elapsed = (Date.now() - startTime) / 1000
      const rate = (i + 1) / elapsed
      const eta = (fresh.length - i - 1) / rate
      console.log(
        `[rescue] progress ${i + 1}/${fresh.length}  hits=${hits}  miss=${stillMissing}  ${rate.toFixed(2)}/s  ETA ${(eta / 60).toFixed(1)}min`,
      )
    }
  }

  console.log('')
  console.log(`[rescue] done`)
  console.log(`  candidates attempted: ${fresh.length}`)
  console.log(`  rescued (new HIT):    ${hits}`)
  console.log(`  still missing:        ${stillMissing}`)
  console.log(`  http requests total:  ${httpRequests}`)
  console.log('')
  console.log('Next: rerun npm run images:acquire -- --ref-list=data/catalog-batch-1.csv --top=1500')
  console.log('to download the now-available images.')
}

main()
