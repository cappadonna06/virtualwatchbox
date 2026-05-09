/**
 * Seed catalog_watches (and watch_images primary variants) from the
 * hand-curated TS seed in lib/watches.ts.
 *
 * Idempotent. Runs against any environment with valid Supabase credentials:
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY
 *
 * On conflict by id:
 *   - source = 'seed' rows are upserted (re-running picks up edits to the TS file).
 *   - source != 'seed' rows are LEFT ALONE (admin/ingestion rows are not stomped).
 *
 * Usage:
 *   npm run catalog:seed
 *   DRY_RUN=1 npm run catalog:seed   # log planned writes, no DB mutation
 *
 * After running, public.catalog_watches contains the 87 hand-curated rows
 * and public.watch_images carries one variant='primary' row per watch that
 * has processed image assets in public/watch-assets/processed/.
 *
 * Order:
 *   1. Apply migrations 010..014 first (so the table shape and policies exist)
 *   2. Run this script (pre-FK enforcement, before migration 016)
 *   3. Apply migrations 016..019
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { watches } from '../lib/watches'
import { isValidCatalogId, mintCatalogId } from '../lib/catalogId'
import processedManifest from '../public/watch-assets/processed/manifest.json'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
void repoRoot

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'

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

type CatalogRow = {
  id: string
  brand: string
  model: string
  reference: string
  case_size_mm: number
  lug_width_mm: number | null
  case_material: string
  dial_color: string
  movement: string
  complications: string[]
  estimated_value: number
  watch_type: string
  dial_color_hex: string
  marker_color_hex: string
  hand_color_hex: string
  source: 'seed'
  moderation_status: 'approved'
  verification_status: 'verified'
  approved_at: string
}

function fail(msg: string): never {
  console.error(`[seedCatalog] ${msg}`)
  process.exit(1)
}

async function main() {
  if (!SUPABASE_URL) fail('Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL.')
  if (!SUPABASE_KEY && !DRY_RUN) {
    fail('Missing SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY (required unless DRY_RUN=1).')
  }

  const supabase: SupabaseClient | null = DRY_RUN
    ? null
    : createClient(SUPABASE_URL!, SUPABASE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

  const now = new Date().toISOString()

  // Validate every seed entry's id matches the canonical mint rule. This is
  // the gate that prevents drift: edits to lib/watches.ts that introduce a
  // non-canonical id are caught at seed time, before they leak into the DB.
  const idMismatches: Array<{ seedId: string; expected: string; brand: string; reference: string }> = []
  for (const w of watches) {
    if (!isValidCatalogId(w.id)) {
      idMismatches.push({ seedId: w.id, expected: '<malformed>', brand: w.brand, reference: w.reference })
      continue
    }
    const expected = mintCatalogId({
      brand: w.brand,
      reference: w.reference,
      model: w.model,
      dialColor: w.dialColor,
    })
    if (expected !== w.id) {
      idMismatches.push({ seedId: w.id, expected, brand: w.brand, reference: w.reference })
    }
  }
  if (idMismatches.length) {
    console.error('[seedCatalog] seed contains non-canonical ids:')
    for (const m of idMismatches) {
      console.error(`  ${m.seedId.padEnd(50)} expected=${m.expected}  (${m.brand} / ${m.reference})`)
    }
    fail('Run `npm run catalog:migrate-ids` (then APPLY=1) to bring lib/watches.ts in line with lib/catalogId.ts.')
  }

  const rows: CatalogRow[] = watches.map(w => ({
    id: w.id,
    brand: w.brand,
    model: w.model,
    reference: w.reference,
    case_size_mm: w.caseSizeMm,
    lug_width_mm: typeof w.lugWidthMm === 'number' ? w.lugWidthMm : null,
    case_material: w.caseMaterial,
    dial_color: w.dialColor,
    movement: w.movement,
    complications: w.complications ?? [],
    estimated_value: w.estimatedValue ?? 0,
    watch_type: w.watchType,
    dial_color_hex: w.dialConfig.dialColor,
    marker_color_hex: w.dialConfig.markerColor,
    hand_color_hex: w.dialConfig.handColor,
    source: 'seed',
    moderation_status: 'approved',
    verification_status: 'verified',
    approved_at: now,
  }))

  console.log(`[seedCatalog] ${rows.length} catalog rows prepared`)

  if (DRY_RUN || !supabase) {
    console.log('[seedCatalog] DRY_RUN — sample row:')
    console.log(JSON.stringify(rows[0], null, 2))
    return
  }

  // 1) Read existing rows to determine which are admin-edited (don't stomp).
  const ids = rows.map(r => r.id)
  const { data: existing, error: existingErr } = await supabase
    .from('catalog_watches')
    .select('id, source')
    .in('id', ids)
  if (existingErr) fail(`select existing failed: ${existingErr.message}`)

  const protectedIds = new Set(
    (existing ?? []).filter(r => r.source && r.source !== 'seed').map(r => r.id),
  )
  const writable = rows.filter(r => !protectedIds.has(r.id))
  console.log(
    `[seedCatalog] ${writable.length} rows will be upserted; ${protectedIds.size} admin-edited rows preserved`,
  )

  // 2) Upsert in chunks to keep payloads sane.
  const CHUNK = 50
  for (let i = 0; i < writable.length; i += CHUNK) {
    const slice = writable.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('catalog_watches')
      .upsert(slice, { onConflict: 'id' })
    if (error) fail(`upsert chunk ${i / CHUNK} failed: ${error.message}`)
    console.log(
      `[seedCatalog] upserted chunk ${i / CHUNK + 1}/${Math.ceil(writable.length / CHUNK)}`,
    )
  }

  // 3) Seed primary catalog images from manifest.json. Bucket-storage URLs
  //    are out of scope — these are local /public paths so they can render
  //    in dev without uploading to Supabase Storage. Admin /admin/images
  //    flow remains the canonical replacement path.
  const manifest = processedManifest as ManifestEntry[]
  const manifestById = new Map(manifest.map(m => [m.watchId, m]))

  const imageRows = rows
    .map(r => {
      const m = manifestById.get(r.id)
      if (!m) return null
      return {
        catalog_watch_id: r.id,
        png_url: m.pngPath,
        webp_url: m.webpPath,
        source_width: m.sourceWidth ?? null,
        source_height: m.sourceHeight ?? null,
        processed_width: m.processedWidth ?? null,
        processed_height: m.processedHeight ?? null,
        background_removal_applied: !!m.backgroundRemovalApplied,
        variant: 'primary',
        sort_order: 0,
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>

  if (imageRows.length > 0) {
    // Use the partial unique index on (catalog_watch_id) where variant='primary'
    // by upserting on that index. Supabase's upsert needs an explicit
    // onConflict expression; we approximate with delete-then-insert for primary.
    const watchIds = imageRows.map(r => r.catalog_watch_id as string)
    const { error: delErr } = await supabase
      .from('watch_images')
      .delete()
      .eq('variant', 'primary')
      .in('catalog_watch_id', watchIds)
    if (delErr) fail(`watch_images primary clear failed: ${delErr.message}`)

    for (let i = 0; i < imageRows.length; i += CHUNK) {
      const slice = imageRows.slice(i, i + CHUNK)
      const { error } = await supabase.from('watch_images').insert(slice)
      if (error) fail(`watch_images insert chunk ${i / CHUNK} failed: ${error.message}`)
    }
    console.log(`[seedCatalog] inserted ${imageRows.length} primary watch_images rows`)
  } else {
    console.log('[seedCatalog] no manifest.json entries — skipping watch_images seed')
  }

  // 4) Ensure market rows exist for all seeded catalog ids (idempotent;
  //    backfill values come from the migration, this is a safety net).
  const marketRows = rows.map(r => ({ catalog_watch_id: r.id }))
  for (let i = 0; i < marketRows.length; i += CHUNK) {
    const slice = marketRows.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('catalog_watch_market')
      .upsert(slice, { onConflict: 'catalog_watch_id', ignoreDuplicates: true })
    if (error) console.warn(`[seedCatalog] market upsert chunk warning: ${error.message}`)
  }
  console.log('[seedCatalog] catalog_watch_market rows ensured')

  console.log('[seedCatalog] done')
}

void main()
