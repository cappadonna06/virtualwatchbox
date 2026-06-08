/**
 * One-off audit for the catalog cleanup pass.
 *  - dedupe candidates (same physical watch, multiple rows)
 *  - messy/long references
 *  - missing lug_width_mm
 * Scoped primarily to watches that have a watch_images row (i.e. show up on site).
 *
 * Usage: npx tsx scripts/catalog-cleanup-audit.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

type Row = {
  id: string
  brand: string
  model: string
  reference: string
  case_size_mm: number | null
  lug_width_mm: number | null
  lug_to_lug_mm: number | null
  watch_type: string
  dial_color: string | null
  movement: string | null
  estimated_value: number | null
  source: string | null
  verification_status: string | null
}

async function pageAll<T>(table: string, columns: string): Promise<T[]> {
  const out: T[] = []
  const size = 1000
  for (let from = 0; ; from += size) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + size - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    out.push(...(data as T[]))
    if (data.length < size) break
  }
  return out
}

function normRef(ref: string): string {
  // strip "(aka: ...)" tails and non-alphanumerics, uppercase
  const base = ref.split('(')[0]
  return base.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

function refIsMessy(ref: string): string[] {
  const flags: string[] = []
  if (/\(/.test(ref)) flags.push('parenthetical')
  if (/aka/i.test(ref)) flags.push('aka')
  if (/\b(james bond|007|spectre|batman|pepsi|hulk|kermit)\b/i.test(ref)) flags.push('nickname-in-ref')
  if (ref.length > 24) flags.push(`long(${ref.length})`)
  if (/[a-z]{4,}/.test(ref) && !/^[A-Z0-9.\- /]+$/.test(ref)) flags.push('prose')
  if (/,/.test(ref)) flags.push('comma')
  return flags
}

async function main() {
  const watches = await pageAll<Row>(
    'catalog_watches',
    'id,brand,model,reference,case_size_mm,lug_width_mm,lug_to_lug_mm,watch_type,dial_color,movement,estimated_value,source,verification_status',
  )
  const imageRows = await pageAll<{ catalog_watch_id: string }>('watch_images', 'catalog_watch_id')
  const withPhoto = new Set(imageRows.map((r) => r.catalog_watch_id))

  const onSite = watches.filter((w) => withPhoto.has(w.id))

  console.log('═══════════════════════════════════════════════════════')
  console.log(`catalog_watches total:        ${watches.length}`)
  console.log(`watch_images rows:            ${imageRows.length} (unique watch_id: ${withPhoto.size})`)
  console.log(`catalog rows WITH a photo:    ${onSite.length}`)
  console.log('═══════════════════════════════════════════════════════\n')

  // ── 1. DEDUPE ────────────────────────────────────────────────────────
  const byKey = new Map<string, Row[]>()
  for (const w of watches) {
    const key = `${w.brand.trim().toLowerCase()}|${normRef(w.reference)}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(w)
  }
  const dupGroups = [...byKey.entries()].filter(([, rows]) => rows.length > 1)
  const dupGroupsOnSite = dupGroups.filter(([, rows]) => rows.some((r) => withPhoto.has(r.id)))
  const dupRowsTotal = dupGroups.reduce((n, [, r]) => n + r.length, 0)
  const dupRowsOnSite = dupGroups.reduce((n, [, r]) => n + r.filter((x) => withPhoto.has(x.id)).length, 0)

  console.log('── 1. DEDUPE (same brand + normalized reference) ──')
  console.log(`duplicate groups (whole catalog): ${dupGroups.length}  (rows involved: ${dupRowsTotal})`)
  console.log(`duplicate groups touching photos: ${dupGroupsOnSite.length}  (on-site rows: ${dupRowsOnSite})`)
  console.log('\nsample groups that include an on-site (photo) row:')
  for (const [key, rows] of dupGroupsOnSite.slice(0, 25)) {
    console.log(`  • ${key}`)
    for (const r of rows) {
      const tag = withPhoto.has(r.id) ? 'PHOTO' : '     '
      console.log(
        `      [${tag}] ${r.id}  ref="${r.reference}"  model="${r.model}"  size=${r.case_size_mm}  lug=${r.lug_width_mm ?? '—'}  $${r.estimated_value ?? '—'}  src=${r.source}`,
      )
    }
  }

  // ── 2. MESSY REFERENCES ──────────────────────────────────────────────
  const messy = watches
    .map((w) => ({ w, flags: refIsMessy(w.reference) }))
    .filter((x) => x.flags.length > 0)
  const messyOnSite = messy.filter((x) => withPhoto.has(x.w.id))
  console.log('\n\n── 2. MESSY / LONG REFERENCES ──')
  console.log(`messy refs (whole catalog): ${messy.length}`)
  console.log(`messy refs on-site (photo): ${messyOnSite.length}`)
  console.log('\non-site messy refs:')
  for (const { w, flags } of messyOnSite.slice(0, 40)) {
    console.log(`  • ${w.brand} ${w.model}\n      ref="${w.reference}"  [${flags.join(', ')}]  id=${w.id}`)
  }

  // ── 3. LUG WIDTH ─────────────────────────────────────────────────────
  const noLug = watches.filter((w) => w.lug_width_mm == null)
  const noLugOnSite = onSite.filter((w) => w.lug_width_mm == null)
  const hasLugOnSite = onSite.length - noLugOnSite.length
  console.log('\n\n── 3. LUG WIDTH COVERAGE ──')
  console.log(`whole catalog missing lug_width_mm: ${noLug.length} / ${watches.length}`)
  console.log(`on-site (photo) missing lug_width_mm: ${noLugOnSite.length} / ${onSite.length}  (have it: ${hasLugOnSite})`)

  // brand breakdown of on-site missing lug
  const byBrand = new Map<string, number>()
  for (const w of noLugOnSite) byBrand.set(w.brand, (byBrand.get(w.brand) ?? 0) + 1)
  const brandSorted = [...byBrand.entries()].sort((a, b) => b[1] - a[1])
  console.log('\non-site missing-lug by brand (top 30):')
  for (const [b, n] of brandSorted.slice(0, 30)) console.log(`  ${String(n).padStart(4)}  ${b}`)

  // write full machine-readable report
  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      catalog: watches.length,
      withPhoto: withPhoto.size,
      onSiteRows: onSite.length,
    },
    dedupe: {
      groupsTotal: dupGroups.length,
      groupsOnSite: dupGroupsOnSite.length,
      groups: dupGroupsOnSite.map(([key, rows]) => ({
        key,
        rows: rows.map((r) => ({
          id: r.id, reference: r.reference, model: r.model, brand: r.brand,
          case_size_mm: r.case_size_mm, lug_width_mm: r.lug_width_mm,
          estimated_value: r.estimated_value, source: r.source, hasPhoto: withPhoto.has(r.id),
        })),
      })),
    },
    messyRefs: messy.map(({ w, flags }) => ({
      id: w.id, brand: w.brand, model: w.model, reference: w.reference,
      flags, hasPhoto: withPhoto.has(w.id),
    })),
    missingLug: {
      catalog: noLug.length,
      onSite: noLugOnSite.length,
      onSiteList: noLugOnSite.map((w) => ({
        id: w.id, brand: w.brand, model: w.model, reference: w.reference,
        case_size_mm: w.case_size_mm, watch_type: w.watch_type,
      })),
      onSiteByBrand: Object.fromEntries(brandSorted),
    },
  }
  const out = path.join(repoRoot, '.agents', 'catalog-cleanup-report.json')
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(report, null, 2))
  console.log(`\n\nFull report → ${out}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
