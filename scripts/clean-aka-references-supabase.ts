/**
 * Strip " (aka: …)" pollution from `public.catalog_watches.reference` in
 * Supabase (the live mirror of scripts/clean-aka-references.ts, which only
 * cleans the CSV seed). Nickname-worthy aka tokens (anything with a letter —
 * "James Bond", "Spectre", "007") are rescued into data/catalog-nicknames.json
 * keyed by {brand, cleaned reference} so they survive the cleanup and get
 * re-applied by `catalog:enrich-nicknames`. All-digit barcode tokens are dropped.
 *
 * `search_text` and `slug` are STORED generated columns, so they auto-update
 * when `reference` changes — no extra write needed.
 *
 * Required env: SUPABASE_URL + SUPABASE_SECRET_KEY (or service role key).
 *
 * Usage:
 *   npm run catalog:clean-aka-supabase           # dry run (default)
 *   APPLY=1 npm run catalog:clean-aka-supabase   # write
 * Then: npm run catalog:enrich-nicknames
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

const AKA_RE = /\s*\(aka:\s*[^)]*\)\s*/gi
const nicknamesPath = path.join(repoRoot, 'data', 'catalog-nicknames.json')

function fail(msg: string): never { console.error(`[clean-aka] ${msg}`); process.exit(1) }
const cleanRef = (r: string) => r.replace(AKA_RE, '').trim()

type Row = { id: string; brand: string | null; reference: string | null }
type DictEntry = { brand: string; reference: string; nicknames: string[] }

async function fetchPolluted(supabase: SupabaseClient): Promise<Row[]> {
  const out: Row[] = []
  const PAGE = 1000
  let offset = 0
  for (;;) {
    const { data, error } = await supabase
      .from('catalog_watches')
      .select('id, brand, reference')
      .ilike('reference', '%(aka:%')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) fail(`fetch at ${offset}: ${error.message}`)
    const rows = (data ?? []) as Row[]
    out.push(...rows)
    if (rows.length < PAGE) break
    offset += PAGE
  }
  return out
}

function mergeNickname(dict: { entries: DictEntry[] }, brand: string, reference: string, nicknames: string[]) {
  const key = (b: string, r: string) => `${b.toLowerCase()}|${r.toLowerCase()}`
  const existing = dict.entries.find(e => key(e.brand, e.reference) === key(brand, reference))
  if (existing) {
    for (const n of nicknames) if (!existing.nicknames.some(x => x.toLowerCase() === n.toLowerCase())) existing.nicknames.push(n)
  } else {
    dict.entries.push({ brand, reference, nicknames: [...nicknames] })
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) fail('SUPABASE_URL and SUPABASE_SECRET_KEY required')
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

  const rows = await fetchPolluted(supabase)
  console.log(`[clean-aka] found ${rows.length} polluted reference(s)`)

  const dict = JSON.parse(fs.readFileSync(nicknamesPath, 'utf8')) as { generatedAt?: string; entries: DictEntry[] }
  if (!Array.isArray(dict.entries)) fail('catalog-nicknames.json missing .entries[]')

  const updates: Array<{ id: string; after: string }> = []
  let rescued = 0
  for (const r of rows) {
    const before = r.reference ?? ''
    const after = cleanRef(before)
    if (after === before) continue
    const tokens = (before.match(/\(aka:\s*([^)]*)\)/i)?.[1] ?? '').split(',').map(t => t.trim()).filter(Boolean)
    const nicknames = tokens.filter(t => /[a-z]/i.test(t))
    if (nicknames.length && r.brand) { mergeNickname(dict, r.brand, after, nicknames); rescued += nicknames.length }
    updates.push({ id: r.id, after })
    console.log(`    ${r.brand} "${before}" → "${after}"${nicknames.length ? `  [rescued: ${nicknames.join(', ')}]` : ''}`)
  }

  console.log(`\n[clean-aka] ${updates.length} reference(s) to clean · ${rescued} nickname token(s) rescued`)
  if (!APPLY) { console.log('[clean-aka] DRY RUN — no writes (DB or nicknames file). Set APPLY=1 to apply.'); return }

  dict.generatedAt = new Date().toISOString()
  fs.writeFileSync(nicknamesPath, JSON.stringify(dict, null, 2) + '\n')
  console.log(`[clean-aka] updated ${path.relative(repoRoot, nicknamesPath)}`)

  let n = 0
  for (const u of updates) {
    const { error } = await supabase.from('catalog_watches').update({ reference: u.after }).eq('id', u.id)
    if (error) fail(`update ${u.id}: ${error.message}`)
    process.stdout.write(`  ${++n}/${updates.length}\r`)
  }
  console.log(`\n[clean-aka] done. cleaned ${n} references. Now run: npm run catalog:enrich-nicknames`)
}

main().catch(err => { console.error('[clean-aka] fatal:', err); process.exit(1) })
