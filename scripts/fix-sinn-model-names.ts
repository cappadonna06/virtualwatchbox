/*
 * Sinn model-name hygiene.
 *
 * Background: kaggle:watch_db mapped WatchBase FAMILY slugs (e.g.
 * "Diving Watches", "Instrument Chronographs", "Frankfurt Financial
 * District") into the model field of Sinn rows. Those are category labels,
 * not model names. The real model names live on WatchBase ref pages /
 * family index pages.
 *
 * This script:
 *   1. Reads previously-downloaded Sinn family pages from /tmp/sinn-*.html
 *      (fetched by the orchestrator before invoking this script).
 *   2. Parses every (ref, real_model_name) from the `alt="Sinn <name> (<ref>)"`
 *      attribute on each `.item-block.watch-block` image tag.
 *   3. Looks up each Sinn row in `data/catalog-seed-full.csv` whose `model`
 *      field is one of the WatchBase family labels.
 *   4. Replaces that model with the cleaned WatchBase name (strips leading
 *      "Diving Watch / Chronograph / Mission Timer / Pilot Chronograph /
 *      Diving Chronograph" category prefix — the part that's redundant with
 *      the watchType field already on the row).
 *   5. Writes the result back to `data/catalog-seed-full.csv` AND emits a
 *      committable record at `data/catalog-name-overrides-batch-1.csv` so
 *      the renames survive a future re-run of `expand-from-watchdb` (which
 *      regenerates seed-full from kaggle dumps and would otherwise wipe
 *      these fixes).
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..')
const SEED_CSV = path.join(ROOT, 'data', 'catalog-seed-full.csv')
const OVERRIDES_CSV = path.join(ROOT, 'data', 'catalog-name-overrides-batch-1.csv')

const FAMILY_HTML_GLOB = ['diving-watches','instrument-watches','instrument-chronographs',
  'frankfurt-financial-district','classic-timepieces','ladies-watches','special-edition']

const FAMILY_AS_MODEL = new Set([
  'Diving Watches', 'Instrument Chronographs', 'Instrument Watches',
  'Frankfurt Financial District', 'Classic Timepieces', 'Ladies Watches',
  'Special Edition',
])

const STRIP_PREFIX = /^(Diving Chronograph|Diving Watch|Chronograph|Mission Timer|Pilot Chronograph|Classic Watch)\s+/

function normRef(ref: string): string {
  return ref.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// CSV splitter that respects quoted fields containing commas (so refs like
// "1,010,010" stay intact).
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (c === ',' && !inQ) {
      out.push(cur); cur = ''
    } else { cur += c }
  }
  out.push(cur)
  return out
}

function csvEscape(s: string): string {
  if (s == null) return ''
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function buildSinnNameMap(): Map<string, { realModel: string; family: string; wbRef: string }> {
  const map = new Map<string, { realModel: string; family: string; wbRef: string }>()
  for (const fam of FAMILY_HTML_GLOB) {
    const p = `/tmp/sinn-${fam}.html`
    if (!fs.existsSync(p)) {
      console.warn(`[fix-sinn] no cached HTML for family ${fam}, skipping`)
      continue
    }
    const html = fs.readFileSync(p, 'utf8')
    // alt="Sinn <model> (<ref>)"
    const re = /alt="Sinn ([^"()]+?)\s*\(([^)]+)\)"/g
    let m: RegExpExecArray | null
    let count = 0
    while ((m = re.exec(html)) !== null) {
      const realModel = m[1].trim()
      const ref = m[2].trim()
      const key = normRef(ref)
      if (!map.has(key)) {
        map.set(key, { realModel, family: fam, wbRef: ref })
        count++
      }
    }
    console.log(`[fix-sinn] family=${fam} → ${count} ref-name mappings`)
  }
  console.log(`[fix-sinn] total unique mappings: ${map.size}`)
  return map
}

function main() {
  const nameMap = buildSinnNameMap()

  const csv = fs.readFileSync(SEED_CSV, 'utf8')
  const lines = csv.split('\n')
  if (!lines[0].startsWith('id,brand,model,reference')) {
    throw new Error(`unexpected CSV header: ${lines[0]}`)
  }

  const updated: string[] = [lines[0]]
  const overrides: Array<{ id: string; ref: string; oldModel: string; newModel: string; family: string }> = []
  let patched = 0
  let sinnSeen = 0
  let unresolved = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) { updated.push(line); continue }
    const cols = splitCsvLine(line)
    if (cols.length < 4 || cols[1] !== 'Sinn') {
      updated.push(line); continue
    }
    sinnSeen++
    if (!FAMILY_AS_MODEL.has(cols[2])) {
      updated.push(line); continue
    }
    const key = normRef(cols[3])
    const hit = nameMap.get(key)
    if (!hit) {
      unresolved++
      updated.push(line)
      continue
    }
    const cleaned = hit.realModel.replace(STRIP_PREFIX, '').trim()
    overrides.push({
      id: cols[0],
      ref: cols[3],
      oldModel: cols[2],
      newModel: cleaned,
      family: hit.family,
    })
    cols[2] = cleaned
    updated.push(cols.map(csvEscape).join(','))
    patched++
  }

  // Write seed-full back
  fs.writeFileSync(SEED_CSV, updated.join('\n'), 'utf8')

  // Write committable overrides record
  const ovLines = [
    'catalog_watch_id,reference,old_model,new_model,watchbase_family,source',
    ...overrides.map(o =>
      [o.id, o.ref, o.oldModel, o.newModel, o.family, 'watchbase-family-page-2026-05-21']
        .map(csvEscape)
        .join(',')
    ),
  ]
  fs.writeFileSync(OVERRIDES_CSV, ovLines.join('\n') + '\n', 'utf8')

  console.log('')
  console.log('=== Sinn model-name patch summary ===')
  console.log(`  Sinn rows seen in seed-full:     ${sinnSeen}`)
  console.log(`  Rows patched (model renamed):    ${patched}`)
  console.log(`  Family-as-model rows unresolved: ${unresolved}`)
  console.log(`  Updated:   ${path.relative(ROOT, SEED_CSV)}`)
  console.log(`  Overrides: ${path.relative(ROOT, OVERRIDES_CSV)}  (committable record of the rename)`)
  console.log('')
  console.log('Sample of what changed:')
  for (const o of overrides.slice(0, 10)) {
    console.log(`  ${o.id.padEnd(28)} ${o.ref.padEnd(15)} "${o.oldModel}" → "${o.newModel}"  (${o.family})`)
  }
  console.log('')
  console.log('Next: re-run npm run catalog:enrich to push the renames into the enriched JSON.')
}

main()
