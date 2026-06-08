/**
 * Reconcile a second session's curated lug-width map against our LIVE catalog.
 * Source map: .agents/their-lug-widths.json (from branch claude/happy-fermat-IV1A9,
 * pulled via `git show ... > .agents/their-lug-widths.json`).
 *
 * For each entry, matches live catalog_watches rows by reference (entry.references[])
 * or by brand + model (substring, either direction) + case_size_mm within ±TOL,
 * then buckets each matched row:
 *   - agree     : our live lug == their lug
 *   - conflict  : our live lug != their lug   (REPORT ONLY — never auto-overwritten)
 *   - fillable  : our lug is null, theirs confirmed  (APPLY=1 fills these)
 *   - integrated: skipped (bracelet_type='integrated')
 *
 * DRY by default. APPLY=1 fills the `fillable` nulls and writes provenance to
 * .agents/lug-reconcile-applied.json.
 *
 * Usage: npx tsx scripts/lug-reconcile.ts   |   APPLY=1 npx tsx scripts/lug-reconcile.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()
const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true'
const TOL = Number(process.env.CASE_TOL ?? 0.75)
const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type Entry = { brand: string; model: string; caseSizeMm: number; lugWidthMm: number; source: string; confidence: string; references?: string[] }
type Row = { id: string; brand: string; model: string; reference: string; case_size_mm: number | null; lug_width_mm: number | null; bracelet_type: string | null }

const nb = (s: string | null) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
const nr = (s: string | null) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')

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

function matches(e: Entry, r: Row): boolean {
  if (nb(r.brand) !== nb(e.brand)) return false
  if (e.references?.length) return e.references.map(nr).includes(nr(r.reference))
  const m1 = nb(r.model), m2 = nb(e.model)
  const modelOk = m1 === m2 || m1.includes(m2) || m2.includes(m1)
  const sizeOk = r.case_size_mm != null && Math.abs(r.case_size_mm - e.caseSizeMm) <= TOL
  return modelOk && sizeOk
}

async function main() {
  const map = JSON.parse(fs.readFileSync(path.join(repoRoot, '.agents', 'their-lug-widths.json'), 'utf8'))
  const entries: Entry[] = map.entries
  const rows = await pageAll<Row>('catalog_watches', 'id,brand,model,reference,case_size_mm,lug_width_mm,bracelet_type')
  const imgs = await pageAll<{ catalog_watch_id: string }>('watch_images', 'catalog_watch_id')
  const onSiteSet = new Set(imgs.map((r) => r.catalog_watch_id))

  const agree: Row[] = [], integrated: Row[] = []
  const conflicts: { row: Row; theirs: number; entry: Entry }[] = []
  const fillable: { row: Row; theirs: number; entry: Entry }[] = []
  const seen = new Set<string>() // a row is decided once (first matching entry wins)

  for (const e of entries) {
    for (const r of rows) {
      if (seen.has(r.id) || !matches(e, r)) continue
      seen.add(r.id)
      if (r.bracelet_type === 'integrated') { integrated.push(r); continue }
      if (r.lug_width_mm == null) fillable.push({ row: r, theirs: e.lugWidthMm, entry: e })
      else if (r.lug_width_mm === e.lugWidthMm) agree.push(r)
      else conflicts.push({ row: r, theirs: e.lugWidthMm, entry: e })
    }
  }

  console.log(`${APPLY ? '⚙️  APPLY' : '🔍 DRY'} — reconcile ${entries.length} curated entries vs live catalog (±${TOL}mm)\n`)
  console.log(`agree (our live == theirs):   ${agree.length}`)
  console.log(`fillable (our null, theirs):  ${fillable.length}`)
  console.log(`conflict (our live != theirs): ${conflicts.length}`)
  console.log(`matched-but-integrated (skip): ${integrated.length}`)

  // ── breakdowns ──
  const onSite = (r: Row) => onSiteSet.has(r.id)
  const cKey = (c: { row: Row; theirs: number; entry: Entry }) =>
    `${c.entry.brand} | ${c.entry.model} ${c.entry.caseSizeMm}mm | ours=${c.row.lug_width_mm} theirs=${c.theirs} | ${c.entry.confidence}`
  const cGroups = new Map<string, { n: number; onSite: number }>()
  for (const c of conflicts) {
    const g = cGroups.get(cKey(c)) ?? { n: 0, onSite: 0 }
    g.n++; if (onSite(c.row)) g.onSite++; cGroups.set(cKey(c), g)
  }
  console.log(`\n⚠️  CONFLICT PATTERNS (our live value != their curated value):`)
  for (const [k, g] of [...cGroups.entries()].sort((a, b) => b[1].n - a[1].n))
    console.log(`  ${String(g.n).padStart(4)} (${g.onSite} on-site)  ${k}`)

  const fOn = fillable.filter((f) => onSite(f.row)), fOff = fillable.filter((f) => !onSite(f.row))
  const fConf = (arr: typeof fillable) => arr.reduce((m, f) => ((m[f.entry.confidence] = (m[f.entry.confidence] ?? 0) + 1), m), {} as Record<string, number>)
  console.log(`\nFILLABLE nulls — on-site: ${fOn.length} ${JSON.stringify(fConf(fOn))} | off-site: ${fOff.length} ${JSON.stringify(fConf(fOff))}`)

  fs.writeFileSync(path.join(repoRoot, '.agents', 'lug-reconcile-report.json'), JSON.stringify({
    summary: { agree: agree.length, fillable: fillable.length, conflict: conflicts.length, integrated: integrated.length },
    conflicts: conflicts.map((c) => ({ id: c.row.id, brand: c.row.brand, model: c.row.model, reference: c.row.reference, case_size_mm: c.row.case_size_mm, ours: c.row.lug_width_mm, theirs: c.theirs, confidence: c.entry.confidence, source: c.entry.source, onSite: onSite(c.row) })),
    fillable: fillable.map((f) => ({ id: f.row.id, brand: f.row.brand, model: f.row.model, reference: f.row.reference, case_size_mm: f.row.case_size_mm, theirs: f.theirs, confidence: f.entry.confidence, onSite: onSite(f.row) })),
  }, null, 2))
  console.log('\nFull report → .agents/lug-reconcile-report.json')

  if (APPLY && fillable.length) {
    const applied: unknown[] = []
    for (const f of fillable) {
      const { error } = await sb.from('catalog_watches')
        .update({ lug_width_mm: f.theirs }).eq('id', f.row.id).is('lug_width_mm', null)
      if (error) { console.log(`  ✗ ${f.row.id}: ${error.message}`); continue }
      applied.push({ id: f.row.id, lug: f.theirs, source: `reconcile:${f.entry.source}`, confidence: f.entry.confidence })
    }
    fs.writeFileSync(path.join(repoRoot, '.agents', 'lug-reconcile-applied.json'), JSON.stringify(applied, null, 2))
    console.log(`\nApplied ${applied.length} fills → provenance in .agents/lug-reconcile-applied.json`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
