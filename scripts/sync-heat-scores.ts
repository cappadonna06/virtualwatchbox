/**
 * Sync backend-computed heat scores into the static frontend catalog.
 *
 * The backend algorithm (`scripts/heat-score.ts`) writes 0-1000 scores plus
 * popularity_rank into `public.catalog_watch_market` (via
 * scripts/recompute-heat.ts). The frontend hero carousel needs those scores
 * at module-load time without a Supabase round trip, so this script pulls
 * them down and writes `data/catalog-heat-scores.json` — a small id-keyed
 * lookup that `lib/watches.ts` merges into the runtime `CatalogWatch.market`
 * field.
 *
 * Required env:
 *   SUPABASE_URL  / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   DRY_RUN=1 npm run catalog:sync-heat   # preview, no file write
 *   npm run catalog:sync-heat              # write data/catalog-heat-scores.json
 *
 * Run after `npm run catalog:recompute-heat`. Commit both
 * `data/catalog-heat-scores.json` and any catalog changes.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()

const outputPath = path.join(repoRoot, 'data', 'catalog-heat-scores.json')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const PAGE = Number(process.env.PAGE ?? 1000)

function fail(msg: string): never {
  console.error(`[sync-heat-scores] ${msg}`)
  process.exit(1)
}

type Row = {
  catalog_watch_id: string
  heat_score: number | null
  popularity_rank: number | null
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) fail('SUPABASE_URL and SUPABASE_SECRET_KEY (or service role key) required')

  const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log('[sync-heat-scores] fetching catalog_watch_market rows…')
  const scores: Record<string, { heatScore: number; popularityRank: number }> = {}
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('catalog_watch_market')
      .select('catalog_watch_id, heat_score, popularity_rank')
      .not('heat_score', 'is', null)
      .order('catalog_watch_id', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) fail(`select failed at offset ${offset}: ${error.message}`)
    const rows = (data ?? []) as Row[]
    for (const r of rows) {
      if (r.heat_score == null) continue
      scores[r.catalog_watch_id] = {
        heatScore: r.heat_score,
        popularityRank: r.popularity_rank ?? 0,
      }
    }
    if (rows.length < PAGE) break
    offset += PAGE
  }

  const count = Object.keys(scores).length
  console.log(`[sync-heat-scores] fetched ${count} scored watches`)

  if (count === 0) fail('no scored rows returned — did catalog:recompute-heat run yet?')

  const payload = {
    generatedAt: new Date().toISOString(),
    scores,
  }

  if (DRY_RUN) {
    const sample = Object.entries(scores).slice(0, 10)
    console.log('[sync-heat-scores] DRY_RUN=1 — not writing. Sample:')
    for (const [id, s] of sample) {
      console.log(`  ${id}  heat=${s.heatScore}  rank=${s.popularityRank}`)
    }
    return
  }

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n')
  console.log(`[sync-heat-scores] wrote ${count} entries → ${path.relative(repoRoot, outputPath)}`)
}

main().catch(err => {
  console.error('[sync-heat-scores] fatal:', err)
  process.exit(1)
})
