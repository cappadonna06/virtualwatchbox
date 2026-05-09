import sharp from 'sharp'

const OUTPUT_HEIGHT = 900
const ALPHA_THRESHOLD = 12

export type ProcessOptions = {
  // Optional decoder used when sharp cannot read the input format directly
  // (notably AVIF/HEIF on macOS Node builds without libheif). The batch
  // script passes a sips-based decoder; the admin route relies on sharp's
  // own AVIF support and falls through to its own resize-only safety net.
  decodeFallback?: (input: Buffer) => Promise<Buffer>
}

export type ProcessedImage = {
  pngBuffer: Buffer
  webpBuffer: Buffer
  sourceWidth: number
  sourceHeight: number
  processedWidth: number
  processedHeight: number
  backgroundRemovalApplied: boolean
}

type EdgeBackground = {
  background: { r: number; g: number; b: number }
  classification: 'lightStudio' | 'darkStudio' | 'uniformEdge'
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

let warnedAboutMlBackground = false

// Build a buffer with `colorSource`'s RGB and a careful alpha combination of
// both inputs. Used to feed the deterministic shadow walker the ML silhouette
// alpha alongside source RGB (ML output sometimes stores raw object RGB
// regardless of alpha — shadow pixels show RGB≈(9,9,9) at α≈20, which the BFS
// would mistake for a saturated foreground edge), and to fold the post-shadow
// alpha back onto ML's anti-aliased RGB at the end.
//
// Alpha is the ML alpha *unless* the source pixel is transparent and that
// transparent region is connected to the image edge — in which case we force
// it transparent in the composite. This respects pre-baked "ghost shadows"
// (e.g. an AVIF whose right margin ships with α=0 + dark RGB that ML
// mistakes for foreground) without erasing internal holes ML correctly fills
// in (e.g. the gap between a case and its strap).
async function combineAlphaWithSourceRgb(colorSource: Buffer, alphaSource: Buffer): Promise<Buffer> {
  const colorRaw = await sharp(colorSource).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const alphaRaw = await sharp(alphaSource).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = colorRaw.info
  if (alphaRaw.info.width !== width || alphaRaw.info.height !== height) {
    // Dimensions diverged — fall through to the ML buffer as-is rather than
    // produce a misaligned composite.
    return alphaSource
  }

  // Mark every source-transparent pixel that's connected to the image border
  // by an unbroken α≤threshold path. Interior holes (case-to-strap gaps,
  // between bracelet links) stay unmarked.
  const edgeTransparent = new Uint8Array(width * height)
  const queue: number[] = []
  for (let x = 0; x < width; x += 1) {
    for (const y of [0, height - 1]) {
      const i = y * width + x
      if (colorRaw.data[i * 4 + 3] === 0 && !edgeTransparent[i]) {
        edgeTransparent[i] = 1
        queue.push(i)
      }
    }
  }
  for (let y = 1; y < height - 1; y += 1) {
    for (const x of [0, width - 1]) {
      const i = y * width + x
      if (colorRaw.data[i * 4 + 3] === 0 && !edgeTransparent[i]) {
        edgeTransparent[i] = 1
        queue.push(i)
      }
    }
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const idx = queue[cursor]
    const x = idx % width
    const y = (idx / width) | 0
    if (x > 0) {
      const ni = idx - 1
      if (!edgeTransparent[ni] && colorRaw.data[ni * 4 + 3] === 0) { edgeTransparent[ni] = 1; queue.push(ni) }
    }
    if (x < width - 1) {
      const ni = idx + 1
      if (!edgeTransparent[ni] && colorRaw.data[ni * 4 + 3] === 0) { edgeTransparent[ni] = 1; queue.push(ni) }
    }
    if (y > 0) {
      const ni = idx - width
      if (!edgeTransparent[ni] && colorRaw.data[ni * 4 + 3] === 0) { edgeTransparent[ni] = 1; queue.push(ni) }
    }
    if (y < height - 1) {
      const ni = idx + width
      if (!edgeTransparent[ni] && colorRaw.data[ni * 4 + 3] === 0) { edgeTransparent[ni] = 1; queue.push(ni) }
    }
  }

  const out = Buffer.alloc(colorRaw.data.length)
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4
    out[o] = colorRaw.data[o]
    out[o + 1] = colorRaw.data[o + 1]
    out[o + 2] = colorRaw.data[o + 2]
    // ML alpha by default; clamp to source's α=0 only for edge-connected
    // transparent regions of the source.
    out[o + 3] = edgeTransparent[i] ? 0 : alphaRaw.data[o + 3]
  }
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

// ML primary path. Pure JS (onnxruntime-node), no Python deps. Returns null on
// any failure — module not installed, model fetch failed, OOM, etc. — so the
// deterministic pipeline below can take over without a hard error.
async function applyMlBackgroundRemoval(input: Buffer): Promise<Buffer | null> {
  try {
    // Dynamic import keeps the dep optional from the bundler's POV — Vercel
    // routes that never call this don't need to load the 150MB ONNX runtime.
    const moduleName = '@imgly/background-removal-node'
    const mod = await import(moduleName)
    const removeBackground: ((src: unknown, cfg?: unknown) => Promise<Blob>) | undefined =
      mod.removeBackground ?? mod.default?.removeBackground ?? mod.default
    if (typeof removeBackground !== 'function') return null

    // imgly's image decoder reads `blob.type` to pick a decoder. A bare
    // Uint8Array gets wrapped in a Blob with empty type and fails — wrap
    // explicitly with image/png to feed the decoder a known format. The
    // Uint8Array slice copy normalises the SharedArrayBuffer-vs-ArrayBuffer
    // backing typing so the BlobPart constructor accepts it.
    const inputBytes = new Uint8Array(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer)
    const inputBlob = new Blob([inputBytes], { type: 'image/png' })
    const modelEnv = process.env.WATCH_BG_MODEL
    const model: 'small' | 'medium' = modelEnv === 'small' ? 'small' : 'medium'

    const out = await removeBackground(inputBlob, {
      model,
      output: { format: 'image/png', quality: 1 },
      debug: false,
    })
    return Buffer.from(await out.arrayBuffer())
  } catch (err) {
    if (!warnedAboutMlBackground) {
      console.warn(
        '[imageProcessing] ML background removal unavailable; using deterministic edge-background pipeline.',
        err instanceof Error ? err.message : err,
      )
      warnedAboutMlBackground = true
    }
    return null
  }
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

// Sample edge pixels and decide whether the input was shot on a uniform
// studio background. Used both by the deterministic flood fill (which removes
// pixels matching the sampled colour) and by the shadow-gradient pass (which
// only fires for light backgrounds, where a cast shadow would be a problem).
//
// If the input arrives with already-transparent borders (e.g. an AVIF that was
// pre-cleaned, or a PNG with a real alpha channel), border colour samples are
// scarce. In that case we fall back to a light-studio assumption with a pure
// white parent — the BFS's saturation + per-step budget make it a no-op for
// inputs that don't actually have a grey shadow on a light background.
async function sampleEdgeBackground(input: Buffer): Promise<EdgeBackground | null> {
  const { data, info } = await sharp(input)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const borderSamples: Array<{ r: number; g: number; b: number }> = []
  let transparentBorderPixels = 0
  const totalBorderPixels = width * 2 + Math.max(0, height - 2) * 2

  for (let x = 0; x < width; x += 1) {
    for (const y of [0, height - 1]) {
      const offset = pixelOffset(x, y, width)
      if (data[offset + 3] > 220) borderSamples.push({ r: data[offset], g: data[offset + 1], b: data[offset + 2] })
      else if (data[offset + 3] <= ALPHA_THRESHOLD) transparentBorderPixels += 1
    }
  }
  for (let y = 1; y < height - 1; y += 1) {
    for (const x of [0, width - 1]) {
      const offset = pixelOffset(x, y, width)
      if (data[offset + 3] > 220) borderSamples.push({ r: data[offset], g: data[offset + 1], b: data[offset + 2] })
      else if (data[offset + 3] <= ALPHA_THRESHOLD) transparentBorderPixels += 1
    }
  }

  if (borderSamples.length < Math.max(width, height)) {
    // Borders are mostly transparent — the source already had a clean cutout.
    // Default to a light-studio assumption so the shadow-gradient pass still
    // gets a chance to dissolve any remaining cast shadow.
    if (transparentBorderPixels > totalBorderPixels * 0.5) {
      return { background: { r: 255, g: 255, b: 255 }, classification: 'lightStudio' }
    }
    return null
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

  if (isLightStudio) return { background, classification: 'lightStudio' }
  if (isDarkStudio) return { background, classification: 'darkStudio' }
  if (isUniformEdge) return { background, classification: 'uniformEdge' }
  return null
}

async function removeConnectedEdgeBackground(input: Buffer, sampled: EdgeBackground) {
  const { data, info } = await sharp(input)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const { background, classification } = sampled
  const threshold = classification === 'lightStudio' ? 18 : classification === 'uniformEdge' ? 12 : 24
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

// Walks gradients from already-transparent regions into adjacent pixels that
// are gray (low saturation) and connected via a smooth color transition.
// Cast shadows on light studio backgrounds are exactly that — a smooth
// monotonic darkening from background to deep gray. Bracelet/case edges
// involve sharp transitions or saturated reflections that this BFS won't
// cross, so steel parts stay intact.
async function dissolveShadowGradient(input: Buffer, sampled: EdgeBackground) {
  if (sampled.classification !== 'lightStudio') return input

  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const visited = new Uint8Array(width * height)
  // Each queue entry: [pixelIndex, parentR, parentG, parentB, depth]. The
  // parent colour is the predecessor pixel that admitted this one — letting
  // the gradient drift smoothly without a global threshold. Depth tracks how
  // many BFS hops away from the original transparent seed the pixel sits;
  // capped to keep the walker from chaining deep into low-saturation interior
  // regions (e.g. dark leather strap textures whose anti-aliased edge looks
  // like the start of a cast-shadow gradient).
  const queue: Array<[number, number, number, number, number]> = []

  for (let i = 0; i < width * height; i += 1) {
    if (data[i * 4 + 3] <= ALPHA_THRESHOLD) {
      visited[i] = 1
      queue.push([i, sampled.background.r, sampled.background.g, sampled.background.b, 0])
    }
  }

  // Per-step color budget: a neighbour can shift by ~22 RGB units max.
  // Cast shadow gradients fall well within this; sharp watch edges blow past it.
  const stepBudgetSq = 22 * 22 * 3
  // Saturation cap: bracelet steel can hit sat 8-15 due to studio reflections,
  // so anchor to ≤14 to allow most cast-shadow noise while rejecting tinted
  // parts of the watch.
  const saturationCap = 14
  // Lightening tolerance: cast shadows are monotonically darker as you move
  // away from the lit background, so the BFS only walks into pixels that are
  // darker (or barely lighter, allowing gradient noise). This prevents the
  // BFS from descending the shadow gradient and then climbing back up into
  // bracelet/case parts that are also low-saturation grey.
  const lightenTolerance = 6
  // Depth cap: cast shadows beneath a watch are rarely deeper than 60-80
  // pixels. Dark leather straps interior to the silhouette extend hundreds
  // of pixels deep, so capping depth keeps the BFS from chaining through
  // their grain even when local gradients permit it.
  const maxDepth = 70
  // Hard area cap: if we're ever about to remove >12% of the image, the
  // detection is wrong (probably a uniformly-grey watch on white), abort.
  const maxRemoved = Math.round(width * height * 0.12)

  let removed = 0
  let darkRemoved = 0
  for (let cursor = 0; cursor < queue.length && removed < maxRemoved; cursor += 1) {
    const entry = queue[cursor]
    const idx = entry[0]
    const pr = entry[1]
    const pg = entry[2]
    const pb = entry[3]
    const depth = entry[4]
    if (depth >= maxDepth) continue
    const x = idx % width
    const y = (idx / width) | 0

    const neighbors: Array<[number, number]> = []
    if (x > 0) neighbors.push([x - 1, y])
    if (x < width - 1) neighbors.push([x + 1, y])
    if (y > 0) neighbors.push([x, y - 1])
    if (y < height - 1) neighbors.push([x, y + 1])

    for (const [nx, ny] of neighbors) {
      const ni = ny * width + nx
      if (visited[ni]) continue

      const offset = ni * 4
      const a = data[offset + 3]
      if (a <= ALPHA_THRESHOLD) {
        visited[ni] = 1
        // Already-transparent pixels don't consume depth — they're free to
        // expand the seed front before any opaque step is taken.
        queue.push([ni, pr, pg, pb, 0])
        continue
      }

      const r = data[offset]
      const g = data[offset + 1]
      const b = data[offset + 2]
      const sat = Math.max(r, g, b) - Math.min(r, g, b)
      if (sat > saturationCap) continue

      const dr = r - pr
      const dg = g - pg
      const db = b - pb
      if (dr * dr + dg * dg + db * db > stepBudgetSq) continue

      // Monotone-darkening: a cast shadow only gets darker as you move into
      // it. If the neighbour is meaningfully lighter than the parent, we're
      // walking back UP the gradient — likely climbing into a watch part —
      // so reject. Tolerance allows a few units of compression noise.
      const parentLuma = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb
      const neighborLuma = 0.2126 * r + 0.7152 * g + 0.0722 * b
      if (neighborLuma > parentLuma + lightenTolerance) continue

      visited[ni] = 1
      data[offset + 3] = 0
      removed += 1
      if (neighborLuma < 110) darkRemoved += 1
      // The neighbour becomes the new "parent" — gradient-following — and
      // increments depth so the chain length is bounded.
      queue.push([ni, r, g, b, depth + 1])
    }
  }

  if (removed === 0) return input
  // Safety revert: if the BFS hit the area cap, the heuristic was wrong for
  // this image (e.g. brushed steel watch with no shadow). Return untouched
  // to avoid eating large parts of the foreground.
  if (removed >= maxRemoved) return input
  // Require evidence that we actually reached a cast shadow — i.e. the BFS
  // descended past mid-grey into dark territory. If everything we removed
  // was just the light fringe of the silhouette (anti-aliased edge pixels
  // with luma > 110), this is edge erosion, not shadow removal: revert to
  // keep the silhouette anti-aliasing intact.
  if (darkRemoved < 200) return input

  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer()
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

export async function processWatchImageBuffer(
  input: Buffer,
  opts: ProcessOptions = {},
): Promise<ProcessedImage> {
  // 1. Decode source. Sharp covers PNG/JPEG/WebP/AVIF on most platforms; the
  //    optional decodeFallback is a hatch for AVIF/HEIF inputs on a Node build
  //    where sharp's libheif support is missing (the macOS batch script uses
  //    sips for this).
  let sourceMeta: sharp.Metadata
  let sourceBuffer: Buffer
  try {
    sourceMeta = await sharp(input).metadata()
    sourceBuffer = await sharp(input).rotate().ensureAlpha().png().toBuffer()
  } catch (err) {
    if (!opts.decodeFallback) throw err
    const decoded = await opts.decodeFallback(input)
    sourceMeta = await sharp(decoded).metadata()
    sourceBuffer = await sharp(decoded).rotate().ensureAlpha().png().toBuffer()
  }
  const sourceWidth = sourceMeta.width ?? 0
  const sourceHeight = sourceMeta.height ?? 0

  // 2. Sample edge background BEFORE any removal so the shadow pass downstream
  //    knows what colour was being shadowed onto. After ML, the borders are
  //    transparent and this signal would be lost.
  const sampled = await sampleEdgeBackground(sourceBuffer)

  // 3. Build a flattened input for ML. Some product AVIFs ship with
  //    α=0 + non-zero RGB ("phantom" content stored at fully-transparent
  //    pixels). ML's segmentation looks at RGB regardless of alpha, so it
  //    can mistakenly classify those phantom regions as foreground (we saw
  //    this on a Tudor AVIF whose right-side margin was α=0 RGB=(48,44,41)
  //    and ML reported a large dark blob there). Flattening onto the sampled
  //    background — or pure white when no sample is available — replaces the
  //    phantom RGB with the studio bg colour so ML sees a clean scene.
  const flattenBackground = sampled?.classification === 'darkStudio'
    ? { r: sampled.background.r, g: sampled.background.g, b: sampled.background.b }
    : { r: 255, g: 255, b: 255 }
  const flattenedForMl = await sharp(sourceBuffer)
    .flatten({ background: flattenBackground })
    .ensureAlpha()
    .png()
    .toBuffer()

  // 4. ML primary path. Falls through to the deterministic flood fill if
  //    @imgly/background-removal-node isn't installed, the model fetch fails,
  //    or inference errors out for any reason.
  const mlBuffer = await applyMlBackgroundRemoval(flattenedForMl)

  let working: Buffer
  let backgroundRemovalApplied = false
  if (mlBuffer) {
    // Pair ML alpha with the *original* source RGB. Flattening was only to
    // clean the ML input; for the shadow walker we want the original source
    // RGB because anti-aliased silhouette edges in the source carry
    // premultiplied (very dark) RGB that the BFS treats as "far from white"
    // and refuses to chain through. That's exactly what we want — it stops
    // the BFS at watch boundaries while still letting it dissolve true
    // cast-shadow gradients (which are alpha=255 with monotone-gray RGB).
    working = await combineAlphaWithSourceRgb(sourceBuffer, mlBuffer)
    backgroundRemovalApplied = true
  } else if (sampled) {
    const preCropped = await cropToAlphaBounds(sourceBuffer)
    const edgeResult = await removeConnectedEdgeBackground(preCropped, sampled)
    working = edgeResult.buffer
    backgroundRemovalApplied = edgeResult.applied
  } else {
    working = await cropToAlphaBounds(sourceBuffer)
  }

  // 4. Shadow cleanup. Both ML and the strict flood fill leave dark cast
  //    shadows on light backgrounds intact; a gradient-following BFS through
  //    grey regions dissolves them without touching saturated watch parts.
  if (sampled) {
    working = await dissolveShadowGradient(working, sampled)
  }

  // 5. After shadow cleanup, take the ML buffer's RGB back so the final image
  //    has ML's anti-aliased silhouette colours instead of the raw source RGB.
  //    The alpha channel from `working` (post-shadow-walk) is what we want.
  if (mlBuffer) {
    working = await combineAlphaWithSourceRgb(mlBuffer, working)
  }

  // 5. Standard cleanup + framing — unchanged from the prior pipeline.
  working = await removeSmallAlphaComponents(working)
  working = await removeBottomStudioPlatform(working)
  working = await cropToAlphaBounds(working)

  const trimMeta = await sharp(working).metadata()
  const xPad = Math.max(1, Math.round((trimMeta.width ?? sourceWidth) * 0.05))
  const yPad = Math.max(1, Math.round((trimMeta.height ?? sourceHeight) * 0.05))

  const padded = await sharp(working)
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
    backgroundRemovalApplied,
  }
}
