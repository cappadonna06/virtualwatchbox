/**
 * Correct pre-existing wrong lug_width_mm values surfaced by the reconcile
 * (.agents/lug-reconcile-report.json). Applies ONLY the "corroborated" set —
 * conflicts where both our own research and the second session's curated map
 * agree the catalog value is wrong. Operates on the exact ids the report
 * flagged (no re-matching), and only overwrites the expected wrong value.
 *
 * Deliberately EXCLUDED: cases where our verified value is right and theirs is
 * wrong (Explorer II 42→keep 22, Legend Diver 42→keep 21, Oris Aquis), and the
 * uncertain single-source curated set (Hamilton Jazzmaster/Khaki Field 42,
 * Master 34, Navitimer) — those need their own re-verification.
 *
 * DRY by default. APPLY=1 to write.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()
const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true'
const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type Conflict = { id: string; brand: string; model: string; reference: string; case_size_mm: number; ours: number; theirs: number; confidence: string; source: string; onSite: boolean }

const near = (a: number, b: number) => Math.abs(a - b) <= 0.3
// Corroborated rules: both our research and theirs agree the correct value.
const RULES: { ok: (c: Conflict) => boolean; why: string }[] = [
  { why: 'Aqua Terra 38/38.5mm = 19mm (AT-38 quirk; our research + delugs)', ok: (c) => /omega/i.test(c.brand) && /aqua terra/i.test(c.model) && (near(c.case_size_mm, 38) || near(c.case_size_mm, 38.5)) && c.theirs === 19 },
  { why: 'HydroConquest 41/43mm = 21mm (our research + justraps)', ok: (c) => /longines/i.test(c.brand) && /hydroconquest/i.test(c.model) && (near(c.case_size_mm, 41) || near(c.case_size_mm, 43)) && c.theirs === 21 },
  { why: 'Master Collection 40mm = 21mm (our research + delugs)', ok: (c) => /longines/i.test(c.brand) && /master collection/i.test(c.model) && near(c.case_size_mm, 40) && c.theirs === 21 },
  { why: 'Submariner 41mm = 21mm (Rolex widened lugs; everest)', ok: (c) => /rolex/i.test(c.brand) && /submariner/i.test(c.model) && near(c.case_size_mm, 41) && c.theirs === 21 },
]

async function main() {
  const report = JSON.parse(fs.readFileSync(path.join(repoRoot, '.agents', 'lug-reconcile-report.json'), 'utf8'))
  const conflicts: Conflict[] = report.conflicts
  const targets = conflicts
    .map((c) => ({ c, rule: RULES.find((r) => r.ok(c)) }))
    .filter((x) => x.rule)

  const byRule = new Map<string, { n: number; onSite: number }>()
  for (const { c, rule } of targets) {
    const g = byRule.get(rule!.why) ?? { n: 0, onSite: 0 }
    g.n++; if (c.onSite) g.onSite++; byRule.set(rule!.why, g)
  }
  console.log(`${APPLY ? '⚙️  APPLY' : '🔍 DRY'} — corroborated lug corrections`)
  console.log(`targets: ${targets.length} rows (of ${conflicts.length} total conflicts)\n`)
  for (const [why, g] of byRule) console.log(`  ${String(g.n).padStart(4)} (${g.onSite} on-site)  ${why}`)
  const excluded = conflicts.length - targets.length
  console.log(`\nexcluded (kept ours / deferred): ${excluded}`)

  if (APPLY) {
    const applied: unknown[] = []
    for (const { c } of targets) {
      const { error, count } = await sb.from('catalog_watches')
        .update({ lug_width_mm: c.theirs }, { count: 'exact' })
        .eq('id', c.id).eq('lug_width_mm', c.ours)
      if (error) { console.log(`  ✗ ${c.id}: ${error.message}`); continue }
      if (count) applied.push({ id: c.id, from: c.ours, to: c.theirs, source: `reconcile-corroborated:${c.source}` })
    }
    fs.writeFileSync(path.join(repoRoot, '.agents', 'lug-corrections-applied.json'), JSON.stringify(applied, null, 2))
    console.log(`\nCorrected ${applied.length} rows → .agents/lug-corrections-applied.json`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
