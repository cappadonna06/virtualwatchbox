/**
 * Stage 3b: apply researched lug widths.
 * Reads .agents/lug-worklist.json (family → ids) and every .agents/lug-res-*.json
 * (family → {lug_width_mm, confidence, source_url}). Applies high+medium-confidence
 * non-null values to the still-missing on-site rows, in one bulk update per family.
 * Writes provenance to .agents/lug-applied.json. Low/null are held.
 *
 * DRY_RUN=1 → preview.  Usage: DRY_RUN=1 npx tsx scripts/lug-apply.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const APPLY_CONF = new Set(['high', 'medium'])
const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type Fam = { key: string; ids: string[]; count: number }
type Res = { key: string; lug_width_mm: number | null; confidence: string; case_size_confirmed?: boolean; source_url?: string; notes?: string }

async function main() {
  const worklist: Fam[] = JSON.parse(fs.readFileSync(path.join(repoRoot, '.agents', 'lug-worklist.json'), 'utf8'))
  const idsByKey = new Map(worklist.map((f) => [f.key, f.ids]))

  const res: Res[] = []
  for (const f of fs.readdirSync(path.join(repoRoot, '.agents')).filter((x) => /^lug-res-.*\.json$/.test(x)))
    res.push(...JSON.parse(fs.readFileSync(path.join(repoRoot, '.agents', f), 'utf8')))

  let famApplied = 0, famHeld = 0, famUnmatched = 0, rowsTarget = 0
  const applied: { id: string; lug: number; source: string; confidence: string }[] = []
  const heldKeys: string[] = []

  for (const r of res) {
    const ids = idsByKey.get(r.key)
    if (!ids) { famUnmatched++; continue }
    if (r.lug_width_mm == null || !APPLY_CONF.has(r.confidence) || !(r.lug_width_mm >= 8 && r.lug_width_mm <= 30)) {
      famHeld++; heldKeys.push(`${r.key} (${r.confidence}${r.lug_width_mm == null ? ',null' : '=' + r.lug_width_mm})`); continue
    }
    famApplied++; rowsTarget += ids.length
    for (const id of ids) applied.push({ id, lug: r.lug_width_mm, source: r.source_url ?? '', confidence: r.confidence })

    if (!DRY) {
      const { error, count } = await sb.from('catalog_watches')
        .update({ lug_width_mm: r.lug_width_mm }, { count: 'exact' })
        .in('id', ids).is('lug_width_mm', null)
      if (error) console.log(`  ✗ ${r.key}: ${error.message}`)
      else if (count !== ids.length) console.log(`  ~ ${r.key}: updated ${count}/${ids.length} (some already set?)`)
    }
  }

  console.log(`${DRY ? '🔍 DRY RUN' : '⚙️  APPLIED'} — lug widths`)
  console.log(`families applied (high+medium): ${famApplied}  → ${rowsTarget} watches`)
  console.log(`families held (low/null/implausible): ${famHeld}`)
  console.log(`research keys not matched to worklist: ${famUnmatched}`)
  if (!DRY) {
    fs.writeFileSync(path.join(repoRoot, '.agents', 'lug-applied.json'), JSON.stringify(applied, null, 2))
    console.log(`provenance → .agents/lug-applied.json (${applied.length} rows)`)
  }
  console.log('\nheld (need a closer look / second pass):')
  for (const h of heldKeys.slice(0, 60)) console.log('  • ' + h)
}
main().catch((e) => { console.error(e); process.exit(1) })
