/**
 * Sync watch_image_reviews.status='deleted' rows into
 * data/excluded-image-ids.json so the admin-tool "Wrong watch" button
 * actually takes effect on the next deploy.
 *
 * Pull rule:
 *   For each catalog_watch_id, take the latest review (max created_at).
 *   If status == 'deleted' → ensure it's in the JSON.
 *   If status flipped back to anything else → remove from the JSON.
 *
 * The JSON shape, preserved if the file already exists:
 *   {
 *     "description": "...",
 *     "ids": [
 *       { "id": "...", "reason": "...", "flaggedAt": "YYYY-MM-DD" },
 *       ...
 *     ]
 *   }
 *
 * Existing entries keep their reason+flaggedAt. New entries pick up the
 * latest review's `notes` (or a default) and today's date.
 *
 * Required env: SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL plus
 * SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:
 *   npm run images:sync-deletions               # write changes
 *   npm run images:sync-deletions -- --dry-run  # preview, no write
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()

const excludedJsonPath = path.join(repoRoot, 'data', 'excluded-image-ids.json')
const DEFAULT_DESCRIPTION =
  'Catalog watch ids whose processed image must NOT render in the UI or seed into watch_images. ' +
  "Source of truth synced from watch_image_reviews.status='deleted' via scripts/sync-image-deletions.ts. " +
  'Hand-edits are also fine — committed so production builds see them.'

const DRY_RUN = process.argv.includes('--dry-run')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL) {
  console.error('Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}
if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

type Entry = { id: string; reason: string; flaggedAt: string }
type ExcludedFile = { description?: string; ids: Entry[] }

function loadExisting(): ExcludedFile {
  if (!fs.existsSync(excludedJsonPath)) {
    return { description: DEFAULT_DESCRIPTION, ids: [] }
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(excludedJsonPath, 'utf8')) as Partial<ExcludedFile>
    return {
      description: parsed.description ?? DEFAULT_DESCRIPTION,
      ids: Array.isArray(parsed.ids) ? parsed.ids : [],
    }
  } catch (err) {
    console.error(`Failed to parse ${excludedJsonPath}: ${(err as Error).message}`)
    process.exit(1)
  }
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log('[sync-image-deletions] querying watch_image_reviews…')

  // PostgREST caps a single response at 1,000 rows, so page through.
  // With ~3,000 catalog watches and multiple reviews per watch over time,
  // a one-shot query silently truncates the older 'deleted' entries.
  const PAGE = 1000
  const rows: Array<Record<string, unknown>> = []
  for (let off = 0; ; off += PAGE) {
    const { data, error } = await supabase
      .from('watch_image_reviews')
      .select('catalog_watch_id, status, notes, created_at')
      .eq('variant', 'primary')
      .order('created_at', { ascending: false })
      .range(off, off + PAGE - 1)
    if (error) {
      console.error(`[sync-image-deletions] query failed: ${error.message}`)
      process.exit(1)
    }
    if (!data || data.length === 0) break
    rows.push(...(data as Array<Record<string, unknown>>))
    if (data.length < PAGE) break
  }

  // Pick latest review per watch (the query is already sorted desc).
  type Latest = { status: string; notes: string | null; created_at: string }
  const latestByWatch = new Map<string, Latest>()
  for (const row of rows) {
    if (!latestByWatch.has(row.catalog_watch_id as string)) {
      latestByWatch.set(row.catalog_watch_id as string, {
        status: row.status as string,
        notes: (row.notes as string | null) ?? null,
        created_at: row.created_at as string,
      })
    }
  }
  console.log(`[sync-image-deletions] ${latestByWatch.size} watches have at least one review`)

  const existing = loadExisting()
  const existingById = new Map(existing.ids.map(e => [e.id, e]))

  const today = new Date().toISOString().slice(0, 10)

  // Build the new id set: every id whose latest review status is 'deleted'.
  const desiredEntries: Entry[] = []
  for (const [id, latest] of latestByWatch) {
    if (latest.status !== 'deleted') continue
    const prior = existingById.get(id)
    desiredEntries.push({
      id,
      reason: prior?.reason ?? latest.notes ?? "flagged 'wrong watch' in admin tool",
      flaggedAt: prior?.flaggedAt ?? today,
    })
  }

  // Preserve hand-added entries that don't have any review row in Supabase
  // (e.g. someone edited the JSON manually). We only DROP entries that have a
  // review with a non-deleted latest status — i.e. the admin explicitly
  // un-flagged them.
  for (const prior of existing.ids) {
    if (desiredEntries.some(e => e.id === prior.id)) continue
    const latest = latestByWatch.get(prior.id)
    if (latest && latest.status !== 'deleted') {
      // skip — explicitly un-flagged in admin tool
      continue
    }
    // No review or stale state — keep the hand-added entry.
    desiredEntries.push(prior)
  }

  desiredEntries.sort((a, b) => a.id.localeCompare(b.id))

  // Diff for the report.
  const beforeSet = new Set(existing.ids.map(e => e.id))
  const afterSet = new Set(desiredEntries.map(e => e.id))
  const added = [...afterSet].filter(id => !beforeSet.has(id))
  const removed = [...beforeSet].filter(id => !afterSet.has(id))
  const unchanged = [...afterSet].filter(id => beforeSet.has(id))

  console.log(`[sync-image-deletions] before: ${existing.ids.length} entries`)
  console.log(`[sync-image-deletions] after:  ${desiredEntries.length} entries`)
  console.log(`  + added:     ${added.length}${added.length ? ` (${added.slice(0, 5).join(', ')}${added.length > 5 ? ', …' : ''})` : ''}`)
  console.log(`  − removed:   ${removed.length}${removed.length ? ` (${removed.slice(0, 5).join(', ')}${removed.length > 5 ? ', …' : ''})` : ''}`)
  console.log(`  · unchanged: ${unchanged.length}`)

  if (DRY_RUN) {
    console.log('[sync-image-deletions] DRY_RUN — no file written')
    return
  }

  if (added.length === 0 && removed.length === 0) {
    console.log('[sync-image-deletions] no changes — file unchanged')
    return
  }

  const newFile: ExcludedFile = {
    description: existing.description ?? DEFAULT_DESCRIPTION,
    ids: desiredEntries,
  }
  fs.writeFileSync(excludedJsonPath, JSON.stringify(newFile, null, 2) + '\n', 'utf8')
  console.log(`[sync-image-deletions] wrote ${path.relative(repoRoot, excludedJsonPath)}`)
  console.log(
    `\nNext: commit the file. ${removed.length ? 'Removed ids will start rendering their images again on next deploy. ' : ''}` +
    `Run \`npm run catalog:seed-full\` to also purge watch_images rows for the ${added.length ? added.length + ' added' : 'newly added'} ids.`,
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
