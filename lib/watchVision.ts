import sharp from 'sharp'
import type { WatchType } from '@/types/watch'

export type WatchIdentification = {
  brand: string
  model: string
  reference: string
  watchType: WatchType | ''
  dialColor: string
  caseMaterial: string
  caseSizeMm: number | null
  lugWidthMm: number | null
  movement: string
  estimatedValue: number | null
  confidence: 'high' | 'medium' | 'low' | 'unmatched'
  notes: string
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

function extractResponseText(response: unknown): string {
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

function parseVisionJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  const jsonText = trimmed.startsWith('{') ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonText) return null
  try {
    return JSON.parse(jsonText) as Record<string, unknown>
  } catch {
    return null
  }
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
    'Identify the wristwatch in this image for a local catalog intake workflow. Do not match against an existing app catalog.',
    'Use visible dial text, case shape, bezel, date layout, hands, strap/bracelet, and filename clues to infer catalog-ready data.',
    'Return the real watch identity visible in the image, even if the exact reference is uncertain.',
    'Use confidence high, medium, low, or unmatched. Be conservative when the reference or dimensions are inferred from filename/model knowledge rather than directly visible.',
    `watchType must be one of: ${ALLOWED_WATCH_TYPES.join(', ')}.`,
    'Use an empty string for unknown string fields and null for unknown number fields.',
    `Filename: ${filename}`,
    'Return only JSON with keys: brand, model, reference, watchType, dialColor, caseMaterial, caseSizeMm, lugWidthMm, movement, estimatedValue, confidence, notes.',
  ].join('\n')

  let response: Response | null = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OPENAI_VISION_MODEL ?? 'gpt-4.1-mini',
          input: [{
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
            ],
          }],
          temperature: 0,
        }),
      })
      if (response.ok || ![408, 429, 500, 502, 503, 504].includes(response.status)) break
    } catch { /* retry */ }
    if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 800))
  }

  if (!response?.ok) return null

  const raw = parseVisionJson(extractResponseText(await response.json()))
  if (!raw) return null

  const str = (v: unknown) => typeof v === 'string' ? v.trim() : ''
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null

  return {
    brand: str(raw.brand),
    model: str(raw.model),
    reference: str(raw.reference),
    watchType: normalizeWatchType(str(raw.watchType)),
    dialColor: str(raw.dialColor),
    caseMaterial: str(raw.caseMaterial),
    caseSizeMm: num(raw.caseSizeMm),
    lugWidthMm: num(raw.lugWidthMm),
    movement: str(raw.movement),
    estimatedValue: num(raw.estimatedValue),
    confidence: (['high', 'medium', 'low', 'unmatched'] as const).includes(raw.confidence as 'high') ? raw.confidence as 'high' : 'medium',
    notes: str(raw.notes),
  }
}
