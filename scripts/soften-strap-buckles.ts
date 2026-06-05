/**
 * soften-strap-buckles.ts — zero-AI-cost removal of engraved buckle logos.
 *
 * Some generated straps inherit the maker's embossed buckle logo from the reference photo.
 * This pass detects the bright, low-saturation metallic buckle blob (within a lower-right ROI,
 * so it never touches coloured leather or edge stitching) and runs a median filter over ONLY
 * that region — which erases the thin engraving while preserving the brushed-metal look.
 *
 * Pure local Sharp, no API calls. Operates in place on public/strap-assets/processed/<id>.png.
 *
 * Usage:
 *   npx tsx scripts/soften-strap-buckles.ts                 # default at-risk families
 *   npx tsx scripts/soften-strap-buckles.ts --only a,b,c    # specific ids
 *   npx tsx scripts/soften-strap-buckles.ts --all           # every strap in the manifest
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const ROOT = process.cwd()
const DIR = path.join(ROOT, 'public', 'strap-assets', 'processed')
const MANIFEST = path.join(ROOT, 'data', 'strap-templates.json')

const ARGV = process.argv.slice(2)
const onlyArg = ARGV.includes('--only') ? ARGV[ARGV.indexOf('--only') + 1] : undefined
const ALL = ARGV.includes('--all')
// families whose reference photos carry a bold embossed buckle logo
const AT_RISK = ['leather-smooth-', 'leather-shell-cordovan-', 'leather-suede-']

const MEDIAN = 9 // median window; wipes thin engraving, keeps metal texture

async function soften(id: string) {
  const file = path.join(DIR, `${id}.png`)
  if (!fs.existsSync(file)) return false

  const base = await sharp(file).flatten({ background: '#ffffff' }).removeAlpha().toBuffer()
  const { data, info } = await sharp(base).raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  // ROI: lower-right region where the buckle sits (the right/buckle half, lower portion)
  const x0 = Math.round(width * 0.44)
  const x1 = Math.round(width * 0.99)
  const y0 = Math.round(height * 0.48)
  const y1 = Math.round(height * 0.97)

  const mask = Buffer.alloc(width * height, 0)
  let hits = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * channels
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const br = (r + g + b) / 3
      const sat = Math.max(r, g, b) - Math.min(r, g, b)
      // bright but not the pure-white background, and near-neutral → metallic buckle
      if (br >= 140 && br <= 252 && sat <= 26) {
        mask[y * width + x] = 255
        hits++
      }
    }
  }
  if (hits < 200) return false // no buckle blob found; leave untouched

  const maskFeathered = await sharp(mask, { raw: { width, height, channels: 1 } }).blur(3).png().toBuffer()
  const median = await sharp(base).median(MEDIAN).png().toBuffer()
  const medianMasked = await sharp(median)
    .joinChannel(maskFeathered)
    .png()
    .toBuffer()

  await sharp(base).composite([{ input: medianMasked }]).png().toFile(file)
  return true
}

async function main() {
  const ids: string[] = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).map((m: any) => m.id)
  let targets: string[]
  if (onlyArg) targets = onlyArg.split(',').map((s) => s.trim())
  else if (ALL) targets = ids
  else targets = ids.filter((id) => AT_RISK.some((p) => id.startsWith(p)))

  let done = 0
  for (const id of targets) {
    const ok = await soften(id)
    console.log(`${ok ? 'softened' : 'skipped '} ${id}`)
    if (ok) done++
  }
  console.log(`[soften] ${done}/${targets.length} buckles softened`)
}
main().catch((e) => { console.error(e); process.exit(1) })
