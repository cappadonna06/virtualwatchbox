import fs from 'node:fs/promises'
import { execFile } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { watches } from '../lib/watches'
import { processWatchImageBuffer } from '../lib/imageProcessing'
import {
  ensureWatchAssetDirs,
  isSupportedImage,
  manifestPath,
  processedDir,
  processedWebpDir,
  rawDir,
  withoutExtension,
} from './watch-image-pipeline'

type ManifestEntry = {
  watchId: string
  rawFilename: string
  pngPath: string
  webpPath: string
  sourceWidth: number
  sourceHeight: number
  processedWidth: number
  processedHeight: number
  backgroundRemovalApplied: boolean
}

const watchIds = new Set(watches.map(watch => watch.id))
const execFileAsync = promisify(execFile)

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

// macOS hatch: sharp's compiled libheif coverage varies by Node build, so when
// it can't decode an AVIF/HEIF input we fall back to `sips` (always present on
// darwin). The lib accepts this as `decodeFallback` and only invokes it when
// sharp throws on the original input.
async function decodeWithSips(input: Buffer): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'watch-process-'))
  const inputPath = path.join(tempDir, 'source')
  const outputPath = path.join(tempDir, 'source.png')
  try {
    await fs.writeFile(inputPath, input)
    await execFileAsync('/usr/bin/sips', ['-s', 'format', 'png', inputPath, '--out', outputPath])
    return await fs.readFile(outputPath)
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

async function processImage(rawFilename: string): Promise<ManifestEntry | null> {
  const watchId = withoutExtension(rawFilename)
  if (!watchIds.has(watchId)) {
    console.warn(`Processing ${rawFilename}: filename stem is not in the catalog yet; add a catalog watch with id "${watchId}" to render it in the app.`)
  }

  const rawPath = path.join(rawDir, rawFilename)
  const inputBuffer = await fs.readFile(rawPath)

  const decodeFallback = process.platform === 'darwin' ? decodeWithSips : undefined

  let processed
  try {
    processed = await processWatchImageBuffer(inputBuffer, { decodeFallback })
  } catch (err) {
    console.warn(`Skipped ${rawFilename}:`, err instanceof Error ? err.message : err)
    return null
  }

  if (!processed.sourceWidth || !processed.sourceHeight) {
    console.warn(`Skipped ${rawFilename}: unreadable image dimensions`)
    return null
  }

  const pngPath = path.join(processedDir, `${watchId}.png`)
  const webpPath = path.join(processedWebpDir, `${watchId}.webp`)
  await fs.writeFile(pngPath, processed.pngBuffer)
  await fs.writeFile(webpPath, processed.webpBuffer)

  return {
    watchId,
    rawFilename,
    pngPath: `/watch-assets/processed/${watchId}.png`,
    webpPath: `/watch-assets/processed/webp/${watchId}.webp`,
    sourceWidth: processed.sourceWidth,
    sourceHeight: processed.sourceHeight,
    processedWidth: processed.processedWidth,
    processedHeight: processed.processedHeight,
    backgroundRemovalApplied: processed.backgroundRemovalApplied,
  }
}

async function main() {
  ensureWatchAssetDirs()

  if (!await fileExists(rawDir)) {
    console.log('No raw image directory found.')
    return
  }

  const entries = await fs.readdir(rawDir, { withFileTypes: true })
  const rawFiles = entries
    .filter(entry => entry.isFile() && isSupportedImage(entry.name))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b))

  const manifest: ManifestEntry[] = []
  for (const rawFilename of rawFiles) {
    const t0 = Date.now()
    const entry = await processImage(rawFilename)
    if (entry) {
      manifest.push(entry)
      console.log(`  ${rawFilename} → ${entry.processedWidth}x${entry.processedHeight} (${Date.now() - t0}ms)${entry.backgroundRemovalApplied ? '' : ' [no bg removal]'}`)
    }
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log(`Processed ${manifest.length} image${manifest.length === 1 ? '' : 's'}. Manifest written to ${path.relative(process.cwd(), manifestPath)}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
