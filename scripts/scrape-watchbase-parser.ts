/**
 * WatchBase spec parser — shared between the scraper and the reparse tool.
 *
 * WatchBase pages have a `<table class="info-table">` per section (Case,
 * Dial, Movement, Bracelet) with rows like:
 *   <tr><th>Diameter:</th> <td>41.00 mm</td></tr>
 *
 * Their labels are SHORT (W/R, Color, Produced, Indexes, Glass, Height) so
 * those forms are listed FIRST in LABEL_ALIASES. Longer aliases from other
 * sources (WatchSpecs, brand sites) are kept as fallbacks.
 */

export type ParsedSpecs = {
  caseSizeMm: number | null
  lugWidthMm: number | null
  lugToLugMm: number | null
  thicknessMm: number | null
  caseMaterial: string | null
  caseFinish: string | null
  bezelMaterial: string | null
  bezelType: string | null
  crystalMaterial: string | null
  waterResistanceM: number | null
  weightG: number | null
  dialColor: string | null
  dialFinish: string | null
  markerType: string | null
  lumeColor: string | null
  movement: string | null
  caliber: string | null
  movementType: string | null
  powerReserveHours: number | null
  frequencyVph: number | null
  jewelCount: number | null
  braceletType: string | null
  claspType: string | null
  yearIntroduced: number | null
  yearDiscontinued: number | null
  productionStatus: string | null
  complications: string[] | null
  modelFamily: string | null
  countryOfOrigin: string | null
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractSpecMap(html: string): Map<string, string> {
  const map = new Map<string, string>()

  // Pattern 1: <span class="param-name">X</span> <span class="param-value">Y</span>
  const p1 = /<[^>]*class="[^"]*(?:param-name|spec-name|key|label)[^"]*"[^>]*>([^<]+)<\/[^>]+>\s*<[^>]*class="[^"]*(?:param-value|spec-value|value)[^"]*"[^>]*>([\s\S]*?)<\//gi
  for (const m of html.matchAll(p1)) {
    const key = stripTags(m[1]).toLowerCase().replace(/\s+/g, ' ').trim()
    const value = stripTags(m[2])
    if (key && value) map.set(key, value)
  }

  // Pattern 2: <th>X</th><td>Y</td>  ← WatchBase uses this
  const p2 = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi
  for (const m of html.matchAll(p2)) {
    const key = stripTags(m[1]).toLowerCase().replace(/\s+/g, ' ').trim()
    const value = stripTags(m[2])
    if (key && value && !map.has(key)) map.set(key, value)
  }

  // Pattern 3: <dt>X</dt><dd>Y</dd>
  const p3 = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi
  for (const m of html.matchAll(p3)) {
    const key = stripTags(m[1]).toLowerCase().replace(/\s+/g, ' ').trim()
    const value = stripTags(m[2])
    if (key && value && !map.has(key)) map.set(key, value)
  }

  return map
}

export const LABEL_ALIASES: Record<keyof ParsedSpecs, string[]> = {
  caseSizeMm: ['diameter', 'case diameter', 'case size'],
  lugWidthMm: ['lug width', 'strap width', 'band width'],
  lugToLugMm: ['lug to lug', 'lug-to-lug', 'lug to lug length'],
  thicknessMm: ['height', 'case thickness', 'thickness'],
  caseMaterial: ['material', 'materials', 'case material'],
  caseFinish: ['case finish'],
  bezelMaterial: ['bezel', 'bezel material'],
  bezelType: ['bezel type'],
  crystalMaterial: ['glass', 'crystal'],
  waterResistanceM: ['w/r', 'water resistance', 'water resistant'],
  weightG: ['weight'],
  dialColor: ['color', 'dial color', 'dial colour', 'dial'],
  dialFinish: ['finish', 'dial finish'],
  markerType: ['indexes', 'hour markers', 'markers', 'indices'],
  lumeColor: ['lume', 'luminous', 'super-luminova'],
  movement: ['movement'],
  caliber: ['caliber', 'calibre'],
  movementType: ['movement type', 'type of movement'],
  powerReserveHours: ['power reserve', 'power-reserve'],
  frequencyVph: ['frequency', 'beats per hour', 'vph'],
  jewelCount: ['jewels', 'number of jewels'],
  braceletType: ['bracelet', 'strap'],
  claspType: ['clasp', 'buckle'],
  yearIntroduced: ['produced', 'year introduced', 'introduced', 'year of production', 'years of production'],
  yearDiscontinued: ['year discontinued', 'discontinued'],
  productionStatus: ['limited', 'production', 'production status'],
  complications: ['complications', 'features', 'functions'],
  modelFamily: ['family', 'collection', 'series'],
  countryOfOrigin: ['country of origin', 'origin', 'made in'],
}

function pickSpec(map: Map<string, string>, aliases: string[]): string | null {
  for (const alias of aliases) {
    for (const [key, value] of map) {
      if (key === alias || key.includes(alias)) {
        return value
      }
    }
  }
  return null
}

function parseMm(value: string | null): number | null {
  if (!value) return null
  const m = value.replace(',', '.').match(/(\d+(?:\.\d+)?)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 && n < 100 ? n : null
}

function parseIntSafe(value: string | null): number | null {
  if (!value) return null
  const m = value.match(/(\d{1,8})/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function parseWater(value: string | null): number | null {
  if (!value) return null
  const mDirect = value.match(/(\d+(?:\.\d+)?)\s*m\b/i)
  if (mDirect) return Number(mDirect[1])
  const atm = value.match(/(\d+)\s*atm/i)
  if (atm) return Number(atm[1]) * 10
  const bar = value.match(/(\d+)\s*bar/i)
  if (bar) return Number(bar[1]) * 10
  const ft = value.match(/(\d+)\s*ft/i)
  if (ft) return Math.round(Number(ft[1]) * 0.3048)
  return null
}

function parsePowerReserve(value: string | null): number | null {
  if (!value) return null
  const m = value.match(/(\d+)\s*(?:h|hr|hours?)/i)
  if (m) return Number(m[1])
  const d = value.match(/(\d+)\s*days?/i)
  if (d) return Number(d[1]) * 24
  return parseIntSafe(value)
}

function parseYearRange(value: string | null): { start: number | null; end: number | null } {
  if (!value) return { start: null, end: null }
  // Year range like "2017 - 2021", "2017 to present", "2020"
  const m = value.match(/(\d{4})(?:\s*[-–—to]+\s*(\d{4}|present|current))?/i)
  if (!m) return { start: null, end: null }
  const start = Number(m[1])
  const endRaw = m[2]
  let end: number | null = null
  if (endRaw && /^\d{4}$/.test(endRaw)) end = Number(endRaw)
  return { start, end }
}

function classifyMovementType(value: string | null): string | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v.includes('automatic')) return 'automatic'
  if (v.includes('manual') || v.includes('hand-wind')) return 'manual'
  if (v.includes('quartz')) return 'quartz'
  if (v.includes('spring drive') || v.includes('spring-drive')) return 'spring-drive'
  if (v.includes('solar')) return 'solar'
  return null
}

function classifyBraceletType(value: string | null): string | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v.includes('integrated')) return 'integrated'
  if (v.includes('bracelet') || v.includes('oyster') || v.includes('jubilee')) return 'bracelet'
  if (v.includes('strap') || v.includes('leather') || v.includes('rubber') || v.includes('fabric'))
    return 'strap'
  return null
}

function classifyProductionStatus(value: string | null): string | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v.includes('yes')) return 'limited' // "Yes, 50 units"
  if (v.includes('discontinued')) return 'discontinued'
  if (v.includes('current') || v.includes('in production')) return 'current'
  return null
}

export function parseSpecs(html: string): ParsedSpecs {
  const map = extractSpecMap(html)
  const get = (key: keyof ParsedSpecs) => pickSpec(map, LABEL_ALIASES[key])

  const years = parseYearRange(get('yearIntroduced'))
  const movement = get('movement')
  const bracelet = get('braceletType')
  const limited = get('productionStatus')

  return {
    caseSizeMm: parseMm(get('caseSizeMm')),
    lugWidthMm: parseMm(get('lugWidthMm')),
    lugToLugMm: parseMm(get('lugToLugMm')),
    thicknessMm: parseMm(get('thicknessMm')),
    caseMaterial: get('caseMaterial'),
    caseFinish: get('caseFinish'),
    bezelMaterial: get('bezelMaterial'),
    bezelType: get('bezelType'),
    crystalMaterial: get('crystalMaterial'),
    waterResistanceM: parseWater(get('waterResistanceM')),
    weightG: parseIntSafe(get('weightG')),
    dialColor: get('dialColor'),
    dialFinish: get('dialFinish'),
    markerType: get('markerType'),
    lumeColor: get('lumeColor'),
    movement,
    caliber: get('caliber'),
    movementType: classifyMovementType(get('movementType') ?? movement),
    powerReserveHours: parsePowerReserve(get('powerReserveHours')),
    frequencyVph: parseIntSafe(get('frequencyVph')),
    jewelCount: parseIntSafe(get('jewelCount')),
    braceletType: classifyBraceletType(bracelet),
    claspType: get('claspType'),
    yearIntroduced: years.start,
    yearDiscontinued: years.end,
    productionStatus: classifyProductionStatus(limited),
    complications: (() => {
      const raw = get('complications')
      if (!raw) return null
      return raw
        .split(/[,;/]/)
        .map(s => s.trim())
        .filter(Boolean)
    })(),
    modelFamily: get('modelFamily'),
    countryOfOrigin: get('countryOfOrigin'),
  }
}
