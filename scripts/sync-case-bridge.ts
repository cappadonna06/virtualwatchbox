/**
 * Regenerate the committed case-only bridge (data/case-only-images.json) from
 * Supabase watch_images — the source of truth for segmentation_status, lug
 * geometry, etc. A human reviewing /admin/image-review → Case Segmentation
 * corrects/approves rows in the DATABASE (via app/api/admin/case-segmentation),
 * not the committed file directly, so this script folds those decisions back
 * into the static bridge the Studio actually reads at module-load. Mirrors the
 * existing catalog:sync-heat / catalog:export-live pattern (Supabase → committed
 * JSON snapshot).
 *
 * Usage: npm run straps:sync-bridge
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { loadLocalEnv, repoRoot } from './watch-image-pipeline'

loadLocalEnv()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY
const BRIDGE_PATH = path.join(repoRoot, 'data', 'case-only-images.json')

type CatalogJoin = { brand?: string; model?: string; reference?: string; lug_width_mm?: number } | null

async function main(): Promise<void> {
  if (!SUPABASE_URL) { console.error('[sync-case-bridge] Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL.'); process.exit(1) }
  if (!SUPABASE_KEY) { console.error('[sync-case-bridge] Missing SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY.'); process.exit(1) }
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })

  const rows: Array<Record<string, unknown>> = []
  const PAGE = 1000
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('watch_images')
      .select('catalog_watch_id, case_only_url, case_only_webp_url, lug_geometry, segmentation_confidence, segmentation_status, catalog_watches(brand, model, reference, lug_width_mm)')
      .eq('variant', 'primary')
      .not('case_only_url', 'is', null)
      .range(offset, offset + PAGE - 1)
    if (error) { console.error('[sync-case-bridge] query failed:', error.message); process.exit(1) }
    if (!data?.length) break
    rows.push(...data)
    if (data.length < PAGE) break
  }

  const bridge: Record<string, unknown> = {}
  for (const row of rows) {
    const cw = (row.catalog_watches ?? null) as CatalogJoin
    bridge[row.catalog_watch_id as string] = {
      caseOnlyUrl: row.case_only_webp_url ?? row.case_only_url,
      caseOnlyPngUrl: row.case_only_url,
      lugGeometry: row.lug_geometry,
      lugWidthMm: cw?.lug_width_mm ?? undefined,
      brand: cw?.brand,
      model: cw?.model,
      reference: cw?.reference,
      confidence: row.segmentation_confidence ?? 0,
      status: row.segmentation_status ?? 'pending',
    }
  }
  const sorted = Object.fromEntries(Object.entries(bridge).sort(([a], [b]) => a.localeCompare(b)))
  fs.writeFileSync(BRIDGE_PATH, JSON.stringify(sorted, null, 2) + '\n')
  const approved = Object.values(sorted).filter((e) => (e as { status?: string }).status === 'approved').length
  console.log(`[sync-case-bridge] wrote ${Object.keys(sorted).length} entries (${approved} approved) → data/case-only-images.json`)
}

void main()
