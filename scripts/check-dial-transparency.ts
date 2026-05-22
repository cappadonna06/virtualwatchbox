/**
 * Scan processed PNGs for true "dial transparency" — interior pixels that are
 * sub-opaque, which on a dark page background bleed through visibly.
 *
 * Anti-aliased silhouette edges naturally have α between 0-255, so we need to
 * distinguish "edge feathering" from "interior holes":
 *
 *   1. Decode raw RGBA.
 *   2. Build opaque mask (α >= 250).
 *   3. Flood-fill from the image border across α<250 pixels to mark "exterior".
 *      Anti-aliased edges (α between 8 and 250) are connected to the exterior
 *      via the BFS — so they end up classified as exterior. True interior
 *      holes are isolated from the exterior by a ring of fully-opaque pixels
 *      and stay non-exterior.
 *   4. Count non-exterior pixels with α < 250 as interior holes.
 *
 * This isolates real dial transparency from natural silhouette feathering.
 *
 *   npx tsx scripts/check-dial-transparency.ts
 *   npx tsx scripts/check-dial-transparency.ts --limit 50
 *   npx tsx scripts/check-dial-transparency.ts --glob 'patek-*'
 *   npx tsx scripts/check-dial-transparency.ts --file patek-philippe-6119r-001
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(__dirname, '..', 'public', 'watch-assets', 'processed')
const OPAQUE_THRESHOLD = 250

function parseArg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  if (i < 0) return null
  return process.argv[i + 1] ?? null
}

async function scanOne(file: string) {
  const buf = fs.readFileSync(file)
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  // Flood-fill the exterior: every pixel with α<250 reachable from the image
  // border via other α<250 pixels. This sweeps in anti-aliased silhouette
  // edges (which fan in from the border) but leaves true interior holes — the
  // ones surrounded by fully-opaque pixels — unmarked.
  const exterior = new Uint8Array(width * height)
  const queue: number[] = []
  const seed = (x: number, y: number) => {
    const i = y * width + x
    if (exterior[i]) return
    if (data[i * 4 + 3] < OPAQUE_THRESHOLD) {
      exterior[i] = 1
      queue.push(i)
    }
  }
  for (let x = 0; x < width; x += 1) { seed(x, 0); seed(x, height - 1) }
  for (let y = 1; y < height - 1; y += 1) { seed(0, y); seed(width - 1, y) }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const i = queue[cursor]
    const x = i % width
    const y = (i / width) | 0
    const visit = (ni: number) => {
      if (exterior[ni]) return
      if (data[ni * 4 + 3] < OPAQUE_THRESHOLD) { exterior[ni] = 1; queue.push(ni) }
    }
    if (x > 0) visit(i - 1)
    if (x < width - 1) visit(i + 1)
    if (y > 0) visit(i - width)
    if (y < height - 1) visit(i + width)
  }

  let holePixels = 0
  let holeSumGap = 0
  let holeMaxGap = 0
  let opaquePixels = 0
  for (let i = 0; i < width * height; i += 1) {
    const a = data[i * 4 + 3]
    if (a >= OPAQUE_THRESHOLD) { opaquePixels += 1; continue }
    if (exterior[i]) continue
    holePixels += 1
    const gap = 255 - a
    holeSumGap += gap
    if (gap > holeMaxGap) holeMaxGap = gap
  }
  return {
    file: path.basename(file),
    width,
    height,
    holePixels,
    opaquePixels,
    holeMaxGap,
    avgHoleGap: holePixels ? holeSumGap / holePixels : 0,
    holeRatio: opaquePixels ? holePixels / opaquePixels : 0,
  }
}

async function emitHoleMap(file: string, outPath: string) {
  const buf = fs.readFileSync(file)
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const exterior = new Uint8Array(width * height)
  const queue: number[] = []
  const seed = (x: number, y: number) => {
    const i = y * width + x
    if (exterior[i]) return
    if (data[i * 4 + 3] < OPAQUE_THRESHOLD) { exterior[i] = 1; queue.push(i) }
  }
  for (let x = 0; x < width; x += 1) { seed(x, 0); seed(x, height - 1) }
  for (let y = 1; y < height - 1; y += 1) { seed(0, y); seed(width - 1, y) }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const i = queue[cursor]
    const x = i % width
    const y = (i / width) | 0
    const visit = (ni: number) => {
      if (exterior[ni]) return
      if (data[ni * 4 + 3] < OPAQUE_THRESHOLD) { exterior[ni] = 1; queue.push(ni) }
    }
    if (x > 0) visit(i - 1)
    if (x < width - 1) visit(i + 1)
    if (y > 0) visit(i - width)
    if (y < height - 1) visit(i + width)
  }

  // Composite: red where interior hole, gray otherwise (alpha-weighted source).
  const composite = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i += 1) {
    const a = data[i * 4 + 3]
    const o = i * 4
    if (a < OPAQUE_THRESHOLD && !exterior[i]) {
      composite[o] = 255; composite[o + 1] = 60; composite[o + 2] = 60; composite[o + 3] = 255
    } else {
      composite[o] = data[o]; composite[o + 1] = data[o + 1]; composite[o + 2] = data[o + 2]; composite[o + 3] = 255
    }
  }
  await sharp(composite, { raw: { width, height, channels: 4 } }).png().toFile(outPath)
  console.log(`Wrote hole map → ${outPath}`)
}

async function main() {
  const limit = Number(parseArg('limit') ?? '20')
  const glob = parseArg('glob')
  const singleArg = parseArg('file')

  if (singleArg) {
    const filename = singleArg.endsWith('.png') ? singleArg : `${singleArg}.png`
    const file = path.join(ROOT, filename)
    if (!fs.existsSync(file)) { console.error(`Not found: ${file}`); process.exit(1) }
    const r = await scanOne(file)
    console.log(JSON.stringify(r, null, 2))
    const outPath = path.join(ROOT, `_holes_${path.basename(filename, '.png')}.png`)
    await emitHoleMap(file, outPath)
    return
  }

  const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.png') && !f.startsWith('_holes_'))
  const filtered = glob ? files.filter(f => new RegExp(glob.replace(/\*/g, '.*')).test(f)) : files
  console.log(`Scanning ${filtered.length} PNGs in ${ROOT}…`)

  const results: Awaited<ReturnType<typeof scanOne>>[] = []
  let done = 0
  for (const f of filtered) {
    const r = await scanOne(path.join(ROOT, f))
    results.push(r)
    done += 1
    if (done % 200 === 0) console.error(`  ${done}/${filtered.length}`)
  }

  results.sort((a, b) => b.holePixels - a.holePixels)
  console.log(`\nTop ${limit} by TRUE interior hole pixel count (transparent dial — bleeds on dark bg):`)
  console.log('file'.padEnd(60), 'holePx'.padStart(8), 'opaquePx'.padStart(10), 'maxGap'.padStart(7), 'avgGap'.padStart(7), 'ratio'.padStart(7))
  for (const r of results.slice(0, limit)) {
    console.log(
      r.file.padEnd(60),
      String(r.holePixels).padStart(8),
      String(r.opaquePixels).padStart(10),
      String(r.holeMaxGap).padStart(7),
      r.avgHoleGap.toFixed(1).padStart(7),
      r.holeRatio.toFixed(3).padStart(7),
    )
  }

  const anyHoles = results.filter(r => r.holePixels > 0).length
  const significant = results.filter(r => r.holePixels > 500).length
  const heavy = results.filter(r => r.holeRatio > 0.05).length
  console.log(`\nSummary:`)
  console.log(`  ${anyHoles} / ${results.length} have ANY true interior hole`)
  console.log(`  ${significant} / ${results.length} have >500px of interior holes (visibly bleed)`)
  console.log(`  ${heavy} / ${results.length} have holes >5% of opaque area (severe)`)
}

main().catch(e => { console.error(e); process.exit(1) })
