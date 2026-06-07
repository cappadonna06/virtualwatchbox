/**
 * Read-only audit of `public.catalog_watches` that drives the catalog cleanup
 * (dedupe + reference hygiene + lug-width backfill). Writes a JSON report and
 * the lug-backfill queue; mutates nothing.
 *
 * "Has image" = authoritative Supabase `watch_images` (variant='primary') row,
 * OR membership in the committed manifest minus the excluded list.
 *
 * Required env (same as scripts/enrich-nicknames.ts):
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:  npm run catalog:cleanup-audit
 * Output: data/catalog-cleanup-audit.json, data/catalog-lug-backfill-targets.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

function fail(msg: string): never { console.error(`[audit] ${msg}`); process.exit(1) }

const AKA_RE = /\s*\(aka:\s*[^)]*\)\s*/gi
const normRef = (r: string | null | undefined) => (r ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase()
const cleanRef = (r: string | null | undefined) => (r ?? '').replace(AKA_RE, '').trim()

// Spec columns that count toward a row's "completeness" tiebreak.
const SPEC_COLS = [
  'case_size_mm', 'lug_width_mm', 'case_material', 'dial_color', 'movement', 'caliber',
  'bracelet_type', 'thickness_mm', 'water_resistance_m', 'year_introduced', 'estimated_value',
] as const

type Row = Record<string, unknown> & { id: string; brand: string | null; model: string | null; reference: string | null }

async function pageAll(supabase: SupabaseClient, table: string, columns: string): Promise<Row[]> {
  const out: Row[] = []
  const PAGE = 1000
  let offset = 0
  for (;;) {
    const { data, error } = await supabase.from(table).select(columns).order('id', { ascending: true }).range(offset, offset + PAGE - 1)
    if (error) fail(`${table} at ${offset}: ${error.message}`)
    const rows = (data ?? []) as unknown as Row[]
    out.push(...rows)
    if (rows.length < PAGE) break
    offset += PAGE
  }
  return out
}

async function pagePrimaryImageIds(supabase: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>()
  const PAGE = 1000
  let offset = 0
  for (;;) {
    const { data, error } = await supabase
      .from('watch_images')
      .select('catalog_watch_id')
      .eq('variant', 'primary')
      .order('catalog_watch_id', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) fail(`watch_images at ${offset}: ${error.message}`)
    const rows = (data ?? []) as Array<{ catalog_watch_id: string }>
    for (const r of rows) ids.add(r.catalog_watch_id)
    if (rows.length < PAGE) break
    offset += PAGE
  }
  return ids
}

async function pageHeat(supabase: SupabaseClient): Promise<Map<string, number>> {
  const m = new Map<string, number>()
  const PAGE = 1000
  let offset = 0
  for (;;) {
    const { data, error } = await supabase
      .from('catalog_watch_market')
      .select('catalog_watch_id, heat_score')
      .order('catalog_watch_id', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) { console.warn(`[audit] heat unavailable: ${error.message}`); return m }
    const rows = (data ?? []) as Array<{ catalog_watch_id: string; heat_score: number | null }>
    for (const r of rows) m.set(r.catalog_watch_id, Number(r.heat_score ?? 0))
    if (rows.length < PAGE) break
    offset += PAGE
  }
  return m
}

function completeness(row: Row): number {
  return SPEC_COLS.reduce((n, c) => {
    const v = row[c]
    return n + (v != null && v !== '' && v !== 0 ? 1 : 0)
  }, 0)
}

function loadLocal(file: string): unknown {
  const p = path.join(repoRoot, file)
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) fail('SUPABASE_URL and SUPABASE_SECRET_KEY (or service role key) required')
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

  const cols = ['id', 'brand', 'model', 'reference', ...SPEC_COLS].join(', ')
  const [catalog, primaryIds, heat] = await Promise.all([
    pageAll(supabase, 'catalog_watches', cols),
    pagePrimaryImageIds(supabase),
    pageHeat(supabase),
  ])

  const manifest = (loadLocal('public/watch-assets/processed/manifest.json') as Array<{ watchId: string }> | null) ?? []
  const manifestIds = new Set(manifest.map(m => m.watchId))
  const excluded = new Set(((loadLocal('data/excluded-image-ids.json') as { ids?: Array<{ id: string }> } | null)?.ids ?? []).map(x => x.id))
  const hasImage = (id: string) => primaryIds.has(id) || (manifestIds.has(id) && !excluded.has(id))

  console.log(`[audit] catalog ${catalog.length} · primary images ${primaryIds.size} · manifest ${manifestIds.size} · excluded ${excluded.size}`)
  const imagedCount = catalog.filter(r => hasImage(r.id)).length
  console.log(`[audit] imaged catalog rows: ${imagedCount}`)

  // 1) Duplicate clusters
  const clusters = new Map<string, Row[]>()
  for (const r of catalog) {
    const key = `${(r.brand ?? '').toLowerCase()}|${normRef(r.reference)}`
    if (!normRef(r.reference)) continue
    if (!clusters.has(key)) clusters.set(key, [])
    clusters.get(key)!.push(r)
  }
  const dupClusters = Array.from(clusters.values())
    .filter(g => g.length > 1)
    .map(g => {
      const members = g.map(r => ({
        id: r.id, model: r.model, reference: r.reference,
        estimated_value: r.estimated_value ?? 0, heat: heat.get(r.id) ?? 0,
        hasImage: hasImage(r.id), completeness: completeness(r),
      }))
      // survivor: shortest raw reference → hasImage → completeness → smallest id
      const survivor = [...members].sort((a, b) =>
        (String(a.reference).length - String(b.reference).length) ||
        (Number(b.hasImage) - Number(a.hasImage)) ||
        (b.completeness - a.completeness) ||
        a.id.localeCompare(b.id),
      )[0]
      return { brand: g[0].brand, members, proposedSurvivorId: survivor.id }
    })
    .sort((a, b) => b.members.length - a.members.length)

  // 2) Polluted references
  const polluted = catalog
    .filter(r => /\(aka:/i.test(r.reference ?? ''))
    .map(r => {
      const tokens = (String(r.reference).match(/\(aka:\s*([^)]*)\)/i)?.[1] ?? '')
        .split(',').map(t => t.trim()).filter(Boolean)
      return {
        id: r.id, before: r.reference, after: cleanRef(r.reference),
        nicknameTokens: tokens.filter(t => /[a-z]/i.test(t)),
        barcodeTokens: tokens.filter(t => /^\d+$/.test(t)),
      }
    })

  // 3) Missing lug width
  const missingLug = catalog.filter(r => r.lug_width_mm == null || Number(r.lug_width_mm) === 0)
  const missingImaged = missingLug.filter(r => hasImage(r.id))
  const targets = missingImaged
    .map(r => ({ id: r.id, brand: r.brand, model: r.model, reference: r.reference, case_size_mm: r.case_size_mm ?? null, normalizedRef: normRef(r.reference), heat: heat.get(r.id) ?? 0 }))
    .sort((a, b) => b.heat - a.heat)

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      catalog: catalog.length, primaryImages: primaryIds.size, imaged: imagedCount,
      duplicateClusters: dupClusters.length, pollutedReferences: polluted.length,
      missingLugTotal: missingLug.length, missingLugImaged: missingImaged.length,
    },
    duplicateClusters: dupClusters,
    pollutedReferences: polluted,
  }
  fs.writeFileSync(path.join(repoRoot, 'data', 'catalog-cleanup-audit.json'), JSON.stringify(report, null, 2))
  fs.writeFileSync(path.join(repoRoot, 'data', 'catalog-lug-backfill-targets.json'), JSON.stringify({ generatedAt: report.generatedAt, count: targets.length, targets }, null, 2))

  console.log(`\n[audit] duplicate clusters: ${dupClusters.length}`)
  for (const c of dupClusters.slice(0, 10)) console.log(`    ${c.brand} ${c.members.map(m => m.reference).join('  vs  ')}  → keep ${c.proposedSurvivorId}`)
  console.log(`[audit] polluted references: ${polluted.length}`)
  console.log(`[audit] missing lug width: ${missingLug.length} (imaged ${missingImaged.length})`)
  console.log(`\n[audit] wrote data/catalog-cleanup-audit.json + data/catalog-lug-backfill-targets.json`)
}

main().catch(err => { console.error('[audit] fatal:', err); process.exit(1) })
