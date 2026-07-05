/**
 * Real-photo smoke test for the case segmentation providers — complements
 * scripts/segment-watch-cases.selftest.ts, which only exercises synthetic
 * silhouettes. There's no exact analytic ground truth for a real photo (that
 * would need a human-verified lug-point annotation, exactly what
 * /admin/image-review → Case Segmentation is for), so this script doesn't
 * assert exact pixel positions — it runs the geometric provider against each
 * committed fixture (test-fixtures/case-segmentation/), sanity-checks the
 * output shape, and writes annotated + case-only PNGs to
 * test-fixtures/case-segmentation/output/ (gitignored) for visual review.
 *
 * Usage: npx tsx scripts/segment-watch-cases.realtest.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { GeometricSilhouetteProvider, applyCaseMask } from '../lib/caseSegmentation'
import { repoRoot } from './watch-image-pipeline'

const FIXTURES_DIR = path.join(repoRoot, 'test-fixtures', 'case-segmentation')
const OUTPUT_DIR = path.join(FIXTURES_DIR, 'output')

const FIXTURES: Array<{ file: string; hint?: { braceletType?: string } }> = [
  // hint left unset — matches the catalog's real convention where a plain
  // metal bracelet is usually an unset bracelet_type, not an explicit tag.
  { file: 'tudor-bb58-gmt-pepsi.webp' },
  // Color-mode strap watch: navy alligator against a steel case, chrono
  // pushers + crown for the body fit to reject, and a top strap WIDER than
  // the lug span (tips only found because the scan is confined beyond the
  // case cap). Exercises the color-driven channel floor + strap veto.
  { file: 'iwc-portugieser-chrono-navy-strap.webp', hint: { braceletType: 'strap' } },
  // Rectangular case (rounded-rect model): straight brancard sides, strap
  // ROLLING OVER the flat top edge (~39 rows past the corner row) while the
  // bottom rail sits ~55 rows inside it (asymmetric window), a navy strap
  // over a BLUE dial (why the veto margin must stay clear of the dial), and
  // a blue-cabochon crown kept by the beyond-the-sides rule.
  { file: 'cartier-tank-mc-navy-strap.webp', hint: { braceletType: 'strap' } },
]

async function main(): Promise<void> {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const provider = new GeometricSilhouetteProvider()
  let ok = 0
  let fail = 0

  for (const fx of FIXTURES) {
    const srcPath = path.join(FIXTURES_DIR, fx.file)
    if (!fs.existsSync(srcPath)) {
      console.warn(`✗ ${fx.file}: fixture not found`)
      fail += 1
      continue
    }
    const srcBuf = fs.readFileSync(srcPath)
    const meta = await sharp(srcBuf).ensureAlpha().metadata()

    // Sanity: this provider assumes a genuinely transparent background, not
    // just an alpha channel that happens to be all-opaque.
    const { data, info } = await sharp(srcBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    let transparentPixels = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] < 10) transparentPixels += 1
    const transparentFrac = transparentPixels / (info.width * info.height)
    if (transparentFrac < 0.05) {
      console.warn(`✗ ${fx.file}: background doesn't look transparent (${(transparentFrac * 100).toFixed(1)}% transparent px) — run background removal first`)
      fail += 1
      continue
    }

    const result = await provider.segmentCase(srcBuf, fx.hint)
    const geom = result.lugGeometry
    let rowOk = true
    const notes: string[] = []
    if (!geom) { rowOk = false; notes.push('no lug geometry returned') }
    else {
      if (geom.topLugLeft.y >= geom.bottomLugLeft.y) { rowOk = false; notes.push('topCut is not above bottomCut') }
      if (geom.topLugLeft.y < 0 || geom.bottomLugLeft.y > meta.height!) { rowOk = false; notes.push('cut rows out of image bounds') }
      if (geom.lugWidthPx <= 0 || geom.lugWidthPx >= meta.width!) { rowOk = false; notes.push(`implausible lugWidthPx=${geom.lugWidthPx}`) }
    }

    // Structural invariants (the "lugs never have holes" rule, caught on the
    // Cartier fixture): the kept case must be ONE solid component — ≥99.5%
    // of kept pixels in the largest component (no floating strap bits), and
    // zero enclosed holes (no gouges carved out of solid metal).
    let masked: Buffer | null = null
    if (geom) {
      masked = await applyCaseMask(srcBuf, result.caseMask)
      const { data: out, info: oi } = await sharp(masked).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const W = oi.width
      const N = W * oi.height
      const keptAt = (i: number) => out[i * 4 + 3] > 127
      const seen = new Uint8Array(N)
      const stack: number[] = []
      let totalKept = 0
      let largest = 0
      for (let i = 0; i < N; i += 1) if (keptAt(i)) totalKept += 1
      for (let i = 0; i < N; i += 1) {
        if (seen[i] || !keptAt(i)) continue
        let size = 0
        seen[i] = 1
        stack.push(i)
        while (stack.length) {
          const p = stack.pop()!
          size += 1
          const px = p % W
          for (const q of [px > 0 ? p - 1 : -1, px < W - 1 ? p + 1 : -1, p >= W ? p - W : -1, p < N - W ? p + W : -1]) {
            if (q >= 0 && !seen[q] && keptAt(q)) { seen[q] = 1; stack.push(q) }
          }
        }
        if (size > largest) largest = size
      }
      if (totalKept > 0 && largest / totalKept < 0.995) {
        rowOk = false
        notes.push(`floating fragments: largest component ${(100 * largest / totalKept).toFixed(2)}% of kept`)
      }
      // Enclosed holes: flood non-kept from the border; unreached non-kept
      // pixels that are opaque in the SOURCE are holes in the case.
      const outSeen = new Uint8Array(N)
      for (let x = 0; x < W; x += 1) for (const i of [x, N - W + x]) if (!keptAt(i) && !outSeen[i]) { outSeen[i] = 1; stack.push(i) }
      for (let y = 0; y < oi.height; y += 1) for (const i of [y * W, y * W + W - 1]) if (!keptAt(i) && !outSeen[i]) { outSeen[i] = 1; stack.push(i) }
      while (stack.length) {
        const p = stack.pop()!
        const px = p % W
        for (const q of [px > 0 ? p - 1 : -1, px < W - 1 ? p + 1 : -1, p >= W ? p - W : -1, p < N - W ? p + W : -1]) {
          if (q >= 0 && !outSeen[q] && !keptAt(q)) { outSeen[q] = 1; stack.push(q) }
        }
      }
      // Only count pixels the MASK removed (source solid, output cut) — the
      // source's own anti-aliased crevices (e.g. between a serrated bezel's
      // teeth, alpha 60-127) are not mask damage.
      let holePx = 0
      for (let i = 0; i < N; i += 1) {
        if (!keptAt(i) && !outSeen[i] && data[i * 4 + 3] > 127 && out[i * 4 + 3] < data[i * 4 + 3] / 2) holePx += 1
      }
      if (holePx > 12) { rowOk = false; notes.push(`enclosed holes carved by the mask: ${holePx}px`) }
    }

    if (rowOk) ok += 1; else fail += 1
    console.log(`${rowOk ? '✓' : '✗'} ${fx.file}`)
    console.log(`   confidence=${result.confidence.toFixed(2)} strapAttachment=${result.strapAttachment}` +
      (geom ? ` topCut=${geom.topLugLeft.y} bottomCut=${geom.bottomLugLeft.y} lugWidthPx=${geom.lugWidthPx}` : ''))
    if (notes.length) console.log(`   ${notes.join(' | ')}`)

    if (geom && masked) {
      const stem = fx.file.replace(/\.[^.]+$/, '')
      await sharp(masked).png().toFile(path.join(OUTPUT_DIR, `${stem}-case-only.png`))
      const svg = `<svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="${geom.topLugLeft.y - 1}" width="${meta.width}" height="3" fill="red" />
        <rect x="0" y="${geom.bottomLugLeft.y - 1}" width="${meta.width}" height="3" fill="red" />
      </svg>`
      await sharp(srcBuf).ensureAlpha().composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png()
        .toFile(path.join(OUTPUT_DIR, `${stem}-annotated.png`))
    }
  }

  console.log(`\n${ok} ok, ${fail} failed. Review output images in test-fixtures/case-segmentation/output/`)
  if (fail > 0) process.exit(1)
}

void main()
