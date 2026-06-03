/**
 * One-shot data repair for miscategorized `watchType` values.
 *
 * Root cause (see scripts/watchTypeClassifier.ts header): the old inference
 * tables put a bare `tank` and a bare `field` token in the "Field" rule, with
 * first-match-wins ordering. Cartier Tanks (dress) and anything whose text
 * merely mentioned "field" were swept into Field, polluting the discover
 * algorithm's slot-fill / upgrade logic.
 *
 * What this does
 * --------------
 * 1. Rewrites the `watchType` column of every committed seed CSV in data/
 *    under a deliberately CONSERVATIVE policy:
 *      - empty watchType            → classify() (fill the gap)
 *      - watchType === 'Field'      → reclassify IF the model clearly isn't a
 *                                     field watch (this drains the polluted
 *                                     bucket: Tank→Dress, Superocean→Diver, …)
 *      - any other populated value  → LEFT ALONE (it may carry per-reference
 *                                     nuance a family-level guess would lose,
 *                                     e.g. a "Superocean Heritage" chronograph)
 * 2. Emits supabase/migrations/026_reclassify_watch_types.sql, generated from
 *    the SAME rule table, so the live catalog_watches gets the identical repair
 *    without re-running the 65MB enrich+seed pipeline.
 *
 * Usage:
 *   npx tsx scripts/reclassify-watch-types.ts            # write files
 *   DRY_RUN=1 npx tsx scripts/reclassify-watch-types.ts  # report only
 */
import fs from 'node:fs'
import path from 'node:path'

import { repoRoot, parseCsv, csvEscape } from './watch-image-pipeline'
import {
  OVERRIDE_RULES,
  FILL_RULES,
  classifyWatchType,
  type ClassifierRule,
} from './watchTypeClassifier'

const DRY_RUN = process.env.DRY_RUN === '1'

const CSV_GLOB = [
  'catalog-batch-1.csv',
  'catalog-additions-batch-1.csv',
  'catalog-iconic-additions-batch-1.csv',
  'catalog-seed-200.csv',
  'catalog-seed-batch-2.csv',
  'catalog-seed-batch-3.csv',
  'catalog-seed-batch-4.csv',
  'catalog-seed-tier2.csv',
]

interface Change {
  file: string
  brand: string
  model: string
  from: string
  to: string
}

function decide(brand: string, model: string, current: string): string {
  const text = `${brand} ${model}`
  const cur = (current || '').trim()

  // Fill a genuine gap.
  if (cur === '') return classifyWatchType(text)

  // Drain the polluted Field bucket: keep 'Field' only when the model really
  // reads as a field/tool watch; otherwise take the classifier's call.
  if (cur === 'Field') {
    const next = classifyWatchType(text)
    if (next && next !== 'Field') return next
    return cur
  }

  // Trust every other populated value.
  return cur
}

function rewriteCsv(file: string, changes: Change[]): boolean {
  const filePath = path.join(repoRoot, 'data', file)
  if (!fs.existsSync(filePath)) return false

  const content = fs.readFileSync(filePath, 'utf8')
  const eol = content.includes('\r\n') ? '\r\n' : '\n'
  const trailingNewline = /\r?\n$/.test(content)
  const firstLine = content.split('\n', 1)[0]
  const header = firstLine.replace(/\r$/, '').split(',')
  if (!header.includes('watchType') || !header.includes('brand') || !header.includes('model')) return false

  const rows = parseCsv(content) as Array<Record<string, string>>
  let changed = 0
  for (const row of rows) {
    const brand = row.brand ?? ''
    const model = row.model ?? ''
    const current = row.watchType ?? ''
    const next = decide(brand, model, current)
    if (next !== current.trim()) {
      changes.push({ file, brand, model, from: current.trim() || '∅', to: next || '∅' })
      row.watchType = next
      changed += 1
    }
  }

  if (changed > 0 && !DRY_RUN) {
    const out =
      [
        header.join(','),
        ...rows.map(row => header.map(col => csvEscape(row[col] ?? '')).join(',')),
      ].join(eol) + (trailingNewline ? eol : '')
    fs.writeFileSync(filePath, out, 'utf8')
  }
  return changed > 0
}

// ── SQL migration generation ────────────────────────────────────────────
function sqlLiteral(pattern: string): string {
  return pattern.replace(/'/g, "''")
}

function buildMigration(): string {
  const allRules: ClassifierRule[] = [...OVERRIDE_RULES, ...FILL_RULES]
  const whens = allRules
    .map(r => `      when txt ~* '${sqlLiteral(r.pattern)}' then '${r.type}'`)
    .join('\n')

  return `-- 026_reclassify_watch_types.sql
-- Repair miscategorized catalog_watches.watch_type.
--
-- The historical intake inference put a bare \`tank\` and a bare \`field\` token
-- in the "Field" rule with first-match-wins ordering, so Cartier Tanks (dress)
-- and anything whose text merely mentioned "field" were dumped into the Field
-- bucket. That contaminated the /discover slot-fill + upgrade algorithm, which
-- keys off watch_type.
--
-- This drains the polluted bucket: for rows currently typed 'Field', recompute
-- the type from brand/family/model using the canonical rule order
-- (scripts/watchTypeClassifier.ts) and update only when the model clearly is
-- NOT a field watch. Genuine field watches (Khaki Field, Railmaster, Explorer,
-- etc.) match a 'Field' rule and are left unchanged. Non-Field rows are never
-- touched, so per-reference nuance elsewhere is preserved.
--
-- GENERATED FILE — do not hand-edit. Regenerate with:
--   npx tsx scripts/reclassify-watch-types.ts
-- and re-run \`npm run catalog:seed-full\` later to pick up empty-gap fills the
-- CSV pass also applied (this migration intentionally only repairs 'Field').

update public.catalog_watches as c
set watch_type = sub.new_type
from (
  select
    id,
    watch_type,
    case
${whens}
      else watch_type
    end as new_type
  from (
    select
      id,
      watch_type,
      lower(coalesce(brand, '') || ' ' || coalesce(model_family, '') || ' ' || coalesce(model, '')) as txt
    from public.catalog_watches
  ) t
) sub
where c.id = sub.id
  and c.watch_type = 'Field'
  and sub.new_type <> 'Field'
  and sub.new_type <> c.watch_type;
`
}

function main() {
  const changes: Change[] = []
  for (const file of CSV_GLOB) rewriteCsv(file, changes)

  const byTransition = new Map<string, number>()
  for (const c of changes) {
    const key = `${c.from} → ${c.to}`
    byTransition.set(key, (byTransition.get(key) ?? 0) + 1)
  }

  console.log(`\n=== watchType reclassification ${DRY_RUN ? '(DRY RUN)' : ''} ===`)
  console.log(`Total rows changed: ${changes.length}\n`)
  console.log('By transition:')
  for (const [k, v] of [...byTransition.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v.toString().padStart(4)}  ${k}`)
  }

  const sample = changes.filter(c => c.from === 'Field').slice(0, 25)
  if (sample.length) {
    console.log('\nSample of drained Field rows:')
    for (const c of sample) console.log(`  ${c.brand} ${c.model}: ${c.from} → ${c.to}`)
  }

  const migrationPath = path.join(repoRoot, 'supabase', 'migrations', '026_reclassify_watch_types.sql')
  if (!DRY_RUN) {
    fs.writeFileSync(migrationPath, buildMigration(), 'utf8')
    console.log(`\nWrote migration: ${path.relative(repoRoot, migrationPath)}`)
  } else {
    console.log(`\n(DRY RUN) would write migration: ${path.relative(repoRoot, migrationPath)}`)
  }
}

main()
