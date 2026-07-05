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
  // Straight parallel sides (a rectangular/tank case) fit a near-infinite
  // circle with a tiny residual — reject any fit whose radius wildly exceeds
  // the silhouette's actual half-span so those cases fall through to the
  // rounded-rectangle model instead of a degenerate "arc".
  let spanMax = 0
  for (const [x] of pts) spanMax = Math.max(spanMax, Math.abs(x - f.cx))
  if (f.a > spanMax * 1.25) return null
  return { cx: f.cx, cy: f.cy, a: f.a, b: f.b, rms, samples }
}

export interface CaseRectFit {
  left: number
  right: number
  /** Rows where the case's straight sides begin/end (the flat top/bottom
   *  edges, before corner rounding). */
  top: number
  bottom: number
  /** MAD of the side-edge samples, px — straightness/quality signal. */
  mad: number
  samples: number
}

// Rounded-rectangle case model (Cartier Tank et al.). The sides are straight
// vertical lines: left/right = robust medians of the silhouette edges across
// the band (percentile trim rejects the crown, same as the ellipse path), and
// the case's vertical extent = the contiguous run of rows whose span reaches
// both sides (corner rounding and the strap fall outside it). Returns null
// when the sides aren't actually straight — that's a round case or noise,
// not a rectangle.
export function fitCaseRect(
  rgba: Buffer, width: number, yTop: number, yBottom: number, threshold = 24,
): CaseRectFit | null {
  const rows: Array<{ y: number; left: number; right: number }> = []
  for (let y = Math.max(0, yTop); y <= yBottom; y += 1) {
    const span = spanAt(rgba, width, y, threshold)
    if (span) rows.push({ y, left: span.left, right: span.right })
  }
  if (rows.length < 24) return null

  const med = (vals: number[]) => [...vals].sort((p, q) => p - q)[Math.floor(vals.length / 2)]
  // Trim crown/pusher rows: keep the 70% of rows whose right edge is closest
  // to the median (protrusions are one-sided and a minority), then re-median.
  let left = med(rows.map(r => r.left))
  let right = med(rows.map(r => r.right))
  for (let pass = 0; pass < 2; pass += 1) {
    const l = left
    const r = right
    const scored = rows
      .map(row => ({ row, err: Math.abs(row.left - l) + Math.abs(row.right - r) }))
      .sort((p, q) => p.err - q.err)
    const keep = scored.slice(0, Math.max(24, Math.floor(scored.length * 0.7))).map(s => s.row)
    left = med(keep.map(k => k.left))
    right = med(keep.map(k => k.right))
  }
  const inliers = rows.filter(r => Math.abs(r.left - left) <= 3 && Math.abs(r.right - right) <= 3)
  if (inliers.length < rows.length * 0.4) return null
  const devs = inliers.map(r => Math.abs(r.left - left) + Math.abs(r.right - right)).sort((p, q) => p - q)
  const mad = devs[Math.floor(devs.length / 2)]

  // Vertical extent: widest contiguous run of rows spanning both sides,
  // scanned over the FULL image (the band only seeds the sides).
  const tol = 10
  let top = -1
  let bottom = -1
  const { top: alphaTop, bottom: alphaBottom } = alphaBoundsRows(rgba, width, rgba.length / (width * 4))
  for (let y = alphaTop; y <= alphaBottom; y += 1) {
    const span = spanAt(rgba, width, y, threshold)
    const full = span != null && span.left <= left + tol && span.right >= right - tol
    if (full && top < 0) top = y
    if (full) bottom = y
  }
  if (top < 0 || bottom - top < (right - left) * 0.5) return null
  return { left, right, top, bottom, mad, samples: inliers.length }
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

  // Lug tips always sit BEYOND the case cap (in a face-on shot the lugs hold
  // the spring bar past the case edge), so the drop-scan is confined to rows
  // outside cy ± 0.95b. Scanning any of the case-body rows invites false
  // tips: the case arc's own slope near the cap produces window-drops of the
  // same magnitude as a subtle real tip, and a chrono pusher's shoulder
  // produces a bigger one (an IWC Portugieser fixture "found" its top lug
  // tips at the top pusher's edge, chopping the entire case cap off).
  const capEdge = Math.round(side === 'top' ? body.cy - body.b * 0.95 : body.cy + body.b * 0.95)
  let scanFrom = startY
  while (scanFrom !== endY && spanHalfAt(scanFrom) >= body.a * 0.88) scanFrom += dir
  if (dir < 0 ? capEdge < scanFrom : capEdge > scanFrom) scanFrom = capEdge
  if (dir < 0 ? scanFrom <= endY : scanFrom >= endY) return null

  const window = 2

  // A true lug tip has substantial strap PERSISTING beyond it; a strap's own
  // rounded end (a deployant-clasp product shot where the strap ends INSIDE
  // the frame — the edgeMargin above only covers straps cropped AT the frame)
  // is a span collapse to zero, whose per-window drops dwarf a real tip's.
  // Require ≥30% of the case half-width to still be there ~12% further out;
  // a row past the image bounds counts as persisting (that's a cropped
  // strap, which edgeMargin already handles).
  const height = Math.floor(rgba.length / (width * 4))
  const persistDist = Math.max(window + 4, Math.round(body.a * 0.12))
  const persists = (y: number): boolean => {
    const py = y + dir * persistDist
    if (py < 0 || py >= height) return true
    return spanHalfAt(py) >= body.a * 0.3
  }

  let bestDrop = 0
  let bestTip: number | null = null
  for (let y = scanFrom; ; y += dir) {
    const outer = y + dir * window
    if (dir < 0 ? outer < endY : outer > endY) break
    const near = spanHalfAt(y)
    const far = spanHalfAt(outer)
    if (near < 0 || far < 0) continue
    const drop = near - far
    if (drop > bestDrop && persists(y)) { bestDrop = drop; bestTip = y }
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
  /** True when the strap's color was decisively separable from the case
   *  metal — enables the per-pixel strap veto in the mask; false for metal
   *  bracelets (texture mode). */
  colorMode: boolean
  /** Median strap RGB the boundary/veto classifies against. */
  strapColor: { r: number; g: number; b: number }
  /** Albedo-line strap model for chromatic straps: pixels within `thr`
   *  normalized residual of the ray through the RGB origin along (r,g,b)
   *  count as strap at ANY brightness (the same leather's shadowed grain,
   *  lit grain, and pale cut edge are colinear; a median-distance test reads
   *  the bright tones as "case"). Only set when the measured case color sits
   *  decisively off that line, so it can never absorb the case itself. */
  strapLine?: { r: number; g: number; b: number; thr: number }
  /** Veto ramp in strap-color-distance units, scaled to the measured
   *  strap↔case contrast: ≤ vetoZero → strap (removed), ≥ vetoFull → case. */
  vetoZero: number
  vetoFull: number
}

// Snap the channel floor from the fitted arc to the ACTUAL case edge in the
// pixels. The fit is measured from the case's SIDES, but between the lugs
// the visible boundary is the bezel's outer edge (on a dive watch, the
// serrated coin-edge ring), which sits a few px inside the side-profile
// radius — leaving the fitted arc alone kept a thin band of bracelet
// end-link (with its telltale vertical link lines) above the real bezel
// edge on the Tudor fixture.
//
// Two boundary regimes, chosen by the strap's own color (sampled from the
// channel just inside the lug tips — guaranteed strap):
//
// • COLOR mode — the strap is visually distinct from metal (dark or
//   saturated: leather, rubber, fabric). The boundary is simply where
//   pixels stop matching the strap's color, scanned outside-in with a
//   3-row persistence guard (stitching and scale highlights are 1-2 rows).
//   This can't creep into strap texture (alligator scales stay
//   strap-colored however much they gradient) and preserves any bezel ring
//   for free — the first non-strap row IS the ring's outer edge.
// • TEXTURE mode — the strap reads as metal (a bracelet: bright, no
//   chroma), so color can't separate end-link steel from bezel steel. The
//   boundary is a gradient CLUSTER (measured on the Tudor fixture: smooth
//   end-link ≤ 24, serrated ring 30-60, ring → insert 130-250): anchor on
//   the strongest edge and walk outward to the cluster's start — snapping
//   at the strongest edge alone eats the serrated ring, which is case.
//
// Falls back to the fitted arc where no signal clears the bar. Median-
// smoothed across columns so one noisy column can't spike.
export function refineChannelFloor(
  rgba: Buffer, width: number, height: number,
  body: { cx: number; cy: number; a: number; b: number; rms?: number },
  channelHalf: number, tipY: number, side: 'top' | 'bottom',
  // Boundary prior per column. Defaults to the fitted ellipse arc; the
  // rounded-rectangle path passes a flat line at the case's top/bottom edge,
  // with a wider, ASYMMETRIC window — a rectangle's "first full-width row"
  // is its corner tips, and the true boundary can sit far to either side:
  // the Tank fixture's top strap rolls OVER the flat edge (boundary ~39 rows
  // outside the prior) while its bottom rail sits ~55 rows INSIDE it.
  prior?: { yAt: (x: number) => number; capY: number; window?: number; windowIn?: number },
): ChannelFloor {
  const { cx, cy, a, b } = body
  const x0 = Math.max(0, Math.floor(cx - channelHalf - 4))
  const x1 = Math.min(width - 1, Math.ceil(cx + channelHalf + 4))
  const w = prior?.window ?? Math.max(4, Math.round(a * 0.06))
  const wIn = prior?.windowIn ?? w
  const biasIn = 1
  const rows = new Int32Array(x1 - x0 + 1)

  const lumaAt = (x: number, y: number): number => {
    if (y < 0 || y >= height) return 0
    const i = (y * width + x) * 4
    const alpha = rgba[i + 3] / 255
    return (0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]) * alpha
  }

  // Strap color: median RGB over the WHOLE channel span between the lug tips
  // and the case cap. Sampling only the rows right under the tips collapsed
  // the reference to near-black on the IWC fixture (that band is the strap's
  // deepest lug shadow), which made the strap's own mid-gray edge pixels
  // measure as "not strap" and survive the veto. The full span sees lit and
  // shadowed strap alike; the handful of case-edge pixels that sneak into
  // the deepest rows are a minority the median ignores.
  const inward = side === 'top' ? 1 : -1
  const capY = prior ? Math.round(prior.capY) : Math.round(side === 'top' ? cy - b : cy + b)
  const spanRows = Math.max(12, (capY - tipY) * inward - 2)
  const samples: Array<[number, number, number]> = []
  for (let k = 2; k <= spanRows; k += 1) {
    const y = tipY + inward * k
    if (y < 0 || y >= height) break
    for (let x = x0 + 4; x <= x1 - 4; x += 3) {
      const i = (y * width + x) * 4
      if (rgba[i + 3] > 200) samples.push([rgba[i], rgba[i + 1], rgba[i + 2]])
    }
  }
  const median = (k: number) => samples.map(s => s[k]).sort((p, q) => p - q)[Math.floor(samples.length / 2)] ?? 128
  const strapR = median(0)
  const strapG = median(1)
  const strapB = median(2)

  // Case reference: rows just past the cap, inside the case body — the bezel
  // top surface. The strap↔case CONTRAST scales every color threshold below:
  // absolute thresholds failed on the IWC fixture because the channel strap
  // sits in deep lug shadow (near-black), leaving its own edge highlights
  // (~30-40 luma) in an absolute ramp's gray zone — relative to a ~680
  // contrast they're unambiguously strap-side.
  // With an arc prior, the rows just past the cap are reliably case (bezel).
  // With a flat-line prior the boundary itself is uncertain, so instead scan
  // the window's case side for the ROW most distinct from the strap — that
  // self-selects the case metal (the Tank fixture's bright top rail) even
  // when the rows adjacent to the prior are still strap, and even when other
  // case-side content (a blue dial under a navy strap) resembles the strap.
  const caseRowSpan = prior ? 2 * w : 9
  let contrast = 0
  let bestCase: [number, number, number] | null = null
  for (let k = 3; k <= caseRowSpan; k += 1) {
    const y = capY + inward * k
    if (y < 0 || y >= height) break
    const rowSamples: Array<[number, number, number]> = []
    for (let x = Math.max(x0 + 6, Math.round(cx - channelHalf * 0.6)); x <= Math.min(x1 - 6, Math.round(cx + channelHalf * 0.6)); x += 3) {
      const i = (y * width + x) * 4
      if (rgba[i + 3] > 200) rowSamples.push([rgba[i], rgba[i + 1], rgba[i + 2]])
    }
    if (rowSamples.length < 4) continue
    const rowMed = (k2: number) => rowSamples.map(s => s[k2]).sort((p, q) => p - q)[Math.floor(rowSamples.length / 2)]
    const rowColor: [number, number, number] = [rowMed(0), rowMed(1), rowMed(2)]
    const d = Math.abs(rowColor[0] - strapR) + Math.abs(rowColor[1] - strapG) + Math.abs(rowColor[2] - strapB)
    if (d > contrast) { contrast = d; bestCase = rowColor }
  }
  if (!bestCase) contrast = 0
  // Color mode iff the strap is decisively separable from the case metal —
  // a bracelet's steel-on-steel contrast (~90 on the Tudor fixture) stays in
  // texture mode; leather/rubber (~400-700) qualifies.
  const colorMode = samples.length >= 24 && contrast >= 240
  const boundaryThr = contrast * 0.45
  const vetoZero = contrast * 0.3
  const vetoFull = contrast * 0.45

  // Albedo-line strap model: one material under varying illumination spans a
  // RAY through the RGB origin, not a ball around a median — a brown
  // alligator's dark shadowed grain (47,41,33), lit grain (105,89,78) and
  // bright tan cut edge (139,115,90) are colinear within a normalized
  // residual of ~0.06, while the steel case sits at ~0.15 off that line at
  // matched brightness (measured on the Longines fixture, where the tan edge
  // band was d≈223 from the median — "case" to a distance test — and hung as
  // a 10-row kept band under the lug tips). A pixel close to the strap's
  // albedo line is strap NO MATTER how bright: that's what a median distance
  // can never express. Enabled only when the measured case color itself sits
  // decisively OFF the line — a near-black strap under a steel case is
  // colinear with it (both neutral), and there the plain median distance is
  // already decisive.
  const strapNorm = Math.hypot(strapR, strapG, strapB)
  const lineResidualNorm = (r: number, g: number, b: number): number => {
    const dot = (r * strapR + g * strapG + b * strapB) / strapNorm
    if (dot < 40) return 0 // too dark to have a direction — strap-side either way
    const pr = dot * (strapR / strapNorm)
    const pg = dot * (strapG / strapNorm)
    const pb = dot * (strapB / strapNorm)
    return (Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb)) / Math.max(60, dot)
  }
  let strapLine: NonNullable<ChannelFloor['strapLine']> | undefined
  if (colorMode && bestCase && strapNorm >= 45) {
    const caseResNorm = lineResidualNorm(bestCase[0], bestCase[1], bestCase[2])
    if (caseResNorm >= 0.11) {
      strapLine = {
        r: strapR, g: strapG, b: strapB,
        thr: Math.min(0.25, caseResNorm * 0.55),
      }
    }
  }
  const strapDistAt = (x: number, y: number): number => {
    const i = (y * width + x) * 4
    if (rgba[i + 3] <= 60) return 0 // transparent counts as strap-side (removed either way)
    if (strapLine && lineResidualNorm(rgba[i], rgba[i + 1], rgba[i + 2]) < strapLine.thr) return 0
    return Math.abs(rgba[i] - strapR) + Math.abs(rgba[i + 1] - strapG) + Math.abs(rgba[i + 2] - strapB)
  }

  // In COLOR mode the scan has a reliable stop condition (the strap→case
  // color transition), so let it reach deeper inside the fitted arc than the
  // default trust region: the bezel edge between the lugs can sit well
  // inside the side-profile radius the body was fitted on (~0.09a on the
  // Longines fixture, past the default 0.06a window — the tan band it kept
  // was UNREACHABLE, not just misclassified). The OUTWARD reach shrinks to
  // the fit's own error instead: a round case physically cannot extend past
  // its fitted circle, so a boundary out there is always misread strap (the
  // Longines strap's near-white painted edge coat is indistinguishable from
  // polished steel — only this geometric bound cuts it). Texture mode keeps
  // the symmetric window (its gradient walk has no color stop), and an
  // explicit prior (rect path) owns its windows outright.
  const wInEff = !prior && colorMode ? Math.max(wIn, Math.round(a * 0.14)) : wIn
  const wOutEff = !prior && colorMode ? Math.max(3, Math.round((body.rms ?? 2) * 2)) : w

  for (let x = x0; x <= x1; x += 1) {
    const dx = x - cx
    const inside = 1 - (dx / a) * (dx / a)
    const yArcF = prior
      ? prior.yAt(x)
      : inside > 0 ? (side === 'top' ? cy - b * Math.sqrt(inside) : cy + b * Math.sqrt(inside)) : cy
    const yArc = Math.round(yArcF)
    const lo = Math.max(side === 'top' ? tipY + 1 : Math.round(cy), yArc - (side === 'top' ? wOutEff : wInEff))
    const hi = Math.min(side === 'top' ? Math.round(cy) : tipY - 1, yArc + (side === 'top' ? wInEff : wOutEff))
    let snapped = yArc
    if (colorMode) {
      // COLOR mode: boundary = outermost row that stops matching the strap's
      // color, with 3-row persistence (stitching/scale highlights span 1-2).
      const start = side === 'top' ? lo : hi
      const step = side === 'top' ? 1 : -1
      let found = false
      for (let y = start; y >= lo && y <= hi; y += step) {
        if (strapDistAt(x, y) >= boundaryThr && strapDistAt(x, y + step) >= boundaryThr && strapDistAt(x, y + 2 * step) >= boundaryThr) {
          snapped = y
          found = true
          break
        }
      }
      // Nothing but strap in the whole window: with an explicit prior the
      // prior line is no boundary estimate at all (the rect fit's top/bottom
      // are the RAIL-END rows, and falling back to them silently kept a
      // full-height strap sliver hugging a brancard's inner face on the Tank
      // fixture) — the honest answer is "the case starts at least at my
      // deepest reach". The fitted-arc fallback stays for the round path,
      // where the arc IS a real case-boundary estimate.
      if (!found) snapped = prior ? (side === 'top' ? hi : lo) : yArc
    } else {
      // TEXTURE mode: the case edge is a CLUSTER of strong gradients, not a
      // single line — on a dive bezel: (end-link → serrated ring) then
      // (serrated ring → colored insert), with the insert boundary usually
      // the strongest. Snapping to the strongest edge eats the serrated ring
      // (measured on the Tudor fixture: ring rows 30-60, insert boundary
      // 130-250, smooth end-link ≤ 24). The true boundary is the cluster's
      // OUTER START: anchor at the strongest edge (definitely inside the
      // boundary complex), then walk OUTWARD while gradients stay
      // significant relative to that anchor (1-row gaps allowed — serration
      // valleys), and snap where the cluster dies into the smooth end-link.
      let gMax = 0
      let yMax = yArc
      const gAt = (y: number) => Math.abs(lumaAt(x, y + 1) - lumaAt(x, y - 1))
      for (let y = lo; y <= hi; y += 1) {
        const g = gAt(y)
        if (g > gMax) { gMax = g; yMax = y }
      }
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
  return { x0, rows: smoothed, colorMode, strapColor: { r: strapR, g: strapG, b: strapB }, strapLine, vetoZero, vetoFull }
}

// Distance from a pixel to the floor's strap reference — 0 when the pixel
// lies on the strap's albedo line (any brightness of the same material),
// else the L1 distance to the median. Comparable against the floor's
// vetoZero/vetoFull/boundary thresholds.
export function strapRefDist(
  floor: Pick<ChannelFloor, 'strapColor' | 'strapLine'>,
  r: number, g: number, b: number,
): number {
  const line = floor.strapLine
  if (line) {
    const n = Math.hypot(line.r, line.g, line.b)
    const dot = (r * line.r + g * line.g + b * line.b) / n
    if (dot >= 40) {
      const res = (Math.abs(r - dot * (line.r / n)) + Math.abs(g - dot * (line.g / n)) + Math.abs(b - dot * (line.b / n)))
        / Math.max(60, dot)
      if (res < line.thr) return 0
    }
  }
  return Math.abs(r - floor.strapColor.r) + Math.abs(g - floor.strapColor.g) + Math.abs(b - floor.strapColor.b)
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
//
// When a floor ran in COLOR mode, a per-pixel strap-color veto also runs
// over that side's transition zone (between the tip row and the case body,
// out to just past the lug faces): geometry decides the region, but color
// gets the last word per pixel. This is what removes the residue geometry
// alone can't express — the strap edge hugging a lug's inner face, and
// anti-aliased strap stubble along the snapped floor (seen on the IWC
// Portugieser fixture's navy alligator strap). Metal bracelets (texture
// mode) skip the veto — end-link steel matches case steel, so a color veto
// there would eat the case itself.
export async function buildCaseContourMaskPng(
  width: number, height: number, p: CaseContourParams, feather = 1.5, rgba?: Buffer,
): Promise<Buffer> {
  const { cx, cy } = p.body
  const buf = Buffer.alloc(width * height)
  const floorRowAt = (floor: ChannelFloor | undefined, x: number): number | null => {
    if (!floor) return null
    const idx = x - floor.x0
    if (idx < 0 || idx >= floor.rows.length) return null
    return floor.rows[idx]
  }
  const vetoAt = (floor: ChannelFloor, x: number, y: number): number => {
    if (!rgba) return 1
    const i = (y * width + x) * 4
    if (rgba[i + 3] <= 60) return 1 // transparent — mask value irrelevant
    const dist = strapRefDist(floor, rgba[i], rgba[i + 1], rgba[i + 2])
    const span = Math.max(1, floor.vetoFull - floor.vetoZero)
    return Math.max(0, Math.min(1, (dist - floor.vetoZero) / span))
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
      let keep = Math.max(bodyKeep, bandKeep) * tipGate
      // Strap veto: only in the transition zone (outside the case body,
      // within the channel) of a color-mode side. The x-reach is
      // channelHalf + 3 along the lug faces — enough to clean the strap edge
      // hugging a face without reaching into the lug's own dark shadow band
      // (near-black, reads as "strap" to the veto) — but widens to +8 within
      // 12 rows of the snapped floor, where the strap corner tucks into the
      // lug-face/arc junction and any shaved lug shadow merges into the
      // case's own shadow anyway.
      if (keep > 0 && ellipseBoundaryDistance(p.body, x, y) > -3) {
        const floor = y < cy ? p.floorTop : p.floorBottom
        if (floor?.colorMode) {
          const floorRow = floorRowAt(floor, x)
          const nearFloor = floorRow != null && Math.abs(y - floorRow) <= 12
          if (dx < channelHalf + (nearFloor ? 8 : 3)) keep *= vetoAt(floor, x, y)
        }
      }
      buf[rowOff + x] = Math.round(keep * 255)
    }
  }
  return sharp(buf, { raw: { width, height, channels: 1 } }).png().toBuffer()
}

export interface RectContourParams {
  rect: CaseRectFit
  channelHalfTop: number
  channelHalfBottom: number
  floorTop?: ChannelFloor
  floorBottom?: ChannelFloor
}

// Rounded-rectangle sibling of buildCaseContourMaskPng (Cartier Tank et al.),
// built case-first: per column, find where the CASE METAL actually ends and
// cut everything else. No per-pixel color veto — on the Tank fixture the veto
// read the brancards' near-black polished reflections as "strap" and carved
// visible lug metal, while its jagged per-pixel verdicts left strap stubble
// and floating band bits along every uncertain zone.
//
// Two per-column boundary sources, take whichever keeps MORE case:
// • The snapped channel floor (strap↔case transition, robust mid-channel).
// • A METAL WALK for the brancard/rail ends: anchored at the flat-edge row
//   (a rail spans the case's full height, so that row is always rail metal),
//   walk outward crossing dark metal freely (a polished rail's black
//   reflection bands are colorimetrically strap — only structure can keep
//   them), stopping at DECISIVE strap color (lit, chromatic — never a
//   near-black pixel) or transparency. The rail keeps its natural silhouette
//   end — smooth edges and left/right symmetry fall out by construction,
//   and it works even where the strap overlaps the rail columns (this Tank's
//   strap is nearly case-wide — the "strap is narrower than the case"
//   assumption behind the old corner model is simply false on real photos).
export async function buildRectContourMaskPng(
  width: number, height: number, p: RectContourParams, feather = 1.5, rgba?: Buffer,
): Promise<Buffer> {
  const { rect } = p
  const crownPad = Math.round((rect.bottom - rect.top) * 0.08)
  const halfH = (rect.bottom - rect.top) / 2
  const buf = Buffer.alloc(width * height)
  const floorRowAt = (floor: ChannelFloor | undefined, x: number): number | null => {
    if (!floor) return null
    const idx = x - floor.x0
    if (idx < 0 || idx >= floor.rows.length) return null
    return floor.rows[idx]
  }

  const lumaAt = (x: number, y: number): number => {
    const i = (y * width + x) * 4
    return (0.299 * rgba![i] + 0.587 * rgba![i + 1] + 0.114 * rgba![i + 2]) * (rgba![i + 3] / 255)
  }
  const alphaAt = (x: number, y: number): number => rgba![(y * width + x) * 4 + 3]
  // Decisive strap: bright enough to have a color identity AND matching the
  // floor's strap reference(s). Near-black pixels are never decisive — deep
  // strap shadow and polished-rail reflection are indistinguishable there,
  // and the walk's re-anchor cap bounds how far ambiguity can carry it.
  const decisiveStrap = (floor: ChannelFloor | undefined, x: number, y: number): boolean => {
    if (!rgba || !floor?.colorMode) return false
    const i = (y * width + x) * 4
    if (rgba[i + 3] <= 60) return false
    if (lumaAt(x, y) < 45) return false
    return strapRefDist(floor, rgba[i], rgba[i + 1], rgba[i + 2]) < floor.vetoZero
  }
  // Decisive metal: what the walk may re-anchor on. Requiring positive
  // case-evidence (bright AND far from the strap references) — not merely
  // "not decisively strap" — is what keeps the walk from chaining through a
  // lit strap on ambiguous grain rows: ambiguity can be CROSSED (crossCap)
  // but never extends the claim.
  const metalish = (floor: ChannelFloor | undefined, x: number, y: number): boolean => {
    if (alphaAt(x, y) <= 127 || lumaAt(x, y) < 60) return false
    if (!floor?.colorMode) return true
    const i = (y * width + x) * 4
    return strapRefDist(floor, rgba![i], rgba![i + 1], rgba![i + 2]) >= floor.vetoFull
  }

  // How many rows of dark/ambiguous pixels the walk may cross before it must
  // re-anchor on bright metal — bounds the damage on an all-dark strap.
  const crossCap = Math.max(10, Math.round(halfH * 0.08))
  // Returns the outermost decisive-metal row reachable from the anchor, or
  // null (NO CLAIM) when the anchor itself isn't decisive metal. The anchor
  // is the case's vertical middle: on a rail column that's bright rail flank
  // (rails span the full case height); on a channel column it's the dial —
  // not metal — so the walk correctly stays silent there and the floor rules.
  const walkEnd = (floor: ChannelFloor | undefined, x: number, anchor: number, dir: -1 | 1): number | null => {
    if (!rgba || !metalish(floor, x, anchor)) return null
    let lastMetal = anchor
    let transparent = 0
    for (let y = anchor + dir; y >= 0 && y < height; y += dir) {
      if (alphaAt(x, y) <= 60) {
        transparent += 1
        if (transparent >= 3) break
        continue
      }
      transparent = 0
      if (decisiveStrap(floor, x, y) && decisiveStrap(floor, x, y + dir)) break
      if (metalish(floor, x, y)) lastMetal = y
      else if (Math.abs(y - lastMetal) > crossCap) break
    }
    return lastMetal
  }

  // Per-column boundaries across the case width, then median-smoothed so a
  // single column's verdict can't leave a jagged spike. The walk only ever
  // EXTENDS the kept region past the floor (min/max) — a walk that dies
  // early (a silver hand anchoring mid-dial, immediately fenced by the
  // strap-colored dial) yields a claim inside the floor and loses the
  // min/max, so channel columns always fall back to the floor.
  const xL = Math.max(0, Math.floor(rect.left - 2))
  const xR = Math.min(width - 1, Math.ceil(rect.right + 2))
  const nCols = xR - xL + 1
  const topBoundRaw = new Int32Array(nCols)
  const botBoundRaw = new Int32Array(nCols)
  const anchor = Math.round((rect.top + rect.bottom) / 2)
  // A walk claim that beats the floor must actually be metal: a strap sliver
  // hugging a rail's inner face carries a bright specular edge highlight the
  // walk can re-anchor on, claiming a mostly-navy wedge. If the extension
  // zone is dominated by decisive-strap pixels, the claim is bogus.
  const auditClaim = (floor: ChannelFloor | undefined, x: number, from: number, to: number): boolean => {
    if (!rgba) return true
    let strapPx = 0
    let opaquePx = 0
    for (let y = Math.min(from, to); y <= Math.max(from, to); y += 1) {
      if (alphaAt(x, y) <= 60) continue
      opaquePx += 1
      if (decisiveStrap(floor, x, y)) strapPx += 1
    }
    return opaquePx === 0 || strapPx / opaquePx <= 0.25
  }
  for (let x = xL; x <= xR; x += 1) {
    const ft = floorRowAt(p.floorTop, x)
    const fb = floorRowAt(p.floorBottom, x)
    let wt = walkEnd(p.floorTop, x, anchor, -1)
    let wb = walkEnd(p.floorBottom, x, anchor, 1)
    if (wt != null && ft != null && wt < ft && !auditClaim(p.floorTop, x, wt, ft - 1)) wt = null
    if (wb != null && fb != null && wb > fb && !auditClaim(p.floorBottom, x, fb + 1, wb)) wb = null
    topBoundRaw[x - xL] = ft != null ? Math.min(ft, wt ?? ft) : (wt ?? Math.round(rect.top))
    botBoundRaw[x - xL] = fb != null ? Math.max(fb, wb ?? fb) : (wb ?? Math.round(rect.bottom))
  }
  // Window 9: wide enough that a strap's 2-3px bright EDGE FILAMENT (per
  // pixel it IS metal — bright, neutral, far from the strap references;
  // only its shape betrays it) can't hold a claim, while a ~50px rail end
  // shifts by at most a few columns of rounding.
  const medianSmooth = (rows: Int32Array): Int32Array => {
    const out = new Int32Array(rows.length)
    for (let i = 0; i < rows.length; i += 1) {
      const vals: number[] = []
      for (let k = -4; k <= 4; k += 1) vals.push(rows[Math.min(rows.length - 1, Math.max(0, i + k))])
      vals.sort((p2, q) => p2 - q)
      out[i] = vals[4]
    }
    return out
  }
  const topBound = medianSmooth(topBoundRaw)
  const botBound = medianSmooth(botBoundRaw)

  for (let y = 0; y < height; y += 1) {
    const rowOff = y * width
    for (let x = 0; x < width; x += 1) {
      let keep: number
      if (x < xL || x > xR) {
        // Beyond the case sides: only the crown lives here, well inside the
        // case's vertical span.
        keep = y >= rect.top + crownPad && y <= rect.bottom - crownPad ? 1 : 0
      } else {
        const kTop = Math.max(0, Math.min(1, (y - (topBound[x - xL] - feather)) / feather))
        const kBot = Math.max(0, Math.min(1, ((botBound[x - xL] + feather) - y) / feather))
        keep = Math.min(kTop, kBot)
      }
      buf[rowOff + x] = Math.round(keep * 255)
    }
  }
  return sharp(buf, { raw: { width, height, channels: 1 } }).png().toBuffer()
}

// ── Mask solidification (the "lugs never have holes" rule) ──────────────────
//
// The geometric mask can be wrong in two structural ways that no boundary
// tuning fixes, both caught on the Cartier Tank fixture:
//   • A GOUGE: at columns where a lug's inner face overlaps the channel edge,
//     the per-column floor cuts at the channel boundary while the lug itself
//     continues past it in those same columns — carving a notch into solid
//     case metal.
//   • FLOATERS: stray kept fragments (strap slivers, specks) disconnected
//     from the case.
// Same worldview as the watch background-removal pipeline: the case is ONE
// solid connected component. Three passes over the built mask:
//   1. Keep only the largest kept component (floaters die).
//   2. Reclaim: grow the kept region into removed-but-opaque neighbors that
//      are case-colored (strap-distance ≥ the veto's case threshold), scoped
//      to the lug bands via `lugBand` — mid-channel reclaim is disabled so a
//      strap's case-colored stitching can't creep back in. Color-mode only;
//      steel-on-steel has no per-pixel color signal to reclaim with.
//   3. Fill enclosed holes: any removed-but-opaque region unreachable from
//      the image border is interior to the case and gets restored.
export async function solidifyCaseMaskPng(
  maskPng: Buffer, rgba: Buffer, width: number, height: number,
  opts: {
    cy: number
    floorTop?: ChannelFloor
    floorBottom?: ChannelFloor
    /** Columns/rows where color reclaim may operate (the lug bands). */
    lugBand?: (x: number, y: number) => boolean
  },
): Promise<Buffer> {
  const maskRaw = await sharp(maskPng).raw().toBuffer({ resolveWithObject: true })
  const ch = maskRaw.info.channels
  const n = width * height
  const mask = Buffer.alloc(n)
  for (let i = 0; i < n; i += 1) mask[i] = maskRaw.data[i * ch]
  const opaque = (i: number) => rgba[i * 4 + 3] > 60
  const kept = (i: number) => mask[i] >= 128 && opaque(i)

  // Pass 1: largest connected component of kept pixels.
  const label = new Int32Array(n).fill(-1)
  const stack: number[] = []
  let bestLabel = -1
  let bestSize = 0
  let nextLabel = 0
  for (let i = 0; i < n; i += 1) {
    if (label[i] >= 0 || !kept(i)) continue
    let size = 0
    stack.push(i)
    label[i] = nextLabel
    while (stack.length) {
      const p = stack.pop()!
      size += 1
      const px = p % width
      if (px > 0 && label[p - 1] < 0 && kept(p - 1)) { label[p - 1] = nextLabel; stack.push(p - 1) }
      if (px < width - 1 && label[p + 1] < 0 && kept(p + 1)) { label[p + 1] = nextLabel; stack.push(p + 1) }
      if (p >= width && label[p - width] < 0 && kept(p - width)) { label[p - width] = nextLabel; stack.push(p - width) }
      if (p < n - width && label[p + width] < 0 && kept(p + width)) { label[p + width] = nextLabel; stack.push(p + width) }
    }
    if (size > bestSize) { bestSize = size; bestLabel = nextLabel }
    nextLabel += 1
  }
  for (let i = 0; i < n; i += 1) {
    if (mask[i] >= 128 && (label[i] !== bestLabel)) mask[i] = 0
  }

  // Pass 2: color reclaim into the lug bands.
  const floorFor = (i: number) => (Math.floor(i / width) < opts.cy ? opts.floorTop : opts.floorBottom)
  const reclaimable = (i: number): boolean => {
    if (mask[i] >= 128 || !opaque(i)) return false
    const x = i % width
    const y = Math.floor(i / width)
    if (opts.lugBand && !opts.lugBand(x, y)) return false
    const floor = floorFor(i)
    if (!floor?.colorMode) return false
    const dist = strapRefDist(floor, rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2])
    return dist >= floor.vetoFull
  }
  for (let i = 0; i < n; i += 1) {
    if (mask[i] >= 128 && label[i] === bestLabel) {
      const px = i % width
      if ((px > 0 && reclaimable(i - 1)) || (px < width - 1 && reclaimable(i + 1))
        || (i >= width && reclaimable(i - width)) || (i < n - width && reclaimable(i + width))) {
        stack.push(i)
      }
    }
  }
  while (stack.length) {
    const p = stack.pop()!
    const px = p % width
    for (const q of [px > 0 ? p - 1 : -1, px < width - 1 ? p + 1 : -1, p >= width ? p - width : -1, p < n - width ? p + width : -1]) {
      if (q >= 0 && reclaimable(q)) { mask[q] = 255; stack.push(q) }
    }
  }

  // Pass 3: fill enclosed holes — flood the "not kept" region from the image
  // border; anything unreached that is source-opaque is interior to the case.
  const outside = new Uint8Array(n)
  const notKept = (i: number) => mask[i] < 128
  for (let x = 0; x < width; x += 1) {
    for (const i of [x, (height - 1) * width + x]) {
      if (notKept(i) && !outside[i]) { outside[i] = 1; stack.push(i) }
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (const i of [y * width, y * width + width - 1]) {
      if (notKept(i) && !outside[i]) { outside[i] = 1; stack.push(i) }
    }
  }
  while (stack.length) {
    const p = stack.pop()!
    const px = p % width
    for (const q of [px > 0 ? p - 1 : -1, px < width - 1 ? p + 1 : -1, p >= width ? p - width : -1, p < n - width ? p + width : -1]) {
      if (q >= 0 && notKept(q) && !outside[q]) { outside[q] = 1; stack.push(q) }
    }
  }
  for (let i = 0; i < n; i += 1) {
    if (notKept(i) && !outside[i] && opaque(i)) mask[i] = 255
  }

  return sharp(mask, { raw: { width, height, channels: 1 } }).png().toBuffer()
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
    // Model competition: a rectangular case (Cartier Tank) can still "pass"
    // the circle fit — percentile trimming prunes the points down to a subset
    // a mediocre circle explains (measured on the Tank fixture: a=213,
    // rms 7.8 — real round cases fit at rms ≤ 2). So whenever the round fit
    // is poor, try the rounded-rectangle model and let the better explanation
    // win. On genuinely round watches fitCaseRect returns null (an arc's side
    // edges fail its straight-side inlier bar), so round watches never take
    // this branch by accident.
    if (!body || body.rms > 4) {
      const rect = fitCaseRect(data, width, bandTopAbs + bandPad, bandBottomAbs - bandPad)
      if (rect && (!body || rect.mad * 2 < body.rms)) {
        return this.segmentRectCase(data, width, height, top, rect)
      }
    }
    if (!body) {
      // Neither model holds — coarse row band at low confidence so the auto
      // orchestrator escalates to the Claude tier or human review.
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

    const floorTop = refineChannelFloor(data, width, height, body, channelHalfTop, tipTopY, 'top')
    const floorBottom = refineChannelFloor(data, width, height, body, channelHalfBottom, tipBottomY, 'bottom')
    if (process.env.SEGMENT_DEBUG) {
      console.error('[debug] body', JSON.stringify(body))
      console.error('[debug] zones', JSON.stringify({ topZone, botZone }))
      for (const [f, s] of [[floorTop, 'top'], [floorBottom, 'bottom']] as const) {
        const cols = [130, 160, 200, 237, 280, 320, 345].filter(x => x - f.x0 >= 0 && x - f.x0 < f.rows.length)
        console.error(`[debug] floor ${s}`, JSON.stringify({
          colorMode: f.colorMode, strapColor: f.strapColor, strapLine: f.strapLine ?? null,
          vetoZero: Math.round(f.vetoZero), vetoFull: Math.round(f.vetoFull),
          rows: cols.map(x => `${x}:${f.rows[x - f.x0]}`).join(' '),
        }))
      }
    }
    const rawMask = await buildCaseContourMaskPng(width, height, {
      body, tipTopY, tipBottomY, channelHalfTop, channelHalfBottom, floorTop, floorBottom,
    }, 1.5, data)
    const caseMask = await solidifyCaseMaskPng(rawMask, data, width, height, {
      cy: body.cy, floorTop, floorBottom,
      lugBand: (x, y) => Math.abs(x - body.cx) >= Math.min(channelHalfTop, channelHalfBottom) - 2
        && y >= tipTopY && y <= tipBottomY,
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
    // Tip sharpness alone under-rates softly tapered lugs (the Longines
    // fixture's flare spreads over ~6 rows, so its best 2-row drop is tiny) —
    // but when both channel floors ran in COLOR mode, the cut is anchored by
    // a decisive strap↔case color separation, which the fixtures showed is
    // the more reliable boundary evidence. Let that stand in for soft tips —
    // ONLY when tips were actually detected on both sides AND the strap is
    // decisively narrower than the case (a real lug channel). If either zone
    // is a fallback (integrated/near-integrated — no contraction found, and
    // the fallback channelHalf of a·0.5 fakes a plausible ratio), the doubt
    // is whether lugs exist at all, and color can't answer that — those must
    // stay in the escalation zone no matter how separable the strap color is.
    const tipScore = ((topZone?.sharpness ?? 0) + (botZone?.sharpness ?? 0)) / 2
    const colorScore = (floorTop.colorMode ? 0.5 : 0) + (floorBottom.colorMode ? 0.5 : 0)
    const channelRatio = (channelHalfTop + channelHalfBottom) / (2 * body.a)
    const tipEvidence = topZone && botZone && channelRatio < 0.6
      ? Math.max(tipScore, colorScore * 0.8)
      : tipScore
    const fitScore = Math.max(0, Math.min(1, 1 - body.rms / (body.a * 0.02)))
    const plausible = channelRatio > 0.28 && channelRatio < 0.72
    const confidence = Math.max(0.1, Math.min(0.97,
      0.15 + 0.4 * tipEvidence + 0.3 * fitScore + (plausible ? 0.15 : 0)))

    const roundish = Math.abs(body.a - body.b) / Math.max(body.a, body.b) < 0.12
    return {
      caseMask,
      lugGeometry,
      confidence,
      caseShape: fitScore > 0.4 ? (roundish ? 'round' : 'cushion') : 'other',
      strapAttachment: tipEvidence > 0.35 && plausible ? 'drilled_lug' : 'unknown',
    }
  }

  // Rounded-rectangle path (Cartier Tank et al.). The strap/case boundary is
  // the case's flat top/bottom edge — refineChannelFloor runs with a
  // flat-line prior instead of an arc, and the same color snap + strap veto
  // find the exact edge. The strap on a tank is narrower than the case, so
  // the "lug tips" ARE the boundary rows and the brancard corners are kept
  // by the corner columns' generosity (nothing but case exists there).
  private async segmentRectCase(
    data: Buffer, width: number, height: number, alphaTop: number, rect: CaseRectFit,
  ): Promise<SegmentationResult> {
    const cx = (rect.left + rect.right) / 2
    const halfW = (rect.right - rect.left) / 2
    const halfH = (rect.bottom - rect.top) / 2
    const pseudoBody = { cx, cy: (rect.top + rect.bottom) / 2, a: halfW, b: halfH }

    // Measure the strap clear of the corner rounding — 8px above the "full
    // width" row is still corner metal (measured on the Tank fixture:
    // span 350 at top−8 vs the strap's true 284 at top−24).
    const cornerClear = Math.max(16, Math.round(halfW * 0.16))
    const channelHalfFor = (side: 'top' | 'bottom'): number => {
      const y = side === 'top' ? rect.top - cornerClear : rect.bottom + cornerClear
      const span = spanAt(data, width, Math.max(0, Math.min(height - 1, y)))
      if (!span) return halfW * 0.7
      const half = Math.max(cx - span.left, span.right - cx)
      return Math.max(halfW * 0.3, Math.min(halfW * 0.95, half))
    }
    const channelHalfTop = channelHalfFor('top')
    const channelHalfBottom = channelHalfFor('bottom')

    const sampleReach = Math.min(80, Math.max(20, rect.top - alphaTop - 8))
    // The boundary can sit far to EITHER side of the corner row: the Tank
    // fixture's top strap rolls OVER the flat edge (boundary ~39 rows outside
    // the prior) while its bottom rail sits ~55 rows INSIDE it — hence the
    // asymmetric reach, deeper on the inward side.
    const window = Math.max(12, Math.round(halfH * 0.18))
    const windowIn = Math.max(window, Math.round(halfH * 0.3))
    const floorTop = refineChannelFloor(
      data, width, height, pseudoBody, channelHalfTop, rect.top - sampleReach, 'top',
      { yAt: () => rect.top, capY: rect.top, window, windowIn },
    )
    const floorBottom = refineChannelFloor(
      data, width, height, pseudoBody, channelHalfBottom, rect.bottom + sampleReach, 'bottom',
      { yAt: () => rect.bottom, capY: rect.bottom, window, windowIn },
    )

    const rawMask = await buildRectContourMaskPng(width, height, {
      rect, channelHalfTop, channelHalfBottom, floorTop, floorBottom,
    }, 1.5, data)
    // No color reclaim here: the metal walk already keeps the full visible
    // rails (reclaim was the old fix for the veto carving them, and its
    // strap-adjacent creep is what floated band bits back in). Largest
    // component + enclosed-hole fill still apply.
    const caseMask = await solidifyCaseMaskPng(rawMask, data, width, height, {
      cy: (rect.top + rect.bottom) / 2, floorTop, floorBottom,
      lugBand: () => false,
    })

    const medianRow = (floor: ChannelFloor): number => {
      const sorted = [...floor.rows].sort((p, q) => p - q)
      return sorted[Math.floor(sorted.length / 2)]
    }
    const tipTopY = medianRow(floorTop)
    const tipBottomY = medianRow(floorBottom)
    const lugGeometry: LugGeometry = {
      topLugLeft: { x: Math.round(cx - channelHalfTop), y: tipTopY },
      topLugRight: { x: Math.round(cx + channelHalfTop), y: tipTopY },
      bottomLugLeft: { x: Math.round(cx - channelHalfBottom), y: tipBottomY },
      bottomLugRight: { x: Math.round(cx + channelHalfBottom), y: tipBottomY },
      lugWidthPx: Math.round(channelHalfTop + channelHalfBottom),
      imageWidth: width,
      imageHeight: height,
    }

    const rectScore = Math.max(0, Math.min(1, 1 - rect.mad / 3))
    const colorScore = floorTop.colorMode && floorBottom.colorMode ? 1 : 0.3
    const channelRatio = (channelHalfTop + channelHalfBottom) / (2 * halfW)
    const plausible = channelRatio > 0.35 && channelRatio < 0.98
    const confidence = Math.max(0.1, Math.min(0.9,
      0.2 + 0.25 * rectScore + 0.25 * colorScore + (plausible ? 0.15 : 0)))
    const aspect = halfH / halfW
    return {
      caseMask,
      lugGeometry,
      confidence,
      caseShape: aspect > 0.92 && aspect < 1.08 ? 'square' : 'rectangular',
      strapAttachment: colorScore === 1 ? 'drilled_lug' : 'unknown',
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
      const floorTop = refineChannelFloor(rgba, width, height, body, channelHalfTop, tipTopY, 'top')
      const floorBottom = refineChannelFloor(rgba, width, height, body, channelHalfBottom, tipBottomY, 'bottom')
      const rawMask = await buildCaseContourMaskPng(width, height, {
        body, tipTopY, tipBottomY, channelHalfTop, channelHalfBottom, floorTop, floorBottom,
      }, 1.5, rgba)
      caseMask = await solidifyCaseMaskPng(rawMask, rgba, width, height, {
        cy: body.cy, floorTop, floorBottom,
        lugBand: (x, y) => Math.abs(x - body.cx) >= Math.min(channelHalfTop, channelHalfBottom) - 2
          && y >= tipTopY && y <= tipBottomY,
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
