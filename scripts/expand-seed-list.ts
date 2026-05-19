/**
 * Build the priority 1,500-row reference list (Phase 1 of the catalog
 * hydration plan).
 *
 * Inputs:
 *   lib/watches.ts                          — hand-curated catalog (identity)
 *   data/catalog-seed-200.csv               — current seed CSV
 *   data/external/thewatchapi-cache/_brand_list.json
 *     and       _references_<brand>.json   — thewatchapi list endpoint dumps
 *     (populated by `npm run catalog:fetch-thewatchapi -- --mode=list-refs`)
 *
 * Output:
 *   data/catalog-seed-1500.csv (same columns as catalog-seed-200.csv)
 *
 * Algorithm:
 *   1. Read identity rows from lib/watches.ts and the existing seed CSV.
 *      Dedupe by canonical id from lib/catalogId.ts.
 *   2. For each priority brand whose thewatchapi reference list is cached,
 *      add the top N references (capped) using a heuristic:
 *      - prefer references with a known model in the brand's modelMap (below)
 *      - drop references shorter than 3 chars or matching obvious junk regexes
 *      - cap per-brand additions at PER_BRAND_CAP.
 *   3. For each added reference, infer watchType from model name via WATCH_TYPE_RULES.
 *   4. Validate every row produces a canonical id via mintCatalogId.
 *   5. Write the CSV (sorted by brand, then reference).
 *
 * Re-runnable: existing rows are preserved; only previously-missing refs are
 * appended on subsequent runs.
 */

import fs from 'node:fs'
import path from 'node:path'
import { repoRoot, parseCsv, csvEscape } from './watch-image-pipeline'
import { isValidCatalogId, mintCatalogId } from '../lib/catalogId'
import { watches } from '../lib/watches'

const existingSeedPath = path.join(repoRoot, 'data', 'catalog-seed-200.csv')
const outputPath = path.join(repoRoot, 'data', 'catalog-seed-1500.csv')
const thewatchapiCacheDir = path.join(repoRoot, 'data', 'external', 'thewatchapi-cache')

const PER_BRAND_CAP = Number(process.env.PER_BRAND_CAP ?? 80)
const TOTAL_TARGET = Number(process.env.TOTAL_TARGET ?? 1500)

const PRIORITY_BRANDS: string[] = [
  'Rolex',
  'Omega',
  'Patek Philippe',
  'Audemars Piguet',
  'Vacheron Constantin',
  'A. Lange & Söhne',
  'Cartier',
  'Jaeger-LeCoultre',
  'Grand Seiko',
  'IWC',
  'Breitling',
  'TAG Heuer',
  'Panerai',
  'Zenith',
  'Tudor',
  'Hublot',
  'Richard Mille',
  'Longines',
  'Seiko',
  'Citizen',
  'Tissot',
  'Oris',
  'Blancpain',
  'Breguet',
]

const WATCH_TYPE_RULES: Array<{ re: RegExp; type: string }> = [
  { re: /submariner|sea[\s-]?dweller|seamaster\s+(diver|300|aqua\s*terra)|fifty\s*fathoms|aquanaut|pelagos|black\s*bay|seamaster\s*diver|aquaracer/i, type: 'Diver' },
  { re: /daytona|speedmaster|chronograph|chrono|navitimer|monaco|carrera|el\s*primero/i, type: 'Chronograph' },
  { re: /gmt|world[\s-]?time|worldtimer|aqua\s*terra\s*gmt/i, type: 'GMT' },
  { re: /pilot|navi(timer)?|big\s*pilot|mark\s+xv|aviator|flieger|chronomat/i, type: 'Pilot' },
  { re: /explorer|ranger|khaki\s+field|field|chronomat\s*sport|tank/i, type: 'Field' },
  { re: /nautilus|royal\s*oak|overseas|laureato|polo\s*s|ingenieur|alpine\s*eagle|odyssey/i, type: 'Integrated Bracelet' },
  { re: /datejust|day-?date|cellini|patrimony|saxonia|lange\s*1|reverso|portugieser|portuguese|calatrava|altiplano|simplicity|tank|santos|cle/i, type: 'Dress' },
  { re: /oyster\s*perpetual|yacht-?master|milgauss|polaris|big\s*bang|spirit/i, type: 'Sport' },
]

function inferWatchType(model: string): string {
  if (!model) return ''
  for (const rule of WATCH_TYPE_RULES) {
    if (rule.re.test(model)) return rule.type
  }
  // No confident match. Leave empty so the LLM extraction step can fill it
  // rather than seeding a wrong default that priority-merge would lock in.
  return ''
}

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

// ─────────────────────────────────────────────────────────────────────────
// Sources
// ─────────────────────────────────────────────────────────────────────────

function readExistingSeedCsv(): Row[] {
  if (!fs.existsSync(existingSeedPath)) return []
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
    verificationStatus: r.verificationStatus || 'identity_seeded_specs_pending',
  }))
}

function readHandCuratedFromWatchesTs(): Row[] {
  return watches.map(w => ({
    id: w.id,
    brand: w.brand,
    model: w.model,
    reference: w.reference,
    dialColor: w.dialColor || '',
    watchType: w.watchType,
    sourceUrl: '',
    communitySignal: 'curated',
    verificationStatus: 'identity_seeded_specs_verified',
  }))
}

type BrandRefList = { brand: string; references: string[] }

function brandToFilenameSlug(brand: string): string {
  return brand
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function readThewatchapiReferenceLists(): BrandRefList[] {
  if (!fs.existsSync(thewatchapiCacheDir)) return []
  // Iterate PRIORITY_BRANDS so we preserve display-name spelling and only
  // pick up files we asked for. Anything else in the cache dir is ignored.
  const out: BrandRefList[] = []
  for (const brand of PRIORITY_BRANDS) {
    const slug = brandToFilenameSlug(brand)
    const filePath = path.join(thewatchapiCacheDir, `_references_${slug}.json`)
    if (!fs.existsSync(filePath)) continue
    try {
      const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      if (json && Array.isArray(json.data)) {
        out.push({ brand, references: json.data })
      }
    } catch {
      // skip malformed file
    }
  }
  return out
}

// Per-brand reference-prefix → model map. Sparse on purpose: only seed
// the common families we care about. References that don't match drop
// through with model = "" and get a generic guess.
const BRAND_REFERENCE_MODEL: Record<string, Array<{ prefix: RegExp; model: string }>> = {
  rolex: [
    { prefix: /^126610/i, model: 'Submariner Date' },
    { prefix: /^124060/i, model: 'Submariner' },
    { prefix: /^126710/i, model: 'GMT-Master II' },
    { prefix: /^126500/i, model: 'Cosmograph Daytona' },
    { prefix: /^116500/i, model: 'Cosmograph Daytona' },
    { prefix: /^124270/i, model: 'Explorer' },
    { prefix: /^226570/i, model: 'Explorer II' },
    { prefix: /^126334/i, model: 'Datejust 41' },
    { prefix: /^126300/i, model: 'Datejust 41' },
    { prefix: /^124300/i, model: 'Oyster Perpetual 41' },
    { prefix: /^126622/i, model: 'Yacht-Master 40' },
    { prefix: /^126600/i, model: 'Sea-Dweller' },
    { prefix: /^126660/i, model: 'Deepsea' },
    { prefix: /^228238/i, model: 'Day-Date 40' },
    { prefix: /^116400/i, model: 'Milgauss' },
    { prefix: /^116515/i, model: 'Daytona' },
    { prefix: /^116610/i, model: 'Submariner Date' },
    { prefix: /^116710/i, model: 'GMT-Master II' },
    { prefix: /^16570/i, model: 'Explorer II' },
    { prefix: /^16710/i, model: 'GMT-Master II' },
  ],
  omega: [
    { prefix: /^310\.30/i, model: 'Speedmaster Professional' },
    { prefix: /^311/i, model: 'Speedmaster Professional' },
    { prefix: /^210\.30/i, model: 'Seamaster Diver 300M' },
    { prefix: /^210\.32/i, model: 'Seamaster Diver 300M' },
    { prefix: /^220/i, model: 'Seamaster Aqua Terra' },
    { prefix: /^215/i, model: 'Seamaster Planet Ocean' },
    { prefix: /^131/i, model: 'Constellation' },
  ],
  tudor: [
    { prefix: /^79030/i, model: 'Black Bay 58' },
    { prefix: /^79230/i, model: 'Black Bay' },
    { prefix: /^79530/i, model: 'Black Bay Pro' },
    { prefix: /^79733/i, model: 'Black Bay GMT' },
    { prefix: /^25600/i, model: 'Pelagos' },
    { prefix: /^25710/i, model: 'Pelagos FXD' },
    { prefix: /^M79030/i, model: 'Black Bay Fifty-Eight' },
  ],
  iwc: [
    { prefix: /^IW3271|^3271/i, model: 'Big Pilot' },
    { prefix: /^IW3777|^3777/i, model: 'Pilot Chronograph' },
    { prefix: /^IW5001|^5001/i, model: 'Portugieser' },
    { prefix: /^IW3585|^3585/i, model: 'Portugieser Chronograph' },
  ],
}

function guessModel(brand: string, ref: string): string {
  const key = brand.toLowerCase().replace(/[^a-z0-9]/g, '')
  const rules = BRAND_REFERENCE_MODEL[key] ?? []
  for (const { prefix, model } of rules) {
    if (prefix.test(ref)) return model
  }
  return ''
}

// ─────────────────────────────────────────────────────────────────────────
// Build & write
// ─────────────────────────────────────────────────────────────────────────

function isJunkReference(ref: string): boolean {
  if (!ref || ref.length < 3) return true
  if (/^\?+$/.test(ref)) return true
  if (/test|sample|unknown/i.test(ref)) return true
  return false
}

function main() {
  const byId = new Map<string, Row>()

  // 1. carry-forward
  const carryForward = [...readHandCuratedFromWatchesTs(), ...readExistingSeedCsv()]
  for (const row of carryForward) {
    if (!row.id) continue
    if (!byId.has(row.id)) byId.set(row.id, row)
  }
  console.log(`[expand-seed] carry-forward rows: ${byId.size}`)

  // 2. thewatchapi reference lists
  const brandRefs = readThewatchapiReferenceLists()
  if (brandRefs.length === 0) {
    console.log(
      `[expand-seed] no thewatchapi reference list cache at ${path.relative(repoRoot, thewatchapiCacheDir)} — skipping API-derived expansion`,
    )
    console.log(
      '            run `npm run catalog:fetch-thewatchapi -- --mode=list-refs --brands="<brand1>,<brand2>,..."` first to populate it',
    )
  }

  for (const { brand, references } of brandRefs) {
    let added = 0
    for (const ref of references) {
      if (added >= PER_BRAND_CAP) break
      if (isJunkReference(ref)) continue
      const model = guessModel(brand, ref)
      // Build a tentative row to validate the id
      const row: Row = {
        id: '',
        brand,
        model: model || brand, // fall back to brand-only if we can't infer
        reference: ref,
        dialColor: '',
        watchType: inferWatchType(model || ''),
        sourceUrl: '',
        communitySignal: 'thewatchapi:ref-list',
        verificationStatus: 'identity_seeded_specs_pending',
      }
      try {
        row.id = mintCatalogId({ brand: row.brand, reference: row.reference })
      } catch {
        continue
      }
      if (!isValidCatalogId(row.id)) continue
      if (byId.has(row.id)) continue
      byId.set(row.id, row)
      added += 1
      if (byId.size >= TOTAL_TARGET) break
    }
    console.log(`[expand-seed] ${brand.padEnd(24)} +${added} refs`)
    if (byId.size >= TOTAL_TARGET) {
      console.log(`[expand-seed] hit TOTAL_TARGET=${TOTAL_TARGET}, stopping`)
      break
    }
  }

  // 3. sort + write
  const rows = [...byId.values()].sort((a, b) => {
    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand)
    return a.reference.localeCompare(b.reference)
  })

  const csv = [
    HEADER.join(','),
    ...rows.map(r => HEADER.map(col => csvEscape(r[col])).join(',')),
  ].join('\n') + '\n'

  fs.writeFileSync(outputPath, csv, 'utf8')
  console.log(`[expand-seed] wrote ${path.relative(repoRoot, outputPath)} — ${rows.length} rows`)
}

main()
