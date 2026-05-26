/**
 * WatchBase scraper — the spec workhorse.
 *
 * Strategy:
 *   1. For each (brand, reference) in the seed CSV, search watchbase.com
 *      via their public search results page.
 *   2. Pick the first watch-page link from the results (heuristic: the link
 *      whose URL path looks like /<brand-slug>/<some-id>).
 *   3. Cache the HTML to data/external/watchbase-cache/<brand>/<refkey>.html
 *      and the parsed infobox to <refkey>.parsed.json.
 *   4. Throttle: WATCHBASE_DELAY_MS ms between requests (default 3000),
 *      jittered ±1000ms. Exponential backoff on 429/5xx.
 *
 * Re-runnable: skips refs already in the cache. Track misses in
 * <brand>/_misses.json so we don't re-search the same dead ends.
 *
 * Usage:
 *   npm run catalog:scrape-watchbase
 *   SEED_CSV=data/catalog-seed-1500.csv npm run catalog:scrape-watchbase
 *   WATCHBASE_DELAY_MS=5000 npm run catalog:scrape-watchbase
 *   WATCHBASE_LIMIT=20 npm run catalog:scrape-watchbase    (just N rows for testing)
 *   WATCHBASE_DRY_RUN=1 npm run catalog:scrape-watchbase  (no network)
 */

import fs from 'node:fs'
import path from 'node:path'
import { repoRoot, parseCsv } from './watch-image-pipeline'

const cacheDir = path.join(repoRoot, 'data', 'external', 'watchbase-cache')

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
const DELAY_MS = Number(process.env.WATCHBASE_DELAY_MS ?? 3000)
const LIMIT = Number(process.env.WATCHBASE_LIMIT ?? 0)
const TOP = Number(process.env.WATCHBASE_TOP ?? 0)
const DRY_RUN = process.env.WATCHBASE_DRY_RUN === '1'
const USER_AGENT =
  'VirtualWatchboxBot/0.1 (catalog hydration; contact: msells.caltech@gmail.com)'

type SeedRow = { brand: string; reference: string; id: string; model?: string }

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

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

function jitter(base: number) {
  return base + Math.round((Math.random() * 2 - 1) * 1000)
}

async function fetchHtml(url: string, attempt = 1): Promise<{ html: string; finalUrl: string; status: number }> {
  if (DRY_RUN) return { html: '', finalUrl: url, status: 200 }
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  })
  // 403 from WatchBase's WAF behaves the same as 429 — transient anti-bot
  // throttling. Retry with longer backoff than 429 (Cloudflare-style blocks
  // need minutes to lift, not seconds).
  if (res.status === 403 || res.status === 429 || res.status >= 500) {
    if (attempt >= 5) throw new Error(`HTTP ${res.status} after ${attempt} attempts`)
    const base = res.status === 403 ? 30000 : 5000
    const wait = base * 2 ** (attempt - 1)
    console.warn(`[watchbase] ${res.status} for ${url}, backing off ${wait}ms (attempt ${attempt})`)
    await sleep(wait)
    return fetchHtml(url, attempt + 1)
  }
  // 404 is treated as a permanent miss — caller writes a miss marker.
  if (res.status === 404) return { html: '', finalUrl: res.url, status: 404 }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const html = await res.text()
  return { html, finalUrl: res.url, status: res.status }
}

// WatchBase URL pattern: /{brand-slug}/{family-slug}/{ref-with-dashes}
// Their search page is JS-rendered and returns no anchor links, so we
// must build the URL directly. Rolex auto-redirects short refs to the
// full canonical ref (e.g. /rolex/submariner/126610LN → 126610ln-0001).
function refToUrlSlug(reference: string): string {
  return reference.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function watchbaseDirectUrl(brand: string, model: string, reference: string): string | null {
  if (!brand || !reference) return null
  const b = brandSlug(brand)
  const m = brandSlug(model || brand)
  const r = refToUrlSlug(reference)
  if (!b || !m || !r) return null
  // Skip rows where model is just the brand name (unresolvable).
  if (m === b) return null
  return `https://watchbase.com/${b}/${m}/${r}`
}

// ─────────────────────────────────────────────────────────────────────────
// Infobox parser
// ─────────────────────────────────────────────────────────────────────────

type ParsedSpecs = {
  caseSizeMm: number | null
  lugWidthMm: number | null
  lugToLugMm: number | null
  thicknessMm: number | null
  caseMaterial: string | null
  caseFinish: string | null
  bezelMaterial: string | null
  bezelType: string | null
  crystalMaterial: string | null
  waterResistanceM: number | null
  weightG: number | null
  dialColor: string | null
  dialFinish: string | null
  markerType: string | null
  lumeColor: string | null
  movement: string | null
  caliber: string | null
  movementType: string | null
  powerReserveHours: number | null
  frequencyVph: number | null
  jewelCount: number | null
  braceletType: string | null
  claspType: string | null
  yearIntroduced: number | null
  yearDiscontinued: number | null
  productionStatus: string | null
  complications: string[] | null
  modelFamily: string | null
  countryOfOrigin: string | null
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Pull rows from WatchBase's <dl>/<table>/<div> spec lists. The HTML
// historically uses something like:
//   <li><span class="param-name">Case diameter</span><span class="param-value">41 mm</span></li>
// We grab span-pairs and fall back to row-pairs.
function extractSpecMap(html: string): Map<string, string> {
  const map = new Map<string, string>()

  // Pattern 1: <span class="param-name">X</span> ... <span class="param-value">Y</span>
  const p1 = /<[^>]*class="[^"]*(?:param-name|spec-name|key|label)[^"]*"[^>]*>([^<]+)<\/[^>]+>\s*<[^>]*class="[^"]*(?:param-value|spec-value|value)[^"]*"[^>]*>([\s\S]*?)<\//gi
  for (const m of html.matchAll(p1)) {
    const key = stripTags(m[1]).toLowerCase().replace(/\s+/g, ' ').trim()
    const value = stripTags(m[2])
    if (key && value) map.set(key, value)
  }

  // Pattern 2: <th>X</th><td>Y</td>
  const p2 = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi
  for (const m of html.matchAll(p2)) {
    const key = stripTags(m[1]).toLowerCase().replace(/\s+/g, ' ').trim()
    const value = stripTags(m[2])
    if (key && value && !map.has(key)) map.set(key, value)
  }

  // Pattern 3: <dt>X</dt><dd>Y</dd>
  const p3 = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi
  for (const m of html.matchAll(p3)) {
    const key = stripTags(m[1]).toLowerCase().replace(/\s+/g, ' ').trim()
    const value = stripTags(m[2])
    if (key && value && !map.has(key)) map.set(key, value)
  }

  return map
}

// Label aliases — WatchBase uses short labels (W/R, Color, Produced, Indexes,
// Glass, Height) so we put those FIRST in each alias list to match them
// preferentially. Other sources (WatchSpecs, brand sites) use the longer
// forms which are kept as fallbacks. Match is `key === alias || key.includes(alias)`.
const LABEL_ALIASES: Record<keyof ParsedSpecs, string[]> = {
  caseSizeMm: ['diameter', 'case diameter', 'case size'],
  lugWidthMm: ['lug width', 'strap width', 'band width'],
  lugToLugMm: ['lug to lug', 'lug-to-lug', 'lug to lug length'],
  thicknessMm: ['height', 'case thickness', 'thickness'],
  caseMaterial: ['material', 'materials', 'case material'],
  caseFinish: ['case finish'],
  bezelMaterial: ['bezel', 'bezel material'],
  bezelType: ['bezel type'],
  crystalMaterial: ['glass', 'crystal'],
  waterResistanceM: ['w/r', 'water resistance', 'water resistant'],
  weightG: ['weight'],
  dialColor: ['color', 'dial color', 'dial colour', 'dial'],
  dialFinish: ['finish', 'dial finish'],
  markerType: ['indexes', 'hour markers', 'markers', 'indices'],
  lumeColor: ['lume', 'luminous', 'super-luminova'],
  movement: ['movement'],
  caliber: ['caliber', 'calibre'],
  movementType: ['movement type', 'type of movement'],
  powerReserveHours: ['power reserve', 'power-reserve'],
  frequencyVph: ['frequency', 'beats per hour', 'vph'],
  jewelCount: ['jewels', 'number of jewels'],
  braceletType: ['bracelet', 'strap'],
  claspType: ['clasp', 'buckle'],
  yearIntroduced: ['produced', 'year introduced', 'introduced', 'year of production', 'years of production'],
  yearDiscontinued: ['year discontinued', 'discontinued'],
  productionStatus: ['limited', 'production', 'production status'],
  complications: ['complications', 'features', 'functions'],
  modelFamily: ['family', 'collection', 'series'],
  countryOfOrigin: ['country of origin', 'origin', 'made in'],
}

function pickSpec(map: Map<string, string>, aliases: string[]): string | null {
  for (const alias of aliases) {
    for (const [key, value] of map) {
      if (key === alias || key.includes(alias)) {
        return value
      }
    }
  }
  return null
}

function parseMm(value: string | null): number | null {
  if (!value) return null
  const m = value.replace(',', '.').match(/(\d+(?:\.\d+)?)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 && n < 100 ? n : null
}

function parseIntSafe(value: string | null): number | null {
  if (!value) return null
  const m = value.match(/(\d{1,8})/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function parseWater(value: string | null): number | null {
  if (!value) return null
  // "100 m / 330 ft" or "300m" or "20 ATM" (1 ATM ≈ 10 m)
  const mDirect = value.match(/(\d+)\s*m\b/i)
  if (mDirect) return Number(mDirect[1])
  const atm = value.match(/(\d+)\s*atm/i)
  if (atm) return Number(atm[1]) * 10
  const bar = value.match(/(\d+)\s*bar/i)
  if (bar) return Number(bar[1]) * 10
  return null
}

function parsePowerReserve(value: string | null): number | null {
  if (!value) return null
  const m = value.match(/(\d+)\s*(?:h|hr|hours?)/i)
  if (m) return Number(m[1])
  // "5 days" or "72 hours"
  const d = value.match(/(\d+)\s*days?/i)
  if (d) return Number(d[1]) * 24
  return parseIntSafe(value)
}

function parseYearRange(value: string | null): { start: number | null; end: number | null } {
  if (!value) return { start: null, end: null }
  const m = value.match(/(\d{4})(?:\s*[-–to]+\s*(\d{4}|present|current))?/i)
  if (!m) return { start: null, end: null }
  const start = Number(m[1])
  const endRaw = m[2]
  let end: number | null = null
  if (endRaw && /^\d{4}$/.test(endRaw)) end = Number(endRaw)
  return { start, end }
}

function classifyMovementType(value: string | null): string | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v.includes('automatic')) return 'automatic'
  if (v.includes('manual') || v.includes('hand-wind')) return 'manual'
  if (v.includes('quartz')) return 'quartz'
  if (v.includes('spring drive') || v.includes('spring-drive')) return 'spring-drive'
  if (v.includes('solar')) return 'solar'
  return null
}

function classifyBraceletType(value: string | null): string | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v.includes('integrated')) return 'integrated'
  if (v.includes('bracelet') || v.includes('oyster') || v.includes('jubilee')) return 'bracelet'
  if (v.includes('strap') || v.includes('leather') || v.includes('rubber') || v.includes('fabric'))
    return 'strap'
  return null
}

function parseSpecs(html: string): ParsedSpecs {
  const map = extractSpecMap(html)
  const get = (key: keyof ParsedSpecs) => pickSpec(map, LABEL_ALIASES[key])

  const years = parseYearRange(get('yearIntroduced'))
  const movement = get('movement')
  const bracelet = get('braceletType')

  return {
    caseSizeMm: parseMm(get('caseSizeMm')),
    lugWidthMm: parseMm(get('lugWidthMm')),
    lugToLugMm: parseMm(get('lugToLugMm')),
    thicknessMm: parseMm(get('thicknessMm')),
    caseMaterial: get('caseMaterial'),
    caseFinish: get('caseFinish'),
    bezelMaterial: get('bezelMaterial'),
    bezelType: get('bezelType'),
    crystalMaterial: get('crystalMaterial'),
    waterResistanceM: parseWater(get('waterResistanceM')),
    weightG: parseIntSafe(get('weightG')),
    dialColor: get('dialColor'),
    dialFinish: get('dialFinish'),
    markerType: get('markerType'),
    lumeColor: get('lumeColor'),
    movement,
    caliber: get('caliber'),
    movementType: classifyMovementType(get('movementType') ?? movement),
    powerReserveHours: parsePowerReserve(get('powerReserveHours')),
    frequencyVph: parseIntSafe(get('frequencyVph')),
    jewelCount: parseIntSafe(get('jewelCount')),
    braceletType: classifyBraceletType(bracelet),
    claspType: get('claspType'),
    yearIntroduced: years.start,
    yearDiscontinued: years.end,
    productionStatus: get('productionStatus'),
    complications: (() => {
      const raw = get('complications')
      if (!raw) return null
      return raw
        .split(/[,;/]/)
        .map(s => s.trim())
        .filter(Boolean)
    })(),
    modelFamily: get('modelFamily'),
    countryOfOrigin: get('countryOfOrigin'),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Main loop
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(cacheDir, { recursive: true })

  // Prefer enriched JSON for heat-ordered priority. Fall back to seed CSV.
  // Exception: if --seed was explicitly passed on the command line, honor it
  // (used to scope the scrape to a curated batch CSV rather than the full
  // enriched catalog).
  const seedExplicit = process.argv.slice(2).some(a => a === '--seed' || a.startsWith('--seed='))
  const enrichedPath = path.resolve(repoRoot, ENRICHED_JSON)
  let rows: Array<SeedRow & { heatScore?: number; popularityRank?: number }> = []
  if (!seedExplicit && fs.existsSync(enrichedPath)) {
    console.log(`[watchbase] reading priorities from ${path.relative(repoRoot, enrichedPath)}`)
    const enriched = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'))
    rows = (enriched.records as Array<Record<string, unknown>>)
      .map(r => ({
        brand: (r.brand as string) || '',
        reference: (r.reference as string) || '',
        // Use modelFamily if available (closer to WatchBase's URL slug),
        // else fall back to model.
        model: ((r.modelFamily as string) || (r.model as string) || '') as string,
        id: (r.id as string) || '',
        heatScore: typeof r.heatScore === 'number' ? r.heatScore : 0,
        popularityRank: typeof r.popularityRank === 'number' ? r.popularityRank : 999999,
      }))
      .filter(r => r.brand && r.reference)
      .sort((a, b) => (a.popularityRank ?? 999999) - (b.popularityRank ?? 999999))
  } else {
    const seedPath = path.resolve(repoRoot, SEED_CSV)
    if (!fs.existsSync(seedPath)) {
      console.error(`Seed CSV not found at ${seedPath}`)
      process.exit(1)
    }
    rows = parseCsv(fs.readFileSync(seedPath, 'utf8')) as unknown as SeedRow[]
  }

  const targets = TOP > 0 ? rows.slice(0, TOP) : LIMIT > 0 ? rows.slice(0, LIMIT) : rows
  console.log(
    `[watchbase] ${targets.length} rows targeted (of ${rows.length}), delay=${DELAY_MS}ms${DRY_RUN ? ' DRY_RUN' : ''}`,
  )

  let hits = 0
  let misses = 0
  let skipped = 0
  let consecutiveErrors = 0
  const CIRCUIT_BREAKER_THRESHOLD = 15

  for (const row of targets) {
    if (!row.brand || !row.reference) {
      skipped += 1
      continue
    }
    const brandDir = path.join(cacheDir, brandSlug(row.brand))
    fs.mkdirSync(brandDir, { recursive: true })
    const htmlPath = path.join(brandDir, `${refKey(row.reference)}.html`)
    const parsedPath = path.join(brandDir, `${refKey(row.reference)}.parsed.json`)
    const missPath = path.join(brandDir, `${refKey(row.reference)}.miss`)

    if (fs.existsSync(parsedPath)) {
      skipped += 1
      continue
    }
    if (fs.existsSync(missPath)) {
      skipped += 1
      continue
    }

    try {
      const url = watchbaseDirectUrl(row.brand, row.model ?? '', row.reference)
      if (!url) {
        fs.writeFileSync(missPath, 'no-url\n' + new Date().toISOString(), 'utf8')
        misses += 1
        await sleep(jitter(DELAY_MS))
        continue
      }
      const { html, finalUrl, status } = await fetchHtml(url)
      // 404 → permanent miss. WatchBase's HTML 200 with "Page not found" also.
      if (status === 404 || !html || html.includes('Page not found') || html.length < 2000) {
        fs.writeFileSync(missPath, 'not-found\n' + new Date().toISOString(), 'utf8')
        misses += 1
        if (misses % 25 === 0 || misses < 10) {
          console.log(`[watchbase] miss ${row.brand} / ${row.reference}  → ${url}`)
        }
        await sleep(jitter(DELAY_MS))
        continue
      }
      fs.writeFileSync(htmlPath, html, 'utf8')
      const specs = parseSpecs(html)
      fs.writeFileSync(
        parsedPath,
        JSON.stringify(
          { scraped_at: new Date().toISOString(), url: finalUrl, specs },
          null,
          2,
        ),
        'utf8',
      )
      hits += 1
      consecutiveErrors = 0
      if (hits % 25 === 0 || hits < 20) {
        console.log(`[watchbase] HIT  ${row.brand} / ${row.reference}  → ${finalUrl}  (specs: ${Object.values(specs).filter(v => v != null && v !== '' && !(Array.isArray(v) && v.length === 0)).length}/${Object.keys(specs).length})`)
      }
    } catch (err) {
      console.error(`[watchbase] error ${row.brand} ${row.reference}: ${(err as Error).message}`)
      consecutiveErrors += 1
      if (consecutiveErrors >= CIRCUIT_BREAKER_THRESHOLD) {
        console.error(`[watchbase] circuit breaker tripped: ${consecutiveErrors} consecutive errors. Aborting so we don't burn requests against an active block. Re-run after waiting.`)
        break
      }
      await sleep(jitter(DELAY_MS))
      continue
    }
    await sleep(jitter(DELAY_MS))
  }

  console.log(`[watchbase] done. hits=${hits} misses=${misses} skipped=${skipped}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
