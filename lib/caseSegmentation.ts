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
// every lug's taper (lugs are angled horns that extend well past the case
// body, not a flat shelf). Kept ONLY as the degraded fallback when
// fitCaseBody finds no stable case-body ellipse (rectangular/tonneau cases)
// — always paired with a low confidence so the orchestrator escalates; the
// real mask is buildCaseContourMaskPng below.
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

// ── The case-contour model ───────────────────────────────────────────────────
//
// What a watch head ACTUALLY looks like (verified against the curated 3D
// case-only reference renders — Tudor BB58 GMT, Omega Aqua Terra, Oris Big
// Crown — the same assets scripts/segment-watch-cases.ts ingests):
//
//   case-only silhouette = round case body (a circle) ∪ four lug horns ∪ crown
//
// and the strap channel between each lug pair is bounded by the lug INNER
// faces on the sides and the case's own CURVED edge below — not a straight
// line. Nothing exists beyond the lug tips. Two earlier mask generations got
// this wrong in different ways: a flat row cut chopped the lugs into stubs,
// and a strap-width column band left the between-lug cut straight (where the
// real boundary is the case's curve) and kept bracelet fragments floating
// above the lug tips (bracelet end-links near the case are wider than the
// strap's far-tip width, so "wider than the strap" wrongly classified them
// as lug material).
//
// The contour mask encodes the real shape directly:
//   keep(x, y) = rows within [lug tip top, lug tip bottom] AND
//                ( inside the fitted case circle    ← curved channel floor
//                  OR |x − cx| ≥ channel half-width ← lug horns / case sides / crown )
// Everything beyond the lug tips is dropped unconditionally — that's where
// only strap/bracelet can exist.

export interface CaseBodyFit {
  cx: number
  cy: number
  /** Horizontal semi-axis, px. */
  a: number
  /** Vertical semi-axis, px. */
  b: number
  /** RMS boundary residual of the inlier points, px — fit quality signal. */
  rms: number
  samples: number
}

/** Approx. distance from a point to the ellipse boundary, px (radial-ray
 *  distance — exact for a circle, tight for the mild eccentricities real
 *  product photos have). Negative inside, positive outside. */
export function ellipseBoundaryDistance(fit: { cx: number; cy: number; a: number; b: number }, x: number, y: number): number {
  const dx = x - fit.cx
  const dy = y - fit.cy
  const n = Math.sqrt((dx / fit.a) ** 2 + (dy / fit.b) ** 2)
  if (n === 0) return -Math.min(fit.a, fit.b)
  return Math.hypot(dx, dy) * (n - 1) / n
}

// Axis-aligned ellipse fit: A·x² + B·y² + C·x + D·y = 1, linear least squares
// in (A, B, C, D). An ellipse, not a circle, because real product photos have
// slight perspective squash — a circle fit on the Tudor fixture left ~6px RMS
// of systematic residual (2.5% of r), enough for the channel-floor arc to sit
// visibly off the bezel edge; the ellipse absorbs it.
function ellipseFit(pts: Array<[number, number]>): { cx: number; cy: number; a: number; b: number } | null {
  const M = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]
  const v = [0, 0, 0, 0]
  for (const [x, y] of pts) {
    const row = [x * x, y * y, x, y]
    for (let i = 0; i < 4; i += 1) {
      v[i] += row[i]
      for (let j = 0; j < 4; j += 1) M[i][j] += row[i] * row[j]
    }
  }
  // Gaussian elimination with partial pivoting on the 4×4 normal equations.
  for (let col = 0; col < 4; col += 1) {
    let pivot = col
    for (let row = col + 1; row < 4; row += 1) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row
    }
    if (Math.abs(M[pivot][col]) < 1e-9) return null
    if (pivot !== col) {
      [M[col], M[pivot]] = [M[pivot], M[col]]
      ;[v[col], v[pivot]] = [v[pivot], v[col]]
    }
    for (let row = col + 1; row < 4; row += 1) {
      const f = M[row][col] / M[col][col]
      for (let k = col; k < 4; k += 1) M[row][k] -= f * M[col][k]
      v[row] -= f * v[col]
    }
  }
  const sol = [0, 0, 0, 0]
  for (let row = 3; row >= 0; row -= 1) {
    let acc = v[row]
    for (let k = row + 1; k < 4; k += 1) acc -= M[row][k] * sol[k]
    sol[row] = acc / M[row][row]
  }
  const [A, B, C, D] = sol
  // The LSQ can return the same ellipse with every coefficient negated —
  // it's an ellipse iff A, B, and K all share one sign, making K/A and K/B
  // (the squared semi-axes) positive.
  const cx = -C / (2 * A)
  const cy = -D / (2 * B)
  const K = 1 + (C * C) / (4 * A) + (D * D) / (4 * B)
  const aSq = K / A
  const bSq = K / B
  if (!(aSq > 0) || !(bSq > 0)) return null
  return { cx, cy, a: Math.sqrt(aSq), b: Math.sqrt(bSq) }
}

// Kåsa algebraic circle fit — the constrained (a = b) sibling of ellipseFit.
function circleFit(pts: Array<[number, number]>): { cx: number; cy: number; a: number; b: number } | null {
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0
  let sxz = 0, syz = 0, sz = 0
  const n = pts.length
  for (const [x, y] of pts) {
    const z = x * x + y * y
    sxx += x * x; sxy += x * y; syy += y * y
    sx += x; sy += y
    sxz += x * z; syz += y * z; sz += z
  }
  const M = [
    [sxx, sxy, sx],
    [sxy, syy, sy],
    [sx, sy, n],
  ]
  const v = [-sxz, -syz, -sz]
  for (let col = 0; col < 3; col += 1) {
    let pivot = col
    for (let row = col + 1; row < 3; row += 1) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row
    }
    if (Math.abs(M[pivot][col]) < 1e-9) return null
    if (pivot !== col) {
      [M[col], M[pivot]] = [M[pivot], M[col]]
      ;[v[col], v[pivot]] = [v[pivot], v[col]]
    }
    for (let row = col + 1; row < 3; row += 1) {
      const f = M[row][col] / M[col][col]
      for (let k = col; k < 3; k += 1) M[row][k] -= f * M[col][k]
      v[row] -= f * v[col]
    }
  }
  const sol = [0, 0, 0]
  for (let row = 2; row >= 0; row -= 1) {
    let acc = v[row]
    for (let k = row + 1; k < 3; k += 1) acc -= M[row][k] * sol[k]
    sol[row] = acc / M[row][row]
  }
  const [D, E, F] = sol
  const cx = -D / 2
  const cy = -E / 2
  const rSq = cx * cx + cy * cy - F
  if (!(rSq > 0)) return null
  const r = Math.sqrt(rSq)
  return { cx, cy, a: r, b: r }
}

type BodyShape = { cx: number; cy: number; a: number; b: number }

function robustBodyFit(
  pts: Array<[number, number]>,
  fitFn: (p: Array<[number, number]>) => BodyShape | null,
): { fit: BodyShape; rms: number; samples: number } | null {
  // Percentile trim, not median×k: the crown contributes ~10-15% of edge
  // points at a consistent +20-30px offset, which inflates a median-scaled
  // tolerance enough to keep itself. Dropping the worst 22% per pass removes
  // any minority outlier block regardless of its magnitude.
  let keep = pts
  let fit = fitFn(keep)
  for (let pass = 0; pass < 3 && fit; pass += 1) {
    const f = fit
    const resid = keep.map(([x, y]) => Math.abs(ellipseBoundaryDistance(f, x, y)))
    const sorted = [...resid].sort((p, q) => p - q)
    const tol = Math.max(2.5, sorted[Math.floor(sorted.length * 0.78)])
    const next = keep.filter((_, i) => resid[i] <= tol)
    if (next.length < 24 || next.length === keep.length) break
    keep = next
    fit = fitFn(keep)
  }
  if (!fit) return null
  const f = fit
  const resid = keep.map(([x, y]) => Math.abs(ellipseBoundaryDistance(f, x, y)))
  const rms = Math.sqrt(resid.reduce((acc, val) => acc + val * val, 0) / resid.length)
  return { fit: f, rms, samples: keep.length }
}

// Fit the case body's outline from the silhouette's left/right edges across
// the case band. The crown (right side) and lug shoulders are outliers — a
// trim-and-refit pass drops them rather than letting them bend the fit.
//
// A circle and an axis-aligned ellipse are both tried, and the circle wins
// unless the ellipse is decisively better: the sampled band only covers the
// case's SIDE arcs (the caps are where lugs/strap live), and a free vertical
// semi-axis extrapolated from side arcs alone drifts badly (the Tudor
// fixture fit b≈253 against an observed cap implying ≈234 — a ~19px bulge in
// the channel-floor arc), while a circle's cap position is pinned by the
// sides' own curvature. The ellipse exists to absorb genuine perspective
// squash when the data actually demands it.
//
// Returns null when no stable body exists (rectangular/tonneau cases,
// degenerate silhouettes) — callers treat that as "escalate," not "guess."
export function fitCaseBody(
  rgba: Buffer, width: number, yTop: number, yBottom: number, threshold = 24,
): CaseBodyFit | null {
  const pts: Array<[number, number]> = []
  for (let y = Math.max(0, yTop); y <= yBottom; y += 1) {
    const span = spanAt(rgba, width, y, threshold)
    if (!span) continue
    pts.push([span.left, y], [span.right, y])
  }
  if (pts.length < 24) return null

  const circle = robustBodyFit(pts, circleFit)
  const ellipse = robustBodyFit(pts, ellipseFit)
  let chosen = circle
  if (ellipse && (!circle || ellipse.rms < circle.rms * 0.7)) {
    const aspect = ellipse.fit.a / ellipse.fit.b
    if (aspect > 0.85 && aspect < 1.18) chosen = ellipse
  }
  if (!chosen) return null

  const { fit: f, rms, samples } = chosen
  const maxDim = Math.max(width, yBottom - yTop + 1)
  const sane = (s: number) => s > maxDim * 0.1 && s < maxDim * 2
  if (!sane(f.a) || !sane(f.b)) return null
  return { cx: f.cx, cy: f.cy, a: f.a, b: f.b, rms, samples }
}

export interface LugZone {
  /** Row of the lug tips — beyond it, only strap/bracelet exists. */
  tipY: number
  /** Channel half-width: distance from case centre to the lug inner faces,
   *  measured from the strap/end-link just beyond the tips (an end link fills
   *  the channel exactly, so its width IS the channel width). */
  channelHalf: number
  /** 0..1 — how cleanly the lug tips stood out from the strap behind them. */
  sharpness: number
}

// Find one lug pair's tip row: scanning outward from the case body, the
// silhouette span holds at the lug outer edges, then contracts sharply to the
// strap/bracelet width the instant the lugs end. That contraction — not any
// fixed width threshold — marks the tips, which is what lets this coexist
// with bracelets whose end-links flare wider than the strap's far end (the
// exact case where "wider than the strap ⇒ lug" broke and left floating
// bracelet fragments above the tips).
export function findLugZone(
  rgba: Buffer, width: number,
  body: CaseBodyFit, alphaTop: number, alphaBottom: number,
  side: 'top' | 'bottom', threshold = 24,
): LugZone | null {
  const dir = side === 'top' ? -1 : 1
  const startY = Math.round(body.cy)
  // A real lug tip always has strap CONTINUING beyond it — that's what a
  // strap does. The silhouette's own crop boundary (where the strap runs off
  // the frame and antialiasing fades it out) produces the single biggest
  // span contraction in the whole image, so without this margin the scan
  // latches onto the image edge instead of the lugs.
  const edgeMargin = Math.max(6, Math.round((alphaBottom - alphaTop) * 0.02))
  const endY = side === 'top' ? alphaTop + edgeMargin : alphaBottom - edgeMargin
  const spanHalfAt = (y: number): number => {
    const span = spanAt(rgba, width, y, threshold)
    if (!span) return -1
    return Math.max(body.cx - span.left, span.right - body.cx)
  }

  // Enter the scan only once past the case's bulk — the lug/strap region.
  let scanFrom = startY
  while (scanFrom !== endY && spanHalfAt(scanFrom) >= body.a * 0.88) scanFrom += dir

  const window = 2
  let bestDrop = 0
  let bestTip: number | null = null
  for (let y = scanFrom; ; y += dir) {
    const outer = y + dir * window
    if (dir < 0 ? outer < endY : outer > endY) break
    const near = spanHalfAt(y)
    const far = spanHalfAt(outer)
    if (near < 0 || far < 0) continue
    const drop = near - far
    if (drop > bestDrop) { bestDrop = drop; bestTip = y }
  }
  if (bestTip == null) return null

  const minDrop = Math.max(3, body.a * 0.015)
  // Full sharpness at a tip that protrudes ~6% of the case's semi-axis past
  // the strap behind it — calibrated so a bracelet's modest-but-real tips
  // (Tudor fixture: ~10-16px on a 234px case) still read as found.
  const sharpness = Math.max(0, Math.min(1, (bestDrop - minDrop) / (body.a * 0.06)))
  if (bestDrop < minDrop) return null

  const tipY = bestTip

  // Channel width from the rows just beyond the tips — pure strap/end-link.
  const halves: number[] = []
  for (let k = 3; k <= 10; k += 1) {
    const y = tipY + dir * k
    if (dir < 0 ? y < endY : y > endY) break
    const h = spanHalfAt(y)
    if (h > 0) halves.push(h)
  }
  halves.sort((a, b) => a - b)
  const channelHalf = halves.length
    ? halves[Math.floor(halves.length / 2)]
    : body.a * 0.5
  const clamped = Math.max(body.a * 0.2, Math.min(body.a * 0.92, channelHalf))
  return { tipY, channelHalf: clamped, sharpness }
}

export interface ChannelFloor {
  /** Absolute x of floors[0]. */
  x0: number
  /** Per-column boundary row (top side: first case row; bottom side: last). */
  rows: Int32Array
}

// Snap the channel floor from the fitted arc to the ACTUAL case edge in the
// pixels. The fit is measured from the case's SIDES, but between the lugs
// the visible boundary is the bezel's outer edge (on a dive watch, the
// serrated coin-edge ring), which sits a few px inside the side-profile
// radius — leaving the fitted arc alone kept a thin band of bracelet
// end-link (with its telltale vertical link lines) above the real bezel
// edge on the Tudor fixture. Per column inside the channel, search a small
// window around the fitted arc for the strongest vertical gradient (the
// shadow line where the strap/end-link tucks under the bezel — steel-on-
// steel still has one; a colored strap against a steel case has a huge one)
// and snap the boundary there, falling back to the arc where no clear edge
// exists. Median-smoothed across columns so one noisy column can't spike.
export function refineChannelFloor(
  rgba: Buffer, width: number, height: number,
  body: { cx: number; cy: number; a: number; b: number },
  channelHalf: number, tipY: number, side: 'top' | 'bottom',
): ChannelFloor {
  const { cx, cy, a, b } = body
  const x0 = Math.max(0, Math.floor(cx - channelHalf - 4))
  const x1 = Math.min(width - 1, Math.ceil(cx + channelHalf + 4))
  const w = Math.max(4, Math.round(a * 0.06))
  const biasIn = 1
  const rows = new Int32Array(x1 - x0 + 1)

  const lumaAt = (x: number, y: number): number => {
    if (y < 0 || y >= height) return 0
    const i = (y * width + x) * 4
    const alpha = rgba[i + 3] / 255
    return (0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]) * alpha
  }

  for (let x = x0; x <= x1; x += 1) {
    const dx = x - cx
    const inside = 1 - (dx / a) * (dx / a)
    const yArcF = inside > 0 ? (side === 'top' ? cy - b * Math.sqrt(inside) : cy + b * Math.sqrt(inside)) : cy
    const yArc = Math.round(yArcF)
    const lo = Math.max(side === 'top' ? tipY + 1 : Math.round(cy), yArc - w)
    const hi = Math.min(side === 'top' ? Math.round(cy) : tipY - 1, yArc + w)
    // The case edge between the lugs is a CLUSTER of strong gradients, not a
    // single line — on a dive bezel: (end-link → serrated ring) then
    // (serrated ring → colored insert), with the insert boundary usually the
    // strongest. Snapping to the strongest edge eats the serrated ring
    // (measured on the Tudor fixture: ring rows 30-60, insert boundary
    // 130-250, smooth end-link ≤ 24). The true boundary is the cluster's
    // OUTER START: anchor at the strongest edge (definitely inside the
    // boundary complex), then walk OUTWARD while gradients stay significant
    // relative to that anchor (1-row gaps allowed — serration valleys), and
    // snap where the cluster dies into the smooth strap/end-link.
    let gMax = 0
    let yMax = yArc
    const gAt = (y: number) => Math.abs(lumaAt(x, y + 1) - lumaAt(x, y - 1))
    for (let y = lo; y <= hi; y += 1) {
      const g = gAt(y)
      if (g > gMax) { gMax = g; yMax = y }
    }
    let snapped = yArc
    if (gMax >= 12) {
      const walkThr = Math.max(10, gMax * 0.1)
      const out = side === 'top' ? -1 : 1
      let outer = yMax
      let gap = 0
      for (let y = yMax + out; y >= lo && y <= hi; y += out) {
        if (gAt(y) >= walkThr) { outer = y; gap = 0 } else if (++gap >= 2) break
      }
      snapped = outer
    }
    rows[x - x0] = Math.round(snapped + (side === 'top' ? biasIn : -biasIn))
  }

  // Median smooth (window 5) — kills single-column spikes from serration
  // texture or link-gap shadows without softening the real boundary.
  const smoothed = new Int32Array(rows.length)
  for (let i = 0; i < rows.length; i += 1) {
    const windowVals: number[] = []
    for (let k = -2; k <= 2; k += 1) {
      const idx = Math.min(rows.length - 1, Math.max(0, i + k))
      windowVals.push(rows[idx])
    }
    windowVals.sort((p, q) => p - q)
    smoothed[i] = windowVals[2]
  }
  return { x0, rows: smoothed }
}

export interface CaseContourParams {
  body: { cx: number; cy: number; a: number; b: number }
  tipTopY: number
  tipBottomY: number
  channelHalfTop: number
  channelHalfBottom: number
  /** Pixel-snapped channel boundaries (refineChannelFloor). When present they
   *  REPLACE the fitted arc inside the channel columns — the snapped edge is
   *  usually a few px inside the arc, and taking the max of both would
   *  resurrect exactly the end-link sliver the snap exists to remove. */
  floorTop?: ChannelFloor
  floorBottom?: ChannelFloor
}

// Render the contour mask described in the model comment above. The case
// body's boundary is feathered along its ellipse (so the channel floor is a
// smooth arc), the lug inner faces vertically, and the tip rows horizontally.
// Inside the channel columns, a pixel-snapped floor (refineChannelFloor)
// replaces the fitted arc when provided.
export async function buildCaseContourMaskPng(
  width: number, height: number, p: CaseContourParams, feather = 1.5,
): Promise<Buffer> {
  const { cx, cy } = p.body
  const buf = Buffer.alloc(width * height)
  const floorRowAt = (floor: ChannelFloor | undefined, x: number): number | null => {
    if (!floor) return null
    const idx = x - floor.x0
    if (idx < 0 || idx >= floor.rows.length) return null
    return floor.rows[idx]
  }
  for (let y = 0; y < height; y += 1) {
    const tipRampTop = (y - (p.tipTopY - feather)) / feather
    const tipRampBottom = ((p.tipBottomY + feather) - y) / feather
    const tipGate = Math.max(0, Math.min(1, tipRampTop, tipRampBottom))
    const rowOff = y * width
    if (tipGate === 0) { buf.fill(0, rowOff, rowOff + width); continue }
    const channelHalf = y < cy ? p.channelHalfTop : p.channelHalfBottom
    for (let x = 0; x < width; x += 1) {
      const dx = Math.abs(x - cx)
      const bandKeep = Math.max(0, Math.min(1, (dx - (channelHalf - feather)) / feather))
      let bodyKeep: number
      const topFloorRow = y < cy ? floorRowAt(p.floorTop, x) : null
      const botFloorRow = y >= cy ? floorRowAt(p.floorBottom, x) : null
      if (dx < channelHalf + 4 && (topFloorRow != null || botFloorRow != null)) {
        bodyKeep = topFloorRow != null
          ? Math.max(0, Math.min(1, (y - (topFloorRow - feather)) / feather))
          : Math.max(0, Math.min(1, ((botFloorRow! + feather) - y) / feather))
      } else {
        const d = ellipseBoundaryDistance(p.body, x, y)
        bodyKeep = Math.max(0, Math.min(1, (feather - d) / feather))
      }
      buf[rowOff + x] = Math.round(Math.max(bodyKeep, bandKeep) * tipGate * 255)
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

// Tier 0 — free, deterministic, no external API. Fits the case-contour model
// (case-body ellipse + lug horns + crown — see the model comment above
// CaseBodyFit) directly to the silhouette. When the model doesn't hold
// (rectangular case, integrated bracelet, no detectable lug tips), confidence
// drops below the escalation threshold instead of forcing a bad cut.
export class GeometricSilhouetteProvider implements SegmentationProvider {
  async segmentCase(imageBuffer: Buffer, hint?: { lugWidthMm?: number; braceletType?: string }): Promise<SegmentationResult> {
    const { data, info } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const { width, height } = info
    const { top, bottom } = alphaBoundsRows(data, width, height)
    const profile = computeWidthProfile(data, width, top, bottom)
    // 'strap' (leather/rubber/NATO) meets the case abruptly; anything else —
    // including the catalog's common "unset = plain metal bracelet" — flares
    // gradually across several end-links, so the coarse band needs a wider
    // window. The band only seeds the body fit's sampling range; the fit's
    // own outlier trimming forgives an imprecise band.
    const windowFrac = hint?.braceletType === 'strap' ? 0.035 : 0.1
    const band = detectCaseBand(profile, windowFrac)
    const bandTopAbs = top + band.topIdx
    const bandBottomAbs = top + band.botIdx
    const bandPad = Math.max(4, Math.round((bandBottomAbs - bandTopAbs) * 0.12))

    const body = fitCaseBody(data, width, bandTopAbs + bandPad, bandBottomAbs - bandPad)
    if (!body) {
      // No stable case-body ellipse (rectangular/tonneau case or degenerate
      // silhouette) — fall back to the coarse row band at low confidence so
      // the auto orchestrator escalates to the Claude tier or human review.
      const caseMask = await renderRowBandMaskPng(width, height, bandTopAbs, bandBottomAbs, 2)
      return { caseMask, lugGeometry: null, confidence: 0.3, strapAttachment: 'unknown', caseShape: 'other' }
    }

    const topZone = findLugZone(data, width, body, top, bottom, 'top')
    const botZone = findLugZone(data, width, body, top, bottom, 'bottom')

    // Fallback tips: the case body's own extremes — an honest "no lugs found"
    // shape (bare round case), never a cut through the middle of anything.
    const tipTopY = topZone?.tipY ?? Math.max(top, Math.round(body.cy - body.b))
    const tipBottomY = botZone?.tipY ?? Math.min(bottom, Math.round(body.cy + body.b))
    const channelHalfTop = topZone?.channelHalf ?? body.a * 0.5
    const channelHalfBottom = botZone?.channelHalf ?? body.a * 0.5

    const caseMask = await buildCaseContourMaskPng(width, height, {
      body, tipTopY, tipBottomY, channelHalfTop, channelHalfBottom,
      floorTop: refineChannelFloor(data, width, height, body, channelHalfTop, tipTopY, 'top'),
      floorBottom: refineChannelFloor(data, width, height, body, channelHalfBottom, tipBottomY, 'bottom'),
    })

    const lugGeometry: LugGeometry = {
      topLugLeft: { x: Math.round(body.cx - channelHalfTop), y: tipTopY },
      topLugRight: { x: Math.round(body.cx + channelHalfTop), y: tipTopY },
      bottomLugLeft: { x: Math.round(body.cx - channelHalfBottom), y: tipBottomY },
      bottomLugRight: { x: Math.round(body.cx + channelHalfBottom), y: tipBottomY },
      lugWidthPx: Math.round(channelHalfTop + channelHalfBottom),
      imageWidth: width,
      imageHeight: height,
    }

    // Confidence blends: how cleanly the lug tips stood out, how well the
    // case body matched an ellipse, and whether the channel/case ratio is a
    // physically plausible watch (lug width ≈ half the case diameter).
    const tipScore = ((topZone?.sharpness ?? 0) + (botZone?.sharpness ?? 0)) / 2
    const fitScore = Math.max(0, Math.min(1, 1 - body.rms / (body.a * 0.02)))
    const channelRatio = (channelHalfTop + channelHalfBottom) / (2 * body.a)
    const plausible = channelRatio > 0.28 && channelRatio < 0.72
    const confidence = Math.max(0.1, Math.min(0.97,
      0.15 + 0.4 * tipScore + 0.3 * fitScore + (plausible ? 0.15 : 0)))

    const roundish = Math.abs(body.a - body.b) / Math.max(body.a, body.b) < 0.12
    return {
      caseMask,
      lugGeometry,
      confidence,
      caseShape: fitScore > 0.4 ? (roundish ? 'round' : 'cushion') : 'other',
      strapAttachment: tipScore > 0.35 && plausible ? 'drilled_lug' : 'unknown',
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

    // Claude's four points ARE the lug tips and channel edges; the case
    // body's curve still comes from fitting the silhouette (same contour
    // model as the geometric tier — the between-lugs cut must follow the
    // case's curved edge, not a straight line between the points).
    const { data: rgba } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const { top, bottom } = alphaBoundsRows(rgba, width, height)
    const bandPad = Math.max(4, Math.round((bottomCut - topCut) * 0.12))
    const body = fitCaseBody(rgba, width, topCut + bandPad, bottomCut - bandPad)
    let caseMask: Buffer
    if (body) {
      const tipTopY = Math.max(top, topCut)
      const tipBottomY = Math.min(bottom, bottomCut)
      const channelHalfTop = (Math.abs(topRight.x - body.cx) + Math.abs(topLeft.x - body.cx)) / 2
      const channelHalfBottom = (Math.abs(bottomRight.x - body.cx) + Math.abs(bottomLeft.x - body.cx)) / 2
      caseMask = await buildCaseContourMaskPng(width, height, {
        body, tipTopY, tipBottomY, channelHalfTop, channelHalfBottom,
        floorTop: refineChannelFloor(rgba, width, height, body, channelHalfTop, tipTopY, 'top'),
        floorBottom: refineChannelFloor(rgba, width, height, body, channelHalfBottom, tipBottomY, 'bottom'),
      })
    } else {
      caseMask = await renderRowBandMaskPng(width, height, topCut, bottomCut, 3)
    }

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
