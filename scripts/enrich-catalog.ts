/**
 * Catalog enrichment pipeline (Option 3: Kaggle Chrono24 + WatchSpecs gap-fill).
 *
 * Inputs:
 *   data/catalog-seed-200.csv
 *     id, brand, model, reference, dialColor, watchType, sourceUrl, ...
 *   data/external/chrono24-listings.csv         (optional, free Kaggle download)
 *     Flexible column names — see KAGGLE_COL_ALIASES below.
 *   data/external/watchspecs-cache/<id>.html    (optional, manually downloaded pages)
 *     Used to fill lugWidthMm / caseSizeMm gaps that Kaggle data misses.
 *
 * Output:
 *   data/catalog-enriched.json
 *     One enriched record per seed row, each with a per-field `provenance` map
 *     so reviewers can see whether a value came from the seed, Kaggle, or
 *     WatchSpecs before promoting it into lib/watches.ts.
 *
 * The script is offline-safe: when no external files exist it still emits a
 * JSON artifact containing the seed identity + an empty provenance map, plus a
 * coverage report telling you how to drop the Kaggle CSV and re-run.
 *
 * Usage:
 *   npm run catalog:enrich
 *   KAGGLE_LISTINGS_CSV=path/to/listings.csv npm run catalog:enrich
 *
 * Network access is never used. To pull WatchSpecs pages, save them by hand
 * into data/external/watchspecs-cache/<seed-id>.html.
 */

import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { parseCsv, repoRoot } from './watch-image-pipeline'

const seedPath = path.join(repoRoot, 'data', 'catalog-seed-200.csv')
const externalDir = path.join(repoRoot, 'data', 'external')
const kaggleCsvPath =
  process.env.KAGGLE_LISTINGS_CSV ?? path.join(externalDir, 'chrono24-listings.csv')
const watchspecsCacheDir =
  process.env.WATCHSPECS_CACHE_DIR ?? path.join(externalDir, 'watchspecs-cache')
const outputPath = path.join(repoRoot, 'data', 'catalog-enriched.json')

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
  | 'kaggle'
  | 'kaggle:median'
  | 'kaggle:mode'
  | 'watchspecs:cache'

type EnrichedRecord = {
  id: string
  brand: string
  model: string
  reference: string
  caseSizeMm: number | null
  lugWidthMm: number | null
  caseMaterial: string | null
  dialColor: string | null
  movement: string | null
  complications: string[]
  estimatedValue: number | null
  watchType: string | null
  sourceUrl: string | null
  provenance: Partial<Record<keyof Omit<EnrichedRecord, 'id' | 'provenance'>, FieldSource>>
}

const KAGGLE_COL_ALIASES = {
  brand: ['brand', 'manufacturer', 'maker'],
  model: ['model', 'modelname', 'model_name', 'product_name', 'family'],
  reference: ['reference', 'reference_number', 'ref', 'refnumber', 'reference_no'],
  price: ['price', 'price_usd', 'avg_price', 'value', 'list_price', 'asking_price'],
  caseDiameter: [
    'case_diameter',
    'diameter',
    'case_size',
    'case_size_mm',
    'casesize',
    'size',
    'case_diameter_mm',
  ],
  caseMaterial: ['case_material', 'material', 'case', 'casematerial'],
  dial: ['dial', 'dial_color', 'dialcolor', 'color', 'dial_colour'],
  movement: ['movement', 'caliber', 'movement_type', 'movementtype'],
  complications: ['complications', 'features', 'functions'],
} as const

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

function parsePrice(raw: string): number | null {
  if (!raw) return null
  // Strip currency symbols, thousands separators, "USD", etc.
  const cleaned = raw.replace(/[^0-9.,-]/g, '').replace(/,/g, '')
  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function parseDiameter(raw: string): number | null {
  if (!raw) return null
  // Accept "41 mm", "41mm", "41.0", "41,0".
  const match = raw.replace(',', '.').match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const parsed = Number(match[1])
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 80) return null
  return parsed
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

function readSeed(): SeedRow[] {
  const content = fsSync.readFileSync(seedPath, 'utf8')
  return parseCsv(content) as unknown as SeedRow[]
}

type KaggleListing = {
  brandKey: string
  refKey: string
  rawBrand: string
  rawModel: string
  price: number | null
  caseSizeMm: number | null
  caseMaterial: string | null
  dialColor: string | null
  movement: string | null
}

function readKaggle(): KaggleListing[] {
  if (!fsSync.existsSync(kaggleCsvPath)) return []
  const content = fsSync.readFileSync(kaggleCsvPath, 'utf8')
  const rows = parseCsv(content) as unknown as Array<Record<string, string>>
  return rows
    .map(row => {
      const rawBrand = pickCol(row, KAGGLE_COL_ALIASES.brand)
      const rawRef = pickCol(row, KAGGLE_COL_ALIASES.reference)
      if (!rawBrand || !rawRef) return null
      return {
        brandKey: normalizeBrand(rawBrand),
        refKey: normalizeReference(rawRef),
        rawBrand,
        rawModel: pickCol(row, KAGGLE_COL_ALIASES.model),
        price: parsePrice(pickCol(row, KAGGLE_COL_ALIASES.price)),
        caseSizeMm: parseDiameter(pickCol(row, KAGGLE_COL_ALIASES.caseDiameter)),
        caseMaterial: pickCol(row, KAGGLE_COL_ALIASES.caseMaterial) || null,
        dialColor: pickCol(row, KAGGLE_COL_ALIASES.dial) || null,
        movement: pickCol(row, KAGGLE_COL_ALIASES.movement) || null,
      }
    })
    .filter((row): row is KaggleListing => row !== null)
}

type KaggleAggregate = {
  caseSizeMm: number | null
  caseMaterial: string | null
  dialColor: string | null
  movement: string | null
  estimatedValue: number | null
  listingCount: number
}

function buildKaggleIndex(listings: KaggleListing[]) {
  const byKey = new Map<string, KaggleListing[]>()
  for (const listing of listings) {
    const key = `${listing.brandKey}::${listing.refKey}`
    const bucket = byKey.get(key)
    if (bucket) bucket.push(listing)
    else byKey.set(key, [listing])
  }
  return byKey
}

function aggregateMatches(matches: KaggleListing[]): KaggleAggregate {
  return {
    caseSizeMm: median(matches.map(m => m.caseSizeMm).filter((v): v is number => v != null)),
    caseMaterial: mode(matches.map(m => m.caseMaterial).filter((v): v is string => Boolean(v))),
    dialColor: mode(matches.map(m => m.dialColor).filter((v): v is string => Boolean(v))),
    movement: mode(matches.map(m => m.movement).filter((v): v is string => Boolean(v))),
    estimatedValue: median(matches.map(m => m.price).filter((v): v is number => v != null)),
    listingCount: matches.length,
  }
}

type WatchspecsExtract = {
  caseSizeMm: number | null
  lugWidthMm: number | null
}

const SPEC_LABELS = {
  caseSize: ['case diameter', 'case size', 'diameter'],
  lugWidth: ['lug width', 'strap width', 'band width'],
}

function extractSpec(html: string, labels: string[]): number | null {
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

function readWatchspecsCache(seedId: string): WatchspecsExtract | null {
  const filePath = path.join(watchspecsCacheDir, `${seedId}.html`)
  if (!fsSync.existsSync(filePath)) return null
  const html = fsSync.readFileSync(filePath, 'utf8')
  return {
    caseSizeMm: extractSpec(html, SPEC_LABELS.caseSize),
    lugWidthMm: extractSpec(html, SPEC_LABELS.lugWidth),
  }
}

function enrichRow(
  seed: SeedRow,
  kaggleIndex: Map<string, KaggleListing[]>,
): EnrichedRecord {
  const provenance: EnrichedRecord['provenance'] = {}
  const record: EnrichedRecord = {
    id: seed.id,
    brand: seed.brand,
    model: seed.model,
    reference: seed.reference,
    caseSizeMm: null,
    lugWidthMm: null,
    caseMaterial: null,
    dialColor: seed.dialColor || null,
    movement: null,
    complications: [],
    estimatedValue: null,
    watchType: seed.watchType || null,
    sourceUrl: seed.sourceUrl || null,
    provenance,
  }

  if (seed.dialColor) provenance.dialColor = 'seed'
  if (seed.watchType) provenance.watchType = 'seed'

  const key = `${normalizeBrand(seed.brand)}::${normalizeReference(seed.reference)}`
  const matches = kaggleIndex.get(key) ?? []
  if (matches.length > 0) {
    const agg = aggregateMatches(matches)
    if (agg.caseSizeMm != null) {
      record.caseSizeMm = agg.caseSizeMm
      provenance.caseSizeMm = 'kaggle:median'
    }
    if (agg.caseMaterial) {
      record.caseMaterial = agg.caseMaterial
      provenance.caseMaterial = 'kaggle:mode'
    }
    if (agg.dialColor && !record.dialColor) {
      record.dialColor = agg.dialColor
      provenance.dialColor = 'kaggle:mode'
    }
    if (agg.movement) {
      record.movement = agg.movement
      provenance.movement = 'kaggle:mode'
    }
    if (agg.estimatedValue != null) {
      record.estimatedValue = Math.round(agg.estimatedValue)
      provenance.estimatedValue = 'kaggle:median'
    }
  }

  const watchspecs = readWatchspecsCache(seed.id)
  if (watchspecs) {
    if (record.caseSizeMm == null && watchspecs.caseSizeMm != null) {
      record.caseSizeMm = watchspecs.caseSizeMm
      provenance.caseSizeMm = 'watchspecs:cache'
    }
    if (watchspecs.lugWidthMm != null) {
      record.lugWidthMm = watchspecs.lugWidthMm
      provenance.lugWidthMm = 'watchspecs:cache'
    }
  }

  return record
}

type CoverageReport = {
  seedRows: number
  kaggleListings: number
  kaggleMatched: number
  watchspecsCacheHits: number
  fieldFill: Record<string, { filled: number; pct: number }>
}

function buildCoverageReport(records: EnrichedRecord[], kaggleListings: number): CoverageReport {
  const kaggleMatched = records.filter(r =>
    Object.values(r.provenance).some(s => s?.startsWith('kaggle')),
  ).length
  const watchspecsCacheHits = records.filter(r =>
    Object.values(r.provenance).some(s => s === 'watchspecs:cache'),
  ).length

  const trackedFields: Array<keyof EnrichedRecord> = [
    'caseSizeMm',
    'lugWidthMm',
    'caseMaterial',
    'dialColor',
    'movement',
    'estimatedValue',
    'watchType',
  ]
  const fieldFill: CoverageReport['fieldFill'] = {}
  for (const field of trackedFields) {
    const filled = records.filter(r => {
      const value = r[field]
      return value != null && value !== ''
    }).length
    fieldFill[field] = {
      filled,
      pct: records.length === 0 ? 0 : Math.round((filled / records.length) * 100),
    }
  }

  return {
    seedRows: records.length,
    kaggleListings,
    kaggleMatched,
    watchspecsCacheHits,
    fieldFill,
  }
}

function formatReport(report: CoverageReport): string {
  const lines: string[] = []
  lines.push(`Seed rows:            ${report.seedRows}`)
  lines.push(`Kaggle listings read: ${report.kaggleListings}`)
  lines.push(`Kaggle matched rows:  ${report.kaggleMatched}`)
  lines.push(`WatchSpecs cache hits:${report.watchspecsCacheHits}`)
  lines.push('Field fill:')
  for (const [field, stat] of Object.entries(report.fieldFill)) {
    const bar = '#'.repeat(Math.round(stat.pct / 5)).padEnd(20, ' ')
    lines.push(`  ${field.padEnd(15)} ${bar} ${stat.filled}/${report.seedRows} (${stat.pct}%)`)
  }
  return lines.join('\n')
}

async function main() {
  await fs.mkdir(externalDir, { recursive: true })
  await fs.mkdir(watchspecsCacheDir, { recursive: true })

  const seedRows = readSeed()
  const kaggleListings = readKaggle()
  const kaggleIndex = buildKaggleIndex(kaggleListings)

  if (kaggleListings.length === 0) {
    console.log(`No Kaggle CSV at ${path.relative(repoRoot, kaggleCsvPath)}.`)
    console.log(
      'Drop a Chrono24-scraped listings CSV there (e.g. from kaggle.com search ' +
        '"luxury watch listings") and re-run to enrich price/specs.',
    )
  }

  const records = seedRows.map(seed => enrichRow(seed, kaggleIndex))
  const report = buildCoverageReport(records, kaggleListings.length)

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: {
      seed: path.relative(repoRoot, seedPath),
      kaggle: kaggleListings.length > 0 ? path.relative(repoRoot, kaggleCsvPath) : null,
      watchspecsCacheDir: path.relative(repoRoot, watchspecsCacheDir),
    },
    coverage: report,
    records,
  }

  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  console.log(`Wrote ${path.relative(repoRoot, outputPath)}`)
  console.log()
  console.log(formatReport(report))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
