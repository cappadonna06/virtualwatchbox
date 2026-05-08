import sharp from 'sharp'
import type { WatchType } from '@/types/watch'

export type WatchSubject = 'watch' | 'not_watch'

// Normalized 0..1 coordinates of the watch face (dial + bezel) within the photo,
// post-EXIF rotation. Used to crop wrist shots down to a dial-focused square for
// presentation in the watchbox. Null when no clear watch face is detected.
export type DialBbox = {
  x: number
  y: number
  w: number
  h: number
}

export type WatchIdentification = {
  subject: WatchSubject
  subjectLabel: string         // populated when subject='not_watch' (e.g. "cat", "smartphone", "empty watch box")
  brand: string
  model: string
  watchType: WatchType | ''
  dialColor: string
  dialDetails: string
  caseMaterial: string
  caseSizeMm: number | null
  lugWidthMm: number | null
  bracelet: string
  bezel: string
  movement: string
  estimatedValue: number | null
  confidence: 'high' | 'medium' | 'low' | 'unmatched'
  notes: string
  dialBbox: DialBbox | null
}

const ALLOWED_WATCH_TYPES: WatchType[] = [
  'Diver', 'Dress', 'Sport', 'Chronograph', 'GMT',
  'Pilot', 'Field', 'Integrated Bracelet', 'Vintage',
]

function normalizeWatchType(value?: string): WatchType | '' {
  if (!value) return ''
  const v = value.toLowerCase()
  const direct = ALLOWED_WATCH_TYPES.find(t => t.toLowerCase() === v)
  if (direct) return direct
  if (v.includes('diver')) return 'Diver'
  if (v.includes('dress')) return 'Dress'
  if (v.includes('chrono')) return 'Chronograph'
  if (v.includes('gmt') || v.includes('world-time')) return 'GMT'
  if (v.includes('pilot') || v.includes('aviation')) return 'Pilot'
  if (v.includes('field')) return 'Field'
  if (v.includes('integrated')) return 'Integrated Bracelet'
  if (v.includes('vintage') || v.includes('heritage')) return 'Vintage'
  if (v.includes('sport') || v.includes('automatic')) return 'Sport'
  return ''
}

export function extractResponseText(response: unknown): string {
  const outputText = (response as { output_text?: unknown }).output_text
  if (typeof outputText === 'string') return outputText

  const output = (response as { output?: Array<{ content?: Array<{ text?: string }> }> }).output
  return (
    output
      ?.flatMap(item => item.content ?? [])
      .map(c => c.text)
      .filter((t): t is string => Boolean(t))
      .join('\n') ?? ''
  )
}

function parseBbox(raw: unknown): DialBbox | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const x = typeof obj.x === 'number' ? obj.x : NaN
  const y = typeof obj.y === 'number' ? obj.y : NaN
  const w = typeof obj.w === 'number' ? obj.w : NaN
  const h = typeof obj.h === 'number' ? obj.h : NaN
  if (![x, y, w, h].every(Number.isFinite)) return null
  // Sanity: bbox must be inside the image, non-empty, and not absurdly small.
  if (w <= 0.02 || h <= 0.02) return null
  if (x < 0 || y < 0 || x >= 1 || y >= 1) return null
  if (x + w > 1.001 || y + h > 1.001) return null
  return { x, y, w, h }
}

export function parseVisionJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  // Prefer the LAST JSON object — web-search responses often prepend prose / citations
  // before emitting the final structured payload.
  const lastBrace = trimmed.lastIndexOf('{')
  const candidate = lastBrace >= 0 ? trimmed.slice(lastBrace) : trimmed
  const jsonText = candidate.startsWith('{') ? candidate : trimmed.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonText) return null
  try {
    return JSON.parse(jsonText) as Record<string, unknown>
  } catch {
    // fall back to first object if last-brace slice was malformed
    const first = trimmed.match(/\{[\s\S]*\}/)?.[0]
    if (!first) return null
    try { return JSON.parse(first) as Record<string, unknown> } catch { return null }
  }
}

export async function fetchOpenAIWithRetry(
  body: Record<string, unknown>,
  apiKey: string,
): Promise<Response | null> {
  let response: Response | null = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (response.ok || ![408, 429, 500, 502, 503, 504].includes(response.status)) break
    } catch { /* retry */ }
    if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 800))
  }
  return response
}

export async function identifyWatchWithVision(
  imageBuffer: Buffer,
  filename: string,
): Promise<WatchIdentification | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const previewBuffer = await sharp(imageBuffer)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 86 })
    .toBuffer()

  const imageDataUrl = `data:image/jpeg;base64,${previewBuffer.toString('base64')}`

  const prompt = [
    'You inspect images for a wristwatch identification system.',
    'STEP 1 — classification. Decide whether the image clearly shows a wristwatch (worn, posed, or in a product shot). Set subject="watch" if yes; otherwise set subject="not_watch" and set subjectLabel to a short noun or noun phrase describing what is in the image (e.g. "cat", "dog", "person without a visible watch", "empty watch box", "scenery", "smartphone", "blurry / unrecognizable"). When subject="not_watch", return empty strings and nulls for all watch-specific fields and stop reasoning further.',
    'STEP 2 — when subject="watch", return the visible visual fingerprint of the watch.',
    'Do NOT attempt to provide a manufacturer reference number. References are catalog SKUs (e.g. L3.830.4.92.6, 126610LN) and are essentially never visible in a dial photo. A downstream step will look up the reference from your output.',
    'Be specific in dialDetails (e.g. "sunburst blue, applied baton indices, polished hands, date at 6, AUTOMATIC text under handstack") and bezel (e.g. "polished fixed", "uni-directional black ceramic 60-min") — the lookup step uses these to disambiguate references.',
    'Estimate caseSizeMm and lugWidthMm only if you can ground the estimate in case-to-bracelet proportion or known model defaults; otherwise return null.',
    `watchType must be one of: ${ALLOWED_WATCH_TYPES.join(', ')}.`,
    'Use confidence high, medium, low, or unmatched based on how confidently you can name brand+model from what is visible.',
    'Use an empty string for unknown string fields and null for unknown number fields.',
    'STEP 3 — bounding box. Return dialBbox as a tight rectangle around the watch face (the full case + dial + bezel, but NOT the bracelet/strap). Coordinates are normalized to 0..1 of the image dimensions you are looking at. {"x": left, "y": top, "w": width, "h": height}. The box should fully contain the watch case but exclude as much wrist/strap/background as possible. If subject="not_watch" or you cannot localize a clear watch face, set dialBbox to null.',
    `Filename: ${filename}`,
    'Return only JSON with keys: subject, subjectLabel, brand, model, watchType, dialColor, dialDetails, caseMaterial, caseSizeMm, lugWidthMm, bracelet, bezel, movement, estimatedValue, confidence, notes, dialBbox.',
  ].join('\n')

  const response = await fetchOpenAIWithRetry({
    model: process.env.OPENAI_VISION_MODEL ?? 'gpt-4.1-mini',
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: prompt },
        { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
      ],
    }],
    temperature: 0,
  }, apiKey)

  if (!response?.ok) return null

  const raw = parseVisionJson(extractResponseText(await response.json()))
  if (!raw) return null

  const str = (v: unknown) => typeof v === 'string' ? v.trim() : ''
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null

  const subject: WatchSubject = raw.subject === 'not_watch' ? 'not_watch' : 'watch'

  return {
    subject,
    subjectLabel: str(raw.subjectLabel),
    dialBbox: parseBbox(raw.dialBbox),
    brand: str(raw.brand),
    model: str(raw.model),
    watchType: normalizeWatchType(str(raw.watchType)),
    dialColor: str(raw.dialColor),
    dialDetails: str(raw.dialDetails),
    caseMaterial: str(raw.caseMaterial),
    caseSizeMm: num(raw.caseSizeMm),
    lugWidthMm: num(raw.lugWidthMm),
    bracelet: str(raw.bracelet),
    bezel: str(raw.bezel),
    movement: str(raw.movement),
    estimatedValue: num(raw.estimatedValue),
    confidence: (['high', 'medium', 'low', 'unmatched'] as const).includes(raw.confidence as 'high') ? raw.confidence as 'high' : 'medium',
    notes: str(raw.notes),
  }
}
