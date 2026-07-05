/**
 * Synthetic self-test for GeometricSilhouetteProvider (no network, no
 * Supabase — this sandbox's egress policy blocks Supabase Storage). Builds
 * watch silhouettes matching REAL case anatomy and checks the provider's
 * mask against an analytic ground-truth mask (IoU + point probes). See also
 * scripts/segment-watch-cases.realtest.ts, which runs the same provider
 * against a committed real photo for visual review.
 *
 * The shape model mirrors what the curated 3D case-only reference renders
 * (Tudor BB58 GMT / Omega Aqua Terra / Oris Big Crown) actually show:
 *
 *   case = round body (circle) + four protruding lug horns + crown,
 *   and between each lug pair the VISIBLE case boundary (the bezel's
 *   serrated ring edge) sits a few px INSIDE the silhouette's side radius —
 *   in the full photo, the strap/end-link tucks under the bezel and fills
 *   that gap, so a mask that stops at the fitted silhouette arc keeps a
 *   sliver of strap. The synthetic encodes that inset as a COLOR boundary
 *   (strap-colored pixels between the bezel edge and the silhouette radius),
 *   which is exactly what refineChannelFloor must snap to.
 *
 * Earlier generations of this test used a smooth "capsule" silhouette with
 * no true lugs, no inset, no crown — and passed while real photos failed on
 * every one of those features. Every spec here exists because a real photo
 * broke the code in that specific way.
 *
 * Usage: npx tsx scripts/segment-watch-cases.selftest.ts
 */
import sharp from 'sharp'
import { GeometricSilhouetteProvider, applyCaseMask } from '../lib/caseSegmentation'

interface Spec {
  name: string
  width: number
  height: number
  cx: number
  cy: number
  /** Case silhouette radius (widest side profile). */
  rCase: number
  /** How far INSIDE rCase the visible bezel edge sits between the lugs (the
   *  serrated-ring inset); strap-colored pixels fill the ring between them. */
  bezelInset: number
  /** Channel half-width (lug inner faces at ±channelHalf from cx). 0 = no lugs. */
  channelHalf: number
  /** Lug horn thickness beyond the channel edge. */
  lugThk: number
  /** How far the lug tips extend past the case circle's top/bottom. */
  lugTipExt: number
  /** How deep into the case circle the lug horns root. */
  lugRootDepth: number
  /** Strap half-width at the image tip and at the case (linear taper). */
  strapHalfTip: number
  strapHalfCase: number
  crown: boolean
  /** Strap fill luma. ≥150 reads as metal against the 200-luma case (weak
   *  contrast → texture-mode floor snap, like a steel bracelet); darker
   *  values read as leather/rubber (color-mode floor + strap veto). */
  strapLuma?: number
  /** TOP strap ends this many rows below the image top (deployant product
   *  shot) instead of running off the frame. */
  strapEndInset?: number
  /** Rows over which that in-frame strap end rounds off — the rounded
   *  collapse is what produced span drops big enough to beat the real lug
   *  tips (Longines fixture false tip). */
  strapEndRound?: number
  hint?: { braceletType?: string }
  expect: 'drilled' | 'ambiguous'
  minIoU?: number
  maxAmbiguousConfidence?: number
}

const CASE_LUMA = 200

interface Built {
  png: Buffer
  /** 1 = case (truth keep), 0 = not. */
  truth: Uint8Array
  tipTopY: number
  tipBottomY: number
}

function buildSynthetic(spec: Spec): Promise<Built> {
  const { width, height, cx, cy, rCase, bezelInset, channelHalf, lugThk, lugTipExt, lugRootDepth, strapHalfTip, strapHalfCase, crown, strapLuma, strapEndInset, strapEndRound } = spec
  const buf = Buffer.alloc(width * height * 4)
  const truth = new Uint8Array(width * height)

  const tipTopY = Math.round(cy - rCase - lugTipExt)
  const tipBottomY = Math.round(cy + rCase + lugTipExt)
  const rootTopY = Math.round(cy - rCase + lugRootDepth)
  const rootBottomY = Math.round(cy + rCase - lugRootDepth)

  const strapHalfAt = (y: number): number => {
    // t = 1 at the lug tips (strap at case width), 0 at the image edge
    // (strap at its far-tip width) — a bracelet flares TOWARD the case.
    const t = y < cy
      ? Math.max(0, Math.min(1, y / Math.max(1, tipTopY)))
      : Math.max(0, Math.min(1, (height - 1 - y) / Math.max(1, height - 1 - tipBottomY)))
    return strapHalfTip + (strapHalfCase - strapHalfTip) * t
  }

  // Lug horn: widest at its root row, tapering to a point at the tip row.
  const lugOuterAt = (y: number): number => {
    if (!channelHalf || !lugThk) return 0
    if (y < tipTopY || y > tipBottomY) return 0
    if (y >= rootTopY && y <= rootBottomY) return 0
    const span = y < cy ? rootTopY - tipTopY : tipBottomY - rootBottomY
    const fromTip = y < cy ? y - tipTopY : tipBottomY - y
    const t = Math.max(0, Math.min(1, fromTip / Math.max(1, span)))
    return channelHalf + lugThk * (0.25 + 0.75 * t)
  }

  const crownRx = rCase * 0.09
  const crownRy = rCase * 0.16
  const crownCx = cx + rCase + crownRx * 0.5

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.hypot(dx, dy)
      const adx = Math.abs(dx)

      const inSilhouetteCircle = dist <= rCase
      const inChannelColumns = adx <= channelHalf
      // Between the lugs, the ring between the bezel edge and the silhouette
      // radius is STRAP (end-link tucked under the bezel) — the exact sliver
      // a fitted-arc-only mask wrongly keeps.
      const inBezelRing = inSilhouetteCircle && dist > rCase - bezelInset && inChannelColumns && channelHalf > 0
      const isCaseBody = inSilhouetteCircle && !inBezelRing

      const inLug = channelHalf > 0 && adx > channelHalf && adx <= lugOuterAt(y)
      const inCrown = crown && ((x - crownCx) / crownRx) ** 2 + (dy / crownRy) ** 2 <= 1
      let strapEndFactor = 1
      if (strapEndInset && y < cy) {
        const round = strapEndRound ?? 1
        if (y < strapEndInset) strapEndFactor = 0
        else if (y < strapEndInset + round) {
          const t = (strapEndInset + round - y) / round
          strapEndFactor = Math.sqrt(Math.max(0, 1 - t * t))
        }
      }
      const inStrap = strapEndFactor > 0 && adx <= strapHalfAt(y) * strapEndFactor

      const isCase = isCaseBody || inLug || inCrown
      const opaque = isCase || inStrap || inBezelRing

      const idx = (y * width + x) * 4
      if (opaque) {
        const luma = isCase ? CASE_LUMA : (strapLuma ?? 110)
        buf[idx] = luma; buf[idx + 1] = luma; buf[idx + 2] = luma
        buf[idx + 3] = 255
        if (isCase) truth[y * width + x] = 1
      }
    }
  }
  return sharp(buf, { raw: { width, height, channels: 4 } }).png().toBuffer()
    .then(png => ({ png, truth, tipTopY, tipBottomY }))
}

const SPECS: Spec[] = [
  {
    name: 'dive watch, steel bracelet (flared end links, serrated-ring inset, texture-mode floor)',
    width: 760, height: 1100, cx: 380, cy: 550, rCase: 270, bezelInset: 8,
    channelHalf: 130, lugThk: 45, lugTipExt: 55, lugRootDepth: 150,
    strapHalfTip: 100, strapHalfCase: 129, crown: true, strapLuma: 170,
    expect: 'drilled', minIoU: 0.965,
  },
  {
    name: 'dive watch, leather strap (sharp junction, strap hint)',
    width: 760, height: 1100, cx: 380, cy: 550, rCase: 270, bezelInset: 8,
    channelHalf: 130, lugThk: 45, lugTipExt: 55, lugRootDepth: 150,
    strapHalfTip: 118, strapHalfCase: 129, crown: true,
    hint: { braceletType: 'strap' }, expect: 'drilled', minIoU: 0.965,
  },
  {
    name: 'small dress watch, slim strap, no crown bump, no bezel inset',
    width: 700, height: 1000, cx: 350, cy: 500, rCase: 225, bezelInset: 0,
    channelHalf: 100, lugThk: 34, lugTipExt: 45, lugRootDepth: 120,
    strapHalfTip: 88, strapHalfCase: 99, crown: false,
    hint: { braceletType: 'strap' }, expect: 'drilled', minIoU: 0.965,
  },
  {
    name: 'long tapered lugs (Aqua Terra style — the flat-cut killer)',
    width: 760, height: 1150, cx: 380, cy: 575, rCase: 260, bezelInset: 6,
    channelHalf: 120, lugThk: 42, lugTipExt: 85, lugRootDepth: 170,
    strapHalfTip: 105, strapHalfCase: 119, crown: true,
    hint: { braceletType: 'strap' }, expect: 'drilled', minIoU: 0.96,
  },
  {
    // The Longines fixture's false-tip bug: a strap that ends INSIDE the
    // frame (rounded deployant-shot end) collapses its span over ~30 rows —
    // drops that dwarf a softly-tapered lug tip's. The tip scan must reject
    // candidates with no persistent strap beyond them.
    name: 'strap ends inside the frame (rounded deployant-shot end)',
    width: 700, height: 1000, cx: 350, cy: 560, rCase: 225, bezelInset: 0,
    channelHalf: 100, lugThk: 34, lugTipExt: 45, lugRootDepth: 120,
    strapHalfTip: 88, strapHalfCase: 99, crown: false,
    strapEndInset: 60, strapEndRound: 36,
    hint: { braceletType: 'strap' }, expect: 'drilled', minIoU: 0.965,
  },
  {
    name: 'integrated bracelet (Royal Oak / Nautilus style — no lugs at all)',
    width: 760, height: 1100, cx: 380, cy: 550, rCase: 270, bezelInset: 0,
    channelHalf: 0, lugThk: 0, lugTipExt: 0, lugRootDepth: 0,
    strapHalfTip: 250, strapHalfCase: 256, crown: false,
    expect: 'ambiguous', maxAmbiguousConfidence: 0.6,
  },
  {
    name: 'near-integrated wide bracelet (borderline — must stay in escalation zone)',
    width: 760, height: 1100, cx: 380, cy: 550, rCase: 270, bezelInset: 0,
    channelHalf: 0, lugThk: 0, lugTipExt: 0, lugRootDepth: 0,
    strapHalfTip: 200, strapHalfCase: 225, crown: false,
    expect: 'ambiguous', maxAmbiguousConfidence: 0.65,
  },
]

function iou(outAlpha: (x: number, y: number) => number, truth: Uint8Array, width: number, height: number): number {
  let inter = 0
  let union = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const kept = outAlpha(x, y) > 127
      const isCase = truth[y * width + x] === 1
      if (kept && isCase) inter += 1
      if (kept || isCase) union += 1
    }
  }
  return union === 0 ? 1 : inter / union
}

async function run() {
  const provider = new GeometricSilhouetteProvider()
  let pass = 0
  let fail = 0

  for (const spec of SPECS) {
    const { png, truth, tipTopY, tipBottomY } = await buildSynthetic(spec)
    const result = await provider.segmentCase(png, spec.hint)

    let ok = true
    const notes: string[] = []

    if (spec.expect === 'drilled') {
      const masked = await applyCaseMask(png, result.caseMask)
      const { data: outData, info } = await sharp(masked).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const alphaAt = (x: number, y: number) => outData[(y * info.width + x) * 4 + 3]

      const score = iou(alphaAt, truth, spec.width, spec.height)
      const minIoU = spec.minIoU ?? 0.95
      if (score < minIoU) { ok = false; notes.push(`IoU ${score.toFixed(3)} < ${minIoU}`) }

      // Point probes — each encodes a specific real-photo failure:
      const probes: Array<[number, number, 'keep' | 'drop', string]> = [
        // Lug tips survive (the flat-cut bug).
        [spec.cx + spec.channelHalf + 8, tipTopY + 10, 'keep', 'top-right lug tip'],
        [spec.cx - spec.channelHalf - 8, tipBottomY - 10, 'keep', 'bottom-left lug tip'],
        // Nothing above/below the tips (floating bracelet fragments bug).
        [spec.cx, tipTopY - 8, 'drop', 'strap above top lug tips'],
        [spec.cx, tipBottomY + 8, 'drop', 'strap below bottom lug tips'],
        // The channel floor follows the case's CURVE (straight-cut bug):
        // just outside the bezel edge at centre = strap; just inside = case.
        [spec.cx, Math.round(spec.cy - spec.rCase + spec.bezelInset + 4), 'keep', 'case just inside bezel edge (centre)'],
        [spec.cx, Math.round(spec.cy - spec.rCase - 4), 'drop', 'strap just outside silhouette arc (centre)'],
        // Mid-channel column, above the arc but below the tips — strap fill.
        [spec.cx + Math.round(spec.channelHalf * 0.6), Math.round(spec.cy - spec.rCase - 12), 'drop', 'strap fill off-centre in channel'],
      ]
      // The serrated-ring inset (end-link tucked under the bezel): pixels in
      // the ring between bezel edge and silhouette radius are strap and must
      // be dropped — a fitted-arc-only mask keeps them.
      if (spec.bezelInset >= 6) {
        probes.push([spec.cx, Math.round(spec.cy - spec.rCase + Math.ceil(spec.bezelInset / 2)), 'drop', 'end-link sliver inside silhouette radius (bezel inset)'])
      }
      if (spec.crown) {
        probes.push([Math.round(spec.cx + spec.rCase + spec.rCase * 0.05), spec.cy, 'keep', 'crown'])
      }
      for (const [x, y, want, label] of probes) {
        const a = alphaAt(x, y)
        if (want === 'keep' && a < 200) { ok = false; notes.push(`${label}: removed (alpha=${a})`) }
        if (want === 'drop' && a > 60) { ok = false; notes.push(`${label}: kept (alpha=${a})`) }
      }

      if (result.confidence < 0.6) { ok = false; notes.push(`confidence too low: ${result.confidence.toFixed(2)}`) }
      if (result.strapAttachment !== 'drilled_lug') { ok = false; notes.push(`strapAttachment=${result.strapAttachment}`) }
      notes.unshift(`IoU=${score.toFixed(3)}`)
    } else {
      const cap = spec.maxAmbiguousConfidence ?? 0.55
      if (result.confidence > cap) { ok = false; notes.push(`confidence too high for ambiguous case: ${result.confidence.toFixed(2)} > ${cap}`) }
      if (result.confidence >= 0.7) { ok = false; notes.push('would skip escalation entirely') }
    }

    if (ok) pass += 1
    else fail += 1
    console.log(`${ok ? '✓' : '✗'} ${spec.name}`)
    console.log(`   confidence=${result.confidence.toFixed(2)} attachment=${result.strapAttachment} shape=${result.caseShape ?? '—'}` +
      (result.lugGeometry ? ` tips=${result.lugGeometry.topLugLeft.y}/${result.lugGeometry.bottomLugLeft.y} channelPx=${result.lugGeometry.lugWidthPx}` : ''))
    if (notes.length) console.log(`   ${notes.join(' | ')}`)
  }

  console.log(`\n${pass} passed, ${fail} failed`)
  if (fail > 0) process.exit(1)
}

void run()
