/**
 * Stage 1 (READ-ONLY): build the dedupe merge plan for on-site duplicate groups.
 *
 * Mutates nothing. For each (brand + normalized reference) group that includes
 * at least one watch with a photo, it:
 *   - picks the SURVIVOR (cleanest/shortest reference)
 *   - computes a best-of-both field merge
 *   - counts dependent rows that must be re-pointed before any delete
 *   - classifies the group AUTO (safe aka-twin) vs REVIEW (size/lug conflict, >2 rows, no aka pattern)
 *
 * Outputs:
 *   .agents/dedupe-plan.json     full machine-readable plan
 *   .agents/dedupe-auto.csv      the auto-merge set
 *   .agents/dedupe-review.csv    the human-review set
 *
 * Usage: npx tsx scripts/dedupe-plan.ts
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
  id: string; brand: string; model: string; reference: string
  case_size_mm: number | null; lug_width_mm: number | null
  watch_type: string; dial_color: string | null; movement: string | null
  estimated_value: number | null; source: string | null; nickname: string | null
}

const MERGE_FIELDS = [
  'case_size_mm', 'lug_width_mm', 'lug_to_lug_mm', 'movement', 'dial_color',
  'caliber', 'water_resistance_m', 'thickness_mm', 'bracelet_type', 'clasp_type',
  'case_material', 'bezel_material', 'crystal_material', 'complications',
] as const

async function pageAll<T>(table: string, columns: string): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    out.push(...(data as T[]))
    if (data.length < 1000) break
  }
  return out
}

async function dependentCounts(table: string, col: string, ids: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  for (let i = 0; i < ids.length; i += 300) {
    const slice = ids.slice(i, i + 300)
    const { data, error } = await sb.from(table).select(col).in(col, slice)
    if (error) { console.warn(`  (skip ${table}.${col}: ${error.message})`); return counts }
    for (const r of data as Record<string, string>[]) {
      const v = r[col]; counts.set(v, (counts.get(v) ?? 0) + 1)
    }
  }
  return counts
}

const normRef = (ref: string) => ref.split('(')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

// Lower score = better survivor (cleaner identity, per "use the shorter ref").
function survivorScore(r: Row): number {
  let s = r.reference.length
  if (/-aka-/.test(r.id)) s += 1000
  if (/\(/.test(r.reference)) s += 1000
  if (/[,]/.test(r.reference)) s += 50
  if (/\b(james bond|007|spectre|batman|pepsi|hulk|kermit)\b/i.test(r.reference)) s += 50
  return s
}

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

async function main() {
  const watches = await pageAll<Row>(
    'catalog_watches',
    'id,brand,model,reference,case_size_mm,lug_width_mm,watch_type,dial_color,movement,estimated_value,source,nickname',
  )
  const imgRows = await pageAll<{ catalog_watch_id: string }>('watch_images', 'catalog_watch_id')
  const withPhoto = new Set(imgRows.map((r) => r.catalog_watch_id))

  const byKey = new Map<string, Row[]>()
  for (const w of watches) {
    const k = `${w.brand.trim().toLowerCase()}|${normRef(w.reference)}`
    ;(byKey.get(k) ?? byKey.set(k, []).get(k)!).push(w)
  }
  const groups = [...byKey.entries()]
    .filter(([, rows]) => rows.length > 1 && rows.some((r) => withPhoto.has(r.id)))

  // Pull full field set only for the rows we'll actually merge, to compute best-of.
  const groupIds = groups.flatMap(([, rows]) => rows.map((r) => r.id))
  const fullRows = new Map<string, Record<string, unknown>>()
  for (let i = 0; i < groupIds.length; i += 300) {
    const slice = groupIds.slice(i, i + 300)
    const { data } = await sb.from('catalog_watches')
      .select(['id', ...MERGE_FIELDS].join(',')).in('id', slice)
    for (const r of (data ?? []) as Record<string, unknown>[]) fullRows.set(r.id as string, r)
  }

  // Dependent re-point counts for every loser id.
  const loserIds = groups.flatMap(([, rows]) => {
    const survivor = [...rows].sort((a, b) => survivorScore(a) - survivorScore(b))[0]
    return rows.filter((r) => r.id !== survivor.id).map((r) => r.id)
  })
  console.log(`Querying dependents for ${loserIds.length} loser ids…`)
  const dep = {
    watches: await dependentCounts('watches', 'catalog_id', loserIds),
    watch_states: await dependentCounts('watch_states', 'catalog_watch_id', loserIds),
    watch_images: await dependentCounts('watch_images', 'catalog_watch_id', loserIds),
    market: await dependentCounts('catalog_watch_market', 'catalog_watch_id', loserIds),
    reviews: await dependentCounts('watch_image_reviews', 'catalog_watch_id', loserIds),
  }

  const plan = groups.map(([key, rows]) => {
    const sorted = [...rows].sort((a, b) => survivorScore(a) - survivorScore(b))
    const survivor = sorted[0]
    const losers = sorted.slice(1)

    const sizes = new Set(rows.map((r) => r.case_size_mm))
    const lugVals = [...new Set(rows.map((r) => r.lug_width_mm).filter((v) => v != null))]
    const isAkaTwin = rows.some((r) => /-aka-/.test(r.id) || /\(aka:/i.test(r.reference))
      && rows.some((r) => !/-aka-/.test(r.id) && !/\(aka:/i.test(r.reference))

    const reasons: string[] = []
    if (sizes.size > 1) reasons.push('CASE-SIZE-MISMATCH')
    if (lugVals.length > 1) reasons.push('LUG-CONFLICT')
    if (rows.length > 2) reasons.push('MULTI-ROW')
    if (!isAkaTwin) reasons.push('NO-AKA-PATTERN')

    // best-of merge: survivor value wins unless null/empty, then take a loser's.
    const merged: Record<string, unknown> = {}
    const filledFrom: Record<string, string> = {}
    for (const f of MERGE_FIELDS) {
      const sv = fullRows.get(survivor.id)?.[f]
      const isEmpty = sv == null || sv === '' || (Array.isArray(sv) && sv.length === 0)
      if (!isEmpty) { merged[f] = sv; continue }
      for (const l of losers) {
        const lv = fullRows.get(l.id)?.[f]
        if (lv != null && lv !== '' && !(Array.isArray(lv) && lv.length === 0)) {
          merged[f] = lv; filledFrom[f] = l.id; break
        }
      }
    }

    const survivorHasPhoto = withPhoto.has(survivor.id)
    const loserPhoto = losers.find((l) => withPhoto.has(l.id))

    const depCount = (id: string) =>
      (dep.watches.get(id) ?? 0) + (dep.watch_states.get(id) ?? 0) +
      (dep.watch_images.get(id) ?? 0) + (dep.market.get(id) ?? 0) + (dep.reviews.get(id) ?? 0)

    return {
      key,
      verdict: reasons.length ? 'REVIEW' : 'AUTO',
      reasons,
      survivor: { id: survivor.id, reference: survivor.reference, model: survivor.model, hasPhoto: survivorHasPhoto },
      losers: losers.map((l) => ({
        id: l.id, reference: l.reference, model: l.model, hasPhoto: withPhoto.has(l.id),
        repoint: {
          userWatches: dep.watches.get(l.id) ?? 0,
          watchStates: dep.watch_states.get(l.id) ?? 0,
          images: dep.watch_images.get(l.id) ?? 0,
          market: dep.market.get(l.id) ?? 0,
          reviews: dep.reviews.get(l.id) ?? 0,
        },
      })),
      merged,
      filledFrom,
      imageAction: survivorHasPhoto
        ? (loserPhoto ? 'keep-survivor-image (loser image dropped)' : 'keep-survivor-image')
        : (loserPhoto ? `repoint-image:${loserPhoto.id}` : 'no-image'),
      touchesUserData: losers.some((l) => (dep.watches.get(l.id) ?? 0) > 0),
      maxRepoint: Math.max(...losers.map((l) => depCount(l.id))),
    }
  })

  const auto = plan.filter((p) => p.verdict === 'AUTO')
  const review = plan.filter((p) => p.verdict === 'REVIEW')
  const userTouched = plan.filter((p) => p.touchesUserData)

  console.log('\n═══════════════ DEDUPE PLAN (read-only) ═══════════════')
  console.log(`on-site duplicate groups:      ${plan.length}`)
  console.log(`  AUTO (safe merge):           ${auto.length}`)
  console.log(`  REVIEW (needs your eyes):    ${review.length}`)
  console.log(`groups touching USER-owned watches (extra care): ${userTouched.length}`)
  console.log('\nREVIEW reasons:')
  const reasonCount: Record<string, number> = {}
  for (const p of review) for (const r of p.reasons) reasonCount[r] = (reasonCount[r] ?? 0) + 1
  console.log(reasonCount)
  console.log('\nReview groups:')
  for (const p of review) {
    console.log(`  • [${p.reasons.join(',')}] ${p.key}`)
    console.log(`      survivor: ${p.survivor.reference}  "${p.survivor.model}"`)
    for (const l of p.losers) console.log(`      loser:    ${l.reference}  "${l.model}"  repoint=${JSON.stringify(l.repoint)}`)
  }

  fs.mkdirSync(path.join(repoRoot, '.agents'), { recursive: true })
  fs.writeFileSync(path.join(repoRoot, '.agents', 'dedupe-plan.json'), JSON.stringify(plan, null, 2))

  const header = 'verdict,reasons,key,survivor_id,survivor_ref,survivor_model,loser_ids,loser_refs,image_action,touches_user_data,max_repoint\n'
  const toCsv = (rows: typeof plan) => header + rows.map((p) => [
    p.verdict, p.reasons.join('|'), p.key, p.survivor.id, p.survivor.reference, p.survivor.model,
    p.losers.map((l) => l.id).join('|'), p.losers.map((l) => l.reference).join('|'),
    p.imageAction, p.touchesUserData, p.maxRepoint,
  ].map(csvEscape).join(',')).join('\n')
  fs.writeFileSync(path.join(repoRoot, '.agents', 'dedupe-auto.csv'), toCsv(auto))
  fs.writeFileSync(path.join(repoRoot, '.agents', 'dedupe-review.csv'), toCsv(review))
  console.log('\nWrote .agents/dedupe-plan.json, dedupe-auto.csv, dedupe-review.csv')
}

main().catch((e) => { console.error(e); process.exit(1) })
