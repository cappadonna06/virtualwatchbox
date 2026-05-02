import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { watches } from '../lib/watches'
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

const outputHeight = 900
const trimBackground = process.argv.includes('--trim-background')
const watchIds = new Set(watches.map(watch => watch.id))

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function removeBackgroundIfAvailable(inputPath: string) {
  try {
    const moduleName = 'rembg-node'
    const rembg = await import(moduleName)
    const removeBackground = rembg.removeBackground ?? rembg.default?.removeBackground ?? rembg.default

    if (typeof removeBackground !== 'function') {
      return { inputPath, applied: false }
    }

    const output = await removeBackground(inputPath)
    const buffer = Buffer.isBuffer(output) ? output : Buffer.from(output)
    return { input: buffer, applied: true }
  } catch {
    console.warn('Optional background removal unavailable; preserving source transparency and using Sharp trim.')
    return { inputPath, applied: false }
  }
}

async function processImage(rawFilename: string): Promise<ManifestEntry | null> {
  const watchId = withoutExtension(rawFilename)
  if (!watchIds.has(watchId)) {
    console.warn(`Processing ${rawFilename}: filename stem is not in the catalog yet; add a catalog watch with id "${watchId}" to render it in the app.`)
  }

  const rawPath = path.join(rawDir, rawFilename)
  const sourceMetadata = await sharp(rawPath).metadata()
  if (!sourceMetadata.width || !sourceMetadata.height) {
    console.warn(`Skipped ${rawFilename}: unreadable image dimensions`)
    return null
  }

  const backgroundResult = await removeBackgroundIfAvailable(rawPath)
  const input = 'input' in backgroundResult ? backgroundResult.input : rawPath

  let image = sharp(input).rotate().ensureAlpha()
  if (trimBackground) {
    image = image.trim({ background: { r: 255, g: 255, b: 255, alpha: 0 }, threshold: 12 })
  } else {
    image = image.trim({ threshold: 12 })
  }

  const trimmed = await image.png().toBuffer()
  const trimmedMetadata = await sharp(trimmed).metadata()
  const xPadding = Math.max(1, Math.round((trimmedMetadata.width ?? sourceMetadata.width) * 0.05))
  const yPadding = Math.max(1, Math.round((trimmedMetadata.height ?? sourceMetadata.height) * 0.05))

  const normalized = sharp(trimmed)
    .extend({
      top: yPadding,
      bottom: yPadding,
      left: xPadding,
      right: xPadding,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .resize({ height: outputHeight, fit: 'contain', withoutEnlargement: false })
    .png()

  const pngBuffer = await normalized.toBuffer()
  const processedMetadata = await sharp(pngBuffer).metadata()
  const pngPath = path.join(processedDir, `${watchId}.png`)
  const webpPath = path.join(processedWebpDir, `${watchId}.webp`)

  await fs.writeFile(pngPath, pngBuffer)
  await sharp(pngBuffer).webp({ quality: 88 }).toFile(webpPath)

  return {
    watchId,
    rawFilename,
    pngPath: `/watch-assets/processed/${watchId}.png`,
    webpPath: `/watch-assets/processed/webp/${watchId}.webp`,
    sourceWidth: sourceMetadata.width,
    sourceHeight: sourceMetadata.height,
    processedWidth: processedMetadata.width ?? 0,
    processedHeight: processedMetadata.height ?? 0,
    backgroundRemovalApplied: backgroundResult.applied,
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
    const entry = await processImage(rawFilename)
    if (entry) manifest.push(entry)
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log(`Processed ${manifest.length} image${manifest.length === 1 ? '' : 's'}. Manifest written to ${path.relative(process.cwd(), manifestPath)}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
