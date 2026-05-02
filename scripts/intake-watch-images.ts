import fs from 'node:fs/promises'
import { execFile } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { watches } from '../lib/watches'
import type { CatalogWatch } from '../types/watch'
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
  existingWatchId?: string
  confidence?: Confidence
  notes?: string
}

type IntakeSuggestion = Match & {
  vision?: VisionIdentification
  catalogAction: 'existing' | 'new-catalog-candidate' | 'unmatched'
}

let warnedMissingVisionKey = false
const execFileAsync = promisify(execFile)

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

function scoreCatalogText(value: string, watch: CatalogWatch): Match {
  const tokens = tokenSet(value)
  const haystack = slugify(value)
  const referenceText = compactReference(value)
  const notes: string[] = []
  let score = 0

  const reference = compactReference(watch.reference)
  if (reference && referenceText.includes(reference)) {
    score += 90
    notes.push('vision reference')
  }

  const brandHits = [...tokenSet(watch.brand)].filter(token => tokens.has(token))
  if (brandHits.length > 0) {
    score += 24
    notes.push('vision brand')
  }

  const modelHits = [...tokenSet(watch.model)].filter(token => tokens.has(token))
  if (modelHits.length > 0) {
    score += modelHits.length * 14
    notes.push('vision model')
  }

  if (haystack.includes(watch.id)) {
    score += 72
    notes.push('vision watch id')
  }

  return { watch, confidence: confidenceFromScore(score), score, notes }
}

function bestCatalogTextMatch(value: string) {
  return watches
    .map(watch => scoreCatalogText(value, watch))
    .sort((a, b) => b.score - a.score)[0]
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

  const catalog = watches
    .map(watch => `${watch.id} | ${watch.brand} | ${watch.model} | ${watch.reference} | ${watch.watchType} | ${watch.dialColor} | ${watch.caseMaterial}`)
    .join('\n')

  const prompt = [
    'Identify the wristwatch in this image for a local catalog intake workflow.',
    'Use visible dial text, case shape, bezel, date layout, hands, strap/bracelet, and filename clues.',
    'If it matches an existing catalog row exactly, set existingWatchId to that id.',
    'If it is not in the catalog, leave existingWatchId empty and return the best catalog-ready fields you can infer.',
    'Use confidence high, medium, low, or unmatched. Be conservative when the reference is not visible.',
    `Filename: ${filename}`,
    'Existing catalog:',
    catalog,
    'Return only JSON with keys: brand, model, reference, watchType, dialColor, caseMaterial, caseSizeMm, lugWidthMm, movement, estimatedValue, existingWatchId, confidence, notes.',
  ].join('\n')

  let response: Response
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
              { type: 'input_image', image_url: await imageDataUrl(filePath), detail: 'high' },
            ],
          },
        ],
        temperature: 0,
      }),
    })
  } catch (error) {
    console.warn(`Vision identification failed for ${filename}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }

  if (!response.ok) {
    const body = await response.text()
    console.warn(`Vision identification failed for ${filename}: ${response.status} ${body}`)
    return null
  }

  const data = await response.json()
  return parseVisionJson(extractResponseText(data))
}

async function suggestMatch(filename: string, filePath: string): Promise<IntakeSuggestion> {
  const ranked = watches
    .map(watch => scoreWatch(filename, watch))
    .sort((a, b) => b.score - a.score)
  const best = ranked[0]
  const metadataNote = await getImageMetadataNote(filePath)
  const vision = await identifyImageWithVision(filename, filePath)
  const visionText = vision
    ? [vision.brand, vision.model, vision.reference, vision.dialColor, vision.caseMaterial].filter(Boolean).join(' ')
    : ''
  const visionMatch = vision?.existingWatchId
    ? watches.find(watch => watch.id === vision.existingWatchId)
    : visionText
    ? bestCatalogTextMatch(visionText)?.watch
    : undefined

  if (vision && visionMatch) {
    return {
      watch: visionMatch,
      vision,
      confidence: vision.confidence ?? 'medium',
      score: 100,
      notes: [
        'vision',
        ...(vision.notes ? [vision.notes] : []),
        ...(metadataNote ? [metadataNote] : []),
      ],
      catalogAction: 'existing',
    }
  }

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
    const visionSlug = slugify([vision?.brand, vision?.model, vision?.reference].filter(Boolean).join(' '))
    const suggestedId = watch?.id ?? (visionSlug || slugify(withoutExtension(filename)))

    rows.push({
      originalFilename: filename,
      suggestedWatchId: suggestedId,
      brand: watch?.brand ?? vision?.brand ?? '',
      model: watch?.model ?? vision?.model ?? '',
      reference: watch?.reference ?? vision?.reference ?? '',
      confidence: match.confidence,
      suggestedRawFilename: `${suggestedId || slugify(withoutExtension(filename))}${extension}`,
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
