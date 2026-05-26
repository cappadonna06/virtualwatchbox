/**
 * Recompute heat_score + popularity_rank for the full catalog using the
 * current scripts/heat-score.ts weights.
 *
 * Reads:
 *   data/catalog-enriched-full.json   (has chrono24/luxury163k listing counts,
 *                                       estimatedValue, communitySignal, and
 *                                       the pre-existing heatBreakdown — we use
 *                                       the corroboration component to reverse
 *                                       the sourceCount that fed the original
 *                                       score, then run computeHeatScore again.)
 *
 * Writes (chunked upserts):
 *   public.catalog_watch_market.heat_score
 *   public.catalog_watch_market.popularity_rank
 *   public.catalog_watch_market.last_pop_computed_at
 *
 * Required env:
 *   SUPABASE_URL  / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   DRY_RUN=1 npm run catalog:recompute-heat   # preview top/bottom shifts, no writes
 *   npm run catalog:recompute-heat              # real update
 *   SAMPLE=100 npm run catalog:recompute-heat   # only score N records (for testing)
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'
import { computeHeatScore, type HeatSignals } from './heat-score'

loadLocalEnv()

const enrichedPath = path.join(repoRoot, 'data', 'catalog-enriched-full.json')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const CHUNK = Number(process.env.CHUNK ?? 500)
const SAMPLE = process.env.SAMPLE ? Number(process.env.SAMPLE) : null

function fail(msg: string): never {
  console.error(`[recompute-heat] ${msg}`)
  process.exit(1)
}

type EnrichedRow = {
  id: string
  brand: string
  model: string
  modelFamily?: string | null
  reference: string
  communitySignal?: string | null
  estimatedValue?: number | null
  chrono24ListingCount?: number
  luxury163kListingCount?: number
  heatScore?: number
  heatBreakdown?: {
    sourceCorroboration?: number
  }
}

// Reverse the corroboration→sourceCount mapping used by the original score
// so we can re-run computeHeatScore without re-running the full enrich step.
function sourceCountFromCorroborationPoints(points: number | undefined): number {
  if (points == null) return 1
  if (points >= 100) return 4
  if (points >= 75) return 3
  if (points >= 50) return 2
  return 1
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) fail('SUPABASE_URL and SUPABASE_SECRET_KEY (or service role key) required')
  if (!fs.existsSync(enrichedPath)) fail(`enriched catalog not found at ${enrichedPath}`)

  console.log(`[recompute-heat] reading ${enrichedPath}`)
  const raw = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'))
  const enriched: EnrichedRow[] = Array.isArray(raw) ? raw : (raw.records ?? raw.rows ?? [])
  if (enriched.length === 0) fail('enriched catalog appears empty')
  const slice = SAMPLE != null ? enriched.slice(0, SAMPLE) : enriched
  console.log(`[recompute-heat] loaded ${enriched.length} rows${SAMPLE != null ? ` (using first ${slice.length})` : ''}`)

  // Recompute everyone in memory first so we can report deltas.
  type Rescored = {
    id: string
    brand: string
    model: string
    oldHeat: number
    newHeat: number
    breakdown: ReturnType<typeof computeHeatScore>['breakdown']
  }
  const rescored: Rescored[] = []

  for (const r of slice) {
    const signals: HeatSignals = {
      brand: r.brand,
      model: r.model,
      modelFamily: r.modelFamily ?? null,
      reference: r.reference,
      communitySignal: r.communitySignal ?? null,
      sourceCount: sourceCountFromCorroborationPoints(r.heatBreakdown?.sourceCorroboration),
      chrono24ListingCount: r.chrono24ListingCount ?? 0,
      luxury163kListingCount: r.luxury163kListingCount ?? 0,
      estimatedValueUsd: r.estimatedValue ?? null,
    }
    const result = computeHeatScore(signals)
    rescored.push({
      id: r.id,
      brand: r.brand,
      model: r.model,
      oldHeat: r.heatScore ?? 0,
      newHeat: result.heatScore,
      breakdown: result.breakdown,
    })
  }

  // Assign popularity_rank by descending heat (1 = highest).
  rescored.sort((a, b) => b.newHeat - a.newHeat || a.brand.localeCompare(b.brand))
  const ranked = rescored.map((r, i) => ({ ...r, popularityRank: i + 1 }))

  // ── Report ─────────────────────────────────────────────────────────────
  const biggestRisers = [...ranked].sort((a, b) => (b.newHeat - b.oldHeat) - (a.newHeat - a.oldHeat)).slice(0, 15)
  const biggestFallers = [...ranked].sort((a, b) => (a.newHeat - a.oldHeat) - (b.newHeat - b.oldHeat)).slice(0, 15)

  console.log('\n[recompute-heat] top 15 biggest RISERS (most gained):')
  for (const r of biggestRisers) {
    const delta = r.newHeat - r.oldHeat
    console.log(`  ${String(delta).padStart(5)} → ${r.brand} ${r.model} (${r.oldHeat} → ${r.newHeat})`)
  }

  console.log('\n[recompute-heat] top 15 biggest FALLERS (most lost):')
  for (const r of biggestFallers) {
    const delta = r.newHeat - r.oldHeat
    console.log(`  ${String(delta).padStart(5)} → ${r.brand} ${r.model} (${r.oldHeat} → ${r.newHeat})`)
  }

  console.log('\n[recompute-heat] new top 20 by heat:')
  for (const r of ranked.slice(0, 20)) {
    console.log(`  #${String(r.popularityRank).padStart(3)} ${String(r.newHeat).padStart(4)}  ${r.brand} ${r.model}`)
  }

  if (DRY_RUN) {
    console.log('\n[recompute-heat] DRY_RUN=1 — no writes. Re-run without DRY_RUN to apply.')
    return
  }

  // ── Apply ──────────────────────────────────────────────────────────────
  const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const now = new Date().toISOString()
  console.log(`\n[recompute-heat] writing ${ranked.length} rows in chunks of ${CHUNK}...`)

  // Dedup by catalog_watch_id — the enriched JSON can contain multiple
  // records that resolve to the same id (e.g. after a reference-column
  // cleanup that produced (brand,ref,dial) collisions). Postgres rejects
  // an upsert chunk with two rows that share the conflict key.
  // Keep the first occurrence per id; later ones are dropped.
  const seenIds = new Set<string>()
  const dedupedRanked = ranked.filter(r => {
    if (seenIds.has(r.id)) return false
    seenIds.add(r.id)
    return true
  })
  const droppedDupes = ranked.length - dedupedRanked.length
  if (droppedDupes > 0) {
    console.log(`[recompute-heat] dropped ${droppedDupes} duplicate id(s) before upsert (kept first per id)`)
  }

  let written = 0
  for (let i = 0; i < dedupedRanked.length; i += CHUNK) {
    const batch = dedupedRanked.slice(i, i + CHUNK).map(r => ({
      catalog_watch_id: r.id,
      heat_score: r.newHeat,
      popularity_rank: r.popularityRank,
      last_pop_computed_at: now,
    }))
    const { error } = await supabase
      .from('catalog_watch_market')
      .upsert(batch, { onConflict: 'catalog_watch_id' })
    if (error) fail(`upsert failed at offset ${i}: ${error.message}`)
    written += batch.length
    process.stdout.write(`  ${written}/${dedupedRanked.length}\r`)
  }
  console.log(`\n[recompute-heat] done. updated ${written} rows.`)
}

main().catch(err => {
  console.error('[recompute-heat] fatal:', err)
  process.exit(1)
})
