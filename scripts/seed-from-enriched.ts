/**
 * Ship the enriched catalog to Supabase.
 *
 * Reads:
 *   data/catalog-enriched-full.json
 *   public/watch-assets/processed/manifest.json
 *
 * Writes (idempotent upserts, chunked):
 *   public.catalog_watches            (one row per watch, source='ingestion')
 *   public.catalog_watch_market        (one row per watch, heat + price + confidence)
 *   public.watch_images                (primary variant per imaged watch)
 *
 * Required env:
 *   SUPABASE_URL  / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   DRY_RUN=1 npm run catalog:seed-full      # preview, no writes
 *   npm run catalog:seed-full                 # real upsert
 *   CHUNK=200 npm run catalog:seed-full       # tune batch size (default 100)
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'
import { isValidCatalogId, mintCatalogId } from '../lib/catalogId'

loadLocalEnv()

const enrichedPath = path.join(repoRoot, 'data', 'catalog-enriched-full.json')
const manifestPath = path.join(repoRoot, 'public', 'watch-assets', 'processed', 'manifest.json')
const llmExtractDir = path.join(repoRoot, 'data', 'external', 'llm-extracts')
const excludedImagesPath = path.join(repoRoot, 'data', 'excluded-image-ids.json')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const CHUNK = Number(process.env.CHUNK ?? 100)

function fail(msg: string): never {
  console.error(`[seed-from-enriched] ${msg}`)
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────
// Dial color → hex sensible-default map.
// We don't have hand-tuned hex values for 35K watches. This gets us 80% of
// the way there for the SVG dial fallback (which only shows when no image
// is available). Anything not in the map falls back to the table default
// '#1A1410' for dial_color_hex.
// ─────────────────────────────────────────────────────────────────────────
const DIAL_HEX_MAP: Record<string, { dial: string; marker: string; hand: string }> = {
  black:         { dial: '#1A1410', marker: '#C8BCAF', hand: '#FFFFFF' },
  white:         { dial: '#F5F2EC', marker: '#1F1A14', hand: '#1F1A14' },
  'off white':   { dial: '#EFE9DD', marker: '#1F1A14', hand: '#1F1A14' },
  cream:         { dial: '#EFE3CB', marker: '#1F1A14', hand: '#1F1A14' },
  ivory:         { dial: '#F1E8D2', marker: '#1F1A14', hand: '#1F1A14' },
  silver:        { dial: '#D4D2CB', marker: '#1F1A14', hand: '#1F1A14' },
  gray:          { dial: '#6B6F76', marker: '#EBE6DC', hand: '#FFFFFF' },
  grey:          { dial: '#6B6F76', marker: '#EBE6DC', hand: '#FFFFFF' },
  slate:         { dial: '#4F5760', marker: '#E5E0D7', hand: '#FFFFFF' },
  anthracite:    { dial: '#2F3338', marker: '#E5E0D7', hand: '#FFFFFF' },
  blue:          { dial: '#1F3A5F', marker: '#E5E0D7', hand: '#FFFFFF' },
  'dark blue':   { dial: '#142A48', marker: '#E5E0D7', hand: '#FFFFFF' },
  'light blue':  { dial: '#3D6EA8', marker: '#FFFFFF', hand: '#FFFFFF' },
  'navy':        { dial: '#172541', marker: '#E5E0D7', hand: '#FFFFFF' },
  green:         { dial: '#1F3A2A', marker: '#E5E0D7', hand: '#FFFFFF' },
  'dark green':  { dial: '#12241B', marker: '#E5E0D7', hand: '#FFFFFF' },
  'olive':       { dial: '#4A4A2C', marker: '#E5E0D7', hand: '#FFFFFF' },
  red:           { dial: '#7A1C1C', marker: '#F5E9C8', hand: '#FFFFFF' },
  burgundy:      { dial: '#5C1722', marker: '#F5E9C8', hand: '#FFFFFF' },
  orange:        { dial: '#C25A1F', marker: '#FFFFFF', hand: '#1F1A14' },
  yellow:        { dial: '#E5C04C', marker: '#1F1A14', hand: '#1F1A14' },
  brown:         { dial: '#4B2E1F', marker: '#E5C58A', hand: '#FFFFFF' },
  chocolate:     { dial: '#3A2114', marker: '#E5C58A', hand: '#FFFFFF' },
  bronze:        { dial: '#6B4523', marker: '#E5C58A', hand: '#FFFFFF' },
  champagne:     { dial: '#D9C18B', marker: '#1F1A14', hand: '#1F1A14' },
  gold:          { dial: '#C5A55F', marker: '#1F1A14', hand: '#1F1A14' },
  rose:          { dial: '#D9A98C', marker: '#1F1A14', hand: '#1F1A14' },
  'rose gold':   { dial: '#C58B73', marker: '#1F1A14', hand: '#1F1A14' },
  pink:          { dial: '#E2B5BC', marker: '#1F1A14', hand: '#1F1A14' },
  salmon:        { dial: '#E29479', marker: '#1F1A14', hand: '#1F1A14' },
  purple:        { dial: '#3F234E', marker: '#E5E0D7', hand: '#FFFFFF' },
  meteorite:     { dial: '#3A3A38', marker: '#D0CCC4', hand: '#FFFFFF' },
  'mother of pearl': { dial: '#F2EAE2', marker: '#3D6EA8', hand: '#3D6EA8' },
  diamonds:      { dial: '#EFEAE1', marker: '#1F1A14', hand: '#1F1A14' },
  skeleton:      { dial: '#9E928A', marker: '#1F1A14', hand: '#1F1A14' },
  transparent:   { dial: '#A6A29A', marker: '#1F1A14', hand: '#1F1A14' },
}

function dialHex(rawColor: string | null | undefined): { dial: string; marker: string; hand: string } {
  if (!rawColor) return { dial: '#1A1410', marker: '#C8BCAF', hand: '#FFFFFF' }
  const key = rawColor.toLowerCase().trim()
  if (DIAL_HEX_MAP[key]) return DIAL_HEX_MAP[key]
  // Try keyword match (e.g., "Blue with white markers" → blue)
  for (const k of Object.keys(DIAL_HEX_MAP)) {
    if (key.includes(k)) return DIAL_HEX_MAP[k]
  }
  return { dial: '#1A1410', marker: '#C8BCAF', hand: '#FFFFFF' }
}

// ─────────────────────────────────────────────────────────────────────────
// Enum normalization. Schema check-constraints will reject out-of-set
// values; we coerce to the closest valid bucket or null.
// ─────────────────────────────────────────────────────────────────────────
const PRODUCTION_STATUSES = new Set(['current', 'discontinued', 'limited', 'one-off', 'prototype'])
const MOVEMENT_TYPES = new Set(['automatic', 'manual', 'quartz', 'mecaquartz', 'solar', 'spring-drive'])
const BRACELET_TYPES = new Set(['bracelet', 'strap', 'integrated'])
const GENDER_TARGETS = new Set(['unisex', 'mens', 'womens'])
const VALUE_CONFIDENCES = new Set(['low', 'medium', 'high'])

function normProductionStatus(v: string | null): string {
  if (!v) return 'current'
  const lc = v.toLowerCase().trim()
  if (PRODUCTION_STATUSES.has(lc)) return lc
  return 'current'
}

function normMovementType(v: string | null): string | null {
  if (!v) return null
  const lc = v.toLowerCase().trim()
  return MOVEMENT_TYPES.has(lc) ? lc : null
}

function normBraceletType(v: string | null): string | null {
  if (!v) return null
  const lc = v.toLowerCase().trim()
  return BRACELET_TYPES.has(lc) ? lc : null
}

function normGender(v: string | null): string {
  if (!v) return 'unisex'
  const lc = v.toLowerCase().trim()
  return GENDER_TARGETS.has(lc) ? lc : 'unisex'
}

function normYear(v: number | null | undefined): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  return v >= 1850 && v <= 2100 ? Math.floor(v) : null
}

function normWatchType(v: string | null): string {
  if (!v || !v.trim()) return 'Sport' // schema default; UI handles it
  return v.trim()
}

function normValueConfidence(v: string | null): string | null {
  if (!v) return null
  const lc = v.toLowerCase().trim()
  return VALUE_CONFIDENCES.has(lc) ? lc : null
}

// Coerce to int for columns typed `integer` in PG. Returns null for
// non-finite / sub-1 values that are almost certainly garbage data.
function toInt(v: number | null | undefined, options: { min?: number; max?: number } = {}): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  const rounded = Math.round(v)
  const min = options.min ?? Number.NEGATIVE_INFINITY
  const max = options.max ?? Number.POSITIVE_INFINITY
  if (rounded < min || rounded > max) return null
  return rounded
}

// Batch upsert requires a consistent column set across all rows. Stripping
// a column from SOME rows but not others makes Supabase send `null` for
// missing columns on the conflict-update path — which violates NOT NULL.
// Instead, keep ALL columns in every row; null is fine for nullable cols,
// and our normalizer functions guarantee non-null defaults for NOT NULL cols.
// This pass-through helper is kept for clarity (and to drop `undefined`).
function passThroughRow<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    out[k] = v
  }
  return out as T
}

// ─────────────────────────────────────────────────────────────────────────
// LLM extract overlay — pulls any per-id llm:extract sidecar and merges
// into the row before upsert. The enrich pipeline already does this, but
// if the user ran llm-extract AFTER the last enrich we still pick it up.
// ─────────────────────────────────────────────────────────────────────────
type LlmFields = Partial<{
  watchType: string
  nickname: string
  msrpAtLaunchUsd: number
  countryOfOrigin: string
  bezelType: string
  caseFinish: string
  lumeColor: string
  claspType: string
  markerType: string
  dialFinish: string
  productionStatus: string
}>

function readLlmOverlay(watchId: string): LlmFields {
  const p = path.join(llmExtractDir, `${watchId}.json`)
  if (!fs.existsSync(p)) return {}
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'))
    return (j?.fields ?? {}) as LlmFields
  } catch {
    return {}
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Build row payloads
// ─────────────────────────────────────────────────────────────────────────

type EnrichedRecord = {
  id: string
  brand: string
  model: string
  reference: string
  caseSizeMm: number | null
  caseMaterial: string | null
  dialColor: string | null
  movement: string | null
  complications: string[]
  estimatedValue: number | null
  estimatedValueLow: number | null
  estimatedValueHigh: number | null
  valueLayer: string | null
  valueConfidence: string | null
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
  heatScore: number
  popularityRank: number
}

function buildCatalogRow(r: EnrichedRecord, llm: LlmFields, now: string): Record<string, unknown> {
  const hex = dialHex(r.dialColor)
  // Merge: enriched fields win over LLM unless enriched is null
  const watchType = r.watchType || llm.watchType || ''
  const nickname = r.nickname || llm.nickname || null
  const country = r.countryOfOrigin || llm.countryOfOrigin || null
  const caseFinish = r.caseFinish || llm.caseFinish || null
  const bezelType = r.bezelType || llm.bezelType || null
  const lumeColor = r.lumeColor || llm.lumeColor || null
  const claspType = r.claspType || llm.claspType || null
  const markerType = r.markerType || llm.markerType || null
  const dialFinish = r.dialFinish || llm.dialFinish || null
  const productionStatus = r.productionStatus || llm.productionStatus || null
  const msrp = (typeof r.msrpAtLaunchUsd === 'number' ? r.msrpAtLaunchUsd : llm.msrpAtLaunchUsd) ?? null

  // Tier 1 = curated/seed; Tier 2 = community for everything else
  const isHero = r.heatScore >= 800
  const verificationStatus = isHero ? 'community' : 'community' // all ingestion = community

  const row: Record<string, unknown> = {
    id: r.id,
    brand: r.brand.trim(),
    model: r.model?.trim() || r.brand.trim(),
    reference: r.reference.trim(),
    case_size_mm: r.caseSizeMm ?? 40, // required NOT NULL — fallback for ~138 watches
    lug_width_mm: r.lugWidthMm, // numeric — float ok
    case_material: r.caseMaterial ?? '',
    dial_color: r.dialColor ?? '',
    movement: r.movement ?? '',
    complications: r.complications ?? [],
    estimated_value: toInt(r.estimatedValue, { min: 0 }) ?? 0,
    watch_type: normWatchType(watchType),
    dial_color_hex: hex.dial,
    marker_color_hex: hex.marker,
    hand_color_hex: hex.hand,
    source: 'ingestion',
    verification_status: verificationStatus,
    approved_at: now,

    // Expanded fields
    model_family: r.modelFamily,
    nickname,
    lug_to_lug_mm: r.lugToLugMm, // numeric — float ok
    thickness_mm: r.thicknessMm, // numeric — float ok
    case_finish: caseFinish,
    bezel_material: r.bezelMaterial,
    bezel_type: bezelType,
    crystal_material: r.crystalMaterial,
    // All these are PG integer columns — coerce + range-clamp to drop garbage.
    water_resistance_m: toInt(r.waterResistanceM, { min: 1, max: 50000 }),
    weight_g: toInt(r.weightG, { min: 1, max: 10000 }),
    dial_finish: dialFinish,
    marker_type: markerType,
    lume_color: lumeColor,
    caliber: r.caliber,
    movement_type: normMovementType(r.movementType),
    power_reserve_hours: toInt(r.powerReserveHours, { min: 1, max: 2000 }),
    frequency_vph: toInt(r.frequencyVph, { min: 1, max: 100000 }),
    jewel_count: toInt(r.jewelCount, { min: 1, max: 1000 }),
    bracelet_type: normBraceletType(r.braceletType),
    clasp_type: claspType,
    year_introduced: normYear(r.yearIntroduced),
    year_discontinued: normYear(r.yearDiscontinued),
    production_status: normProductionStatus(productionStatus),
    limited_edition_count: toInt(r.limitedEditionCount, { min: 1, max: 1000000 }),
    msrp_at_launch_usd: toInt(typeof msrp === 'number' ? msrp : null, { min: 1, max: 50000000 }),
    country_of_origin: country,
    style_tags: r.styleTags ?? [],
    gender_target: normGender(r.genderTarget),
  }
  return passThroughRow(row)
}

function buildMarketRow(r: EnrichedRecord, now: string): Record<string, unknown> {
  return {
    catalog_watch_id: r.id,
    market_value_usd: toInt(r.estimatedValue, { min: 0 }),
    market_value_low_usd: toInt(r.estimatedValueLow, { min: 0 }),
    market_value_high_usd: toInt(r.estimatedValueHigh, { min: 0 }),
    currency: 'USD',
    value_source: r.valueLayer ?? null,
    value_confidence: normValueConfidence(r.valueConfidence),
    heat_score: r.heatScore, // numeric — float ok
    popularity_rank: toInt(r.popularityRank, { min: 1 }),
    last_priced_at: now,
  }
}

type ManifestEntry = {
  watchId: string
  pngPath: string
  webpPath: string
  sourceWidth?: number
  sourceHeight?: number
  processedWidth?: number
  processedHeight?: number
  backgroundRemovalApplied?: boolean
}

// Storage URL base — written into watch_images.png_url / webp_url so the app
// reads from Supabase Storage in production. Falls back to the local manifest
// path only when SUPABASE_URL is unset (offline / CI mode).
const STORAGE_BASE = SUPABASE_URL
  ? `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/watch-images`
  : null

function storageUrlFor(watchId: string, ext: 'png' | 'webp'): string | null {
  if (!STORAGE_BASE) return null
  return `${STORAGE_BASE}/${watchId}/primary.${ext}`
}

function buildImageRow(m: ManifestEntry): Record<string, unknown> {
  return {
    catalog_watch_id: m.watchId,
    png_url: storageUrlFor(m.watchId, 'png') ?? m.pngPath,
    webp_url: storageUrlFor(m.watchId, 'webp') ?? m.webpPath,
    source_width: m.sourceWidth ?? null,
    source_height: m.sourceHeight ?? null,
    processed_width: m.processedWidth ?? null,
    processed_height: m.processedHeight ?? null,
    background_removal_applied: !!m.backgroundRemovalApplied,
    variant: 'primary',
    sort_order: 0,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL) fail('Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL.')
  if (!SUPABASE_KEY && !DRY_RUN) {
    fail('Missing SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY (required unless DRY_RUN=1).')
  }
  if (!fs.existsSync(enrichedPath)) fail(`Missing ${enrichedPath}. Run \`npm run catalog:enrich\` first.`)

  const supabase: SupabaseClient | null = DRY_RUN
    ? null
    : createClient(SUPABASE_URL!, SUPABASE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

  const now = new Date().toISOString()

  // Load enriched catalog
  console.log('[seed-from-enriched] loading enriched JSON…')
  const enriched = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'))
  const records = enriched.records as EnrichedRecord[]
  console.log(`[seed-from-enriched] ${records.length.toLocaleString()} records`)

  // Validate IDs are canonical
  const idMismatches: string[] = []
  for (const r of records) {
    if (!isValidCatalogId(r.id)) {
      idMismatches.push(r.id)
      continue
    }
    try {
      const expected = mintCatalogId({ brand: r.brand, reference: r.reference })
      if (expected !== r.id) idMismatches.push(`${r.id} ≠ ${expected}`)
    } catch {
      idMismatches.push(`${r.id} (mint failed)`)
    }
  }
  if (idMismatches.length > 0) {
    console.error(`[seed-from-enriched] ${idMismatches.length} non-canonical IDs found. Examples:`)
    for (const m of idMismatches.slice(0, 5)) console.error(`  ${m}`)
    fail('Resolve before seeding (re-run expand-from-watchdb to recanonicalize).')
  }

  // Dedup safety: catalog has a unique index on (brand, reference, dial_color).
  // Our enriched JSON has unique IDs but two records could theoretically share
  // (brand, reference, dial_color) if dialColor differs only by case/whitespace.
  const dupCheck = new Map<string, string>()
  const duplicates: string[] = []
  for (const r of records) {
    const k = `${r.brand.trim().toLowerCase()}::${r.reference.trim().toLowerCase()}::${(r.dialColor ?? '').trim().toLowerCase()}`
    if (dupCheck.has(k)) duplicates.push(`${r.id} ↔ ${dupCheck.get(k)} share (${k})`)
    else dupCheck.set(k, r.id)
  }
  if (duplicates.length > 0) {
    console.warn(`[seed-from-enriched] ${duplicates.length} (brand,ref,dialColor) duplicates — only first kept per unique index.`)
    if (duplicates.length <= 5) for (const d of duplicates) console.warn(`  ${d}`)
  }

  // Build row payloads
  console.log('[seed-from-enriched] building row payloads (incl. llm overlay)…')
  const catalogRows: Array<Record<string, unknown>> = []
  const marketRows: Array<Record<string, unknown>> = []
  for (const r of records) {
    const llm = readLlmOverlay(r.id)
    catalogRows.push(buildCatalogRow(r, llm, now))
    marketRows.push(buildMarketRow(r, now))
  }

  // Load excluded-image ids (watches whose processed image must NOT seed)
  let excludedImageIds = new Set<string>()
  if (fs.existsSync(excludedImagesPath)) {
    const raw = JSON.parse(fs.readFileSync(excludedImagesPath, 'utf8')) as {
      ids: Array<{ id: string }>
    }
    excludedImageIds = new Set(raw.ids.map(e => e.id))
    console.log(`[seed-from-enriched] excluding ${excludedImageIds.size} ids from watch_images`)
  }

  // Load image manifest
  console.log('[seed-from-enriched] loading processed image manifest…')
  let imageRows: Array<Record<string, unknown>> = []
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ManifestEntry[]
    // Filter to entries that correspond to an actual catalog row (avoid FK violation)
    // AND aren't in the excluded-image list (admin-flagged "wrong watch" etc.).
    const idSet = new Set(records.map(r => r.id))
    imageRows = manifest
      .filter(m => idSet.has(m.watchId) && !excludedImageIds.has(m.watchId))
      .map(buildImageRow)
    const excludedCount = manifest.filter(m => excludedImageIds.has(m.watchId)).length
    console.log(
      `[seed-from-enriched] ${imageRows.length}/${manifest.length} manifest entries match a catalog row${excludedCount ? ` (${excludedCount} excluded)` : ''}`,
    )
  } else {
    console.log('[seed-from-enriched] no processed manifest — skipping watch_images')
  }

  // Summary
  console.log()
  console.log(`Plan to upsert:`)
  console.log(`  catalog_watches:       ${catalogRows.length.toLocaleString()}`)
  console.log(`  catalog_watch_market:  ${marketRows.length.toLocaleString()}`)
  console.log(`  watch_images (primary): ${imageRows.length.toLocaleString()}`)
  console.log(`  chunk size:            ${CHUNK}`)
  console.log()

  if (DRY_RUN || !supabase) {
    console.log('[seed-from-enriched] DRY_RUN — sample catalog row:')
    console.log(JSON.stringify(catalogRows[0], null, 2))
    console.log()
    console.log('[seed-from-enriched] DRY_RUN — sample market row:')
    console.log(JSON.stringify(marketRows[0], null, 2))
    if (imageRows.length > 0) {
      console.log()
      console.log('[seed-from-enriched] DRY_RUN — sample image row:')
      console.log(JSON.stringify(imageRows[0], null, 2))
    }
    console.log()
    console.log('[seed-from-enriched] DRY_RUN done. Re-run without DRY_RUN to upsert.')
    return
  }

  // ── Upsert catalog_watches ─────────────────────────────────────────────
  console.log('[seed-from-enriched] upserting catalog_watches…')
  for (let i = 0; i < catalogRows.length; i += CHUNK) {
    const slice = catalogRows.slice(i, i + CHUNK)
    const { error } = await supabase.from('catalog_watches').upsert(slice, { onConflict: 'id' })
    if (error) fail(`catalog_watches chunk ${i / CHUNK} failed: ${error.message}`)
    if ((i / CHUNK) % 10 === 0) {
      console.log(`  catalog_watches: ${i + slice.length}/${catalogRows.length}`)
    }
  }
  console.log(`[seed-from-enriched] catalog_watches: ${catalogRows.length} rows upserted`)

  // ── Upsert catalog_watch_market ────────────────────────────────────────
  console.log('[seed-from-enriched] upserting catalog_watch_market…')
  for (let i = 0; i < marketRows.length; i += CHUNK) {
    const slice = marketRows.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('catalog_watch_market')
      .upsert(slice, { onConflict: 'catalog_watch_id' })
    if (error) fail(`catalog_watch_market chunk ${i / CHUNK} failed: ${error.message}`)
    if ((i / CHUNK) % 10 === 0) {
      console.log(`  catalog_watch_market: ${i + slice.length}/${marketRows.length}`)
    }
  }
  console.log(`[seed-from-enriched] catalog_watch_market: ${marketRows.length} rows upserted`)

  // ── Purge watch_images for excluded ids (admin-flagged "wrong watch") ──
  if (excludedImageIds.size > 0 && !DRY_RUN) {
    const excludedArr = [...excludedImageIds]
    for (let i = 0; i < excludedArr.length; i += CHUNK) {
      const slice = excludedArr.slice(i, i + CHUNK)
      const { error } = await supabase
        .from('watch_images')
        .delete()
        .in('catalog_watch_id', slice)
      if (error) console.warn(`[seed-from-enriched] excluded-image delete warn: ${error.message}`)
    }
    console.log(`[seed-from-enriched] purged watch_images for ${excludedImageIds.size} excluded ids`)
  }

  // ── Refresh watch_images primary variant ───────────────────────────────
  if (imageRows.length > 0) {
    console.log('[seed-from-enriched] refreshing watch_images primary variant…')
    // Delete existing primary rows for these IDs first, then insert fresh.
    const watchIds = imageRows.map(r => r.catalog_watch_id as string)
    for (let i = 0; i < watchIds.length; i += CHUNK) {
      const slice = watchIds.slice(i, i + CHUNK)
      const { error } = await supabase
        .from('watch_images')
        .delete()
        .eq('variant', 'primary')
        .in('catalog_watch_id', slice)
      if (error) fail(`watch_images delete chunk ${i / CHUNK} failed: ${error.message}`)
    }
    for (let i = 0; i < imageRows.length; i += CHUNK) {
      const slice = imageRows.slice(i, i + CHUNK)
      const { error } = await supabase.from('watch_images').insert(slice)
      if (error) fail(`watch_images insert chunk ${i / CHUNK} failed: ${error.message}`)
    }
    console.log(`[seed-from-enriched] watch_images: ${imageRows.length} primary rows refreshed`)
  }

  console.log()
  console.log('[seed-from-enriched] DONE.')
  console.log()
  console.log('Next: open your app. The 35k catalog is now live in Supabase.')
}

void main()
