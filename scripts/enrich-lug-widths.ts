/**
 * Backfill `public.catalog_watches.lug_width_mm` (+ provenance columns from
 * migration 032) from the reference-first curated map at
 * `data/catalog-lug-widths.json`.
 *
 * Strap-fit compatibility (lib/strapCompatibility.ts) matches on an EXACT lug
 * width, so this script is conservative by design:
 *   - DRY RUN by default. Set APPLY=1 (or pass --apply) to write.
 *   - Null-only: skips rows that already have a lug_width_mm unless OVERWRITE=1.
 *   - Reference truth: an explicit `references` match wins. Otherwise a
 *     (brand, model) match is accepted ONLY when the row's case_size_mm
 *     confirms the entry's caseSizeMm (±TOL mm). Case size is a confirmation
 *     gate — lug width is never inferred from it.
 *   - Conflict-safe: if multiple entries match a row with DIFFERENT widths,
 *     the row is reported and skipped (never guessed).
 *   - Integrated models (entry list `integrated`) get bracelet_type='integrated'
 *     (when unset) and are never given a lug width.
 *
 * Required env (same as scripts/enrich-nicknames.ts):
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npm run catalog:enrich-lug-widths            # dry run (default)
 *   APPLY=1 npm run catalog:enrich-lug-widths    # write null-only
 *   APPLY=1 OVERWRITE=1 npm run catalog:enrich-lug-widths
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()

const mapPath = path.join(repoRoot, 'data', 'catalog-lug-widths.json')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

const APPLY = process.env.APPLY === '1' || process.argv.includes('--apply')
const OVERWRITE = process.env.OVERWRITE === '1' || process.argv.includes('--overwrite')
const TOL = Number(process.env.CASE_TOL ?? 0.75)

type Entry = {
  brand: string
  model: string
  caseSizeMm: number
  lugWidthMm: number
  source: string
  confidence: 'verified' | 'curated' | 'llm' | 'heuristic'
  references?: string[]
}
type Integrated = { brand: string; model: string; note?: string }
type LugMap = { entries: Entry[]; integrated?: Integrated[] }

type CatalogRow = {
  id: string
  brand: string | null
  model: string | null
  reference: string | null
  case_size_mm: number | null
  lug_width_mm: number | null
  bracelet_type: string | null
}

function fail(msg: string): never {
  console.error(`[enrich-lug-widths] ${msg}`)
  process.exit(1)
}

const norm = (s: string | null | undefined) =>
  (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
const normRef = (s: string | null | undefined) =>
  (s ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase()

// Word-boundary bidirectional containment so catalog "Aqua Terra" matches entry
// "Seamaster Aqua Terra" (and "Datejust 41" matches "Datejust") WITHOUT
// mid-word false positives like "Conquest" ⊂ "HydroConquest".
function boundaryContains(hay: string, needle: string): boolean {
  const i = hay.indexOf(needle)
  if (i < 0) return false
  const before = i === 0 || hay[i - 1] === ' '
  const after = i + needle.length === hay.length || hay[i + needle.length] === ' '
  return before && after
}
function modelMatches(catalogModel: string, entryModel: string): boolean {
  const c = norm(catalogModel)
  const e = norm(entryModel)
  if (!c || !e) return false
  return c === e || boundaryContains(c, e) || boundaryContains(e, c)
}

async function fetchCatalog(supabase: SupabaseClient): Promise<CatalogRow[]> {
  const out: CatalogRow[] = []
  const PAGE = 1000
  let offset = 0
  for (;;) {
    const { data, error } = await supabase
      .from('catalog_watches')
      .select('id, brand, model, reference, case_size_mm, lug_width_mm, bracelet_type')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) fail(`fetchCatalog at ${offset}: ${error.message}`)
    const rows = (data ?? []) as CatalogRow[]
    out.push(...rows)
    if (rows.length < PAGE) break
    offset += PAGE
  }
  return out
}

function loadMap(): LugMap {
  if (!fs.existsSync(mapPath)) fail(`missing ${mapPath}`)
  const raw = JSON.parse(fs.readFileSync(mapPath, 'utf8')) as LugMap
  if (!Array.isArray(raw.entries)) fail('map missing .entries[]')
  return raw
}

type LugUpdate = { id: string; brand: string; reference: string; lugWidthMm: number; source: string; confidence: string }
type IntegratedUpdate = { id: string; brand: string; model: string }

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY)
    fail('SUPABASE_URL and SUPABASE_SECRET_KEY (or service role key) required')

  const { entries, integrated = [] } = loadMap()
  console.log(`[enrich-lug-widths] loaded ${entries.length} entries, ${integrated.length} integrated rules`)

  const refIndex = new Map<string, Entry>()
  for (const e of entries) for (const r of e.references ?? []) refIndex.set(normRef(r), e)

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const catalog = await fetchCatalog(supabase)
  console.log(`[enrich-lug-widths] fetched ${catalog.length} catalog rows`)

  const lugUpdates: LugUpdate[] = []
  const integratedUpdates: IntegratedUpdate[] = []
  const conflicts: Array<{ row: CatalogRow; widths: number[] }> = []
  let alreadySet = 0
  let unmatched = 0

  for (const row of catalog) {
    // Integrated classification first — these never get a lug width.
    const isIntegrated = integrated.some(
      i => norm(i.brand) === norm(row.brand) && modelMatches(row.model ?? '', i.model),
    )
    if (isIntegrated) {
      if ((row.bracelet_type ?? '') !== 'integrated') {
        integratedUpdates.push({ id: row.id, brand: row.brand ?? '', model: row.model ?? '' })
      }
      continue
    }

    if (row.lug_width_mm != null && row.lug_width_mm > 0 && !OVERWRITE) {
      alreadySet += 1
      continue
    }

    // 1) Reference truth.
    const byRef = refIndex.get(normRef(row.reference))
    if (byRef) {
      lugUpdates.push({ id: row.id, brand: row.brand ?? '', reference: row.reference ?? '', lugWidthMm: byRef.lugWidthMm, source: byRef.source, confidence: byRef.confidence })
      continue
    }

    // 2) (brand, model) match confirmed by case size (±TOL).
    const matches = entries.filter(
      e =>
        norm(e.brand) === norm(row.brand) &&
        modelMatches(row.model ?? '', e.model) &&
        row.case_size_mm != null &&
        Math.abs(Number(row.case_size_mm) - e.caseSizeMm) <= TOL,
    )
    if (matches.length === 0) { unmatched += 1; continue }
    const widths = Array.from(new Set(matches.map(m => m.lugWidthMm)))
    if (widths.length > 1) { conflicts.push({ row, widths }); continue }
    const best = matches.sort((a, b) => (a.confidence === 'verified' ? -1 : 1))[0]
    lugUpdates.push({ id: row.id, brand: row.brand ?? '', reference: row.reference ?? '', lugWidthMm: best.lugWidthMm, source: best.source, confidence: best.confidence })
  }

  console.log(
    `\n[enrich-lug-widths] lug matches ${lugUpdates.length} · integrated to flag ${integratedUpdates.length} · ` +
    `already set ${alreadySet} · conflicts ${conflicts.length} · unmatched ${unmatched}`,
  )
  for (const u of lugUpdates.slice(0, 12)) console.log(`    ${u.brand} ${u.reference} → ${u.lugWidthMm}mm (${u.confidence})`)
  if (conflicts.length) {
    console.log(`\n[enrich-lug-widths] WARN ${conflicts.length} conflict(s) — skipped (need per-reference research):`)
    for (const c of conflicts.slice(0, 12)) console.log(`    ${c.row.brand} ${c.row.model} ${c.row.case_size_mm}mm → candidates ${c.widths.join('/')}`)
  }

  if (!APPLY) {
    console.log('\n[enrich-lug-widths] DRY RUN — no writes. Set APPLY=1 to apply.')
    return
  }

  console.log(`\n[enrich-lug-widths] writing ${lugUpdates.length} lug widths + ${integratedUpdates.length} integrated flags…`)
  let n = 0
  for (const u of lugUpdates) {
    const { error } = await supabase
      .from('catalog_watches')
      .update({ lug_width_mm: u.lugWidthMm, lug_width_source: u.source, lug_width_confidence: u.confidence })
      .eq('id', u.id)
    if (error) fail(`update lug ${u.id}: ${error.message}`)
    process.stdout.write(`  lug ${++n}/${lugUpdates.length}\r`)
  }
  let m = 0
  for (const u of integratedUpdates) {
    const { error } = await supabase
      .from('catalog_watches')
      .update({ bracelet_type: 'integrated' })
      .eq('id', u.id)
    if (error) fail(`update integrated ${u.id}: ${error.message}`)
    process.stdout.write(`  integrated ${++m}/${integratedUpdates.length}\r`)
  }
  console.log(`\n[enrich-lug-widths] done. ${n} lug widths, ${m} integrated flags.`)
}

main().catch(err => {
  console.error('[enrich-lug-widths] fatal:', err)
  process.exit(1)
})
