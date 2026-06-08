/**
 * Stage 1 APPLY: execute the dedupe plan from .agents/dedupe-plan.json.
 *
 * Per group (excluding CASE-SIZE-MISMATCH):
 *   1. back up the full loser row(s) to .agents/dedupe-deleted-backup.json
 *   2. UPDATE survivor with best-of fields it was missing (filledFrom)
 *   3. re-point restrict-FK dependents (watches, watch_states) survivor<-loser
 *   4. if survivor has no image but a loser does, re-point that image row
 *   5. re-point discover_events (soft ref)
 *   6. DELETE loser (cascades market, reviews, leftover images)
 *
 * DRY_RUN=1  → print every mutation, write nothing.
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/dedupe-apply.ts
 *   npx tsx scripts/dedupe-apply.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type Plan = {
  key: string
  verdict: string
  reasons: string[]
  survivor: { id: string; reference: string; model: string; hasPhoto: boolean }
  losers: { id: string; reference: string; model: string; hasPhoto: boolean }[]
  merged: Record<string, unknown>
  filledFrom: Record<string, string>
  imageAction: string
}

async function main() {
  const plan: Plan[] = JSON.parse(
    fs.readFileSync(path.join(repoRoot, '.agents', 'dedupe-plan.json'), 'utf8'),
  )
  // VERDICTS env selects which set to apply: AUTO (default), REVIEW, or ALL.
  const VERDICTS = (process.env.VERDICTS || 'AUTO').toUpperCase()
  const todo = plan.filter((p) => VERDICTS === 'ALL' || p.verdict === VERDICTS)
  const excluded = plan.filter((p) => !(VERDICTS === 'ALL' || p.verdict === VERDICTS))
  const suffix = VERDICTS === 'AUTO' ? '' : `-${VERDICTS.toLowerCase()}`

  console.log(`${DRY ? '🔍 DRY RUN' : '⚙️  APPLYING'} — ${todo.length} ${VERDICTS} groups (holding ${excluded.length})\n`)

  // Back up full loser rows before anything is deleted.
  const loserIds = todo.flatMap((p) => p.losers.map((l) => l.id))
  const backup: Record<string, unknown>[] = []
  for (let i = 0; i < loserIds.length; i += 300) {
    const { data } = await sb.from('catalog_watches').select('*').in('id', loserIds.slice(i, i + 300))
    backup.push(...(data ?? []))
  }
  if (!DRY) {
    fs.writeFileSync(path.join(repoRoot, '.agents', `dedupe-deleted-backup${suffix}.json`), JSON.stringify(backup, null, 2))
    console.log(`Backed up ${backup.length} loser rows → .agents/dedupe-deleted-backup${suffix}.json\n`)
  }

  let merged = 0, fieldsFilled = 0, imagesRepointed = 0, deleted = 0
  const failures: { key: string; error: string }[] = []
  const auditLog: string[] = []

  for (const p of todo) {
    try {
      const fields = Object.keys(p.filledFrom)
      if (fields.length && !DRY) {
        const patch: Record<string, unknown> = {}
        for (const f of fields) patch[f] = p.merged[f]
        const { error } = await sb.from('catalog_watches').update(patch).eq('id', p.survivor.id)
        if (error) throw new Error(`survivor update: ${error.message}`)
      }
      if (fields.length) {
        fieldsFilled += fields.length
        auditLog.push(`FILL ${p.survivor.id} <- ${fields.map((f) => `${f}=${JSON.stringify(p.merged[f])}(${p.filledFrom[f]})`).join(', ')}`)
      }

      for (const l of p.losers) {
        if (!DRY) {
          for (const [tbl, col] of [['watches', 'catalog_id'], ['watch_states', 'catalog_watch_id']] as const) {
            const { error } = await sb.from(tbl).update({ [col]: p.survivor.id }).eq(col, l.id)
            if (error) throw new Error(`repoint ${tbl}: ${error.message}`)
          }
        }
        if (p.imageAction.startsWith('repoint-image:') && p.imageAction.endsWith(l.id)) {
          if (!DRY) {
            const { error } = await sb.from('watch_images')
              .update({ catalog_watch_id: p.survivor.id }).eq('catalog_watch_id', l.id)
            if (error) throw new Error(`repoint image: ${error.message}`)
          }
          imagesRepointed++
          auditLog.push(`IMG  ${l.id} -> ${p.survivor.id}`)
        }
        if (!DRY) {
          await sb.from('discover_events').update({ catalog_watch_id: p.survivor.id }).eq('catalog_watch_id', l.id)
          const { error } = await sb.from('catalog_watches').delete().eq('id', l.id)
          if (error) throw new Error(`delete loser: ${error.message}`)
        }
        deleted++
        auditLog.push(`DEL  ${l.id}  (merged into ${p.survivor.id})`)
      }
      merged++
    } catch (e) {
      failures.push({ key: p.key, error: (e as Error).message })
    }
  }

  console.log('═══════════════ RESULT ═══════════════')
  console.log(`groups ${DRY ? 'would merge' : 'merged'}:   ${merged}`)
  console.log(`loser rows ${DRY ? 'would delete' : 'deleted'}: ${deleted}`)
  console.log(`fields back-filled on survivors: ${fieldsFilled}`)
  console.log(`images re-pointed to survivor:   ${imagesRepointed}`)
  console.log(`excluded (manual):               ${excluded.map((e) => e.key).join(', ') || 'none'}`)
  if (failures.length) {
    console.log(`\n⚠️  FAILURES (${failures.length}):`)
    for (const f of failures) console.log(`  ${f.key}: ${f.error}`)
  }
  if (!DRY) {
    fs.writeFileSync(path.join(repoRoot, '.agents', `dedupe-apply-log${suffix}.txt`), auditLog.join('\n'))
    console.log(`\nAudit log → .agents/dedupe-apply-log${suffix}.txt`)
  } else {
    console.log('\nSample of planned mutations:')
    console.log(auditLog.slice(0, 20).join('\n'))
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
