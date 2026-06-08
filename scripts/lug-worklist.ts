/**
 * Stage 3 worklist: on-site (photo) watches still missing lug_width_mm,
 * grouped into (brand, model_family|model, case_size) research families.
 * Read-only. Writes .agents/lug-worklist.json
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
  reference: string; case_size_mm: number | null; lug_width_mm: number | null
  watch_type: string; bracelet_type: string | null; style_tags: string[] | null
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
    'id,brand,model,model_family,reference,case_size_mm,lug_width_mm,watch_type,bracelet_type,style_tags')
  const onsite = all.filter((r) => photo.has(r.id))
  // Integrated-bracelet rows are intentionally lug-N/A; exclude from research.
  const missing = onsite.filter((r) => r.lug_width_mm == null && r.bracelet_type !== 'integrated')

  const fam = new Map<string, { brand: string; family: string; size: number | null; ids: string[]; refs: string[]; watch_type: string; bracelet_type: string | null }>()
  for (const r of missing) {
    const familyName = r.model_family || r.model.split(/\s+/).slice(0, 2).join(' ')
    const key = `${r.brand}|${familyName}|${r.case_size_mm}`
    if (!fam.has(key)) fam.set(key, { brand: r.brand, family: familyName, size: r.case_size_mm, ids: [], refs: [], watch_type: r.watch_type, bracelet_type: r.bracelet_type })
    const g = fam.get(key)!
    g.ids.push(r.id); if (g.refs.length < 4) g.refs.push(r.reference)
  }
  const families = [...fam.entries()].map(([key, v]) => ({ key, ...v, count: v.ids.length }))
    .sort((a, b) => b.count - a.count)

  console.log(`on-site total: ${onsite.length}`)
  console.log(`on-site missing lug: ${missing.length}`)
  console.log(`research families: ${families.length}`)
  console.log(`  >=3 watches: ${families.filter((f) => f.count >= 3).length} (cover ${families.filter((f) => f.count >= 3).reduce((n, f) => n + f.count, 0)})`)
  fs.writeFileSync(path.join(repoRoot, '.agents', 'lug-worklist.json'), JSON.stringify(families, null, 2))
  console.log('→ .agents/lug-worklist.json')
}
main().catch((e) => { console.error(e); process.exit(1) })
