/**
 * Quality screener — deterministic rules that look at a processed watch
 * image (transparent-background PNG) and flag likely failure modes.
 *
 * Standalone module: does NOT depend on lib/imageProcessing.ts. It re-implements
 * the bbox + connected-component logic to keep the two pipelines independent
 * and to avoid disturbing in-flight processor runs that might be using the
 * existing module.
 *
 * Failure modes detected:
 *   - aspect_ratio_off  — width/height suggests a rotated or multi-watch frame
 *   - multi_object      — two or more large connected components (e.g. two
 *                         watches side-by-side, or a ghost watch behind the primary)
 *   - dial_only         — squarish crop at full height suggests just the dial
 *                         (case/bracelet missing)
 *   - bracelet_truncated— bottom row of the bbox is mostly opaque, suggesting
 *                         the bracelet was clipped at the crop edge
 *   - tiny_subject      — final image is much smaller than the canonical 900px,
 *                         likely a partial-crop / missing-parts result
 *   - wrong_orientation — the silhouette's principal axis (the direction the
 *                         band runs) is tilted well off vertical, so the watch
 *                         is lying sideways or on a diagonal
 *
 * Each tag maps to a recommended downstream action:
 *   - 'needs_reprocess' for things the processor can fix with knob bumps
 *     (none of the above are great reprocess candidates — most need a new source)
 *   - 'deleted' for things only a new source image can fix (rotated, multi-watch,
 *     dial-only, bracelet truncated, tiny subject)
 *
 * Cost: pure local computation, ~10-100 ms per image (depends on dimensions).
 */
import sharp from 'sharp'

const ALPHA_THRESHOLD = 12
const CANONICAL_HEIGHT = 900

// Two main components must each be ≥15% of the largest's pixel count to count
// as "two distinct objects." Tuned to ignore stray fragments and noise.
const MIN_COMPONENT_FRACTION = 0.15

// Edge-transparency thresholds — a well-cut watch has high transparency at
// the top edge (just the topmost case curve) and may legitimately have low
// transparency at the bottom (a wide bracelet). We don't check left/right
// because rectangular vs round case shapes vary too much.
const TOP_EDGE_OK_TRANSPARENCY = 0.50      // below this → top edge is too "filled" (rotated?)
const BOTTOM_EDGE_TRUNCATED = 0.05         // above 95% opaque coverage suggests bracelet clipped
const BOTTOM_EDGE_MIN_COVERAGE_PIXELS = 200 // ignore narrow watches (no bracelet to truncate)

// Aspect ratio bands — watches have height > width once correctly oriented
// (case + 2× bracelet visible). Dial-only / case-only crops are roughly square.
// 90°-rotated watches are wider than tall.
const AR_WIDE_THRESHOLD = 1.30    // > this → rotated or multi-watch
const AR_SQUARE_THRESHOLD = 0.85  // > this AND tall image → likely dial-only

// "Tiny subject" — final image height ≥ 90% of canonical AND width < this →
// the canvas is full-height but the watch occupies very little of it.
const TINY_WIDTH_PX = 200

// Orientation via the principal axis of the opaque mask ("which way does the
// band go?"). A correctly-shot watch is elongated vertically — case in the
// middle, strap/bracelet running up and down — so the silhouette's major axis
// is near-vertical. A sideways shot tilts that axis ~90°, a diagonal one ~45°.
// This catches diagonals a plain width/height aspect ratio misses (a watch
// rotated 30-45° can still sit in a near-square or tall bounding box). We only
// trust the angle when the shape is clearly elongated — a round dial-only crop
// has no meaningful long axis, so the angle there is noise.
const ORIENTATION_MIN_ELONGATION = 1.2   // major/minor spread ratio needed to trust the axis
// 20° chosen empirically: a clean straight-on watch (with normal strap draping)
// reads ≤ ~10° of tilt, while genuinely diagonal/sideways shots read ≥ ~22°.
const ORIENTATION_MAX_TILT_DEG = 20      // allowed tilt of the long axis from vertical

export type ScreenerMetrics = {
  width: number
  height: number
  aspectRatio: number              // width / height
  topEdgeTransparency: number      // 0..1 fraction of transparent pixels in top row
  bottomEdgeTransparency: number   // 0..1 fraction of transparent pixels in bottom row
  bottomOpaquePixelCount: number   // raw count of opaque bottom-row pixels
  componentCount: number           // number of components ≥ MIN_COMPONENT_FRACTION × largest
  largestComponentPixels: number
  elongation: number               // sqrt(major/minor) second-moment ratio of the mask
  majorAxisTiltDeg: number         // 0 = band runs vertical, ~90 = band runs sideways
}

export type ScreenerResult = {
  metrics: ScreenerMetrics
  tags: string[]                   // failure-mode tags (empty if ok)
  severity: 'ok' | 'warn' | 'fail'
  recommendedStatus: 'approved' | 'needs_reprocess' | 'deleted'
  reasons: string[]                // human-readable summary, one per tag
}

/**
 * Run the rules-based screener over a processed image buffer (PNG with
 * alpha channel, already at canonical 900px height per the processor).
 */
export async function screenProcessedImage(input: Buffer): Promise<ScreenerResult> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const aspectRatio = width / height

  // --- edge transparency ---
  let topTransparent = 0
  let bottomTransparent = 0
  let bottomOpaque = 0
  for (let x = 0; x < width; x += 1) {
    const topAlpha = data[(0 * width + x) * 4 + 3]
    if (topAlpha <= ALPHA_THRESHOLD) topTransparent += 1
    const bottomAlpha = data[((height - 1) * width + x) * 4 + 3]
    if (bottomAlpha <= ALPHA_THRESHOLD) bottomTransparent += 1
    else bottomOpaque += 1
  }
  const topEdgeTransparency = topTransparent / width
  const bottomEdgeTransparency = bottomTransparent / width

  // --- connected components (BFS) ---
  // Same algorithm as removeSmallAlphaComponents in lib/imageProcessing.ts,
  // but only counts; doesn't mutate.
  const visited = new Uint8Array(width * height)
  const componentSizes: number[] = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIndex = y * width + x
      if (visited[startIndex]) continue
      if (data[startIndex * 4 + 3] <= ALPHA_THRESHOLD) continue

      let pixels = 0
      const queue: Array<[number, number]> = [[x, y]]
      visited[startIndex] = 1
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const [cx, cy] = queue[cursor]
        pixels += 1
        for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const ni = ny * width + nx
          if (visited[ni]) continue
          if (data[ni * 4 + 3] <= ALPHA_THRESHOLD) continue
          visited[ni] = 1
          queue.push([nx, ny])
        }
      }
      componentSizes.push(pixels)
    }
  }

  componentSizes.sort((a, b) => b - a)
  const largestComponentPixels = componentSizes[0] ?? 0
  const minComponentSize = Math.max(100, Math.round(largestComponentPixels * MIN_COMPONENT_FRACTION))
  const componentCount = componentSizes.filter(p => p >= minComponentSize).length

  // --- principal axis (band direction) via second-order image moments ---
  // Single pass over the opaque mask: accumulate the sums needed for the
  // covariance of pixel coordinates, then take its eigen-decomposition. The
  // major-axis angle tells us which way the watch (and its band) is pointing.
  let n = 0, sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= ALPHA_THRESHOLD) continue
      n += 1
      sumX += x; sumY += y
      sumXX += x * x; sumYY += y * y; sumXY += x * y
    }
  }
  let elongation = 1
  let majorAxisTiltDeg = 0
  if (n > 0) {
    const cx = sumX / n, cy = sumY / n
    const mu20 = sumXX / n - cx * cx       // variance in x
    const mu02 = sumYY / n - cy * cy       // variance in y
    const mu11 = sumXY / n - cx * cy       // covariance
    const common = Math.sqrt(((mu20 - mu02) / 2) ** 2 + mu11 * mu11)
    const lambdaMajor = (mu20 + mu02) / 2 + common
    const lambdaMinor = (mu20 + mu02) / 2 - common
    elongation = lambdaMinor > 1e-6 ? Math.sqrt(lambdaMajor / lambdaMinor) : Infinity
    // Angle of the major axis from the x-axis, in (-90°, 90°]. mu02 > mu20
    // (more vertical spread) drives this toward ±90° — a vertically-standing
    // watch. tiltFromVertical is 0 when the band runs straight up-and-down.
    const thetaDeg = 0.5 * Math.atan2(2 * mu11, mu20 - mu02) * (180 / Math.PI)
    majorAxisTiltDeg = Math.abs(90 - Math.abs(thetaDeg))
  }

  const metrics: ScreenerMetrics = {
    width, height, aspectRatio,
    topEdgeTransparency, bottomEdgeTransparency, bottomOpaquePixelCount: bottomOpaque,
    componentCount, largestComponentPixels,
    elongation, majorAxisTiltDeg,
  }

  // --- derive tags from metrics ---
  const tags: string[] = []
  const reasons: string[] = []
  const isFullHeight = height >= CANONICAL_HEIGHT * 0.9

  if (aspectRatio > AR_WIDE_THRESHOLD) {
    tags.push('aspect_ratio_off')
    reasons.push(`width/height = ${aspectRatio.toFixed(2)} (> ${AR_WIDE_THRESHOLD}) — possibly rotated or multi-watch`)
  }

  if (componentCount >= 2) {
    tags.push('multi_object')
    reasons.push(`${componentCount} large components (each ≥${(MIN_COMPONENT_FRACTION * 100).toFixed(0)}% of largest) — likely two watches or a ghost behind the primary`)
  }

  if (
    aspectRatio > AR_SQUARE_THRESHOLD && aspectRatio <= AR_WIDE_THRESHOLD &&
    isFullHeight && elongation < ORIENTATION_MIN_ELONGATION
  ) {
    // Squarish AND not elongated → genuinely a round dial-only crop. An
    // elongated subject in a near-square box is a diagonal watch, not a dial;
    // that's caught by the orientation check below instead.
    tags.push('dial_only')
    reasons.push(`width/height = ${aspectRatio.toFixed(2)} with full-height crop — probably just the dial (case/bracelet missing)`)
  }

  if (elongation >= ORIENTATION_MIN_ELONGATION && majorAxisTiltDeg > ORIENTATION_MAX_TILT_DEG) {
    tags.push('wrong_orientation')
    reasons.push(`band axis tilted ${majorAxisTiltDeg.toFixed(0)}° from vertical (elongation ${elongation.toFixed(2)}×) — watch looks sideways or diagonal`)
  }

  if (
    bottomEdgeTransparency < BOTTOM_EDGE_TRUNCATED &&
    bottomOpaque >= BOTTOM_EDGE_MIN_COVERAGE_PIXELS
  ) {
    tags.push('bracelet_truncated')
    reasons.push(`bottom row ${(bottomOpaque / width * 100).toFixed(0)}% opaque (${bottomOpaque}px) — bracelet appears clipped at bbox edge`)
  }

  if (topEdgeTransparency < TOP_EDGE_OK_TRANSPARENCY && isFullHeight) {
    tags.push('aspect_ratio_off')
    reasons.push(`top row only ${(topEdgeTransparency * 100).toFixed(0)}% transparent — top edge filled, possibly upside-down`)
  }

  if (isFullHeight && width < TINY_WIDTH_PX) {
    tags.push('tiny_subject')
    reasons.push(`width=${width}px at full-height — watch occupies a thin strip of the canvas`)
  }

  // --- severity + recommended status ---
  let severity: ScreenerResult['severity'] = 'ok'
  let recommendedStatus: ScreenerResult['recommendedStatus'] = 'approved'

  if (tags.length > 0) {
    severity = 'fail'
    // Hard-delete tags: source can't be saved by reprocessing
    const hardFailTags = new Set(['multi_object', 'aspect_ratio_off', 'dial_only', 'tiny_subject', 'wrong_orientation'])
    const hasHardFail = tags.some(t => hardFailTags.has(t))
    if (hasHardFail) {
      recommendedStatus = 'deleted'
    } else {
      // Only bracelet_truncated alone → mask dilation may help
      recommendedStatus = 'needs_reprocess'
    }
  }

  // Dedupe tags (top edge + wide can both push 'aspect_ratio_off')
  return { metrics, tags: Array.from(new Set(tags)), severity, recommendedStatus, reasons }
}
