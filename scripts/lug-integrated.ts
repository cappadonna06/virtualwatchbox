/**
 * Stage 3a: mark integrated-bracelet families. These take no standard strap,
 * so per the cleanup decision lug stays N/A and bracelet_type='integrated'.
 * Operates on on-site rows in the curated integrated families.
 *
 * DRY_RUN=1 → preview.  Usage: DRY_RUN=1 npx tsx scripts/lug-integrated.ts
 */
import { createClient } from '@supabase/supabase-js'
import { loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// [brand regex, family/model regex] — unambiguous integrated-bracelet lines.
const INTEGRATED: [RegExp, RegExp][] = [
  [/audemars piguet/i, /royal oak/i],            // RO, RO Offshore, RO Concept
  [/patek/i, /nautilus|aquanaut|twenty/i],
  [/vacheron/i, /overseas/i],
  [/tudor/i, /^royal$|royal\b/i],
  [/casio|g-shock/i, /g-shock/i],
  [/chopard/i, /alpine eagle/i],
  [/girard/i, /laureato/i],
  [/bvlgari|bulgari/i, /octo/i],
  [/piaget/i, /polo/i],
]

type Row = { id: string; brand: string; model: string; model_family: string | null; bracelet_type: string | null; lug_width_mm: number | null }
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
function isIntegrated(r: Row): boolean {
  const fam = `${r.model_family ?? ''} ${r.model}`
  return INTEGRATED.some(([b, f]) => b.test(r.brand) && f.test(fam))
}
async function main() {
  const imgs = await pageAll<{ catalog_watch_id: string }>('watch_images', 'catalog_watch_id')
  const photo = new Set(imgs.map((r) => r.catalog_watch_id))
  const all = await pageAll<Row>('catalog_watches', 'id,brand,model,model_family,bracelet_type,lug_width_mm')
  const targets = all.filter((r) => photo.has(r.id) && isIntegrated(r) && r.bracelet_type !== 'integrated')

  const byFam = new Map<string, number>()
  for (const r of targets) {
    const k = `${r.brand} | ${r.model_family || r.model.split(/\s+/).slice(0, 2).join(' ')}`
    byFam.set(k, (byFam.get(k) ?? 0) + 1)
  }
  console.log(`${DRY ? '🔍 DRY RUN' : '⚙️  APPLYING'} — ${targets.length} on-site rows → bracelet_type='integrated'`)
  console.log(`(${targets.filter((r) => r.lug_width_mm == null).length} of them were missing lug)\n`)
  for (const [k, n] of [...byFam.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${k}`)

  if (!DRY) {
    let ok = 0
    for (const r of targets) {
      const { error } = await sb.from('catalog_watches').update({ bracelet_type: 'integrated' }).eq('id', r.id)
      if (error) console.log(`  ✗ ${r.id}: ${error.message}`); else ok++
    }
    console.log(`\nMarked ${ok}/${targets.length} integrated.`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
