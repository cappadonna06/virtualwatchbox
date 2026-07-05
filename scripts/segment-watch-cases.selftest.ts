/**
 * Synthetic self-test for GeometricSilhouetteProvider (no network, no
 * Supabase, no real catalog photos required — this sandbox's egress policy
 * blocks Supabase Storage, so this is how the width-profile algorithm gets
 * validated before a real batch run). Builds "watch-shaped" RGBA silhouettes
 * with known ground-truth case boundaries and checks the detector recovers
 * them within tolerance.
 *
 * Shape model: a "capsule" case — a flat-sided body (constant width, like a
 * bezel) capped by a short elliptical taper at top/bottom (like the lug
 * horns), fused with a narrower strap band that's contiguous with the case
 * (no free transparent gap — the strap plugs directly into the case exactly
 * like a real product photo). This is a much closer proxy to a real watch
 * than a pure ellipse: real cases stay near full width almost to the lug
 * tips, then taper sharply over a short span, rather than tapering gradually
 * across the whole case radius.
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
  /** Height of the elliptical lug-taper cap beyond the flat body. */
  capHeight: number
  strapWidth: number
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
// elliptical lug taper) equals the strap's half-width.
function trueTransitionRows(spec: Spec): { top: number; bottom: number } | null {
  const k = (spec.strapWidth / 2) / spec.caseRadiusX
  if (k >= 1) return null // strap as wide as the case — no real transition exists
  const dCap = Math.sqrt(1 - k * k)
  const offset = spec.flatHalfHeight + spec.capHeight * dCap
  return { top: spec.caseCenterY - offset, bottom: spec.caseCenterY + offset }
}

const SPECS: Spec[] = [
  {
    name: 'round case, drilled-lug strap (typical dive/dress watch)',
    width: 800, height: 900, caseCenterY: 450, caseRadiusX: 300, flatHalfHeight: 260, capHeight: 70,
    strapWidth: 140, expectSharp: true, cutToleranceRatio: 0.035,
  },
  {
    name: 'round case, wide oyster bracelet (still drilled-lug)',
    width: 800, height: 900, caseCenterY: 450, caseRadiusX: 300, flatHalfHeight: 260, capHeight: 70,
    strapWidth: 220, expectSharp: true, cutToleranceRatio: 0.045,
  },
  {
    name: 'small dress case, slim NATO-ish strap',
    width: 700, height: 900, caseCenterY: 460, caseRadiusX: 230, flatHalfHeight: 200, capHeight: 55,
    strapWidth: 90, expectSharp: true, cutToleranceRatio: 0.04,
  },
  {
    name: 'chunky sports case, thick short lug taper',
    width: 800, height: 900, caseCenterY: 450, caseRadiusX: 320, flatHalfHeight: 300, capHeight: 40,
    strapWidth: 200, expectSharp: true, cutToleranceRatio: 0.045,
  },
  {
    name: 'integrated bracelet (Royal Oak / Nautilus style — no sharp transition)',
    width: 800, height: 900, caseCenterY: 450, caseRadiusX: 300, flatHalfHeight: 260, capHeight: 70,
    strapWidth: 560, expectSharp: false, cutToleranceRatio: 1,
  },
  {
    name: 'near-integrated chunky sports bracelet (borderline)',
    width: 800, height: 900, caseCenterY: 450, caseRadiusX: 300, flatHalfHeight: 260, capHeight: 70,
    strapWidth: 440, expectSharp: false, cutToleranceRatio: 1, maxAmbiguousConfidence: 0.55,
  },
]

async function run() {
  const provider = new GeometricSilhouetteProvider()
  let pass = 0
  let fail = 0

  for (const spec of SPECS) {
    const png = await sharp(buildSynthetic(spec), { raw: { width: spec.width, height: spec.height, channels: 4 } }).png().toBuffer()
    const result = await provider.segmentCase(png)
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
      if (result.confidence < 0.6) { ok = false; notes.push(`confidence too low: ${result.confidence.toFixed(2)} (expected >= 0.6)`) }
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
