import fs from 'node:fs/promises'
import { execFile } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
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
const alphaThreshold = 12
const trimBackground = process.argv.includes('--trim-background')
const watchIds = new Set(watches.map(watch => watch.id))
const execFileAsync = promisify(execFile)
let warnedAboutOptionalBackgroundRemoval = false

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
    if (!warnedAboutOptionalBackgroundRemoval) {
      console.warn('Optional rembg background removal unavailable; using built-in deterministic edge-background removal.')
      warnedAboutOptionalBackgroundRemoval = true
    }
    return { inputPath, applied: false }
  }
}

async function decodeWithSips(rawPath: string) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'watch-process-'))
  const outputPath = path.join(tempDir, 'source.png')

  try {
    await execFileAsync('/usr/bin/sips', ['-s', 'format', 'png', rawPath, '--out', outputPath])
    return await fs.readFile(outputPath)
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

async function sharpInputForRaw(rawPath: string) {
  try {
    const metadata = await sharp(rawPath).metadata()
    await sharp(rawPath)
      .resize({ width: 1, height: 1, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()

    return {
      input: rawPath,
      sourceWidth: metadata.width,
      sourceHeight: metadata.height,
    }
  } catch (error) {
    if (process.platform !== 'darwin') throw error

    const input = await decodeWithSips(rawPath)
    const metadata = await sharp(input).metadata()
    return {
      input,
      sourceWidth: metadata.width,
      sourceHeight: metadata.height,
    }
  }
}

function colorDistanceSquared(data: Buffer, offset: number, color: { r: number; g: number; b: number }) {
  const dr = data[offset] - color.r
  const dg = data[offset + 1] - color.g
  const db = data[offset + 2] - color.b
  return dr * dr + dg * dg + db * db
}

function pixelOffset(x: number, y: number, width: number) {
  return (y * width + x) * 4
}

async function removeConnectedEdgeBackground(input: Buffer) {
  const { data, info } = await sharp(input)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const borderSamples: Array<{ r: number; g: number; b: number }> = []

  for (let x = 0; x < width; x += 1) {
    for (const y of [0, height - 1]) {
      const offset = pixelOffset(x, y, width)
      if (data[offset + 3] > 220) borderSamples.push({ r: data[offset], g: data[offset + 1], b: data[offset + 2] })
    }
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (const x of [0, width - 1]) {
      const offset = pixelOffset(x, y, width)
      if (data[offset + 3] > 220) borderSamples.push({ r: data[offset], g: data[offset + 1], b: data[offset + 2] })
    }
  }

  if (borderSamples.length < Math.max(width, height)) {
    return { buffer: input, applied: false }
  }

  const lightBorderSamples = borderSamples.filter(sample => sample.r >= 220 && sample.g >= 220 && sample.b >= 220)
  const darkBorderSamples = borderSamples.filter(sample => sample.r <= 35 && sample.g <= 35 && sample.b <= 35)
  const borderRanges = borderSamples.reduce(
    (ranges, sample) => ({
      minR: Math.min(ranges.minR, sample.r),
      maxR: Math.max(ranges.maxR, sample.r),
      minG: Math.min(ranges.minG, sample.g),
      maxG: Math.max(ranges.maxG, sample.g),
      minB: Math.min(ranges.minB, sample.b),
      maxB: Math.max(ranges.maxB, sample.b),
    }),
    { minR: 255, maxR: 0, minG: 255, maxG: 0, minB: 255, maxB: 0 },
  )
  const backgroundSamples = lightBorderSamples.length > borderSamples.length * 0.2
    ? lightBorderSamples
    : darkBorderSamples.length > borderSamples.length * 0.2
    ? darkBorderSamples
    : borderSamples

  const background = backgroundSamples.reduce(
    (sum, sample) => ({ r: sum.r + sample.r, g: sum.g + sample.g, b: sum.b + sample.b }),
    { r: 0, g: 0, b: 0 },
  )
  background.r = Math.round(background.r / backgroundSamples.length)
  background.g = Math.round(background.g / backgroundSamples.length)
  background.b = Math.round(background.b / backgroundSamples.length)

  const isLightStudioBackground = background.r >= 225 && background.g >= 225 && background.b >= 225
  const isDarkStudioBackground = background.r <= 30 && background.g <= 30 && background.b <= 30
  const isUniformEdgeBackground =
    borderRanges.maxR - borderRanges.minR <= 8 &&
    borderRanges.maxG - borderRanges.minG <= 8 &&
    borderRanges.maxB - borderRanges.minB <= 8

  if (!isLightStudioBackground && !isDarkStudioBackground && !isUniformEdgeBackground && !trimBackground) {
    return { buffer: input, applied: false }
  }

  const threshold = isLightStudioBackground ? 18 : isUniformEdgeBackground ? 12 : 24
  const thresholdSquared = threshold * threshold
  const visited = new Uint8Array(width * height)
  const queue: Array<[number, number]> = []

  function enqueueIfBackground(x: number, y: number) {
    const index = y * width + x
    if (visited[index]) return
    const offset = pixelOffset(x, y, width)
    if (data[offset + 3] <= alphaThreshold || colorDistanceSquared(data, offset, background) <= thresholdSquared) {
      visited[index] = 1
      queue.push([x, y])
    }
  }

  for (let x = 0; x < width; x += 1) {
    enqueueIfBackground(x, 0)
    enqueueIfBackground(x, height - 1)
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueueIfBackground(0, y)
    enqueueIfBackground(width - 1, y)
  }

  let removed = 0
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor]
    const offset = pixelOffset(x, y, width)
    if (data[offset + 3] !== 0) {
      data[offset + 3] = 0
      removed += 1
    }

    if (x > 0) enqueueIfBackground(x - 1, y)
    if (x < width - 1) enqueueIfBackground(x + 1, y)
    if (y > 0) enqueueIfBackground(x, y - 1)
    if (y < height - 1) enqueueIfBackground(x, y + 1)
  }

  const minRemovedPixels = Math.round(width * height * 0.01)
  if (removed < minRemovedPixels) {
    return { buffer: input, applied: false }
  }

  const buffer = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer()
  return { buffer, applied: true }
}

async function cropToAlphaBounds(input: Buffer) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  let left = width
  let top = height
  let right = -1
  let bottom = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[pixelOffset(x, y, width) + 3]
      if (alpha <= alphaThreshold) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (right < left || bottom < top) return input

  return sharp(input)
    .extract({
      left,
      top,
      width: right - left + 1,
      height: bottom - top + 1,
    })
    .png()
    .toBuffer()
}

async function removeSmallAlphaComponents(input: Buffer) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const visited = new Uint8Array(width * height)
  const components: Array<{ pixels: number; indexes: number[] }> = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIndex = y * width + x
      if (visited[startIndex] || data[pixelOffset(x, y, width) + 3] <= alphaThreshold) continue

      const queue: Array<[number, number]> = [[x, y]]
      const indexes: number[] = []
      visited[startIndex] = 1

      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const [currentX, currentY] = queue[cursor]
        const currentIndex = currentY * width + currentX
        indexes.push(currentIndex)

        const neighbors = [
          [currentX - 1, currentY],
          [currentX + 1, currentY],
          [currentX, currentY - 1],
          [currentX, currentY + 1],
        ]

        for (const [nextX, nextY] of neighbors) {
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue

          const nextIndex = nextY * width + nextX
          if (visited[nextIndex] || data[pixelOffset(nextX, nextY, width) + 3] <= alphaThreshold) continue

          visited[nextIndex] = 1
          queue.push([nextX, nextY])
        }
      }

      components.push({ pixels: indexes.length, indexes })
    }
  }

  if (components.length <= 1) return input

  components.sort((a, b) => b.pixels - a.pixels)
  const largestPixels = components[0].pixels
  const minPixelsToKeep = Math.max(100, Math.round(largestPixels * 0.02))
  let removed = 0

  for (const component of components.slice(1)) {
    if (component.pixels >= minPixelsToKeep) continue

    for (const index of component.indexes) {
      data[index * 4 + 3] = 0
      removed += 1
    }
  }

  if (removed === 0) return input

  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

async function removeBottomStudioPlatform(input: Buffer) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  let removedRows = 0

  for (let y = height - 1; y >= 0; y -= 1) {
    let opaquePixels = 0
    let brightPixels = 0
    let left = width
    let right = -1

    for (let x = 0; x < width; x += 1) {
      const offset = pixelOffset(x, y, width)
      if (data[offset + 3] <= alphaThreshold) continue

      opaquePixels += 1
      left = Math.min(left, x)
      right = Math.max(right, x)

      const luma = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2]
      if (luma >= 232) brightPixels += 1
    }

    if (opaquePixels === 0) {
      if (removedRows > 0) break
      continue
    }

    const rowCoverage = (right - left + 1) / width
    const brightRatio = brightPixels / opaquePixels
    const isLikelyStudioPlatform =
      rowCoverage <= 0.45 &&
      (brightRatio >= 0.55 || (removedRows > 0 && removedRows < 4 && brightRatio >= 0.1))
    if (!isLikelyStudioPlatform) break

    for (let x = left; x <= right; x += 1) {
      data[pixelOffset(x, y, width) + 3] = 0
    }
    removedRows += 1
  }

  if (removedRows === 0) return input

  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

async function processImage(rawFilename: string): Promise<ManifestEntry | null> {
  const watchId = withoutExtension(rawFilename)
  if (!watchIds.has(watchId)) {
    console.warn(`Processing ${rawFilename}: filename stem is not in the catalog yet; add a catalog watch with id "${watchId}" to render it in the app.`)
  }

  const rawPath = path.join(rawDir, rawFilename)
  const source = await sharpInputForRaw(rawPath)
  if (!source.sourceWidth || !source.sourceHeight) {
    console.warn(`Skipped ${rawFilename}: unreadable image dimensions`)
    return null
  }

  const backgroundResult = typeof source.input === 'string'
    ? await removeBackgroundIfAvailable(rawPath)
    : { input: source.input, applied: false }
  const input = 'input' in backgroundResult ? backgroundResult.input : source.input

  const sourceBuffer = await sharp(input).rotate().ensureAlpha().png().toBuffer()
  const preCropped = await cropToAlphaBounds(sourceBuffer)
  const edgeBackgroundResult = await removeConnectedEdgeBackground(preCropped)
  const cleaned = await removeSmallAlphaComponents(edgeBackgroundResult.buffer)
  const platformCleaned = await removeBottomStudioPlatform(cleaned)
  const cropped = await cropToAlphaBounds(platformCleaned)
  const trimmedMetadata = await sharp(cropped).metadata()
  const xPadding = Math.max(1, Math.round((trimmedMetadata.width ?? source.sourceWidth) * 0.05))
  const yPadding = Math.max(1, Math.round((trimmedMetadata.height ?? source.sourceHeight) * 0.05))

  const padded = await sharp(cropped)
    .extend({
      top: yPadding,
      bottom: yPadding,
      left: xPadding,
      right: xPadding,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer()

  const normalized = sharp(padded)
    .resize({ height: outputHeight, withoutEnlargement: false })
    .png()

  const pngBuffer = await removeBottomStudioPlatform(await normalized.toBuffer())
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
    sourceWidth: source.sourceWidth,
    sourceHeight: source.sourceHeight,
    processedWidth: processedMetadata.width ?? 0,
    processedHeight: processedMetadata.height ?? 0,
    backgroundRemovalApplied: backgroundResult.applied || edgeBackgroundResult.applied,
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
