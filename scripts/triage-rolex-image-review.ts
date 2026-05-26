/**
 * Triage script for the 2026-05-24 Rolex image quality review.
 *
 * Reads a hard-coded list of refs the user flagged in
 * `~/Downloads/Watch image reviewe- rolex.docx` and:
 *   1. Resolves each ref to a catalog_watch_id (case-insensitive).
 *   2. Inserts a `watch_image_reviews` row with status='deleted',
 *      free-form tags describing the failure mode, and the reviewer
 *      notes. Uses the Supabase service-role key (no admin auth needed).
 *   3. Deletes the corresponding `watch_images` row so the bad image stops
 *      rendering on the catalog immediately.
 *   4. For the rolex-116400 ↔ rolex-116400-0001 true-duplicate pair,
 *      ALSO deletes the catalog_watches row and prints the seed-CSV line
 *      to remove (so the next seed-from-enriched run won't re-create it).
 *   5. Prints a per-ref outcome table.
 *
 * Run order:
 *
 *   DRY_RUN=1 npx tsx scripts/triage-rolex-image-review.ts
 *   npx tsx scripts/triage-rolex-image-review.ts          # apply
 *   npm run images:sync-deletions                          # fold into excluded-image-ids.json
 *   npm run images:acquire -- --ref-list=/tmp/triage-rolex-acquire.csv --top=50
 *                                                          # re-fetch source images for the deleted set
 *
 * Tags written here are not in the API's ALLOWED_TAGS whitelist — by design.
 * The whitelist gates the manual TagPicker UI; the DB column is text[] and
 * accepts any value. Workstream B will add these tags to the UI allowlist
 * alongside the auto-screener.
 */
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { repoRoot } from './watch-image-pipeline'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in env / .env.local')
  process.exit(1)
}

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type TriageEntry = {
  ref: string
  tags: string[]
  notes: string
  // If set, also delete the catalog_watches row itself (not just the image).
  // Use for true duplicates where the row should never exist.
  deleteCatalogRow?: boolean
}

const FLAGGED: TriageEntry[] = [
  {
    ref: '116400GV',
    tags: ['bad_cutout', 'halo'],
    notes: 'Milgauss Z-Blue: processed image has a rough rectangular frame artifact in the top-left corner. Reviewer 2026-05-24.',
  },
  {
    ref: '16713',
    tags: ['edge_clipped', 'bracelet_bottom', 'case'],
    notes: 'GMT-Master 16713: bracelet truncated at the bottom and case lugs cut off in the cutout. Reviewer 2026-05-24.',
  },
  {
    ref: '16570',
    tags: ['wrong_subject_arm'],
    notes: 'Explorer II 16570: the image is of an arm wearing a different (smaller, vintage-style) watch, not a 16570 product shot. Delete + reacquire. Reviewer 2026-05-24.',
  },
  {
    ref: '116589br',
    tags: ['wrong_orientation'],
    notes: 'Daytona 116589BR: image displayed rotated. Reviewer 2026-05-24.',
  },
  {
    ref: '116680-0001',
    tags: ['wrong_orientation'],
    notes: 'Yacht-Master II 116680-0001: image displayed rotated. Reviewer 2026-05-24.',
  },
  {
    ref: '116618lb-0002',
    tags: ['wrong_orientation'],
    notes: 'Submariner 116618LB-0002 (yellow gold, blue): image displayed rotated. Reviewer 2026-05-24.',
  },
  {
    ref: '116619lb-0002',
    tags: ['wrong_orientation'],
    notes: 'Submariner 116619LB-0002 (white gold, blue): image displayed rotated. Reviewer 2026-05-24.',
  },
  {
    ref: '14060M-0001',
    tags: ['edge_clipped', 'bracelet_bottom'],
    notes: 'Submariner 14060M-0001: bottom of bracelet ghosted/missing in cutout. Reviewer 2026-05-24.',
  },
  {
    ref: '16610 Comex',
    tags: ['edge_clipped', 'bracelet_bottom', 'wrong_orientation'],
    notes: 'Submariner 16610 Comex: bracelet truncated AND image rotated. Reviewer 2026-05-24.',
  },
  {
    ref: '16610 Panama Canal',
    tags: ['edge_clipped', 'bracelet_bottom'],
    notes: 'Submariner 16610 Panama Canal: bottom of bracelet missing in cutout. Reviewer 2026-05-24.',
  },
  {
    ref: '16610LV MK4',
    tags: ['multi_object'],
    notes: 'Submariner 16610LV MK4: a second ghost watch (Hulk?) visible behind the primary watch in the processed image. Reviewer 2026-05-24.',
  },
  {
    ref: '16610LV MK5',
    tags: ['wrong_subject_box'],
    notes: 'Submariner 16610LV MK5: image is of the watch sitting inside an open display box, not a clean product shot. Reviewer 2026-05-24.',
  },
  {
    ref: '16613 Black Superluminova',
    tags: ['wrong_subject_box', 'wrong_orientation'],
    notes: 'Submariner 16613 Black Superluminova: watch sitting on top of a box AND rotated. Reviewer 2026-05-24.',
  },
  {
    ref: '1019-001',
    tags: ['partial_crop', 'case', 'bracelet_bottom'],
    notes: 'Milgauss 1019-001: cutout shows only the dial — case and bracelet truncated. Reviewer 2026-05-24.',
  },
  {
    ref: '116622-0002',
    tags: ['wrong_orientation'],
    notes: 'Yacht-Master 116622-0002: image displayed rotated. Reviewer 2026-05-24.',
  },
  {
    ref: '16700-0001',
    tags: ['multi_watch'],
    notes: 'GMT-Master 16700-0001: two watches side-by-side in a single image. Reviewer 2026-05-24.',
  },
  {
    ref: '214270-0001',
    tags: ['wrong_orientation'],
    notes: 'Explorer 214270-0001: image displayed rotated. Reviewer 2026-05-24.',
  },
  // Workstream C — true-duplicate row. Both 116400 and 116400-0001 are the
  // same Rolex Milgauss Black 40mm. Keep -0001 (Rolex's canonical suffix);
  // delete the shorter id (thewatchapi:ref-list artifact).
  {
    ref: '116400',
    tags: ['true_duplicate'],
    notes: 'TRUE DUPLICATE of rolex-116400-0001 (same Milgauss Black 40mm, same image). Keep -0001 (canonical Rolex suffix form). Reviewer 2026-05-24.',
    deleteCatalogRow: true,
  },
]

type Outcome = {
  ref: string
  catalogWatchId: string | null
  imageDeleted: boolean
  catalogRowDeleted: boolean
  reviewInserted: boolean
  error: string | null
}

async function resolveCatalogWatchId(ref: string): Promise<string | null> {
  // Case-insensitive, brand-restricted match on the reference column.
  const { data, error } = await supabase
    .from('catalog_watches')
    .select('id, reference')
    .eq('brand', 'Rolex')
    .ilike('reference', ref)
  if (error) {
    console.error(`  [resolve] ${ref}: ${error.message}`)
    return null
  }
  if (!data || data.length === 0) return null
  if (data.length > 1) {
    console.warn(`  [resolve] ${ref}: ${data.length} matches, using first (${data[0].id})`)
  }
  return data[0].id as string
}

async function processOne(entry: TriageEntry): Promise<Outcome> {
  const out: Outcome = {
    ref: entry.ref,
    catalogWatchId: null,
    imageDeleted: false,
    catalogRowDeleted: false,
    reviewInserted: false,
    error: null,
  }

  const id = await resolveCatalogWatchId(entry.ref)
  if (!id) {
    out.error = 'not found in catalog'
    return out
  }
  out.catalogWatchId = id

  if (DRY_RUN) {
    out.reviewInserted = true
    out.imageDeleted = true
    if (entry.deleteCatalogRow) out.catalogRowDeleted = true
    return out
  }

  // 1. Insert review row first — preserves the audit trail even if the
  //    subsequent delete fails.
  const { error: insertErr } = await supabase
    .from('watch_image_reviews')
    .insert({
      catalog_watch_id: id,
      variant: 'primary',
      status: 'deleted',
      tags: entry.tags,
      notes: entry.notes,
      reviewer_id: null,
    })
  if (insertErr) {
    out.error = `review insert: ${insertErr.message}`
    return out
  }
  out.reviewInserted = true

  // 2. Delete the watch_images row so the bad image stops rendering.
  const { error: imgDelErr } = await supabase
    .from('watch_images')
    .delete()
    .eq('catalog_watch_id', id)
    .eq('variant', 'primary')
  if (imgDelErr) {
    out.error = `watch_images delete: ${imgDelErr.message}`
    return out
  }
  out.imageDeleted = true

  // 3. For true duplicates, also delete the catalog row itself.
  if (entry.deleteCatalogRow) {
    const { error: rowDelErr } = await supabase
      .from('catalog_watches')
      .delete()
      .eq('id', id)
    if (rowDelErr) {
      out.error = `catalog_watches delete: ${rowDelErr.message}`
      return out
    }
    out.catalogRowDeleted = true
  }

  return out
}

async function main() {
  console.log(`[triage] ${DRY_RUN ? 'DRY RUN — nothing will change' : 'APPLYING changes to Supabase'}`)
  console.log(`[triage] ${FLAGGED.length} flagged refs`)
  console.log('')

  const outcomes: Outcome[] = []
  for (const entry of FLAGGED) {
    process.stdout.write(`  • ${entry.ref.padEnd(30)} → `)
    const o = await processOne(entry)
    outcomes.push(o)
    if (o.error) {
      console.log(`❌ ${o.error}`)
    } else if (o.catalogRowDeleted) {
      console.log(`✅ ${o.catalogWatchId}  (review + image + CATALOG ROW deleted)`)
    } else {
      console.log(`✅ ${o.catalogWatchId}  (review + image deleted)`)
    }
  }

  console.log('')
  const ok = outcomes.filter(o => !o.error)
  const failed = outcomes.filter(o => o.error)
  console.log(`[triage] ${ok.length} OK, ${failed.length} failed`)

  if (failed.length > 0) {
    console.log('')
    console.log('Failed entries:')
    for (const f of failed) console.log(`  ✗ ${f.ref} — ${f.error}`)
  }

  // Write the ref-list CSV that --ref-list= consumes for re-acquisition.
  const acquireIds = ok
    .filter(o => o.catalogWatchId && !o.catalogRowDeleted) // skip the duplicate
    .map(o => o.catalogWatchId as string)
  const acquireCsvPath = '/tmp/triage-rolex-acquire.csv'
  if (!DRY_RUN && acquireIds.length > 0) {
    fs.writeFileSync(
      acquireCsvPath,
      'id\n' + acquireIds.join('\n') + '\n',
      'utf8',
    )
    console.log('')
    console.log(`[triage] wrote ${acquireIds.length} ids to ${acquireCsvPath}`)
    console.log('[triage] Next steps:')
    console.log(`  npm run images:sync-deletions`)
    console.log(`  npm run images:acquire -- --ref-list=${acquireCsvPath} --top=${acquireIds.length} --overwrite`)
    console.log(`  npm run images:process`)
    console.log(`  npm run images:upload-storage`)
    console.log(`  # bump IMAGE_VERSION in lib/watchImages/cacheBust.ts`)
  }

  // Reminder about the seed CSV for the dropped duplicate row.
  const droppedRow = outcomes.find(o => o.catalogRowDeleted)
  if (droppedRow && !DRY_RUN) {
    const seedCsvPath = path.join(repoRoot, 'data', 'catalog-seed-full.csv')
    console.log('')
    console.log(`[triage] Don't forget to remove the dropped row from ${path.relative(repoRoot, seedCsvPath)}:`)
    console.log(`  sed -i.bak '/^${droppedRow.catalogWatchId},/d' ${seedCsvPath}`)
  }

  // Surface the manual-review item not covered automatically.
  console.log('')
  console.log('[triage] Manual review needed (NOT auto-handled):')
  console.log('  • One Daytona shown in the docx as rose-gold appears to be labelled')
  console.log('    "Ref. 116519LN", but that ref is not in our catalog. The image is')
  console.log('    likely associated with a 116515-family (Everose) ref. Inspect the')
  console.log('    Daytona Everose entries in /admin/image-review and flag manually.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
