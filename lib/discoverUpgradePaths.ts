// Hardcoded upgrade chains for the Discover "Upgrade This Watch" feature.
// Keys and values are catalog IDs from lib/watches.ts. Algorithmic fallback
// in lib/discover.ts handles owned watches not listed here.

export const UPGRADE_PATHS: Record<string, string[]> = {
  // ── DIVERS ──────────────────────────────────────────────────────────
  'seiko-skx007':                ['tudor-black-bay-58', 'rolex-submariner-date'],
  'seiko-62mas-reissue-spb077':  ['tudor-black-bay-58', 'omega-seamaster-300m-blue'],
  'tudor-pelagos-39':            ['rolex-submariner-date', 'rolex-sea-dweller'],
  'tudor-black-bay-58':          ['rolex-submariner-date', 'omega-seamaster-300m-blue'],
  'tudor-black-bay-41':          ['rolex-submariner-no-date', 'rolex-submariner-date'],
  'omega-seamaster-300m-blue':   ['rolex-submariner-date', 'rolex-sea-dweller'],
  'rolex-submariner-no-date':    ['rolex-submariner-date', 'rolex-sea-dweller'],

  // ── FIELD / EXPLORER ────────────────────────────────────────────────
  'seiko-alpinist-spb143':       ['tudor-ranger', 'rolex-explorer-i'],
  'hamilton-khaki-field-mechanical': ['tudor-ranger', 'iwc-mark-xx-blue'],
  'longines-spirit':             ['tudor-ranger', 'rolex-explorer-i'],
  'tudor-ranger':                ['rolex-explorer-i', 'rolex-explorer-ii'],
  'rolex-explorer-i':            ['rolex-explorer-ii', 'rolex-datejust-blue'],
  'omega-railmaster-grey':       ['rolex-explorer-i', 'rolex-explorer-ii'],

  // ── PILOT ───────────────────────────────────────────────────────────
  'hamilton-khaki-aviation-pilot-day-date': ['iwc-mark-xx-blue', 'iwc-big-pilot'],
  'iwc-mark-xx-blue':            ['iwc-big-pilot', 'rolex-explorer-i'],

  // ── GMT / TRAVEL ────────────────────────────────────────────────────
  'seiko-5-sports-gmt-ssk001':   ['tudor-black-bay-gmt', 'rolex-gmt-master-ii-pepsi'],
  'tudor-black-bay-gmt':         ['rolex-gmt-master-ii-batman', 'rolex-gmt-master-ii-pepsi'],
  'longines-zulu-time':          ['tudor-black-bay-gmt', 'rolex-gmt-master-ii-pepsi'],
  'tag-autavia-gmt':             ['tudor-black-bay-gmt', 'rolex-gmt-master-ii-pepsi'],
  'breitling-avenger-gmt':       ['rolex-explorer-ii', 'rolex-gmt-master-ii-pepsi'],
  'grandseiko-sport-gmt':        ['tudor-black-bay-gmt', 'rolex-gmt-master-ii-pepsi'],
  'grandseiko-sbgm221':          ['tudor-black-bay-gmt', 'rolex-gmt-master-ii-pepsi'],

  // ── CHRONOGRAPH ─────────────────────────────────────────────────────
  'tudor-black-bay-chrono':      ['omega-speedmaster-moonwatch', 'zenith-chronomaster-original'],
  'tag-carrera-chrono':          ['tudor-black-bay-chrono', 'omega-speedmaster-moonwatch'],
  'omega-speedmaster-moonwatch': ['zenith-chronomaster-original', 'rolex-daytona-white'],
  'iwc-portugieser-chrono':      ['zenith-chronomaster-original', 'rolex-daytona-white'],

  // ── DRESS ───────────────────────────────────────────────────────────
  'orient-bambino':              ['longines-master-collection', 'cartier-tank-must-large'],
  'longines-master-collection':  ['jaeger-lecoultre-reverso-classic', 'cartier-tank-must-large'],
  'longines-master-moonphase':   ['jaeger-lecoultre-master-ultra-thin-moon', 'patek-calatrava-ivory'],
  'cartier-tank-must-large':     ['jaeger-lecoultre-reverso-classic', 'cartier-santos-dumont'],
  'jaeger-lecoultre-reverso-classic': ['jaeger-lecoultre-master-ultra-thin-moon', 'patek-calatrava-ivory'],

  // ── INTEGRATED BRACELET / DAILY ─────────────────────────────────────
  'tissot-prx-powermatic-80':    ['tudor-royal-blue', 'rolex-datejust-blue'],
  'tudor-royal-blue':            ['rolex-datejust-blue', 'rolex-oyster-perpetual'],
  'omega-aqua-terra-green':      ['rolex-datejust-blue', 'rolex-oyster-perpetual'],
  'omega-seamaster-aqua-terra-blue': ['rolex-datejust-blue', 'rolex-oyster-perpetual'],
  'cartier-santos-medium':       ['rolex-datejust-blue', 'patek-nautilus-blue'],

  // ── SPORT / VERSATILE ───────────────────────────────────────────────
  'grand-seiko-sbgx335':         ['rolex-explorer-ii', 'rolex-explorer-i'],
  'grand-seiko-hi-beat-36000-blue': ['rolex-datejust-blue', 'patek-nautilus-blue'],
  'sinn-556-010':                ['tudor-ranger', 'rolex-explorer-i'],
}

// Watch type role descriptions used in copy generation.
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

// Brand tier map for algorithmic upgrade fallback.
export const BRAND_TIERS: Record<string, number> = {
  // Tier 1 — Entry
  'Seiko': 1, 'Citizen': 1, 'Orient': 1, 'Casio': 1,
  'Timex': 1, 'Fossil': 1,
  // Tier 2 — Accessible Swiss
  'Tissot': 2, 'Hamilton': 2, 'Longines': 2, 'Mido': 2,
  'Frederique Constant': 2, 'Alpina': 2, 'Victorinox': 2,
  // Tier 3 — Mid Swiss
  'TAG Heuer': 3, 'Oris': 3, 'Tudor': 3, 'Breitling': 3,
  'Rado': 3, 'Certina': 3, 'Ball': 3, 'Sinn': 3,
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
