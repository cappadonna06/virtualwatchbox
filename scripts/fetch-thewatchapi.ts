/**
 * thewatchapi client — free-tier budget-aware fetcher with on-disk cache.
 *
 * Free tier: 25 calls/day. This script tracks daily usage in
 * data/external/thewatchapi-cache/_quota.json so re-running the same day
 * doesn't overspend; reruns on later days resume from where we left off.
 *
 * Modes:
 *   --mode=list-brands              (1 call) cache the global brand list
 *   --mode=list-refs                cache reference lists per brand
 *     --brands=Rolex,Omega,Tudor    (defaults to a priority set)
 *   --mode=list-models              cache model lists per brand
 *   --mode=search-refs              search by reference number
 *     --seed=data/catalog-seed-1500.csv     (input seed; defaults to 200-row)
 *     --top=100                              (process top N refs by communitySignal)
 *
 * Flags:
 *   --budget=N    cap calls this invocation (default = remaining daily quota)
 *   --dry-run     log planned calls, make no network requests
 *   --force       ignore cache and refetch
 *
 * Auth:
 *   THE_WATCH_API_TOKEN env var (or hardcoded in .env.local)
 *
 * Outputs (per mode):
 *   list-brands  → _brand_list.json
 *   list-refs    → _references_<brand>.json
 *   list-models  → _models_<brand>.json
 *   search-refs  → <refkey>.json   (one file per reference; cached)
 */

import fs from 'node:fs'
import path from 'node:path'
import { repoRoot, parseCsv, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()

const cacheDir = path.join(repoRoot, 'data', 'external', 'thewatchapi-cache')
const quotaFile = path.join(cacheDir, '_quota.json')

const ARGV = process.argv.slice(2)
function arg(name: string, fallback?: string): string | undefined {
  const hit = ARGV.find(a => a === name || a.startsWith(`${name}=`))
  if (!hit) return fallback
  if (hit === name) {
    const idx = ARGV.indexOf(hit)
    return ARGV[idx + 1] ?? fallback
  }
  return hit.slice(name.length + 1) ?? fallback
}
function hasFlag(name: string): boolean {
  return ARGV.includes(name)
}

const TOKEN = process.env.THE_WATCH_API_TOKEN ?? process.env.THEWATCHAPI_TOKEN
const MODE = arg('--mode', 'list-brands')!
const BRANDS_ARG = arg('--brands')
const TOP = Number(arg('--top') ?? 100)
const BUDGET_OVERRIDE = arg('--budget')
const SEED_CSV =
  arg('--seed') ?? process.env.SEED_CSV ?? path.join('data', 'catalog-seed-200.csv')
const DRY_RUN = hasFlag('--dry-run')
const FORCE = hasFlag('--force')

// Intersection of our priority collector brands and the thewatchapi free-tier
// catalog (34 brands total). Bell & Ross and Nomos aren't in the API at this
// tier, so we drop them. Blancpain and Breguet are in the API and worth
// including; we add them here.
const DEFAULT_BRANDS = [
  'Rolex',
  'Omega',
  'Patek Philippe',
  'Audemars Piguet',
  'Vacheron Constantin',
  'A. Lange & Söhne',
  'Cartier',
  'Jaeger-LeCoultre',
  'Grand Seiko',
  'IWC',
  'Breitling',
  'TAG Heuer',
  'Panerai',
  'Zenith',
  'Tudor',
  'Hublot',
  'Richard Mille',
  'Longines',
  'Seiko',
  'Citizen',
  'Tissot',
  'Oris',
  'Blancpain',
  'Breguet',
]

const FREE_TIER_DAILY = 25

type QuotaState = {
  date: string
  calls: number
  history: Array<{ at: string; endpoint: string; query: string }>
}

function readQuota(): QuotaState {
  if (!fs.existsSync(quotaFile)) {
    return { date: today(), calls: 0, history: [] }
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(quotaFile, 'utf8')) as QuotaState
    if (parsed.date !== today()) {
      // new day, reset counter (keep history)
      return { date: today(), calls: 0, history: parsed.history ?? [] }
    }
    return parsed
  } catch {
    return { date: today(), calls: 0, history: [] }
  }
}

function writeQuota(state: QuotaState) {
  fs.mkdirSync(cacheDir, { recursive: true })
  fs.writeFileSync(quotaFile, JSON.stringify(state, null, 2), 'utf8')
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function brandFilename(brand: string): string {
  return brand
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function refKey(ref: string): string {
  return ref.toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function apiGet(endpoint: string, params: Record<string, string>): Promise<unknown> {
  if (!TOKEN) {
    throw new Error('THE_WATCH_API_TOKEN env var not set')
  }
  const url = new URL(`https://api.thewatchapi.com${endpoint}`)
  url.searchParams.set('api_token', TOKEN)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`thewatchapi ${endpoint} → HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

type Spender = (endpoint: string, params: Record<string, string>) => Promise<unknown>

function makeSpender(quota: QuotaState, budgetCap: number): Spender {
  return async (endpoint, params) => {
    if (quota.calls >= budgetCap) {
      throw new Error(`budget exhausted (${quota.calls}/${budgetCap})`)
    }
    if (DRY_RUN) {
      console.log(`[thewatchapi] DRY ${endpoint} ${JSON.stringify(params)}`)
      quota.calls += 1
      return { data: [] }
    }
    const data = await apiGet(endpoint, params)
    quota.calls += 1
    quota.history.push({
      at: new Date().toISOString(),
      endpoint,
      query: JSON.stringify(params),
    })
    writeQuota(quota)
    return data
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Modes
// ─────────────────────────────────────────────────────────────────────────

async function modeListBrands(spend: Spender) {
  const outPath = path.join(cacheDir, '_brand_list.json')
  if (!FORCE && fs.existsSync(outPath)) {
    console.log(`[thewatchapi] brand list cached at ${path.relative(repoRoot, outPath)}, skipping (use --force to refetch)`)
    return
  }
  const data = await spend('/v1/brand/list', {})
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8')
  const arr = Array.isArray((data as { data?: unknown }).data) ? (data as { data: string[] }).data : []
  console.log(`[thewatchapi] cached ${arr.length} brands → ${path.relative(repoRoot, outPath)}`)
}

async function modeListRefs(spend: Spender) {
  const brands = (BRANDS_ARG ? BRANDS_ARG.split(',').map(s => s.trim()) : DEFAULT_BRANDS).filter(Boolean)
  for (const brand of brands) {
    const outPath = path.join(cacheDir, `_references_${brandFilename(brand)}.json`)
    if (!FORCE && fs.existsSync(outPath)) {
      console.log(`[thewatchapi] refs for ${brand} cached, skipping`)
      continue
    }
    try {
      const data = await spend('/v1/reference/list', { brand })
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8')
      const arr = Array.isArray((data as { data?: unknown }).data) ? (data as { data: string[] }).data : []
      console.log(`[thewatchapi] ${brand}: ${arr.length} refs → ${path.relative(repoRoot, outPath)}`)
    } catch (err) {
      console.error(`[thewatchapi] ${brand} failed: ${(err as Error).message}`)
      if ((err as Error).message.includes('budget')) return
    }
  }
}

async function modeListModels(spend: Spender) {
  const brands = (BRANDS_ARG ? BRANDS_ARG.split(',').map(s => s.trim()) : DEFAULT_BRANDS).filter(Boolean)
  for (const brand of brands) {
    const outPath = path.join(cacheDir, `_models_${brandFilename(brand)}.json`)
    if (!FORCE && fs.existsSync(outPath)) {
      console.log(`[thewatchapi] models for ${brand} cached, skipping`)
      continue
    }
    try {
      const data = await spend('/v1/model/list', { brand })
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8')
      const arr = Array.isArray((data as { data?: unknown }).data) ? (data as { data: string[] }).data : []
      console.log(`[thewatchapi] ${brand}: ${arr.length} models → ${path.relative(repoRoot, outPath)}`)
    } catch (err) {
      console.error(`[thewatchapi] ${brand} failed: ${(err as Error).message}`)
      if ((err as Error).message.includes('budget')) return
    }
  }
}

async function modeSearchRefs(spend: Spender) {
  const seedPath = path.resolve(repoRoot, SEED_CSV)
  if (!fs.existsSync(seedPath)) {
    throw new Error(`seed CSV not found at ${seedPath}`)
  }
  const rows = parseCsv(fs.readFileSync(seedPath, 'utf8')) as unknown as Array<{
    brand: string
    reference: string
    communitySignal?: string
  }>

  // Prioritize: core_icon > curated > enthusiast_icon > rest
  const priority = (sig: string): number =>
    sig === 'core_icon'
      ? 0
      : sig === 'curated'
        ? 1
        : sig === 'enthusiast_icon'
          ? 2
          : sig === 'enthusiast_value'
            ? 3
            : 4

  const ordered = rows
    .filter(r => r.reference)
    .sort((a, b) => priority(a.communitySignal ?? '') - priority(b.communitySignal ?? ''))
    .slice(0, TOP)

  let processed = 0
  for (const row of ordered) {
    const key = refKey(row.reference)
    const outPath = path.join(cacheDir, `${key}.json`)
    if (!FORCE && fs.existsSync(outPath)) {
      continue
    }
    try {
      const data = await spend('/v1/model/search', {
        search: row.reference,
        search_attributes: 'reference_number',
      })
      const arr = (data as { data?: unknown[] }).data ?? []
      // The API returns an array; we cache the first matching record (or empty)
      const first = arr[0] ?? null
      fs.writeFileSync(
        outPath,
        JSON.stringify(
          first ?? { _miss: true, brand: row.brand, reference_number: row.reference },
          null,
          2,
        ),
        'utf8',
      )
      processed += 1
      console.log(
        `[thewatchapi] ${row.brand} ${row.reference} → ${first ? 'hit' : 'miss'} (${processed} this run)`,
      )
    } catch (err) {
      console.error(`[thewatchapi] ${row.brand} ${row.reference} failed: ${(err as Error).message}`)
      if ((err as Error).message.includes('budget')) return
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(cacheDir, { recursive: true })

  if (!TOKEN && !DRY_RUN) {
    console.error('Missing THE_WATCH_API_TOKEN env var. Set it or use --dry-run.')
    process.exit(1)
  }

  const quota = readQuota()
  const remaining = Math.max(0, FREE_TIER_DAILY - quota.calls)
  const budget = BUDGET_OVERRIDE ? Number(BUDGET_OVERRIDE) : remaining
  const budgetCap = quota.calls + budget

  console.log(
    `[thewatchapi] date=${quota.date} used=${quota.calls}/${FREE_TIER_DAILY} budgetThisRun=${budget} mode=${MODE}${DRY_RUN ? ' DRY_RUN' : ''}`,
  )

  if (budget <= 0) {
    console.log('[thewatchapi] daily quota exhausted, exiting')
    return
  }

  const spend = makeSpender(quota, budgetCap)

  switch (MODE) {
    case 'list-brands':
      await modeListBrands(spend)
      break
    case 'list-refs':
      await modeListRefs(spend)
      break
    case 'list-models':
      await modeListModels(spend)
      break
    case 'search-refs':
      await modeSearchRefs(spend)
      break
    default:
      console.error(`Unknown mode: ${MODE}`)
      process.exit(1)
  }

  writeQuota(quota)
  console.log(`[thewatchapi] done. used ${quota.calls}/${FREE_TIER_DAILY} today.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
