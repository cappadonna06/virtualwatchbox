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

export async function lookupReferenceCandidates(
  visual: WatchIdentification,
): Promise<ReferenceLookupResult> {
  const empty: ReferenceLookupResult = { candidates: [], estimatedValueUsd: null, query: '' }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return empty
  if (!visual.brand || visual.confidence === 'unmatched') return empty

  const specLine = buildSpecLine(visual)
  const query = `${visual.brand} ${visual.model} ${specLine}`.trim()

  const prompt = [
    `Find the manufacturer reference number(s) and current estimated market value for a ${visual.brand} ${visual.model || '(model unknown)'}.`,
    `Visible specs: ${specLine || '(none)'}.`,
    'Search the brand\'s official site first, then reputable dealers (Hodinkee, Bob\'s Watches, Crown & Caliber, official boutique pages, WatchCharts, Chrono24 sold listings). Avoid generic / non-specific listings.',
    '',
    '== references ==',
    'Return up to 5 candidate references with a confidence (high/medium/low) and a one-line rationale that names the differentiating spec — e.g. "blue dial 41mm steel bracelet — L3.830.4.92.6".',
    'Confidence rubric:',
    '  high   = brand site or boutique page lists this reference matching ALL visible specs',
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
