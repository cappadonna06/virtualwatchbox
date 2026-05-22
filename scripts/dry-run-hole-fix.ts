/**
 * Offender-targeted dry run for the dial-hole fix.
 *
 *   1. Scan all current processed/*.png for interior alpha holes.
 *   2. Pick the top --limit worst offenders (default 30).
 *   3. Reprocess each through the v3 pipeline → processed-preview/<slug>.png
 *   4. Composite both BEFORE (current processed/) and AFTER (preview) onto
 *      the discover dark panel background and write side-by-side reviews to
 *      processed-preview/_review/<slug>.png
 *
 * Usage:
 *   npx tsx scripts/dry-run-hole-fix.ts                 # top 30
 *   npx tsx scripts/dry-run-hole-fix.ts --limit 50
 *
 * Open processed-preview/_review/*.png to compare. The processed-preview
 * directory is safe to delete after review — nothing in the app reads from
 * it, the live image pipeline is Supabase Storage.
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { processWatchImageBuffer } from '../lib/imageProcessing'

const repoRoot = path.resolve(__dirname, '..')
const rawDir = path.join(repoRoot, 'public', 'watch-assets', 'raw')
const processedDir = path.join(repoRoot, 'public', 'watch-assets', 'processed')
const previewDir = path.join(repoRoot, 'public', 'watch-assets', 'processed-preview')
const reviewDir = path.join(previewDir, '_review')

const DARK_BG = { r: 30, g: 27, b: 22, alpha: 1 } // discover Complete-the-Box panel

function parseArg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i < 0 ? null : (process.argv[i + 1] ?? null)
}

async function countInteriorHoles(buf: Buffer) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const OPAQUE = 250
  const ext = new Uint8Array(width * height)
  const q: number[] = []
  const seed = (i: number) => { if (!ext[i] && data[i * 4 + 3] < OPAQUE) { ext[i] = 1; q.push(i) } }
  for (let x = 0; x < width; x += 1) { seed(x); seed((height - 1) * width + x) }
  for (let y = 1; y < height - 1; y += 1) { seed(y * width); seed(y * width + width - 1) }
  for (let c = 0; c < q.length; c += 1) {
    const i = q[c]; const x = i % width; const y = (i / width) | 0
    if (x > 0) seed(i - 1); if (x < width - 1) seed(i + 1)
    if (y > 0) seed(i - width); if (y < height - 1) seed(i + width)
  }
  let holes = 0
  for (let i = 0; i < width * height; i += 1) {
    if (!ext[i] && data[i * 4 + 3] < OPAQUE) holes += 1
  }
  return holes
}

async function compositeOnDark(buf: Buffer, w: number, h: number): Promise<Buffer> {
  return sharp({ create: { width: w, height: h, channels: 4, background: DARK_BG } })
    .composite([{ input: buf, gravity: 'center' }])
    .png()
    .toBuffer()
}

function findRaw(slug: string): string | null {
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp', '.avif']) {
    const p = path.join(rawDir, slug + ext)
    if (fs.existsSync(p)) return p
  }
  return null
}

async function main() {
  const limit = Number(parseArg('limit') ?? '30')
  fs.mkdirSync(previewDir, { recursive: true })
  fs.mkdirSync(reviewDir, { recursive: true })

  console.log(`Scanning processed/ for worst dial-hole offenders…`)
  const files = fs.readdirSync(processedDir).filter(f => f.endsWith('.png') && !f.startsWith('_'))
  const ranked: Array<{ file: string; holes: number }> = []
  let done = 0
  for (const f of files) {
    const holes = await countInteriorHoles(fs.readFileSync(path.join(processedDir, f)))
    ranked.push({ file: f, holes })
    done += 1
    if (done % 300 === 0) console.error(`  scan ${done}/${files.length}`)
  }
  ranked.sort((a, b) => b.holes - a.holes)
  const offenders = ranked.slice(0, limit)
  console.log(`\nTop ${offenders.length} offenders to reprocess:`)
  for (const o of offenders) console.log(`  ${o.holes.toString().padStart(8)}  ${o.file}`)

  console.log(`\nReprocessing through v3 pipeline → ${previewDir}`)
  console.log(`Writing side-by-side reviews → ${reviewDir}`)
  console.log('file'.padEnd(60), 'before'.padStart(8), 'after'.padStart(8))
  for (const o of offenders) {
    const slug = o.file.replace(/\.png$/, '')
    const rawPath = findRaw(slug)
    if (!rawPath) { console.log(slug.padEnd(60), '  (raw missing — skipping)'); continue }

    const processed = await processWatchImageBuffer(fs.readFileSync(rawPath))
    fs.writeFileSync(path.join(previewDir, `${slug}.png`), processed.pngBuffer)
    const afterHoles = await countInteriorHoles(processed.pngBuffer)

    // Side-by-side review composite: current (left) | new (right), both on dark
    const beforeBuf = fs.readFileSync(path.join(processedDir, o.file))
    const beforeMeta = await sharp(beforeBuf).metadata()
    const afterMeta = await sharp(processed.pngBuffer).metadata()
    const h = Math.max(beforeMeta.height ?? 0, afterMeta.height ?? 0)
    const beforeDark = await compositeOnDark(beforeBuf, beforeMeta.width ?? 0, h)
    const afterDark = await compositeOnDark(processed.pngBuffer, afterMeta.width ?? 0, h)
    const totalW = (beforeMeta.width ?? 0) + (afterMeta.width ?? 0) + 8
    const sideBySide = await sharp({ create: { width: totalW, height: h, channels: 4, background: DARK_BG } })
      .composite([
        { input: beforeDark, left: 0, top: 0 },
        { input: afterDark, left: (beforeMeta.width ?? 0) + 8, top: 0 },
      ])
      .png()
      .toBuffer()
    fs.writeFileSync(path.join(reviewDir, `${slug}.png`), sideBySide)

    console.log(slug.padEnd(60), String(o.holes).padStart(8), String(afterHoles).padStart(8))
  }

  console.log(`\nReview at: ${reviewDir}`)
  console.log(`Each file is BEFORE (current) | AFTER (v3 pipeline) on the discover dark bg.`)
  console.log(`Safe to delete processed-preview/ entirely when done — nothing reads from it.`)
}

main().catch(e => { console.error(e); process.exit(1) })
