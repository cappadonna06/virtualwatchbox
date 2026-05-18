import fs from 'node:fs/promises'
import path from 'node:path'
import { fal } from '@fal-ai/client'
import { watches } from '../lib/watches'
import type { CatalogWatch } from '../types/watch'
import {
  ensureWatchAssetDirs,
  imageExtensions,
  loadLocalEnv,
  rawDir,
} from './watch-image-pipeline'

type GenerationResult = {
  watchId: string
  status: 'generated' | 'skipped' | 'error'
  outputPath?: string
  error?: string
}

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

function flagValue(flag: string) {
  const prefix = `${flag}=`
  const match = process.argv.find(arg => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : undefined
}

function parseNumberFlag(flag: string, fallback: number) {
  const raw = flagValue(flag)
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function inferCaseShape(model: string): string {
  const m = model.toLowerCase()
  if (m.includes('reverso')) return 'rectangular Art Deco'
  if (m.includes('tank')) return 'rectangular'
  if (m.includes('monaco')) return 'square'
  if (m.includes('ellipse')) return 'rounded oval'
  if (m.includes('nautilus') || m.includes('royal oak') || m.includes('ingenieur') || m.includes('odysseus')) {
    return 'rounded octagonal with integrated bezel'
  }
  if (m.includes('aquanaut')) return 'rounded octagonal cushion'
  if (m.includes('luminor') || m.includes('radiomir') || m.includes('panerai')) return 'cushion'
  return 'round'
}

function inferMaterialDescriptor(caseMaterial: string): string {
  const m = caseMaterial.toLowerCase()
  if (m.includes('two-tone') || m.includes('/')) {
    return 'two-tone polished stainless steel with warm gold accents'
  }
  if (m.includes('rose gold') || m.includes('pink gold')) return 'polished rose gold'
  if (m.includes('yellow gold')) return 'polished yellow gold'
  if (m.includes('white gold')) return 'polished white gold'
  if (m.includes('platinum')) return 'polished platinum'
  if (m.includes('titanium')) return 'brushed grade-5 titanium'
  if (m.includes('bronze')) return 'patinated bronze'
  if (m.includes('ceramic')) return 'matte black ceramic'
  return 'polished stainless steel'
}

function inferStrap(watch: CatalogWatch): string {
  const model = watch.model.toLowerCase()
  if (model.includes('aquanaut')) {
    return 'a black tropical composite rubber strap with embossed grid pattern'
  }
  const integratedModels = ['nautilus', 'royal oak', 'ingenieur', 'odysseus', 'laureato', 'overseas', 'alpine eagle']
  if (integratedModels.some(name => model.includes(name)) || watch.watchType === 'Integrated Bracelet') {
    return 'an integrated polished and brushed steel bracelet matching the case'
  }
  switch (watch.watchType) {
    case 'Diver':
      return 'a brushed stainless steel three-link sport bracelet'
    case 'Pilot':
      return 'a thick brown calfskin pilot strap with white contrast stitching'
    case 'Field':
      return 'a green or sand canvas NATO strap'
    case 'Dress':
      return 'a slim black alligator leather strap'
    case 'Chronograph':
      return 'a polished stainless steel three-link bracelet'
    case 'GMT':
      return 'a brushed stainless steel Jubilee bracelet'
    case 'Sport':
      return 'a brushed stainless steel sport bracelet'
    case 'Vintage':
      return 'an aged tan leather strap with stitched edges'
    default:
      return 'a black leather strap'
  }
}

function inferComplicationsPhrase(complications: string[]): string {
  const set = new Set(complications.map(c => c.toLowerCase()))
  const parts: string[] = []

  if (set.has('chronograph')) parts.push('three chronograph sub-dials at 3, 6, and 9 o\'clock')
  if (set.has('gmt')) parts.push('a fourth GMT hand and 24-hour markings on the bezel')
  if (set.has('moonphase')) parts.push('a moonphase aperture at 6 o\'clock')
  if (set.has('tourbillon')) parts.push('a visible tourbillon cage at 6 o\'clock')
  if (set.has('power reserve')) parts.push('a power reserve indicator')
  if (set.has('day-date') || (set.has('day') && set.has('date'))) parts.push('day and date apertures')
  else if (set.has('date')) parts.push('a small date aperture at 3 o\'clock')
  if (set.has('world time')) parts.push('a world time city ring')
  if (set.has('annual calendar') || set.has('perpetual calendar')) parts.push('calendar sub-dials')

  const markers = 'slim applied baton hour markers and no numerals'
  if (parts.length === 0) return markers
  return `${parts.join(', ')}, ${markers}`
}

function buildPrompt(watch: CatalogWatch): string {
  const caseShape = inferCaseShape(watch.model)
  const material = inferMaterialDescriptor(watch.caseMaterial)
  const strap = inferStrap(watch)
  const complications = inferComplicationsPhrase(watch.complications)

  return [
    `Editorial studio product photograph of a single luxury ${watch.watchType.toLowerCase()} wristwatch, centered on a clean neutral light gray seamless background.`,
    `Case: ${caseShape}, ${material}, approximately ${watch.caseSizeMm}mm diameter, with finely brushed and polished surfaces.`,
    `Dial: ${watch.dialColor.toLowerCase()} dial, ${complications}, polished hands positioned at 10:10.`,
    `Strap: mounted on ${strap}.`,
    `Composition: head-on top-down product shot with slight forward tilt, watch fills 70 percent of the frame, soft directional studio lighting from the upper left, subtle drop shadow beneath, shallow depth of field, hyper-detailed surface reflections, photorealistic, editorial catalog quality, 8k.`,
    `The dial face is intentionally blank of any text, logo, brand name, signature, numeral, or written character. No writing anywhere on the dial, bezel, or strap.`,
  ].join(' ')
}

async function findExistingRawFor(watchId: string): Promise<string | undefined> {
  for (const ext of imageExtensions) {
    const candidate = path.join(rawDir, `${watchId}${ext}`)
    try {
      await fs.access(candidate)
      return candidate
    } catch {}
  }
  return undefined
}

function extensionFromUrl(url: string): string {
  const cleaned = url.split('?')[0]
  const ext = path.extname(cleaned).toLowerCase()
  return imageExtensions.has(ext) ? ext : '.jpg'
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Image download failed: ${response.status} ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function generateOne(
  watch: CatalogWatch,
  options: { force: boolean; dryRun: boolean }
): Promise<GenerationResult> {
  const existing = await findExistingRawFor(watch.id)
  if (existing && !options.force) {
    return { watchId: watch.id, status: 'skipped', outputPath: existing }
  }

  const prompt = buildPrompt(watch)

  if (options.dryRun) {
    console.log(`\n[dry-run] ${watch.id}`)
    console.log(prompt)
    return { watchId: watch.id, status: 'generated', outputPath: '(dry-run)' }
  }

  try {
    const result = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt,
        image_size: 'square_hd',
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false,
      },
      logs: false,
    })

    const images = (result as any)?.data?.images ?? (result as any)?.images
    const first = Array.isArray(images) ? images[0] : undefined
    const url: string | undefined = first?.url
    if (!url) throw new Error('Fal response did not include an image URL')

    const ext = extensionFromUrl(url)
    const outputPath = path.join(rawDir, `${watch.id}${ext}`)
    const bytes = await downloadImage(url)
    await fs.writeFile(outputPath, bytes)

    return { watchId: watch.id, status: 'generated', outputPath }
  } catch (error) {
    return {
      watchId: watch.id,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function runInChunks<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0

  async function next(): Promise<void> {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => next())
  await Promise.all(runners)
  return results
}

async function main() {
  loadLocalEnv()
  ensureWatchAssetDirs()

  const dryRun = hasFlag('--dry-run')
  const force = hasFlag('--force')
  const limit = parseNumberFlag('--limit', Number.POSITIVE_INFINITY)
  const concurrency = parseNumberFlag('--concurrency', 5)
  const only = flagValue('--only')?.split(',').map(s => s.trim()).filter(Boolean) ?? []

  if (!dryRun && !process.env.FAL_KEY) {
    console.error('FAL_KEY is not set. Add it to .env.local or pass --dry-run.')
    process.exit(1)
  }

  if (!dryRun) fal.config({ credentials: process.env.FAL_KEY })

  let candidates = watches.slice()
  if (only.length > 0) candidates = candidates.filter(w => only.includes(w.id))
  if (Number.isFinite(limit)) candidates = candidates.slice(0, limit)

  console.log(`Generating images for ${candidates.length} watches (concurrency=${concurrency}${dryRun ? ', DRY RUN' : ''}${force ? ', FORCE' : ''})`)

  let done = 0
  const results = await runInChunks(candidates, concurrency, async watch => {
    const result = await generateOne(watch, { force, dryRun })
    done += 1
    const tag = result.status === 'generated' ? 'OK' : result.status === 'skipped' ? 'SKIP' : 'ERR'
    const detail = result.status === 'error' ? ` — ${result.error}` : ''
    console.log(`[${done}/${candidates.length}] ${tag} ${watch.id}${detail}`)
    return result
  })

  const generated = results.filter(r => r.status === 'generated').length
  const skipped = results.filter(r => r.status === 'skipped').length
  const errors = results.filter(r => r.status === 'error')

  console.log(`\nDone. generated=${generated} skipped=${skipped} errors=${errors.length}`)
  if (errors.length > 0) {
    console.log('Errors:')
    for (const e of errors) console.log(`  - ${e.watchId}: ${e.error}`)
    process.exit(1)
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
