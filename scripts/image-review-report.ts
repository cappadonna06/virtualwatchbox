/**
 * One-shot reporter for watch_image_reviews. Pulls every review row, keeps
 * the latest per (catalog_watch_id, variant), joins catalog_watches for
 * brand/model display, and prints a stdout summary:
 *
 *   1. Status counts
 *   2. Tag distribution (across the latest review of each watch)
 *   3. Notes — full list of (id, status, tags, note text) for any reviewed
 *      row that has a non-empty note
 *   4. Full reviewed list (latest review per watch) — one row per line
 *
 * Run with:
 *   npx tsx scripts/image-review-report.ts
 *   npx tsx scripts/image-review-report.ts --status=needs_reprocess
 *   npx tsx scripts/image-review-report.ts --json   (machine-readable)
 */

import { createClient } from '@supabase/supabase-js'
import { loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY/SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const ARGV = process.argv.slice(2)
const STATUS_FILTER = (ARGV.find(a => a.startsWith('--status='))?.slice('--status='.length)) ?? null
const AS_JSON = ARGV.includes('--json')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type ReviewRow = {
  catalog_watch_id: string
  variant: string
  status: string
  notes: string | null
  tags: string[] | null
  created_at: string
}

type CatalogRow = { id: string; brand: string | null; model: string | null; reference: string | null }

async function main() {
  const reviewsQ = await supabase
    .from('watch_image_reviews')
    .select('catalog_watch_id, variant, status, notes, tags, created_at')
    .order('created_at', { ascending: false })

  if (reviewsQ.error) {
    console.error('Query failed:', reviewsQ.error.message)
    process.exit(1)
  }

  const allReviews = (reviewsQ.data ?? []) as ReviewRow[]
  const latest = new Map<string, ReviewRow>()
  for (const r of allReviews) {
    const key = `${r.catalog_watch_id}::${r.variant}`
    if (!latest.has(key)) latest.set(key, r)
  }

  const watchIds = Array.from(new Set(Array.from(latest.values()).map(r => r.catalog_watch_id)))
  const catalogQ = watchIds.length
    ? await supabase
        .from('catalog_watches')
        .select('id, brand, model, reference')
        .in('id', watchIds)
    : { data: [] as CatalogRow[], error: null }

  if (catalogQ.error) {
    console.error('Catalog query failed:', catalogQ.error.message)
    process.exit(1)
  }
  const catalog = new Map<string, CatalogRow>()
  for (const c of (catalogQ.data ?? []) as CatalogRow[]) catalog.set(c.id, c)

  const rows = Array.from(latest.values())
    .filter(r => !STATUS_FILTER || r.status === STATUS_FILTER)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  if (AS_JSON) {
    process.stdout.write(JSON.stringify({
      total_reviews_recorded: allReviews.length,
      latest_reviewed_watches: latest.size,
      rows: rows.map(r => ({
        ...r,
        ...catalog.get(r.catalog_watch_id),
      })),
    }, null, 2))
    return
  }

  // ── Summary ────────────────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {}
  const tagCounts: Record<string, number> = {}
  let withNotes = 0
  for (const r of latest.values()) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1
    for (const t of r.tags ?? []) tagCounts[t] = (tagCounts[t] ?? 0) + 1
    if (r.notes && r.notes.trim().length > 0) withNotes += 1
  }

  console.log('═══ Image Review Report ═══')
  console.log(`Total review rows (incl. supersedes): ${allReviews.length}`)
  console.log(`Distinct watches reviewed:            ${latest.size}`)
  console.log(`Watches with notes:                   ${withNotes}`)
  console.log('')
  console.log('── Status (latest per watch) ──')
  for (const [s, n] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s.padEnd(18)} ${String(n).padStart(4)}`)
  }
  console.log('')
  console.log('── Tag distribution ──')
  if (Object.keys(tagCounts).length === 0) {
    console.log('  (no tags applied yet)')
  } else {
    for (const [t, n] of Object.entries(tagCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${t.padEnd(18)} ${String(n).padStart(4)}`)
    }
  }

  // ── Notes ──────────────────────────────────────────────────────────────
  const noteRows = rows.filter(r => r.notes && r.notes.trim().length > 0)
  if (noteRows.length > 0) {
    console.log('')
    console.log('── Notes ──')
    for (const r of noteRows) {
      const c = catalog.get(r.catalog_watch_id)
      const display = c ? `${c.brand ?? '?'} ${c.model ?? ''} (${r.catalog_watch_id})` : r.catalog_watch_id
      console.log(`• [${r.status}] ${display}`)
      console.log(`  tags: ${(r.tags ?? []).join(', ') || '—'}`)
      console.log(`  note: ${r.notes}`)
    }
  }

  // ── Full table ─────────────────────────────────────────────────────────
  console.log('')
  console.log(`── ${STATUS_FILTER ? `Latest "${STATUS_FILTER}"` : 'Latest reviews (all)'} (${rows.length}) ──`)
  console.log('status              tags                                          watch')
  console.log('─'.repeat(110))
  for (const r of rows) {
    const c = catalog.get(r.catalog_watch_id)
    const display = c ? `${(c.brand ?? '?').padEnd(16)} ${(c.model ?? '').padEnd(30)} ${r.catalog_watch_id}` : r.catalog_watch_id
    const tags = (r.tags ?? []).join(',') || '—'
    console.log(`${r.status.padEnd(18)}  ${tags.padEnd(44)}  ${display}`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
