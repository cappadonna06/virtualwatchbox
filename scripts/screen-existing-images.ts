/**
 * Screen-existing-images — one-off sweep over every processed PNG in
 * public/watch-assets/processed/, running the rules screener and (optionally)
 * the LLM vision screener over each. Reports failures grouped by mode.
 *
 * Usage:
 *   # dry-run, rules only, full catalog
 *   npx tsx scripts/screen-existing-images.ts
 *
 *   # dry-run, rules + LLM (best for finding wrong-subject failures)
 *   npx tsx scripts/screen-existing-images.ts --llm
 *
 *   # apply: write watch_image_reviews rows for failures
 *   npx tsx scripts/screen-existing-images.ts --llm --apply
 *
 *   # subset
 *   npx tsx scripts/screen-existing-images.ts --ids=rolex-116610ln,rolex-126610lv --llm
 *   npx tsx scripts/screen-existing-images.ts --limit=200
 *
 * Cost:
 *   - Rules only: free (local computation, ~50 ms / image)
 *   - With LLM: ~$0.001 / image → $7 for a full ~7k-image catalog at gpt-4o-mini
 *
 * Output:
 *   - Console summary by failure mode
 *   - JSON report at /tmp/screen-results.json
 *   - With --apply: watch_image_reviews rows with status='needs_reprocess' or
 *     'deleted' depending on screener recommendation. Run
 *     `npm run images:sync-deletions` afterward to fold 'deleted' into
 *     excluded-image-ids.json.
 */
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { repoRoot } from './watch-image-pipeline'
import { screenProcessedImage, type ScreenerResult } from '../lib/imageProcessing/screener'
import { llmScreenImage, estimateCostUsd, type LlmScreenerResult } from '../lib/imageProcessing/llmScreener'

const ARGV = process.argv.slice(2)
function arg(name: string): string | undefined {
  const hit = ARGV.find(a => a === name || a.startsWith(name + '='))
  if (!hit) return undefined
  if (hit === name) return ARGV[ARGV.indexOf(hit) + 1]
  return hit.slice(name.length + 1)
}
function hasFlag(name: string): boolean {
  return ARGV.includes(name)
}

const APPLY = hasFlag('--apply')
const USE_LLM = hasFlag('--llm')
const LIMIT = Number(arg('--limit') ?? 0)
const ONLY_IDS = arg('--ids')
const LLM_CONCURRENCY = Number(arg('--concurrency') ?? 4)
const REPORT_PATH = arg('--report') ?? '/tmp/screen-results.json'
const SHOW_HELP = hasFlag('--help') || hasFlag('-h')

if (SHOW_HELP) {
  console.log('See top-of-file comment for usage.')
  process.exit(0)
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (APPLY && (!SUPABASE_URL || !SUPABASE_KEY)) {
  console.error('--apply requires SUPABASE_URL + SUPABASE_SECRET_KEY in env (.env.local)')
  process.exit(1)
}

const supabase = APPLY
  ? createClient(SUPABASE_URL!, SUPABASE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  : null

type SweepEntry = {
  catalogWatchId: string
  filename: string
  filePath: string
  rules: ScreenerResult
  llm?: LlmScreenerResult
  finalTags: string[]
  finalStatus: 'approved' | 'needs_reprocess' | 'deleted'
  error?: string
}

async function main() {
  const processedDir = path.join(repoRoot, 'public', 'watch-assets', 'processed')
  if (!fs.existsSync(processedDir)) {
    console.error(`processed dir not found: ${processedDir}`)
    process.exit(1)
  }

  const allPngs = fs.readdirSync(processedDir)
    .filter(f => f.endsWith('.png'))
    .sort()

  console.log(`[screen] ${allPngs.length} processed PNGs in ${path.relative(repoRoot, processedDir)}/`)

  let targets = allPngs
  if (ONLY_IDS) {
    const idSet = new Set(ONLY_IDS.split(',').map(s => s.trim()).filter(Boolean))
    targets = targets.filter(f => idSet.has(f.replace(/\.png$/, '')))
    console.log(`[screen] filtered to ${targets.length} by --ids`)
  }
  if (LIMIT > 0 && targets.length > LIMIT) {
    targets = targets.slice(0, LIMIT)
    console.log(`[screen] limited to ${targets.length} by --limit`)
  }

  console.log(`[screen] mode: rules${USE_LLM ? ' + LLM' : ''}, ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log('')

  // Stage 1 — rules pass. Fast, local. Collect rule failures + the set of
  // images that PASS rules (which become candidates for the LLM stage).
  const entries: SweepEntry[] = []
  let ruleFailCount = 0
  for (let i = 0; i < targets.length; i += 1) {
    const filename = targets[i]
    const catalogWatchId = filename.replace(/\.png$/, '')
    const filePath = path.join(processedDir, filename)
    let rules: ScreenerResult
    try {
      const buf = fs.readFileSync(filePath)
      rules = await screenProcessedImage(buf)
    } catch (err) {
      entries.push({
        catalogWatchId, filename, filePath,
        rules: { metrics: {} as never, tags: [], severity: 'ok', recommendedStatus: 'approved', reasons: [] },
        finalTags: [],
        finalStatus: 'approved',
        error: (err as Error).message,
      })
      continue
    }

    if (rules.tags.length > 0) ruleFailCount += 1

    entries.push({
      catalogWatchId, filename, filePath,
      rules,
      finalTags: [...rules.tags],
      finalStatus: rules.recommendedStatus,
    })

    if ((i + 1) % 250 === 0) {
      console.log(`[screen] rules: ${i + 1}/${targets.length} (${ruleFailCount} flagged so far)`)
    }
  }
  console.log(`[screen] rules complete: ${ruleFailCount}/${targets.length} flagged`)
  console.log('')

  // Stage 2 — LLM, only on entries that passed rules (no point double-flagging).
  // Concurrency-limited to avoid overwhelming the API.
  if (USE_LLM) {
    const llmCandidates = entries.filter(e => !e.error && e.rules.tags.length === 0)
    console.log(`[screen] LLM stage: screening ${llmCandidates.length} images that passed rules…`)
    let totalIn = 0, totalOut = 0, llmFlagged = 0, llmErrored = 0

    let cursor = 0
    async function worker() {
      while (true) {
        const i = cursor; cursor += 1
        if (i >= llmCandidates.length) return
        const entry = llmCandidates[i]
        try {
          const buf = fs.readFileSync(entry.filePath)
          const llm = await llmScreenImage(buf)
          entry.llm = llm
          totalIn += llm.tokensIn
          totalOut += llm.tokensOut
          if (!llm.isClean) {
            llmFlagged += 1
            entry.finalTags.push(...llm.tags)
            // LLM-only flags are always "wrong subject" types → recommend deleted
            entry.finalStatus = 'deleted'
          }
        } catch (err) {
          llmErrored += 1
          entry.error = `llm: ${(err as Error).message}`
        }
        if (i > 0 && i % 100 === 0) {
          const cost = estimateCostUsd(totalIn, totalOut)
          console.log(`[screen] LLM: ${i + 1}/${llmCandidates.length} (${llmFlagged} flagged, ${llmErrored} errors, $${cost.toFixed(3)})`)
        }
      }
    }

    await Promise.all(Array.from({ length: Math.max(1, LLM_CONCURRENCY) }, () => worker()))

    const cost = estimateCostUsd(totalIn, totalOut)
    console.log(`[screen] LLM complete: ${llmFlagged}/${llmCandidates.length} flagged, ${llmErrored} errors, total cost ≈ $${cost.toFixed(3)}`)
    console.log('')
  }

  // Summary by tag
  const byTag: Map<string, number> = new Map()
  let failTotal = 0
  for (const e of entries) {
    if (e.finalTags.length === 0) continue
    failTotal += 1
    for (const t of e.finalTags) byTag.set(t, (byTag.get(t) ?? 0) + 1)
  }
  console.log(`[screen] === SUMMARY ===`)
  console.log(`[screen] total flagged: ${failTotal}/${entries.length}`)
  console.log(`[screen] by tag:`)
  for (const [t, n] of [...byTag.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${t.padEnd(25)} ${n}`)
  }
  console.log('')

  // Dump JSON report
  const report = entries.map(e => ({
    catalog_watch_id: e.catalogWatchId,
    rules: { tags: e.rules.tags, reasons: e.rules.reasons, metrics: e.rules.metrics },
    llm: e.llm ? { tags: e.llm.tags, reason: e.llm.reason, isClean: e.llm.isClean } : null,
    final_tags: e.finalTags,
    final_status: e.finalStatus,
    error: e.error ?? null,
  }))
  fs.writeFileSync(REPORT_PATH, JSON.stringify({ generated_at: new Date().toISOString(), entries: report }, null, 2))
  console.log(`[screen] full report → ${REPORT_PATH}`)
  console.log('')

  if (!APPLY) {
    console.log(`[screen] DRY-RUN: no rows written. Re-run with --apply to write watch_image_reviews rows.`)
    return
  }

  // Apply: insert review rows for everything flagged
  const toApply = entries.filter(e => e.finalTags.length > 0 && !e.error)
  console.log(`[screen] applying ${toApply.length} review rows to Supabase…`)
  let applied = 0, applyErr = 0
  for (const e of toApply) {
    const notes = [
      ...(e.rules.reasons.length ? e.rules.reasons.map(r => `[rule] ${r}`) : []),
      ...(e.llm && !e.llm.isClean ? [`[llm] ${e.llm.reason}`] : []),
    ].join(' | ').slice(0, 1000)

    const { error } = await supabase!.from('watch_image_reviews').insert({
      catalog_watch_id: e.catalogWatchId,
      variant: 'primary',
      status: e.finalStatus,
      tags: e.finalTags,
      notes: `[auto-screener] ${notes}`,
      reviewer_id: null,
    })
    if (error) {
      console.warn(`  ✗ ${e.catalogWatchId}: ${error.message}`)
      applyErr += 1
    } else {
      applied += 1
    }
  }
  console.log(`[screen] applied: ${applied}/${toApply.length} (${applyErr} errors)`)

  if (toApply.some(e => e.finalStatus === 'deleted')) {
    console.log('')
    console.log(`[screen] NEXT: run \`npm run images:sync-deletions\` to fold 'deleted' reviews into excluded-image-ids.json`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
