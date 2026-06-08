/**
 * Export a committed snapshot of the LIVE on-site catalog — every Supabase
 * catalog_watches row that has a watch_images photo (i.e. actually renders on
 * the site). This is the git-visible mirror of the Supabase source of truth,
 * analogous to data/catalog-heat-scores.json.
 *
 * Output: data/catalog-live-imaged.json  (sorted for stable diffs; no timestamp
 * so re-running with no DB change produces no diff).
 *
 * Regenerate after any catalog edit:  npm run catalog:export-live
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()
const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type Row = {
  id: string; brand: string; model: string; model_family: string | null
  reference: string; watch_type: string; case_size_mm: number | null
  lug_width_mm: number | null; bracelet_type: string | null
  dial_color: string | null; estimated_value: number | null
}

async function pageAll<T>(t: string, c: string): Promise<T[]> {
  const out: T[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from(t).select(c).range(f, f + 999)
    if (error) throw error
    if (!data?.length) break
    out.push(...(data as T[])); if (data.length < 1000) break
  }
  return out
}

async function main() {
  const imgs = await pageAll<{ catalog_watch_id: string }>('watch_images', 'catalog_watch_id')
  const photo = new Set(imgs.map((r) => r.catalog_watch_id))
  const all = await pageAll<Row>('catalog_watches',
    'id,brand,model,model_family,reference,watch_type,case_size_mm,lug_width_mm,bracelet_type,dial_color,estimated_value')

  const onsite = all
    .filter((r) => photo.has(r.id))
    .sort((a, b) =>
      a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model) || a.reference.localeCompare(b.reference))

  const withLug = onsite.filter((r) => r.lug_width_mm != null).length
  const integrated = onsite.filter((r) => r.bracelet_type === 'integrated').length
  const resolved = onsite.filter((r) => r.lug_width_mm != null || r.bracelet_type === 'integrated').length

  const snapshot = {
    _meta: {
      note: 'Snapshot of the LIVE on-site catalog (Supabase catalog_watches rows that have a watch_images photo). Source of truth is Supabase; regenerate with `npm run catalog:export-live`. Do not hand-edit.',
      catalog_total: all.length,
      on_site_total: onsite.length,
      with_lug_width: withLug,
      integrated_bracelet: integrated,
      lug_resolved_pct: Number((resolved / onsite.length * 100).toFixed(1)),
    },
    watches: onsite,
  }

  const out = path.join(repoRoot, 'data', 'catalog-live-imaged.json')
  fs.writeFileSync(out, JSON.stringify(snapshot, null, 2) + '\n')
  console.log(`Wrote ${onsite.length} on-site watches → data/catalog-live-imaged.json`)
  console.log(`  catalog total ${all.length} | with lug ${withLug} | integrated ${integrated} | resolved ${snapshot._meta.lug_resolved_pct}%`)
}
main().catch((e) => { console.error(e); process.exit(1) })
