import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const [directory, selection] = process.argv.slice(2)
if (!directory || !selection) throw new Error('Pass the source directory and a comma-separated list of reviewed strap IDs')
const ids = selection.split(',').map(id => id.trim()).filter(Boolean)
const manifestPath = 'data/strap-band-demo.json'
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const rows = new Map<string, unknown>(manifest.straps.map((row: { id: string }) => [row.id, row]))
const processedDirectory = 'public/strap-assets/processed'
fs.mkdirSync(processedDirectory, { recursive: true })

async function prepare(id: string) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid strap ID ${id}`)
  const image = await sharp(path.join(directory, `${id}.png`))
    .flatten({ background: 'white' })
    .resize(1125, 1350, { fit: 'contain', background: 'white' })
    .removeAlpha().png().toBuffer()
  const pixels = await sharp(image).raw().toBuffer()
  const tone = (x: number, y: number) => Math.min(...pixels.subarray((y * 1125 + x) * 3, (y * 1125 + x) * 3 + 3))
  async function half(top: boolean, from: number, to: number) {
    let bestLeft = 0, bestRight = 0, runStart = -1
    for (let x = from; x <= to; x++) {
      // Bridge small highlights in pale textiles without joining separate halves.
      const bodyPixel = tone(x, 170) < 244 ||
        (x >= from + 4 && x <= to - 4 &&
          [1, 2, 3, 4].some(step => tone(x - step, 170) < 244) &&
          [1, 2, 3, 4].some(step => tone(x + step, 170) < 244))
      if (x < to && bodyPixel) {
        if (runStart < 0) runStart = x
      } else if (runStart >= 0) {
        if (x - runStart > bestRight - bestLeft) { bestLeft = runStart; bestRight = x }
        runStart = -1
      }
    }
    const left = bestLeft + 2, right = bestRight - 3
    const bodyWidth = right - left + 1
    if (bodyWidth < 130 || bodyWidth > 320) throw new Error(`Review the ${top ? 'top' : 'bottom'} edges for ${id}`)
    const edgeRows = Array.from({ length: bodyWidth }, (_, i) => {
      for (let y = 30; y < 150; y++) {
        if (tone(left + i, y) < 243 && tone(left + i, y + 3) < 243 && tone(left + i, y + 6) < 243) return y
      }
      return 150
    })
    const center = edgeRows.slice(Math.round(bodyWidth * 0.3), Math.round(bodyWidth * 0.7)).sort((a, b) => a - b)
    const attachment = center[Math.floor(center.length / 2)]
    if (attachment === 150) throw new Error(`Review the spring-bar sleeve for ${id}`)
    const start = Math.max(0, attachment - 3)
    const width = 304, height = top ? 225 : 250
    const travel = (285 - start) / (height - 1)
    const rgba = Buffer.alloc(width * height * 4)
    for (let row = 0; row < height; row++) {
      const y = Math.round(start + row * travel)
      const progress = row / (height - 1)
      const inset = 5 * progress + 6 * Math.max(0, (progress - 0.92) / 0.08) ** 2
      for (let column = 0; column < 300; column++) {
        const offset = Math.round(column * (bodyWidth - 1) / 299)
        if (column < inset || column >= 300 - inset || y < edgeRows[offset]) continue
        const source = (y * 1125 + left + offset) * 3
        const destination = ((top ? height - 1 - row : row) * width + column + 2) * 4
        for (let channel = 0; channel < 3; channel++) rgba[destination + channel] = Math.round(pixels[source + channel] * (1 - 0.13 * progress ** 8))
        rgba[destination + 3] = 255
      }
    }
    const url = `/demo-strap-swap-bands/${id}-${top ? 'top' : 'bottom'}.webp`
    await sharp(rgba, { raw: { width, height, channels: 4 } }).webp({ quality: 92, alphaQuality: 100 }).toFile(`public${url}`)
    const end = Math.round((attachment - start) / travel)
    return { url, w: width, h: height, pinY: top ? height - 1 - end - 21 : end + 21, endY: top ? height - 1 - end : end, bodyLeft: 2, bodyRight: 302 }
  }
  const bandTop = await half(true, 565, 960)
  const bandBottom = await half(false, 175, 560)
  await sharp(image).toFile(path.join(processedDirectory, `${id}.png`))
  rows.set(id, { id, fullImageId: id, bandTop, bandBottom })
  console.log(`Prepared ${id}`)
}

async function main() {
  for (const id of ids) await prepare(id)
  fs.writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, straps: [...rows.values()] }, null, 2)}\n`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
