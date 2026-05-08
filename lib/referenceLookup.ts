import {
  fetchOpenAIWithRetry,
  extractResponseText,
  parseVisionJson,
  type WatchIdentification,
} from '@/lib/watchVision'

export type ReferenceCandidate = {
  reference: string
  confidence: 'high' | 'medium' | 'low'
  rationale: string
  sourceUrl?: string
}

export type ReferenceLookupResult = {
  candidates: ReferenceCandidate[]
  estimatedValueUsd: number | null
  estimatedValueSource?: string
  query: string
}

const CONFIDENCE_VALUES: ReferenceCandidate['confidence'][] = ['high', 'medium', 'low']

function normalizeConfidence(v: unknown): ReferenceCandidate['confidence'] {
  if (typeof v === 'string' && (CONFIDENCE_VALUES as string[]).includes(v)) {
    return v as ReferenceCandidate['confidence']
  }
  return 'low'
}

function buildSpecLine(visual: WatchIdentification): string {
  const parts = [
    visual.dialColor && `dial ${visual.dialColor}`,
    visual.dialDetails && `(${visual.dialDetails})`,
    visual.caseMaterial && `case ${visual.caseMaterial}`,
    visual.caseSizeMm && `${visual.caseSizeMm}mm`,
    visual.bracelet && `bracelet/strap ${visual.bracelet}`,
    visual.bezel && `bezel ${visual.bezel}`,
    visual.watchType && `type ${visual.watchType}`,
    visual.movement && `movement cues: ${visual.movement}`,
  ].filter(Boolean)
  return parts.join(' · ')
}

/**
 * Pull reference-like tokens out of a filename to use as a strong prior in
 * the reference lookup. Examples we want to catch:
 *   - "watch-collection-conquest-l3-830-4-92-6-403d4e-hero.jpg" → ["l3-830-4-92-6"]
 *   - "Longines-L3.830.4.92.6.jpg"                              → ["L3.830.4.92.6"]
 *   - "submariner-126610LN.jpg"                                 → ["126610LN"]
 *   - "IWC-IW327001-pilot.jpg"                                  → ["IW327001"]
 *
 * Cheap heuristics — we'd rather miss real refs than pollute the prompt with
 * dimensions / hashes. The AI gets these as suggestions, not commands.
 */
export function extractRefHintsFromFilename(filename: string): string[] {
  if (!filename) return []
  const stem = filename.replace(/\.[^.]+$/, '')
  const out = new Set<string>()

  // Pattern A: a letter prefix + at least three numeric/alpha chunks separated
  // by . - or /. Catches Longines (L3.830.4.92.6), AP (15500ST.OO.1220ST.04),
  // Patek (5167/1A-001), and the lower-cased hyphenated variants from
  // exported web filenames (l3-830-4-92-6).
  const dotted = stem.matchAll(/([A-Za-z]\d[\dA-Za-z]*(?:[-./][\dA-Za-z]+){2,})/g)
  for (const m of dotted) out.add(m[1])

  // Pattern B: SKU-style runs of digits with optional letter suffix/prefix.
  // Catches Rolex (126610LN, 116710BLNR) and IWC (IW327001).
  const sku = stem.matchAll(/(?:^|[^A-Za-z\d])([A-Z]{0,3}\d{5,8}[A-Z]{0,4})(?=$|[^A-Za-z\d])/g)
  for (const m of sku) out.add(m[1])

  // Drop tokens that look like hex hashes (often appended by CMSes).
  return [...out].filter(s => !/^[a-f0-9]{8,}$/i.test(s)).slice(0, 5)
}

export async function lookupReferenceCandidates(
  visual: WatchIdentification,
  filename?: string,
): Promise<ReferenceLookupResult> {
  const empty: ReferenceLookupResult = { candidates: [], estimatedValueUsd: null, query: '' }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return empty
  if (!visual.brand || visual.confidence === 'unmatched') return empty

  const specLine = buildSpecLine(visual)
  const query = `${visual.brand} ${visual.model} ${specLine}`.trim()
  const filenameHints = filename ? extractRefHintsFromFilename(filename) : []

  // The filename is included as a STRONG prior — when a curator names a file
  // after the manufacturer reference (the usual convention for web exports),
  // it's a near-deterministic signal that visual specs alone can't always
  // resolve. We still require the model to verify the reference looks real
  // for this brand and matches the visible specs; we don't blindly accept it.
  const filenameSection = filename
    ? [
        '== filename hint ==',
        `Original filename: "${filename}".`,
        filenameHints.length > 0
          ? `Reference-like tokens extracted from the filename: ${filenameHints.join(', ')}.`
          : 'No obvious reference-like tokens were extracted.',
        'Treat the filename as a STRONG prior. If a token matches a real reference for this brand+model that is visually consistent with the specs above, RETURN THAT REFERENCE FIRST with high confidence and note in rationale that it was confirmed against the filename. Only override the filename hint if the visible specs clearly contradict it (e.g., the filename says Submariner but the dial is a GMT-Master).',
        'Normalize separators when matching: filename "l3-830-4-92-6" should resolve to the canonical "L3.830.4.92.6".',
        '',
      ]
    : []

  const prompt = [
    `Find the manufacturer reference number(s) and current estimated market value for a ${visual.brand} ${visual.model || '(model unknown)'}.`,
    `Visible specs: ${specLine || '(none)'}.`,
    'Search the brand\'s official site first, then reputable dealers (Hodinkee, Bob\'s Watches, Crown & Caliber, official boutique pages, WatchCharts, Chrono24 sold listings). Avoid generic / non-specific listings.',
    '',
    ...filenameSection,
    '== references ==',
    'Return up to 5 candidate references with a confidence (high/medium/low) and a one-line rationale that names the differentiating spec — e.g. "blue dial 41mm steel bracelet — L3.830.4.92.6". When a candidate is confirmed by the filename hint, say so in the rationale (e.g. "matches filename token l3-830-4-92-6").',
    'Confidence rubric:',
    '  high   = filename hint resolves to a real ref AND matches visible specs; OR brand site / boutique page lists this reference matching ALL visible specs',
    '  medium = matches dial color + case + bracelet but variants exist; or trustworthy dealer source',
    '  low    = inferred from model knowledge without an authoritative source',
    '',
    '== estimated market value ==',
    'Also return estimatedValueUsd: integer USD, the typical current market price for this watch in good preowned condition (or current retail if it is a current-production model with widely-published MSRP). Use a single midpoint number — not a range. Example: 2200 means $2,200.',
    'estimatedValueSource: short label naming where the figure came from, e.g. "Longines.com retail", "Bob\'s Watches preowned avg", "WatchCharts market median". If you cannot find a reliable figure, set estimatedValueUsd to null and explain in source.',
    '',
    'Return only JSON in this exact shape (no prose around it):',
    '{"candidates":[{"reference":"...","confidence":"high","rationale":"...","sourceUrl":"https://..."}],"estimatedValueUsd":2200,"estimatedValueSource":"Longines.com retail"}',
  ].join('\n')

  const response = await fetchOpenAIWithRetry({
    model: process.env.OPENAI_REFERENCE_LOOKUP_MODEL ?? 'gpt-4.1',
    input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
    tools: [{ type: 'web_search' }],
    temperature: 0,
  }, apiKey)

  if (!response?.ok) {
    if (response) {
      try { console.warn('[referenceLookup] non-OK response', response.status, await response.text()) } catch { /* ignore */ }
    }
    return { ...empty, query }
  }

  const raw = parseVisionJson(extractResponseText(await response.json()))
  if (!raw || !Array.isArray(raw.candidates)) return { ...empty, query }

  const candidates: ReferenceCandidate[] = raw.candidates
    .map((c): ReferenceCandidate | null => {
      if (!c || typeof c !== 'object') return null
      const obj = c as Record<string, unknown>
      const reference = typeof obj.reference === 'string' ? obj.reference.trim() : ''
      if (!reference) return null
      const sourceUrl = typeof obj.sourceUrl === 'string' && obj.sourceUrl.trim() ? obj.sourceUrl.trim() : undefined
      return {
        reference,
        confidence: normalizeConfidence(obj.confidence),
        rationale: typeof obj.rationale === 'string' ? obj.rationale.trim() : '',
        sourceUrl,
      }
    })
    .filter((c): c is ReferenceCandidate => c !== null)
    .sort((a, b) => CONFIDENCE_VALUES.indexOf(a.confidence) - CONFIDENCE_VALUES.indexOf(b.confidence))
    .slice(0, 5)

  const estimatedValueUsd = typeof raw.estimatedValueUsd === 'number' && Number.isFinite(raw.estimatedValueUsd) && raw.estimatedValueUsd > 0
    ? Math.round(raw.estimatedValueUsd)
    : null
  const estimatedValueSource = typeof raw.estimatedValueSource === 'string' ? raw.estimatedValueSource.trim() : undefined

  return { candidates, estimatedValueUsd, estimatedValueSource, query }
}
