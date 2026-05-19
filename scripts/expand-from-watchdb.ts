/**
 * Expand the catalog seed by merging in watch_db.csv's structured rows.
 *
 * watch_db.csv has ~35,860 watches with manufacturer-grade structured data
 * (brand, family, reference, caliber, case material, diameter, water
 * resistance, dial color, etc.). This script adds those rows to our seed
 * for any reference not already present, producing a much larger catalog.
 *
 * Input:
 *   data/catalog-seed-1500.csv               (carry-forward + thewatchapi list)
 *   data/external/kaggle/watch_db.csv        (35k structured)
 *
 * Output:
 *   data/catalog-seed-full.csv               (~30k+ rows)
 *
 * Filtering (optional, via env):
 *   BRAND_ALLOWLIST="Rolex,Omega,..." — restrict to listed brands only
 *   PER_BRAND_CAP=400                  — cap per-brand additions (default no cap)
 *   MAX_TOTAL=50000                    — overall cap (default no cap)
 *
 * Usage:
 *   npm run catalog:expand-from-watchdb
 */

import fs from 'node:fs'
import path from 'node:path'
import { repoRoot, parseCsv, csvEscape } from './watch-image-pipeline'
import { isValidCatalogId, mintCatalogId } from '../lib/catalogId'

const existingSeedPath = path.join(repoRoot, 'data', 'catalog-seed-1500.csv')
const watchDbCsvPath =
  process.env.WATCH_DB_CSV ?? path.join(repoRoot, 'data', 'external', 'kaggle', 'watch_db.csv')
const outputPath = path.join(repoRoot, 'data', 'catalog-seed-full.csv')

const BRAND_ALLOWLIST = (process.env.BRAND_ALLOWLIST ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
const PER_BRAND_CAP = process.env.PER_BRAND_CAP ? Number(process.env.PER_BRAND_CAP) : Infinity
const MAX_TOTAL = process.env.MAX_TOTAL ? Number(process.env.MAX_TOTAL) : Infinity

type Row = {
  id: string
  brand: string
  model: string
  reference: string
  dialColor: string
  watchType: string
  sourceUrl: string
  communitySignal: string
  verificationStatus: string
}

const HEADER: Array<keyof Row> = [
  'id',
  'brand',
  'model',
  'reference',
  'dialColor',
  'watchType',
  'sourceUrl',
  'communitySignal',
  'verificationStatus',
]

// Heuristic watchType inference. Combines model/family/name and the
// description's keyword footprint. More aggressive than expand-seed-list's
// rules because we have richer text here (Family name + description).
const WATCH_TYPE_RULES: Array<{ re: RegExp; type: string }> = [
  { re: /submariner|sea[\s-]?dweller|seamaster\s+diver|seamaster\s+300|fifty\s*fathoms|aquanaut(?!\s+(?:travel|chrono))|pelagos|black\s*bay(?!\s+gmt)|aquaracer|deepsea|fathom|seastar|aqua\s*racer|sea\s*timer|diver/i, type: 'Diver' },
  { re: /\bgmt\b|world[\s-]?time|worldtimer|world\s*tour|dual\s*time|tradition\s*hours\s*and\s*minutes|tradition\s+gmt|aqua\s+terra\s+gmt|navitimer\s+gmt|black\s*bay\s+gmt/i, type: 'GMT' },
  { re: /daytona|speedmaster|chrono(?:graph|mat)?(?!\s+(?:gmt|world))|navitimer(?!\s+gmt)|monaco|carrera\s*(?:chrono)?|el\s*primero|el-primero|datograph|chronoswiss|chronospace|chronomat\b/i, type: 'Chronograph' },
  { re: /pilot|big\s*pilot|mark\s+(?:xv|xvi|xvii|xviii)|aviator|flieger|portugieser\s+chronograph|chronospace|navitimer\b|spitfire|top\s*gun|chronomat\s*frecce/i, type: 'Pilot' },
  { re: /explorer|ranger|khaki\s+field|hardlex.*field|field|tank\s+(?:must|francaise|americaine|solo|cintree|louis)|seamaster\s+railmaster|railmaster|hardy|khaki/i, type: 'Field' },
  { re: /nautilus|royal\s*oak|overseas|laureato|polo\s*s|ingenieur|alpine\s*eagle|odyssey|defy|octo\b|gerald\s*genta|pasha|aikon\b/i, type: 'Integrated Bracelet' },
  { re: /datejust|day-?date|cellini|patrimony|saxonia|lange\s*1|reverso|portugieser(?!\s+chrono)|portuguese|calatrava|altiplano|simplicity|tank\b|santos|cle|tonda|toric|villeret|fiftysix|patrimoine|complications/i, type: 'Dress' },
]

function inferWatchType(
  name: string,
  family: string,
  description: string,
  signals: {
    waterResistance?: string
    functions?: string
    diameter?: string
    caseShape?: string
  } = {},
): string {
  const blob = `${name} ${family} ${description}`.toLowerCase()

  // Pass 1: explicit nickname / family rules (highest confidence).
  for (const rule of WATCH_TYPE_RULES) {
    if (rule.re.test(blob)) return rule.type
  }

  // Pass 2: structured signal heuristics. Run in confidence order.
  const fn = (signals.functions ?? '').toLowerCase()
  if (/chronograph/.test(fn)) return 'Chronograph'
  if (/(gmt|24[\s-]?hour|second time zone|dual\s*time|world[\s-]?time)/.test(fn)) return 'GMT'

  // W/R ≥ 200m → almost certainly a diver
  const wrMatch = (signals.waterResistance ?? '').match(/(\d+(?:\.\d+)?)/)
  const wr = wrMatch ? Number(wrMatch[1]) : 0
  if (wr >= 200) return 'Diver'

  // Pilot indicators in description (when not caught by rules above)
  if (/\b(flieger|aviator|pilot[''']?s?|cockpit|navigator|big\s*pilot|chronospace|navitimer)\b/i.test(blob))
    return 'Pilot'

  // Field watch indicators
  if (/\b(field watch|khaki|expedition|trail|mil[\s-]?spec|service\s*watch|trench)\b/i.test(blob))
    return 'Field'

  // Diver indicators in description (lower confidence than W/R signal)
  if (/\b(divers?\s+watch|dive\s+watch|skin[\s-]?diver|saturation|helium|tropic)\b/i.test(blob))
    return 'Diver'

  // GMT in description
  if (/\b(gmt[\s-]?master|world[\s-]?time|second\s+time\s+zone|two\s+time\s+zones)\b/i.test(blob))
    return 'GMT'

  // Vintage indicator — but only when description explicitly says vintage/historic
  if (/\b(vintage|historic(al)?|reproduction|tribute to the|heritage of|1950s|1960s|1970s)\b/i.test(blob))
    return 'Vintage'

  // Integrated bracelet hint — case shape often "Cushion" + bracelet listed
  if (/integrated\s+bracelet|integrated[\s-]?case/i.test(blob)) return 'Integrated Bracelet'

  // Dress watch fallback: small diameter (<= 39mm) with no complications,
  // closed case back, common dress collection words
  const diaMatch = (signals.diameter ?? '').match(/(\d+(?:\.\d+)?)/)
  const dia = diaMatch ? Number(diaMatch[1]) : 0
  if (dia > 0 && dia <= 38 && !/chronograph|gmt|date/.test(fn)) {
    return 'Dress'
  }

  // Sport fallback (only for clear cases): heavy case w/r 100m and chronoless
  if (wr >= 100 && wr < 200 && !/chronograph|gmt/.test(fn)) return 'Sport'

  return ''
}

function brandKey(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '')
}

// Streaming CSV reader for ;-delimited files with quoted-multiline fields.
// watch_db.csv is Windows-1252 encoded (has en-dashes at 0x96 etc.).
function* iterSemicolonCsv(filePath: string): Generator<Record<string, string>> {
  const content = new TextDecoder('windows-1252').decode(fs.readFileSync(filePath))
  const len = content.length
  if (len === 0) return

  let pos = 0
  const headers: string[] = []
  let field = ''
  let quoted = false
  while (pos < len) {
    const ch = content[pos]
    if (quoted) {
      if (ch === '"' && content[pos + 1] === '"') {
        field += '"'
        pos += 2
        continue
      }
      if (ch === '"') {
        quoted = false
        pos += 1
        continue
      }
      field += ch
      pos += 1
      continue
    }
    if (ch === '"') {
      quoted = true
      pos += 1
      continue
    }
    if (ch === ';') {
      headers.push(field.replace(/^﻿/, '').trim())
      field = ''
      pos += 1
      continue
    }
    if (ch === '\n' || ch === '\r') {
      headers.push(field.replace(/^﻿/, '').trim())
      field = ''
      pos += 1
      if (ch === '\r' && content[pos] === '\n') pos += 1
      break
    }
    field += ch
    pos += 1
  }

  let row: string[] = []
  field = ''
  quoted = false
  while (pos < len) {
    const ch = content[pos]
    if (quoted) {
      if (ch === '"' && content[pos + 1] === '"') {
        field += '"'
        pos += 2
        continue
      }
      if (ch === '"') {
        quoted = false
        pos += 1
        continue
      }
      field += ch
      pos += 1
      continue
    }
    if (ch === '"') {
      quoted = true
      pos += 1
      continue
    }
    if (ch === ';') {
      row.push(field)
      field = ''
      pos += 1
      continue
    }
    if (ch === '\n' || ch === '\r') {
      row.push(field)
      field = ''
      pos += 1
      if (ch === '\r' && content[pos] === '\n') pos += 1
      if (row.length === 1 && row[0] === '') {
        row = []
        continue
      }
      const obj: Record<string, string> = {}
      for (let j = 0; j < headers.length; j += 1) {
        obj[headers[j]] = (row[j] ?? '').trim()
      }
      row = []
      yield obj
      continue
    }
    field += ch
    pos += 1
  }
}

function readExistingSeed(): Row[] {
  if (!fs.existsSync(existingSeedPath)) {
    console.warn(`[watchdb-expand] no existing seed at ${existingSeedPath}, starting from empty`)
    return []
  }
  const content = fs.readFileSync(existingSeedPath, 'utf8')
  return (parseCsv(content) as unknown as Row[]).map(r => ({
    id: r.id,
    brand: r.brand,
    model: r.model,
    reference: r.reference,
    dialColor: r.dialColor || '',
    watchType: r.watchType || '',
    sourceUrl: r.sourceUrl || '',
    communitySignal: r.communitySignal || '',
    verificationStatus: r.verificationStatus || '',
  }))
}

// ─── Bad-data filters + dedup ─────────────────────────────────────────

const JUNK_BRAND_RE = /^(bilgi\s*yok|unknown|test|n\/a|none|null|.{1,2})$/i
const JUNK_REF_RE = /^[\s.;\-—–]*$|^(test|sample|na|unknown|none|tbd|n\/a)$/i

function isJunkBrand(brand: string | undefined | null): boolean {
  if (!brand) return true
  const t = brand.trim()
  if (!t) return true
  if (JUNK_BRAND_RE.test(t)) return true
  // Filter rows whose brand contains only the replacement character (encoding fail)
  if (/^�+$/.test(t)) return true
  return false
}

function isJunkRef(reference: string | undefined | null, brand?: string | null): boolean {
  if (!reference) return true
  const t = reference.trim()
  if (!t) return true
  if (t.length < 2) return true
  if (JUNK_REF_RE.test(t)) return true
  if (/^�+$/.test(t)) return true
  // Reference identical to brand name is a thewatchapi data quirk — drop.
  if (brand && brandKey(t) === brandKey(brand)) return true
  return false
}

// Curation signal ranking — higher = stronger curation. Used when two
// rows collapse to the same canonical id and we need to pick a winner.
const COMMUNITY_SIGNAL_WEIGHT: Record<string, number> = {
  core_icon: 100,
  curated: 95,
  enthusiast_icon: 90,
  style_icon: 85,
  core_design_icon: 84,
  heritage_pick: 82,
  enthusiast_pick: 80,
  enthusiast_value: 78,
  enthusiast_favorite: 78,
  reddit_icon: 75,
  entry_icon: 70,
  entry_value: 65,
  reddit_sotc_signal: 60,
  reddit_under_5k_signal: 60,
  reddit_grandseiko_signal: 58,
  reddit_nomos_gs_signal: 58,
  reddit_sinn_thread_signal: 58,
  reddit_collection_strategy_signal: 55,
  current_catalog: 50,
  brand_variety: 45,
  folder_image_candidate: 40,
  'thewatchapi:ref-list': 25,
  'kaggle:watch_db': 20,
}

function signalRank(signal: string | undefined | null): number {
  if (!signal) return 0
  return COMMUNITY_SIGNAL_WEIGHT[signal] ?? 10
}

function mergeRows(a: Row, b: Row): Row {
  // Pick the row with the stronger curation signal; fill blanks from the other.
  const preferred = signalRank(a.communitySignal) >= signalRank(b.communitySignal) ? a : b
  const fallback = preferred === a ? b : a
  return {
    id: preferred.id,
    brand: preferred.brand || fallback.brand,
    model: preferred.model || fallback.model,
    reference: preferred.reference || fallback.reference,
    dialColor: preferred.dialColor || fallback.dialColor,
    watchType: preferred.watchType || fallback.watchType,
    sourceUrl: preferred.sourceUrl || fallback.sourceUrl,
    communitySignal: preferred.communitySignal || fallback.communitySignal,
    verificationStatus: preferred.verificationStatus || fallback.verificationStatus,
  }
}

function main() {
  if (!fs.existsSync(watchDbCsvPath)) {
    console.error(`watch_db.csv not found at ${watchDbCsvPath}`)
    process.exit(1)
  }

  // ─── Carry-forward + re-canonicalize existing IDs ───────────────────
  // The historical lib/watches.ts (87 rows) used non-canonical IDs like
  // "rolex-submariner-date-126610ln" that don't follow mintCatalogId's
  // {brand}-{ref} rule. Re-minting collapses those against watch_db's
  // canonical "rolex-126610ln" so we don't end up with two records per
  // physical watch.
  const byId = new Map<string, Row>()
  const carryForward = readExistingSeed()
  let droppedJunkCarry = 0
  let collisionMerged = 0
  for (const row of carryForward) {
    if (isJunkBrand(row.brand) || isJunkRef(row.reference, row.brand)) {
      droppedJunkCarry += 1
      continue
    }
    let canonicalId: string
    try {
      canonicalId = mintCatalogId({ brand: row.brand, reference: row.reference })
    } catch {
      droppedJunkCarry += 1
      continue
    }
    if (!isValidCatalogId(canonicalId)) {
      droppedJunkCarry += 1
      continue
    }
    const reMinted: Row = { ...row, id: canonicalId }
    const existing = byId.get(canonicalId)
    if (existing) {
      byId.set(canonicalId, mergeRows(existing, reMinted))
      collisionMerged += 1
    } else {
      byId.set(canonicalId, reMinted)
    }
  }
  const startingCount = byId.size
  console.log(
    `[watchdb-expand] carry-forward: ${startingCount} unique canonical rows (${collisionMerged} dupes merged, ${droppedJunkCarry} junk dropped)`,
  )

  if (BRAND_ALLOWLIST.length) {
    console.log(`[watchdb-expand] brand allowlist: ${BRAND_ALLOWLIST.join(', ')}`)
  }
  if (Number.isFinite(PER_BRAND_CAP)) console.log(`[watchdb-expand] per-brand cap: ${PER_BRAND_CAP}`)
  if (Number.isFinite(MAX_TOTAL)) console.log(`[watchdb-expand] max total: ${MAX_TOTAL}`)

  const brandAllow = new Set(BRAND_ALLOWLIST.map(brandKey))
  const perBrandCount = new Map<string, number>()

  let added = 0
  let skippedBrand = 0
  let skippedExisting = 0
  let skippedInvalid = 0
  let skippedCap = 0

  for (const row of iterSemicolonCsv(watchDbCsvPath)) {
    const brand = row['Brand']
    const ref = row['Reference']
    if (isJunkBrand(brand) || isJunkRef(ref, brand)) {
      skippedInvalid += 1
      continue
    }
    const bKey = brandKey(brand)
    if (brandAllow.size && !brandAllow.has(bKey)) {
      skippedBrand += 1
      continue
    }
    if (byId.size >= MAX_TOTAL) {
      skippedCap += 1
      break
    }
    if ((perBrandCount.get(bKey) ?? 0) >= PER_BRAND_CAP) {
      skippedCap += 1
      continue
    }

    let id: string
    try {
      id = mintCatalogId({ brand, reference: ref })
    } catch {
      skippedInvalid += 1
      continue
    }
    if (!isValidCatalogId(id)) {
      skippedInvalid += 1
      continue
    }
    if (byId.has(id)) {
      skippedExisting += 1
      continue
    }

    const family = row['Family'] || ''
    const name = row['Name'] || ''
    const description = row['Description'] || ''
    const watchType = inferWatchType(name, family, description, {
      waterResistance: row['W/R'],
      functions: row['Movement_Functions'],
      diameter: row['Diameter'],
      caseShape: row['Shape'],
    })

    const newRow: Row = {
      id,
      brand: brand.trim(),
      // Prefer Family (cleaner) over Name (which contains brand + variant)
      model: (family || name || brand).trim(),
      reference: ref.trim(),
      dialColor: (row['Dial Color'] || '').trim(),
      watchType,
      sourceUrl: '',
      communitySignal: 'kaggle:watch_db',
      verificationStatus: 'identity_seeded_specs_partial',
    }
    byId.set(id, newRow)
    perBrandCount.set(bKey, (perBrandCount.get(bKey) ?? 0) + 1)
    added += 1
  }

  console.log(`[watchdb-expand] added ${added} new rows from watch_db.csv`)
  console.log(
    `[watchdb-expand] skipped: existing=${skippedExisting} invalid=${skippedInvalid} brand-filter=${skippedBrand} cap=${skippedCap}`,
  )

  // Drop "shell" rows — no model, no watchType, ref that's just the brand name,
  // etc. These add no value to the catalog. (Conservative: only drop if the
  // model field equals the brand name literally — meaning we couldn't infer
  // ANY family or specific model.)
  let droppedShell = 0
  for (const [id, row] of byId) {
    if (
      row.communitySignal === 'thewatchapi:ref-list' &&
      brandKey(row.model) === brandKey(row.brand) &&
      !row.dialColor &&
      !row.watchType
    ) {
      byId.delete(id)
      droppedShell += 1
    }
  }
  console.log(`[watchdb-expand] dropped ${droppedShell} shell rows (no model, no dial, no type)`)

  const rows = [...byId.values()].sort((a, b) => {
    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand)
    return a.reference.localeCompare(b.reference)
  })

  const csv = [
    HEADER.join(','),
    ...rows.map(r => HEADER.map(c => csvEscape(r[c])).join(',')),
  ].join('\n') + '\n'

  fs.writeFileSync(outputPath, csv, 'utf8')
  console.log(`[watchdb-expand] wrote ${path.relative(repoRoot, outputPath)} — ${rows.length} rows`)
  console.log(`[watchdb-expand]   (${startingCount} carry-forward + ${added} from watch_db)`)

  // Per-brand summary
  console.log('[watchdb-expand] new rows per brand (top 25):')
  const sorted = [...perBrandCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
  for (const [b, n] of sorted) {
    console.log(`  ${b.padEnd(28)} +${n}`)
  }
}

main()
