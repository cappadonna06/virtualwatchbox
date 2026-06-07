/**
 * Dedupe `public.catalog_watches`: collapse rows that are the same physical
 * watch (same brand + normalized reference) into a single survivor, merging the
 * best data and repointing all references before deleting the loser.
 *
 * DRY RUN by default — set APPLY=1 (or --apply) to mutate. ALWAYS run dry-run
 * first, eyeball data/catalog-dedupe-actions.json, and snapshot these tables
 * before applying (cascade is destructive):
 *   catalog_watches, catalog_watch_market(+_history), watch_images,
 *   watch_image_reviews, watches, watch_states.
 *
 * Survivor = shortest/cleanest reference → has image → most complete → smallest id.
 * Merge = survivor-preferred, gaps filled from loser; arrays unioned;
 *   reference = survivor's aka-stripped reference;
 *   estimated_value via VALUE=survivor|max|loser (default survivor).
 * FK repoint loser→survivor BEFORE delete (watches.catalog_id and
 *   watch_states.catalog_watch_id are ON DELETE RESTRICT and will block a delete):
 *   - watches.catalog_id            → repoint (all rows preserved)
 *   - watch_states.catalog_watch_id → repoint, dedup on unique(user_id,catalog_watch_id,state)
 *   - discover_events.catalog_watch_id → repoint (no FK)
 *   - watch_images                  → keep survivor's; drop loser's
 *                                     (ADOPT_LOSER_IMAGE=1 → adopt loser's primary instead)
 *   - catalog_watch_market(+history)/reviews → cascade-deleted with the loser; heat recomputed after.
 *
 * Required env: SUPABASE_URL + SUPABASE_SECRET_KEY (or service role key).
 * Usage:  npm run catalog:dedupe        # dry run
 *         APPLY=1 npm run catalog:dedupe
 * After applying: prune deleted ids from data/catalog-enriched*.json, then
 *   npm run catalog:recompute-heat && npm run catalog:sync-heat
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const APPLY = process.env.APPLY === '1' || process.argv.includes('--apply')
const ADOPT_LOSER_IMAGE = process.env.ADOPT_LOSER_IMAGE === '1' || process.argv.includes('--adopt-loser-image')
const VALUE = (process.env.VALUE ?? 'survivor') as 'survivor' | 'max' | 'loser'

const AKA_RE = /\s*\(aka:\s*[^)]*\)\s*/gi
const normRef = (r: string | null | undefined) => (r ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase()
const cleanRef = (r: string | null | undefined) => (r ?? '').replace(AKA_RE, '').trim()
function fail(msg: string): never { console.error(`[dedupe] ${msg}`); process.exit(1) }

// Columns merged onto the survivor (allowlist — never includes id, source,
// timestamps, content_version, or the generated slug/search_text columns).
const SCALAR_COLS = [
  'case_size_mm', 'lug_width_mm', 'lug_to_lug_mm', 'thickness_mm', 'case_material', 'case_finish',
  'dial_color', 'dial_finish', 'marker_type', 'lume_color', 'movement', 'caliber', 'movement_type',
  'bracelet_type', 'clasp_type', 'bezel_material', 'bezel_type', 'crystal_material',
  'water_resistance_m', 'weight_g', 'power_reserve_hours', 'frequency_vph', 'jewel_count',
  'year_introduced', 'year_discontinued', 'production_status', 'limited_edition_count',
  'msrp_at_launch_usd', 'country_of_origin', 'gender_target', 'model_family', 'nickname',
  'watch_type', 'dial_color_hex', 'marker_color_hex', 'hand_color_hex',
  'lug_width_source', 'lug_width_confidence',
] as const
const ARRAY_COLS = ['complications', 'style_tags'] as const

const has = (v: unknown) => v != null && v !== '' && (typeof v !== 'number' || v !== 0)
function completeness(r: Record<string, unknown>) {
  return [...SCALAR_COLS, ...ARRAY_COLS].reduce((n, c) => n + (has(r[c]) || (Array.isArray(r[c]) && (r[c] as unknown[]).length) ? 1 : 0), 0)
}

async function pageAll(supabase: SupabaseClient, table: string, columns: string, idCol = 'id'): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = []
  const PAGE = 1000
  let offset = 0
  for (;;) {
    const { data, error } = await supabase.from(table).select(columns).order(idCol, { ascending: true }).range(offset, offset + PAGE - 1)
    if (error) fail(`${table} at ${offset}: ${error.message}`)
    const rows = (data ?? []) as unknown as Record<string, unknown>[]
    out.push(...rows)
    if (rows.length < PAGE) break
    offset += PAGE
  }
  return out
}

async function primaryImageIds(supabase: SupabaseClient): Promise<Set<string>> {
  const rows = await pageAll(supabase, 'watch_images', 'catalog_watch_id, variant', 'catalog_watch_id')
  return new Set(rows.filter(r => r.variant === 'primary').map(r => String(r.catalog_watch_id)))
}

function buildMerge(survivor: Record<string, unknown>, losers: Record<string, unknown>[]) {
  const payload: Record<string, unknown> = {}
  for (const c of SCALAR_COLS) {
    if (has(survivor[c])) { payload[c] = survivor[c]; continue }
    const fromLoser = losers.find(l => has(l[c]))
    if (fromLoser) payload[c] = fromLoser[c]
  }
  for (const c of ARRAY_COLS) {
    const set = new Map<string, unknown>()
    for (const row of [survivor, ...losers]) for (const v of (Array.isArray(row[c]) ? (row[c] as unknown[]) : [])) set.set(String(v).toLowerCase(), v)
    if (set.size) payload[c] = Array.from(set.values())
  }
  payload.reference = cleanRef(survivor.reference as string)
  const values = [survivor, ...losers].map(r => Number(r.estimated_value ?? 0))
  payload.estimated_value = VALUE === 'max' ? Math.max(...values) : VALUE === 'loser' ? (Number(losers[0]?.estimated_value ?? survivor.estimated_value ?? 0)) : Number(survivor.estimated_value ?? 0)
  return payload
}

async function repointLoser(supabase: SupabaseClient, loserId: string, survivorId: string, actions: string[]) {
  // watches.catalog_id (RESTRICT) — preserve every owned row.
  {
    const { error, count } = await supabase.from('watches').update({ catalog_id: survivorId }, { count: 'exact' }).eq('catalog_id', loserId)
    if (error) fail(`repoint watches ${loserId}: ${error.message}`)
    if (count) actions.push(`watches: repointed ${count}`)
  }
  // watch_states.catalog_watch_id (RESTRICT) — dedup on unique(user_id,catalog_watch_id,state).
  {
    const loserStates = await pageAll(supabase, 'watch_states', 'id, user_id, state, catalog_watch_id', 'id')
    const survStates = loserStates.filter(s => s.catalog_watch_id === survivorId)
    const have = new Set(survStates.map(s => `${s.user_id}|${s.state}`))
    for (const s of loserStates.filter(s => s.catalog_watch_id === loserId)) {
      const key = `${s.user_id}|${s.state}`
      if (have.has(key)) {
        const { error } = await supabase.from('watch_states').delete().eq('id', s.id as string)
        if (error) fail(`delete dup watch_state ${s.id as string}: ${error.message}`)
        actions.push(`watch_states: dropped dup ${key}`)
      } else {
        const { error } = await supabase.from('watch_states').update({ catalog_watch_id: survivorId }).eq('id', s.id as string)
        if (error) fail(`repoint watch_state ${s.id as string}: ${error.message}`)
        have.add(key)
        actions.push(`watch_states: repointed ${key}`)
      }
    }
  }
  // discover_events (no FK)
  {
    const { error } = await supabase.from('discover_events').update({ catalog_watch_id: survivorId }).eq('catalog_watch_id', loserId)
    if (error) console.warn(`[dedupe] discover_events repoint warn: ${error.message}`)
  }
  // watch_images — keep survivor's by default; cascade will clear loser's on delete.
  if (ADOPT_LOSER_IMAGE) {
    const { error: delErr } = await supabase.from('watch_images').delete().eq('catalog_watch_id', survivorId)
    if (delErr) fail(`drop survivor images: ${delErr.message}`)
    const { error: repErr } = await supabase.from('watch_images').update({ catalog_watch_id: survivorId }).eq('catalog_watch_id', loserId)
    if (repErr) fail(`adopt loser images: ${repErr.message}`)
    actions.push('watch_images: adopted loser image')
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) fail('SUPABASE_URL and SUPABASE_SECRET_KEY required')
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

  const catalog = await pageAll(supabase, 'catalog_watches', '*')
  const primaryIds = await primaryImageIds(supabase)
  const manifest = (JSON.parse(fs.readFileSync(path.join(repoRoot, 'public/watch-assets/processed/manifest.json'), 'utf8')) as Array<{ watchId: string }>).map(m => m.watchId)
  const manifestIds = new Set(manifest)
  const excludedPath = path.join(repoRoot, 'data/excluded-image-ids.json')
  const excluded = new Set((fs.existsSync(excludedPath) ? (JSON.parse(fs.readFileSync(excludedPath, 'utf8')).ids as Array<{ id: string }>) : []).map(x => x.id))
  const hasImage = (id: string) => primaryIds.has(id) || (manifestIds.has(id) && !excluded.has(id))

  const clusters = new Map<string, Record<string, unknown>[]>()
  for (const r of catalog) {
    const nr = normRef(r.reference as string)
    if (!nr) continue
    const key = `${String(r.brand ?? '').toLowerCase()}|${nr}`
    if (!clusters.has(key)) clusters.set(key, [])
    clusters.get(key)!.push(r)
  }
  const dups = Array.from(clusters.values()).filter(g => g.length > 1)
  console.log(`[dedupe] ${dups.length} duplicate cluster(s) · VALUE=${VALUE} · ADOPT_LOSER_IMAGE=${ADOPT_LOSER_IMAGE}`)

  const actionLog: unknown[] = []
  for (const group of dups) {
    const survivor = [...group].sort((a, b) =>
      (String(a.reference).length - String(b.reference).length) ||
      (Number(hasImage(b.id as string)) - Number(hasImage(a.id as string))) ||
      (completeness(b) - completeness(a)) ||
      String(a.id).localeCompare(String(b.id)),
    )[0]
    const losers = group.filter(r => r.id !== survivor.id)
    const merge = buildMerge(survivor, losers)
    const actions: string[] = []

    console.log(`\n  ${survivor.brand} keep ${survivor.id} ("${merge.reference}") ⟵ drop ${losers.map(l => l.id).join(', ')}`)

    if (APPLY) {
      for (const loser of losers) await repointLoser(supabase, loser.id as string, survivor.id as string, actions)
      const { error: upErr } = await supabase.from('catalog_watches').update(merge).eq('id', survivor.id as string)
      if (upErr) fail(`update survivor ${survivor.id as string}: ${upErr.message}`)
      for (const loser of losers) {
        const { error: delErr } = await supabase.from('catalog_watches').delete().eq('id', loser.id as string)
        if (delErr) fail(`delete loser ${loser.id as string}: ${delErr.message}`)
      }
    }
    actionLog.push({ survivorId: survivor.id, loserIds: losers.map(l => l.id), mergedReference: merge.reference, estimatedValue: merge.estimated_value, repoint: actions })
  }

  fs.writeFileSync(path.join(repoRoot, 'data', 'catalog-dedupe-actions.json'), JSON.stringify({ generatedAt: new Date().toISOString(), applied: APPLY, value: VALUE, clusters: actionLog }, null, 2))
  console.log(`\n[dedupe] wrote data/catalog-dedupe-actions.json`)
  if (!APPLY) console.log('[dedupe] DRY RUN — no writes. Snapshot tables, review the actions file, then APPLY=1.')
  else console.log('[dedupe] applied. Next: prune deleted ids from data/catalog-enriched*.json, then catalog:recompute-heat && catalog:sync-heat')
}

main().catch(err => { console.error('[dedupe] fatal:', err); process.exit(1) })
