/**
 * One-shot cleanup: strip " (aka: ...)" pollution from the `reference` column
 * of data/catalog-seed-full.csv. The `id` column is left untouched so existing
 * Supabase primary keys (catalog_watches.id) stay stable.
 *
 * Idempotent. Run again after future seed merges if needed.
 */
import * as fs from 'fs'
import * as path from 'path'
import { repoRoot, parseCsv, csvEscape } from './watch-image-pipeline'

const seedPath = path.join(repoRoot, 'data', 'catalog-seed-full.csv')
const backupPath = seedPath + '.pre-aka-cleanup.bak'

const raw = fs.readFileSync(seedPath, 'utf8')
const rows = parseCsv(raw) as unknown as Array<Record<string, string>>

if (rows.length === 0) {
  console.error('no rows parsed from', seedPath)
  process.exit(1)
}

const headers = Object.keys(rows[0])
if (!headers.includes('reference')) {
  console.error('reference column not found. headers:', headers)
  process.exit(1)
}

if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, raw, 'utf8')
  console.log(`[clean-aka] backup → ${path.relative(repoRoot, backupPath)}`)
}

let changed = 0
for (const row of rows) {
  const before = row.reference
  // " (aka: ...)" — single or multi-value, possibly with commas inside
  const after = before.replace(/\s*\(aka:\s*[^)]*\)\s*/g, '').trim()
  if (after !== before) {
    row.reference = after
    changed += 1
  }
}

const out =
  headers.join(',') +
  '\n' +
  rows.map(r => headers.map(h => csvEscape(r[h])).join(',')).join('\n') +
  '\n'

fs.writeFileSync(seedPath, out, 'utf8')
console.log(`[clean-aka] cleaned ${changed} of ${rows.length} rows → ${path.relative(repoRoot, seedPath)}`)
