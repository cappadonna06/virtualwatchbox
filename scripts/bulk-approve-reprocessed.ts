/**
 * Bulk-approve every watch currently in status='needs_reprocess'.
 *
 * Use case: you flagged a batch, ran the processor manually (NOT via
 * run-reprocess-cycle.ts), eyeballed the new outputs in /admin/image-review,
 * and they all look fine. Click-through approving 30 cards is tedious; this
 * inserts a fresh status='approved' review row for each id in one shot.
 *
 * Required env:
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npm run images:bulk-approve                     # approve all needs_reprocess
 *   npm run images:bulk-approve -- --dry-run        # list, no write
 *   npm run images:bulk-approve -- --ids=a,b,c      # approve specific ids
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

async function getNeedsReprocessIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('watch_image_reviews')
    .select('catalog_watch_id, status, created_at')
    .eq('variant', 'primary')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`query: ${error.message}`)

  const latest = new Map<string, string>()
  for (const r of data ?? []) {
    if (!latest.has(r.catalog_watch_id as string)) {
      latest.set(r.catalog_watch_id as string, r.status as string)
    }
  }
  return [...latest.entries()]
    .filter(([, s]) => s === 'needs_reprocess')
    .map(([id]) => id)
    .sort()
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
    ids = await getNeedsReprocessIds(supabase)
    console.log(`[bulk-approve] ${ids.length} ids currently in status='needs_reprocess'`)
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
