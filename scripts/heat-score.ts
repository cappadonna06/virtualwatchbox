/**
 * Heat score (0-1000) for any catalog watch.
 *
 * Used immediately for prioritizing which watches get images, and later
 * for hero ranking, news scoring, suggest-watch algos, and the
 * catalog_watch_market.heat_score column.
 *
 * Composition (sums to max 1000):
 *
 *   brandTier            0-350    Editorial brand prestige bracket
 *   marketActivity       0-300    chrono24-big listing count (log scaled)
 *   curationSignal       0-200    communitySignal from seed CSV
 *   sourceCorroboration  0-100    Number of independent sources for this ref
 *   nicknameBonus        0-50     Match against an iconic-model nickname list
 *
 * Signals NOT used (yet):
 *   - Reddit mentions       (would need a scrape job; future enhancement)
 *   - News mentions         (same)
 *   - User engagement       (we have 0 users yet)
 *   - Image presence        (that's the OUTPUT we're prioritizing — would be circular)
 */

export type HeatSignals = {
  brand: string
  model: string
  modelFamily?: string | null
  reference: string
  communitySignal?: string | null
  /** Number of unique sources that contributed at least one field to this record. */
  sourceCount: number
  /** Number of chrono24-big listings for this (brand, ref). */
  chrono24ListingCount?: number
  /** Number of luxury163k listings for this (brand, ref). */
  luxury163kListingCount?: number
}

type BrandTier = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

// Editorial brand tiers. Conservative — moving a brand up requires the
// collector community to consistently rank it at that level, not just one
// flagship piece. Reference: r/Watches "watch tier list" consensus,
// Hodinkee/Bring a Loupe coverage frequency, auction-house catalogues.
const BRAND_TIERS: Record<BrandTier, string[]> = {
  S: ['patek philippe', 'audemars piguet', 'a. lange & söhne', 'a. lange and söhne', 'vacheron constantin', 'richard mille', 'rolex', 'f.p. journe', 'philippe dufour'],
  A: ['omega', 'cartier', 'jaeger-lecoultre', 'jaeger lecoultre', 'tudor', 'iwc', 'breguet', 'blancpain', 'h. moser & cie', 'glashütte original', 'piaget'],
  B: ['breitling', 'panerai', 'zenith', 'grand seiko', 'hublot', 'tag heuer', 'mb&f', 'urwerk', 'parmigiani fleurier', 'chopard', 'roger dubuis', 'girard perregaux'],
  C: ['longines', 'nomos glashütte', 'nomos', 'oris', 'bell & ross', 'bell and ross', 'baume & mercier', 'baume and mercier', 'frederique constant', 'maurice lacroix', 'rado', 'tissot', 'hamilton'],
  D: ['sinn', 'mido', 'doxa', 'junghans', 'christopher ward', 'meistersinger', 'farer', 'monta', 'lorier', 'oak & oscar', 'unimatic'],
  E: ['citizen', 'seiko', 'casio', 'orient', 'g-shock', 'bulova', 'tag heuer formula 1'],
  F: [],
}

const TIER_POINTS: Record<BrandTier, number> = {
  S: 350,
  A: 290,
  B: 220,
  C: 160,
  D: 100,
  E: 60,
  F: 30,
}

function normalizeBrand(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function brandTierFor(brand: string): BrandTier {
  const target = normalizeBrand(brand)
  for (const [tier, brands] of Object.entries(BRAND_TIERS) as Array<[BrandTier, string[]]>) {
    for (const b of brands) {
      if (normalizeBrand(b) === target) return tier
    }
  }
  return 'F'
}

// Iconic-model nickname matchers. Each row gets at most +50 (no compounding).
const NICKNAME_PATTERNS: RegExp[] = [
  // Rolex
  /\b(submariner|sea[\s-]?dweller|gmt[\s-]?master|cosmograph\s+daytona|daytona|datejust|day[\s-]?date|explorer|yacht[\s-]?master|cellini|milgauss|air[\s-]?king|deepsea|sky[\s-]?dweller)\b/i,
  /\boyster\s*perpetual\b/i,
  // Omega
  /\b(speedmaster|seamaster|constellation|de\s*ville|aqua\s*terra|planet\s*ocean|moonwatch|trilogy|railmaster)\b/i,
  // Patek Philippe
  /\b(nautilus|aquanaut|calatrava|gondolo|twenty[\s~-]?4|complications|world\s*time|grandmaster\s*chime)\b/i,
  // Audemars Piguet
  /\b(royal\s*oak(?:\s*offshore)?|code\s*11\.?59|millenary|jules\s*audemars)\b/i,
  // Jaeger-LeCoultre
  /\b(reverso|polaris|master\s*(?:control|ultra|grand|compressor)|atmos|geophysic|memovox)\b/i,
  // Tudor
  /\b(black\s*bay|pelagos|royal\b|prince\s*date|north\s*flag|ranger|heritage\s*chrono)\b/i,
  // IWC
  /\b(big\s*pilot|portugieser|portuguese|aquatimer|portofino|ingenieur|pilot[''']*s\s*watch|mark\s+(?:xv|xvi|xvii|xviii)|top\s*gun)\b/i,
  // TAG Heuer
  /\b(carrera|aquaracer|monaco|autavia|heuer\s+02|formula\s*1)\b/i,
  // Breitling
  /\b(navitimer|superocean|chronomat|avenger|premier|emergency|aerospace|colt|navigator)\b/i,
  // Panerai
  /\b(luminor|radiomir|submersible|mare\s*nostrum)\b/i,
  // A. Lange & Söhne
  /\b(lange\s*1|datograph|1815|saxonia|odysseus|zeitwerk|grand\s*lange|richard\s*lange)\b/i,
  // Vacheron Constantin
  /\b(patrimony|overseas|traditionnelle|fiftysix|historiques|harmony|métiers)\b/i,
  // Zenith
  /\b(el\s*primero|chronomaster|defy|pilot\s*type|elite)\b/i,
  // Cartier
  /\b(tank(?:\s+(?:must|francaise|americaine|solo|cintree|louis|chinois|asymmetrique))?|santos|ballon\s*bleu|pasha|drive|cle|crash|rotonde|baignoire)\b/i,
  // Blancpain
  /\b(fifty\s*fathoms|villeret|air\s*command|l-?evolution)\b/i,
  // Hublot
  /\b(big\s*bang|classic\s*fusion|spirit\s*of\s*big\s*bang|mp[\s-]?(?:09|11|15))\b/i,
  // Grand Seiko
  /\b(snowflake|spring\s*drive|sbga|sbgj|sbgk|sbgw|sbga\d|sbgr|sbgh|sbgm|evolution\s*9)\b/i,
  // Nomos
  /\b(tangente|orion|metro|club\s*campus|ahoi|tetra|ludwig|zürich)\b/i,
  // F.P. Journe
  /\b(chronomètre|tourbillon\s*souverain|octa|elegante|centigraphe|sonnerie)\b/i,
  // Richard Mille
  /\brm\s*\d{2,3}(-\d{2})?\b/i,
]

const COMMUNITY_SIGNAL_POINTS: Record<string, number> = {
  core_icon: 200,
  curated: 180,
  enthusiast_icon: 160,
  style_icon: 140,
  enthusiast_value: 120,
  core_design_icon: 130,
  heritage_pick: 100,
  reddit_icon: 110,
  entry_icon: 90,
  enthusiast_favorite: 100,
  enthusiast_pick: 90,
  entry_value: 80,
  reddit_sotc_signal: 70,
  reddit_under_5k_signal: 70,
  reddit_nomos_gs_signal: 60,
  reddit_grandseiko_signal: 60,
  reddit_sinn_thread_signal: 60,
  reddit_collection_strategy_signal: 55,
  current_catalog: 50,
  brand_variety: 40,
  folder_image_candidate: 35,
  'thewatchapi:ref-list': 25,
  'kaggle:watch_db': 20,
}

function curationPoints(signal: string | null | undefined): number {
  if (!signal) return 0
  return COMMUNITY_SIGNAL_POINTS[signal] ?? 15
}

function marketActivityPoints(chrono24Count: number | undefined, luxury163kCount: number | undefined): number {
  // Use the larger of the two listing counts (each measures slightly
  // different markets but both proxy demand). Log-scale: rare 1 listing
  // barely registers; a flooded 200+ listing market caps out.
  const n = Math.max(chrono24Count ?? 0, luxury163kCount ?? 0)
  if (n <= 0) return 0
  // 1 → 50, 5 → 130, 20 → 200, 50 → 245, 100 → 275, 200 → 300, 500+ → 300
  const score = Math.round(50 + 150 * Math.log10(Math.max(1, n)))
  return Math.min(300, score)
}

function sourceCorroborationPoints(sourceCount: number): number {
  // 1 source = 20 pts (just seed), 2 = 50, 3 = 75, 4+ = 100.
  if (sourceCount <= 1) return 20
  if (sourceCount === 2) return 50
  if (sourceCount === 3) return 75
  return 100
}

function nicknameBonus(model: string, family: string | null | undefined): number {
  const blob = `${model ?? ''} ${family ?? ''}`
  for (const re of NICKNAME_PATTERNS) {
    if (re.test(blob)) return 50
  }
  return 0
}

export function computeHeatScore(signals: HeatSignals): {
  heatScore: number
  breakdown: {
    brandTier: { value: BrandTier; points: number }
    marketActivity: number
    curationSignal: number
    sourceCorroboration: number
    nicknameBonus: number
  }
} {
  const tier = brandTierFor(signals.brand)
  const brandPoints = TIER_POINTS[tier]
  const market = marketActivityPoints(signals.chrono24ListingCount, signals.luxury163kListingCount)
  const curation = curationPoints(signals.communitySignal)
  const corroboration = sourceCorroborationPoints(signals.sourceCount)
  const nickname = nicknameBonus(signals.model, signals.modelFamily ?? null)

  const total = Math.min(1000, brandPoints + market + curation + corroboration + nickname)

  return {
    heatScore: total,
    breakdown: {
      brandTier: { value: tier, points: brandPoints },
      marketActivity: market,
      curationSignal: curation,
      sourceCorroboration: corroboration,
      nicknameBonus: nickname,
    },
  }
}
