/**
 * Bulk-approve watches. Default targets status='needs_reprocess' only —
 * the "I ran the processor manually, the new outputs look good, clear the
 * queue" workflow. With --include-pending also flips status='pending' (i.e.
 * never-reviewed watches), which is the "I went through all 2.9k cards and
 * everything not explicitly marked bad is GTG" workflow.
 *
 * Required env:
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npm run images:bulk-approve                       # approve all needs_reprocess
 *   npm run images:bulk-approve -- --include-pending  # also approve pending (never-reviewed)
 *   npm run images:bulk-approve -- --dry-run          # list, no write
 *   npm run images:bulk-approve -- --ids=a,b,c        # approve specific ids
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()

const ARGV = process.argv.slice(2)
function arg(name: string): string | undefined {
  const hit = ARGV.find(a => a === name || a.startsWith(`${name}=`))
  if (!hit) return undefined
  if (hit === name) return ARGV[ARGV.indexOf(hit) + 1]
  return hit.slice(name.length + 1)
}
const DRY_RUN = ARGV.includes('--dry-run')
const INCLUDE_PENDING = ARGV.includes('--include-pending')
const IDS_ARG = arg('--ids')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env')
  process.exit(1)
}

async function getTargetIds(supabase: SupabaseClient): Promise<string[]> {
  // Latest review per watch (sorted desc → take first per id).
  const PAGE = 1000
  const reviewRows: Array<Record<string, unknown>> = []
  for (let off = 0; ; off += PAGE) {
    const { data, error } = await supabase
      .from('watch_image_reviews')
      .select('catalog_watch_id, status, created_at')
      .eq('variant', 'primary')
      .order('created_at', { ascending: false })
      .range(off, off + PAGE - 1)
    if (error) throw new Error(`reviews query: ${error.message}`)
    if (!data || data.length === 0) break
    reviewRows.push(...(data as Array<Record<string, unknown>>))
    if (data.length < PAGE) break
  }
  const latest = new Map<string, string>()
  for (const r of reviewRows) {
    if (!latest.has(r.catalog_watch_id as string)) {
      latest.set(r.catalog_watch_id as string, r.status as string)
    }
  }

  // needs_reprocess is always in scope. pending (no review row at all) only
  // matters if --include-pending was passed.
  const needsReprocessIds = [...latest.entries()]
    .filter(([, s]) => s === 'needs_reprocess')
    .map(([id]) => id)

  if (!INCLUDE_PENDING) return needsReprocessIds.sort()

  // For "pending" we need the catalog of ids that HAVE an image but have no
  // review row yet (or whose latest is 'pending'). Pull the imaged-ids set
  // from watch_images.
  const imagedIds = new Set<string>()
  for (let off = 0; ; off += PAGE) {
    const { data, error } = await supabase
      .from('watch_images')
      .select('catalog_watch_id')
      .eq('variant', 'primary')
      .range(off, off + PAGE - 1)
    if (error) throw new Error(`watch_images query: ${error.message}`)
    if (!data || data.length === 0) break
    for (const r of data) imagedIds.add((r as { catalog_watch_id: string }).catalog_watch_id)
    if (data.length < PAGE) break
  }
  const pendingIds = [...imagedIds].filter(id => {
    const status = latest.get(id)
    return status === undefined || status === 'pending'
  })
  return [...new Set([...needsReprocessIds, ...pendingIds])].sort()
}

async function pickReviewerId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from('watch_image_reviews')
    .select('reviewer_id')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
  return (data?.[0]?.reviewer_id as string | undefined) ?? null
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let ids: string[]
  if (IDS_ARG) {
    ids = IDS_ARG.split(',').map(s => s.trim()).filter(Boolean)
    console.log(`[bulk-approve] explicit ${ids.length} ids passed via --ids`)
  } else {
    ids = await getTargetIds(supabase)
    const scope = INCLUDE_PENDING ? "'needs_reprocess' + 'pending' (imaged, never reviewed)" : "'needs_reprocess'"
    console.log(`[bulk-approve] ${ids.length} ids targeted (${scope})`)
  }

  if (ids.length === 0) {
    console.log('[bulk-approve] nothing to do.')
    return
  }
  for (const id of ids.slice(0, 30)) console.log(`  · ${id}`)
  if (ids.length > 30) console.log(`  · …and ${ids.length - 30} more`)

  if (DRY_RUN) {
    console.log('[bulk-approve] DRY_RUN — no writes')
    return
  }

  const reviewerId = await pickReviewerId(supabase)
  if (!reviewerId) {
    console.error('[bulk-approve] no admin reviewer_id available — aborting')
    process.exit(1)
  }

  const rows = ids.map(id => ({
    catalog_watch_id: id,
    variant: 'primary',
    status: 'approved',
    notes: 'bulk-approved via scripts/bulk-approve-reprocessed.ts',
    tags: [],
    reviewer_id: reviewerId,
  }))
  for (let i = 0; i < rows.length; i += 50) {
    const slice = rows.slice(i, i + 50)
    const { error } = await supabase.from('watch_image_reviews').insert(slice)
    if (error) {
      console.error(`[bulk-approve] insert chunk ${i / 50} failed: ${error.message}`)
      process.exit(1)
    }
  }
  console.log(`[bulk-approve] DONE. ${ids.length} reviews flipped to 'approved'.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
