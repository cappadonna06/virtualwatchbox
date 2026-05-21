/**
 * Enrich `public.catalog_watches.nickname` from the curated dictionary at
 * `data/catalog-nicknames.json`. Once written, the generated `search_text`
 * column from migration 023 picks the nicknames up automatically, so
 * collector queries like "Pepsi", "Batman", "Daytona Panda", and
 * "Moonwatch" land their matches.
 *
 * The dictionary intentionally lists refs we don't yet carry — those rows
 * are reported as "unmatched (expected)" and skipped without error, so the
 * dictionary can be future-proofed for catalog growth.
 *
 * Conflict note: `scripts/enrich-catalog.ts` also writes `nickname`, but
 * sources it from an LLM-extract field that's currently always null. If
 * LLM enrichment ever populates nicknames, run this script *after* it so
 * the curated values win.
 *
 * Required env:
 *   SUPABASE_URL  / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   DRY_RUN=1 npm run catalog:enrich-nicknames   # preview
 *   npm run catalog:enrich-nicknames              # apply
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()

const dictionaryPath = path.join(repoRoot, 'data', 'catalog-nicknames.json')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const CHUNK = Number(process.env.CHUNK ?? 500)

type DictEntry = { brand: string; reference: string; nicknames: string[] }
type Dictionary = { generatedAt?: string; entries: DictEntry[] }

function fail(msg: string): never {
  console.error(`[enrich-nicknames] ${msg}`)
  process.exit(1)
}

function loadDictionary(): DictEntry[] {
  if (!fs.existsSync(dictionaryPath)) fail(`missing ${dictionaryPath}`)
  const raw = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8')) as Dictionary
  if (!Array.isArray(raw.entries)) fail('dictionary missing .entries[]')
  return raw.entries.filter(e => e && e.brand && e.reference && Array.isArray(e.nicknames) && e.nicknames.length > 0)
}

/**
 * Merge entries that share (brand_lower, reference_lower) — concat
 * nicknames and de-dupe. Lets the JSON split readability blocks (Pepsi
 * lineage / Coke lineage) without conflicting writes to the same ref.
 */
function mergeEntries(entries: DictEntry[]): DictEntry[] {
  const acc = new Map<string, DictEntry>()
  for (const e of entries) {
    const key = `${e.brand.toLowerCase()}|${e.reference.toLowerCase()}`
    const prior = acc.get(key)
    if (!prior) {
      acc.set(key, { brand: e.brand, reference: e.reference, nicknames: [...e.nicknames] })
    } else {
      for (const n of e.nicknames) {
        if (!prior.nicknames.some(x => x.toLowerCase() === n.toLowerCase())) prior.nicknames.push(n)
      }
    }
  }
  return Array.from(acc.values())
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i)
  const cur = new Array(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j]
  }
  return cur[b.length]
}

type CatalogRow = { id: string; brand: string; reference: string }

async function fetchCatalogRefs(supabase: SupabaseClient): Promise<CatalogRow[]> {
  const out: CatalogRow[] = []
  const PAGE = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('catalog_watches')
      .select('id, brand, reference')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) fail(`fetchCatalogRefs at offset ${offset}: ${error.message}`)
    const rows = (data ?? []) as CatalogRow[]
    out.push(...rows)
    if (rows.length < PAGE) break
    offset += PAGE
  }
  return out
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY)
    fail('SUPABASE_URL and SUPABASE_SECRET_KEY (or service role key) required')

  const entries = mergeEntries(loadDictionary())
  console.log(`[enrich-nicknames] loaded ${entries.length} merged dictionary entries`)

  const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const catalogRows = await fetchCatalogRefs(supabase)
  console.log(`[enrich-nicknames] fetched ${catalogRows.length} catalog rows`)

  const catalogByKey = new Map<string, CatalogRow>()
  for (const r of catalogRows) {
    const key = `${(r.brand ?? '').toLowerCase()}|${(r.reference ?? '').toLowerCase()}`
    catalogByKey.set(key, r)
  }
  const catalogRefsByBrand = new Map<string, string[]>()
  for (const r of catalogRows) {
    const b = (r.brand ?? '').toLowerCase()
    if (!catalogRefsByBrand.has(b)) catalogRefsByBrand.set(b, [])
    catalogRefsByBrand.get(b)!.push(r.reference ?? '')
  }

  type Update = { id: string; brand: string; reference: string; nickname: string }
  const updates: Update[] = []
  const unmatched: DictEntry[] = []
  const typoCandidates: Array<{ entry: DictEntry; suggestion: string }> = []

  for (const entry of entries) {
    const key = `${entry.brand.toLowerCase()}|${entry.reference.toLowerCase()}`
    const row = catalogByKey.get(key)
    if (row) {
      updates.push({
        id: row.id,
        brand: row.brand,
        reference: row.reference,
        nickname: entry.nicknames.join(', '),
      })
    } else {
      unmatched.push(entry)
      const brandRefs = catalogRefsByBrand.get(entry.brand.toLowerCase()) ?? []
      let bestDist = Infinity
      let bestRef = ''
      for (const r of brandRefs) {
        const d = levenshtein(entry.reference.toLowerCase(), r.toLowerCase())
        if (d < bestDist) {
          bestDist = d
          bestRef = r
        }
      }
      if (bestDist > 0 && bestDist <= 2 && bestRef) {
        typoCandidates.push({ entry, suggestion: bestRef })
      }
    }
  }

  console.log(`\n[enrich-nicknames] matched ${updates.length}, unmatched ${unmatched.length}`)
  if (updates.length > 0) {
    console.log('  sample matches:')
    for (const u of updates.slice(0, 10)) {
      console.log(`    ${u.brand} ${u.reference}  →  "${u.nickname}"`)
    }
  }
  if (typoCandidates.length > 0) {
    console.log(`\n[enrich-nicknames] WARN: ${typoCandidates.length} ref(s) look close to a catalog ref — possible typo:`)
    for (const t of typoCandidates) {
      console.log(`    ${t.entry.brand} ${t.entry.reference}  →  did you mean ${t.suggestion}?`)
    }
  }
  if (unmatched.length > 0) {
    console.log(`\n[enrich-nicknames] info: ${unmatched.length} dictionary ref(s) not yet in catalog (future-proofed entries):`)
    for (const u of unmatched.slice(0, 20)) {
      console.log(`    ${u.brand} ${u.reference}  [${u.nicknames.join(', ')}]`)
    }
    if (unmatched.length > 20) console.log(`    …and ${unmatched.length - 20} more`)
  }

  if (DRY_RUN) {
    console.log('\n[enrich-nicknames] DRY_RUN=1 — no writes.')
    return
  }
  if (updates.length === 0) {
    console.log('\n[enrich-nicknames] nothing to write.')
    return
  }

  console.log(`\n[enrich-nicknames] writing ${updates.length} rows in chunks of ${CHUNK}…`)
  let written = 0
  for (let i = 0; i < updates.length; i += CHUNK) {
    const batch = updates.slice(i, i + CHUNK)
    for (const u of batch) {
      const { error } = await supabase
        .from('catalog_watches')
        .update({ nickname: u.nickname })
        .eq('id', u.id)
      if (error) fail(`update ${u.brand} ${u.reference}: ${error.message}`)
      written += 1
    }
    process.stdout.write(`  ${written}/${updates.length}\r`)
  }
  console.log(`\n[enrich-nicknames] done. updated ${written} rows.`)
}

main().catch(err => {
  console.error('[enrich-nicknames] fatal:', err)
  process.exit(1)
})
