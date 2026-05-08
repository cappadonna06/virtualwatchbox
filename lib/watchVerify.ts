import sharp from 'sharp'
import {
  fetchOpenAIWithRetry,
  extractResponseText,
  parseVisionJson,
} from '@/lib/watchVision'

export type WatchVerification = {
  matches: boolean
  confidence: 'high' | 'medium' | 'low'
  observed: string
  conflictReason: string
}

export type VerifyExpected = {
  brand: string
  model: string
  reference: string
  dialColor: string
  caseSizeMm?: number | null
  caseMaterial?: string
}

const CONFIDENCE_VALUES: WatchVerification['confidence'][] = ['high', 'medium', 'low']

function normalizeConfidence(v: unknown): WatchVerification['confidence'] {
  if (typeof v === 'string' && (CONFIDENCE_VALUES as string[]).includes(v)) {
    return v as WatchVerification['confidence']
  }
  return 'low'
}

export async function verifyWatchImage(
  imageBuffer: Buffer,
  filename: string,
  expected: VerifyExpected,
): Promise<WatchVerification | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const previewBuffer = await sharp(imageBuffer)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 86 })
    .toBuffer()

  const imageDataUrl = `data:image/jpeg;base64,${previewBuffer.toString('base64')}`

  const expectedSpecs = [
    `${expected.brand} ${expected.model}`,
    expected.reference && `ref ${expected.reference}`,
    expected.dialColor && `${expected.dialColor} dial`,
    expected.caseSizeMm && `${expected.caseSizeMm}mm`,
    expected.caseMaterial && expected.caseMaterial,
  ].filter(Boolean).join(', ')

  const prompt = [
    'You are checking whether a wristwatch photo matches a known catalog entry. This is a sanity check on an image upload, not an open identification.',
    `Expected watch: ${expectedSpecs}.`,
    'Set matches=true ONLY if all of the following are visually consistent with the photo: brand identity (logo / unmistakable design language), dial color, and case material. If any of those clearly disagree, set matches=false.',
    'When you cannot tell from the photo (blurry, poor angle, dial obscured), prefer matches=true with a low confidence rather than a false rejection — the admin will judge.',
    'confidence reflects how clearly you can verify, not how certain you are it matches.',
    'observed = one short sentence on what you actually see in the photo (brand cues, dial color, case material).',
    'conflictReason = one short sentence naming what disagrees, only when matches=false. Empty string otherwise.',
    `Filename: ${filename}`,
    'Return ONLY this JSON: {"matches":true|false,"confidence":"high"|"medium"|"low","observed":"...","conflictReason":"..."}',
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

  return {
    matches: raw.matches !== false,
    confidence: normalizeConfidence(raw.confidence),
    observed: typeof raw.observed === 'string' ? raw.observed.trim() : '',
    conflictReason: typeof raw.conflictReason === 'string' ? raw.conflictReason.trim() : '',
  }
}
