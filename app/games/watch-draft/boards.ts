import { withVersion } from '@/lib/watchImages/cacheBust'

import { draftPath, type Budget, type DraftChallenge } from '@/lib/watchDraftChallenge'
export const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format

type Watch = {
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

export const boards: Board[] = [
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

export function boardFor(id: string | null) {
  return boards.find(board => board.id === id) ?? boards[0]
}

export function draftUrl(board: Board, budget: Budget, picks: string[] = []) {
  const query = new URLSearchParams({ board: board.id, budget: String(budget) })
  if (picks.length) query.set('picks', picks.join(','))
  return `${draftPath}?${query}`
}

const tierPrices: Record<Budget, readonly number[]> = {
  5000: [2500, 1500, 750, 500, 250],
  10000: [5000, 2500, 1500, 750, 250],
  15000: [9500, 3500, 2500, 1250, 500],
}

export function draftGrid(board: Board, budget: Budget) {
  const prices = tierPrices[budget]
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
