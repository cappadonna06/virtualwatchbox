import { withVersion } from '@/lib/watchImages/cacheBust'

import { draftPath, type Budget, type DraftChallenge } from '@/lib/watchDraftChallenge'
export const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format

export type Watch = {
  id: string
  brand: string
  model: string
  reference: string
  price: number
  source: string
  image: string | undefined
}

function watch(id: string, brand: string, model: string, reference: string, price: number, source: string, image?: string): Watch {
  const storage = process.env.NEXT_PUBLIC_SUPABASE_URL
  return { id, brand, model, reference, price, source: `https://${source}`, image: image || withVersion(storage && `${storage}/storage/v1/object/public/watch-images/${id}/primary.webp`) }
}

const seiko = 'watchcharts.com/watches/brand/seiko'
const tissot = 'watchcharts.com/watches/brand_index/tissot'
const longines = 'watchcharts.com/watches/brand/longines'
const hamilton = 'watchcharts.com/watches/brand/hamilton'
const sinn = 'watchcharts.com/watches/brand/sinn'
const grandSeiko = 'watchcharts.com/watches/brand_index/grand%20seiko'
const w = {
  speedtimer: watch('seiko-ssc813', 'Seiko', 'Speedtimer', 'SSC813', 475, seiko, 'https://www.seikowatches.com/us-en/-/media/Images/Product--Image/All/Seiko/2022/02/20/04/36/SSC813P1/SSC813P1.png'),
  cocktail: watch('seiko-sarb065', 'Seiko', 'Cocktail Time', 'SARB065', 425, 'watchcharts.com/articles/p/4793/a-seiko-for-every-budget'),
  turtle: watch('seiko-srp777', 'Seiko', 'Turtle', 'SRP777', 375, 'watchcharts.com/watches/brand/seiko?page=6&sort='),
  seikoGmt: watch('seiko-ssk003', 'Seiko', '5 Sports GMT', 'SSK003', 350, 'watchcharts.com/watches/brand/seiko/seiko%205?page=1', 'https://www.seikowatches.com/us-en/-/media/Images/Product--Image/All/Seiko/2022/06/02/11/39/SSK003K1/SSK003K1.png'),
  alpinist: watch('seiko-sarb017', 'Seiko', 'Alpinist', 'SARB017', 950, 'marketplace.watchcharts.com/listings/watch_model/29?page=1&status=unsold'),
  snowflake: watch('grand-seiko-sbga211', 'Grand Seiko', 'Snowflake', 'SBGA211', 4675, grandSeiko),
  gsGmt: watch('grand-seiko-sbgm221', 'Grand Seiko', 'Elegance GMT', 'SBGM221', 3825, grandSeiko),
  boulton: watch('hamilton-h13431553', 'Hamilton', 'Boulton', 'H13431553', 450, 'marketplace.watchcharts.com/listings/watch_model/49989'),
  murph: watch('hamilton-h70405730', 'Hamilton', 'Murph 38', 'H70405730', 725, `${hamilton}?page=1`),
  scuba: watch('hamilton-h82505140', 'Hamilton', 'Navy Scuba', 'H82505140', 625, `${hamilton}?page=2&sort=recent`),
  intra: watch('hamilton-h38416711', 'Hamilton', 'Intra-Matic Chrono', 'H38416711', 1400, 'marketplace.watchcharts.com/listings/watch_model/17222'),
  prx: watch('tissot-t137-410-11-041-00', 'Tissot', 'PRX Quartz', 'T137.410.11.041.00', 200, tissot),
  prxAuto: watch('tissot-t137-407-11-041-00', 'Tissot', 'PRX Powermatic 80', 'T137.407.11.041.00', 450, 'marketplace.watchcharts.com/listings/watch_model/35158'),
  gentleman: watch('tissot-t127-407-11-041-00', 'Tissot', 'Gentleman Auto', 'T127.407.11.041.00', 500, tissot),
  classic: watch('longines-l2-386-4-72-6', 'Longines', 'Conquest Classic', 'L2.386.4.72.6', 700, `${longines}/conquest?page=1`),
  conquest: watch('longines-l3-830-4-52-6', 'Longines', 'Conquest 41', 'L3.830.4.52.6', 1400, longines),
  hydro: watch('longines-l3-781-4-96-6', 'Longines', 'HydroConquest', 'L3.781.4.96.6', 1150, `${longines}/hydroconquest?page=1`),
  zulu: watch('longines-l3-812-4-63-6', 'Longines', 'Spirit Zulu Time', 'L3.812.4.63.6', 2175, longines),
  aquaQuartz: watch('omega-2517-50-00', 'Omega', 'Aqua Terra Quartz', '2517.50.00', 2225, 'watchcharts.com/watches/brand/omega/aqua%20terra?page=2'),
  reduced: watch('omega-3510-50-00', 'Omega', 'Speedmaster Reduced', '3510.50.00', 3000, 'marketplace.watchcharts.com/listings/watch_model/24?page=1&status=all'),
  seamaster: watch('omega-210-30-42-20-01-001', 'Omega', 'Seamaster 300M', '210.30.42.20.01.001', 4375, 'marketplace.watchcharts.com/listings/watch_model/869'),
  moonwatch: watch('omega-310-30-42-50-01-001', 'Omega', 'Speedmaster Moonwatch', '310.30.42.50.01.001', 5525, 'watchcharts.com/watch_model/30920-omega-speedmaster-professional-moonwatch-310-30-42-50-01-001/overview'),
  moonwatchReversePanda: watch('omega-310-30-42-50-01-004', 'Omega', 'Moonwatch Reverse Panda', '310.30.42.50.01.004', 9375, 'watchcharts.com/watches/brand/omega/speedmaster?page=1'),
  tank: watch('cartier-wsta0041', 'Cartier', 'Tank Must', 'WSTA0041', 3175, 'watchcharts.com/watches/brand_index/cartier'),
  explorer: watch('rolex-124270', 'Rolex', 'Explorer 36', '124270', 8125, 'watchcharts.com/watches/brand/rolex/explorer'),
  bb58: watch('tudor-m79030n-0001', 'Tudor', 'Black Bay 58', 'M79030N-0001', 3075, 'watchcharts.com/watches/brand/tudor?sort=1Y_price_trend'),
  bbGmt: watch('tudor-m79830rb-0001', 'Tudor', 'Black Bay GMT', 'M79830RB-0001', 3100, 'watchcharts.com/watches/brand/tudor?sort=1Y_price_trend'),
  shock: watch('casio-dw-6900e-1', 'Casio', 'G-Shock 6900', 'DW-6900E-1', 55, 'watchcharts.com/watches/brand/casio/g-shock?page=7'),
  tangente: watch('nomos-glashutte-101', 'NOMOS', 'Tangente 35', '101', 1050, 'watchcharts.com/watches/brand/nomos/tangente?page=1'),
  club: watch('nomos-737', 'NOMOS', 'Club Campus 38', '737', 1125, 'marketplace.watchcharts.com/listings/watch_model/1218'),
  sinn556: watch('sinn-556-014', 'Sinn', '556 A', '556.014', 1325, sinn),
  sinn104: watch('sinn-104-010', 'Sinn', '104 St Sa I', '104.010', 1250, sinn),
  sinn103: watch('sinn-103-061', 'Sinn', '103 St Sa', '103.061', 2150, sinn),
}

export type Board = {
  id: DraftChallenge['board']
  title: string
  label: string
  rule: string
  prompt: string
  budget: Budget
  groups: { title: string; watches: Watch[] }[]
}

export const legacyBoards: Board[] = [
  {
    id: 'type', title: 'Five roles', label: 'By watch type',
    rule: 'Pick one watch per column.',
    prompt: 'You have $5,000 to cover five roles. Where are you splurging, and which slot gets the budget pick? Drop your five and your total.',
    budget: 5000,
    groups: [
      { title: 'Chronograph', watches: [w.speedtimer, w.intra, w.reduced, w.moonwatch, w.moonwatchReversePanda] },
      { title: 'Dress', watches: [w.cocktail, w.boulton, w.tangente, w.tank] },
      { title: 'Diver', watches: [w.turtle, w.hydro, w.bb58, w.seamaster] },
      { title: 'Sport', watches: [w.prx, w.murph, w.alpinist, w.explorer] },
      { title: 'GMT', watches: [w.seikoGmt, w.zulu, w.bbGmt, w.gsGmt] },
    ],
  },
  {
    id: 'brand', title: 'Five brands', label: 'By brand',
    rule: 'Pick one watch per brand.',
    prompt: 'You have $10,000 and one slot for each of these five brands. Which Omega gets the call, and what are you pairing it with? Drop your five and your total.',
    budget: 10000,
    groups: [
      { title: 'Seiko', watches: [w.seikoGmt, w.turtle, w.speedtimer, w.alpinist] },
      { title: 'Tissot', watches: [w.prx, w.prxAuto, w.gentleman] },
      { title: 'Hamilton', watches: [w.boulton, w.scuba, w.murph, w.intra] },
      { title: 'Longines', watches: [w.classic, w.hydro, w.conquest, w.zulu] },
      { title: 'Omega', watches: [w.aquaQuartz, w.seamaster, w.moonwatch, w.moonwatchReversePanda] },
    ],
  },
  {
    id: 'region', title: 'Three countries', label: 'By region',
    rule: 'Pick five watches, with at least one from each country.',
    prompt: 'Build a $15,000 watch box with at least one pick each from Japan, Switzerland, and Germany. Which country gets your two extra slots?',
    budget: 15000,
    groups: [
      { title: 'Japan', watches: [w.shock, w.seikoGmt, w.speedtimer, w.gsGmt, w.snowflake] },
      { title: 'Switzerland', watches: [w.prx, w.zulu, w.bb58, w.moonwatch, w.explorer] },
      { title: 'Germany', watches: [w.tangente, w.club, w.sinn104, w.sinn556, w.sinn103] },
    ],
  },
]

const curated = {
  blueSpeedmaster: watch('omega-3510-80-00', 'Omega', 'Speedmaster Blue', '3510.80.00', 3275, 'watchcharts.com/watch_model/4950-omega-speedmaster-reduced-3510-80/overview'),
  moonphase: watch('longines-l2-919-4-78-3', 'Longines', 'Master Moonphase', 'L2.919.4.78.3', 2150, 'watchcharts.com/watch_model/10332-longines-master-collection-42-moonphase-l2-919-4-78/overview'),
  pelagos: watch('tudor-m25407n-0001', 'Tudor', 'Pelagos 39', 'M25407N-0001', 4000, 'watchcharts.com/watches/brand/tudor/pelagos?page=1'),
  aquaTerra: watch('omega-220-10-38-20-03-001', 'Omega', 'Aqua Terra 38', '220.10.38.20.03.001', 4425, 'marketplace.watchcharts.com/listings/watch_model/760'),
  pilot: watch('iwc-iw327001', 'IWC', 'Mark XVIII', 'IW327001', 3500, 'watchcharts.com/watch_model/5465-iwc-pilot-s-watch-mark-xviii-327001/overview'),
  ranger: watch('tudor-m79950-0001', 'Tudor', 'Ranger', 'M79950-0001', 2800, 'watchcharts.com/watches/brand/tudor/ranger'),
  hiBeat: watch('grand-seiko-sbgj001', 'Grand Seiko', 'Hi-Beat GMT', 'SBGJ001', 5000, 'watchcharts.com/watch_model/783-grand-seiko-hi-beat-36000-gmt-sbgj001/overview'),
}

export const dreamBox: Board = {
  id: 'type',
  title: 'Five roles',
  label: 'By watch type',
  rule: 'Pick one per column. Spend up to $15,000.',
  prompt: 'You have $15,000 for five watches. Pick one per column and share your five and total.',
  budget: 15000,
  groups: [
    { title: 'Chronograph', watches: [w.moonwatch, curated.blueSpeedmaster, w.reduced, w.intra, w.speedtimer] },
    { title: 'Dress', watches: [w.snowflake, w.tank, curated.moonphase, w.tangente, w.cocktail] },
    { title: 'Diver', watches: [w.seamaster, curated.pelagos, w.bb58, w.hydro, w.turtle] },
    { title: 'Sport', watches: [curated.aquaTerra, curated.pilot, curated.ranger, w.conquest, w.murph] },
    { title: 'GMT', watches: [curated.hiBeat, w.gsGmt, w.bbGmt, w.zulu, w.seikoGmt] },
  ],
}

const editions = {
  tuna: watch('seiko-sbdx014g', 'Seiko', 'Emperor Tuna', 'SBDX014', 2650, `${seiko}/prospex`),
  marinemaster: watch('seiko-sbdx017', 'Seiko', 'Marinemaster 300', 'SBDX017', 2100, `${seiko}/prospex?page=3`),
  willard: watch('seiko-spb151', 'Seiko', 'Captain Willard', 'SPB151', 1050, `${seiko}/prospex`),
  springDrive: watch('grand-seiko-sbga201', 'Grand Seiko', 'Spring Drive', 'SBGA201', 3225, grandSeiko),
  starBar: watch('seiko-srpc43', 'Seiko', 'Presage Star Bar', 'SRPC43', 875, `${seiko}/presage`),
  drive: watch('cartier-wsnm0004', 'Cartier', 'Drive de Cartier', 'WSNM0004', 4150, 'watchcharts.com/watches/brand/cartier/drive'),
  flagship: watch('longines-l4-815-4-78-2', 'Longines', 'Flagship Heritage', 'L4.815.4.78.2', 2200, `${longines}/flagship`),
  sixties: watch('glashutte-original-1-39-52-01-02-04', 'Glashütte Original', 'Sixties', '1-39-52-01-02-04', 5500, 'watchcharts.com/watches/brand/glashutte%20original/sixties'),
  diapal: watch('sinn-358-061', 'Sinn', '358 Diapal', '358.061', 3550, sinn),
  update: watch('nomos-180', 'NOMOS', 'Tangente Update', '180', 2950, 'nomos-glashuette.com/en/tangente/tangente-neomatik-41-update-180'),
  fiftyEightGMT: watch('tudor-m7939g1a0nru-0003', 'Tudor', 'Black Bay 58 GMT', 'M7939G1A0NRU-0003', 4500, 'watchcharts.com/watches/brand/tudor/black%20bay'),
  tudor1926: watch('tudor-m91350-0001', 'Tudor', '1926', 'M91350-0001', 1500, 'watchcharts.com/watches/brand/tudor/1926'),
  seamasterQuartz: watch('omega-2561-80-00', 'Omega', 'Seamaster Quartz', '2561.80.00', 2000, 'watchcharts.com/watches/brand/omega/seamaster'),
  flyback: watch('longines-l3-821-4-53-6', 'Longines', 'Spirit Flyback', 'L3.821.4.53.6', 4500, 'longines.com/en-us/p/watch-longines-spirit-flyback-l3-821-4-53-6'),
  spiritChrono: watch('longines-l3-820-4-73-2', 'Longines', 'Spirit Chronograph', 'L3.820.4.73.2', 3300, `${longines}/spirit`),
  orisProPilot: watch('oris-01-793-7775-8734-set', 'Oris', 'ProPilot Coulson', '01 793 7775 8734-Set', 5000, 'watchcharts.com/watches/brand/oris/big%20crown%20propilot'),
  orisAquis400: watch('oris-01-400-7769-6355-07-4-22-75fc', 'Oris', 'Aquis Calibre 400', '01 400 7769 6355-07 4 22 75FC', 3900, 'watchcharts.com/watches/brand/oris/aquis'),
  orisArtelier: watch('oris-01-111-7700-4061-set-1-23-71fc', 'Oris', 'Artelier Calibre 111', '01 111 7700 4061-Set 1 23 71FC', 3900, 'watchcharts.com/watches/brand/oris/artelier'),
  orisBigCrown: watch('oris-01-754-7741-4065-07-8-20-22', 'Oris', 'Big Crown Pointer Date', '01 754 7741 4065-07 8 20 22', 1950, 'watchcharts.com/watches/brand/oris/big%20crown'),
  oris65: watch('oris-01-733-7707-4064-07-8-20-18', 'Oris', 'Divers Sixty-Five', '01 733 7707 4064-07 8 20 18', 1500, 'watchcharts.com/watches/brand/oris/divers%20sixty-five'),
  sinn900: watch('sinn-900-011', 'Sinn', '900 Flieger', '900.011', 3500, sinn),
  sinn140: watch('sinn-140-020', 'Sinn', '140 St Space Chrono', '140.020', 3100, sinn),
}

export const regionBox: Board = {
  id: 'region',
  title: 'Three countries',
  label: 'By region',
  rule: dreamBox.rule,
  prompt: 'Build a $15,000 watch box across Japan, Switzerland, and Germany.',
  budget: dreamBox.budget,
  groups: [
    { title: 'Japan Sport', watches: [curated.hiBeat, editions.tuna, editions.marinemaster, editions.willard, w.turtle] },
    { title: 'Japan Dress', watches: [w.snowflake, w.gsGmt, editions.springDrive, editions.starBar, w.cocktail] },
    { title: 'Swiss Sport', watches: [w.moonwatch, curated.pelagos, curated.ranger, w.conquest, w.prx] },
    { title: 'Swiss Dress', watches: [editions.drive, w.tank, curated.moonphase, editions.flagship, w.gentleman] },
    { title: 'Germany', watches: [editions.sixties, editions.diapal, editions.update, w.sinn103, w.club] },
  ],
}

export const brandBox: Board = {
  id: 'brand',
  title: 'Five brands',
  label: 'By brand',
  rule: dreamBox.rule,
  prompt: 'Build a $15,000 box with one Omega, Tudor, Longines, Oris, and Sinn.',
  budget: dreamBox.budget,
  groups: [
    { title: 'Omega', watches: [w.moonwatch, w.seamaster, w.reduced, w.aquaQuartz, editions.seamasterQuartz] },
    { title: 'Tudor', watches: [editions.fiftyEightGMT, curated.pelagos, w.bb58, curated.ranger, editions.tudor1926] },
    { title: 'Longines', watches: [editions.flyback, editions.spiritChrono, w.zulu, editions.flagship, w.hydro] },
    { title: 'Oris', watches: [editions.orisProPilot, editions.orisAquis400, editions.orisArtelier, editions.orisBigCrown, editions.oris65] },
    { title: 'Sinn', watches: [editions.sinn900, editions.diapal, editions.sinn140, w.sinn103, w.sinn556] },
  ],
}

export const curatedBoards = [dreamBox, brandBox, regionBox]
const weeklyRegion: Board = {
  ...regionBox,
  budget: 9000,
  rule: 'Pick one from each country. Spend up to $9,000.',
  title: 'International',
  groups: [
    { title: 'Japan', watches: [curated.hiBeat, w.gsGmt, editions.springDrive, editions.willard, w.cocktail] },
    { title: 'Switzerland', watches: [w.moonwatch, curated.pelagos, w.tank, w.zulu, w.prx] },
    { title: 'Germany', watches: [editions.sixties, editions.diapal, editions.update, w.sinn103, w.club] },
  ],
}

const additions = {
  edoAlpinist: watch('seiko-hbc006', 'Seiko', 'Alpinist 145th', 'HBC006', 900, 'www.seikowatches.com/us-en/products/prospex/hbc006j1'),
  tudor54Blue: watch('tudor-m79000b-0001', 'Tudor', 'Black Bay 54 Blue', 'M79000B-0001', 4725, 'www.tudorwatch.com/en/watches/black-bay-54/m79000b-0001'),
  aquaVintage: watch('omega-3513-30-00', 'Omega', 'Speedmaster Date', '3513.30.00', 2500, 'watchcharts.com/watches/brand/omega/speedmaster'),
  silverSinn: watch('sinn-556-010', 'Sinn', '556 I', '556.010', 1250, sinn),
  sinn144: watch('sinn-144-066', 'Sinn', '144 St Sa', '144.066', 2800, sinn),
  sinn104: w.sinn104,
  nomosOrion: watch('nomos-384', 'NOMOS', 'Orion 38', '384', 1800, 'watchcharts.com/watches/brand/nomos/orion'),
  sixtiesBlue: watch('glashutte-original-1-39-52-04-02-04', 'Glashütte Original', 'Sixties Blue', '1-39-52-04-02-04', 5300, 'watchcharts.com/watches/brand/glashutte%20original/sixties'),
  seikoWillardGreen: watch('seiko-spb153', 'Seiko', 'Green Willard', 'SPB153', 950, `${seiko}/prospex`),
  tudorRoyal: watch('tudor-m28500-0003', 'Tudor', 'Royal 38', 'M28500-0003', 2000, 'watchcharts.com/watches/brand/tudor/royal'),
  tudorBlue58: watch('tudor-79030b', 'Tudor', 'Black Bay 58 Blue', '79030B', 3000, 'watchcharts.com/watches/brand/tudor/black%20bay'),
  longinesSpirit: watch('longines-l3-810-4-93-6', 'Longines', 'Spirit 40', 'L3.810.4.93.6', 2000, `${longines}/spirit`),
  longinesSector: watch('longines-l2-828-4-73-2', 'Longines', 'Heritage Sector', 'L2.828.4.73.2', 2200, longines),
  longinesFlybackBlue: watch('longines-l3-821-4-93-6', 'Longines', 'Spirit Flyback Blue', 'L3.821.4.93.6', 4500, `${longines}/spirit`),
  orisProX: watch('oris-01-400-7778-7153-07-7-20-01', 'Oris', 'ProPilot X', '01 400 7778 7153-07 7 20 01', 3900, 'watchcharts.com/watches/brand/oris/propilot%20x'),
  orisAquis: watch('oris-01-733-7653-4154-07-8-26-01peb', 'Oris', 'Aquis Date', '01 733 7653 4154-07 8 26 01PEB', 1200, 'watchcharts.com/watches/brand/oris/aquis'),
  orisRectangular: watch('oris-01-561-7783-4068-07-5-19-18', 'Oris', 'Rectangular', '01 561 7783 4068-07 5 19 18', 1700, 'watchcharts.com/watches/brand/oris'),
  orisOcean: watch('oris-01-733-7732-4185-set', 'Oris', 'Clean Ocean', '01 733 7732 4185-Set', 1900, 'watchcharts.com/watches/brand/oris/aquis'),
}

// These frozen decks form the weekly-v1 archive. Keep their ordering stable so
// every dated URL always resolves to the same watches and tiers.
const alternate: Record<Board['id'], Watch[][]> = {
  type: [
    [editions.flyback, editions.spiritChrono, additions.aquaVintage, w.sinn103, w.speedtimer],
    [editions.drive, editions.update, additions.longinesSector, editions.flagship, w.boulton],
    [editions.fiftyEightGMT, editions.orisAquis400, additions.tudorBlue58, editions.marinemaster, additions.seikoWillardGreen],
    [curated.aquaTerra, additions.orisProX, editions.tudor1926, w.gentleman, additions.edoAlpinist],
    [curated.hiBeat, w.bbGmt, w.gsGmt, w.zulu, w.seikoGmt],
  ],
  region: [
    [w.snowflake, editions.tuna, editions.marinemaster, editions.starBar, additions.edoAlpinist],
    [curated.aquaTerra, additions.tudor54Blue, w.bb58, editions.flagship, w.hydro],
    [additions.sixtiesBlue, editions.sinn900, editions.sinn140, additions.nomosOrion, w.tangente],
  ],
  brand: [
    [curated.aquaTerra, curated.blueSpeedmaster, additions.aquaVintage, editions.seamasterQuartz, w.aquaQuartz],
    [additions.tudor54Blue, w.bbGmt, additions.tudorBlue58, additions.tudorRoyal, editions.tudor1926],
    [additions.longinesFlybackBlue, w.zulu, curated.moonphase, additions.longinesSpirit, w.classic],
    [additions.orisProX, editions.orisArtelier, additions.orisOcean, additions.orisRectangular, additions.orisAquis],
    [editions.diapal, editions.sinn900, additions.sinn144, additions.sinn104, additions.silverSinn],
  ],
}

export const weeklyEdition = 'weekly-v1'
const weekMs = 7 * 24 * 60 * 60 * 1000
const firstWeek = '2026-11-09'
const firstWeekMs = Date.parse(firstWeek)

export function currentDraftWeek(now = new Date()) {
  const monday = new Date(now)
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7)
  return monday.toISOString().slice(0, 10)
}

export function isDraftWeek(value: string | null, latest: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= firstWeek && value <= latest &&
    (Date.parse(value) - firstWeekMs) % weekMs === 0)
}

export function weeklyBoard(id: string | null, week: string) {
  const board = id === 'region' ? weeklyRegion : curatedBoards.find(option => option.id === id) ?? dreamBox
  const phase = Math.floor((Date.parse(week) - firstWeekMs) / weekMs) % 4
  if (phase === 0) return board
  return {
    ...board,
    groups: board.groups.map((group, index) => {
      const useAlternate = phase === 1 || index % 2 === phase - 2
      return useAlternate ? { ...group, watches: alternate[board.id][index] } : group
    }),
  }
}

export function weekLabel(week: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }).format(new Date(week))
}

export const draftEdition = 'dream-box'

const dreamTiers = [5000, 4000, 3000, 2000, 1000] as const

export function dreamRows(board: Board) {
  return dreamTiers.map((price, index) => ({
    price,
    cells: board.groups.map(group => ({ ...group.watches[index], tier: price })),
  }))
}

export function dreamUrl(board: Board, picks: string[] = [], week?: string) {
  const query = new URLSearchParams()
  if (board.id !== 'type') {
    query.set('board', board.id)
    query.set('budget', String(board.budget))
  }
  if (week) {
    query.set('week', week)
    query.set('edition', weeklyEdition)
  }
  if (picks.length) {
    if (!week) query.set('edition', draftEdition)
    query.set('picks', picks.join(','))
  }
  return query.size ? `${draftPath}?${query}` : draftPath
}

export const posterSlugs = { type: 'dream-box', brand: 'dream-brands', region: 'dream-regions' } as const

export function boardFor(id: string | null) {
  return legacyBoards.find(board => board.id === id) ?? legacyBoards[0]
}

export function draftUrl(board: Board, budget: Budget, picks: string[] = []) {
  const query = new URLSearchParams({ board: board.id, budget: String(budget) })
  if (picks.length) query.set('picks', picks.join(','))
  return `${draftPath}?${query}`
}

const tierPrices: Record<(typeof import('@/lib/watchDraftChallenge').budgets)[number], readonly number[]> = {
  5000: [2500, 1500, 750, 500, 250],
  10000: [5000, 2500, 1500, 750, 250],
  15000: [9500, 3500, 2500, 1250, 500],
}

export function draftGrid(board: Board, budget: Budget) {
  const prices = tierPrices[budget === 9000 ? 15000 : budget]
  // Leave watches well above the top tier off the board.
  const columns = board.groups.map(group => group.watches
    .filter(watch => watch.price <= budget && watch.price <= prices[0] * 1.25)
    .map(watch => {
      const tier = prices.reduce((closest, price) =>
        Math.abs(price - watch.price) <= Math.abs(closest - watch.price) ? price : closest)
      return { ...watch, tier }
    }))

  return prices.map(price => ({
    price,
    cells: columns.map((column, columnIndex) => column.filter(watch => {
      if (watch.tier !== price) return false
      if (board.id !== 'region') {
        const reserve = columns.reduce((sum, options, index) =>
          index === columnIndex ? sum : sum + Math.min(...options.map(option => option.tier)), 0)
        return price + reserve <= budget
      }

      // Reserve the cheapest watch from each missing country, then fill the two flex slots.
      const cheapest = columns.flatMap((options, index) => options
        .filter(option => option.id !== watch.id)
        .map(option => ({ price: option.tier, index })))
        .sort((a, b) => a.price - b.price)
      const required = new Set(columns.map((_, index) => index).filter(index => index !== columnIndex))
      let reserve = 0
      const extras = cheapest.filter(option => {
        if (!required.delete(option.index)) return true
        reserve += option.price
        return false
      })
      return !required.size && extras.length >= 2 && price + reserve + extras[0].price + extras[1].price <= budget
    })),
  }))
}
