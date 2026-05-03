import sharp from 'sharp'

const OUTPUT_HEIGHT = 900
const ALPHA_THRESHOLD = 12

export type ProcessedImage = {
  pngBuffer: Buffer
  webpBuffer: Buffer
  sourceWidth: number
  sourceHeight: number
  processedWidth: number
  processedHeight: number
  backgroundRemovalApplied: boolean
}

function pixelOffset(x: number, y: number, width: number) {
  return (y * width + x) * 4
}

function colorDistanceSquared(data: Buffer, offset: number, color: { r: number; g: number; b: number }) {
  const dr = data[offset] - color.r
  const dg = data[offset + 1] - color.g
  const db = data[offset + 2] - color.b
  return dr * dr + dg * dg + db * db
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
      if (alpha <= ALPHA_THRESHOLD) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (right < left || bottom < top) return input

  return sharp(input)
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .png()
    .toBuffer()
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

  const lightBorderSamples = borderSamples.filter(s => s.r >= 220 && s.g >= 220 && s.b >= 220)
  const darkBorderSamples = borderSamples.filter(s => s.r <= 35 && s.g <= 35 && s.b <= 35)
  const borderRanges = borderSamples.reduce(
    (ranges, s) => ({
      minR: Math.min(ranges.minR, s.r), maxR: Math.max(ranges.maxR, s.r),
      minG: Math.min(ranges.minG, s.g), maxG: Math.max(ranges.maxG, s.g),
      minB: Math.min(ranges.minB, s.b), maxB: Math.max(ranges.maxB, s.b),
    }),
    { minR: 255, maxR: 0, minG: 255, maxG: 0, minB: 255, maxB: 0 },
  )
  const backgroundSamples = lightBorderSamples.length > borderSamples.length * 0.2
    ? lightBorderSamples
    : darkBorderSamples.length > borderSamples.length * 0.2
    ? darkBorderSamples
    : borderSamples

  const bgSum = backgroundSamples.reduce(
    (sum, s) => ({ r: sum.r + s.r, g: sum.g + s.g, b: sum.b + s.b }),
    { r: 0, g: 0, b: 0 },
  )
  const background = {
    r: Math.round(bgSum.r / backgroundSamples.length),
    g: Math.round(bgSum.g / backgroundSamples.length),
    b: Math.round(bgSum.b / backgroundSamples.length),
  }

  const isLightStudio = background.r >= 225 && background.g >= 225 && background.b >= 225
  const isDarkStudio = background.r <= 30 && background.g <= 30 && background.b <= 30
  const isUniformEdge =
    borderRanges.maxR - borderRanges.minR <= 8 &&
    borderRanges.maxG - borderRanges.minG <= 8 &&
    borderRanges.maxB - borderRanges.minB <= 8

  if (!isLightStudio && !isDarkStudio && !isUniformEdge) {
    return { buffer: input, applied: false }
  }

  const threshold = isLightStudio ? 18 : isUniformEdge ? 12 : 24
  const thresholdSq = threshold * threshold
  const visited = new Uint8Array(width * height)
  const queue: Array<[number, number]> = []

  function enqueue(x: number, y: number) {
    const index = y * width + x
    if (visited[index]) return
    const offset = pixelOffset(x, y, width)
    if (data[offset + 3] <= ALPHA_THRESHOLD || colorDistanceSquared(data, offset, background) <= thresholdSq) {
      visited[index] = 1
      queue.push([x, y])
    }
  }

  for (let x = 0; x < width; x += 1) { enqueue(x, 0); enqueue(x, height - 1) }
  for (let y = 1; y < height - 1; y += 1) { enqueue(0, y); enqueue(width - 1, y) }

  let removed = 0
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor]
    const offset = pixelOffset(x, y, width)
    if (data[offset + 3] !== 0) { data[offset + 3] = 0; removed += 1 }
    if (x > 0) enqueue(x - 1, y)
    if (x < width - 1) enqueue(x + 1, y)
    if (y > 0) enqueue(x, y - 1)
    if (y < height - 1) enqueue(x, y + 1)
  }

  if (removed < Math.round(width * height * 0.01)) return { buffer: input, applied: false }

  const buffer = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer()
  return { buffer, applied: true }
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
      if (visited[startIndex] || data[pixelOffset(x, y, width) + 3] <= ALPHA_THRESHOLD) continue

      const queue: Array<[number, number]> = [[x, y]]
      const indexes: number[] = []
      visited[startIndex] = 1

      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const [cx, cy] = queue[cursor]
        indexes.push(cy * width + cx)
        for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const ni = ny * width + nx
          if (visited[ni] || data[pixelOffset(nx, ny, width) + 3] <= ALPHA_THRESHOLD) continue
          visited[ni] = 1
          queue.push([nx, ny])
        }
      }
      components.push({ pixels: indexes.length, indexes })
    }
  }

  if (components.length <= 1) return input

  components.sort((a, b) => b.pixels - a.pixels)
  const minPixels = Math.max(100, Math.round(components[0].pixels * 0.02))
  let removed = 0
  for (const component of components.slice(1)) {
    if (component.pixels >= minPixels) continue
    for (const index of component.indexes) { data[index * 4 + 3] = 0; removed += 1 }
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
      if (data[offset + 3] <= ALPHA_THRESHOLD) continue
      opaquePixels += 1
      left = Math.min(left, x)
      right = Math.max(right, x)
      const luma = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2]
      if (luma >= 232) brightPixels += 1
    }

    if (opaquePixels === 0) { if (removedRows > 0) break; continue }

    const rowCoverage = (right - left + 1) / width
    const brightRatio = brightPixels / opaquePixels
    const isStudio = rowCoverage <= 0.45 &&
      (brightRatio >= 0.55 || (removedRows > 0 && removedRows < 4 && brightRatio >= 0.1))
    if (!isStudio) break

    for (let x = left; x <= right; x += 1) data[pixelOffset(x, y, width) + 3] = 0
    removedRows += 1
  }

  if (removedRows === 0) return input
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

export async function processWatchImageBuffer(inputBuffer: Buffer): Promise<ProcessedImage> {
  const sourceMeta = await sharp(inputBuffer).metadata()
  const sourceWidth = sourceMeta.width ?? 0
  const sourceHeight = sourceMeta.height ?? 0

  const sourceBuffer = await sharp(inputBuffer).rotate().ensureAlpha().png().toBuffer()
  const preCropped = await cropToAlphaBounds(sourceBuffer)
  const edgeResult = await removeConnectedEdgeBackground(preCropped)
  const cleaned = await removeSmallAlphaComponents(edgeResult.buffer)
  const platformCleaned = await removeBottomStudioPlatform(cleaned)
  const cropped = await cropToAlphaBounds(platformCleaned)

  const trimMeta = await sharp(cropped).metadata()
  const xPad = Math.max(1, Math.round((trimMeta.width ?? sourceWidth) * 0.05))
  const yPad = Math.max(1, Math.round((trimMeta.height ?? sourceHeight) * 0.05))

  const padded = await sharp(cropped)
    .extend({ top: yPad, bottom: yPad, left: xPad, right: xPad, background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer()

  const resized = await sharp(padded).resize({ height: OUTPUT_HEIGHT, withoutEnlargement: false }).png().toBuffer()
  const pngBuffer = await removeBottomStudioPlatform(resized)
  const processedMeta = await sharp(pngBuffer).metadata()
  const webpBuffer = await sharp(pngBuffer).webp({ quality: 88 }).toBuffer()

  return {
    pngBuffer,
    webpBuffer,
    sourceWidth,
    sourceHeight,
    processedWidth: processedMeta.width ?? 0,
    processedHeight: processedMeta.height ?? 0,
    backgroundRemovalApplied: edgeResult.applied,
  }
}
