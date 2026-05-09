// Hardcoded upgrade chains for the Discover "Upgrade This Watch" feature.
// Keys and values are catalog IDs from lib/watches.ts. Algorithmic fallback
// in lib/discover.ts handles owned watches not listed here.

export const UPGRADE_PATHS: Record<string, string[]> = {
  // ── DIVERS ──────────────────────────────────────────────────────────
  'seiko-skx007j1':                ['tudor-m79030n-0001', 'rolex-126610ln'],
  'seiko-spb077':  ['tudor-m79030n-0001', 'omega-210-30-42-20-03-001'],
  'tudor-m25407n-0001':            ['rolex-126610ln', 'rolex-126600'],
  'tudor-m79030n-0001':          ['rolex-126610ln', 'omega-210-30-42-20-03-001'],
  'tudor-m79540-0006':          ['rolex-124060', 'rolex-126610ln'],
  'omega-210-30-42-20-03-001':   ['rolex-126610ln', 'rolex-126600'],
  'rolex-124060':    ['rolex-126610ln', 'rolex-126600'],

  // ── FIELD / EXPLORER ────────────────────────────────────────────────
  'seiko-spb143':       ['tudor-m79950-0001', 'rolex-124270'],
  'hamilton-h69439931': ['tudor-m79950-0001', 'iwc-iw328203'],
  'longines-l3-810-4-73-6':             ['tudor-m79950-0001', 'rolex-124270'],
  'tudor-m79950-0001':                ['rolex-124270', 'rolex-226570'],
  'rolex-124270':            ['rolex-226570', 'rolex-126334'],
  'omega-220-10-40-20-06-001':       ['rolex-124270', 'rolex-226570'],

  // ── PILOT ───────────────────────────────────────────────────────────
  'hamilton-h64635555': ['iwc-iw328203', 'iwc-iw329301'],
  'iwc-iw328203':            ['iwc-iw329301', 'rolex-124270'],

  // ── GMT / TRAVEL ────────────────────────────────────────────────────
  'seiko-ssk001':   ['tudor-m79830rb-0010', 'rolex-126710blro'],
  'tudor-m79830rb-0010':         ['rolex-126710blnr', 'rolex-126710blro'],
  'longines-l3-802-4-53-6':          ['tudor-m79830rb-0010', 'rolex-126710blro'],
  'tag-heuer-wbe511a-ba0650':             ['tudor-m79830rb-0010', 'rolex-126710blro'],
  'breitling-a32395101c1a1':       ['rolex-226570', 'rolex-126710blro'],
  'grand-seiko-sbgn017':        ['tudor-m79830rb-0010', 'rolex-126710blro'],
  'grand-seiko-sbgm221':          ['tudor-m79830rb-0010', 'rolex-126710blro'],

  // ── CHRONOGRAPH ─────────────────────────────────────────────────────
  'tudor-m79360n-0002':      ['omega-310-30-42-50-01-001', 'zenith-03-3200-3600-69-m3200'],
  'tag-heuer-cbn2011-ba0642':          ['tudor-m79360n-0002', 'omega-310-30-42-50-01-001'],
  'omega-310-30-42-50-01-001': ['zenith-03-3200-3600-69-m3200', 'rolex-116500ln'],
  'iwc-iw371606':      ['zenith-03-3200-3600-69-m3200', 'rolex-116500ln'],

  // ── DRESS ───────────────────────────────────────────────────────────
  'orient-fac00004w0':              ['longines-l2-793-4-78-3', 'cartier-wsta0041'],
  'longines-l2-793-4-78-3':  ['jaeger-lecoultre-q3858522', 'cartier-wsta0041'],
  'longines-l2-909-4-78-3':   ['jaeger-lecoultre-q1362540', 'patek-philippe-6119r-001'],
  'cartier-wsta0041':     ['jaeger-lecoultre-q3858522', 'cartier-wssa0032'],
  'jaeger-lecoultre-q3858522': ['jaeger-lecoultre-q1362540', 'patek-philippe-6119r-001'],

  // ── INTEGRATED BRACELET / DAILY ─────────────────────────────────────
  'tissot-t137-407-11-041-00':    ['tudor-m28600-0005', 'rolex-126334'],
  'tudor-m28600-0005':            ['rolex-126334', 'rolex-124300'],
  'omega-220-10-41-21-10-001':      ['rolex-126334', 'rolex-124300'],
  'omega-231-10-42-21-03-003': ['rolex-126334', 'rolex-124300'],
  'cartier-wssa0029':       ['rolex-126334', 'patek-philippe-5711-1a-010'],

  // ── SPORT / VERSATILE ───────────────────────────────────────────────
  'grand-seiko-sbgx335':         ['rolex-226570', 'rolex-124270'],
  'grand-seiko-sbgh267': ['rolex-126334', 'patek-philippe-5711-1a-010'],
  'sinn-556-010':                ['tudor-m79950-0001', 'rolex-124270'],
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
