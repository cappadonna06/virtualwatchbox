/**
 * Pure case/strap boundary-detection logic for the Strap Studio case-only
 * pipeline (Feature 7). No Supabase, no filesystem, no CLI — this module is
 * safe to import from a script, an API route, or a test with zero side
 * effects, mirroring how lib/imageProcessing.ts separates from its
 * scripts/process-watch-images.ts CLI wrapper.
 *
 * ── The core reframing ──────────────────────────────────────────────────────
 * Catalog photos already have clean transparent backgrounds — the hard part
 * was never "find the watch," it's "find where the case ends and the strap
 * begins" WITHIN a silhouette we already have. Generic promptable segmentation
 * (grounded-SAM et al.) has no notion of "watch lug"; GeometricSilhouetteProvider
 * instead reads the per-row silhouette-width profile: catalog photos are shot
 * top-down and the case bulges wider than the strap/bracelet, so the boundary
 * is a width-profile transition, not a segmentation problem. See
 * docs/playbooks/case-segmentation-strategy.md for the full writeup.
 *
 * Providers, in escalation order (see scripts/segment-watch-cases.ts's 'auto'
 * orchestrator):
 *   0. GeometricSilhouetteProvider — free, deterministic, zero external calls.
 *   1. ClaudeVisionLandmarkProvider — semantic landmark detection for the
 *      geometric tier's low-confidence residue (ANTHROPIC_API_KEY).
 *   2. ReplicateSamProvider — legacy heavy fallback (REPLICATE_API_TOKEN).
 *   3. OpenAiMaskProvider — documented stub, not wired for batch use.
 */

import sharp from 'sharp'

// ── Types ─────────────────────────────────────────────────────────────────--
export interface LugPoint { x: number; y: number }
export interface LugGeometry {
  /** y = OUTER TIP row of each lug channel (where straps anchor); x = channel
   *  edges at that row. See deriveLugGeometry / GeometricSilhouetteProvider. */
  topLugLeft: LugPoint
  topLugRight: LugPoint
  bottomLugLeft: LugPoint
  bottomLugRight: LugPoint
  lugWidthPx: number
  /** Pixel dimensions of the case-only image these coords live in. */
  imageWidth: number
  imageHeight: number
}
export type CaseShape = 'round' | 'square' | 'cushion' | 'tonneau' | 'rectangular' | 'other'
export type StrapAttachment = 'drilled_lug' | 'integrated' | 'nato_through' | 'unknown'
export interface SegmentationResult {
  caseMask: Buffer // greyscale PNG, 255=keep(case) / 0=discard(strap), used as an alpha multiplier
  lugGeometry: LugGeometry | null
  confidence: number
  caseShape?: CaseShape
  strapAttachment?: StrapAttachment
}
export interface SegmentationProvider {
  segmentCase(
    imageBuffer: Buffer,
    hint?: { lugWidthMm?: number; braceletType?: string },
  ): Promise<SegmentationResult>
}

// ── Shared pixel helpers ─────────────────────────────────────────────────────
export function opaqueRuns(rgba: Buffer, width: number, y: number, threshold = 24, minRun = 4): Array<[number, number]> {
  const runs: Array<[number, number]> = []
  let start = -1
  for (let x = 0; x < width; x += 1) {
    const a = rgba[(y * width + x) * 4 + 3]
    if (a > threshold) {
      if (start < 0) start = x
    } else if (start >= 0) {
      if (x - start >= minRun) runs.push([start, x - 1])
      start = -1
    }
  }
  if (start >= 0 && width - start >= minRun) runs.push([start, width - 1])
  return runs
}

export function alphaBoundsRows(rgba: Buffer, width: number, height: number, threshold = 24): { top: number; bottom: number } {
  let top = height
  let bottom = -1
  for (let y = 0; y < height; y += 1) {
    let any = false
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] > threshold) { any = true; break }
    }
    if (any) { if (y < top) top = y; bottom = y }
  }
  return { top: top === height ? 0 : top, bottom: bottom < 0 ? height - 1 : bottom }
}

// Widest opaque SPAN per row (leftmost..rightmost opaque x, ignoring internal
// gaps from open bracelet links) — the silhouette-width profile that
// GeometricSilhouetteProvider reads the case/strap transition off of.
export function computeWidthProfile(rgba: Buffer, width: number, top: number, bottom: number, threshold = 24): Int32Array {
  const profile = new Int32Array(bottom - top + 1).fill(-1)
  for (let y = top; y <= bottom; y += 1) {
    let left = -1
    let right = -1
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] > threshold) {
        if (left < 0) left = x
        right = x
      }
    }
    profile[y - top] = left < 0 ? -1 : right - left + 1
  }
  return profile
}

export function spanAt(rgba: Buffer, width: number, y: number, threshold = 24): { left: number; right: number } | null {
  let left = -1
  let right = -1
  for (let x = 0; x < width; x += 1) {
    if (rgba[(y * width + x) * 4 + 3] > threshold) {
      if (left < 0) left = x
      right = x
    }
  }
  return left < 0 ? null : { left, right }
}

// Walking from `lo` toward `maxIdx`, find the row with the single biggest
// width increase over a small window (i.e. the strap→case transition,
// scanning outward-in). A round case's width profile is a smooth curve whose
// SLOPE is steepest right at the true case edge (for an ellipse the slope is
// singular there) — so the steepest-window jump lands much closer to the true
// boundary than an arbitrary "% of max width" threshold would, which is the
// bug an earlier version of this function had (it converged on the row where
// width first dipped under a fixed fraction of the case's widest point,
// chopping a real chunk of case off as "strap"). A multi-row window smooths
// over anti-aliasing/JPEG noise at the true edge without losing precision,
// since real lugs taper over a handful of pixels, not one.
function steepestRise(profile: Int32Array, lo: number, maxIdx: number, window: number): { idx: number; jump: number } | null {
  let bestIdx: number | null = null
  let bestJump = 0
  const half = Math.round(window / 2)
  for (let i = lo; i <= maxIdx - window; i += 1) {
    const a = profile[i]
    const b = profile[i + window]
    if (a < 0 || b < 0) continue
    const jump = b - a
    // Report the WINDOW MIDPOINT as the boundary, not its trailing edge — the
    // window only exists to smooth noise/measure a realistic taper span; the
    // transition itself is centered inside it, not at either end.
    if (jump > bestJump) { bestJump = jump; bestIdx = i + half }
  }
  return bestIdx == null ? null : { idx: bestIdx, jump: bestJump }
}
function steepestFall(profile: Int32Array, maxIdx: number, hi: number, window: number): { idx: number; jump: number } | null {
  let bestIdx: number | null = null
  let bestDrop = 0
  const half = Math.round(window / 2)
  for (let i = maxIdx; i <= hi - window; i += 1) {
    const a = profile[i]
    const b = profile[i + window]
    if (a < 0 || b < 0) continue
    const drop = a - b
    if (drop > bestDrop) { bestDrop = drop; bestIdx = i + half }
  }
  return bestIdx == null ? null : { idx: bestIdx, jump: bestDrop }
}

export interface CaseBandResult {
  topIdx: number    // first case-side index (profile-relative)
  botIdx: number    // last case-side index (profile-relative)
  confidence: number
  sharpTransition: boolean
}

// Core reframing: the watch is already a clean silhouette (transparent bg), so
// scanning its per-row width top-to-bottom traces a narrow(strap)-wide(case)-
// narrow(strap) profile. The case/strap boundary is where that profile
// transitions — no ML segmentation required for the common two-piece-strap /
// drilled-lug-bracelet case. A flat profile (no sharp transition) is the
// correct signal for an integrated-bracelet design, not a detection failure.
//
// windowFrac matters more than it looks: validated against a real photo (a
// Tudor Black Bay GMT on a steel oyster bracelet), the default ~3.5% window
// — tuned against two-piece leather/rubber straps, which meet the case in a
// short, sharp junction — badly undershot the true case boundary. A metal
// bracelet's end-links flare gradually across several links before reaching
// the lugs, so its transition genuinely spans a much longer stretch of the
// profile. GeometricSilhouetteProvider passes a wider window whenever the
// catalog hint says "not a strap" for exactly this reason.
export function detectCaseBand(profile: Int32Array, windowFrac = 0.035): CaseBandResult {
  const n = profile.length
  const margin = Math.max(2, Math.round(n * 0.05))
  let maxW = -1
  let maxIdx = margin
  for (let i = margin; i < n - margin; i += 1) {
    if (profile[i] > maxW) { maxW = profile[i]; maxIdx = i }
  }
  if (maxW <= 0) {
    return { topIdx: margin, botIdx: n - 1 - margin, confidence: 0.15, sharpTransition: false }
  }

  const window = Math.max(4, Math.round(n * windowFrac))
  const rise = steepestRise(profile, margin, maxIdx, window)
  const fall = steepestFall(profile, maxIdx, n - 1 - margin, window)
  const topIdx = rise?.idx ?? margin
  const botIdx = fall?.idx ?? n - 1 - margin

  const caseHeight = botIdx - topIdx
  const heightRatio = caseHeight / n
  const plausible = heightRatio > 0.35 && heightRatio < 0.92

  // Sharpness: how big the steepest jump is relative to the case's own max
  // width — a real drilled-lug transition drops a large fraction of the case
  // width over the window; an integrated design barely moves.
  const topSharp = rise ? rise.jump / maxW : 0
  const botSharp = fall ? fall.jump / maxW : 0
  const sharpness = Math.max(0, Math.min(1, (topSharp + botSharp) / 2))

  let confidence = 0.2 + sharpness * 0.6 + (plausible ? 0.15 : 0)
  confidence = Math.max(0.1, Math.min(0.97, confidence))
  const sharpTransition = sharpness > 0.2 && plausible
  if (!sharpTransition) confidence = Math.min(confidence, 0.45)

  return { topIdx, botIdx, confidence, sharpTransition }
}

// Row-band alpha mask: opaque for rows in [topCut, bottomCut], transparent
// outside, feathered at the edges for antialiasing.
//
// DO NOT use this alone for a real watch photo with drilled lugs — it cuts a
// straight line across the FULL width, which chops through the middle of
// every lug's taper (lugs are angled blades that extend well past the
// bezel's own edge, not a flat shelf). Validated against a real photo (an
// Omega Aqua Terra with long tapered lugs, test-fixtures/case-segmentation/):
// a flat cut at the row where the profile "looks like case" sliced the lug
// tips off into stubby flat triangles instead of their true pointed shape.
// buildLugAwareMaskPng below is the fix. This function is kept only as the
// building block INSIDE the case's confident plateau (topCut..bottomCut),
// where there's no lug ambiguity to get wrong.
export async function renderRowBandMaskPng(width: number, height: number, topCut: number, bottomCut: number, feather = 3): Promise<Buffer> {
  const buf = Buffer.alloc(width * height)
  const t0 = Math.max(0, topCut - feather)
  const t1 = Math.min(height, topCut + feather)
  const b0 = Math.max(0, bottomCut - feather)
  const b1 = Math.min(height, bottomCut + feather)
  for (let y = 0; y < height; y += 1) {
    let v = 0
    if (y >= t1 && y <= b0) v = 255
    else if (y >= t0 && y < t1 && t1 > t0) v = Math.round((255 * (y - t0)) / (t1 - t0))
    else if (y > b0 && y <= b1 && b1 > b0) v = Math.round((255 * (b1 - y)) / (b1 - b0))
    buf.fill(v, y * width, y * width + width)
  }
  return sharp(buf, { raw: { width, height, channels: 1 } }).png().toBuffer()
}

export interface StripMeasurement {
  /** Half the strap's own width, measured well clear of any lug widening. */
  halfWidth: number
  /** Horizontal center of the strap at that measurement point. */
  cx: number
}

// Measures the strap's true width from a band of rows guaranteed to be pure
// strap (no lug widening yet) — the very top/bottom tip of a full-watch
// photo is always plain strap material, real lugs never reach the image
// edge. Averaging several rows rides out anti-aliasing noise on any one row.
export function measureStrip(rgba: Buffer, width: number, yStart: number, yEnd: number, threshold = 24): StripMeasurement {
  let sumHalfWidth = 0
  let sumCx = 0
  let count = 0
  const lo = Math.max(0, Math.min(yStart, yEnd))
  const hi = Math.max(yStart, yEnd)
  for (let y = lo; y <= hi; y += 1) {
    const span = spanAt(rgba, width, y, threshold)
    if (!span) continue
    sumHalfWidth += (span.right - span.left + 1) / 2
    sumCx += (span.left + span.right) / 2
    count += 1
  }
  if (!count) return { halfWidth: width * 0.15, cx: width / 2 }
  return { halfWidth: sumHalfWidth / count, cx: sumCx / count }
}

// The actual fix for lug shape: within the case's confident plateau
// (topCut..bottomCut), keep everything — no ambiguity there. Outside it (the
// top/bottom transition zones where lugs live), classify by WIDTH, not row:
// any opaque pixel further from center than the strap's own measured
// half-width can only be lug material (the strap physically can't be that
// wide), so it's kept unconditionally NO MATTER HOW FAR toward the tip it
// extends — which is exactly what lets an angled, tapered lug blade survive
// intact instead of being sliced flat. Pixels within the strap's width band
// are strap (removed) once we're past the plateau, since that's the old
// strap filling the gap between the lug tips at that row.
export async function buildLugAwareMaskPng(
  rgba: Buffer, width: number, height: number,
  top: number, bottom: number, topCut: number, bottomCut: number,
  topStrip: StripMeasurement, botStrip: StripMeasurement,
  feather = 2,
): Promise<Buffer> {
  const buf = Buffer.alloc(width * height)
  const marginX = Math.max(3, Math.round(width * 0.012))

  for (let y = 0; y < height; y += 1) {
    if (y < top || y > bottom) { buf.fill(0, y * width, y * width + width); continue }
    if (y >= topCut && y <= bottomCut) { buf.fill(255, y * width, y * width + width); continue }

    const strip = y < topCut ? topStrip : botStrip
    const stripLeft = strip.cx - strip.halfWidth - marginX
    const stripRight = strip.cx + strip.halfWidth + marginX
    // Feather the row-band boundary too, so the plateau edge doesn't leave a
    // hard seam where the strap-width column range meets the always-kept
    // outer columns at exactly y = topCut / bottomCut.
    const distToPlateau = y < topCut ? topCut - y : y - bottomCut
    const rowFeather = Math.max(0, Math.min(1, 1 - distToPlateau / feather))

    for (let x = 0; x < width; x += 1) {
      let v: number
      if (x < stripLeft - feather || x > stripRight + feather) {
        v = 255 // outside the strap's own width — necessarily lug/case
      } else if (x >= stripLeft + feather && x <= stripRight - feather) {
        v = 0 // within strap width, past the plateau — the old strap
      } else if (x < stripLeft + feather) {
        v = Math.round((255 * (stripLeft + feather - x)) / (2 * feather))
      } else {
        v = Math.round((255 * (x - (stripRight - feather))) / (2 * feather))
      }
      if (rowFeather > 0) v = Math.round(v + (255 - v) * rowFeather)
      buf[y * width + x] = v
    }
  }
  return sharp(buf, { raw: { width, height, channels: 1 } }).png().toBuffer()
}

// Multiplies the source alpha channel by the mask's greyscale value — the one
// mask-application implementation every provider tier shares (previously each
// call site improvised its own sharp composite/blend, which is what made the
// old Replicate path's mask handling unverified).
export async function applyCaseMask(srcBuf: Buffer, maskPng: Buffer): Promise<Buffer> {
  const src = await sharp(srcBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = src.info
  const maskRaw = await sharp(maskPng).resize({ width, height, fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
  const maskChannels = maskRaw.info.channels
  const out = Buffer.from(src.data)
  for (let px = 0, i = 0; i < out.length; i += 4, px += 1) {
    const maskVal = maskRaw.data[px * maskChannels]
    out[i + 3] = Math.round((out[i + 3] * maskVal) / 255)
  }
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

// ── Legacy channel-gap geometry (valid for TRUE pre-segmented case-only input,
// e.g. curated 3D renders, where the two lugs are visually separated by real
// background) ────────────────────────────────────────────────────────────────
function findChannel(
  rgba: Buffer, width: number, yStart: number, yEnd: number, step: number,
): { left: number; right: number; y: number; gap: number } | null {
  let best: { left: number; right: number; y: number; gap: number } | null = null
  const lo = Math.min(yStart, yEnd)
  const hi = Math.max(yStart, yEnd)
  for (let y = lo; y <= hi; y += Math.max(1, step)) {
    const runs = opaqueRuns(rgba, width, y)
    if (runs.length < 2) continue
    for (let i = 0; i < runs.length - 1; i += 1) {
      const left = runs[i][1]
      const right = runs[i + 1][0]
      const gap = right - left
      if (gap < width * 0.08) continue
      const center = (left + right) / 2
      const centrality = 1 - Math.abs(center - width / 2) / (width / 2)
      if (centrality < 0.35) continue
      if (!best || gap > best.gap) best = { left, right, y, gap }
    }
  }
  return best
}

function findChannelTip(
  rgba: Buffer, width: number, outerY: number, innerY: number,
): number | null {
  const dir = innerY > outerY ? 1 : -1
  for (let y = outerY; dir > 0 ? y <= innerY : y >= innerY; y += dir) {
    const runs = opaqueRuns(rgba, width, y)
    if (runs.length < 2) continue
    for (let i = 0; i < runs.length - 1; i += 1) {
      const gap = runs[i + 1][0] - runs[i][1]
      if (gap < width * 0.08) continue
      const center = (runs[i][1] + runs[i + 1][0]) / 2
      if (1 - Math.abs(center - width / 2) / (width / 2) < 0.35) continue
      return y
    }
  }
  return null
}

export async function deriveLugGeometry(rgba: Buffer, width: number, height: number): Promise<{ geom: LugGeometry; confidence: number }> {
  const { top, bottom } = alphaBoundsRows(rgba, width, height)
  const caseH = Math.max(1, bottom - top)
  const step = Math.max(1, Math.round(caseH / 120))

  const topChannel = findChannel(rgba, width, top, top + Math.round(caseH * 0.28), step)
  const bottomChannel = findChannel(rgba, width, bottom, bottom - Math.round(caseH * 0.28), step)
  const topTipY = findChannelTip(rgba, width, top, top + Math.round(caseH * 0.28))
  const botTipY = findChannelTip(rgba, width, bottom, bottom - Math.round(caseH * 0.28))

  let confidence = 0.4
  let geom: LugGeometry

  if (topChannel && bottomChannel) {
    confidence = 0.9
    const lugWidthPx = Math.round((topChannel.gap + bottomChannel.gap) / 2)
    const topY = topTipY ?? topChannel.y
    const botY = botTipY ?? bottomChannel.y
    geom = {
      topLugLeft: { x: topChannel.left, y: topY },
      topLugRight: { x: topChannel.right, y: topY },
      bottomLugLeft: { x: bottomChannel.left, y: botY },
      bottomLugRight: { x: bottomChannel.right, y: botY },
      lugWidthPx,
      imageWidth: width,
      imageHeight: height,
    }
  } else {
    const ch = topChannel || bottomChannel
    let left = 0
    let right = width
    for (let y = top; y <= bottom; y += step) {
      const runs = opaqueRuns(rgba, width, y)
      if (runs.length) {
        left = Math.min(left || runs[0][0], runs[0][0])
        right = Math.max(right === width ? runs[runs.length - 1][1] : right, runs[runs.length - 1][1])
      }
    }
    const caseW = Math.max(1, right - left)
    const cx = ch ? Math.round((ch.left + ch.right) / 2) : Math.round(left + caseW / 2)
    const lugWidthPx = ch ? ch.gap : Math.round(caseW * 0.3)
    const topY = top + Math.round(caseH * 0.08)
    const botY = bottom - Math.round(caseH * 0.08)
    confidence = ch ? 0.6 : 0.4
    geom = {
      topLugLeft: { x: cx - Math.round(lugWidthPx / 2), y: topY },
      topLugRight: { x: cx + Math.round(lugWidthPx / 2), y: topY },
      bottomLugLeft: { x: cx - Math.round(lugWidthPx / 2), y: botY },
      bottomLugRight: { x: cx + Math.round(lugWidthPx / 2), y: botY },
      lugWidthPx,
      imageWidth: width,
      imageHeight: height,
    }
  }
  return { geom, confidence }
}

// ── Providers ────────────────────────────────────────────────────────────--

// Tier 0 — free, deterministic, no external API. See detectCaseBand's doc
// comment for the core insight this exploits.
export class GeometricSilhouetteProvider implements SegmentationProvider {
  async segmentCase(imageBuffer: Buffer, hint?: { lugWidthMm?: number; braceletType?: string }): Promise<SegmentationResult> {
    const { data, info } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const { width, height } = info
    const { top, bottom } = alphaBoundsRows(data, width, height)
    const profile = computeWidthProfile(data, width, top, bottom)
    // 'strap' (leather/rubber/NATO) meets the case abruptly; anything else —
    // including the catalog's common "unset = plain metal bracelet" — flares
    // gradually across several end-links, so it needs a wider window. See
    // detectCaseBand's doc comment.
    const windowFrac = hint?.braceletType === 'strap' ? 0.035 : 0.1
    const band = detectCaseBand(profile, windowFrac)

    // Bias the cut a couple of px INTO the case (never into the strap) — the
    // new strap layers behind at this exact row, so any residual strap pixel
    // above the cut would show as a visible remnant; a slightly short case
    // edge is imperceptible at render scale.
    const TRIM = 2
    const topCut = Math.min(bottom, top + band.topIdx + TRIM)
    const bottomCut = Math.max(top, top + band.botIdx - TRIM)

    // Measure the strap's TRUE width from rows guaranteed to be pure strap —
    // the image's own top/bottom tip, never reached by a real lug. Do NOT use
    // the row span at topCut/bottomCut for this: when lugs are present, that
    // span is the FULL case width (lug tip to lug tip), not the strap's
    // width, which previously overstated lugWidthPx and mis-scaled whatever
    // new strap gets composited in.
    const stripRows = Math.max(6, Math.round((bottom - top) * 0.04))
    const topStrip = measureStrip(data, width, top, Math.min(topCut - 1, top + stripRows))
    const botStrip = measureStrip(data, width, Math.max(bottomCut + 1, bottom - stripRows), bottom)

    const lugGeometry: LugGeometry = {
      topLugLeft: { x: Math.round(topStrip.cx - topStrip.halfWidth), y: topCut },
      topLugRight: { x: Math.round(topStrip.cx + topStrip.halfWidth), y: topCut },
      bottomLugLeft: { x: Math.round(botStrip.cx - botStrip.halfWidth), y: bottomCut },
      bottomLugRight: { x: Math.round(botStrip.cx + botStrip.halfWidth), y: bottomCut },
      lugWidthPx: Math.round(topStrip.halfWidth + botStrip.halfWidth),
      imageWidth: width,
      imageHeight: height,
    }

    // The actual fix for lug shape: keep the case's confident plateau
    // whole, and in the top/bottom transition zones, keep anything wider
    // than the strap's own measured width unconditionally (that's the lug,
    // however far its taper extends) rather than a flat row cut. See
    // buildLugAwareMaskPng's doc comment.
    const caseMask = await buildLugAwareMaskPng(data, width, height, top, bottom, topCut, bottomCut, topStrip, botStrip)
    return {
      caseMask,
      lugGeometry,
      confidence: band.confidence,
      strapAttachment: band.sharpTransition ? 'drilled_lug' : 'unknown',
    }
  }
}

// Tier 1 — escalation for low-confidence geometric results. Semantic
// landmark detection succeeds where generic promptable segmentation fails,
// because Claude reasons about "this is a watch, these are lugs" rather than
// blindly classifying pixels.
export class ClaudeVisionLandmarkProvider implements SegmentationProvider {
  private apiKey = process.env.ANTHROPIC_API_KEY
  private baseUrl = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '')
  private model = process.env.ANTHROPIC_SEGMENT_MODEL || 'claude-sonnet-5'

  async segmentCase(imageBuffer: Buffer): Promise<SegmentationResult> {
    if (!this.apiKey) throw new Error('ANTHROPIC_API_KEY required for the Claude vision provider (or use --provider=geometric).')
    const meta = await sharp(imageBuffer).ensureAlpha().metadata()
    const width = meta.width!
    const height = meta.height!
    const pngBuf = await sharp(imageBuffer).png().toBuffer()
    const b64 = pngBuf.toString('base64')

    const tool = {
      name: 'report_case_geometry',
      description:
        'Report the watch case shape and the four lug-attachment landmark points (where the strap/bracelet meets the case) on a top-down, transparent-background product photo of a complete watch (case + strap/bracelet).',
      input_schema: {
        type: 'object',
        properties: {
          case_shape: { type: 'string', enum: ['round', 'square', 'cushion', 'tonneau', 'rectangular', 'other'] },
          strap_attachment: {
            type: 'string',
            enum: ['drilled_lug', 'integrated', 'nato_through', 'unknown'],
            description: '"integrated" means the bracelet visually flows into the case with no separate drilled lug (Royal Oak / Nautilus style) — there is no clean cut line in that case.',
          },
          confident: {
            type: 'boolean',
            description: 'false if the case/strap boundary is ambiguous or the design is integrated — still return your best-guess points.',
          },
          top_lug_left: {
            type: 'object',
            description: 'Fraction of image width/height, origin top-left (0,0)–(1,1).',
            properties: { x: { type: 'number' }, y: { type: 'number' } },
            required: ['x', 'y'],
          },
          top_lug_right: {
            type: 'object',
            properties: { x: { type: 'number' }, y: { type: 'number' } },
            required: ['x', 'y'],
          },
          bottom_lug_left: {
            type: 'object',
            properties: { x: { type: 'number' }, y: { type: 'number' } },
            required: ['x', 'y'],
          },
          bottom_lug_right: {
            type: 'object',
            properties: { x: { type: 'number' }, y: { type: 'number' } },
            required: ['x', 'y'],
          },
          notes: { type: 'string' },
        },
        required: [
          'case_shape', 'strap_attachment', 'confident',
          'top_lug_left', 'top_lug_right', 'bottom_lug_left', 'bottom_lug_right',
        ],
      },
    }

    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        tools: [tool],
        tool_choice: { type: 'tool', name: 'report_case_geometry' },
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } },
            {
              type: 'text',
              text: 'This is a product photo of a complete watch (case + strap/bracelet) on a transparent background, shot top-down with 12 o\'clock at the top. Identify the four points where the strap/bracelet meets the case — the row where the case ends and the strap begins, on both the top and bottom. Call report_case_geometry.',
            },
          ],
        }],
      }),
    })
    if (!res.ok) throw new Error(`Claude vision request failed: ${res.status} ${await res.text()}`)
    const json = await res.json() as { content: Array<{ type: string; input?: Record<string, unknown> }> }
    const toolUse = json.content.find(b => b.type === 'tool_use') as { input: Record<string, any> } | undefined
    if (!toolUse) throw new Error('Claude did not return a tool_use block')
    const out = toolUse.input

    const toPx = (p: { x: number; y: number }): LugPoint => ({
      x: Math.round(Math.max(0, Math.min(1, p.x)) * width),
      y: Math.round(Math.max(0, Math.min(1, p.y)) * height),
    })
    const topLeft = toPx(out.top_lug_left)
    const topRight = toPx(out.top_lug_right)
    const bottomLeft = toPx(out.bottom_lug_left)
    const bottomRight = toPx(out.bottom_lug_right)
    const topCut = Math.min(topLeft.y, topRight.y)
    const bottomCut = Math.max(bottomLeft.y, bottomRight.y)

    const lugGeometry: LugGeometry = {
      topLugLeft: topLeft,
      topLugRight: topRight,
      bottomLugLeft: bottomLeft,
      bottomLugRight: bottomRight,
      lugWidthPx: Math.round(((topRight.x - topLeft.x) + (bottomRight.x - bottomLeft.x)) / 2),
      imageWidth: width,
      imageHeight: height,
    }

    // Claude's four points place the plateau boundary, but the MASK still
    // needs to keep the lugs' full taper rather than a flat cut through them
    // (see buildLugAwareMaskPng) — measure the strap's real width from the
    // image tips exactly as the geometric tier does.
    const { data: rgba, info } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const { top, bottom } = alphaBoundsRows(rgba, info.width, info.height)
    const stripRows = Math.max(6, Math.round((bottom - top) * 0.04))
    const topStrip = measureStrip(rgba, width, top, Math.min(topCut - 1, top + stripRows))
    const botStrip = measureStrip(rgba, width, Math.max(bottomCut + 1, bottom - stripRows), bottom)
    const caseMask = await buildLugAwareMaskPng(rgba, width, height, top, bottom, topCut, bottomCut, topStrip, botStrip)

    let confidence = out.confident ? 0.85 : 0.5
    if (out.strap_attachment === 'integrated') confidence = Math.min(confidence, 0.3)
    return {
      caseMask,
      lugGeometry,
      confidence,
      caseShape: out.case_shape as CaseShape,
      strapAttachment: out.strap_attachment as StrapAttachment,
    }
  }
}

// Tier 2 — legacy heavy fallback, kept for the residual long tail (e.g. mesh
// bracelets whose many small gaps break the width-profile heuristic).
export class ReplicateSamProvider implements SegmentationProvider {
  private token = process.env.REPLICATE_API_TOKEN
  private model = process.env.REPLICATE_SEGMENT_MODEL
    || 'schananas/grounded_sam:ee871c19efb1941f55f66a3d7d960428c8a5afcb77449547fe8e5a3ab9ebc21c'

  async segmentCase(imageBuffer: Buffer): Promise<SegmentationResult> {
    if (!this.token) throw new Error('REPLICATE_API_TOKEN required for the Replicate provider (or use --ingest / --provider=geometric).')
    const dataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`
    const prompt = 'watch case, bezel, crown and dial — the watch head only, excluding the strap and bracelet'
    const create = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: this.model.split(':')[1], input: { image: dataUri, mask_prompt: prompt, negative_mask_prompt: 'strap, bracelet, band, leather, rubber' } }),
    })
    if (!create.ok) throw new Error(`Replicate create failed: ${create.status} ${await create.text()}`)
    let pred = await create.json() as { id: string; status: string; output?: unknown; error?: string; urls?: { get: string } }
    const getUrl = pred.urls?.get || `https://api.replicate.com/v1/predictions/${pred.id}`
    const started = Date.now()
    while (pred.status !== 'succeeded' && pred.status !== 'failed' && pred.status !== 'canceled') {
      if (Date.now() - started > 120_000) throw new Error('Replicate prediction timed out')
      await new Promise(r => setTimeout(r, 1500))
      const poll = await fetch(getUrl, { headers: { Authorization: `Bearer ${this.token}` } })
      pred = await poll.json()
    }
    if (pred.status !== 'succeeded') throw new Error(`Replicate prediction ${pred.status}: ${pred.error ?? ''}`)
    const maskUrl = Array.isArray(pred.output) ? String(pred.output[pred.output.length - 1]) : String(pred.output)
    const maskRes = await fetch(maskUrl)
    const caseMask = await sharp(Buffer.from(await maskRes.arrayBuffer())).greyscale().png().toBuffer()
    return { caseMask, lugGeometry: null, confidence: 0.75 }
  }
}

export class OpenAiMaskProvider implements SegmentationProvider {
  async segmentCase(): Promise<SegmentationResult> {
    throw new Error('OpenAI mask provider is a documented fallback and is not wired for batch use yet — use --ingest, --provider=geometric, or --provider=claude.')
  }
}
