/*
 * Builds data/catalog-batch-1.csv — a hand-curated list of ~1000 refs to image
 * in the next batch. Filters data/catalog-seed-full.csv by user-specified
 * brand+family patterns and caps each family at a target count.
 *
 * Selection priority within each family:
 *   1. Refs with a WatchBase parsed cache entry (highest acquire hit rate)
 *   2. Refs whose communitySignal already flags them as iconic
 *   3. Alphabetical id, as a stable tiebreaker
 *
 * Run with: npx tsx scripts/build-batch-1.ts
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..')
const SEED_CSV = path.join(ROOT, 'data', 'catalog-seed-full.csv')
const BATCH_CSV = path.join(ROOT, 'data', 'catalog-batch-1.csv')
const WB_CACHE_DIR = path.join(ROOT, 'data', 'external', 'watchbase-cache')

// ---- types ----------------------------------------------------------------

type SeedRow = {
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

type FamilySpec = {
  bucket: 'luxury' | 'enthusiast' | 'reddit' | 'grail'
  label: string
  brands: string[]
  modelTest: (model: string, reference: string) => boolean
  count: number
  // If true, take EVERY matching ref regardless of count cap (used for
  // "newer Longines HydroConquest" — user explicitly asked for all of them).
  takeAll?: boolean
}

// ---- helpers --------------------------------------------------------------

function parseCsv(text: string): SeedRow[] {
  const lines = text.split('\n').filter(Boolean)
  const rows: SeedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    if (cols.length < 9) continue
    rows.push({
      id: cols[0],
      brand: cols[1],
      model: cols[2],
      reference: cols[3],
      dialColor: cols[4],
      watchType: cols[5],
      sourceUrl: cols[6],
      communitySignal: cols[7],
      verificationStatus: cols[8],
    })
  }
  return rows
}

function splitCsvLine(line: string): string[] {
  const cols: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (c === ',' && !inQuotes) {
      cols.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  cols.push(cur)
  return cols
}

function csvEscape(s: string): string {
  if (s == null) return ''
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function brandSlug(brand: string): string {
  return brand
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function loadWatchBaseHits(): Set<string> {
  // Returns a set of seed-row ids that have a parsed WatchBase cache entry.
  // The cache structure is data/external/watchbase-cache/<brand-slug>/<ref-key>.parsed.json
  // where ref-key is the reference normalized to lowercase a-z0-9.
  const hits = new Set<string>()
  if (!fs.existsSync(WB_CACHE_DIR)) return hits
  const brandDirs = fs.readdirSync(WB_CACHE_DIR)
  for (const bd of brandDirs) {
    const bDir = path.join(WB_CACHE_DIR, bd)
    if (!fs.statSync(bDir).isDirectory()) continue
    const files = fs.readdirSync(bDir).filter(f => f.endsWith('.parsed.json'))
    for (const f of files) {
      const refKey = f.replace(/\.parsed\.json$/, '').toLowerCase()
      // The seed id slug isn't identical to the watchbase ref-key, so store
      // both forms keyed by brand-slug + ref-key for downstream matching.
      hits.add(`${bd}::${refKey}`)
    }
  }
  return hits
}

function rowHasWatchBaseHit(row: SeedRow, hits: Set<string>): boolean {
  const bSlug = brandSlug(row.brand)
  const refKey = row.reference.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!refKey) return false
  return hits.has(`${bSlug}::${refKey}`)
}

function iconicSignalScore(signal: string): number {
  // Higher is better. Used to break ties so refs the catalog already
  // believes are iconic land first.
  if (/core_icon/.test(signal)) return 5
  if (/core_design_icon/.test(signal)) return 5
  if (/curated/.test(signal)) return 4
  if (/reddit/.test(signal)) return 3
  if (/folder_image_candidate|current_catalog/.test(signal)) return 2
  if (/thewatchapi/.test(signal)) return 1
  return 0
}

// ---- family specs ---------------------------------------------------------
//
// Brand strings are matched exactly; modelTest gets model + reference and
// returns true if the row belongs to this family. counts roll up to ~1000.

const FAMILIES: FamilySpec[] = [
  // ===== MAINSTREAM LUXURY (target ~360) =====
  { bucket: 'luxury', label: 'Rolex Submariner', brands: ['Rolex'], modelTest: (m) => /Submariner/i.test(m), count: 35 },
  { bucket: 'luxury', label: 'Rolex GMT-Master II', brands: ['Rolex'], modelTest: (m) => /GMT[- ]Master/i.test(m), count: 30 },
  { bucket: 'luxury', label: 'Rolex Datejust', brands: ['Rolex'], modelTest: (m) => /Datejust/i.test(m), count: 25 },
  { bucket: 'luxury', label: 'Rolex Explorer', brands: ['Rolex'], modelTest: (m) => /Explorer/i.test(m), count: 15 },
  { bucket: 'luxury', label: 'Rolex Oyster Perpetual', brands: ['Rolex'], modelTest: (m) => /Oyster Perpetual$/i.test(m) || /^Oyster Perpetual\b/i.test(m), count: 12 },
  { bucket: 'luxury', label: 'Rolex Daytona', brands: ['Rolex'], modelTest: (m) => /Daytona|Cosmograph/i.test(m), count: 25 },
  { bucket: 'luxury', label: 'Rolex Sea-Dweller', brands: ['Rolex'], modelTest: (m) => /Sea-Dweller|Deepsea/i.test(m), count: 10 },
  { bucket: 'luxury', label: 'Rolex Yacht-Master', brands: ['Rolex'], modelTest: (m) => /Yacht-Master/i.test(m), count: 10 },
  { bucket: 'luxury', label: 'Rolex Air-King', brands: ['Rolex'], modelTest: (m) => /Air-King/i.test(m), count: 5 },
  { bucket: 'luxury', label: 'Rolex Day-Date', brands: ['Rolex'], modelTest: (m) => /Day-Date/i.test(m), count: 15 },
  { bucket: 'luxury', label: 'Rolex Milgauss/1908', brands: ['Rolex'], modelTest: (m) => /Milgauss|1908/i.test(m), count: 6 },
  { bucket: 'luxury', label: 'Omega Speedmaster', brands: ['Omega'], modelTest: (m) => /Speedmaster/i.test(m), count: 35 },
  { bucket: 'luxury', label: 'Omega Seamaster Diver 300M', brands: ['Omega'], modelTest: (m) => /Seamaster Diver 300|Seamaster 300/i.test(m), count: 20 },
  { bucket: 'luxury', label: 'Omega Aqua Terra', brands: ['Omega'], modelTest: (m) => /Aqua Terra/i.test(m), count: 15 },
  { bucket: 'luxury', label: 'Omega Planet Ocean', brands: ['Omega'], modelTest: (m) => /Planet Ocean/i.test(m), count: 10 },
  { bucket: 'luxury', label: 'Omega Railmaster/Constellation/Globemaster', brands: ['Omega'], modelTest: (m) => /Railmaster|Constellation|Globemaster|De Ville/i.test(m), count: 14 },
  { bucket: 'luxury', label: 'Cartier Tank', brands: ['Cartier'], modelTest: (m) => /Tank/i.test(m), count: 12 },
  { bucket: 'luxury', label: 'Cartier Santos', brands: ['Cartier'], modelTest: (m) => /Santos/i.test(m), count: 10 },
  { bucket: 'luxury', label: 'Cartier Ballon Bleu/Panthère/Pasha', brands: ['Cartier'], modelTest: (m) => /Ballon Bleu|Panthère|Panthere|Pasha/i.test(m), count: 8 },
  { bucket: 'luxury', label: 'Breitling Navitimer', brands: ['Breitling'], modelTest: (m) => /Navitimer/i.test(m), count: 10 },
  { bucket: 'luxury', label: 'Breitling Chronomat', brands: ['Breitling'], modelTest: (m) => /Chronomat/i.test(m), count: 8 },
  { bucket: 'luxury', label: 'Breitling SuperOcean/Avenger', brands: ['Breitling'], modelTest: (m) => /Super[Oo]cean|Avenger/i.test(m), count: 10 },
  { bucket: 'luxury', label: 'TAG Heuer Carrera', brands: ['TAG Heuer', 'Tag Heuer'], modelTest: (m) => /Carrera/i.test(m), count: 8 },
  { bucket: 'luxury', label: 'TAG Heuer Monaco/Aquaracer', brands: ['TAG Heuer', 'Tag Heuer'], modelTest: (m) => /Monaco|Aquaracer|Autavia/i.test(m), count: 8 },
  { bucket: 'luxury', label: 'IWC Pilot/Mark', brands: ['IWC'], modelTest: (m) => /Pilot|Mark X|Spitfire|Top Gun/i.test(m), count: 14 },
  { bucket: 'luxury', label: 'IWC Portugieser', brands: ['IWC'], modelTest: (m) => /Portugieser|Portuguese/i.test(m), count: 10 },
  { bucket: 'luxury', label: 'IWC Ingenieur/Portofino/Aquatimer', brands: ['IWC'], modelTest: (m) => /Ingenieur|Portofino|Aquatimer/i.test(m), count: 10 },
  { bucket: 'luxury', label: 'JLC Reverso', brands: ['Jaeger-LeCoultre'], modelTest: (m) => /Reverso/i.test(m), count: 10 },
  { bucket: 'luxury', label: 'JLC Master', brands: ['Jaeger-LeCoultre'], modelTest: (m) => /Master/i.test(m), count: 10 },
  { bucket: 'luxury', label: 'JLC Polaris/Memovox', brands: ['Jaeger-LeCoultre'], modelTest: (m) => /Polaris|Memovox/i.test(m), count: 5 },

  // ===== ENTHUSIAST UPGRADES (target ~360) =====
  { bucket: 'enthusiast', label: 'Tudor Black Bay 54', brands: ['Tudor'], modelTest: (m, r) => /Black Bay 54/i.test(m) || /^7960/.test(r), count: 8 },
  { bucket: 'enthusiast', label: 'Tudor Black Bay 58', brands: ['Tudor'], modelTest: (m, r) => /Black Bay 58|Black Bay Fifty[- ]?Eight/i.test(m) || /^7903/.test(r), count: 25 },
  { bucket: 'enthusiast', label: 'Tudor Black Bay GMT', brands: ['Tudor'], modelTest: (m) => /Black Bay GMT/i.test(m), count: 12 },
  { bucket: 'enthusiast', label: 'Tudor Black Bay Pro/Chrono', brands: ['Tudor'], modelTest: (m) => /Black Bay Pro|Black Bay Chrono/i.test(m), count: 12 },
  { bucket: 'enthusiast', label: 'Tudor Black Bay (other)', brands: ['Tudor'], modelTest: (m) => /Black Bay/i.test(m) && !/54|58|GMT|Pro|Chrono|Fifty/i.test(m), count: 15 },
  { bucket: 'enthusiast', label: 'Tudor Pelagos', brands: ['Tudor'], modelTest: (m) => /Pelagos/i.test(m), count: 15 },
  { bucket: 'enthusiast', label: 'Tudor Ranger/1926/Royal', brands: ['Tudor'], modelTest: (m) => /Ranger|1926|Royal/i.test(m), count: 10 },
  { bucket: 'enthusiast', label: 'Longines HydroConquest (modern L3.78x)', brands: ['Longines'], modelTest: (m, r) => /HydroConquest|Hydroconquest/i.test(m) && /L3\.78[012]/i.test(r), count: 99, takeAll: true },
  { bucket: 'enthusiast', label: 'Longines Spirit', brands: ['Longines'], modelTest: (m) => /Spirit/i.test(m), count: 12 },
  { bucket: 'enthusiast', label: 'Longines Legend Diver', brands: ['Longines'], modelTest: (m) => /Legend Diver/i.test(m), count: 6 },
  { bucket: 'enthusiast', label: 'Longines Master Collection', brands: ['Longines'], modelTest: (m) => /Master Collection|^Master\b/i.test(m), count: 10 },
  { bucket: 'enthusiast', label: 'Longines Conquest/DolceVita', brands: ['Longines'], modelTest: (m) => /^Conquest\b|DolceVita|Dolce Vita/i.test(m), count: 8 },
  { bucket: 'enthusiast', label: 'Oris Aquis', brands: ['Oris'], modelTest: (m) => /Aquis/i.test(m), count: 22 },
  { bucket: 'enthusiast', label: 'Oris Big Crown', brands: ['Oris'], modelTest: (m) => /Big Crown/i.test(m), count: 10 },
  { bucket: 'enthusiast', label: 'Oris Divers Sixty-Five', brands: ['Oris'], modelTest: (m) => /Divers Sixty[- ]?Five|Divers 65/i.test(m), count: 12 },
  { bucket: 'enthusiast', label: 'Oris ProPilot', brands: ['Oris'], modelTest: (m) => /ProPilot|Pro Pilot/i.test(m), count: 6 },
  { bucket: 'enthusiast', label: 'Sinn (all)', brands: ['Sinn'], modelTest: () => true, count: 30 },
  { bucket: 'enthusiast', label: 'Nomos Tangente', brands: ['Nomos Glashütte', 'NOMOS'], modelTest: (m) => /Tangente/i.test(m), count: 18 },
  { bucket: 'enthusiast', label: 'Nomos Club', brands: ['Nomos Glashütte', 'NOMOS'], modelTest: (m) => /\bClub\b/i.test(m), count: 12 },
  { bucket: 'enthusiast', label: 'Nomos Orion', brands: ['Nomos Glashütte', 'NOMOS'], modelTest: (m) => /Orion/i.test(m), count: 8 },
  { bucket: 'enthusiast', label: 'Nomos Metro', brands: ['Nomos Glashütte', 'NOMOS'], modelTest: (m) => /Metro/i.test(m), count: 6 },
  { bucket: 'enthusiast', label: 'Nomos Ludwig', brands: ['Nomos Glashütte', 'NOMOS'], modelTest: (m) => /Ludwig/i.test(m), count: 8 },
  { bucket: 'enthusiast', label: 'Nomos Ahoi', brands: ['Nomos Glashütte', 'NOMOS'], modelTest: (m) => /Ahoi/i.test(m), count: 5 },
  { bucket: 'enthusiast', label: 'Mido Multifort', brands: ['Mido'], modelTest: (m) => /Multifort/i.test(m), count: 10 },
  { bucket: 'enthusiast', label: 'Mido Ocean Star', brands: ['Mido'], modelTest: (m) => /Ocean Star/i.test(m), count: 10 },
  { bucket: 'enthusiast', label: 'Mido Commander', brands: ['Mido'], modelTest: (m) => /Commander/i.test(m), count: 8 },
  { bucket: 'enthusiast', label: 'Mido Baroncelli', brands: ['Mido'], modelTest: (m) => /Baroncelli/i.test(m), count: 8 },
  { bucket: 'enthusiast', label: 'Christopher Ward (all)', brands: ['Christopher Ward'], modelTest: () => true, count: 8 },
  { bucket: 'enthusiast', label: 'Doxa Sub', brands: ['Doxa'], modelTest: () => true, count: 12 },
  { bucket: 'enthusiast', label: 'Unimatic', brands: ['Unimatic'], modelTest: () => true, count: 12 },

  // ===== REDDIT STAPLES (target ~200) =====
  { bucket: 'reddit', label: 'Seiko Alpinist', brands: ['Seiko'], modelTest: (m) => /Alpinist/i.test(m), count: 6 },
  { bucket: 'reddit', label: 'Seiko SKX', brands: ['Seiko'], modelTest: (m) => /SKX/i.test(m), count: 4 },
  { bucket: 'reddit', label: 'Seiko 5 Sports', brands: ['Seiko'], modelTest: (m) => /^5 Sports|Seiko 5 Sports/i.test(m), count: 10 },
  { bucket: 'reddit', label: 'Seiko Prospex divers', brands: ['Seiko'], modelTest: (m) => /Prospex.*(Diver|Turtle|Willard|62MAS|1965)/i.test(m), count: 12 },
  { bucket: 'reddit', label: 'Seiko Presage', brands: ['Seiko'], modelTest: (m) => /Presage/i.test(m), count: 8 },
  { bucket: 'reddit', label: 'Seiko Speedtimer', brands: ['Seiko'], modelTest: (m) => /Speedtimer/i.test(m), count: 4 },
  { bucket: 'reddit', label: 'Seiko Mechanical/SARB', brands: ['Seiko'], modelTest: (m) => /Mechanical|SARB/i.test(m), count: 8 },
  { bucket: 'reddit', label: 'Grand Seiko Heritage/Snowflake', brands: ['Grand Seiko'], modelTest: (m) => /Heritage|Snowflake|White Birch|Shunbun|44GS/i.test(m), count: 20 },
  { bucket: 'reddit', label: 'Grand Seiko Spring Drive/SBGA/SBGE', brands: ['Grand Seiko'], modelTest: (m, r) => /Spring Drive|Snowflake/i.test(m) || /^SBGA|^SBGE/i.test(r), count: 12 },
  { bucket: 'reddit', label: 'Grand Seiko (other modern)', brands: ['Grand Seiko'], modelTest: (m, r) => /Elegance|Sport|Evolution|Tentagraph/i.test(m) || /^SBGW|^SBGX|^SBGN|^SBGJ|^SBGV/i.test(r), count: 12 },
  { bucket: 'reddit', label: 'Hamilton Khaki Field', brands: ['Hamilton'], modelTest: (m) => /Khaki Field/i.test(m), count: 22 },
  { bucket: 'reddit', label: 'Hamilton Khaki Navy/King/Aviation', brands: ['Hamilton'], modelTest: (m) => /Khaki Navy|Khaki King|Khaki Aviation/i.test(m), count: 12 },
  { bucket: 'reddit', label: 'Hamilton Murph/Intra-Matic', brands: ['Hamilton'], modelTest: (m) => /Murph|Intra-Matic/i.test(m), count: 8 },
  { bucket: 'reddit', label: 'Hamilton Jazzmaster', brands: ['Hamilton'], modelTest: (m) => /Jazzmaster/i.test(m), count: 10 },
  { bucket: 'reddit', label: 'Tissot PRX', brands: ['Tissot'], modelTest: (m) => /PRX/i.test(m), count: 15 },
  { bucket: 'reddit', label: 'Tissot Gentleman', brands: ['Tissot'], modelTest: (m) => /Gentleman/i.test(m), count: 8 },
  { bucket: 'reddit', label: 'Tissot Seastar', brands: ['Tissot'], modelTest: (m) => /Seastar/i.test(m), count: 8 },
  { bucket: 'reddit', label: 'Tissot Le Locle/Heritage', brands: ['Tissot'], modelTest: (m) => /Le Locle|Heritage 1938|Visodate/i.test(m), count: 8 },
  { bucket: 'reddit', label: 'Casio (any)', brands: ['Casio'], modelTest: () => true, count: 15 },
  { bucket: 'reddit', label: 'Orient (any)', brands: ['Orient', 'Orient Star'], modelTest: () => true, count: 12 },
  { bucket: 'reddit', label: 'Citizen (any)', brands: ['Citizen'], modelTest: () => true, count: 10 },
  { bucket: 'reddit', label: 'Swatch MoonSwatch', brands: ['Swatch'], modelTest: (m) => /MoonSwatch/i.test(m), count: 15 },
  { bucket: 'reddit', label: 'Bulova Lunar Pilot', brands: ['Bulova'], modelTest: (m) => /Lunar Pilot/i.test(m), count: 6 },
  { bucket: 'reddit', label: 'Timex Marlin/Q', brands: ['Timex'], modelTest: () => true, count: 8 },
  { bucket: 'enthusiast', label: 'Baltic (all)', brands: ['Baltic'], modelTest: () => true, count: 8 },
  { bucket: 'enthusiast', label: 'Lorier (all)', brands: ['Lorier'], modelTest: () => true, count: 6 },
  { bucket: 'enthusiast', label: 'Traska (all)', brands: ['Traska'], modelTest: () => true, count: 6 },
  { bucket: 'enthusiast', label: 'Farer (all)', brands: ['Farer'], modelTest: () => true, count: 5 },
  { bucket: 'enthusiast', label: 'Monta (all)', brands: ['Monta'], modelTest: () => true, count: 5 },
  { bucket: 'enthusiast', label: 'Nodus (all)', brands: ['Nodus'], modelTest: () => true, count: 4 },
  { bucket: 'enthusiast', label: 'Brew (all)', brands: ['Brew'], modelTest: () => true, count: 3 },
  { bucket: 'enthusiast', label: 'Vaer (all)', brands: ['Vaer'], modelTest: () => true, count: 4 },
  { bucket: 'enthusiast', label: 'Zelos (all)', brands: ['Zelos'], modelTest: () => true, count: 4 },
  { bucket: 'enthusiast', label: 'Formex (all)', brands: ['Formex'], modelTest: () => true, count: 10 },

  // ===== GRAIL / HALO (target ~100) =====
  { bucket: 'grail', label: 'Patek Nautilus', brands: ['Patek Philippe'], modelTest: (m) => /Nautilus/i.test(m), count: 15 },
  { bucket: 'grail', label: 'Patek Aquanaut', brands: ['Patek Philippe'], modelTest: (m) => /Aquanaut/i.test(m), count: 8 },
  { bucket: 'grail', label: 'Patek Calatrava', brands: ['Patek Philippe'], modelTest: (m) => /Calatrava/i.test(m), count: 8 },
  { bucket: 'grail', label: 'Patek Annual Calendar/World Time', brands: ['Patek Philippe'], modelTest: (m) => /Annual Calendar|World Time|Ellipse/i.test(m), count: 6 },
  { bucket: 'grail', label: 'AP Royal Oak', brands: ['Audemars Piguet'], modelTest: (m) => /Royal Oak(?! Offshore)/i.test(m), count: 16 },
  { bucket: 'grail', label: 'AP Royal Oak Offshore/Code 11.59', brands: ['Audemars Piguet'], modelTest: (m) => /Offshore|Code 11\.59/i.test(m), count: 10 },
  { bucket: 'grail', label: 'VC Overseas', brands: ['Vacheron Constantin'], modelTest: (m) => /Overseas/i.test(m), count: 10 },
  { bucket: 'grail', label: 'VC Patrimony/Traditionnelle/Fiftysix', brands: ['Vacheron Constantin'], modelTest: (m) => /Patrimony|Traditionnelle|Fiftysix|Historiques|222/i.test(m), count: 8 },
  { bucket: 'grail', label: 'Lange 1', brands: ['A. Lange & Söhne'], modelTest: (m) => /Lange 1/i.test(m), count: 8 },
  { bucket: 'grail', label: 'Lange Saxonia/1815/Odysseus/Datograph', brands: ['A. Lange & Söhne'], modelTest: (m) => /Saxonia|1815|Odysseus|Datograph|Zeitwerk/i.test(m), count: 12 },
  { bucket: 'grail', label: 'Zenith Chronomaster/El Primero', brands: ['Zenith'], modelTest: (m) => /Chronomaster|El Primero/i.test(m), count: 6 },
  { bucket: 'grail', label: 'Zenith Defy/Pilot', brands: ['Zenith'], modelTest: (m) => /Defy|Pilot/i.test(m), count: 5 },
  { bucket: 'grail', label: 'Blancpain Fifty Fathoms/Bathyscaphe', brands: ['Blancpain'], modelTest: (m) => /Fifty Fathoms|Bathyscaphe|Villeret/i.test(m), count: 8 },
  { bucket: 'grail', label: 'Breguet Classique/Type XX/Marine', brands: ['Breguet'], modelTest: (m) => /Classique|Type XX|Marine/i.test(m), count: 6 },
]

// ---- main -----------------------------------------------------------------

function main() {
  const text = fs.readFileSync(SEED_CSV, 'utf8')
  const seed = parseCsv(text)
  const wbHits = loadWatchBaseHits()

  // Build per-family selections + collision detection (a row shouldn't end
  // up in two families even if its model matches multiple patterns).
  const claimed = new Set<string>()
  const selected: { fam: FamilySpec; row: SeedRow }[] = []
  const familyStats: Record<string, { matched: number; picked: number; wbHits: number }> = {}

  for (const fam of FAMILIES) {
    const matches = seed.filter(
      r =>
        fam.brands.includes(r.brand) &&
        fam.modelTest(r.model, r.reference) &&
        !claimed.has(r.id)
    )

    const sorted = matches
      .map(r => ({
        r,
        wb: rowHasWatchBaseHit(r, wbHits) ? 1 : 0,
        sig: iconicSignalScore(r.communitySignal),
      }))
      .sort((a, b) => {
        if (b.wb !== a.wb) return b.wb - a.wb
        if (b.sig !== a.sig) return b.sig - a.sig
        return a.r.id.localeCompare(b.r.id)
      })
      .map(x => x.r)

    const take = fam.takeAll ? sorted : sorted.slice(0, fam.count)
    let wbForFam = 0
    for (const r of take) {
      claimed.add(r.id)
      selected.push({ fam, row: r })
      if (rowHasWatchBaseHit(r, wbHits)) wbForFam++
    }
    familyStats[fam.label] = {
      matched: matches.length,
      picked: take.length,
      wbHits: wbForFam,
    }
  }

  // ---- write CSV ----
  const header = 'id,brand,model,reference,dialColor,watchType,sourceUrl,communitySignal,verificationStatus'
  const lines = [header]
  for (const { row } of selected) {
    lines.push(
      [
        row.id,
        row.brand,
        row.model,
        row.reference,
        row.dialColor,
        row.watchType,
        row.sourceUrl,
        row.communitySignal,
        row.verificationStatus,
      ]
        .map(csvEscape)
        .join(',')
    )
  }
  fs.writeFileSync(BATCH_CSV, lines.join('\n') + '\n')

  // ---- report ----
  console.log(`Wrote ${selected.length} refs to ${path.relative(ROOT, BATCH_CSV)}`)
  console.log('')

  const byBucket: Record<string, number> = {}
  const byBrand: Record<string, number> = {}
  let wbHitsTotal = 0
  for (const { fam, row } of selected) {
    byBucket[fam.bucket] = (byBucket[fam.bucket] ?? 0) + 1
    byBrand[row.brand] = (byBrand[row.brand] ?? 0) + 1
    if (rowHasWatchBaseHit(row, wbHits)) wbHitsTotal++
  }
  console.log('By bucket:')
  for (const [b, n] of Object.entries(byBucket).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${b.padEnd(12)} ${n}`)
  }
  console.log('')
  console.log('By brand (top 25):')
  const brandRows = Object.entries(byBrand).sort((a, b) => b[1] - a[1]).slice(0, 25)
  for (const [b, n] of brandRows) {
    console.log(`  ${b.padEnd(28)} ${n}`)
  }
  console.log('')
  console.log(
    `WatchBase cache hits: ${wbHitsTotal} / ${selected.length} (${((100 * wbHitsTotal) / selected.length).toFixed(1)}%)`
  )
  console.log('')
  console.log('Family detail (matched | picked | wb-cached):')
  for (const fam of FAMILIES) {
    const s = familyStats[fam.label]
    const mark = s.picked < fam.count && !fam.takeAll ? ' <-- short' : ''
    console.log(
      `  ${fam.label.padEnd(48)} ${String(s.matched).padStart(5)} | ${String(s.picked).padStart(4)} | ${String(s.wbHits).padStart(4)}${mark}`
    )
  }
}

main()
