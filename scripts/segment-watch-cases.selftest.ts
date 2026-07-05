/**
 * Synthetic self-test for GeometricSilhouetteProvider (no network, no
 * Supabase — this sandbox's egress policy blocks Supabase Storage). Builds
 * "watch-shaped" RGBA silhouettes with known ground-truth case boundaries and
 * checks the detector recovers them within tolerance. See also
 * scripts/segment-watch-cases.realtest.ts, which runs the same provider
 * against a committed real photo for visual (not exact-position) review.
 *
 * Shape model: a "capsule" case — a flat-sided body (constant width, like a
 * bezel) capped by an elliptical taper at top/bottom, fused with a narrower
 * strap band that's contiguous with the case (no free transparent gap — the
 * strap plugs directly into the case exactly like a real product photo).
 *
 * Two families, with deliberately different cap heights — this split exists
 * because a real test photo (a Tudor Black Bay GMT on a steel oyster
 * bracelet, see the realtest script) revealed the two attachment types
 * genuinely have different transition physics: a two-piece leather/rubber
 * strap meets the case in a short, sharp junction, but a metal bracelet's
 * end-links flare gradually across several links before reaching the lugs.
 * GeometricSilhouetteProvider now takes a `hint.braceletType` and widens its
 * detection window accordingly — these specs exercise both paths.
 *   - STRAP specs: short cap (~8% of case height), hint braceletType='strap'.
 *   - BRACELET specs: long cap (~25-30% of case height), hint unset (the
 *     catalog's real convention: unset bracelet_type predominantly means
 *     "plain metal bracelet", not "unknown" — see catalog-live-imaged.json).
 *
 * Usage: npx tsx scripts/segment-watch-cases.selftest.ts
 */
import sharp from 'sharp'
import { GeometricSilhouetteProvider, applyCaseMask, alphaBoundsRows, computeWidthProfile, detectCaseBand } from '../lib/caseSegmentation'

interface Spec {
  name: string
  width: number
  height: number
  caseCenterY: number
  caseRadiusX: number
  /** Half-height of the constant-width body (bezel), before the lug taper starts. */
  flatHalfHeight: number
  /** Height of the elliptical taper cap beyond the flat body. */
  capHeight: number
  strapWidth: number
  hint?: { braceletType?: string }
  expectSharp: boolean
  cutToleranceRatio: number // fraction of height allowed as error, only checked when expectSharp
  /** For !expectSharp specs: confidence must stay at/under this — deliberately
   *  loose for a "borderline" spec, where the correct system behavior is
   *  landing in the escalation/review zone rather than confidently classified
   *  either way. */
  maxAmbiguousConfidence?: number
}

function halfWidthAt(spec: Spec, y: number): number {
  const dCenter = Math.abs(y - spec.caseCenterY)
  if (dCenter <= spec.flatHalfHeight) return spec.caseRadiusX
  const dCap = (dCenter - spec.flatHalfHeight) / spec.capHeight
  if (dCap >= 1) return 0
  return spec.caseRadiusX * Math.sqrt(1 - dCap * dCap)
}

function buildSynthetic(spec: Spec): Buffer {
  const { width, height, strapWidth } = spec
  const cx = width / 2
  const buf = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    const caseHalfW = halfWidthAt(spec, y)
    const halfW = Math.max(caseHalfW, strapWidth / 2)
    const left = Math.round(cx - halfW)
    const right = Math.round(cx + halfW)
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4
      buf[idx] = 40
      buf[idx + 1] = 40
      buf[idx + 2] = 40
      buf[idx + 3] = x >= left && x <= right ? 255 : 0
    }
  }
  return buf
}

// Analytic ground truth: the row where the case's own half-width (flat body +
// elliptical taper) equals the strap's half-width.
function trueTransitionRows(spec: Spec): { top: number; bottom: number } | null {
  const k = (spec.strapWidth / 2) / spec.caseRadiusX
  if (k >= 1) return null // strap as wide as the case — no real transition exists
  const dCap = Math.sqrt(1 - k * k)
  const offset = spec.flatHalfHeight + spec.capHeight * dCap
  return { top: spec.caseCenterY - offset, bottom: spec.caseCenterY + offset }
}

const SPECS: Spec[] = [
  {
    name: 'round case, drilled-lug leather strap',
    width: 800, height: 900, caseCenterY: 450, caseRadiusX: 300, flatHalfHeight: 260, capHeight: 70,
    strapWidth: 140, hint: { braceletType: 'strap' }, expectSharp: true, cutToleranceRatio: 0.035,
  },
  {
    name: 'small dress case, slim NATO-ish strap',
    width: 700, height: 900, caseCenterY: 460, caseRadiusX: 230, flatHalfHeight: 200, capHeight: 55,
    strapWidth: 90, hint: { braceletType: 'strap' }, expectSharp: true, cutToleranceRatio: 0.04,
  },
  {
    name: 'chunky sports case, thick rubber strap',
    width: 800, height: 900, caseCenterY: 450, caseRadiusX: 320, flatHalfHeight: 300, capHeight: 40,
    strapWidth: 200, hint: { braceletType: 'strap' }, expectSharp: true, cutToleranceRatio: 0.045,
  },
  {
    name: 'round case, steel oyster bracelet (gradual multi-link flare)',
    width: 800, height: 900, caseCenterY: 450, caseRadiusX: 300, flatHalfHeight: 210, capHeight: 220,
    strapWidth: 230, hint: undefined, expectSharp: true, cutToleranceRatio: 0.09,
  },
  {
    name: 'round case, jubilee-style bracelet (gradual, narrower)',
    width: 800, height: 900, caseCenterY: 450, caseRadiusX: 300, flatHalfHeight: 220, capHeight: 200,
    strapWidth: 180, hint: undefined, expectSharp: true, cutToleranceRatio: 0.09,
  },
  {
    name: 'integrated bracelet (Royal Oak / Nautilus style — no sharp transition)',
    width: 800, height: 900, caseCenterY: 450, caseRadiusX: 300, flatHalfHeight: 260, capHeight: 70,
    strapWidth: 560, hint: undefined, expectSharp: false, cutToleranceRatio: 1,
  },
  {
    name: 'near-integrated chunky sports bracelet (borderline)',
    width: 800, height: 900, caseCenterY: 450, caseRadiusX: 300, flatHalfHeight: 260, capHeight: 70,
    strapWidth: 440, hint: undefined, expectSharp: false, cutToleranceRatio: 1, maxAmbiguousConfidence: 0.6,
  },
]

async function run() {
  const provider = new GeometricSilhouetteProvider()
  let pass = 0
  let fail = 0

  for (const spec of SPECS) {
    const png = await sharp(buildSynthetic(spec), { raw: { width: spec.width, height: spec.height, channels: 4 } }).png().toBuffer()
    const result = await provider.segmentCase(png, spec.hint)
    const truth = trueTransitionRows(spec)

    let ok = true
    const notes: string[] = []

    if (spec.expectSharp) {
      if (!truth) { ok = false; notes.push('spec error: no analytic transition for an expectSharp case') }
      else {
        const tolPx = spec.height * spec.cutToleranceRatio
        const topErr = Math.abs((result.lugGeometry?.topLugLeft.y ?? -9999) - truth.top)
        const botErr = Math.abs((result.lugGeometry?.bottomLugLeft.y ?? -9999) - truth.bottom)
        if (topErr > tolPx) { ok = false; notes.push(`top cut off by ${topErr.toFixed(1)}px (tol ${tolPx.toFixed(1)})`) }
        if (botErr > tolPx) { ok = false; notes.push(`bottom cut off by ${botErr.toFixed(1)}px (tol ${tolPx.toFixed(1)})`) }
      }
      if (result.confidence < 0.55) { ok = false; notes.push(`confidence too low: ${result.confidence.toFixed(2)} (expected >= 0.55)`) }
      if (result.strapAttachment !== 'drilled_lug') { ok = false; notes.push(`strapAttachment=${result.strapAttachment}, expected drilled_lug`) }
    } else {
      const cap = spec.maxAmbiguousConfidence ?? 0.45
      if (result.confidence > cap) { ok = false; notes.push(`confidence too high for an ambiguous case: ${result.confidence.toFixed(2)} (expected <= ${cap})`) }
      // Whether "borderline" or clearly integrated, this must stay below the
      // orchestrator's escalation threshold so the real pipeline always
      // routes it to Claude vision (or needs_review) rather than trusting it.
      if (result.confidence >= 0.7) { ok = false; notes.push(`confidence ${result.confidence.toFixed(2)} would skip escalation entirely`) }
    }

    if (ok) pass += 1
    else fail += 1
    console.log(`${ok ? '✓' : '✗'} ${spec.name}`)
    console.log(`   confidence=${result.confidence.toFixed(2)} strapAttachment=${result.strapAttachment}` +
      (result.lugGeometry ? ` topCut=${result.lugGeometry.topLugLeft.y} bottomCut=${result.lugGeometry.bottomLugLeft.y} lugWidthPx=${result.lugGeometry.lugWidthPx}` : ''))
    if (truth) console.log(`   ground truth: top=${truth.top.toFixed(1)} bottom=${truth.bottom.toFixed(1)}`)
    if (notes.length) console.log(`   ${notes.join(' | ')}`)
  }

  console.log(`\n${pass} passed, ${fail} failed`)

  const bladeOk = await runBladeLugTest()
  console.log(bladeOk ? '\nBlade-lug regression test passed' : '\nBlade-lug regression test FAILED')

  if (fail > 0 || !bladeOk) process.exit(1)
}

// ── Protruding blade-lug regression test ─────────────────────────────────────
//
// None of the capsule specs above have a real "lug" — their case is one
// smooth taper, no separate feature sticking out further than the case's own
// body. That's exactly why the flat row-cut bug (reported against a real
// Omega Aqua Terra photo: long angled lug blades sliced into flat stubs)
// slipped past every capsule spec. This models the real failure mode
// directly: a round case (simple circle) PLUS two triangular lug blades that
// extend well past the circle's own edge, angled down toward the strap —
// checking that the lug tip survives even though it reaches deeper into
// "strap territory" than any single flat cut could safely allow.
function pointInTriangle(
  px: number, py: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number,
): boolean {
  const sign = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) =>
    (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3)
  const d1 = sign(px, py, ax, ay, bx, by)
  const d2 = sign(px, py, bx, by, cx, cy)
  const d3 = sign(px, py, cx, cy, ax, ay)
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

async function runBladeLugTest(): Promise<boolean> {
  const width = 800
  const height = 1000
  const cx = width / 2
  const caseCenterY = 500
  const caseRadius = 300
  const strapHalfWidth = 70
  const lugOuterOffset = 200 // lug's outer edge, past the strap's half-width
  const lugLength = 130      // how far the lug tip reaches beyond the case circle's own edge
  // A real drilled lug is WIDEST where it joins the case and TAPERS TO A POINT
  // further away from the case (toward the strap direction) — i.e. for the
  // top lugs, the tip has a SMALLER y than the base (closer to the image's
  // top edge), not larger. Getting this backwards was the first draft's bug:
  // it built a lug that pointed INTO the case, which the algorithm handles
  // trivially (that region is already inside the confident plateau) and
  // never exercised the actual fix.
  const baseY = caseCenterY - caseRadius * 0.75 // wide end, inside the circle
  const tipY = baseY - lugLength                // narrow end, beyond the circle's own top edge

  const rTopA = { x: cx + strapHalfWidth, y: baseY }
  const rTopB = { x: cx + strapHalfWidth + lugOuterOffset, y: baseY }
  const rTopC = { x: cx + strapHalfWidth + lugOuterOffset * 0.3, y: tipY } // apex — the tip a flat cut would chop
  const lTopA = { x: cx - strapHalfWidth, y: baseY }
  const lTopB = { x: cx - strapHalfWidth - lugOuterOffset, y: baseY }
  const lTopC = { x: cx - strapHalfWidth - lugOuterOffset * 0.3, y: tipY }

  const botBaseY = height - 1 - baseY
  const botTipY = height - 1 - tipY
  const rBotA = { x: rTopA.x, y: botBaseY }
  const rBotB = { x: rTopB.x, y: botBaseY }
  const rBotC = { x: rTopC.x, y: botTipY }
  const lBotA = { x: lTopA.x, y: botBaseY }
  const lBotB = { x: lTopB.x, y: botBaseY }
  const lBotC = { x: lTopC.x, y: botTipY }

  const buf = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - cx
      const dy = y - caseCenterY
      const inCase = dx * dx + dy * dy <= caseRadius * caseRadius
      const inStrap = Math.abs(dx) <= strapHalfWidth
      const inRTop = pointInTriangle(x, y, rTopA.x, rTopA.y, rTopB.x, rTopB.y, rTopC.x, rTopC.y)
      const inLTop = pointInTriangle(x, y, lTopA.x, lTopA.y, lTopB.x, lTopB.y, lTopC.x, lTopC.y)
      const inRBot = pointInTriangle(x, y, rBotA.x, rBotA.y, rBotB.x, rBotB.y, rBotC.x, rBotC.y)
      const inLBot = pointInTriangle(x, y, lBotA.x, lBotA.y, lBotB.x, lBotB.y, lBotC.x, lBotC.y)
      const opaque = inCase || inStrap || inRTop || inLTop || inRBot || inLBot
      const idx = (y * width + x) * 4
      buf[idx] = 180; buf[idx + 1] = 180; buf[idx + 2] = 185
      buf[idx + 3] = opaque ? 255 : 0
    }
  }
  const srcPng = await sharp(buf, { raw: { width, height, channels: 4 } }).png().toBuffer()

  const provider = new GeometricSilhouetteProvider()
  const result = await provider.segmentCase(srcPng, { braceletType: 'strap' })
  const masked = await applyCaseMask(srcPng, result.caseMask)
  const { data: outData, info } = await sharp(masked).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const alphaAt = (x: number, y: number) => outData[(Math.round(y) * info.width + Math.round(x)) * 4 + 3]

  let ok = true
  const notes: string[] = []

  // The lug tip — a few px back toward the base from the apex, so the sample
  // point is safely inside the (very narrow, near-zero-width-at-the-point)
  // triangle rather than right on its boundary — must survive in the output.
  // That's the whole point of the fix.
  const tipCheckPoints: Array<[number, number, string]> = [
    [rTopC.x, rTopC.y + 8, 'top-right lug tip'],
    [lTopC.x, lTopC.y + 8, 'top-left lug tip'],
    [rBotC.x, rBotC.y - 8, 'bottom-right lug tip'],
    [lBotC.x, lBotC.y - 8, 'bottom-left lug tip'],
  ]
  for (const [x, y, label] of tipCheckPoints) {
    const a = alphaAt(x, y)
    if (a < 200) { ok = false; notes.push(`${label} was removed (alpha=${a}) — lug got chopped`) }
  }

  // The strap, filling the gap BETWEEN the lugs at a row PAST the lug tips
  // (further from the case than either tip reaches), must still be removed —
  // the other half of the fix: not just "keep everything," but correctly
  // distinguish lug-material from strap-fill at the same row.
  const gapCheckPoints: Array<[number, number, string]> = [
    [cx, tipY - 15, 'strap fill above the top lug tips'],
    [cx, botTipY + 15, 'strap fill below the bottom lug tips'],
  ]
  for (const [x, y, label] of gapCheckPoints) {
    const a = alphaAt(x, y)
    if (a > 60) { ok = false; notes.push(`${label} was kept (alpha=${a}) — strap remnant left behind`) }
  }

  // Sanity: confirm the OLD flat-cut approach really would have failed this —
  // otherwise this test isn't exercising the bug it claims to. Old topCut is
  // a row deep inside the case (larger y than the tip); if it isn't, this
  // synthetic scenario isn't actually reaching past where a flat cut would.
  const { data: rawData } = await sharp(srcPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { top, bottom } = alphaBoundsRows(rawData, width, height)
  const profile = computeWidthProfile(rawData, width, top, bottom)
  const oldBand = detectCaseBand(profile, 0.035)
  const oldTopCut = top + oldBand.topIdx + 2
  if (oldTopCut <= tipY) {
    notes.push(`(note: old flat-cut topCut=${oldTopCut} would not actually have reached the lug tip at y=${tipY} — regression scenario may be too weak)`)
  }

  console.log(`  confidence=${result.confidence.toFixed(2)} strapAttachment=${result.strapAttachment}`)
  if (notes.length) console.log(`  ${notes.join(' | ')}`)
  return ok
}

void run()
