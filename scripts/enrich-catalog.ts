/**
 * Catalog enrichment pipeline.
 *
 * Merges identity from a seed CSV with spec/price data from many external
 * sources, using a priority-ordered per-field resolver. Output is a single
 * JSON artifact with provenance per field, ready for promotion into
 * lib/watches.ts or upsert into public.catalog_watches.
 *
 * Identity input (required):
 *   data/catalog-seed-200.csv  (or whatever SEED_CSV / --seed= points at)
 *
 * Per-reference caches (optional):
 *   data/external/thewatchapi-cache/<refkey>.json
 *   data/external/watchbase-cache/<brand>/<refkey>.parsed.json
 *   data/external/chrono24-cache/<refkey>.json
 *   data/external/watchspecs-cache/<id>.html
 *   data/external/llm-extracts/<id>.json
 *
 * Kaggle datasets (optional, loaded once at startup, all detected automatically):
 *   data/external/kaggle/watch_db.csv                        — 40k structured catalog (;-delimited)
 *   data/external/kaggle/archive4/watch_data.csv             — 163k ref-keyed catalog
 *   data/external/kaggle/archive1/Luxury watch.csv           — 508 rows w/ Band Width (no ref; brand+model match)
 *   data/external/kaggle/archive/Watches.csv                 — 533k Chrono24-style listings (pricing)
 *   data/external/kaggle/archive3/samiwatches.csv            — 1.6k luxury w/ Turkish columns
 *   data/external/chrono24-listings.csv                      — legacy single-file Kaggle path (back-compat)
 *
 * Output: data/catalog-enriched.json (or OUTPUT_JSON env / --out= arg).
 *
 * Per-field priority order — see FIELD_PRIORITY for exceptions:
 *   seed > brand_site > watch_db > thewatchapi > watchbase >
 *   kaggle:luxury163k > chrono24:scrape > kaggle:chrono24-big >
 *   kaggle:luxury508 > kaggle:sami > watchspecs:cache > llm:extract
 *
 * Offline-safe: every source loader returns empty when its file is absent.
 */

import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { parseCsv, repoRoot } from './watch-image-pipeline'
import { computeHeatScore } from './heat-score'

const argv = process.argv.slice(2)
function argValue(flag: string): string | undefined {
  const hit = argv.find(a => a === flag || a.startsWith(`${flag}=`))
  if (!hit) return undefined
  if (hit === flag) {
    const idx = argv.indexOf(hit)
    return argv[idx + 1]
  }
  return hit.slice(flag.length + 1)
}

const seedPath = path.resolve(
  repoRoot,
  argValue('--seed') ?? process.env.SEED_CSV ?? path.join('data', 'catalog-seed-200.csv'),
)
const outputPath = path.resolve(
  repoRoot,
  argValue('--out') ?? process.env.OUTPUT_JSON ?? path.join('data', 'catalog-enriched.json'),
)

const externalDir = path.join(repoRoot, 'data', 'external')
const kaggleDir = path.join(externalDir, 'kaggle')

const kaggleLegacyPath =
  process.env.KAGGLE_LISTINGS_CSV ?? path.join(externalDir, 'chrono24-listings.csv')

// Per-dataset paths (default locations created by the unzip step).
const watchDbCsvPath = process.env.WATCH_DB_CSV ?? path.join(kaggleDir, 'watch_db.csv')
const luxury163kCsvPath =
  process.env.LUXURY_163K_CSV ?? path.join(kaggleDir, 'archive4', 'watch_data.csv')
const luxury508CsvPath =
  process.env.LUXURY_508_CSV ?? path.join(kaggleDir, 'archive1', 'Luxury watch.csv')
const chrono24BigCsvPath =
  process.env.CHRONO24_BIG_CSV ?? path.join(kaggleDir, 'archive', 'Watches.csv')
const samiCsvPath = process.env.SAMI_CSV ?? path.join(kaggleDir, 'archive3', 'samiwatches.csv')

const watchspecsCacheDir =
  process.env.WATCHSPECS_CACHE_DIR ?? path.join(externalDir, 'watchspecs-cache')
const thewatchapiCacheDir = path.join(externalDir, 'thewatchapi-cache')
const watchbaseCacheDir = path.join(externalDir, 'watchbase-cache')
const chrono24CacheDir = path.join(externalDir, 'chrono24-cache')
const llmExtractDir = path.join(externalDir, 'llm-extracts')

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

type SeedRow = {
  id: string
  brand: string
  model: string
  reference: string
  dialColor: string
  watchType: string
  sourceUrl: string
  communitySignal: string
  verificationStatus: string
}

type FieldSource =
  | 'seed'
  | 'brand_site'
  | 'watch_db'
  | 'thewatchapi'
  | 'watchbase'
  | 'kaggle:luxury163k'
  | 'kaggle:luxury508'
  | 'kaggle:sami'
  | 'kaggle:chrono24-big:median'
  | 'kaggle:chrono24-big:mode'
  | 'chrono24:scrape'
  | 'chrono24:kaggle:median'
  | 'chrono24:kaggle:mode'
  | 'watchspecs:cache'
  | 'llm:extract'
  // Layer 2 — pure-JS imputation from same (brand, family) median.
  | 'family_median:strong'
  | 'family_median:weak'
  // Layer 3 — CatBoost prediction from scripts/predict-prices.py.
  | 'catboost:predict'

const DEFAULT_PRIORITY: FieldSource[] = [
  'seed',
  'brand_site',
  'watch_db',
  'thewatchapi',
  'watchbase',
  'kaggle:luxury163k',
  'kaggle:luxury508',
  'kaggle:sami',
  'chrono24:scrape',
  'kaggle:chrono24-big:median',
  'kaggle:chrono24-big:mode',
  'chrono24:kaggle:median',
  'chrono24:kaggle:mode',
  'watchspecs:cache',
  'llm:extract',
]

const FIELD_PRIORITY: Partial<Record<string, FieldSource[]>> = {
  estimatedValue: [
    'chrono24:scrape',
    'kaggle:chrono24-big:median',
    'chrono24:kaggle:median',
    'kaggle:luxury163k',
    'kaggle:luxury508',
    'kaggle:sami',
    'llm:extract',
  ],
  // Band/lug width: luxury508 has explicit Band Width column.
  lugWidthMm: ['kaggle:luxury508', 'watchbase', 'brand_site', 'watchspecs:cache', 'llm:extract'],
  // watch_db has structured caliber from manufacturer specs.
  caliber: ['watch_db', 'watchbase', 'brand_site', 'thewatchapi', 'llm:extract'],
  waterResistanceM: ['watch_db', 'watchbase', 'kaggle:luxury508', 'kaggle:sami', 'llm:extract'],
  thicknessMm: ['watch_db', 'watchbase', 'kaggle:luxury508', 'llm:extract'],
  powerReserveHours: ['watch_db', 'watchbase', 'kaggle:luxury508', 'kaggle:sami', 'llm:extract'],
  // Mode-of-mode/median fields from listing datasets work for these:
  caseSizeMm: [
    'seed',
    'watch_db',
    'thewatchapi',
    'watchbase',
    'kaggle:luxury163k',
    'kaggle:luxury508',
    'kaggle:sami',
    'chrono24:scrape',
    'kaggle:chrono24-big:median',
    'chrono24:kaggle:median',
    'watchspecs:cache',
    'llm:extract',
  ],
  yearIntroduced: ['watch_db', 'watchbase', 'thewatchapi', 'kaggle:chrono24-big:mode', 'llm:extract'],
}

type Candidate<T> = { source: FieldSource; value: T }

type EnrichedRecord = {
  id: string
  brand: string
  model: string
  reference: string
  sourceUrl: string | null
  communitySignal: string | null

  caseSizeMm: number | null
  caseMaterial: string | null
  dialColor: string | null
  movement: string | null
  complications: string[]
  estimatedValue: number | null
  watchType: string | null

  lugWidthMm: number | null
  modelFamily: string | null
  nickname: string | null
  lugToLugMm: number | null
  thicknessMm: number | null
  caseFinish: string | null
  bezelMaterial: string | null
  bezelType: string | null
  crystalMaterial: string | null
  waterResistanceM: number | null
  weightG: number | null
  dialFinish: string | null
  markerType: string | null
  lumeColor: string | null
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
  limitedEditionCount: number | null
  msrpAtLaunchUsd: number | null
  countryOfOrigin: string | null
  styleTags: string[]
  genderTarget: string | null

  // Pricing — layered, with explicit confidence + layer attribution.
  // valueLayer is 'direct' for Layer 1, 'family_median' for Layer 2,
  // 'catboost' for Layer 3, null when no price could be assigned.
  // valueConfidence reflects how trustworthy the price is for display.
  estimatedValueLow: number | null
  estimatedValueHigh: number | null
  valueLayer: 'direct' | 'family_median' | 'catboost' | null
  valueConfidence: 'high' | 'medium' | 'low' | null

  // Heat / popularity computed after merge. heatScore is 0-1000;
  // popularityRank is the strict ordinal (1 = hottest) — assigned after all
  // records exist, broken ties first by chrono24ListingCount then by
  // luxury163kListingCount so the 67-at-1000 cluster doesn't sit on one
  // rank.
  heatScore: number
  popularityRank: number
  chrono24ListingCount: number
  luxury163kListingCount: number
  heatBreakdown: {
    brandTier: { value: string; points: number }
    marketActivity: number
    curationSignal: number
    sourceCorroboration: number
    nicknameBonus: number
  }

  provenance: Partial<Record<string, FieldSource>>
}

// ─────────────────────────────────────────────────────────────────────────
// Normalizers + small utils
// ─────────────────────────────────────────────────────────────────────────

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeReference(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeBrand(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '')
}

function normalizeModelKey(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function brandSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parsePrice(raw: string | number | null | undefined): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : null
  const cleaned = String(raw).replace(/[^0-9.,-]/g, '').replace(/,/g, '')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseMm(raw: string | number | null | undefined): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 && raw < 100 ? raw : null
  const match = String(raw).replace(',', '.').match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) && parsed > 0 && parsed < 100 ? parsed : null
}

function parseIntSafe(raw: string | number | null | undefined): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') return Number.isInteger(raw) ? raw : null
  const match = String(raw).match(/(\d{1,8})/)
  if (!match) return null
  const n = Number(match[1])
  return Number.isFinite(n) ? n : null
}

function parseYear(raw: string | number | null | undefined): number | null {
  const n = parseIntSafe(raw)
  if (n == null) return null
  return n >= 1900 && n <= 2100 ? n : null
}

function parseWaterResistance(raw: string | null | undefined): number | null {
  if (!raw) return null
  const s = String(raw)
  const m = s.match(/(\d+(?:\.\d+)?)\s*m\b/i)
  if (m) return Number(m[1])
  const atm = s.match(/(\d+)\s*atm/i)
  if (atm) return Number(atm[1]) * 10
  const bar = s.match(/(\d+)\s*bar/i)
  if (bar) return Number(bar[1]) * 10
  const ft = s.match(/(\d+)\s*ft/i)
  if (ft) return Math.round(Number(ft[1]) * 0.3048)
  return null
}

function parsePowerReserve(raw: string | null | undefined): number | null {
  if (!raw) return null
  const s = String(raw)
  const h = s.match(/(\d+)\s*(?:h|hr|hours?|saat)/i)
  if (h) return Number(h[1])
  const d = s.match(/(\d+)\s*days?/i)
  if (d) return Number(d[1]) * 24
  return parseIntSafe(s)
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function mode<T>(values: T[]): T | null {
  if (values.length === 0) return null
  const counts = new Map<T, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best: T | null = null
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best
}

function readJsonSafe<T>(filePath: string): T | null {
  if (!fsSync.existsSync(filePath)) return null
  try {
    return JSON.parse(fsSync.readFileSync(filePath, 'utf8')) as T
  } catch (err) {
    console.warn(`[enrich] failed to parse JSON at ${filePath}: ${(err as Error).message}`)
    return null
  }
}

function classifyMovementType(value: string | null | undefined): string | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v.includes('spring drive') || v.includes('spring-drive')) return 'spring-drive'
  if (v.includes('quartz')) return 'quartz'
  if (v.includes('solar')) return 'solar'
  if (v.includes('automatic') || v.includes('otomatik') || v.includes('self-winding')) return 'automatic'
  if (v.includes('manual') || v.includes('hand-wind') || v.includes('hand wound') || v.includes('manual winding'))
    return 'manual'
  return null
}

function classifyBraceletType(value: string | null | undefined): string | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v.includes('integrated')) return 'integrated'
  if (v.includes('bracelet') || v.includes('oyster') || v.includes('jubilee') || v.includes('milanese'))
    return 'bracelet'
  if (
    v.includes('strap') ||
    v.includes('leather') ||
    v.includes('rubber') ||
    v.includes('fabric') ||
    v.includes('nato')
  )
    return 'strap'
  return null
}

// CSV parser for the large datasets. Handles `"…"` quoting (commas inside
// quoted fields, double-quote escapes, AND newlines inside quoted fields).
// Much faster than a row-at-a-time char parser on large files because we
// only walk the buffer once.
//
// encoding: 'utf8' is the default; pass 'windows-1252' for Western-European
// 8-bit files (notably watch_db.csv, which uses 0x96 en-dash etc.).
function* iterCsvRows(
  filePath: string,
  delimiter: string,
  encoding: 'utf8' | 'windows-1252' = 'utf8',
): Generator<Record<string, string>> {
  if (!fsSync.existsSync(filePath)) return
  const content =
    encoding === 'windows-1252'
      ? new TextDecoder('windows-1252').decode(fsSync.readFileSync(filePath))
      : fsSync.readFileSync(filePath, 'utf8')
  const len = content.length
  if (len === 0) return

  // Parse first row as headers.
  let pos = 0
  const headers: string[] = []
  let field = ''
  let quoted = false
  while (pos < len) {
    const ch = content[pos]
    if (quoted) {
      if (ch === '"' && content[pos + 1] === '"') {
        field += '"'
        pos += 2
        continue
      }
      if (ch === '"') {
        quoted = false
        pos += 1
        continue
      }
      field += ch
      pos += 1
      continue
    }
    if (ch === '"') {
      quoted = true
      pos += 1
      continue
    }
    if (ch === delimiter) {
      headers.push(field.replace(/^﻿/, '').trim())
      field = ''
      pos += 1
      continue
    }
    if (ch === '\n' || ch === '\r') {
      headers.push(field.replace(/^﻿/, '').trim())
      field = ''
      pos += 1
      if (ch === '\r' && content[pos] === '\n') pos += 1
      break
    }
    field += ch
    pos += 1
  }

  // Parse data rows.
  let row: string[] = []
  field = ''
  quoted = false
  while (pos < len) {
    const ch = content[pos]
    if (quoted) {
      if (ch === '"' && content[pos + 1] === '"') {
        field += '"'
        pos += 2
        continue
      }
      if (ch === '"') {
        quoted = false
        pos += 1
        continue
      }
      field += ch
      pos += 1
      continue
    }
    if (ch === '"') {
      quoted = true
      pos += 1
      continue
    }
    if (ch === delimiter) {
      row.push(field)
      field = ''
      pos += 1
      continue
    }
    if (ch === '\n' || ch === '\r') {
      row.push(field)
      field = ''
      pos += 1
      if (ch === '\r' && content[pos] === '\n') pos += 1
      if (row.length === 1 && row[0] === '') {
        row = []
        continue
      }
      const obj: Record<string, string> = {}
      for (let j = 0; j < headers.length; j += 1) {
        obj[headers[j]] = (row[j] ?? '').trim()
      }
      row = []
      yield obj
      continue
    }
    field += ch
    pos += 1
  }
  if (field || row.length > 0) {
    row.push(field)
    const obj: Record<string, string> = {}
    for (let j = 0; j < headers.length; j += 1) {
      obj[headers[j]] = (row[j] ?? '').trim()
    }
    yield obj
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Source loaders
// ─────────────────────────────────────────────────────────────────────────

function readSeed(): SeedRow[] {
  if (!fsSync.existsSync(seedPath)) {
    throw new Error(`Seed CSV not found at ${seedPath}`)
  }
  const content = fsSync.readFileSync(seedPath, 'utf8')
  return parseCsv(content) as unknown as SeedRow[]
}

// ─── watch_db.csv (40k structured catalog, ; delimited) ────────────────
type WatchDbRecord = {
  modelFamily: string | null
  caliber: string | null
  movement: string | null
  complications: string[]
  caseMaterial: string | null
  crystalMaterial: string | null
  caseSizeMm: number | null
  thicknessMm: number | null
  waterResistanceM: number | null
  dialColor: string | null
  markerType: string | null
  productionStatus: string | null
  limitedEditionCount: number | null
  description: string | null
}

function loadWatchDb(): Map<string, WatchDbRecord> {
  const map = new Map<string, WatchDbRecord>()
  if (!fsSync.existsSync(watchDbCsvPath)) return map
  let count = 0
  for (const row of iterCsvRows(watchDbCsvPath, ';', 'windows-1252')) {
    const brand = row['Brand']
    const ref = row['Reference']
    if (!brand || !ref) continue
    const key = `${normalizeBrand(brand)}::${normalizeReference(ref)}`
    const calibre = row['Movement_Caliber'] || null
    const functionsRaw = row['Movement_Functions'] || ''
    const complications = functionsRaw
      .split(/[|,]/)
      .map(s => s.trim())
      .filter(s => s && !/^hours?$/i.test(s) && !/^minutes?$/i.test(s) && !/^seconds?$/i.test(s))
    const limited = row['Limited'] || ''
    const limitedMatch = limited.match(/(\d{1,6})/)
    map.set(key, {
      modelFamily: row['Family'] || null,
      caliber: calibre,
      movement: calibre,
      complications,
      caseMaterial: row['Case Material'] || null,
      crystalMaterial: row['Glass'] || null,
      caseSizeMm: parseMm(row['Diameter']),
      thicknessMm: parseMm(row['Height']),
      waterResistanceM: parseWaterResistance(row['W/R']),
      dialColor: row['Dial Color'] || null,
      markerType: row['Indexes'] || null,
      productionStatus: /^yes/i.test(limited) ? 'limited' : null,
      limitedEditionCount: limitedMatch ? Number(limitedMatch[1]) : null,
      description: row['Description'] || null,
    })
    count += 1
  }
  console.log(`[enrich] watch_db: indexed ${count} rows`)
  return map
}

// ─── archive4/watch_data.csv (163k ref-keyed) ──────────────────────────
type Luxury163kListing = {
  caseMaterial: string | null
  braceletType: string | null
  dialColor: string | null
  markerType: string | null
  bezelMaterial: string | null
  estimatedValue: number | null
  complications: string[]
}

function loadLuxury163k(): Map<string, Luxury163kListing[]> {
  const map = new Map<string, Luxury163kListing[]>()
  if (!fsSync.existsSync(luxury163kCsvPath)) return map
  let count = 0
  for (const row of iterCsvRows(luxury163kCsvPath, ',')) {
    const brand = row['Brand']
    const ref = row['Reference']
    if (!brand || !ref) continue
    const key = `${normalizeBrand(brand)}::${normalizeReference(ref)}`
    const entry: Luxury163kListing = {
      caseMaterial: row['Case material'] || null,
      braceletType: classifyBraceletType(row['Bracelet material']),
      dialColor: row['Dial'] || null,
      markerType: row['Hour Markings'] || null,
      bezelMaterial: row['Lunette Material'] || null,
      estimatedValue: parsePrice(row['Price']),
      complications:
        (row['Complication'] || '')
          .split(/[,/|]/)
          .map(s => s.trim())
          .filter(s => s && !/^automatic$|^quartz$|^manual$/i.test(s)),
    }
    const bucket = map.get(key)
    if (bucket) bucket.push(entry)
    else map.set(key, [entry])
    count += 1
  }
  console.log(`[enrich] kaggle:luxury163k: indexed ${count} listings → ${map.size} (brand,ref) keys`)
  return map
}

type Luxury163kAggregate = {
  caseMaterial: string | null
  braceletType: string | null
  dialColor: string | null
  markerType: string | null
  bezelMaterial: string | null
  estimatedValue: number | null
  complications: string[]
}

function aggregateLuxury163k(listings: Luxury163kListing[]): Luxury163kAggregate {
  return {
    caseMaterial: mode(listings.map(l => l.caseMaterial).filter((v): v is string => Boolean(v))),
    braceletType: mode(listings.map(l => l.braceletType).filter((v): v is string => Boolean(v))),
    dialColor: mode(listings.map(l => l.dialColor).filter((v): v is string => Boolean(v))),
    markerType: mode(listings.map(l => l.markerType).filter((v): v is string => Boolean(v))),
    bezelMaterial: mode(listings.map(l => l.bezelMaterial).filter((v): v is string => Boolean(v))),
    estimatedValue: median(
      listings.map(l => l.estimatedValue).filter((v): v is number => v != null),
    ),
    complications:
      mode(
        listings
          .map(l => l.complications.join(', '))
          .filter(s => s.length > 0),
      )?.split(/,\s*/) ?? [],
  }
}

// ─── archive1/Luxury watch.csv (508 rows, brand+model match, has Band Width) ──
type Luxury508Record = {
  caseSizeMm: number | null
  thicknessMm: number | null
  lugWidthMm: number | null
  caseMaterial: string | null
  braceletType: string | null
  movementType: string | null
  waterResistanceM: number | null
  dialColor: string | null
  crystalMaterial: string | null
  complications: string[]
  powerReserveHours: number | null
  estimatedValue: number | null
}

function loadLuxury508(): Map<string, Luxury508Record> {
  const map = new Map<string, Luxury508Record>()
  if (!fsSync.existsSync(luxury508CsvPath)) return map
  let count = 0
  for (const row of iterCsvRows(luxury508CsvPath, ',')) {
    const brand = row['Brand']
    const model = row['Model']
    if (!brand || !model) continue
    const key = `${normalizeBrand(brand)}::${normalizeModelKey(model)}`
    const complications = (row['Complications'] || '')
      .split(/[,/|]/)
      .map(s => s.trim())
      .filter(Boolean)
    map.set(key, {
      caseSizeMm: parseMm(row['Case Diameter (mm)']),
      thicknessMm: parseMm(row['Case Thickness (mm)']),
      lugWidthMm: parseMm(row['Band Width (mm)']),
      caseMaterial: row['Case Material'] || null,
      braceletType: classifyBraceletType(row['Strap Material']),
      movementType: classifyMovementType(row['Movement Type']),
      waterResistanceM: parseWaterResistance(row['Water Resistance']),
      dialColor: row['Dial Color'] || null,
      crystalMaterial: row['Crystal Material'] || null,
      complications,
      powerReserveHours: parsePowerReserve(row['Power Reserve']),
      estimatedValue: parsePrice(row['Price (USD)']),
    })
    count += 1
  }
  console.log(`[enrich] kaggle:luxury508: indexed ${count} brand+model entries`)
  return map
}

// ─── archive3/samiwatches.csv (1.6k luxury, Turkish columns) ───────────
type SamiRecord = {
  caseSizeMm: number | null
  caseMaterial: string | null
  movementType: string | null
  waterResistanceM: number | null
  powerReserveHours: number | null
  dialColor: string | null
  braceletType: string | null
  estimatedValue: number | null
  modelFamily: string | null
  countryOfOrigin: string | null
  yearIntroduced: number | null
}

function loadSami(): Map<string, SamiRecord> {
  const map = new Map<string, SamiRecord>()
  if (!fsSync.existsSync(samiCsvPath)) return map
  let count = 0
  for (const row of iterCsvRows(samiCsvPath, ',')) {
    const brand = row['MARKA']
    const ref = row['REFERANS']
    if (!brand || !ref) continue
    const key = `${normalizeBrand(brand)}::${normalizeReference(ref)}`
    // Turkish lira to USD: skip explicit conversion, leave value out unless
    // there's a clearly USD field. price_category_improved is qualitative.
    map.set(key, {
      caseSizeMm: parseMm(row['case_diameter_numeric'] || row['KASA ÇAPI']),
      caseMaterial: row['case_material_category'] || row['KASA MATERYALI'] || null,
      movementType: classifyMovementType(row['MEKANIZMA']),
      waterResistanceM: parseWaterResistance(row['water_resistance_standardized'] || row['SU REZISTANSI']),
      powerReserveHours: parsePowerReserve(row['GÜÇ REZERVI']),
      dialColor: row['KADRAN'] || null,
      braceletType: classifyBraceletType(row['KAYIŞ']),
      // Sami prices are in TRY. Skip until we have a conversion source.
      estimatedValue: null,
      modelFamily: row['KOLEKSIYON'] || null,
      countryOfOrigin: row['brand_country'] || null,
      yearIntroduced: null,
    })
    count += 1
  }
  console.log(`[enrich] kaggle:sami: indexed ${count} luxury entries`)
  return map
}

// ─── archive/Watches.csv (533k Chrono24-style listings, big pricing src) ──
type Chrono24BigListing = {
  price: number | null
  caseSizeMm: number | null
  caseMaterial: string | null
  movement: string | null
  yearIntroduced: number | null
}

function loadChrono24Big(): Map<string, Chrono24BigListing[]> {
  const map = new Map<string, Chrono24BigListing[]>()
  if (!fsSync.existsSync(chrono24BigCsvPath)) return map
  let count = 0
  for (const row of iterCsvRows(chrono24BigCsvPath, ',')) {
    const brand = row['brand']
    const ref = row['ref']
    if (!brand || !ref) continue
    const key = `${normalizeBrand(brand)}::${normalizeReference(ref)}`
    const entry: Chrono24BigListing = {
      price: parsePrice(row['price']),
      caseSizeMm: parseMm(row['size']),
      caseMaterial: row['casem'] || null,
      movement: row['mvmt'] || null,
      yearIntroduced: parseYear(row['yop']),
    }
    const bucket = map.get(key)
    if (bucket) bucket.push(entry)
    else map.set(key, [entry])
    count += 1
    if (count % 100000 === 0) {
      console.log(`[enrich] chrono24-big: ${count} rows…`)
    }
  }
  console.log(`[enrich] kaggle:chrono24-big: indexed ${count} listings → ${map.size} (brand,ref) keys`)
  return map
}

type Chrono24BigAgg = {
  estimatedValue: number | null
  caseSizeMm: number | null
  caseMaterial: string | null
  movement: string | null
  yearIntroduced: number | null
  listingCount: number
}

function aggregateChrono24Big(listings: Chrono24BigListing[]): Chrono24BigAgg {
  return {
    estimatedValue: median(listings.map(l => l.price).filter((v): v is number => v != null)),
    caseSizeMm: median(listings.map(l => l.caseSizeMm).filter((v): v is number => v != null)),
    caseMaterial: mode(listings.map(l => l.caseMaterial).filter((v): v is string => Boolean(v))),
    movement: mode(listings.map(l => l.movement).filter((v): v is string => Boolean(v))),
    yearIntroduced: median(
      listings.map(l => l.yearIntroduced).filter((v): v is number => v != null),
    )
      ? Math.floor(
          median(listings.map(l => l.yearIntroduced).filter((v): v is number => v != null))!,
        )
      : null,
    listingCount: listings.length,
  }
}

// ─── Legacy single-file Kaggle Chrono24 CSV (back-compat) ──────────────
type LegacyKaggleListing = {
  brandKey: string
  refKey: string
  price: number | null
  caseSizeMm: number | null
  caseMaterial: string | null
  dialColor: string | null
  movement: string | null
}

const LEGACY_KAGGLE_ALIASES = {
  brand: ['brand', 'manufacturer', 'maker'],
  reference: ['reference', 'reference_number', 'ref', 'refnumber', 'reference_no'],
  price: ['price', 'price_usd', 'avg_price', 'value', 'list_price', 'asking_price'],
  caseDiameter: ['case_diameter', 'diameter', 'case_size', 'case_size_mm', 'casesize', 'size'],
  caseMaterial: ['case_material', 'material', 'case', 'casematerial'],
  dial: ['dial', 'dial_color', 'dialcolor', 'color', 'dial_colour'],
  movement: ['movement', 'caliber', 'movement_type', 'movementtype'],
} as const

function pickCol(row: Record<string, string>, candidates: readonly string[]) {
  for (const candidate of candidates) {
    const target = normalizeKey(candidate)
    for (const key of Object.keys(row)) {
      if (normalizeKey(key) === target) {
        const value = row[key]?.trim()
        if (value) return value
      }
    }
  }
  return ''
}

function loadLegacyKaggle(): Map<string, LegacyKaggleListing[]> {
  const map = new Map<string, LegacyKaggleListing[]>()
  if (!fsSync.existsSync(kaggleLegacyPath)) return map
  const content = fsSync.readFileSync(kaggleLegacyPath, 'utf8')
  const rows = parseCsv(content) as unknown as Array<Record<string, string>>
  for (const row of rows) {
    const rawBrand = pickCol(row, LEGACY_KAGGLE_ALIASES.brand)
    const rawRef = pickCol(row, LEGACY_KAGGLE_ALIASES.reference)
    if (!rawBrand || !rawRef) continue
    const key = `${normalizeBrand(rawBrand)}::${normalizeReference(rawRef)}`
    const entry: LegacyKaggleListing = {
      brandKey: normalizeBrand(rawBrand),
      refKey: normalizeReference(rawRef),
      price: parsePrice(pickCol(row, LEGACY_KAGGLE_ALIASES.price)),
      caseSizeMm: parseMm(pickCol(row, LEGACY_KAGGLE_ALIASES.caseDiameter)),
      caseMaterial: pickCol(row, LEGACY_KAGGLE_ALIASES.caseMaterial) || null,
      dialColor: pickCol(row, LEGACY_KAGGLE_ALIASES.dial) || null,
      movement: pickCol(row, LEGACY_KAGGLE_ALIASES.movement) || null,
    }
    const bucket = map.get(key)
    if (bucket) bucket.push(entry)
    else map.set(key, [entry])
  }
  return map
}

type LegacyKaggleAggregate = {
  caseSizeMm: number | null
  caseMaterial: string | null
  dialColor: string | null
  movement: string | null
  estimatedValue: number | null
}
function aggregateLegacyKaggle(listings: LegacyKaggleListing[]): LegacyKaggleAggregate {
  return {
    caseSizeMm: median(listings.map(l => l.caseSizeMm).filter((v): v is number => v != null)),
    caseMaterial: mode(listings.map(l => l.caseMaterial).filter((v): v is string => Boolean(v))),
    dialColor: mode(listings.map(l => l.dialColor).filter((v): v is string => Boolean(v))),
    movement: mode(listings.map(l => l.movement).filter((v): v is string => Boolean(v))),
    estimatedValue: median(listings.map(l => l.price).filter((v): v is number => v != null)),
  }
}

// ─── thewatchapi cache ─────────────────────────────────────────────────
type TheWatchApiRecord = {
  brand: string
  reference_number: string
  model: string
  movement?: string
  year_of_production?: string
  case_material?: string
  case_diameter?: string
  description?: string
  last_updated?: string
  _miss?: boolean
}

function readThewatchapi(reference: string): TheWatchApiRecord | null {
  const refKey = normalizeReference(reference)
  const filePath = path.join(thewatchapiCacheDir, `${refKey}.json`)
  const rec = readJsonSafe<TheWatchApiRecord>(filePath)
  if (rec && rec._miss) return null
  return rec
}

// ─── WatchBase scrape cache ────────────────────────────────────────────
type WatchbaseParsed = {
  scraped_at: string
  url: string
  specs: {
    caseSizeMm?: number | null
    lugWidthMm?: number | null
    lugToLugMm?: number | null
    thicknessMm?: number | null
    caseMaterial?: string | null
    caseFinish?: string | null
    bezelMaterial?: string | null
    bezelType?: string | null
    crystalMaterial?: string | null
    waterResistanceM?: number | null
    weightG?: number | null
    dialColor?: string | null
    dialFinish?: string | null
    markerType?: string | null
    lumeColor?: string | null
    movement?: string | null
    caliber?: string | null
    movementType?: string | null
    powerReserveHours?: number | null
    frequencyVph?: number | null
    jewelCount?: number | null
    braceletType?: string | null
    claspType?: string | null
    yearIntroduced?: number | null
    yearDiscontinued?: number | null
    productionStatus?: string | null
    complications?: string[] | null
    modelFamily?: string | null
    countryOfOrigin?: string | null
  }
}

function readWatchbase(brand: string, reference: string): WatchbaseParsed | null {
  const brandSlugged = brandSlug(brand)
  const refKey = normalizeReference(reference)
  const filePath = path.join(watchbaseCacheDir, brandSlugged, `${refKey}.parsed.json`)
  return readJsonSafe<WatchbaseParsed>(filePath)
}

// ─── Chrono24 live scrape cache ────────────────────────────────────────
type Chrono24Scrape = {
  scraped_at: string
  listings_count: number
  price_usd_median: number | null
  case_diameter_mm_mode?: number | null
  case_material_mode?: string | null
  dial_color_mode?: string | null
  top_image_url?: string | null
}

function readChrono24(reference: string): Chrono24Scrape | null {
  const refKey = normalizeReference(reference)
  const filePath = path.join(chrono24CacheDir, `${refKey}.json`)
  return readJsonSafe<Chrono24Scrape>(filePath)
}

// ─── LLM extracts ──────────────────────────────────────────────────────
type LlmExtract = {
  extracted_at: string
  fields: Partial<{
    dialColor: string
    complications: string[]
    watchType: string
    bezelType: string
    bezelMaterial: string
    lumeColor: string
    braceletType: string
    claspType: string
    modelFamily: string
    nickname: string
    msrpAtLaunchUsd: number
    countryOfOrigin: string
    caseFinish: string
    crystalMaterial: string
    markerType: string
    dialFinish: string
    movementType: string
    productionStatus: string
    waterResistanceM: number
    powerReserveHours: number
    caliber: string
    estimatedValue: number
  }>
}

function readLlmExtract(id: string): LlmExtract | null {
  return readJsonSafe<LlmExtract>(path.join(llmExtractDir, `${id}.json`))
}

// ─── Legacy watchspecs cache ───────────────────────────────────────────
type WatchspecsExtract = { caseSizeMm: number | null; lugWidthMm: number | null }
const SPEC_LABELS = {
  caseSize: ['case diameter', 'case size', 'diameter'],
  lugWidth: ['lug width', 'strap width', 'band width'],
}
function extractWatchspecsSpec(html: string, labels: string[]): number | null {
  const flat = html.replace(/\s+/g, ' ')
  for (const label of labels) {
    const pattern = new RegExp(
      `${label.replace(/ /g, '\\s+')}\\s*[:\\-]?\\s*<[^>]*>?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*mm`,
      'i',
    )
    const match = flat.match(pattern)
    if (match) {
      const value = Number(match[1])
      if (Number.isFinite(value) && value > 0 && value < 100) return value
    }
  }
  return null
}
function readWatchspecs(id: string): WatchspecsExtract | null {
  const filePath = path.join(watchspecsCacheDir, `${id}.html`)
  if (!fsSync.existsSync(filePath)) return null
  const html = fsSync.readFileSync(filePath, 'utf8')
  return {
    caseSizeMm: extractWatchspecsSpec(html, SPEC_LABELS.caseSize),
    lugWidthMm: extractWatchspecsSpec(html, SPEC_LABELS.lugWidth),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Per-field candidate resolver
// ─────────────────────────────────────────────────────────────────────────

function pickByPriority<T>(
  candidates: Array<Candidate<T | null | undefined>>,
  priority: FieldSource[],
): { value: T; source: FieldSource } | null {
  for (const source of priority) {
    const hit = candidates.find(c => c.source === source && c.value != null && c.value !== '')
    if (hit && hit.value != null) {
      return { value: hit.value as T, source }
    }
  }
  return null
}

function priorityFor(field: string): FieldSource[] {
  return FIELD_PRIORITY[field] ?? DEFAULT_PRIORITY
}

// ─────────────────────────────────────────────────────────────────────────
// Enrich one row
// ─────────────────────────────────────────────────────────────────────────

type SourceIndex = {
  watchDb: Map<string, WatchDbRecord>
  luxury163k: Map<string, Luxury163kListing[]>
  luxury508: Map<string, Luxury508Record>
  sami: Map<string, SamiRecord>
  chrono24Big: Map<string, Chrono24BigListing[]>
  legacyKaggle: Map<string, LegacyKaggleListing[]>
}

function enrichRow(seed: SeedRow, idx: SourceIndex): EnrichedRecord {
  const key = `${normalizeBrand(seed.brand)}::${normalizeReference(seed.reference)}`
  const modelKey = seed.model
    ? `${normalizeBrand(seed.brand)}::${normalizeModelKey(seed.model)}`
    : null

  const wd = idx.watchDb.get(key) ?? null
  const lux163Listings = idx.luxury163k.get(key) ?? []
  const lux163 = lux163Listings.length > 0 ? aggregateLuxury163k(lux163Listings) : null
  const lux508 = modelKey ? (idx.luxury508.get(modelKey) ?? null) : null
  const sami = idx.sami.get(key) ?? null
  const c24bigListings = idx.chrono24Big.get(key) ?? []
  const c24big = c24bigListings.length > 0 ? aggregateChrono24Big(c24bigListings) : null
  const legacyKaggleListings = idx.legacyKaggle.get(key) ?? []
  const legacyKaggle =
    legacyKaggleListings.length > 0 ? aggregateLegacyKaggle(legacyKaggleListings) : null

  const tw = readThewatchapi(seed.reference)
  const wb = readWatchbase(seed.brand, seed.reference)?.specs ?? null
  const c24 = readChrono24(seed.reference)
  const ws = readWatchspecs(seed.id)
  const llmExtract = readLlmExtract(seed.id)
  const lf = llmExtract?.fields ?? null

  const provenance: EnrichedRecord['provenance'] = {}

  function resolve<T>(
    field: string,
    candidates: Array<Candidate<T | null | undefined>>,
    fallback: T,
  ): T {
    const hit = pickByPriority<T>(candidates, priorityFor(field))
    if (hit) {
      provenance[field] = hit.source
      return hit.value
    }
    return fallback
  }

  function strCands(
    pulls: Array<[FieldSource, string | null | undefined]>,
  ): Array<Candidate<string | null>> {
    return pulls.map(([source, value]) => ({
      source,
      value: value && String(value).trim() ? String(value).trim() : null,
    }))
  }

  const caseSizeMm = resolve<number | null>('caseSizeMm', [
    { source: 'watch_db', value: wd?.caseSizeMm ?? null },
    { source: 'thewatchapi', value: parseMm(tw?.case_diameter) },
    { source: 'watchbase', value: wb?.caseSizeMm ?? null },
    { source: 'kaggle:luxury163k', value: null /* not in this dataset */ },
    { source: 'kaggle:luxury508', value: lux508?.caseSizeMm ?? null },
    { source: 'kaggle:sami', value: sami?.caseSizeMm ?? null },
    { source: 'chrono24:scrape', value: c24?.case_diameter_mm_mode ?? null },
    { source: 'kaggle:chrono24-big:median', value: c24big?.caseSizeMm ?? null },
    { source: 'chrono24:kaggle:median', value: legacyKaggle?.caseSizeMm ?? null },
    { source: 'watchspecs:cache', value: ws?.caseSizeMm ?? null },
  ], null)

  const lugWidthMm = resolve<number | null>('lugWidthMm', [
    { source: 'kaggle:luxury508', value: lux508?.lugWidthMm ?? null },
    { source: 'watchbase', value: wb?.lugWidthMm ?? null },
    { source: 'watchspecs:cache', value: ws?.lugWidthMm ?? null },
  ], null)

  const caseMaterial = resolve<string | null>('caseMaterial', [
    ...strCands([
      ['watch_db', wd?.caseMaterial],
      ['thewatchapi', tw?.case_material],
      ['watchbase', wb?.caseMaterial],
      ['kaggle:luxury163k', lux163?.caseMaterial],
      ['kaggle:luxury508', lux508?.caseMaterial],
      ['kaggle:sami', sami?.caseMaterial],
      ['chrono24:scrape', c24?.case_material_mode],
      ['kaggle:chrono24-big:mode', c24big?.caseMaterial],
      ['chrono24:kaggle:mode', legacyKaggle?.caseMaterial],
    ]),
  ], null)

  const dialColor = resolve<string | null>('dialColor', [
    ...strCands([
      ['seed', seed.dialColor],
      ['watch_db', wd?.dialColor],
      ['watchbase', wb?.dialColor],
      ['kaggle:luxury163k', lux163?.dialColor],
      ['kaggle:luxury508', lux508?.dialColor],
      ['kaggle:sami', sami?.dialColor],
      ['chrono24:scrape', c24?.dial_color_mode],
      ['chrono24:kaggle:mode', legacyKaggle?.dialColor],
      ['llm:extract', lf?.dialColor],
    ]),
  ], null)

  const movement = resolve<string | null>('movement', [
    ...strCands([
      ['watch_db', wd?.movement],
      ['watchbase', wb?.movement],
      ['thewatchapi', tw?.movement],
      ['kaggle:chrono24-big:mode', c24big?.movement],
      ['chrono24:kaggle:mode', legacyKaggle?.movement],
    ]),
  ], null)

  const watchType = resolve<string | null>('watchType', [
    ...strCands([
      ['seed', seed.watchType],
      ['llm:extract', lf?.watchType],
    ]),
  ], null)

  // complications: combine sources; prefer watch_db's manufacturer-listed
  // functions, then luxury163k's parsed complication field, then watchbase, llm
  let complications: string[] = []
  if (wd?.complications && wd.complications.length > 0) {
    complications = wd.complications
    provenance.complications = 'watch_db'
  } else if (lux163?.complications && lux163.complications.length > 0) {
    complications = lux163.complications
    provenance.complications = 'kaggle:luxury163k'
  } else if (wb?.complications && wb.complications.length > 0) {
    complications = wb.complications
    provenance.complications = 'watchbase'
  } else if (lux508?.complications && lux508.complications.length > 0) {
    complications = lux508.complications
    provenance.complications = 'kaggle:luxury508'
  } else if (lf?.complications && lf.complications.length > 0) {
    complications = lf.complications
    provenance.complications = 'llm:extract'
  }

  const estimatedValue = resolve<number | null>('estimatedValue', [
    { source: 'chrono24:scrape', value: c24?.price_usd_median ?? null },
    { source: 'kaggle:chrono24-big:median', value: c24big?.estimatedValue ?? null },
    { source: 'chrono24:kaggle:median', value: legacyKaggle?.estimatedValue ?? null },
    { source: 'kaggle:luxury163k', value: lux163?.estimatedValue ?? null },
    { source: 'kaggle:luxury508', value: lux508?.estimatedValue ?? null },
    { source: 'kaggle:sami', value: sami?.estimatedValue ?? null },
    { source: 'llm:extract', value: lf?.estimatedValue ?? null },
  ], null)

  const lugToLugMm = resolve<number | null>('lugToLugMm', [
    { source: 'watchbase', value: wb?.lugToLugMm ?? null },
  ], null)
  const thicknessMm = resolve<number | null>('thicknessMm', [
    { source: 'watch_db', value: wd?.thicknessMm ?? null },
    { source: 'watchbase', value: wb?.thicknessMm ?? null },
    { source: 'kaggle:luxury508', value: lux508?.thicknessMm ?? null },
  ], null)
  const caseFinish = resolve<string | null>('caseFinish',
    strCands([
      ['watchbase', wb?.caseFinish],
      ['llm:extract', lf?.caseFinish],
    ]), null)
  const bezelMaterial = resolve<string | null>('bezelMaterial',
    strCands([
      ['watchbase', wb?.bezelMaterial],
      ['kaggle:luxury163k', lux163?.bezelMaterial],
      ['llm:extract', lf?.bezelMaterial],
    ]), null)
  const bezelType = resolve<string | null>('bezelType',
    strCands([
      ['watchbase', wb?.bezelType],
      ['llm:extract', lf?.bezelType],
    ]), null)
  const crystalMaterial = resolve<string | null>('crystalMaterial',
    strCands([
      ['watch_db', wd?.crystalMaterial],
      ['watchbase', wb?.crystalMaterial],
      ['kaggle:luxury508', lux508?.crystalMaterial],
      ['llm:extract', lf?.crystalMaterial],
    ]), null)
  const waterResistanceM = resolve<number | null>('waterResistanceM', [
    { source: 'watch_db', value: wd?.waterResistanceM ?? null },
    { source: 'watchbase', value: wb?.waterResistanceM ?? null },
    { source: 'kaggle:luxury508', value: lux508?.waterResistanceM ?? null },
    { source: 'kaggle:sami', value: sami?.waterResistanceM ?? null },
    { source: 'llm:extract', value: lf?.waterResistanceM ?? null },
  ], null)
  const weightG = resolve<number | null>('weightG', [
    { source: 'watchbase', value: wb?.weightG ?? null },
  ], null)
  const dialFinish = resolve<string | null>('dialFinish',
    strCands([
      ['watchbase', wb?.dialFinish],
      ['llm:extract', lf?.dialFinish],
    ]), null)
  const markerType = resolve<string | null>('markerType',
    strCands([
      ['watch_db', wd?.markerType],
      ['watchbase', wb?.markerType],
      ['kaggle:luxury163k', lux163?.markerType],
      ['llm:extract', lf?.markerType],
    ]), null)
  const lumeColor = resolve<string | null>('lumeColor',
    strCands([
      ['watchbase', wb?.lumeColor],
      ['llm:extract', lf?.lumeColor],
    ]), null)
  const caliber = resolve<string | null>('caliber',
    strCands([
      ['watch_db', wd?.caliber],
      ['watchbase', wb?.caliber],
      ['llm:extract', lf?.caliber],
    ]), null)
  const movementType = resolve<string | null>('movementType',
    strCands([
      ['watchbase', wb?.movementType],
      ['kaggle:luxury508', lux508?.movementType],
      ['kaggle:sami', sami?.movementType],
      ['llm:extract', lf?.movementType],
    ]), null)
  const powerReserveHours = resolve<number | null>('powerReserveHours', [
    { source: 'watchbase', value: wb?.powerReserveHours ?? null },
    { source: 'kaggle:luxury508', value: lux508?.powerReserveHours ?? null },
    { source: 'kaggle:sami', value: sami?.powerReserveHours ?? null },
    { source: 'llm:extract', value: lf?.powerReserveHours ?? null },
  ], null)
  const frequencyVph = resolve<number | null>('frequencyVph', [
    { source: 'watchbase', value: wb?.frequencyVph ?? null },
  ], null)
  const jewelCount = resolve<number | null>('jewelCount', [
    { source: 'watchbase', value: wb?.jewelCount ?? null },
  ], null)
  const braceletType = resolve<string | null>('braceletType',
    strCands([
      ['watchbase', wb?.braceletType],
      ['kaggle:luxury163k', lux163?.braceletType],
      ['kaggle:luxury508', lux508?.braceletType],
      ['kaggle:sami', sami?.braceletType],
      ['llm:extract', lf?.braceletType],
    ]), null)
  const claspType = resolve<string | null>('claspType',
    strCands([
      ['watchbase', wb?.claspType],
      ['llm:extract', lf?.claspType],
    ]), null)

  const yearIntroduced = resolve<number | null>('yearIntroduced', [
    { source: 'watch_db', value: null /* watch_db doesn't have explicit year */ },
    { source: 'watchbase', value: wb?.yearIntroduced ?? null },
    { source: 'thewatchapi', value: parseYear((tw?.year_of_production || '').split('-')[0]) },
    { source: 'kaggle:chrono24-big:mode', value: c24big?.yearIntroduced ?? null },
    { source: 'llm:extract', value: null },
  ], null)
  const yearDiscontinued = resolve<number | null>('yearDiscontinued', [
    { source: 'watchbase', value: wb?.yearDiscontinued ?? null },
    { source: 'thewatchapi', value: parseYear((tw?.year_of_production || '').split('-')[1]) },
  ], null)
  const productionStatus = resolve<string | null>('productionStatus',
    strCands([
      ['watch_db', wd?.productionStatus],
      ['watchbase', wb?.productionStatus],
      ['llm:extract', lf?.productionStatus],
    ]), null)
  const modelFamily = resolve<string | null>('modelFamily',
    strCands([
      ['watch_db', wd?.modelFamily],
      ['watchbase', wb?.modelFamily],
      ['kaggle:sami', sami?.modelFamily],
      ['llm:extract', lf?.modelFamily],
    ]), null)
  const nickname = resolve<string | null>('nickname',
    strCands([['llm:extract', lf?.nickname]]), null)
  const countryOfOrigin = resolve<string | null>('countryOfOrigin',
    strCands([
      ['watchbase', wb?.countryOfOrigin],
      ['kaggle:sami', sami?.countryOfOrigin],
      ['llm:extract', lf?.countryOfOrigin],
    ]), null)
  const msrpAtLaunchUsd = resolve<number | null>('msrpAtLaunchUsd', [
    { source: 'llm:extract', value: lf?.msrpAtLaunchUsd ?? null },
  ], null)
  const limitedEditionCount = resolve<number | null>('limitedEditionCount', [
    { source: 'watch_db', value: wd?.limitedEditionCount ?? null },
  ], null)

  // ─── Heat score ────────────────────────────────────────────────────
  // Sources contributing to *any* field in this record (used as the
  // corroboration signal).
  const sourceCount = new Set(Object.values(provenance)).size
  const heat = computeHeatScore({
    brand: seed.brand,
    model: seed.model,
    modelFamily,
    reference: seed.reference,
    communitySignal: seed.communitySignal || null,
    sourceCount,
    chrono24ListingCount: c24bigListings.length,
    luxury163kListingCount: lux163Listings.length,
  })

  return {
    id: seed.id,
    brand: seed.brand,
    model: seed.model,
    reference: seed.reference,
    sourceUrl: seed.sourceUrl || null,
    communitySignal: seed.communitySignal || null,

    caseSizeMm,
    caseMaterial,
    dialColor,
    movement,
    complications,
    estimatedValue: estimatedValue == null ? null : Math.round(estimatedValue),
    watchType,

    lugWidthMm,
    modelFamily,
    nickname,
    lugToLugMm,
    thicknessMm,
    caseFinish,
    bezelMaterial,
    bezelType,
    crystalMaterial,
    waterResistanceM,
    weightG,
    dialFinish,
    markerType,
    lumeColor,
    caliber,
    movementType,
    powerReserveHours,
    frequencyVph,
    jewelCount,
    braceletType,
    claspType,
    yearIntroduced,
    yearDiscontinued,
    productionStatus,
    limitedEditionCount,
    msrpAtLaunchUsd,
    countryOfOrigin,
    styleTags: [],
    genderTarget: null,

    estimatedValueLow: null,
    estimatedValueHigh: null,
    valueLayer: estimatedValue == null ? null : 'direct',
    valueConfidence: estimatedValue == null ? null : (() => {
      // Confidence based on which direct source contributed
      const src = provenance.estimatedValue
      if (src === 'chrono24:scrape') return 'high'
      if (src === 'kaggle:chrono24-big:median') {
        return c24bigListings.length >= 10 ? 'high' : c24bigListings.length >= 3 ? 'medium' : 'low'
      }
      if (src === 'kaggle:luxury163k') {
        return lux163Listings.length >= 5 ? 'medium' : 'low'
      }
      return 'medium'
    })(),

    heatScore: heat.heatScore,
    popularityRank: 0, // assigned after sort
    chrono24ListingCount: c24bigListings.length,
    luxury163kListingCount: lux163Listings.length,
    heatBreakdown: heat.breakdown,

    provenance,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Coverage report
// ─────────────────────────────────────────────────────────────────────────

const TRACKED_FIELDS: Array<keyof EnrichedRecord> = [
  'caseSizeMm',
  'caseMaterial',
  'dialColor',
  'movement',
  'complications',
  'estimatedValue',
  'watchType',
  'lugWidthMm',
  'lugToLugMm',
  'thicknessMm',
  'caseFinish',
  'bezelMaterial',
  'bezelType',
  'crystalMaterial',
  'waterResistanceM',
  'weightG',
  'caliber',
  'movementType',
  'powerReserveHours',
  'frequencyVph',
  'jewelCount',
  'braceletType',
  'claspType',
  'yearIntroduced',
  'yearDiscontinued',
  'productionStatus',
  'modelFamily',
  'msrpAtLaunchUsd',
  'countryOfOrigin',
  'limitedEditionCount',
]

type CoverageReport = {
  seedRows: number
  sources: Record<FieldSource, number>
  fieldFill: Record<string, { filled: number; pct: number }>
}

function isFilled(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

function buildCoverageReport(records: EnrichedRecord[]): CoverageReport {
  const sources = Object.fromEntries(DEFAULT_PRIORITY.map(s => [s, 0])) as Record<
    FieldSource,
    number
  >
  for (const r of records) {
    const sourcesUsed = new Set(Object.values(r.provenance))
    for (const s of sourcesUsed) {
      if (s) sources[s] = (sources[s] ?? 0) + 1
    }
  }

  const fieldFill: CoverageReport['fieldFill'] = {}
  for (const field of TRACKED_FIELDS) {
    const filled = records.filter(r => isFilled(r[field as keyof EnrichedRecord])).length
    fieldFill[field as string] = {
      filled,
      pct: records.length === 0 ? 0 : Math.round((filled / records.length) * 100),
    }
  }

  return { seedRows: records.length, sources, fieldFill }
}

function formatReport(report: CoverageReport): string {
  const lines: string[] = []
  lines.push(`Seed rows: ${report.seedRows}`)
  lines.push('Source usage (rows where the source contributed at least one field):')
  for (const [source, count] of Object.entries(report.sources)) {
    if (count > 0) lines.push(`  ${source.padEnd(28)} ${count}`)
  }
  lines.push('Field fill:')
  for (const [field, stat] of Object.entries(report.fieldFill)) {
    const bar = '#'.repeat(Math.round(stat.pct / 5)).padEnd(20, ' ')
    lines.push(`  ${field.padEnd(20)} ${bar} ${stat.filled}/${report.seedRows} (${stat.pct}%)`)
  }
  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  for (const dir of [
    externalDir,
    watchspecsCacheDir,
    thewatchapiCacheDir,
    watchbaseCacheDir,
    chrono24CacheDir,
    llmExtractDir,
  ]) {
    await fs.mkdir(dir, { recursive: true })
  }

  console.log(`[enrich] seed=${path.relative(repoRoot, seedPath)}`)
  console.log(`[enrich] out =${path.relative(repoRoot, outputPath)}`)
  console.log('[enrich] loading sources…')

  const t0 = Date.now()
  const idx: SourceIndex = {
    watchDb: loadWatchDb(),
    luxury163k: loadLuxury163k(),
    luxury508: loadLuxury508(),
    sami: loadSami(),
    chrono24Big: loadChrono24Big(),
    legacyKaggle: loadLegacyKaggle(),
  }
  console.log(`[enrich] sources loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  const seedRows = readSeed()
  const records = seedRows.map(seed => enrichRow(seed, idx))

  // ─── Layer 2: similar-family median imputation ───────────────────────
  // For any record with no direct-match price, fall back to the median
  // price of all records in the same (brand, modelFamily) group that
  // DO have a direct-match price. Confidence band reflects group size:
  //   N >= 8 → STRONG (medium confidence)
  //   N 2-7 → WEAK   (low confidence)
  //   N < 2 → skip
  const directPriced = records.filter(r => r.valueLayer === 'direct' && r.estimatedValue != null && r.modelFamily)
  const familyGroups = new Map<string, number[]>()
  for (const r of directPriced) {
    const key = `${normalizeBrand(r.brand)}::${normalizeKey(r.modelFamily!)}`
    const bucket = familyGroups.get(key) ?? []
    bucket.push(r.estimatedValue!)
    familyGroups.set(key, bucket)
  }
  let layer2Strong = 0
  let layer2Weak = 0
  for (const r of records) {
    if (r.estimatedValue != null || !r.modelFamily) continue
    const key = `${normalizeBrand(r.brand)}::${normalizeKey(r.modelFamily)}`
    const bucket = familyGroups.get(key)
    if (!bucket || bucket.length < 2) continue
    const sorted = [...bucket].sort((a, b) => a - b)
    const med = sorted[Math.floor(sorted.length / 2)]
    const q1 = sorted[Math.floor(sorted.length * 0.25)]
    const q3 = sorted[Math.floor(sorted.length * 0.75)]
    r.estimatedValue = Math.round(med)
    r.estimatedValueLow = Math.round(q1)
    r.estimatedValueHigh = Math.round(q3)
    r.valueLayer = 'family_median'
    if (bucket.length >= 8) {
      r.valueConfidence = 'medium'
      r.provenance.estimatedValue = 'family_median:strong'
      layer2Strong += 1
    } else {
      r.valueConfidence = 'low'
      r.provenance.estimatedValue = 'family_median:weak'
      layer2Weak += 1
    }
  }
  console.log(`[enrich] Layer 2 (family median): +${layer2Strong} strong, +${layer2Weak} weak`)

  // ─── Layer 3: CatBoost predictions ───────────────────────────────────
  // Optional — only applies if scripts/predict-prices.py has been run and
  // dropped data/external/predicted-prices.json. Each id gets a predicted
  // price + low/high band from the model's quantile predictions.
  const predictionsPath = path.join(externalDir, 'predicted-prices.json')
  let layer3 = 0
  if (fsSync.existsSync(predictionsPath)) {
    try {
      const predData = JSON.parse(fsSync.readFileSync(predictionsPath, 'utf8'))
      const predMap = new Map<string, { price_usd: number; price_low_usd?: number; price_high_usd?: number }>(
        Object.entries(predData.predictions ?? {}),
      )
      for (const r of records) {
        if (r.estimatedValue != null) continue
        const p = predMap.get(r.id)
        if (!p || !p.price_usd) continue
        r.estimatedValue = Math.round(p.price_usd)
        r.estimatedValueLow = p.price_low_usd ? Math.round(p.price_low_usd) : null
        r.estimatedValueHigh = p.price_high_usd ? Math.round(p.price_high_usd) : null
        r.valueLayer = 'catboost'
        r.valueConfidence = 'low'
        r.provenance.estimatedValue = 'catboost:predict'
        layer3 += 1
      }
      console.log(`[enrich] Layer 3 (CatBoost): +${layer3} predictions ingested from ${path.relative(repoRoot, predictionsPath)}`)
    } catch (err) {
      console.warn(`[enrich] failed to read predicted-prices.json: ${(err as Error).message}`)
    }
  } else {
    console.log(`[enrich] Layer 3 (CatBoost): no predictions found (run \`npm run prices:predict\` to generate)`)
  }

  // Assign popularityRank strictly (1, 2, 3, ...). Sort by heat desc,
  // then by chrono24 listing count desc, then by luxury163k listing count,
  // then by alphabetical id for full determinism. This gives every watch
  // a unique ordinal that's stable across runs.
  const sortedByHeat = [...records].sort((a, b) => {
    if (b.heatScore !== a.heatScore) return b.heatScore - a.heatScore
    if (b.chrono24ListingCount !== a.chrono24ListingCount)
      return b.chrono24ListingCount - a.chrono24ListingCount
    if (b.luxury163kListingCount !== a.luxury163kListingCount)
      return b.luxury163kListingCount - a.luxury163kListingCount
    return a.id.localeCompare(b.id)
  })
  for (let i = 0; i < sortedByHeat.length; i += 1) {
    sortedByHeat[i].popularityRank = i + 1
  }

  const report = buildCoverageReport(records)

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: {
      seed: path.relative(repoRoot, seedPath),
      watchDb: fsSync.existsSync(watchDbCsvPath) ? path.relative(repoRoot, watchDbCsvPath) : null,
      luxury163k: fsSync.existsSync(luxury163kCsvPath)
        ? path.relative(repoRoot, luxury163kCsvPath)
        : null,
      luxury508: fsSync.existsSync(luxury508CsvPath)
        ? path.relative(repoRoot, luxury508CsvPath)
        : null,
      sami: fsSync.existsSync(samiCsvPath) ? path.relative(repoRoot, samiCsvPath) : null,
      chrono24Big: fsSync.existsSync(chrono24BigCsvPath)
        ? path.relative(repoRoot, chrono24BigCsvPath)
        : null,
      legacyKaggle: fsSync.existsSync(kaggleLegacyPath)
        ? path.relative(repoRoot, kaggleLegacyPath)
        : null,
      thewatchapiCacheDir: path.relative(repoRoot, thewatchapiCacheDir),
      watchbaseCacheDir: path.relative(repoRoot, watchbaseCacheDir),
      chrono24CacheDir: path.relative(repoRoot, chrono24CacheDir),
      watchspecsCacheDir: path.relative(repoRoot, watchspecsCacheDir),
      llmExtractDir: path.relative(repoRoot, llmExtractDir),
    },
    coverage: report,
    records,
  }

  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  console.log(`[enrich] wrote ${path.relative(repoRoot, outputPath)}`)
  console.log()
  console.log(formatReport(report))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
