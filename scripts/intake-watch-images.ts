import fs from 'node:fs/promises'
import { execFile } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { watches } from '../lib/watches'
import type { CatalogWatch, WatchType } from '../types/watch'
import {
  type Confidence,
  type IntakeRow,
  ensureWatchAssetDirs,
  inboxDir,
  intakeCsvPath,
  isSupportedImage,
  loadLocalEnv,
  slugify,
  toCsv,
  withoutExtension,
} from './watch-image-pipeline'

type Match = {
  watch?: CatalogWatch
  confidence: Confidence
  score: number
  notes: string[]
}

type VisionIdentification = {
  brand?: string
  model?: string
  reference?: string
  watchType?: string
  dialColor?: string
  caseMaterial?: string
  caseSizeMm?: number
  lugWidthMm?: number
  movement?: string
  estimatedValue?: number
  confidence?: Confidence
  notes?: string
}

type IntakeSuggestion = Match & {
  vision?: VisionIdentification
  catalogAction: 'existing' | 'new-catalog-candidate' | 'unmatched'
}

let warnedMissingVisionKey = false
const execFileAsync = promisify(execFile)
const allowedWatchTypes: WatchType[] = ['Diver', 'Dress', 'Sport', 'Chronograph', 'GMT', 'Pilot', 'Field', 'Integrated Bracelet', 'Vintage']

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function tokenSet(value: string) {
  return new Set(
    slugify(value)
      .split('-')
      .filter(token => token.length >= 2)
  )
}

function compactReference(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

function scoreWatch(filename: string, watch: CatalogWatch): Match {
  const filenameTokens = tokenSet(filename)
  const haystack = slugify(filename)
  const filenameRef = compactReference(filename)
  const notes: string[] = []
  let score = 0

  const brandTokens = tokenSet(watch.brand)
  const modelTokens = tokenSet(watch.model)
  const reference = compactReference(watch.reference)

  if (reference && filenameRef.includes(reference)) {
    score += 80
    notes.push('reference')
  }

  const brandHits = [...brandTokens].filter(token => filenameTokens.has(token))
  if (brandHits.length > 0) {
    score += 24
    notes.push('brand')
  }

  const modelHits = [...modelTokens].filter(token => filenameTokens.has(token))
  if (modelHits.length > 0) {
    score += modelHits.length * 12
    notes.push('model')
  }

  if (haystack.includes(watch.id)) {
    score += 72
    notes.push('watch id')
  }

  const dialHits = [...tokenSet(watch.dialColor)].filter(token => filenameTokens.has(token))
  if (dialHits.length > 0) {
    score += 8
    notes.push('dial')
  }

  const typeHits = [...tokenSet(watch.watchType)].filter(token => filenameTokens.has(token))
  if (typeHits.length > 0) {
    score += 6
    notes.push('type')
  }

  const materialHits = [...tokenSet(watch.caseMaterial)].filter(token => filenameTokens.has(token))
  if (materialHits.length > 0) {
    score += 4
    notes.push('material')
  }

  return { watch, confidence: confidenceFromScore(score), score, notes }
}

function confidenceFromScore(score: number): Confidence {
  if (score >= 72) return 'high'
  if (score >= 38) return 'medium'
  if (score >= 18) return 'low'
  return 'unmatched'
}

function compactValue(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function normalizeNumber(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normalizeWatchType(value?: string): WatchType | '' {
  const normalized = slugify(value ?? '')
  const direct = allowedWatchTypes.find(type => slugify(type) === normalized)
  if (direct) return direct

  if (normalized.includes('diver')) return 'Diver'
  if (normalized.includes('dress')) return 'Dress'
  if (normalized.includes('chrono')) return 'Chronograph'
  if (normalized.includes('gmt') || normalized.includes('world-time')) return 'GMT'
  if (normalized.includes('pilot') || normalized.includes('aviation')) return 'Pilot'
  if (normalized.includes('field')) return 'Field'
  if (normalized.includes('integrated')) return 'Integrated Bracelet'
  if (normalized.includes('vintage') || normalized.includes('heritage')) return 'Vintage'
  if (normalized.includes('sport') || normalized.includes('luxury-sports') || normalized.includes('automatic')) return 'Sport'

  return ''
}

function normalizeVisionIdentification(vision: VisionIdentification): VisionIdentification {
  return {
    brand: compactValue(vision.brand),
    model: compactValue(vision.model),
    reference: compactValue(vision.reference),
    watchType: normalizeWatchType(vision.watchType),
    dialColor: compactValue(vision.dialColor),
    caseMaterial: compactValue(vision.caseMaterial),
    caseSizeMm: normalizeNumber(vision.caseSizeMm),
    lugWidthMm: normalizeNumber(vision.lugWidthMm),
    movement: compactValue(vision.movement),
    estimatedValue: normalizeNumber(vision.estimatedValue),
    confidence: vision.confidence ?? 'medium',
    notes: compactValue(vision.notes),
  }
}

async function getImageMetadataNote(filePath: string) {
  try {
    const metadata = await sharp(filePath).metadata()
    if (!metadata.width || !metadata.height) return ''
    return `metadata ${metadata.width}x${metadata.height}${metadata.hasAlpha ? ' alpha' : ''}`
  } catch {
    return ''
  }
}

async function sharpPreviewBuffer(input: string | Buffer) {
  return sharp(input)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 86 })
    .toBuffer()
}

async function sipsJpegPreviewBuffer(filePath: string) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'watch-intake-'))
  const outputPath = path.join(tempDir, 'preview.jpg')

  try {
    await execFileAsync('/usr/bin/sips', ['-s', 'format', 'jpeg', filePath, '--out', outputPath])
    return await sharpPreviewBuffer(outputPath)
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

async function imageDataUrl(filePath: string) {
  let buffer: Buffer

  try {
    buffer = await sharpPreviewBuffer(filePath)
  } catch (error) {
    if (process.platform !== 'darwin') throw error

    buffer = await sipsJpegPreviewBuffer(filePath)
  }

  return `data:image/jpeg;base64,${buffer.toString('base64')}`
}

function extractResponseText(response: unknown): string {
  const outputText = (response as { output_text?: unknown }).output_text
  if (typeof outputText === 'string') return outputText

  const output = (response as { output?: Array<{ content?: Array<{ text?: string }> }> }).output
  return output
    ?.flatMap(item => item.content ?? [])
    .map(content => content.text)
    .filter((text): text is string => Boolean(text))
    .join('\n') ?? ''
}

function parseVisionJson(text: string): VisionIdentification | null {
  const trimmed = text.trim()
  const jsonText = trimmed.startsWith('{') ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonText) return null

  try {
    return JSON.parse(jsonText) as VisionIdentification
  } catch {
    return null
  }
}

async function identifyImageWithVision(filename: string, filePath: string): Promise<VisionIdentification | null> {
  if (hasFlag('--no-vision')) return null

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    if (!warnedMissingVisionKey) {
      console.warn('OPENAI_API_KEY is not set; intake is using filename/catalog matching only. Set it or pass --no-vision to silence this.')
      warnedMissingVisionKey = true
    }
    return null
  }

  const prompt = [
    'Identify the wristwatch in this image for a local catalog intake workflow. Do not match against an existing app catalog.',
    'Use visible dial text, case shape, bezel, date layout, hands, strap/bracelet, and filename clues to infer catalog-ready data.',
    'Return the real watch identity visible in the image, even if the exact reference is uncertain.',
    'Use confidence high, medium, low, or unmatched. Be conservative when the reference or dimensions are inferred from filename/model knowledge rather than directly visible.',
    `watchType must be one of: ${allowedWatchTypes.join(', ')}.`,
    'Use an empty string for unknown string fields and null for unknown number fields.',
    `Filename: ${filename}`,
    'Return only JSON with keys: brand, model, reference, watchType, dialColor, caseMaterial, caseSizeMm, lugWidthMm, movement, estimatedValue, confidence, notes.',
  ].join('\n')

  const inputImage = await imageDataUrl(filePath)
  let response: Response | null = null
  let lastError: unknown = null

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_VISION_MODEL ?? 'gpt-4.1-mini',
          input: [
            {
              role: 'user',
              content: [
                { type: 'input_text', text: prompt },
                { type: 'input_image', image_url: inputImage, detail: 'high' },
              ],
            },
          ],
          temperature: 0,
        }),
      })

      if (response.ok || ![408, 429, 500, 502, 503, 504].includes(response.status)) {
        break
      }
    } catch (error) {
      lastError = error
    }

    if (attempt < 3) {
      await sleep(attempt * 800)
    }
  }

  if (!response) {
    console.warn(`Vision identification failed for ${filename}: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
    return null
  }

  if (!response.ok) {
    const body = await response.text()
    console.warn(`Vision identification failed for ${filename}: ${response.status} ${body}`)
    return null
  }

  const data = await response.json()
  const vision = parseVisionJson(extractResponseText(data))
  return vision ? normalizeVisionIdentification(vision) : null
}

async function suggestMatch(filename: string, filePath: string): Promise<IntakeSuggestion> {
  const metadataNote = await getImageMetadataNote(filePath)
  const vision = await identifyImageWithVision(filename, filePath)

  if (vision && vision.confidence !== 'unmatched' && (vision.brand || vision.model || vision.reference)) {
    return {
      vision,
      confidence: vision.confidence ?? 'medium',
      score: 70,
      notes: [
        'vision catalog candidate',
        ...(vision.notes ? [vision.notes] : []),
        ...(metadataNote ? [metadataNote] : []),
      ],
      catalogAction: 'new-catalog-candidate',
    }
  }

  const ranked = watches
    .map(watch => scoreWatch(filename, watch))
    .sort((a, b) => b.score - a.score)
  const best = ranked[0]

  if (!best || best.confidence === 'unmatched') {
    return {
      confidence: 'unmatched',
      score: 0,
      notes: metadataNote ? [metadataNote] : [],
      catalogAction: 'unmatched',
    }
  }

  return {
    ...best,
    catalogAction: 'existing',
    notes: metadataNote ? [...best.notes, metadataNote] : best.notes,
  }
}

async function main() {
  loadLocalEnv()
  ensureWatchAssetDirs()

  const entries = await fs.readdir(inboxDir, { withFileTypes: true })
  const files = entries
    .filter(entry => entry.isFile() && isSupportedImage(entry.name))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b))

  const rows: IntakeRow[] = []

  for (const filename of files) {
    const filePath = path.join(inboxDir, filename)
    const match = await suggestMatch(filename, filePath)
    const watch = match.watch
    const vision = match.vision
    const extension = path.extname(filename).toLowerCase()
    const visionSlug = slugify([
      vision?.brand,
      vision?.model,
      vision?.reference || vision?.dialColor,
    ]
      .filter(Boolean)
      .filter((value, index, values) => values.findIndex(other => slugify(other ?? '') === slugify(value ?? '')) === index)
      .join(' '))
    const suggestedId = watch?.id ?? (visionSlug || slugify(withoutExtension(filename)))
    const suggestedRawFilename = match.catalogAction === 'new-catalog-candidate'
      ? `${suggestedId}${extension}`
      : watch
      ? `${watch.id}${extension}`
      : `${suggestedId}${extension}`

    rows.push({
      originalFilename: filename,
      suggestedWatchId: suggestedId,
      brand: watch?.brand ?? vision?.brand ?? '',
      model: watch?.model ?? vision?.model ?? '',
      reference: watch?.reference ?? vision?.reference ?? '',
      confidence: match.confidence,
      suggestedRawFilename,
      status: 'needs-review',
      notes: match.notes.join('; '),
      watchType: watch?.watchType ?? vision?.watchType ?? '',
      dialColor: watch?.dialColor ?? vision?.dialColor ?? '',
      caseMaterial: watch?.caseMaterial ?? vision?.caseMaterial ?? '',
      caseSizeMm: watch?.caseSizeMm ? String(watch.caseSizeMm) : vision?.caseSizeMm ? String(vision.caseSizeMm) : '',
      lugWidthMm: watch?.lugWidthMm ? String(watch.lugWidthMm) : vision?.lugWidthMm ? String(vision.lugWidthMm) : '',
      movement: watch?.movement ?? vision?.movement ?? '',
      estimatedValue: watch?.estimatedValue ? String(watch.estimatedValue) : vision?.estimatedValue ? String(vision.estimatedValue) : '',
      identificationSource: vision ? 'vision' : 'filename',
      catalogAction: match.catalogAction,
    })
  }

  await fs.writeFile(intakeCsvPath, toCsv(rows), 'utf8')

  const counts = rows.reduce<Record<Confidence, number>>(
    (result, row) => {
      result[row.confidence] += 1
      return result
    },
    { high: 0, medium: 0, low: 0, unmatched: 0 }
  )

  console.log(`Intake review written: ${path.relative(process.cwd(), intakeCsvPath)}`)
  console.log(`Images reviewed: ${rows.length} | high ${counts.high}, medium ${counts.medium}, low ${counts.low}, unmatched ${counts.unmatched}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
