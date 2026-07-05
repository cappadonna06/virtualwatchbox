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
import { GeometricSilhouetteProvider } from '../lib/caseSegmentation'

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
  if (fail > 0) process.exit(1)
}

void run()
