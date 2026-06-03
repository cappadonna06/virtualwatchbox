/**
 * Canonical watch-type classifier — the single source of truth for deriving
 * `watchType` from a watch's brand/model/family text.
 *
 * Why this exists
 * ---------------
 * watchType was previously inferred by two *separate* hand-rolled regex tables
 * (one in scripts/expand-seed-list.ts, one in scripts/expand-from-watchdb.ts).
 * They drifted, and both shared a destructive bug: the "Field" rule listed the
 * bare token `tank` and a bare `field` substring. Because the rules were
 * evaluated top-to-bottom with first-match-wins, EVERY Cartier Tank (an
 * archetypal dress watch) was classified "Field", and any watch whose
 * description merely contained the word "field" (e.g. "magnetic field") could
 * be swept into the Field bucket ahead of its real category. That contaminated
 * the discover algorithm, which keys upgrade paths / slot-fill off watchType.
 *
 * Design
 * ------
 *   OVERRIDE_RULES  — high-confidence, genuinely single-type families. Safe to
 *                     OVERRIDE whatever a noisy upstream source claimed, because
 *                     these models only ever ship as one type. Ordering matters:
 *                     chrono/GMT-qualified variants are listed BEFORE the base
 *                     family so e.g. "Superocean Chronograph" resolves to
 *                     Chronograph, not Diver.
 *   FILL_RULES      — broader heuristics. Only ever used to FILL an empty
 *                     watchType; never to override an existing non-empty value,
 *                     since a populated value may carry per-reference nuance a
 *                     family-level guess would destroy.
 *
 * Patterns are authored to be valid in BOTH JavaScript (`new RegExp(p, 'i')`)
 * and PostgreSQL POSIX (`~*`) so the SQL migration that fixes the live catalog
 * is generated from this same list (see scripts/reclassify-watch-types.ts).
 * Keep them word-boundary-free (no `\b` / `\y`) and rely on distinctive tokens
 * or explicit spacing instead.
 */

export type WatchTypeValue =
  | 'Diver'
  | 'Dress'
  | 'Sport'
  | 'Chronograph'
  | 'GMT'
  | 'Pilot'
  | 'Field'
  | 'Integrated Bracelet'
  | 'Vintage'

export interface ClassifierRule {
  pattern: string
  type: WatchTypeValue
  note?: string
}

export interface ClassifierSignals {
  waterResistance?: string
  functions?: string
  diameter?: string
  caseShape?: string
}

// ─────────────────────────────────────────────────────────────────────────
// OVERRIDE_RULES — single-type icons. Authoritative; safe to overwrite noisy
// upstream values. Ordered: complication-qualified variants first.
// ─────────────────────────────────────────────────────────────────────────
export const OVERRIDE_RULES: ClassifierRule[] = [
  // ── GMT / travel (must precede the base diver & dress families) ──────────
  { pattern: 'gmt[- ]?master', type: 'GMT' },
  { pattern: 'explorer ii', type: 'GMT', note: '24h hand — a GMT, not a field watch' },
  { pattern: 'sky[- ]?dweller', type: 'GMT' },
  { pattern: 'spirit zulu', type: 'GMT' },
  { pattern: 'aqua terra worldtimer', type: 'GMT' },

  // ── Chronograph icons (precede base families with chrono sub-variants) ──
  { pattern: 'daytona|cosmograph', type: 'Chronograph' },
  { pattern: 'speedmaster', type: 'Chronograph' },
  { pattern: 'el[ -]?primero', type: 'Chronograph' },
  { pattern: 'datograph', type: 'Chronograph' },
  { pattern: 'monaco', type: 'Chronograph' },

  // ── Divers ───────────────────────────────────────────────────────────────
  { pattern: 'submariner', type: 'Diver' },
  { pattern: 'sea[- ]?dweller|deepsea|deep sea', type: 'Diver' },
  { pattern: 'superocean(?!.*chrono)', type: 'Diver', note: 'Breitling dive line; chrono caught above' },
  { pattern: 'fifty fathoms(?!.*chrono)', type: 'Diver' },
  { pattern: 'pelagos', type: 'Diver' },
  { pattern: 'ploprof', type: 'Diver' },
  { pattern: 'planet ocean(?!.*chrono)', type: 'Diver' },
  { pattern: 'seamaster diver|seamaster 300', type: 'Diver' },
  { pattern: 'legend diver', type: 'Diver' },
  { pattern: 'hydroconquest|hydro conquest', type: 'Diver' },
  { pattern: 'aquaracer|aqua racer', type: 'Diver' },
  { pattern: 'aquis(?!.*(chrono|gmt))', type: 'Diver' },
  { pattern: 'ocean star|seastar|sea star', type: 'Diver' },

  // ── Integrated bracelet (only the Genta-lineage Ingenieur generations; the
  //    vintage ref 666 tool watch is handled as Sport in FILL_RULES) ────────
  { pattern: 'ingenieur (automatic 40|sl)|ingenieur.*(3289|3239|1832)', type: 'Integrated Bracelet' },

  // ── Pilot / aviation ───────────────────────────────────────────────────
  { pattern: 'big pilot', type: 'Pilot' },
  { pattern: "pilot'?s watch", type: 'Pilot' },
  { pattern: 'fliegeruhr|flieger', type: 'Pilot' },
  { pattern: 'khaki aviation|khaki x-wind|khaki takeoff|khaki pilot', type: 'Pilot' },

  // ── Field / tool ───────────────────────────────────────────────────────
  { pattern: 'khaki field(?!.*chrono)', type: 'Field' },
  { pattern: 'railmaster', type: 'Field' },
  { pattern: 'expedition north|expedition scout', type: 'Field' },

  // ── Dress icons (the bucket the old bug stole from) ─────────────────────
  { pattern: 'tank', type: 'Dress', note: 'archetypal dress watch — the old Field-rule collision' },
  { pattern: 'reverso(?!.*chrono)', type: 'Dress' },
  { pattern: 'ballon bleu', type: 'Dress' },
  { pattern: 'cle de cartier|cle de', type: 'Dress' },
  { pattern: 'cellini', type: 'Dress' },
  { pattern: 'calatrava', type: 'Dress' },
  { pattern: 'patrimony|patrimoine|traditionnelle', type: 'Dress' },
  { pattern: 'saxonia', type: 'Dress' },
  { pattern: 'dolcevita|dolce vita', type: 'Dress' },
  { pattern: 'de ville(?!.*chrono)', type: 'Dress' },
]

// ─────────────────────────────────────────────────────────────────────────
// FILL_RULES — broader heuristics used ONLY to fill an empty watchType.
// ─────────────────────────────────────────────────────────────────────────
export const FILL_RULES: ClassifierRule[] = [
  { pattern: 'world[- ]?time|worldtimer|world tour|dual time|second time zone| gmt|^gmt', type: 'GMT' },
  { pattern: 'chronograph|chronomat|chronospace|navitimer', type: 'Chronograph' },
  { pattern: 'pilot|aviator|navigator|cockpit|spitfire|top gun', type: 'Pilot' },
  { pattern: 'diver|divers|deep|fathom|aqua|nautical|scuba|sub ', type: 'Diver' },
  { pattern: 'nautilus|royal oak|laureato|overseas|alpine eagle|polo s|odyssey|tonda pf|octo finissimo|defy', type: 'Integrated Bracelet' },
  { pattern: 'field|khaki|expedition|trail|mil[- ]?spec|trench', type: 'Field' },
  { pattern: 'datejust|day-?date|patrimony|portofino|portugieser|presence|elegant|flagship|master collection|baroncelli|jazzmaster|max bill|tangente|ludwig|orion|trésor|tresor|evidenza|la grande', type: 'Dress' },
  // `ingenieur` only lands here (Sport) after the integrated-bracelet GENERATIONS
  // are pinned above in OVERRIDE_RULES. The original ref 666 (1954) is an
  // antimagnetic TOOL watch — peer of the Milgauss/Railmaster — not the 1976
  // Genta integrated-bracelet model. Name reused across eras; don't conflate.
  { pattern: 'oyster perpetual|milgauss|air[- ]?king|prx|conquest|big bang|ingenieur', type: 'Sport' },
]

function testPattern(pattern: string, haystack: string): boolean {
  return new RegExp(pattern, 'i').test(haystack)
}

/**
 * High-confidence pin. Returns a type ONLY for single-type icon families.
 * Used both to fill empties and to OVERRIDE contradictory upstream values.
 */
export function pinWatchType(text: string): WatchTypeValue | null {
  const blob = text.toLowerCase()
  for (const rule of OVERRIDE_RULES) {
    if (testPattern(rule.pattern, blob)) return rule.type
  }
  return null
}

/**
 * Best-effort classification. Tries the high-confidence pin first, then the
 * broader fill heuristics, then structured signal heuristics. Returns '' when
 * nothing is confident enough (caller should leave the field for LLM/manual).
 */
export function classifyWatchType(text: string, signals: ClassifierSignals = {}): WatchTypeValue | '' {
  const pinned = pinWatchType(text)
  if (pinned) return pinned

  const blob = text.toLowerCase()
  for (const rule of FILL_RULES) {
    if (testPattern(rule.pattern, blob)) return rule.type
  }

  const fn = (signals.functions ?? '').toLowerCase()
  if (/chronograph/.test(fn)) return 'Chronograph'
  if (/(gmt|24[\s-]?hour|second time zone|dual\s*time|world[\s-]?time)/.test(fn)) return 'GMT'

  const wr = Number((signals.waterResistance ?? '').match(/(\d+(?:\.\d+)?)/)?.[1] ?? 0)
  if (wr >= 200) return 'Diver'

  const dia = Number((signals.diameter ?? '').match(/(\d+(?:\.\d+)?)/)?.[1] ?? 0)
  if (dia > 0 && dia <= 38 && !/chronograph|gmt|date/.test(fn)) return 'Dress'
  if (wr >= 100 && wr < 200 && !/chronograph|gmt/.test(fn)) return 'Sport'

  return ''
}
