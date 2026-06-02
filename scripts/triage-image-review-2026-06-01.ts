/**
 * Triage for the 2026-06-01 manual image review (refs the user flagged from
 * the live /collection/add carousel).
 *
 * Unlike scripts/triage-rolex-image-review.ts, this script does NOT delete the
 * watch_images row — it only inserts a `watch_image_reviews` row with
 * status='needs_reprocess'. The intent is "flag for review, keep visible," so
 * the image still renders (and shows a ⚠ Flagged badge in /admin/catalog) until
 * a human approves, re-processes, or deletes it in /admin/image-review.
 *
 * Run:
 *   set -a && . ./.env.local && set +a
 *   DRY_RUN=1 npx tsx scripts/triage-image-review-2026-06-01.ts   # preview
 *   npx tsx scripts/triage-image-review-2026-06-01.ts             # apply
 *
 * Entries are keyed by the exact catalog_watch_id (already resolved), so the
 * ref→id ambiguity the older triage script handles isn't a concern here.
 *
 * NOT idempotent — each run inserts a fresh review row. Run once.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in env / .env.local')
  process.exit(1)
}

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type Entry = { id: string; tags: string[]; notes: string }

const FLAGGED: Entry[] = [
  {
    id: 'rolex-126710blnr',
    tags: ['wrong_orientation', 'aspect_ratio_off'],
    notes: 'GMT-Master II BLNR (Batman): image is rotated/diagonal and carries a "3285 CLEAN" replica-site watermark on the bracelet — wrong source. Reviewer 2026-06-01.',
  },
  {
    id: 'rolex-1655',
    tags: ['wrong_subject'],
    notes: 'Explorer II 1655: the image is a Panerai Luminor, not a Rolex Explorer II — wrong watch entirely. Delete + reacquire. Reviewer 2026-06-01.',
  },
  {
    id: 'rolex-336934-0002',
    tags: ['bracelet_truncated', 'bracelet_bottom'],
    notes: 'Sky-Dweller 336934-0002: bracelet clipped at the bottom with a detached/ghosted segment. Reviewer 2026-06-01.',
  },
  {
    id: 'rolex-16570',
    tags: ['wrong_subject_arm'],
    notes: 'Explorer II 16570: re-acquired image is still a wrist/arm shot, not a clean product shot. Reviewer 2026-06-01.',
  },
  {
    id: 'rolex-116589br',
    tags: ['wrong_orientation'],
    notes: 'Daytona 116589BR: watch shown sideways/diagonal — strap runs diagonally rather than vertically. Re-acquired image still not clean. Reviewer 2026-06-01.',
  },
]

async function main() {
  console.log(`[triage] ${DRY_RUN ? 'DRY RUN — nothing will change' : 'APPLYING to Supabase'}`)
  console.log(`[triage] ${FLAGGED.length} flagged ids → status=needs_reprocess (image kept)`)
  console.log('')

  let ok = 0
  let failed = 0
  for (const e of FLAGGED) {
    process.stdout.write(`  • ${e.id.padEnd(28)} [${e.tags.join(',')}] → `)

    // Confirm the catalog row + primary image exist before flagging.
    const { count } = await supabase
      .from('watch_images')
      .select('id', { count: 'exact', head: true })
      .eq('catalog_watch_id', e.id)
      .eq('variant', 'primary')
    if (!count) {
      console.log('⚠ no primary image found (skipping)')
      failed += 1
      continue
    }

    if (DRY_RUN) {
      console.log('would flag ✓')
      ok += 1
      continue
    }

    const { error } = await supabase.from('watch_image_reviews').insert({
      catalog_watch_id: e.id,
      variant: 'primary',
      status: 'needs_reprocess',
      tags: e.tags,
      notes: e.notes,
      reviewer_id: null,
    })
    if (error) {
      console.log(`❌ ${error.message}`)
      failed += 1
    } else {
      console.log('flagged ✓')
      ok += 1
    }
  }

  console.log('')
  console.log(`[triage] ${ok} ok, ${failed} skipped/failed`)
  if (!DRY_RUN && ok > 0) {
    console.log('[triage] These now appear in /admin/image-review (Needs reprocess) and as ⚠ Flagged in /admin/catalog.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
