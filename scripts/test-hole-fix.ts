/**
 * Spot-check the dial-hole fix end-to-end on a handful of raw inputs.
 * Processes the listed raw files through processWatchImageBuffer, writes
 * the PNG output to processed-preview/, and prints before/after interior
 * hole pixel counts so you can see the fix landing.
 *
 *   npx tsx scripts/test-hole-fix.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { processWatchImageBuffer } from '../lib/imageProcessing'

const repoRoot = path.resolve(__dirname, '..')
const rawDir = path.join(repoRoot, 'public', 'watch-assets', 'raw')
const previewDir = path.join(repoRoot, 'public', 'watch-assets', 'processed-preview')
const existingDir = path.join(repoRoot, 'public', 'watch-assets', 'processed')

// A mix of the worst dial-bleed offenders surfaced by check-dial-transparency.
const TEST_FILES = [
  'patek-philippe-6119r-001.jpg',
  'patek-philippe-5496r-001.png',
  'patek-philippe-7119j-010.png',
  'patek-philippe-5153j-001.png',
  'omega-220-10-41-21-02-001-aka-22010412102001.png',
  'omega-231-10-42-21-02-003-aka-23110422102003.png',
  'breitling-a10380591a1a1.png',
]

async function countInteriorHoles(buf: Buffer) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const OPAQUE = 250
  const exterior = new Uint8Array(width * height)
  const queue: number[] = []
  const tryEnqueue = (i: number) => {
    if (exterior[i]) return
    if (data[i * 4 + 3] < OPAQUE) { exterior[i] = 1; queue.push(i) }
  }
  for (let x = 0; x < width; x += 1) { tryEnqueue(x); tryEnqueue((height - 1) * width + x) }
  for (let y = 1; y < height - 1; y += 1) { tryEnqueue(y * width); tryEnqueue(y * width + width - 1) }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const i = queue[cursor]
    const x = i % width
    const y = (i / width) | 0
    if (x > 0) tryEnqueue(i - 1)
    if (x < width - 1) tryEnqueue(i + 1)
    if (y > 0) tryEnqueue(i - width)
    if (y < height - 1) tryEnqueue(i + width)
  }
  let holes = 0
  for (let i = 0; i < width * height; i += 1) {
    if (!exterior[i] && data[i * 4 + 3] < OPAQUE) holes += 1
  }
  return holes
}

async function main() {
  fs.mkdirSync(previewDir, { recursive: true })
  console.log('file'.padEnd(60), 'beforeHoles'.padStart(12), 'afterHoles'.padStart(12), 'delta'.padStart(10))
  for (const fname of TEST_FILES) {
    const rawPath = path.join(rawDir, fname)
    if (!fs.existsSync(rawPath)) { console.log(fname.padEnd(60), '  (raw missing)'); continue }
    const existingPng = path.join(existingDir, fname.replace(/\.(jpg|jpeg|png|webp|avif)$/i, '.png'))
    const before = fs.existsSync(existingPng) ? await countInteriorHoles(fs.readFileSync(existingPng)) : -1

    const rawBuf = fs.readFileSync(rawPath)
    const processed = await processWatchImageBuffer(rawBuf)
    const outPath = path.join(previewDir, fname.replace(/\.(jpg|jpeg|png|webp|avif)$/i, '.png'))
    fs.writeFileSync(outPath, processed.pngBuffer)
    const after = await countInteriorHoles(processed.pngBuffer)

    console.log(
      fname.padEnd(60),
      (before < 0 ? '—' : String(before)).padStart(12),
      String(after).padStart(12),
      (before < 0 ? '—' : String(after - before)).padStart(10),
    )
  }
  console.log(`\nReprocessed PNGs in: ${previewDir}`)
  console.log('Open each one against a dark background to confirm the dial no longer bleeds through.')
}

main().catch(e => { console.error(e); process.exit(1) })
