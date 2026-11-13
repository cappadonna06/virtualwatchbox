import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import bands from '../data/strap-band-demo.json'
import templates from '../data/strap-templates.json'
import { repoRoot } from './watch-image-pipeline'

const MANIFEST = path.join(repoRoot, 'data', 'strap-band-demo.json')
const ASSET_DIR = path.join(repoRoot, 'public', 'demo-strap-swap-bands')
const BODY_WIDTH = 300
const SIDE_PAD = 2
const picks = process.argv.slice(2)
const selected = templates
  .map(template => ({ template, prior: bands.straps.find(strap => strap.fullImageId === template.id) }))
  .filter(({ template, prior }) => !picks.length || picks.includes(template.id) || (prior && picks.includes(prior.id)))

function median(values: number[]): number {
  return values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
}

async function renderHalf(master: Buffer, imageWidth: number, name: string, top: boolean, options: {
  perforated: boolean
  endRow: number
  ivoryRubber: boolean
}) {
  const height = top ? 225 : 250
  const width = BODY_WIDTH + SIDE_PAD * 2
  const center = Math.round(imageWidth * (top ? 0.64 : 0.36))
  const tone = (x: number, y: number) => {
    const p = (y * imageWidth + x) * 3
    // Ivory is close to the white backing in brightness. Warmth separates it
    // from the backing and the exposed steel tips on this product master.
    if (options.ivoryRubber) return 255 - Math.max(0, master[p] - master[p + 2]) * 4
    return Math.min(master[p], master[p + 1], master[p + 2])
  }
  const findSide = (row: number, inward: 1 | -1) => {
    let edge = center - inward * 90
    let best = -Infinity
    for (let offset = 124; offset >= 56; offset -= 1) {
      const x = center - inward * offset
      let contrast = 0
      for (let y = row - 12; y <= row + 12; y += 3) {
        contrast += tone(x - inward * 3, y) - tone(x + inward * 3, y)
      }
      if (contrast > best) {
        best = contrast
        edge = x
      }
    }
    return edge + inward
  }

  // Aggregate contrast across the row band so bright stitching and hardware
  // don't interrupt the sides of the leather or pick up the background shadow.
  const left = findSide(102, 1)
  const right = findSide(102, -1)
  const bodyWidth = right - left + 1
  if (bodyWidth < 95 || bodyWidth > 240) throw new Error('Could not isolate a centered strap half')

  // Follow the original edge column by column, including curved rubber ends.
  const edgeRows = Array.from({ length: bodyWidth }, (_, i) => {
    const x = left + i
    for (let y = 52; y <= 123; y += 1) {
      if (tone(x, y) < 195 && tone(x, y + 2) < 195 && tone(x, y + 4) < 195) return y
    }
    return 124
  })
  const attachment = median(edgeRows.slice(Math.round(bodyWidth * 0.42), Math.round(bodyWidth * 0.58)))
  if (attachment === 124) throw new Error('Could not find the spring-bar end')
  const start = Math.min(...edgeRows) - 1
  const end = options.endRow
  const endLeft = findSide(end - 9, 1)
  const endRight = findSide(end - 9, -1)
  const travel = (end - start) / (height - 1)
  const endY = (attachment - start) / travel
  const pinY = endY + BODY_WIDTH * 0.07
  const rgba = Buffer.alloc(width * height * 4)

  for (let row = 0; row < height; row += 1) {
    const y = Math.round(start + row * travel)
    const outside = row / (height - 1)
    const roundedCorner = outside > 0.93 ? Math.pow((outside - 0.93) / 0.07, 2) * 8 : 0
    const taper = Math.max(0, (y - 102) / (end - 102))
    const leftEdge = left + Math.max(0, endLeft - left) * taper + roundedCorner
    const rightEdge = right + Math.min(0, endRight - right) * taper - roundedCorner
    const shade = 1 - 0.27 * Math.pow(outside, 8)

    for (let column = 0; column < BODY_WIDTH; column += 1) {
      const offset = Math.round(column * (bodyWidth - 1) / (BODY_WIDTH - 1))
      const x = left + offset
      if (y < edgeRows[offset]) continue
      if (x < leftEdge || x > rightEdge) continue

      const destX = (top ? BODY_WIDTH - 1 - column : column) + SIDE_PAD
      const destY = top ? height - 1 - row : row
      const src = (y * imageWidth + x) * 3
      const dest = (destY * width + destX) * 4
      // The white backing is visible through the perforations.
      const insidePerforation = options.perforated && column > BODY_WIDTH * 0.23 && column < BODY_WIDTH * 0.77
      const opacity = options.ivoryRubber
        ? Math.max(0, Math.min(1, (205 - tone(x, y)) / 32))
        : insidePerforation ? Math.max(0, Math.min(1, (244 - tone(x, y)) / 24)) : 1
      for (let channel = 0; channel < 3; channel += 1) rgba[dest + channel] = Math.round(master[src + channel] * shade)
      rgba[dest + 3] = Math.round(255 * opacity)
    }
  }

  const output = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .webp({ quality: 91, alphaQuality: 100 }).toBuffer()
  return {
    name, output,
    half: {
      url: `/demo-strap-swap-bands/${name}`, w: width, h: height,
      pinY: Math.round(top ? height - 1 - pinY : pinY),
      endY: Math.round(top ? height - 1 - endY : endY),
      bodyLeft: SIDE_PAD, bodyRight: SIDE_PAD + BODY_WIDTH,
    },
  }
}

async function main() {
  const updated = new Map<string, (typeof bands.straps)[number]>(bands.straps.map(strap => [strap.id, strap]))
  let prepared = 0
  for (const { template, prior } of selected) {
    const id = prior?.id ?? template.id
    try {
      if (!template.imageUrl) throw new Error('Missing Drawer master')
      const response = await fetch(template.imageUrl, { signal: AbortSignal.timeout(20_000) })
      if (!response.ok) throw new Error(`Template image HTTP ${response.status}`)
      const { data, info } = await sharp(Buffer.from(await response.arrayBuffer())).resize(1125, 1350)
        .flatten({ background: 'white' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      const rally = template.subMaterial === 'Rally'
      const oxbloodTropic = template.id === 'rubber-tropical-oxblood'
      const options = {
        perforated: rally || oxbloodTropic,
        ivoryRubber: template.id === 'rubber-ribbed-ivory',
      }
      const [top, bottom] = await Promise.all([
        renderHalf(data, info.width, prior ? path.basename(prior.bandTop.url) : `${id}-top.webp`, true,
          { ...options, endRow: rally ? 415 : 260 }),
        renderHalf(data, info.width, prior ? path.basename(prior.bandBottom.url) : `${id}-bottom.webp`, false,
          { ...options, endRow: rally ? 415 : oxbloodTropic ? 273 : 285 }),
      ])
      await Promise.all([top, bottom].map(half => fs.writeFile(path.join(ASSET_DIR, half.name), half.output)))
      updated.set(id, { id, fullImageId: template.id, bandTop: top.half, bandBottom: bottom.half })
      prepared += 1
    } catch (error) {
      console.error(`Skipped ${id}: ${(error as Error).message}`)
    }
  }
  await fs.writeFile(MANIFEST, JSON.stringify({ ...bands, straps: [...updated.values()] }, null, 2) + '\n')
  console.log(`Prepared ${prepared} of ${selected.length} strap pairs`)
  if (!selected.length || prepared !== selected.length) process.exitCode = 1
}

void main().catch(error => { console.error(error); process.exitCode = 1 })
