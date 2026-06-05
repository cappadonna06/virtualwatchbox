/**
 * build-strap-montage.ts — contact sheet of generated strap templates for quick review.
 * Reads public/strap-assets/processed/<id>.png for every id in data/strap-templates.json
 * and tiles them into a labeled grid. Output: public/strap-assets/processed/_montage.png
 * (gitignored scratch). Run: npx tsx scripts/build-strap-montage.ts
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const ROOT = process.cwd()
const DIR = path.join(ROOT, 'public', 'strap-assets', 'processed')
const MANIFEST = path.join(ROOT, 'data', 'strap-templates.json')

const COLS = 8
const CELL_W = 220
const IMG_H = 264
const LABEL_H = 30
const CELL_H = IMG_H + LABEL_H
const PAD = 6

async function main() {
  const ids: string[] = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).map((m: any) => m.id)
  const present = ids.filter((id) => fs.existsSync(path.join(DIR, `${id}.png`)))
  const rows = Math.ceil(present.length / COLS)
  const W = COLS * CELL_W
  const H = rows * CELL_H

  const composites: sharp.OverlayOptions[] = []
  for (let i = 0; i < present.length; i++) {
    const id = present[i]
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const x = col * CELL_W
    const y = row * CELL_H

    const thumb = await sharp(path.join(DIR, `${id}.png`))
      .flatten({ background: '#ffffff' })
      .resize(CELL_W - PAD * 2, IMG_H - PAD * 2, { fit: 'contain', background: '#ffffff' })
      .png()
      .toBuffer()
    composites.push({ input: thumb, left: x + PAD, top: y + PAD })

    const label = id.replace(/-/g, ' ')
    const svg = `<svg width="${CELL_W}" height="${LABEL_H}"><rect width="100%" height="100%" fill="#F4EFE7"/><text x="${CELL_W / 2}" y="${LABEL_H / 2 + 4}" font-family="sans-serif" font-size="11" fill="#3A2E22" text-anchor="middle">${label}</text></svg>`
    composites.push({ input: Buffer.from(svg), left: x, top: y + IMG_H })
  }

  const out = path.join(DIR, '_montage.png')
  await sharp({ create: { width: W, height: H, channels: 3, background: '#FBF8F2' } })
    .composite(composites)
    .png()
    .toFile(out)
  console.log(`montage: ${present.length} straps -> ${path.relative(ROOT, out)} (${W}x${H})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
