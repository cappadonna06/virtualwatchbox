// lib/discoverUpgradePaths.ts
// Hardcoded upgrade chains for Discover "Upgrade This Watch" feature.
// Keys are watch IDs from lib/watches.ts.
// Values are ordered arrays of upgrade watch IDs (ascending tier).
// Supplement with algorithmic logic in lib/discover.ts.

export const UPGRADE_PATHS: Record<string, string[]> = {

  // ── DIVERS ──────────────────────────────────────────────────────────
  // Seiko SKX / 5 Sports → Tudor BB58 → Rolex Submariner
  'seiko-skx007':           ['tudor-black-bay-58', 'rolex-submariner'],
  'seiko-5-sports':         ['tudor-black-bay-58', 'omega-seamaster-300m'],
  // Tudor Pelagos → Rolex Submariner → Rolex Sea-Dweller
  'tudor-pelagos':          ['rolex-submariner', 'rolex-sea-dweller'],
  'tudor-black-bay-58':     ['rolex-submariner', 'omega-seamaster-300m'],
  // Omega Seamaster → Rolex Submariner
  'omega-seamaster-300m':   ['rolex-submariner'],

  // ── FIELD / EXPLORER ────────────────────────────────────────────────
  // Seiko Alpinist → Tudor Ranger → Rolex Explorer
  'seiko-alpinist':         ['tudor-ranger', 'rolex-explorer'],
  'hamilton-khaki-field':   ['tudor-ranger', 'iwc-pilot-mark-xx'],
  'tudor-ranger':           ['rolex-explorer', 'iwc-pilot-mark-xx'],
  // IWC Pilot Mark XX → IWC Big Pilot
  'iwc-pilot-mark-xx':      ['iwc-big-pilot', 'rolex-explorer'],

  // ── GMT / TRAVEL ─────────────────────────────────────────────────────
  // Seiko GMT → Tudor BB GMT → Rolex GMT Master II
  'seiko-gmt':              ['tudor-black-bay-gmt', 'rolex-gmt-master-ii'],
  'tudor-black-bay-gmt':    ['rolex-gmt-master-ii', 'iwc-pilot-utc'],
  'longines-zulu-time':     ['tudor-black-bay-gmt', 'rolex-gmt-master-ii'],

  // ── CHRONOGRAPH ──────────────────────────────────────────────────────
  // Seiko Speedtimer → Tudor BB Chrono → Omega Speedmaster Pro
  'seiko-speedtimer':       ['tudor-black-bay-chrono', 'omega-speedmaster-professional'],
  'tudor-black-bay-chrono': ['omega-speedmaster-professional', 'zenith-chronomaster'],
  'omega-speedmaster-professional': ['zenith-chronomaster-original', 'rolex-daytona'],

  // ── DRESS ────────────────────────────────────────────────────────────
  // Orient Bambino → Longines Master → JLC Reverso
  'orient-bambino':         ['longines-master-collection', 'cartier-tank-must'],
  'longines-master-collection': ['jaeger-lecoultre-reverso', 'cartier-santos-dumont'],
  'longines-flagship':      ['jaeger-lecoultre-master-ultra-thin', 'cartier-tank-must'],
  // Dress moonphase chain
  'longines-master-moonphase': ['jaeger-lecoultre-master-ultra-thin-moon', 'patek-philippe-annual-calendar'],

  // ── INTEGRATED BRACELET / DAILY ──────────────────────────────────────
  // Tissot PRX → Tudor Royal → Rolex Datejust
  'tissot-prx':             ['tudor-royal', 'rolex-datejust'],
  'tudor-royal':            ['rolex-datejust', 'rolex-oyster-perpetual'],
  'omega-aqua-terra':       ['rolex-datejust', 'rolex-oyster-perpetual'],

  // ── SPORT / VERSATILE ────────────────────────────────────────────────
  // Grand Seiko Sport → Rolex Explorer II
  'grand-seiko-sbgx335':   ['rolex-explorer-ii'],
  'grand-seiko-hi-beat':    ['rolex-datejust', 'patek-philippe-5711'],

}

// Watch type role descriptions — used in AI prompt context
// to help generate accurate balance notes
export const WATCH_TYPE_ROLES: Record<string, string> = {
  'Diver':               'rugged everyday / water-sport slot',
  'Field':               'casual daily / adventure tool slot',
  'GMT':                 'travel / dual-timezone slot',
  'Chronograph':         'sport complication slot',
  'Dress':               'formal / complication slot',
  'Integrated Bracelet': 'versatile bracelet daily slot',
  'Pilot':               'legible field / aviation slot',
  'Sport':               'active lifestyle slot',
  'Vintage':             'heritage / statement slot',
}

// Brand tier map — used for algorithmic upgrade fallback
// when no hardcoded path exists
export const BRAND_TIERS: Record<string, number> = {
  // Tier 1 — Entry
  'Seiko': 1, 'Citizen': 1, 'Orient': 1, 'Casio': 1,
  'Timex': 1, 'Fossil': 1,
  // Tier 2 — Accessible Swiss
  'Tissot': 2, 'Hamilton': 2, 'Longines': 2, 'Mido': 2,
  'Frederique Constant': 2, 'Alpina': 2, 'Victorinox': 2,
  // Tier 3 — Mid Swiss
  'TAG Heuer': 3, 'Oris': 3, 'Tudor': 3, 'Breitling': 3,
  'Rado': 3, 'Certina': 3, 'Ball': 3,
  // Tier 4 — Prestige
  'Omega': 4, 'IWC': 4, 'Zenith': 4, 'Panerai': 4,
  'Grand Seiko': 4, 'Cartier': 4, 'Jaeger-LeCoultre': 4,
  'Chopard': 4, 'Baume & Mercier': 4,
  // Tier 5 — Luxury
  'Rolex': 5, 'A. Lange & Söhne': 5, 'Hublot': 5,
  'Blancpain': 5, 'Breguet': 5,
  // Tier 6 — Ultra
  'Patek Philippe': 6, 'Audemars Piguet': 6,
  'Vacheron Constantin': 6, 'F.P. Journe': 6, 'Richard Mille': 6,
}
